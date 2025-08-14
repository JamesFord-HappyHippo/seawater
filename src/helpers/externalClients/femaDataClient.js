// femaDataClient.js - Seawater Climate Risk Platform
// FEMA National Risk Index API client following Tim-Combo patterns

const { HttpClient } = require('../httpClient');
const { DataSourceError, RateLimitError } = require('../errorHandler');
const { getCachedResponse, setCachedResponse } = require('../cacheManager');

/**
 * FEMA National Risk Index Client
 * Provides free access to federal risk assessment data
 */
class FemaDataClient {
    constructor(config = {}) {
        this.client = new HttpClient({
            baseURL: config.baseURL || 'https://www.fema.gov/api/open/v2',
            timeout: config.timeout || 30000,
            userAgent: 'Seawater-Climate-Risk/1.0',
            retryConfig: { retries: 3, retryDelay: 2000 },
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });

        this.rateLimit = {
            hourly: 1000,
            perSecond: 10,
            lastRequestTime: 0
        };

        this.dataSource = 'FEMA_National_Risk_Index';
    }

    /**
     * Get risk data for coordinates
     */
    async getRiskByCoordinates(latitude, longitude) {
        try {
            await this.checkRateLimit();

            const cacheKey = `fema_risk_${latitude}_${longitude}`;
            
            // Check cache first (24 hour TTL for FEMA data)
            try {
                const cached = await getCachedResponse(cacheKey);
                if (cached) {
                    console.log('FEMA data cache hit:', { latitude, longitude });
                    return {
                        success: true,
                        data: cached.data,
                        source: this.dataSource,
                        cached: true,
                        timestamp: cached.timestamp
                    };
                }
            } catch (cacheError) {
                console.warn('FEMA cache lookup failed:', cacheError.message);
            }

            console.log('Fetching FEMA risk data for coordinates:', { latitude, longitude });

            // FEMA API endpoint for National Risk Index
            const params = {
                lat: latitude,
                lng: longitude,
                format: 'json'
            };

            const response = await this.client.get(
                `/nationalriskindex/geopoint${this.client.buildQueryString(params)}`,
                { source: this.dataSource }
            );

            if (!response.data || !response.data.features) {
                throw new DataSourceError(
                    'Invalid response format from FEMA API',
                    this.dataSource,
                    response.status
                );
            }

            const processedData = this.processFemaResponse(response.data, latitude, longitude);

            // Cache the response
            try {
                await setCachedResponse(cacheKey, {
                    data: processedData,
                    timestamp: new Date().toISOString(),
                    source: this.dataSource
                }, 86400); // 24 hours
            } catch (cacheError) {
                console.warn('Failed to cache FEMA response:', cacheError.message);
            }

            console.log('FEMA risk data retrieved successfully:', {
                latitude,
                longitude,
                overallRisk: processedData.overall_risk_rating,
                floodRisk: processedData.flood_risk_rating
            });

            return {
                success: true,
                data: processedData,
                source: this.dataSource,
                cached: false,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            console.error('FEMA API error:', {
                error: error.message,
                latitude,
                longitude,
                source: this.dataSource
            });

            if (error.status === 429) {
                throw new RateLimitError(
                    'FEMA API rate limit exceeded',
                    this.dataSource,
                    new Date(Date.now() + 3600000).toISOString() // 1 hour
                );
            }

            throw new DataSourceError(
                `FEMA API error: ${error.message}`,
                this.dataSource,
                error.status || null
            );
        }
    }

    /**
     * Get flood zone information for coordinates
     */
    async getFloodZoneData(latitude, longitude) {
        try {
            await this.checkRateLimit();

            const cacheKey = `fema_flood_${latitude}_${longitude}`;
            
            // Check cache first
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
                console.warn('FEMA flood zone cache lookup failed:', cacheError.message);
            }

            console.log('Fetching FEMA flood zone data:', { latitude, longitude });

            const params = {
                lat: latitude,
                lng: longitude,
                format: 'json'
            };

            const response = await this.client.get(
                `/floodplain/geopoint${this.client.buildQueryString(params)}`,
                { source: this.dataSource }
            );

            const floodData = this.processFloodZoneResponse(response.data, latitude, longitude);

            // Cache the response
            try {
                await setCachedResponse(cacheKey, {
                    data: floodData,
                    timestamp: new Date().toISOString()
                }, 86400); // 24 hours
            } catch (cacheError) {
                console.warn('Failed to cache FEMA flood zone response:', cacheError.message);
            }

            return {
                success: true,
                data: floodData,
                source: this.dataSource,
                cached: false
            };

        } catch (error) {
            console.error('FEMA flood zone API error:', error);
            throw new DataSourceError(
                `FEMA flood zone API error: ${error.message}`,
                this.dataSource,
                error.status || null
            );
        }
    }

    /**
     * Get disaster declaration history for location
     */
    async getDisasterHistory(latitude, longitude, years = 10) {
        try {
            await this.checkRateLimit();

            const cacheKey = `fema_disasters_${latitude}_${longitude}_${years}`;
            
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
                console.warn('FEMA disaster history cache lookup failed:', cacheError.message);
            }

            console.log('Fetching FEMA disaster history:', { latitude, longitude, years });

            // Calculate date range
            const endDate = new Date().toISOString().split('T')[0];
            const startDate = new Date(Date.now() - (years * 365 * 24 * 60 * 60 * 1000))
                .toISOString().split('T')[0];

            const params = {
                lat: latitude,
                lng: longitude,
                declarationDateStart: startDate,
                declarationDateEnd: endDate,
                format: 'json'
            };

            const response = await this.client.get(
                `/disasters/geopoint${this.client.buildQueryString(params)}`,
                { source: this.dataSource }
            );

            const disasterData = this.processDisasterHistoryResponse(response.data, years);

            // Cache for 7 days (disaster history changes infrequently)
            try {
                await setCachedResponse(cacheKey, {
                    data: disasterData,
                    timestamp: new Date().toISOString()
                }, 604800); // 7 days
            } catch (cacheError) {
                console.warn('Failed to cache FEMA disaster history response:', cacheError.message);
            }

            return {
                success: true,
                data: disasterData,
                source: this.dataSource,
                cached: false
            };

        } catch (error) {
            console.error('FEMA disaster history API error:', error);
            throw new DataSourceError(
                `FEMA disaster history API error: ${error.message}`,
                this.dataSource,
                error.status || null
            );
        }
    }

    /**
     * Process FEMA National Risk Index response
     */
    processFemaResponse(data, latitude, longitude) {
        if (!data.features || data.features.length === 0) {
            return {
                overall_risk_rating: 'NOT_MAPPED',
                overall_risk_score: null,
                flood_risk_rating: 'NOT_MAPPED',
                flood_risk_score: null,
                community_resilience: null,
                social_vulnerability: null,
                data_available: false,
                coordinates: { latitude, longitude }
            };
        }

        const feature = data.features[0];
        const properties = feature.properties || {};

        // FEMA uses different scoring systems - normalize to 0-100
        const normalizeRiskRating = (rating) => {
            const ratingMap = {
                'VERY_LOW': 10,
                'RELATIVELY_LOW': 25,
                'RELATIVELY_MODERATE': 50,
                'RELATIVELY_HIGH': 75,
                'VERY_HIGH': 90,
                'NOT_MAPPED': null
            };
            return ratingMap[rating] || null;
        };

        return {
            overall_risk_rating: properties.RISK_RATNG || 'NOT_MAPPED',
            overall_risk_score: normalizeRiskRating(properties.RISK_RATNG),
            
            // Individual hazard risks
            flood_risk_rating: properties.CFLD_RATNG || 'NOT_MAPPED',
            flood_risk_score: normalizeRiskRating(properties.CFLD_RATNG),
            
            wildfire_risk_rating: properties.WFIR_RATNG || 'NOT_MAPPED',
            wildfire_risk_score: normalizeRiskRating(properties.WFIR_RATNG),
            
            hurricane_risk_rating: properties.HRCN_RATNG || 'NOT_MAPPED',
            hurricane_risk_score: normalizeRiskRating(properties.HRCN_RATNG),
            
            tornado_risk_rating: properties.TRND_RATNG || 'NOT_MAPPED',
            tornado_risk_score: normalizeRiskRating(properties.TRND_RATNG),
            
            earthquake_risk_rating: properties.ERQK_RATNG || 'NOT_MAPPED',
            earthquake_risk_score: normalizeRiskRating(properties.ERQK_RATNG),
            
            hail_risk_rating: properties.HAIL_RATNG || 'NOT_MAPPED',
            hail_risk_score: normalizeRiskRating(properties.HAIL_RATNG),
            
            // Community characteristics
            community_resilience: properties.RESL_RATNG || 'NOT_MAPPED',
            social_vulnerability: properties.SOVI_RATNG || 'NOT_MAPPED',
            
            // Administrative info
            state_fips: properties.STATEFP,
            county_fips: properties.COUNTYFP,
            county_name: properties.COUNTY,
            state_name: properties.STATE,
            
            data_available: true,
            coordinates: { latitude, longitude },
            fema_tract_id: properties.TRACTFIPS
        };
    }

    /**
     * Process FEMA flood zone response
     */
    processFloodZoneResponse(data, latitude, longitude) {
        if (!data.features || data.features.length === 0) {
            return {
                flood_zone: 'UNMAPPED',
                flood_zone_description: 'Area not mapped for flood zones',
                in_special_flood_hazard_area: false,
                coordinates: { latitude, longitude }
            };
        }

        const feature = data.features[0];
        const properties = feature.properties || {};

        const floodZone = properties.FLD_ZONE || 'UNMAPPED';
        
        // Determine if in Special Flood Hazard Area (SFHA)
        const sfhaZones = ['A', 'AE', 'AH', 'AO', 'AR', 'A99', 'V', 'VE'];
        const inSFHA = sfhaZones.some(zone => floodZone.startsWith(zone));

        return {
            flood_zone: floodZone,
            flood_zone_description: this.getFloodZoneDescription(floodZone),
            in_special_flood_hazard_area: inSFHA,
            base_flood_elevation: properties.BFE || null,
            flood_zone_subtype: properties.ZONE_SUBTY || null,
            effective_date: properties.EFF_DATE || null,
            coordinates: { latitude, longitude }
        };
    }

    /**
     * Process disaster history response
     */
    processDisasterHistoryResponse(data, years) {
        if (!data.declarations || data.declarations.length === 0) {
            return {
                total_disasters: 0,
                disaster_types: {},
                recent_disasters: [],
                years_analyzed: years
            };
        }

        const disasters = data.declarations;
        const disasterTypes = {};
        
        disasters.forEach(disaster => {
            const type = disaster.incidentType || 'Unknown';
            disasterTypes[type] = (disasterTypes[type] || 0) + 1;
        });

        // Get most recent disasters
        const recentDisasters = disasters
            .sort((a, b) => new Date(b.declarationDate) - new Date(a.declarationDate))
            .slice(0, 10)
            .map(disaster => ({
                title: disaster.title,
                incident_type: disaster.incidentType,
                declaration_date: disaster.declarationDate,
                disaster_number: disaster.disasterNumber,
                incident_begin_date: disaster.incidentBeginDate,
                incident_end_date: disaster.incidentEndDate
            }));

        return {
            total_disasters: disasters.length,
            disaster_types: disasterTypes,
            recent_disasters: recentDisasters,
            years_analyzed: years,
            most_common_disaster: Object.keys(disasterTypes).reduce((a, b) => 
                disasterTypes[a] > disasterTypes[b] ? a : b, 'None')
        };
    }

    /**
     * Get flood zone description
     */
    getFloodZoneDescription(zone) {
        const descriptions = {
            'A': 'High risk flood area with no base flood elevation determined',
            'AE': 'High risk flood area with base flood elevation determined',
            'AH': 'High risk flood area with ponding depths 1-3 feet',
            'AO': 'High risk flood area with sheet flow depths 1-3 feet',
            'AR': 'High risk flood area resulting from levee decertification',
            'A99': 'High risk flood area to be protected by Federal flood control system',
            'V': 'High risk coastal area with velocity hazard',
            'VE': 'High risk coastal area with velocity hazard and base flood elevation',
            'X': 'Moderate to low risk area',
            'B': 'Moderate risk area (legacy designation)',
            'C': 'Low risk area (legacy designation)',
            'D': 'Possible but undetermined flood hazard',
            'UNMAPPED': 'Area not included in flood insurance study'
        };

        return descriptions[zone] || 'Unknown flood zone designation';
    }

    /**
     * Rate limiting check
     */
    async checkRateLimit() {
        const now = Date.now();
        const timeSinceLastRequest = now - this.rateLimit.lastRequestTime;
        const minInterval = 1000 / this.rateLimit.perSecond; // milliseconds between requests

        if (timeSinceLastRequest < minInterval) {
            const delay = minInterval - timeSinceLastRequest;
            console.log(`FEMA API rate limiting: waiting ${delay}ms`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }

        this.rateLimit.lastRequestTime = Date.now();
    }

    /**
     * Test connection to FEMA API
     */
    async testConnection() {
        try {
            const response = await this.client.get('/healthcheck');
            return {
                success: true,
                status: response.status,
                message: 'FEMA API connection successful',
                data_source: this.dataSource
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

module.exports = FemaDataClient;