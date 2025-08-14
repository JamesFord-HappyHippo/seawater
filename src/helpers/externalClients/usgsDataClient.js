// usgsDataClient.js - Seawater Climate Risk Platform
// USGS Earthquake and Geological Hazards API client following Tim-Combo patterns

const { HttpClient } = require('../httpClient');
const { DataSourceError, RateLimitError } = require('../errorHandler');
const { getCachedResponse, setCachedResponse } = require('../cacheManager');

/**
 * USGS Data Client
 * Provides access to earthquake, geological, and hazard data
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

        this.rateLimit = {
            perSecond: 10,
            lastRequestTime: 0
        };

        this.dataSource = 'USGS_Earthquake_Hazards';
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