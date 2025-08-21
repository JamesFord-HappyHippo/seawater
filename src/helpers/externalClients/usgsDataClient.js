// usgsDataClient.js - Seawater Climate Risk Platform
// USGS Earthquake, Geological Hazards, and Water Monitoring API client following Tim-Combo patterns

const { HttpClient } = require('../httpClient');
const { DataSourceError, RateLimitError } = require('../errorHandler');
const { getCachedResponse, setCachedResponse } = require('../cacheManager');

/**
 * Enhanced USGS Data Client
 * Provides access to earthquake, geological, water monitoring, and flood risk data
 * Now includes comprehensive USGS Water Services integration for real-time flood monitoring
 */
class UsgsDataClient {
    constructor(config = {}) {
        this.client = new HttpClient({
            baseURL: config.baseURL || 'https://earthquake.usgs.gov',
            timeout: config.timeout || 30000,
            userAgent: 'Seawater-Climate-Risk/1.0',
            retryConfig: { retries: 3, retryDelay: 2000 },
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });

        // Secondary client for hazard maps
        this.hazardClient = new HttpClient({
            baseURL: 'https://earthquake.usgs.gov/hazards',
            timeout: 30000,
            userAgent: 'Seawater-Climate-Risk/1.0',
            headers: {
                'Accept': 'application/json'
            }
        });

        // Water services client for flood monitoring
        this.waterClient = new HttpClient({
            baseURL: 'https://waterservices.usgs.gov/nwis',
            timeout: 30000,
            userAgent: 'Seawater-Climate-Risk/1.0',
            retryConfig: { retries: 3, retryDelay: 2000 },
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });

        this.rateLimit = {
            perSecond: 10,
            lastRequestTime: 0
        };

        this.dataSource = 'USGS_Multi_Hazard';

        // USGS Water parameter codes for flood monitoring
        this.waterParameterCodes = {
            streamflow: '00060', // Discharge, cubic feet per second
            gageHeight: '00065', // Gage height, feet
            temperature: '00010', // Temperature, water, degrees Celsius
            precipitation: '00045', // Precipitation, total, inches
            groundwaterLevel: '72019', // Depth to water level, feet below land surface
            dissolvedOxygen: '00300', // Dissolved oxygen, water, unfiltered, milligrams per liter
            ph: '00400', // pH, water, unfiltered, field, standard units
            specificConductance: '00095' // Specific conductance, water, unfiltered, microsiemens per centimeter
        };
    }

    /**
     * Get earthquake risk data for coordinates
     */
    async getEarthquakeRisk(latitude, longitude) {
        try {
            await this.checkRateLimit();

            const cacheKey = `usgs_earthquake_${latitude}_${longitude}`;
            
            // Check cache first (24 hour TTL for earthquake hazard data)
            try {
                const cached = await getCachedResponse(cacheKey);
                if (cached) {
                    console.log('USGS earthquake data cache hit:', { latitude, longitude });
                    return {
                        success: true,
                        data: cached.data,
                        source: this.dataSource,
                        cached: true,
                        timestamp: cached.timestamp
                    };
                }
            } catch (cacheError) {
                console.warn('USGS earthquake cache lookup failed:', cacheError.message);
            }

            console.log('Fetching USGS earthquake risk data:', { latitude, longitude });

            // Get multiple types of earthquake data
            const [hazardData, historicalData, probabilisticData] = await Promise.allSettled([
                this.getEarthquakeHazard(latitude, longitude),
                this.getHistoricalEarthquakes(latitude, longitude),
                this.getProbabilisticHazard(latitude, longitude)
            ]);

            const processedData = this.processEarthquakeData({
                hazard: hazardData.status === 'fulfilled' ? hazardData.value : null,
                historical: historicalData.status === 'fulfilled' ? historicalData.value : null,
                probabilistic: probabilisticData.status === 'fulfilled' ? probabilisticData.value : null
            }, latitude, longitude);

            // Cache the response
            try {
                await setCachedResponse(cacheKey, {
                    data: processedData,
                    timestamp: new Date().toISOString(),
                    source: this.dataSource
                }, 86400); // 24 hours
            } catch (cacheError) {
                console.warn('Failed to cache USGS earthquake response:', cacheError.message);
            }

            console.log('USGS earthquake data retrieved successfully:', {
                latitude,
                longitude,
                riskLevel: processedData.risk_level,
                peakAcceleration: processedData.peak_ground_acceleration
            });

            return {
                success: true,
                data: processedData,
                source: this.dataSource,
                cached: false,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            console.error('USGS earthquake API error:', {
                error: error.message,
                latitude,
                longitude,
                source: this.dataSource
            });

            throw new DataSourceError(
                `USGS earthquake API error: ${error.message}`,
                this.dataSource,
                error.status || null
            );
        }
    }

    /**
     * Get landslide susceptibility data
     */
    async getLandslideRisk(latitude, longitude) {
        try {
            await this.checkRateLimit();

            const cacheKey = `usgs_landslide_${latitude}_${longitude}`;
            
            try {
                const cached = await getCachedResponse(cacheKey);
                if (cached) {
                    return {
                        success: true,
                        data: cached.data,
                        source: this.dataSource,
                        cached: true
                    };
                }
            } catch (cacheError) {
                console.warn('USGS landslide cache lookup failed:', cacheError.message);
            }

            console.log('Fetching USGS landslide data:', { latitude, longitude });

            // USGS Landslide Hazards Program data
            // Note: This is a simplified implementation - actual API endpoints may vary
            const landslideData = await this.getLandslideSusceptibility(latitude, longitude);
            const processedData = this.processLandslideData(landslideData, latitude, longitude);

            try {
                await setCachedResponse(cacheKey, {
                    data: processedData,
                    timestamp: new Date().toISOString()
                }, 86400); // 24 hours
            } catch (cacheError) {
                console.warn('Failed to cache USGS landslide response:', cacheError.message);
            }

            return {
                success: true,
                data: processedData,
                source: this.dataSource,
                cached: false
            };

        } catch (error) {
            console.error('USGS landslide API error:', error);
            throw new DataSourceError(
                `USGS landslide API error: ${error.message}`,
                this.dataSource,
                error.status || null
            );
        }
    }

    /**
     * Get volcanic hazard data
     */
    async getVolcanicRisk(latitude, longitude) {
        try {
            await this.checkRateLimit();

            const cacheKey = `usgs_volcanic_${latitude}_${longitude}`;
            
            try {
                const cached = await getCachedResponse(cacheKey);
                if (cached) {
                    return {
                        success: true,
                        data: cached.data,
                        source: this.dataSource,
                        cached: true
                    };
                }
            } catch (cacheError) {
                console.warn('USGS volcanic cache lookup failed:', cacheError.message);
            }

            console.log('Fetching USGS volcanic hazard data:', { latitude, longitude });

            const volcanicData = await this.getNearbyVolcanoes(latitude, longitude);
            const processedData = this.processVolcanicData(volcanicData, latitude, longitude);

            try {
                await setCachedResponse(cacheKey, {
                    data: processedData,
                    timestamp: new Date().toISOString()
                }, 86400); // 24 hours
            } catch (cacheError) {
                console.warn('Failed to cache USGS volcanic response:', cacheError.message);
            }

            return {
                success: true,
                data: processedData,
                source: this.dataSource,
                cached: false
            };

        } catch (error) {
            console.error('USGS volcanic API error:', error);
            throw new DataSourceError(
                `USGS volcanic API error: ${error.message}`,
                this.dataSource,
                error.status || null
            );
        }
    }

    /**
     * Get comprehensive flood risk assessment using USGS water data
     */
    async getFloodRisk(latitude, longitude, options = {}) {
        try {
            await this.checkRateLimit();

            const cacheKey = `usgs_flood_risk_${latitude}_${longitude}_${options.radiusKm || 25}`;
            
            // Check cache first (1 hour TTL for flood risk data due to dynamic nature)
            try {
                const cached = await getCachedResponse(cacheKey);
                if (cached) {
                    console.log('USGS flood risk data cache hit:', { latitude, longitude });
                    return {
                        success: true,
                        data: cached.data,
                        source: this.dataSource,
                        cached: true,
                        timestamp: cached.timestamp
                    };
                }
            } catch (cacheError) {
                console.warn('USGS flood risk cache lookup failed:', cacheError.message);
            }

            console.log('Fetching USGS flood risk assessment:', { latitude, longitude });

            // Find nearby water monitoring sites
            const nearbySites = await this.findNearbyWaterSites(latitude, longitude, {
                radiusKm: options.radiusKm || 25,
                parameters: [this.waterParameterCodes.streamflow, this.waterParameterCodes.gageHeight]
            });

            if (nearbySites.length === 0) {
                const noDataResponse = {
                    flood_risk_score: null,
                    risk_level: 'UNKNOWN',
                    confidence: 'low',
                    reason: 'No nearby USGS water monitoring sites found',
                    nearest_site_distance_km: null,
                    monitoring_sites: [],
                    current_conditions: null,
                    historical_context: null,
                    data_available: false,
                    coordinates: { latitude, longitude }
                };

                return {
                    success: true,
                    data: noDataResponse,
                    source: this.dataSource,
                    cached: false,
                    timestamp: new Date().toISOString()
                };
            }

            // Get current and historical data for flood assessment
            const [currentData, historicalData] = await Promise.allSettled([
                this.getCurrentWaterData(nearbySites.slice(0, 3)), // Use top 3 closest sites
                this.getHistoricalWaterData(nearbySites.slice(0, 3), {
                    startDate: this.getRelativeDate(-365 * 5), // 5 years of historical data
                    endDate: new Date().toISOString().split('T')[0]
                })
            ]);

            const processedData = this.processFloodRiskData({
                sites: nearbySites,
                current: currentData.status === 'fulfilled' ? currentData.value : null,
                historical: historicalData.status === 'fulfilled' ? historicalData.value : null
            }, latitude, longitude);

            // Cache the response (shorter TTL due to dynamic nature of water data)
            try {
                await setCachedResponse(cacheKey, {
                    data: processedData,
                    timestamp: new Date().toISOString(),
                    source: this.dataSource
                }, 3600); // 1 hour
            } catch (cacheError) {
                console.warn('Failed to cache USGS flood risk response:', cacheError.message);
            }

            console.log('USGS flood risk assessment completed:', {
                latitude,
                longitude,
                riskLevel: processedData.risk_level,
                sitesAnalyzed: processedData.monitoring_sites.length
            });

            return {
                success: true,
                data: processedData,
                source: this.dataSource,
                cached: false,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            console.error('USGS flood risk API error:', {
                error: error.message,
                latitude,
                longitude,
                source: this.dataSource
            });

            throw new DataSourceError(
                `USGS flood risk API error: ${error.message}`,
                this.dataSource,
                error.status || null
            );
        }
    }

    /**
     * Get real-time water monitoring data for multiple locations
     */
    async getWaterMonitoringData(latitude, longitude, options = {}) {
        try {
            await this.checkRateLimit();

            const cacheKey = `usgs_water_monitoring_${latitude}_${longitude}_${options.radiusKm || 50}`;
            
            // Check cache first (15 minutes TTL for real-time water data)
            try {
                const cached = await getCachedResponse(cacheKey);
                if (cached) {
                    console.log('USGS water monitoring data cache hit:', { latitude, longitude });
                    return {
                        success: true,
                        data: cached.data,
                        source: this.dataSource,
                        cached: true,
                        timestamp: cached.timestamp
                    };
                }
            } catch (cacheError) {
                console.warn('USGS water monitoring cache lookup failed:', cacheError.message);
            }

            console.log('Fetching USGS real-time water monitoring data:', { latitude, longitude });

            // Find nearby sites and get current data
            const nearbySites = await this.findNearbyWaterSites(latitude, longitude, {
                radiusKm: options.radiusKm || 50,
                parameters: Object.values(this.waterParameterCodes)
            });

            if (nearbySites.length === 0) {
                return {
                    success: true,
                    data: {
                        monitoring_sites: [],
                        real_time_data: {},
                        water_quality_summary: null,
                        flood_indicators: null,
                        data_available: false,
                        coordinates: { latitude, longitude }
                    },
                    source: this.dataSource,
                    cached: false,
                    timestamp: new Date().toISOString()
                };
            }

            // Get real-time data for all nearby sites
            const currentData = await this.getCurrentWaterData(nearbySites.slice(0, 10)); // Limit to 10 sites

            const processedData = this.processWaterMonitoringData({
                sites: nearbySites,
                current: currentData
            }, latitude, longitude);

            // Cache the response (shorter TTL for real-time data)
            try {
                await setCachedResponse(cacheKey, {
                    data: processedData,
                    timestamp: new Date().toISOString(),
                    source: this.dataSource
                }, 900); // 15 minutes
            } catch (cacheError) {
                console.warn('Failed to cache USGS water monitoring response:', cacheError.message);
            }

            console.log('USGS water monitoring data retrieved successfully:', {
                latitude,
                longitude,
                sitesFound: processedData.monitoring_sites.length,
                hasFloodIndicators: !!processedData.flood_indicators
            });

            return {
                success: true,
                data: processedData,
                source: this.dataSource,
                cached: false,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            console.error('USGS water monitoring API error:', {
                error: error.message,
                latitude,
                longitude,
                source: this.dataSource
            });

            throw new DataSourceError(
                `USGS water monitoring API error: ${error.message}`,
                this.dataSource,
                error.status || null
            );
        }
    }

    /**
     * Get earthquake hazard data from USGS hazard maps
     */
    async getEarthquakeHazard(latitude, longitude) {
        const params = {
            latitude: latitude,
            longitude: longitude,
            edition: 'E2018',
            vs30: '760'  // Site class B/C boundary
        };

        const response = await this.hazardClient.get(
            `/hazws/staticcurve/1${this.client.buildQueryString(params)}`,
            { source: this.dataSource }
        );

        return response.data;
    }

    /**
     * Get historical earthquakes near coordinates
     */
    async getHistoricalEarthquakes(latitude, longitude, radiusKm = 100, years = 50) {
        const endTime = new Date().toISOString();
        const startTime = new Date(Date.now() - (years * 365 * 24 * 60 * 60 * 1000)).toISOString();

        const params = {
            format: 'geojson',
            latitude: latitude,
            longitude: longitude,
            maxradiuskm: radiusKm,
            starttime: startTime.split('T')[0],
            endtime: endTime.split('T')[0],
            minmagnitude: 3.0,
            orderby: 'magnitude'
        };

        const response = await this.client.get(
            `/fdsnws/event/1/query${this.client.buildQueryString(params)}`,
            { source: this.dataSource }
        );

        return response.data;
    }

    /**
     * Get probabilistic hazard data
     */
    async getProbabilisticHazard(latitude, longitude) {
        const params = {
            latitude: latitude,
            longitude: longitude,
            edition: 'E2018',
            region: 'COUS',
            vs30: '760'
        };

        const response = await this.hazardClient.get(
            `/hazws/probabilistic/1${this.client.buildQueryString(params)}`,
            { source: this.dataSource }
        );

        return response.data;
    }

    /**
     * Get landslide susceptibility (simplified - actual implementation would use specific USGS services)
     */
    async getLandslideSusceptibility(latitude, longitude) {
        // This would connect to USGS Landslide Hazards Program data
        // For now, return a placeholder structure
        return {
            susceptibility: 'MODERATE',
            slope_stability: 'STABLE',
            geological_factors: {
                soil_type: 'UNKNOWN',
                slope_angle: null,
                precipitation_threshold: null
            }
        };
    }

    /**
     * Get nearby volcanoes data
     */
    async getNearbyVolcanoes(latitude, longitude, radiusKm = 200) {
        // This would connect to USGS Volcano Hazards Program
        // For now, return a placeholder structure
        return {
            volcanoes: [],
            nearest_volcano: null,
            volcanic_hazard_level: 'LOW'
        };
    }

    /**
     * Process earthquake data into standardized format
     */
    processEarthquakeData(data, latitude, longitude) {
        const riskScore = this.calculateEarthquakeRiskScore(data);

        return {
            earthquake_risk_score: riskScore,
            risk_level: this.getRiskLevel(riskScore),
            peak_ground_acceleration: data.hazard?.response?.[0]?.yvals?.[10] || null, // 10% probability in 50 years
            historical_earthquakes: this.processHistoricalEarthquakes(data.historical),
            seismic_design_category: this.determineSeismicDesignCategory(riskScore),
            fault_proximity: this.analyzeFaultProximity(data.historical, latitude, longitude),
            probabilistic_hazard: {
                annual_exceedance_2_percent: data.probabilistic?.response?.[0]?.yvals?.[0] || null,
                annual_exceedance_10_percent: data.probabilistic?.response?.[0]?.yvals?.[4] || null
            },
            data_available: !!(data.hazard || data.historical || data.probabilistic),
            coordinates: { latitude, longitude },
            source_details: {
                hazard_model: 'USGS NSHM 2018',
                reference_rock_vs30: '760 m/s'
            }
        };
    }

    /**
     * Process historical earthquakes
     */
    processHistoricalEarthquakes(historicalData) {
        if (!historicalData?.features) {
            return {
                total_earthquakes: 0,
                largest_magnitude: null,
                most_recent: null,
                magnitude_distribution: {}
            };
        }

        const earthquakes = historicalData.features;
        const magnitudes = earthquakes.map(eq => eq.properties.mag).filter(mag => mag);
        
        // Group by magnitude ranges
        const distribution = {
            '3.0-3.9': magnitudes.filter(m => m >= 3.0 && m < 4.0).length,
            '4.0-4.9': magnitudes.filter(m => m >= 4.0 && m < 5.0).length,
            '5.0-5.9': magnitudes.filter(m => m >= 5.0 && m < 6.0).length,
            '6.0-6.9': magnitudes.filter(m => m >= 6.0 && m < 7.0).length,
            '7.0+': magnitudes.filter(m => m >= 7.0).length
        };

        // Find most recent earthquake
        const mostRecent = earthquakes.reduce((latest, eq) => {
            const eqTime = new Date(eq.properties.time);
            const latestTime = latest ? new Date(latest.properties.time) : new Date(0);
            return eqTime > latestTime ? eq : latest;
        }, null);

        return {
            total_earthquakes: earthquakes.length,
            largest_magnitude: magnitudes.length > 0 ? Math.max(...magnitudes) : null,
            most_recent: mostRecent ? {
                magnitude: mostRecent.properties.mag,
                date: new Date(mostRecent.properties.time).toISOString().split('T')[0],
                place: mostRecent.properties.place,
                depth_km: mostRecent.geometry.coordinates[2]
            } : null,
            magnitude_distribution: distribution
        };
    }

    /**
     * Process landslide data
     */
    processLandslideData(data, latitude, longitude) {
        const susceptibilityScore = this.calculateLandslideSusceptibility(data);

        return {
            landslide_susceptibility: data.susceptibility || 'UNKNOWN',
            susceptibility_score: susceptibilityScore,
            slope_stability: data.slope_stability || 'UNKNOWN',
            geological_factors: data.geological_factors || {},
            risk_factors: {
                terrain_based: susceptibilityScore > 60,
                precipitation_triggered: data.geological_factors?.precipitation_threshold < 50,
                seismic_triggered: susceptibilityScore > 70
            },
            data_available: !!data.susceptibility,
            coordinates: { latitude, longitude }
        };
    }

    /**
     * Process volcanic data
     */
    processVolcanicData(data, latitude, longitude) {
        return {
            volcanic_hazard_level: data.volcanic_hazard_level || 'LOW',
            nearby_volcanoes: data.volcanoes?.length || 0,
            nearest_volcano: data.nearest_volcano,
            hazard_zones: {
                lava_flow: false,
                pyroclastic_flow: false,
                ash_fall: data.volcanic_hazard_level === 'HIGH',
                lahar: false
            },
            data_available: !!data.volcanic_hazard_level,
            coordinates: { latitude, longitude }
        };
    }

    /**
     * Calculate earthquake risk score (0-100)
     */
    calculateEarthquakeRiskScore(data) {
        let score = 0;

        // Base score from peak ground acceleration
        if (data.hazard?.response?.[0]?.yvals?.[10]) {
            const pga = data.hazard.response[0].yvals[10];
            score += Math.min(pga * 1000, 50); // Convert to score out of 50
        }

        // Historical earthquake activity
        if (data.historical?.features) {
            const earthquakeCount = data.historical.features.length;
            const maxMagnitude = Math.max(...data.historical.features.map(eq => eq.properties.mag));
            
            score += Math.min(earthquakeCount * 0.5, 25); // Activity score out of 25
            score += Math.min((maxMagnitude - 3) * 5, 25); // Magnitude score out of 25
        }

        return Math.min(Math.round(score), 100);
    }

    /**
     * Calculate landslide susceptibility score
     */
    calculateLandslideSusceptibility(data) {
        const susceptibilityMap = {
            'VERY_LOW': 10,
            'LOW': 25,
            'MODERATE': 50,
            'HIGH': 75,
            'VERY_HIGH': 90
        };

        return susceptibilityMap[data.susceptibility] || 25;
    }

    /**
     * Get risk level description
     */
    getRiskLevel(score) {
        if (score >= 80) return 'VERY_HIGH';
        if (score >= 60) return 'HIGH';
        if (score >= 40) return 'MODERATE';
        if (score >= 20) return 'LOW';
        return 'VERY_LOW';
    }

    /**
     * Determine seismic design category based on risk score
     */
    determineSeismicDesignCategory(riskScore) {
        if (riskScore >= 80) return 'E';
        if (riskScore >= 60) return 'D';
        if (riskScore >= 40) return 'C';
        if (riskScore >= 20) return 'B';
        return 'A';
    }

    /**
     * Analyze fault proximity based on historical earthquakes
     */
    analyzeFaultProximity(historicalData, targetLat, targetLon) {
        if (!historicalData?.features || historicalData.features.length === 0) {
            return {
                nearest_fault_distance_km: null,
                major_fault_nearby: false,
                fault_activity_level: 'LOW'
            };
        }

        // Find closest earthquake (proxy for fault proximity)
        let minDistance = Infinity;
        let closestEarthquake = null;

        historicalData.features.forEach(eq => {
            const [lon, lat] = eq.geometry.coordinates;
            const distance = this.calculateDistance(targetLat, targetLon, lat, lon) / 1000; // Convert to km
            
            if (distance < minDistance) {
                minDistance = distance;
                closestEarthquake = eq;
            }
        });

        const activityLevel = minDistance < 10 ? 'HIGH' : minDistance < 50 ? 'MODERATE' : 'LOW';
        const majorFaultNearby = minDistance < 25 && closestEarthquake?.properties.mag > 5.0;

        return {
            nearest_fault_distance_km: Math.round(minDistance),
            major_fault_nearby: majorFaultNearby,
            fault_activity_level: activityLevel
        };
    }

    /**
     * Calculate distance between two points (Haversine formula)
     */
    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371000; // Earth's radius in meters
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }

    // ====================================================
    // WATER MONITORING HELPER METHODS
    // ====================================================

    /**
     * Find nearby USGS water monitoring sites
     */
    async findNearbyWaterSites(latitude, longitude, options = {}) {
        const params = {
            format: 'json',
            lat: latitude,
            lon: longitude,
            within: options.radiusKm || 50,
            hasDataTypeCd: 'iv', // Instantaneous values
            siteOutput: 'expanded',
            seriesCatalogOutput: true
        };

        // Add parameter filter if specified
        if (options.parameters) {
            params.parameterCd = Array.isArray(options.parameters) 
                ? options.parameters.join(',') 
                : options.parameters;
        } else {
            // Default to streamflow and gage height for flood monitoring
            params.parameterCd = [
                this.waterParameterCodes.streamflow, 
                this.waterParameterCodes.gageHeight
            ].join(',');
        }

        const response = await this.waterClient.get(
            `/site/${this.waterClient.buildQueryString(params)}`,
            { source: 'USGS_Water_Sites' }
        );

        return this.parseWaterSitesResponse(response.data, latitude, longitude);
    }

    /**
     * Get current water data for specific sites
     */
    async getCurrentWaterData(sites, options = {}) {
        if (!sites || sites.length === 0) return {};

        const siteNumbers = sites.map(site => site.site_number || site.siteNumber).join(',');
        
        const params = {
            format: 'json',
            sites: siteNumbers,
            parameterCd: [
                this.waterParameterCodes.streamflow,
                this.waterParameterCodes.gageHeight,
                this.waterParameterCodes.temperature
            ].join(','),
            siteStatus: 'active'
        };

        // Add time period if specified
        if (options.period) {
            params.period = options.period; // e.g., P7D for last 7 days
        }

        const response = await this.waterClient.get(
            `/iv/${this.waterClient.buildQueryString(params)}`,
            { source: 'USGS_Water_Current' }
        );

        return this.parseWaterDataResponse(response.data, 'current');
    }

    /**
     * Get historical water data for specific sites
     */
    async getHistoricalWaterData(sites, options = {}) {
        if (!sites || sites.length === 0) return {};

        const siteNumbers = sites.map(site => site.site_number || site.siteNumber).join(',');
        
        const params = {
            format: 'json',
            sites: siteNumbers,
            parameterCd: [
                this.waterParameterCodes.streamflow,
                this.waterParameterCodes.gageHeight
            ].join(','),
            startDT: options.startDate || this.getRelativeDate(-365),
            endDT: options.endDate || new Date().toISOString().split('T')[0],
            statCd: '00003' // Mean daily value
        };

        const response = await this.waterClient.get(
            `/dv/${this.waterClient.buildQueryString(params)}`,
            { source: 'USGS_Water_Historical' }
        );

        return this.parseWaterDataResponse(response.data, 'historical');
    }

    /**
     * Parse USGS water sites response
     */
    parseWaterSitesResponse(data, queryLat, queryLon) {
        if (!data || !data.value || !data.value.timeSeries) {
            return [];
        }

        const siteMap = new Map();
        
        data.value.timeSeries.forEach(series => {
            const sourceInfo = series.sourceInfo;
            const siteNumber = sourceInfo.siteCode[0].value;
            
            if (!siteMap.has(siteNumber)) {
                const lat = parseFloat(sourceInfo.geoLocation.geogLocation.latitude);
                const lon = parseFloat(sourceInfo.geoLocation.geogLocation.longitude);
                const distance = this.calculateDistance(queryLat, queryLon, lat, lon) / 1000; // km
                
                siteMap.set(siteNumber, {
                    site_number: siteNumber,
                    site_name: sourceInfo.siteName,
                    latitude: lat,
                    longitude: lon,
                    distance_km: Math.round(distance * 10) / 10,
                    site_type: sourceInfo.siteProperty?.find(p => p.name === 'siteTypeCd')?.value || 'unknown',
                    drainage_area: sourceInfo.siteProperty?.find(p => p.name === 'drainageAreaVa')?.value || null,
                    parameters: []
                });
            }
            
            // Add parameter information
            const variable = series.variable;
            const site = siteMap.get(siteNumber);
            site.parameters.push({
                code: variable.variableCode[0].value,
                name: variable.variableName,
                unit: variable.unit.unitCode,
                description: variable.variableDescription
            });
        });

        // Convert to array and sort by distance
        return Array.from(siteMap.values()).sort((a, b) => a.distance_km - b.distance_km);
    }

    /**
     * Parse USGS water data response
     */
    parseWaterDataResponse(data, dataType) {
        if (!data || !data.value || !data.value.timeSeries) {
            return {};
        }

        const siteData = {};
        
        data.value.timeSeries.forEach(series => {
            const sourceInfo = series.sourceInfo;
            const siteNumber = sourceInfo.siteCode[0].value;
            const variable = series.variable;
            const parameterCode = variable.variableCode[0].value;
            
            if (!siteData[siteNumber]) {
                siteData[siteNumber] = {
                    site_number: siteNumber,
                    site_name: sourceInfo.siteName,
                    latitude: parseFloat(sourceInfo.geoLocation.geogLocation.latitude),
                    longitude: parseFloat(sourceInfo.geoLocation.geogLocation.longitude),
                    measurements: {}
                };
            }
            
            // Process measurement values
            const values = series.values[0].value || [];
            const processedValues = values.map(v => ({
                date_time: v.dateTime,
                value: parseFloat(v.value),
                qualifiers: v.qualifiers || []
            })).filter(v => !isNaN(v.value));
            
            siteData[siteNumber].measurements[parameterCode] = {
                parameter_code: parameterCode,
                parameter_name: variable.variableName,
                unit: variable.unit.unitCode,
                values: processedValues,
                latest_value: processedValues.length > 0 ? processedValues[processedValues.length - 1] : null,
                statistics: this.calculateWaterDataStatistics(processedValues)
            };
        });

        return siteData;
    }

    /**
     * Process flood risk data
     */
    processFloodRiskData(data, latitude, longitude) {
        const sites = data.sites || [];
        const currentData = data.current || {};
        const historicalData = data.historical || {};

        if (sites.length === 0) {
            return {
                flood_risk_score: null,
                risk_level: 'UNKNOWN',
                confidence: 'low',
                reason: 'No monitoring sites available',
                nearest_site_distance_km: null,
                monitoring_sites: [],
                current_conditions: null,
                historical_context: null,
                data_available: false,
                coordinates: { latitude, longitude }
            };
        }

        // Calculate flood risk based on current vs historical conditions
        let totalRiskScore = 0;
        let validSites = 0;
        const siteAssessments = [];

        sites.slice(0, 3).forEach(site => { // Use top 3 closest sites
            const currentSiteData = currentData[site.site_number];
            const historicalSiteData = historicalData[site.site_number];
            
            if (currentSiteData) {
                const assessment = this.assessSiteFloodRisk(currentSiteData, historicalSiteData, site);
                if (assessment.risk_score !== null) {
                    totalRiskScore += assessment.risk_score;
                    validSites++;
                    siteAssessments.push(assessment);
                }
            }
        });

        const averageRiskScore = validSites > 0 ? totalRiskScore / validSites : null;
        const riskLevel = this.getRiskLevelFromScore(averageRiskScore);
        const confidence = this.calculateFloodRiskConfidence(siteAssessments, validSites);

        return {
            flood_risk_score: averageRiskScore ? Math.round(averageRiskScore) : null,
            risk_level: riskLevel,
            confidence: confidence,
            monitoring_sites: sites.slice(0, 5).map(site => ({
                site_number: site.site_number,
                site_name: site.site_name,
                distance_km: site.distance_km,
                parameters: site.parameters.map(p => p.code)
            })),
            nearest_site_distance_km: sites[0] ? sites[0].distance_km : null,
            current_conditions: this.summarizeCurrentConditions(currentData, sites.slice(0, 3)),
            historical_context: this.summarizeHistoricalContext(historicalData, sites.slice(0, 3)),
            site_assessments: siteAssessments,
            data_available: validSites > 0,
            coordinates: { latitude, longitude }
        };
    }

    /**
     * Process water monitoring data
     */
    processWaterMonitoringData(data, latitude, longitude) {
        const sites = data.sites || [];
        const currentData = data.current || {};

        return {
            monitoring_sites: sites.slice(0, 10).map(site => ({
                site_number: site.site_number,
                site_name: site.site_name,
                latitude: site.latitude,
                longitude: site.longitude,
                distance_km: site.distance_km,
                site_type: site.site_type,
                drainage_area: site.drainage_area,
                parameters: site.parameters
            })),
            real_time_data: currentData,
            water_quality_summary: this.assessOverallWaterQuality(currentData),
            flood_indicators: this.identifyFloodIndicators(currentData, sites),
            data_available: Object.keys(currentData).length > 0,
            coordinates: { latitude, longitude }
        };
    }

    /**
     * Assess flood risk for individual site
     */
    assessSiteFloodRisk(currentData, historicalData, siteInfo) {
        const streamflowData = currentData.measurements[this.waterParameterCodes.streamflow];
        const gageHeightData = currentData.measurements[this.waterParameterCodes.gageHeight];
        
        if (!streamflowData && !gageHeightData) {
            return {
                site_number: currentData.site_number,
                risk_score: null,
                reason: 'No streamflow or gage height data available'
            };
        }

        let riskScore = 0;
        let factors = 0;

        // Assess current streamflow vs historical
        if (streamflowData && historicalData && historicalData.measurements[this.waterParameterCodes.streamflow]) {
            const currentFlow = streamflowData.latest_value?.value;
            const historicalFlow = historicalData.measurements[this.waterParameterCodes.streamflow];
            
            if (currentFlow && historicalFlow.statistics) {
                const percentile = this.calculatePercentile(currentFlow, historicalFlow.values.map(v => v.value));
                riskScore += this.getFloodRiskFromPercentile(percentile);
                factors++;
            }
        }

        // Assess current gage height vs historical
        if (gageHeightData && historicalData && historicalData.measurements[this.waterParameterCodes.gageHeight]) {
            const currentHeight = gageHeightData.latest_value?.value;
            const historicalHeight = historicalData.measurements[this.waterParameterCodes.gageHeight];
            
            if (currentHeight && historicalHeight.statistics) {
                const percentile = this.calculatePercentile(currentHeight, historicalHeight.values.map(v => v.value));
                riskScore += this.getFloodRiskFromPercentile(percentile);
                factors++;
            }
        }

        // Average if we have multiple factors
        if (factors > 0) {
            riskScore = riskScore / factors;
        }

        return {
            site_number: currentData.site_number,
            site_name: currentData.site_name,
            distance_km: siteInfo.distance_km,
            risk_score: factors > 0 ? Math.round(riskScore) : null,
            has_historical_comparison: !!historicalData,
            current_streamflow: streamflowData?.latest_value?.value || null,
            current_gage_height: gageHeightData?.latest_value?.value || null
        };
    }

    /**
     * Calculate basic statistics for water data
     */
    calculateWaterDataStatistics(values) {
        if (!values || values.length === 0) {
            return { count: 0, min: null, max: null, mean: null, median: null };
        }

        const numericValues = values.map(v => v.value).sort((a, b) => a - b);
        const count = numericValues.length;
        const sum = numericValues.reduce((a, b) => a + b, 0);
        const mean = sum / count;
        const median = count % 2 === 0 
            ? (numericValues[count/2 - 1] + numericValues[count/2]) / 2
            : numericValues[Math.floor(count/2)];

        return {
            count,
            min: numericValues[0],
            max: numericValues[count - 1],
            mean: Math.round(mean * 100) / 100,
            median: Math.round(median * 100) / 100
        };
    }

    /**
     * Calculate percentile for current value against historical data
     */
    calculatePercentile(currentValue, historicalValues) {
        if (!currentValue || !historicalValues || historicalValues.length === 0) {
            return 50; // Default to median if no data
        }

        const sortedValues = historicalValues.filter(v => !isNaN(v)).sort((a, b) => a - b);
        const belowCount = sortedValues.filter(v => v < currentValue).length;
        
        return (belowCount / sortedValues.length) * 100;
    }

    /**
     * Get flood risk score from percentile
     */
    getFloodRiskFromPercentile(percentile) {
        if (percentile >= 98) return 90; // Extreme
        if (percentile >= 95) return 75; // Very High
        if (percentile >= 90) return 60; // High
        if (percentile >= 75) return 40; // Moderate
        return 20; // Low/Normal
    }

    /**
     * Get risk level from numeric score
     */
    getRiskLevelFromScore(score) {
        if (score === null) return 'UNKNOWN';
        if (score >= 80) return 'VERY_HIGH';
        if (score >= 60) return 'HIGH';
        if (score >= 40) return 'MODERATE';
        if (score >= 20) return 'LOW';
        return 'VERY_LOW';
    }

    /**
     * Calculate confidence level for flood risk assessment
     */
    calculateFloodRiskConfidence(assessments, siteCount) {
        if (siteCount === 0) return 'low';
        
        const hasHistoricalData = assessments.filter(a => a.has_historical_comparison).length;
        const historicalRatio = hasHistoricalData / siteCount;
        
        if (siteCount >= 3 && historicalRatio >= 0.7) return 'high';
        if (siteCount >= 2 && historicalRatio >= 0.5) return 'medium';
        return 'low';
    }

    /**
     * Summarize current water conditions
     */
    summarizeCurrentConditions(currentData, sites) {
        const summary = {
            sites_with_data: 0,
            average_streamflow: null,
            average_gage_height: null,
            temperature_range: null
        };

        const streamflows = [];
        const gageHeights = [];
        const temperatures = [];

        Object.values(currentData).forEach(siteData => {
            if (siteData.measurements) {
                summary.sites_with_data++;
                
                const streamflow = siteData.measurements[this.waterParameterCodes.streamflow];
                if (streamflow?.latest_value?.value) {
                    streamflows.push(streamflow.latest_value.value);
                }
                
                const gageHeight = siteData.measurements[this.waterParameterCodes.gageHeight];
                if (gageHeight?.latest_value?.value) {
                    gageHeights.push(gageHeight.latest_value.value);
                }
                
                const temp = siteData.measurements[this.waterParameterCodes.temperature];
                if (temp?.latest_value?.value) {
                    temperatures.push(temp.latest_value.value);
                }
            }
        });

        if (streamflows.length > 0) {
            summary.average_streamflow = Math.round((streamflows.reduce((a, b) => a + b, 0) / streamflows.length) * 100) / 100;
        }
        if (gageHeights.length > 0) {
            summary.average_gage_height = Math.round((gageHeights.reduce((a, b) => a + b, 0) / gageHeights.length) * 100) / 100;
        }
        if (temperatures.length > 0) {
            summary.temperature_range = {
                min: Math.min(...temperatures),
                max: Math.max(...temperatures),
                average: Math.round((temperatures.reduce((a, b) => a + b, 0) / temperatures.length) * 100) / 100
            };
        }

        return summary;
    }

    /**
     * Summarize historical context
     */
    summarizeHistoricalContext(historicalData, sites) {
        return {
            sites_with_historical_data: Object.keys(historicalData).length,
            data_period: '5 years',
            analysis: 'Current conditions compared against 5-year historical averages and percentiles'
        };
    }

    /**
     * Assess overall water quality
     */
    assessOverallWaterQuality(currentData) {
        let goodSites = 0;
        let totalSites = 0;
        const concerns = [];

        Object.values(currentData).forEach(siteData => {
            if (siteData.measurements) {
                totalSites++;
                let siteQuality = 'good';
                
                // Check temperature
                const temp = siteData.measurements[this.waterParameterCodes.temperature];
                if (temp?.latest_value?.value > 25) {
                    siteQuality = 'fair';
                    if (temp.latest_value.value > 30) {
                        siteQuality = 'poor';
                        concerns.push(`High temperature at ${siteData.site_name}`);
                    }
                }
                
                // Check dissolved oxygen if available
                const do_ = siteData.measurements[this.waterParameterCodes.dissolvedOxygen];
                if (do_?.latest_value?.value < 5) {
                    siteQuality = 'poor';
                    concerns.push(`Low dissolved oxygen at ${siteData.site_name}`);
                }
                
                if (siteQuality === 'good') {
                    goodSites++;
                }
            }
        });

        if (totalSites === 0) return null;

        const overallQuality = goodSites / totalSites >= 0.7 ? 'good' : 
                             goodSites / totalSites >= 0.4 ? 'fair' : 'poor';

        return {
            overall_quality: overallQuality,
            sites_assessed: totalSites,
            good_quality_sites: goodSites,
            concerns: concerns
        };
    }

    /**
     * Identify flood indicators
     */
    identifyFloodIndicators(currentData, sites) {
        const indicators = {
            elevated_streamflow: [],
            elevated_gage_height: [],
            rapid_changes: [],
            overall_flood_risk: 'low'
        };

        // This is a simplified implementation
        // In a full implementation, we would compare against historical flood thresholds
        Object.values(currentData).forEach(siteData => {
            if (siteData.measurements) {
                const streamflow = siteData.measurements[this.waterParameterCodes.streamflow];
                const gageHeight = siteData.measurements[this.waterParameterCodes.gageHeight];
                
                // Check for elevated values (simplified logic)
                if (streamflow?.statistics?.mean && streamflow.latest_value?.value > streamflow.statistics.mean * 2) {
                    indicators.elevated_streamflow.push(siteData.site_name);
                }
                
                if (gageHeight?.statistics?.mean && gageHeight.latest_value?.value > gageHeight.statistics.mean * 1.5) {
                    indicators.elevated_gage_height.push(siteData.site_name);
                }
            }
        });

        // Determine overall flood risk
        if (indicators.elevated_streamflow.length > 0 || indicators.elevated_gage_height.length > 0) {
            indicators.overall_flood_risk = indicators.elevated_streamflow.length > 1 || 
                                          indicators.elevated_gage_height.length > 1 ? 'high' : 'moderate';
        }

        return indicators;
    }

    /**
     * Get relative date for historical queries
     */
    getRelativeDate(days) {
        const date = new Date();
        date.setDate(date.getDate() + days);
        return date.toISOString().split('T')[0];
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
            console.log(`USGS API rate limiting: waiting ${delay}ms`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }

        this.rateLimit.lastRequestTime = Date.now();
    }

    /**
     * Test connection to USGS API
     */
    async testConnection() {
        try {
            const response = await this.client.get('/fdsnws/event/1/version');
            return {
                success: true,
                status: response.status,
                message: 'USGS API connection successful',
                data_source: this.dataSource,
                version: response.data
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

module.exports = UsgsDataClient;