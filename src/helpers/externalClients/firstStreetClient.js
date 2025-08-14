// firstStreetClient.js - Seawater Climate Risk Platform
// First Street Foundation API client for premium climate risk data following Tim-Combo patterns

const { HttpClient } = require('../httpClient');
const { DataSourceError, RateLimitError } = require('../errorHandler');
const { getCachedResponse, setCachedResponse } = require('../cacheManager');

/**
 * First Street Foundation Client
 * Premium climate risk data including flood, wildfire, and heat risk
 */
class FirstStreetClient {
    constructor(config = {}) {
        this.client = new HttpClient({
            baseURL: config.baseURL || 'https://api.firststreet.org/risk/v1',
            timeout: config.timeout || 30000,
            userAgent: 'Seawater-Climate-Risk/1.0',
            retryConfig: { retries: 3, retryDelay: 2000 },
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.apiKey || process.env.FIRST_STREET_API_KEY}`
            }
        });

        this.rateLimit = {
            hourly: 10000,
            perSecond: 10,
            lastRequestTime: 0
        };

        this.dataSource = 'First_Street_Foundation';
        this.costPerRequest = 0.003; // $0.003 per request
    }

    /**
     * Get comprehensive property risk data
     */
    async getPropertyRisk(latitude, longitude, propertyId = null) {
        try {
            await this.checkRateLimit();

            const cacheKey = `firststreet_property_${latitude}_${longitude}`;
            
            // Check cache first (12 hour TTL for premium data)
            try {
                const cached = await getCachedResponse(cacheKey);
                if (cached) {
                    console.log('First Street property data cache hit:', { latitude, longitude });
                    return {
                        success: true,
                        data: cached.data,
                        source: this.dataSource,
                        cached: true,
                        timestamp: cached.timestamp,
                        cost: 0 // No cost for cached data
                    };
                }
            } catch (cacheError) {
                console.warn('First Street property cache lookup failed:', cacheError.message);
            }

            console.log('Fetching First Street property risk data:', { latitude, longitude });

            // If we have a property ID, use it; otherwise use coordinates
            const endpoint = propertyId 
                ? `/property/${propertyId}`
                : `/location/${latitude}/${longitude}`;

            const response = await this.client.get(endpoint, { source: this.dataSource });

            const processedData = this.processPropertyRiskData(response.data, latitude, longitude);

            // Cache the response
            try {
                await setCachedResponse(cacheKey, {
                    data: processedData,
                    timestamp: new Date().toISOString(),
                    source: this.dataSource
                }, 43200); // 12 hours
            } catch (cacheError) {
                console.warn('Failed to cache First Street property response:', cacheError.message);
            }

            console.log('First Street property data retrieved successfully:', {
                latitude,
                longitude,
                floodRisk: processedData.flood_risk_score,
                wildfireRisk: processedData.wildfire_risk_score,
                cost: this.costPerRequest
            });

            return {
                success: true,
                data: processedData,
                source: this.dataSource,
                cached: false,
                timestamp: new Date().toISOString(),
                cost: this.costPerRequest
            };

        } catch (error) {
            console.error('First Street property API error:', {
                error: error.message,
                latitude,
                longitude,
                source: this.dataSource
            });

            if (error.status === 429) {
                throw new RateLimitError(
                    'First Street API rate limit exceeded',
                    this.dataSource,
                    new Date(Date.now() + 3600000).toISOString() // 1 hour
                );
            }

            if (error.status === 401) {
                throw new DataSourceError(
                    'First Street API authentication failed - check API key',
                    this.dataSource,
                    401
                );
            }

            throw new DataSourceError(
                `First Street API error: ${error.message}`,
                this.dataSource,
                error.status || null
            );
        }
    }

    /**
     * Get flood risk data with projections
     */
    async getFloodRisk(latitude, longitude, includeProjections = true) {
        try {
            await this.checkRateLimit();

            const cacheKey = `firststreet_flood_${latitude}_${longitude}_${includeProjections}`;
            
            try {
                const cached = await getCachedResponse(cacheKey);
                if (cached) {
                    return {
                        success: true,
                        data: cached.data,
                        source: this.dataSource,
                        cached: true,
                        cost: 0
                    };
                }
            } catch (cacheError) {
                console.warn('First Street flood cache lookup failed:', cacheError.message);
            }

            console.log('Fetching First Street flood risk data:', { latitude, longitude, includeProjections });

            const params = includeProjections ? { projections: 'true' } : {};
            const response = await this.client.get(
                `/flood/location/${latitude}/${longitude}${this.client.buildQueryString(params)}`,
                { source: this.dataSource }
            );

            const floodData = this.processFloodRiskData(response.data, latitude, longitude);

            try {
                await setCachedResponse(cacheKey, {
                    data: floodData,
                    timestamp: new Date().toISOString()
                }, 43200); // 12 hours
            } catch (cacheError) {
                console.warn('Failed to cache First Street flood response:', cacheError.message);
            }

            return {
                success: true,
                data: floodData,
                source: this.dataSource,
                cached: false,
                cost: this.costPerRequest
            };

        } catch (error) {
            console.error('First Street flood API error:', error);
            throw new DataSourceError(
                `First Street flood API error: ${error.message}`,
                this.dataSource,
                error.status || null
            );
        }
    }

    /**
     * Get wildfire risk data
     */
    async getWildfireRisk(latitude, longitude) {
        try {
            await this.checkRateLimit();

            const cacheKey = `firststreet_wildfire_${latitude}_${longitude}`;
            
            try {
                const cached = await getCachedResponse(cacheKey);
                if (cached) {
                    return {
                        success: true,
                        data: cached.data,
                        source: this.dataSource,
                        cached: true,
                        cost: 0
                    };
                }
            } catch (cacheError) {
                console.warn('First Street wildfire cache lookup failed:', cacheError.message);
            }

            console.log('Fetching First Street wildfire risk data:', { latitude, longitude });

            const response = await this.client.get(
                `/wildfire/location/${latitude}/${longitude}`,
                { source: this.dataSource }
            );

            const wildfireData = this.processWildfireRiskData(response.data, latitude, longitude);

            try {
                await setCachedResponse(cacheKey, {
                    data: wildfireData,
                    timestamp: new Date().toISOString()
                }, 43200); // 12 hours
            } catch (cacheError) {
                console.warn('Failed to cache First Street wildfire response:', cacheError.message);
            }

            return {
                success: true,
                data: wildfireData,
                source: this.dataSource,
                cached: false,
                cost: this.costPerRequest
            };

        } catch (error) {
            console.error('First Street wildfire API error:', error);
            throw new DataSourceError(
                `First Street wildfire API error: ${error.message}`,
                this.dataSource,
                error.status || null
            );
        }
    }

    /**
     * Get heat risk data
     */
    async getHeatRisk(latitude, longitude) {
        try {
            await this.checkRateLimit();

            const cacheKey = `firststreet_heat_${latitude}_${longitude}`;
            
            try {
                const cached = await getCachedResponse(cacheKey);
                if (cached) {
                    return {
                        success: true,
                        data: cached.data,
                        source: this.dataSource,
                        cached: true,
                        cost: 0
                    };
                }
            } catch (cacheError) {
                console.warn('First Street heat cache lookup failed:', cacheError.message);
            }

            console.log('Fetching First Street heat risk data:', { latitude, longitude });

            const response = await this.client.get(
                `/heat/location/${latitude}/${longitude}`,
                { source: this.dataSource }
            );

            const heatData = this.processHeatRiskData(response.data, latitude, longitude);

            try {
                await setCachedResponse(cacheKey, {
                    data: heatData,
                    timestamp: new Date().toISOString()
                }, 43200); // 12 hours
            } catch (cacheError) {
                console.warn('Failed to cache First Street heat response:', cacheError.message);
            }

            return {
                success: true,
                data: heatData,
                source: this.dataSource,
                cached: false,
                cost: this.costPerRequest
            };

        } catch (error) {
            console.error('First Street heat API error:', error);
            throw new DataSourceError(
                `First Street heat API error: ${error.message}`,
                this.dataSource,
                error.status || null
            );
        }
    }

    /**
     * Get comprehensive climate projections
     */
    async getClimateProjections(latitude, longitude, scenarios = ['rcp45', 'rcp85']) {
        try {
            await this.checkRateLimit();

            const cacheKey = `firststreet_projections_${latitude}_${longitude}_${scenarios.join('_')}`;
            
            try {
                const cached = await getCachedResponse(cacheKey);
                if (cached) {
                    return {
                        success: true,
                        data: cached.data,
                        source: this.dataSource,
                        cached: true,
                        cost: 0
                    };
                }
            } catch (cacheError) {
                console.warn('First Street projections cache lookup failed:', cacheError.message);
            }

            console.log('Fetching First Street climate projections:', { latitude, longitude, scenarios });

            const params = { scenarios: scenarios.join(',') };
            const response = await this.client.get(
                `/projections/location/${latitude}/${longitude}${this.client.buildQueryString(params)}`,
                { source: this.dataSource }
            );

            const projectionsData = this.processProjectionsData(response.data, latitude, longitude);

            try {
                await setCachedResponse(cacheKey, {
                    data: projectionsData,
                    timestamp: new Date().toISOString()
                }, 86400); // 24 hours for projections
            } catch (cacheError) {
                console.warn('Failed to cache First Street projections response:', cacheError.message);
            }

            return {
                success: true,
                data: projectionsData,
                source: this.dataSource,
                cached: false,
                cost: this.costPerRequest
            };

        } catch (error) {
            console.error('First Street projections API error:', error);
            throw new DataSourceError(
                `First Street projections API error: ${error.message}`,
                this.dataSource,
                error.status || null
            );
        }
    }

    /**
     * Process comprehensive property risk data
     */
    processPropertyRiskData(data, latitude, longitude) {
        if (!data) {
            return {
                flood_risk_score: null,
                wildfire_risk_score: null,
                heat_risk_score: null,
                overall_risk_score: null,
                data_available: false,
                coordinates: { latitude, longitude }
            };
        }

        const floodScore = this.normalizeFirstStreetScore(data.flood?.risk_score);
        const wildfireScore = this.normalizeFirstStreetScore(data.wildfire?.risk_score);
        const heatScore = this.normalizeFirstStreetScore(data.heat?.risk_score);

        // Calculate overall risk score (weighted average)
        const scores = [floodScore, wildfireScore, heatScore].filter(s => s !== null);
        const overallScore = scores.length > 0 
            ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
            : null;

        return {
            flood_risk_score: floodScore,
            wildfire_risk_score: wildfireScore,
            heat_risk_score: heatScore,
            overall_risk_score: overallScore,
            
            // Detailed risk information
            flood_details: data.flood ? {
                annual_chance: data.flood.annual_chance,
                depth_1_pct: data.flood.depth_1_pct,
                depth_20_pct: data.flood.depth_20_pct,
                fema_zone: data.flood.fema_zone,
                community_id: data.flood.community_id
            } : null,
            
            wildfire_details: data.wildfire ? {
                burn_probability: data.wildfire.burn_probability,
                flame_length: data.wildfire.flame_length,
                fire_intensity: data.wildfire.fire_intensity,
                wui_risk: data.wildfire.wui_risk
            } : null,
            
            heat_details: data.heat ? {
                days_above_100f: data.heat.days_above_100f,
                days_above_105f: data.heat.days_above_105f,
                heat_index_max: data.heat.heat_index_max,
                cooling_degree_days: data.heat.cooling_degree_days
            } : null,
            
            // Property characteristics from First Street
            property_info: {
                property_id: data.property_id,
                address: data.address,
                property_type: data.property_type,
                year_built: data.year_built,
                square_feet: data.square_feet
            },
            
            data_available: true,
            coordinates: { latitude, longitude },
            model_version: data.model_version || 'latest'
        };
    }

    /**
     * Process flood risk data
     */
    processFloodRiskData(data, latitude, longitude) {
        if (!data) {
            return {
                flood_risk_score: null,
                annual_chance: null,
                flood_depths: {},
                projections: {},
                data_available: false
            };
        }

        return {
            flood_risk_score: this.normalizeFirstStreetScore(data.risk_score),
            annual_chance: data.annual_chance,
            
            flood_depths: {
                depth_1_pct: data.depth_1_pct,
                depth_10_pct: data.depth_10_pct,
                depth_4_pct: data.depth_4_pct,
                depth_20_pct: data.depth_20_pct
            },
            
            fema_comparison: {
                fema_zone: data.fema_zone,
                in_sfha: data.in_sfha,
                community_id: data.community_id,
                panel_id: data.panel_id
            },
            
            flood_factors: {
                coastal: data.coastal || false,
                riverine: data.riverine || false,
                pluvial: data.pluvial || false,
                groundwater: data.groundwater || false
            },
            
            projections: data.projections ? {
                year_2035: this.processFloodProjection(data.projections.year_2035),
                year_2050: this.processFloodProjection(data.projections.year_2050)
            } : {},
            
            data_available: true,
            coordinates: { latitude, longitude }
        };
    }

    /**
     * Process wildfire risk data
     */
    processWildfireRiskData(data, latitude, longitude) {
        if (!data) {
            return {
                wildfire_risk_score: null,
                burn_probability: null,
                fire_intensity: null,
                data_available: false
            };
        }

        return {
            wildfire_risk_score: this.normalizeFirstStreetScore(data.risk_score),
            burn_probability: data.burn_probability,
            fire_intensity: data.fire_intensity,
            flame_length: data.flame_length,
            
            wildfire_factors: {
                wui_risk: data.wui_risk, // Wildland-Urban Interface
                vegetation_type: data.vegetation_type,
                slope: data.slope,
                aspect: data.aspect,
                elevation: data.elevation
            },
            
            fire_weather: {
                wind_speed: data.wind_speed,
                fuel_moisture: data.fuel_moisture,
                burning_index: data.burning_index,
                spread_component: data.spread_component
            },
            
            historical_fires: {
                fires_within_10km: data.historical_fires?.within_10km || 0,
                largest_fire_size: data.historical_fires?.largest_size || null,
                most_recent_fire: data.historical_fires?.most_recent || null
            },
            
            data_available: true,
            coordinates: { latitude, longitude }
        };
    }

    /**
     * Process heat risk data
     */
    processHeatRiskData(data, latitude, longitude) {
        if (!data) {
            return {
                heat_risk_score: null,
                extreme_heat_days: null,
                heat_index_max: null,
                data_available: false
            };
        }

        return {
            heat_risk_score: this.normalizeFirstStreetScore(data.risk_score),
            
            extreme_heat_metrics: {
                days_above_100f: data.days_above_100f,
                days_above_105f: data.days_above_105f,
                days_above_110f: data.days_above_110f,
                heat_index_max: data.heat_index_max,
                wet_bulb_max: data.wet_bulb_max
            },
            
            cooling_metrics: {
                cooling_degree_days: data.cooling_degree_days,
                cooling_demand_peak: data.cooling_demand_peak,
                energy_burden: data.energy_burden
            },
            
            heat_island_effect: {
                urban_heat_island: data.urban_heat_island,
                surface_temperature: data.surface_temperature,
                tree_cover: data.tree_cover,
                impervious_surface: data.impervious_surface
            },
            
            health_impact: {
                heat_index_risk_days: data.heat_index_risk_days,
                vulnerable_population: data.vulnerable_population,
                outdoor_worker_risk: data.outdoor_worker_risk
            },
            
            data_available: true,
            coordinates: { latitude, longitude }
        };
    }

    /**
     * Process climate projections data
     */
    processProjectionsData(data, latitude, longitude) {
        if (!data || !data.scenarios) {
            return {
                projections_available: false,
                scenarios: {},
                coordinates: { latitude, longitude }
            };
        }

        const scenarios = {};

        for (const [scenario, scenarioData] of Object.entries(data.scenarios)) {
            scenarios[scenario] = {
                flood_projections: this.processFloodProjections(scenarioData.flood),
                wildfire_projections: this.processWildfireProjections(scenarioData.wildfire),
                heat_projections: this.processHeatProjections(scenarioData.heat),
                temperature_change: scenarioData.temperature_change,
                precipitation_change: scenarioData.precipitation_change
            };
        }

        return {
            projections_available: true,
            scenarios: scenarios,
            baseline_period: data.baseline_period || '1981-2010',
            model_ensemble: data.model_ensemble || 'CMIP5',
            coordinates: { latitude, longitude }
        };
    }

    /**
     * Process flood projection data
     */
    processFloodProjection(projectionData) {
        if (!projectionData) return null;

        return {
            annual_chance: projectionData.annual_chance,
            depth_change: projectionData.depth_change,
            frequency_change: projectionData.frequency_change,
            severity_change: projectionData.severity_change
        };
    }

    /**
     * Process flood projections for scenarios
     */
    processFloodProjections(floodData) {
        if (!floodData) return null;

        return {
            year_2035: this.processFloodProjection(floodData.year_2035),
            year_2050: this.processFloodProjection(floodData.year_2050),
            year_2080: this.processFloodProjection(floodData.year_2080)
        };
    }

    /**
     * Process wildfire projections for scenarios
     */
    processWildfireProjections(wildfireData) {
        if (!wildfireData) return null;

        return {
            burn_probability_change: wildfireData.burn_probability_change,
            fire_season_length_change: wildfireData.fire_season_length_change,
            fire_intensity_change: wildfireData.fire_intensity_change,
            extreme_fire_weather_days: wildfireData.extreme_fire_weather_days
        };
    }

    /**
     * Process heat projections for scenarios
     */
    processHeatProjections(heatData) {
        if (!heatData) return null;

        return {
            extreme_heat_days_change: heatData.extreme_heat_days_change,
            cooling_degree_days_change: heatData.cooling_degree_days_change,
            heat_index_change: heatData.heat_index_change,
            wet_bulb_days_above_threshold: heatData.wet_bulb_days_above_threshold
        };
    }

    /**
     * Normalize First Street scores to 0-100 scale
     */
    normalizeFirstStreetScore(score) {
        if (score === null || score === undefined) return null;
        
        // First Street typically uses 1-10 scale, convert to 0-100
        if (score >= 1 && score <= 10) {
            return Math.round((score - 1) * 11.11); // Maps 1-10 to 0-100
        }
        
        // If already 0-100 scale, return as is
        if (score >= 0 && score <= 100) {
            return Math.round(score);
        }
        
        // If percentage (0-1), convert to 0-100
        if (score >= 0 && score <= 1) {
            return Math.round(score * 100);
        }
        
        return null;
    }

    /**
     * Rate limiting check
     */
    async checkRateLimit() {
        const now = Date.now();
        const timeSinceLastRequest = now - this.rateLimit.lastRequestTime;
        const minInterval = 1000 / this.rateLimit.perSecond;

        if (timeSinceLastRequest < minInterval) {
            const delay = minInterval - timeSinceLastRequest;
            console.log(`First Street API rate limiting: waiting ${delay}ms`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }

        this.rateLimit.lastRequestTime = Date.now();
    }

    /**
     * Test connection to First Street API
     */
    async testConnection() {
        try {
            const response = await this.client.get('/health');
            return {
                success: true,
                status: response.status,
                message: 'First Street API connection successful',
                data_source: this.dataSource,
                cost_per_request: this.costPerRequest
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                data_source: this.dataSource
            };
        }
    }
}

module.exports = FirstStreetClient;