// climateCheckClient.js - Seawater Climate Risk Platform
// ClimateCheck API client for comprehensive climate analytics following Tim-Combo patterns

const { HttpClient } = require('../httpClient');
const { DataSourceError, RateLimitError } = require('../errorHandler');
const { getCachedResponse, setCachedResponse } = require('../cacheManager');

/**
 * ClimateCheck Client
 * Premium climate risk analytics with detailed scoring and projections
 */
class ClimateCheckClient {
    constructor(config = {}) {
        this.client = new HttpClient({
            baseURL: config.baseURL || 'https://api.climatecheck.com/v1',
            timeout: config.timeout || 30000,
            userAgent: 'Seawater-Climate-Risk/1.0',
            retryConfig: { retries: 3, retryDelay: 2000 },
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.apiKey || process.env.CLIMATE_CHECK_API_KEY}`,
                'X-API-Version': '1.0'
            }
        });

        this.rateLimit = {
            hourly: 5000,
            perSecond: 5,
            lastRequestTime: 0
        };

        this.dataSource = 'ClimateCheck';
        this.costPerRequest = 0.002; // $0.002 per request
    }

    /**
     * Get comprehensive climate risk assessment
     */
    async getClimateRisk(latitude, longitude, propertyDetails = null) {
        try {
            await this.checkRateLimit();

            const cacheKey = `climatecheck_risk_${latitude}_${longitude}_${propertyDetails?.property_type || 'unknown'}`;
            
            // Check cache first (6 hour TTL for comprehensive assessments)
            try {
                const cached = await getCachedResponse(cacheKey);
                if (cached) {
                    console.log('ClimateCheck risk data cache hit:', { latitude, longitude });
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
                console.warn('ClimateCheck risk cache lookup failed:', cacheError.message);
            }

            console.log('Fetching ClimateCheck climate risk data:', { latitude, longitude, propertyDetails });

            const requestBody = {
                latitude: latitude,
                longitude: longitude,
                assessment_type: 'comprehensive',
                include_projections: true,
                include_adaptation: true,
                ...propertyDetails
            };

            const response = await this.client.post('/climate-risk', requestBody, { source: this.dataSource });

            const processedData = this.processClimateRiskData(response.data, latitude, longitude);

            // Cache the response
            try {
                await setCachedResponse(cacheKey, {
                    data: processedData,
                    timestamp: new Date().toISOString(),
                    source: this.dataSource
                }, 21600); // 6 hours
            } catch (cacheError) {
                console.warn('Failed to cache ClimateCheck risk response:', cacheError.message);
            }

            console.log('ClimateCheck risk data retrieved successfully:', {
                latitude,
                longitude,
                overallScore: processedData.overall_risk_score,
                highestRisk: processedData.highest_risk_factor,
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
            console.error('ClimateCheck risk API error:', {
                error: error.message,
                latitude,
                longitude,
                source: this.dataSource
            });

            if (error.status === 429) {
                throw new RateLimitError(
                    'ClimateCheck API rate limit exceeded',
                    this.dataSource,
                    new Date(Date.now() + 3600000).toISOString() // 1 hour
                );
            }

            if (error.status === 401) {
                throw new DataSourceError(
                    'ClimateCheck API authentication failed - check API key',
                    this.dataSource,
                    401
                );
            }

            throw new DataSourceError(
                `ClimateCheck API error: ${error.message}`,
                this.dataSource,
                error.status || null
            );
        }
    }

    /**
     * Get detailed flood risk analysis
     */
    async getFloodAnalysis(latitude, longitude, analysisDepth = 'detailed') {
        try {
            await this.checkRateLimit();

            const cacheKey = `climatecheck_flood_${latitude}_${longitude}_${analysisDepth}`;
            
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
                console.warn('ClimateCheck flood cache lookup failed:', cacheError.message);
            }

            console.log('Fetching ClimateCheck flood analysis:', { latitude, longitude, analysisDepth });

            const requestBody = {
                latitude: latitude,
                longitude: longitude,
                analysis_depth: analysisDepth,
                include_sea_level_rise: true,
                include_storm_surge: true,
                include_precipitation: true
            };

            const response = await this.client.post('/flood-analysis', requestBody, { source: this.dataSource });

            const floodData = this.processFloodAnalysisData(response.data, latitude, longitude);

            try {
                await setCachedResponse(cacheKey, {
                    data: floodData,
                    timestamp: new Date().toISOString()
                }, 21600); // 6 hours
            } catch (cacheError) {
                console.warn('Failed to cache ClimateCheck flood response:', cacheError.message);
            }

            return {
                success: true,
                data: floodData,
                source: this.dataSource,
                cached: false,
                cost: this.costPerRequest
            };

        } catch (error) {
            console.error('ClimateCheck flood API error:', error);
            throw new DataSourceError(
                `ClimateCheck flood API error: ${error.message}`,
                this.dataSource,
                error.status || null
            );
        }
    }

    /**
     * Get wildfire risk assessment
     */
    async getWildfireAnalysis(latitude, longitude) {
        try {
            await this.checkRateLimit();

            const cacheKey = `climatecheck_wildfire_${latitude}_${longitude}`;
            
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
                console.warn('ClimateCheck wildfire cache lookup failed:', cacheError.message);
            }

            console.log('Fetching ClimateCheck wildfire analysis:', { latitude, longitude });

            const requestBody = {
                latitude: latitude,
                longitude: longitude,
                include_fire_weather: true,
                include_fuel_moisture: true,
                include_burn_probability: true,
                include_fire_intensity: true
            };

            const response = await this.client.post('/wildfire-analysis', requestBody, { source: this.dataSource });

            const wildfireData = this.processWildfireAnalysisData(response.data, latitude, longitude);

            try {
                await setCachedResponse(cacheKey, {
                    data: wildfireData,
                    timestamp: new Date().toISOString()
                }, 21600); // 6 hours
            } catch (cacheError) {
                console.warn('Failed to cache ClimateCheck wildfire response:', cacheError.message);
            }

            return {
                success: true,
                data: wildfireData,
                source: this.dataSource,
                cached: false,
                cost: this.costPerRequest
            };

        } catch (error) {
            console.error('ClimateCheck wildfire API error:', error);
            throw new DataSourceError(
                `ClimateCheck wildfire API error: ${error.message}`,
                this.dataSource,
                error.status || null
            );
        }
    }

    /**
     * Get extreme weather analysis
     */
    async getExtremeWeatherAnalysis(latitude, longitude, weatherTypes = ['heat', 'cold', 'wind', 'hail']) {
        try {
            await this.checkRateLimit();

            const cacheKey = `climatecheck_extreme_${latitude}_${longitude}_${weatherTypes.join('_')}`;
            
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
                console.warn('ClimateCheck extreme weather cache lookup failed:', cacheError.message);
            }

            console.log('Fetching ClimateCheck extreme weather analysis:', { latitude, longitude, weatherTypes });

            const requestBody = {
                latitude: latitude,
                longitude: longitude,
                weather_types: weatherTypes,
                include_projections: true,
                projection_years: [2030, 2050, 2080]
            };

            const response = await this.client.post('/extreme-weather', requestBody, { source: this.dataSource });

            const extremeWeatherData = this.processExtremeWeatherData(response.data, latitude, longitude);

            try {
                await setCachedResponse(cacheKey, {
                    data: extremeWeatherData,
                    timestamp: new Date().toISOString()
                }, 21600); // 6 hours
            } catch (cacheError) {
                console.warn('Failed to cache ClimateCheck extreme weather response:', cacheError.message);
            }

            return {
                success: true,
                data: extremeWeatherData,
                source: this.dataSource,
                cached: false,
                cost: this.costPerRequest
            };

        } catch (error) {
            console.error('ClimateCheck extreme weather API error:', error);
            throw new DataSourceError(
                `ClimateCheck extreme weather API error: ${error.message}`,
                this.dataSource,
                error.status || null
            );
        }
    }

    /**
     * Get adaptation recommendations
     */
    async getAdaptationRecommendations(latitude, longitude, propertyType = 'residential', budget = 'moderate') {
        try {
            await this.checkRateLimit();

            const cacheKey = `climatecheck_adaptation_${latitude}_${longitude}_${propertyType}_${budget}`;
            
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
                console.warn('ClimateCheck adaptation cache lookup failed:', cacheError.message);
            }

            console.log('Fetching ClimateCheck adaptation recommendations:', { 
                latitude, longitude, propertyType, budget 
            });

            const requestBody = {
                latitude: latitude,
                longitude: longitude,
                property_type: propertyType,
                budget_level: budget,
                include_costs: true,
                include_effectiveness: true,
                prioritize_by: 'risk_reduction'
            };

            const response = await this.client.post('/adaptation-recommendations', requestBody, { source: this.dataSource });

            const adaptationData = this.processAdaptationData(response.data, latitude, longitude);

            try {
                await setCachedResponse(cacheKey, {
                    data: adaptationData,
                    timestamp: new Date().toISOString()
                }, 43200); // 12 hours for adaptation recommendations
            } catch (cacheError) {
                console.warn('Failed to cache ClimateCheck adaptation response:', cacheError.message);
            }

            return {
                success: true,
                data: adaptationData,
                source: this.dataSource,
                cached: false,
                cost: this.costPerRequest
            };

        } catch (error) {
            console.error('ClimateCheck adaptation API error:', error);
            throw new DataSourceError(
                `ClimateCheck adaptation API error: ${error.message}`,
                this.dataSource,
                error.status || null
            );
        }
    }

    /**
     * Process comprehensive climate risk data
     */
    processClimateRiskData(data, latitude, longitude) {
        if (!data) {
            return {
                overall_risk_score: null,
                risk_breakdown: {},
                climate_projections: {},
                adaptation_priority: null,
                data_available: false,
                coordinates: { latitude, longitude }
            };
        }

        // Extract individual risk scores
        const riskBreakdown = {
            flood_risk_score: data.flood_risk?.score || null,
            wildfire_risk_score: data.wildfire_risk?.score || null,
            hurricane_risk_score: data.hurricane_risk?.score || null,
            tornado_risk_score: data.tornado_risk?.score || null,
            earthquake_risk_score: data.earthquake_risk?.score || null,
            heat_risk_score: data.heat_risk?.score || null,
            drought_risk_score: data.drought_risk?.score || null,
            hail_risk_score: data.hail_risk?.score || null,
            winter_storm_risk_score: data.winter_storm_risk?.score || null
        };

        // Calculate overall risk score
        const validScores = Object.values(riskBreakdown).filter(score => score !== null);
        const overallScore = validScores.length > 0
            ? Math.round(validScores.reduce((sum, score) => sum + score, 0) / validScores.length)
            : null;

        // Find highest risk factor
        const highestRiskFactor = Object.entries(riskBreakdown)
            .filter(([key, value]) => value !== null)
            .sort(([,a], [,b]) => b - a)[0];

        return {
            overall_risk_score: overallScore,
            risk_level: this.getRiskLevel(overallScore),
            highest_risk_factor: highestRiskFactor ? {
                type: highestRiskFactor[0].replace('_risk_score', ''),
                score: highestRiskFactor[1]
            } : null,
            
            risk_breakdown: riskBreakdown,
            
            detailed_assessments: {
                flood: this.processDetailedFloodRisk(data.flood_risk),
                wildfire: this.processDetailedWildfireRisk(data.wildfire_risk),
                extreme_heat: this.processDetailedHeatRisk(data.heat_risk),
                severe_weather: this.processDetailedSevereWeatherRisk(data)
            },
            
            climate_projections: this.processClimateProjections(data.projections),
            
            vulnerability_factors: {
                population_density: data.vulnerability?.population_density,
                age_vulnerability: data.vulnerability?.age_vulnerability,
                socioeconomic_factors: data.vulnerability?.socioeconomic_factors,
                infrastructure_age: data.vulnerability?.infrastructure_age
            },
            
            adaptation_priority: data.adaptation?.priority_level || 'moderate',
            adaptation_urgency: data.adaptation?.urgency_score || null,
            
            confidence_metrics: {
                data_quality: data.confidence?.data_quality || null,
                model_agreement: data.confidence?.model_agreement || null,
                historical_validation: data.confidence?.historical_validation || null,
                overall_confidence: data.confidence?.overall_confidence || null
            },
            
            data_available: true,
            coordinates: { latitude, longitude },
            assessment_date: new Date().toISOString(),
            model_version: data.model_version || 'latest'
        };
    }

    /**
     * Process flood analysis data
     */
    processFloodAnalysisData(data, latitude, longitude) {
        if (!data) {
            return {
                flood_risk_score: null,
                flood_types: {},
                projections: {},
                data_available: false
            };
        }

        return {
            flood_risk_score: data.overall_score || null,
            
            flood_types: {
                coastal: {
                    risk_score: data.coastal?.risk_score || null,
                    sea_level_rise_impact: data.coastal?.sea_level_rise_impact || null,
                    storm_surge_height: data.coastal?.storm_surge_height || null,
                    erosion_rate: data.coastal?.erosion_rate || null
                },
                riverine: {
                    risk_score: data.riverine?.risk_score || null,
                    return_periods: data.riverine?.return_periods || {},
                    watershed_characteristics: data.riverine?.watershed || {}
                },
                pluvial: {
                    risk_score: data.pluvial?.risk_score || null,
                    drainage_capacity: data.pluvial?.drainage_capacity || null,
                    urban_runoff: data.pluvial?.urban_runoff || null
                }
            },
            
            flood_depths: {
                annual_exceedance_1_pct: data.depths?.annual_1_pct,
                annual_exceedance_2_pct: data.depths?.annual_2_pct,
                annual_exceedance_10_pct: data.depths?.annual_10_pct,
                annual_exceedance_20_pct: data.depths?.annual_20_pct
            },
            
            projections: {
                year_2030: this.processFloodProjection(data.projections?.year_2030),
                year_2050: this.processFloodProjection(data.projections?.year_2050),
                year_2080: this.processFloodProjection(data.projections?.year_2080)
            },
            
            adaptation_measures: data.adaptation_measures || [],
            
            data_available: true,
            coordinates: { latitude, longitude }
        };
    }

    /**
     * Process wildfire analysis data
     */
    processWildfireAnalysisData(data, latitude, longitude) {
        if (!data) {
            return {
                wildfire_risk_score: null,
                fire_behavior: {},
                fuel_characteristics: {},
                data_available: false
            };
        }

        return {
            wildfire_risk_score: data.overall_score || null,
            
            fire_behavior: {
                burn_probability: data.fire_behavior?.burn_probability,
                flame_length: data.fire_behavior?.flame_length,
                fire_intensity: data.fire_behavior?.fire_intensity,
                rate_of_spread: data.fire_behavior?.rate_of_spread,
                spotting_distance: data.fire_behavior?.spotting_distance
            },
            
            fuel_characteristics: {
                fuel_type: data.fuels?.primary_fuel_type,
                fuel_load: data.fuels?.fuel_load,
                fuel_moisture: data.fuels?.fuel_moisture,
                canopy_cover: data.fuels?.canopy_cover,
                canopy_height: data.fuels?.canopy_height
            },
            
            weather_factors: {
                fire_weather_index: data.weather?.fire_weather_index,
                wind_speed: data.weather?.wind_speed,
                relative_humidity: data.weather?.relative_humidity,
                temperature: data.weather?.temperature,
                burning_index: data.weather?.burning_index
            },
            
            topographic_factors: {
                elevation: data.topography?.elevation,
                slope: data.topography?.slope,
                aspect: data.topography?.aspect,
                terrain_roughness: data.topography?.terrain_roughness
            },
            
            wildland_urban_interface: {
                wui_risk: data.wui?.risk_level,
                housing_density: data.wui?.housing_density,
                vegetation_proximity: data.wui?.vegetation_proximity,
                evacuation_routes: data.wui?.evacuation_routes
            },
            
            historical_fire_activity: {
                fires_within_10km: data.historical?.fires_within_10km || 0,
                average_fire_size: data.historical?.average_fire_size,
                fire_frequency: data.historical?.fire_frequency,
                largest_fire: data.historical?.largest_fire
            },
            
            data_available: true,
            coordinates: { latitude, longitude }
        };
    }

    /**
     * Process extreme weather data
     */
    processExtremeWeatherData(data, latitude, longitude) {
        if (!data) {
            return {
                extreme_weather_risks: {},
                projections: {},
                data_available: false
            };
        }

        return {
            extreme_weather_risks: {
                heat: this.processExtremeHeatData(data.heat),
                cold: this.processExtremeColdData(data.cold),
                wind: this.processExtremeWindData(data.wind),
                hail: this.processExtremeHailData(data.hail),
                tornado: this.processExtremeTornadoData(data.tornado),
                hurricane: this.processExtremeHurricaneData(data.hurricane)
            },
            
            projections: {
                year_2030: this.processExtremeWeatherProjections(data.projections?.year_2030),
                year_2050: this.processExtremeWeatherProjections(data.projections?.year_2050),
                year_2080: this.processExtremeWeatherProjections(data.projections?.year_2080)
            },
            
            seasonal_patterns: data.seasonal_patterns || {},
            trend_analysis: data.trend_analysis || {},
            
            data_available: true,
            coordinates: { latitude, longitude }
        };
    }

    /**
     * Process adaptation recommendations data
     */
    processAdaptationData(data, latitude, longitude) {
        if (!data) {
            return {
                recommendations: [],
                priority_actions: [],
                cost_estimates: {},
                data_available: false
            };
        }

        return {
            priority_level: data.priority_level || 'moderate',
            urgency_score: data.urgency_score || null,
            
            recommendations: (data.recommendations || []).map(rec => ({
                category: rec.category,
                action: rec.action,
                effectiveness: rec.effectiveness,
                cost_range: rec.cost_range,
                implementation_time: rec.implementation_time,
                co_benefits: rec.co_benefits || []
            })),
            
            priority_actions: data.priority_actions || [],
            
            cost_estimates: {
                low_cost: data.cost_estimates?.low_cost || [],
                moderate_cost: data.cost_estimates?.moderate_cost || [],
                high_cost: data.cost_estimates?.high_cost || []
            },
            
            financing_options: data.financing_options || [],
            
            implementation_timeline: {
                immediate: data.timeline?.immediate || [],
                short_term: data.timeline?.short_term || [],
                medium_term: data.timeline?.medium_term || [],
                long_term: data.timeline?.long_term || []
            },
            
            data_available: true,
            coordinates: { latitude, longitude }
        };
    }

    // Helper methods for processing detailed risk data
    processDetailedFloodRisk(floodData) {
        if (!floodData) return null;
        return {
            risk_score: floodData.score,
            primary_source: floodData.primary_source,
            return_period_100yr: floodData.return_period_100yr,
            depth_scenarios: floodData.depth_scenarios
        };
    }

    processDetailedWildfireRisk(wildfireData) {
        if (!wildfireData) return null;
        return {
            risk_score: wildfireData.score,
            wui_classification: wildfireData.wui_classification,
            fuel_hazard: wildfireData.fuel_hazard,
            fire_weather_severity: wildfireData.fire_weather_severity
        };
    }

    processDetailedHeatRisk(heatData) {
        if (!heatData) return null;
        return {
            risk_score: heatData.score,
            extreme_heat_days: heatData.extreme_heat_days,
            heat_index_max: heatData.heat_index_max,
            urban_heat_island: heatData.urban_heat_island
        };
    }

    processDetailedSevereWeatherRisk(data) {
        return {
            tornado_risk: data.tornado_risk?.score || null,
            hail_risk: data.hail_risk?.score || null,
            wind_risk: data.wind_risk?.score || null,
            severe_thunderstorm_frequency: data.severe_weather?.thunderstorm_frequency
        };
    }

    processClimateProjections(projections) {
        if (!projections) return {};
        
        return {
            temperature_change: projections.temperature_change,
            precipitation_change: projections.precipitation_change,
            extreme_events_change: projections.extreme_events_change,
            confidence_level: projections.confidence_level
        };
    }

    processFloodProjection(projection) {
        if (!projection) return null;
        return {
            frequency_change: projection.frequency_change,
            intensity_change: projection.intensity_change,
            depth_change: projection.depth_change
        };
    }

    // Process extreme weather type data
    processExtremeHeatData(heatData) {
        if (!heatData) return null;
        return {
            risk_score: heatData.risk_score,
            days_above_100f: heatData.days_above_100f,
            heat_wave_frequency: heatData.heat_wave_frequency,
            wet_bulb_temperature: heatData.wet_bulb_temperature
        };
    }

    processExtremeColdData(coldData) {
        if (!coldData) return null;
        return {
            risk_score: coldData.risk_score,
            days_below_0f: coldData.days_below_0f,
            extreme_cold_events: coldData.extreme_cold_events,
            wind_chill_factor: coldData.wind_chill_factor
        };
    }

    processExtremeWindData(windData) {
        if (!windData) return null;
        return {
            risk_score: windData.risk_score,
            max_wind_speed: windData.max_wind_speed,
            high_wind_days: windData.high_wind_days,
            wind_direction_variability: windData.wind_direction_variability
        };
    }

    processExtremeHailData(hailData) {
        if (!hailData) return null;
        return {
            risk_score: hailData.risk_score,
            hail_frequency: hailData.hail_frequency,
            max_hail_size: hailData.max_hail_size,
            hail_season_length: hailData.hail_season_length
        };
    }

    processExtremeTornadoData(tornadoData) {
        if (!tornadoData) return null;
        return {
            risk_score: tornadoData.risk_score,
            tornado_frequency: tornadoData.tornado_frequency,
            ef_scale_distribution: tornadoData.ef_scale_distribution,
            tornado_season: tornadoData.tornado_season
        };
    }

    processExtremeHurricaneData(hurricaneData) {
        if (!hurricaneData) return null;
        return {
            risk_score: hurricaneData.risk_score,
            hurricane_frequency: hurricaneData.hurricane_frequency,
            max_wind_speed: hurricaneData.max_wind_speed,
            storm_surge_potential: hurricaneData.storm_surge_potential
        };
    }

    processExtremeWeatherProjections(projectionData) {
        if (!projectionData) return null;
        return {
            heat_extremes_change: projectionData.heat_extremes_change,
            precipitation_extremes_change: projectionData.precipitation_extremes_change,
            wind_extremes_change: projectionData.wind_extremes_change,
            overall_severity_change: projectionData.overall_severity_change
        };
    }

    /**
     * Get risk level description
     */
    getRiskLevel(score) {
        if (!score) return 'unknown';
        if (score >= 80) return 'very_high';
        if (score >= 60) return 'high';
        if (score >= 40) return 'moderate';
        if (score >= 20) return 'low';
        return 'very_low';
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
            console.log(`ClimateCheck API rate limiting: waiting ${delay}ms`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }

        this.rateLimit.lastRequestTime = Date.now();
    }

    /**
     * Test connection to ClimateCheck API
     */
    async testConnection() {
        try {
            const response = await this.client.get('/health');
            return {
                success: true,
                status: response.status,
                message: 'ClimateCheck API connection successful',
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

module.exports = ClimateCheckClient;