/**
 * FEMAClient - FEMA National Risk Index API integration
 * Provides access to FEMA's comprehensive risk data for 18 natural hazards
 * Supports risk scores by census tract, county, and state
 */

const { EventEmitter } = require('events');

class FEMAClient extends EventEmitter {
    constructor(options = {}) {
        super();
        
        this.httpClient = options.httpClient;
        this.cacheManager = options.cacheManager;
        this.baseUrl = 'https://www.fema.gov/api/open/v2';
        
        // FEMA API configuration
        this.config = {
            rateLimit: 1000, // requests per hour
            timeout: 30000, // 30 seconds
            retryAttempts: 3,
            defaultPageSize: 1000,
            maxPageSize: 10000
        };
        
        // Supported FEMA datasets
        this.datasets = {
            nationalRiskIndex: 'NationalRiskIndex',
            disasterDeclarations: 'DisasterDeclarationsSummaries',
            femaRegions: 'FemaRegions',
            hazardMitigation: 'HazardMitigationAssistanceProjects',
            floodInsurance: 'FimaFloodInsurancePolicies'
        };
        
        // Risk type mappings to FEMA NRI fields
        this.riskMappings = {
            avalanche: 'AVLN',
            coastal_flooding: 'CFLD',
            cold_wave: 'CWAV',
            drought: 'DRGT',
            earthquake: 'ERQK',
            hail: 'HAIL',
            heat_wave: 'HWAV',
            hurricane: 'HRCN',
            ice_storm: 'ISTM',
            landslide: 'LNDS',
            lightning: 'LTNG',
            riverine_flooding: 'RFLD',
            strong_wind: 'SWND',
            tornado: 'TRND',
            tsunami: 'TSUN',
            volcanic_activity: 'VLCN',
            wildfire: 'WFIR',
            winter_weather: 'WNTW'
        };
        
        // Cache TTL for different data types
        this.cacheTTL = {
            riskIndex: 3600, // 1 hour
            disasters: 86400, // 1 day
            boundaries: 604800 // 1 week
        };
        
        // Request statistics
        this.stats = {
            totalRequests: 0,
            successfulRequests: 0,
            errorRequests: 0,
            cacheHits: 0,
            averageResponseTime: 0
        };
    }

    /**
     * Get National Risk Index data for a location
     */
    async getNationalRiskIndex(query) {
        const requestId = this._generateRequestId();
        const startTime = Date.now();
        
        try {
            // Build cache key
            const cacheKey = `fema:nri:${JSON.stringify(query)}`;
            
            // Check cache first
            if (this.cacheManager) {
                const cached = await this.cacheManager.get(cacheKey);
                if (cached) {
                    this.stats.cacheHits++;
                    this.emit('cacheHit', { requestId, cacheKey });
                    return this._formatNRIResponse(cached);
                }
            }
            
            // Build FEMA API request
            const url = this._buildNRIUrl(query);
            
            console.log(`[${requestId}] Fetching FEMA NRI data: ${url}`);
            
            const response = await this.httpClient.get(url, {
                timeout: this.config.timeout,
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'Seawater-Climate-Platform/1.0'
                }
            });
            
            const responseTime = Date.now() - startTime;
            this._updateStats(true, responseTime);
            
            // Validate response
            if (!response.data || !response.data.NationalRiskIndex) {
                throw new Error('Invalid FEMA NRI response format');
            }
            
            const nriData = response.data.NationalRiskIndex;
            
            // Cache the response
            if (this.cacheManager) {
                await this.cacheManager.set(cacheKey, nriData, {
                    ttl: this.cacheTTL.riskIndex
                });
            }
            
            const formattedResponse = this._formatNRIResponse(nriData);
            
            this.emit('dataFetched', {
                requestId,
                endpoint: 'nationalRiskIndex',
                responseTime,
                recordCount: nriData.length
            });
            
            return formattedResponse;
            
        } catch (error) {
            const responseTime = Date.now() - startTime;
            this._updateStats(false, responseTime);
            
            this.emit('requestError', {
                requestId,
                endpoint: 'nationalRiskIndex',
                error: error.message,
                responseTime
            });
            
            throw new Error(`FEMA NRI request failed: ${error.message}`);
        }
    }

    /**
     * Get risk data by address (requires geocoding to census tract)
     */
    async getRiskByAddress(address, options = {}) {
        try {
            // First, we need to geocode the address to get FIPS code
            // This would typically be done by the geocoding service
            // For now, we'll assume we have the FIPS code
            if (!options.fipsCode && !options.stateCode) {
                throw new Error('FIPS code or state code required for FEMA NRI lookup');
            }
            
            const query = {
                $filter: this._buildLocationFilter(options),
                $select: this._buildSelectFields(),
                $orderby: 'StateAbbreviation,CountyName,CensusTracts'
            };
            
            return await this.getNationalRiskIndex(query);
            
        } catch (error) {
            throw new Error(`FEMA risk lookup by address failed: ${error.message}`);
        }
    }

    /**
     * Get risk data by coordinates (lat/lon)
     */
    async getRiskByCoordinates(latitude, longitude, options = {}) {
        try {
            // FEMA NRI doesn't support coordinate queries directly
            // We need to find the census tract for these coordinates
            // This would typically involve spatial lookup or geocoding
            throw new Error('Coordinate lookup requires census tract conversion - use geocoding service first');
            
        } catch (error) {
            throw new Error(`FEMA coordinate lookup failed: ${error.message}`);
        }
    }

    /**
     * Get risk data by FIPS code (census tract or county)
     */
    async getRiskByFIPS(fipsCode, options = {}) {
        try {
            const isCensusTract = fipsCode.length === 11;
            const isCounty = fipsCode.length === 5;
            
            if (!isCensusTract && !isCounty) {
                throw new Error('FIPS code must be 5 digits (county) or 11 digits (census tract)');
            }
            
            const query = {
                $filter: isCensusTract 
                    ? `CensusTracts eq '${fipsCode}'`
                    : `substring(CensusTracts,1,5) eq '${fipsCode}'`,
                $select: this._buildSelectFields(),
                $orderby: 'CensusTracts'
            };
            
            return await this.getNationalRiskIndex(query);
            
        } catch (error) {
            throw new Error(`FEMA FIPS lookup failed: ${error.message}`);
        }
    }

    /**
     * Get disaster declarations for an area
     */
    async getDisasterDeclarations(query) {
        const requestId = this._generateRequestId();
        const startTime = Date.now();
        
        try {
            const cacheKey = `fema:disasters:${JSON.stringify(query)}`;
            
            // Check cache
            if (this.cacheManager) {
                const cached = await this.cacheManager.get(cacheKey);
                if (cached) {
                    this.stats.cacheHits++;
                    return this._formatDisasterResponse(cached);
                }
            }
            
            const url = this._buildDisasterUrl(query);
            
            console.log(`[${requestId}] Fetching FEMA disaster declarations: ${url}`);
            
            const response = await this.httpClient.get(url, {
                timeout: this.config.timeout,
                headers: {
                    'Accept': 'application/json'
                }
            });
            
            const responseTime = Date.now() - startTime;
            this._updateStats(true, responseTime);
            
            if (!response.data || !response.data.DisasterDeclarationsSummaries) {
                throw new Error('Invalid FEMA disaster declarations response');
            }
            
            const disasters = response.data.DisasterDeclarationsSummaries;
            
            // Cache the response
            if (this.cacheManager) {
                await this.cacheManager.set(cacheKey, disasters, {
                    ttl: this.cacheTTL.disasters
                });
            }
            
            this.emit('dataFetched', {
                requestId,
                endpoint: 'disasterDeclarations',
                responseTime,
                recordCount: disasters.length
            });
            
            return this._formatDisasterResponse(disasters);
            
        } catch (error) {
            const responseTime = Date.now() - startTime;
            this._updateStats(false, responseTime);
            
            throw new Error(`FEMA disaster declarations request failed: ${error.message}`);
        }
    }

    /**
     * Get hazard-specific risk scores
     */
    async getHazardRisk(hazardType, location, options = {}) {
        try {
            if (!this.riskMappings[hazardType]) {
                throw new Error(`Unsupported hazard type: ${hazardType}`);
            }
            
            const riskCode = this.riskMappings[hazardType];
            
            // Build specific query for this hazard
            const query = {
                $filter: this._buildLocationFilter(location),
                $select: `StateAbbreviation,CountyName,CensusTracts,${riskCode}_RISKS,${riskCode}_RISKR,${riskCode}_EALT,${riskCode}_EALR`,
                $orderby: 'StateAbbreviation,CountyName'
            };
            
            const response = await this.getNationalRiskIndex(query);
            
            return this._formatHazardResponse(response, riskCode, hazardType);
            
        } catch (error) {
            throw new Error(`FEMA hazard risk request failed: ${error.message}`);
        }
    }

    /**
     * Build National Risk Index API URL
     */
    _buildNRIUrl(query) {
        const url = new URL(`${this.baseUrl}/${this.datasets.nationalRiskIndex}`);
        
        for (const [key, value] of Object.entries(query)) {
            if (value !== undefined && value !== null) {
                url.searchParams.append(key, value);
            }
        }
        
        return url.toString();
    }

    /**
     * Build disaster declarations API URL
     */
    _buildDisasterUrl(query) {
        const url = new URL(`${this.baseUrl}/${this.datasets.disasterDeclarations}`);
        
        for (const [key, value] of Object.entries(query)) {
            if (value !== undefined && value !== null) {
                url.searchParams.append(key, value);
            }
        }
        
        return url.toString();
    }

    /**
     * Build location filter for FEMA queries
     */
    _buildLocationFilter(location) {
        if (location.fipsCode) {
            return `CensusTracts eq '${location.fipsCode}'`;
        }
        
        if (location.stateCode && location.countyName) {
            return `StateAbbreviation eq '${location.stateCode}' and CountyName eq '${location.countyName}'`;
        }
        
        if (location.stateCode) {
            return `StateAbbreviation eq '${location.stateCode}'`;
        }
        
        throw new Error('Location must include fipsCode, stateCode, or stateCode+countyName');
    }

    /**
     * Build select fields for NRI queries
     */
    _buildSelectFields() {
        const baseFields = [
            'StateAbbreviation',
            'CountyName', 
            'CensusTracts',
            'RISKS',
            'RISKR',
            'POPULATION',
            'BUILDVALUE',
            'AGRIVALUE'
        ];
        
        // Add all risk score fields
        const riskFields = [];
        for (const code of Object.values(this.riskMappings)) {
            riskFields.push(`${code}_RISKS`, `${code}_RISKR`, `${code}_EALT`, `${code}_EALR`);
        }
        
        return baseFields.concat(riskFields).join(',');
    }

    /**
     * Format National Risk Index response
     */
    _formatNRIResponse(nriData) {
        if (!Array.isArray(nriData)) {
            nriData = [nriData];
        }
        
        return nriData.map(record => ({
            location: {
                state: record.StateAbbreviation,
                county: record.CountyName,
                censusTract: record.CensusTracts,
                fipsCode: record.CensusTracts
            },
            overallRisk: {
                score: this._parseRiskScore(record.RISKS),
                rating: this._parseRiskRating(record.RISKR),
                percentile: this._parseRiskScore(record.RISKS)
            },
            demographics: {
                population: parseInt(record.POPULATION) || 0,
                buildingValue: parseFloat(record.BUILDVALUE) || 0,
                agricultureValue: parseFloat(record.AGRIVALUE) || 0
            },
            hazardRisks: this._extractHazardRisks(record),
            dataSource: 'FEMA_NRI',
            lastUpdated: new Date().toISOString()
        }));
    }

    /**
     * Format disaster declarations response
     */
    _formatDisasterResponse(disasters) {
        return disasters.map(disaster => ({
            disasterNumber: disaster.disasterNumber,
            declarationType: disaster.declarationType,
            incidentType: disaster.incidentType,
            title: disaster.title,
            state: disaster.state,
            counties: disaster.declaredCountyArea ? disaster.declaredCountyArea.split(';') : [],
            declarationDate: disaster.declarationDate,
            incidentBeginDate: disaster.incidentBeginDate,
            incidentEndDate: disaster.incidentEndDate,
            closeoutDate: disaster.closeoutDate,
            femaRegion: disaster.femaRegion,
            lastRefresh: disaster.lastRefresh
        }));
    }

    /**
     * Format hazard-specific response
     */
    _formatHazardResponse(response, riskCode, hazardType) {
        return response.map(location => ({
            ...location,
            hazardSpecific: {
                type: hazardType,
                riskScore: this._parseRiskScore(location[`${riskCode}_RISKS`]),
                riskRating: this._parseRiskRating(location[`${riskCode}_RISKR`]),
                expectedAnnualLoss: parseFloat(location[`${riskCode}_EALT`]) || 0,
                expectedAnnualLossRating: this._parseRiskRating(location[`${riskCode}_EALR`])
            }
        }));
    }

    /**
     * Extract hazard risks from NRI record
     */
    _extractHazardRisks(record) {
        const hazardRisks = {};
        
        for (const [hazardType, code] of Object.entries(this.riskMappings)) {
            const riskScore = this._parseRiskScore(record[`${code}_RISKS`]);
            const riskRating = this._parseRiskRating(record[`${code}_RISKR`]);
            
            if (riskScore !== null || riskRating !== null) {
                hazardRisks[hazardType] = {
                    score: riskScore,
                    rating: riskRating,
                    expectedAnnualLoss: parseFloat(record[`${code}_EALT`]) || 0,
                    expectedAnnualLossRating: this._parseRiskRating(record[`${code}_EALR`])
                };
            }
        }
        
        return hazardRisks;
    }

    /**
     * Parse risk score from FEMA data
     */
    _parseRiskScore(value) {
        if (value === null || value === undefined || value === '') {
            return null;
        }
        
        const score = parseFloat(value);
        return isNaN(score) ? null : Math.round(score * 100) / 100;
    }

    /**
     * Parse risk rating from FEMA data
     */
    _parseRiskRating(value) {
        if (!value) return null;
        
        const ratingMap = {
            'Very Low': 'very_low',
            'Relatively Low': 'low', 
            'Relatively Moderate': 'moderate',
            'Relatively High': 'high',
            'Very High': 'very_high'
        };
        
        return ratingMap[value] || value.toLowerCase().replace(/\s+/g, '_');
    }

    /**
     * Update request statistics
     */
    _updateStats(success, responseTime) {
        this.stats.totalRequests++;
        
        if (success) {
            this.stats.successfulRequests++;
        } else {
            this.stats.errorRequests++;
        }
        
        // Update average response time (exponential moving average)
        if (this.stats.totalRequests === 1) {
            this.stats.averageResponseTime = responseTime;
        } else {
            this.stats.averageResponseTime = 
                this.stats.averageResponseTime * 0.9 + responseTime * 0.1;
        }
    }

    /**
     * Generate unique request ID
     */
    _generateRequestId() {
        return `fema_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Get client statistics
     */
    getStats() {
        const successRate = this.stats.totalRequests > 0 
            ? Math.round((this.stats.successfulRequests / this.stats.totalRequests) * 100) 
            : 0;
            
        return {
            ...this.stats,
            successRate,
            averageResponseTime: Math.round(this.stats.averageResponseTime),
            cacheHitRate: this.stats.totalRequests > 0 
                ? Math.round((this.stats.cacheHits / this.stats.totalRequests) * 100) 
                : 0
        };
    }

    /**
     * Reset statistics
     */
    resetStats() {
        this.stats = {
            totalRequests: 0,
            successfulRequests: 0,
            errorRequests: 0,
            cacheHits: 0,
            averageResponseTime: 0
        };
    }

    /**
     * Test connection to FEMA API
     */
    async testConnection() {
        try {
            const testQuery = {
                $filter: "StateAbbreviation eq 'CA'",
                $select: 'StateAbbreviation,CountyName',
                $top: 1
            };
            
            const response = await this.getNationalRiskIndex(testQuery);
            
            return {
                success: true,
                message: 'FEMA API connection successful',
                responseTime: this.stats.averageResponseTime,
                recordCount: response.length
            };
            
        } catch (error) {
            return {
                success: false,
                message: `FEMA API connection failed: ${error.message}`,
                error: error.message
            };
        }
    }
}

module.exports = FEMAClient;