// climateDataAggregator.js - Seawater Climate Risk Platform
// Aggregate climate risk data from multiple sources following Tim-Combo patterns

const { ExternalAPIError, ClimateDataError } = require('./errorHandler');

// External client imports
const FEMAClient = require('./externalClients/femaDataClient');
const NOAAClient = require('./externalClients/noaaDataClient');
const USGSClient = require('./externalClients/usgsDataClient');
const ClimateCheckClient = require('./externalClients/climateCheckClient');
const FirstStreetClient = require('./externalClients/firstStreetClient');

/**
 * Risk score normalization utilities
 */
class RiskNormalizer {
    /**
     * Normalize different risk scales to 0-100 scale
     * @param {number} value - Original value
     * @param {Object} scale - Scale definition
     * @returns {number} Normalized score (0-100)
     */
    static normalize(value, scale) {
        if (value === null || value === undefined) return null;
        
        const { min, max, type } = scale;
        
        switch (type) {
            case 'linear':
                return Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
            case 'logarithmic':
                const logValue = Math.log(value + 1);
                const logMax = Math.log(max + 1);
                return Math.max(0, Math.min(100, (logValue / logMax) * 100));
            case 'inverse':
                // Higher input values = lower risk scores
                return Math.max(0, Math.min(100, ((max - value) / (max - min)) * 100));
            default:
                return Math.round(value);
        }
    }

    /**
     * FEMA National Risk Index normalization
     */
    static normalizeFEMAScore(nriScore) {
        // FEMA NRI uses percentile ranking, already 0-100
        return Math.round(nriScore || 0);
    }

    /**
     * First Street Foundation score normalization
     */
    static normalizeFirstStreetScore(fsScore, riskType) {
        // First Street uses 1-10 scale
        return Math.round(((fsScore - 1) / 9) * 100);
    }

    /**
     * NOAA temperature anomaly to heat risk
     */
    static normalizeTemperatureAnomaly(anomaly) {
        // Temperature anomaly in Celsius, convert to 0-100 risk scale
        // 0°C anomaly = 30 risk, +5°C = 100 risk
        return Math.max(0, Math.min(100, 30 + (anomaly * 14)));
    }
}

/**
 * Climate risk data aggregation service
 */
class ClimateDataAggregator {
    constructor() {
        this.clients = {
            fema: new FEMAClient(),
            noaa: new NOAAClient(),
            usgs: new USGSClient(),
            climateCheck: new ClimateCheckClient(),
            firstStreet: new FirstStreetClient()
        };
        
        this.cache = new Map();
        this.cacheExpiry = 30 * 24 * 60 * 60 * 1000; // 30 days
    }

    /**
     * Aggregate climate risk data from all available sources
     * @param {number} latitude - Property latitude
     * @param {number} longitude - Property longitude  
     * @param {string|Array} riskTypes - Risk types to analyze
     * @param {Object} options - Additional options
     * @returns {Object} Aggregated risk assessment
     */
    async aggregateClimateData(latitude, longitude, riskTypes = 'all', options = {}) {
        const startTime = Date.now();
        
        console.log('Starting climate data aggregation:', {
            latitude,
            longitude,
            riskTypes,
            timestamp: new Date().toISOString(),
            platform: 'seawater-climate-risk'
        });

        try {
            // Validate coordinates
            if (!this.isValidCoordinate(latitude, longitude)) {
                throw new ClimateDataError(
                    'Invalid coordinates for climate data retrieval',
                    'validation',
                    false
                );
            }

            // Normalize risk types
            const requestedRisks = this.normalizeRiskTypes(riskTypes);
            
            // Check cache first
            const cacheKey = this.getCacheKey(latitude, longitude, requestedRisks);
            const cachedData = this.getCachedData(cacheKey);
            if (cachedData && !options.forceRefresh) {
                console.log('Returning cached climate data');
                return {
                    ...cachedData,
                    cached: true,
                    cache_age_hours: Math.round((Date.now() - cachedData.timestamp) / (1000 * 60 * 60))
                };
            }

            // Fetch data from all available sources
            const sourceResults = await this.fetchFromAllSources(latitude, longitude, requestedRisks, options);
            
            // Aggregate and normalize scores
            const aggregatedScores = this.aggregateRiskScores(sourceResults, requestedRisks);
            
            // Calculate overall risk score
            const overallRiskScore = this.calculateOverallRisk(aggregatedScores);
            
            // Generate risk assessment summary
            const riskAssessment = {
                success: true,
                timestamp: new Date().toISOString(),
                coordinates: { latitude, longitude },
                riskData: {
                    overall_risk_score: overallRiskScore,
                    flood_risk_score: aggregatedScores.flood,
                    wildfire_risk_score: aggregatedScores.wildfire,
                    heat_risk_score: aggregatedScores.heat,
                    tornado_risk_score: aggregatedScores.tornado,
                    hurricane_risk_score: aggregatedScores.hurricane,
                    earthquake_risk_score: aggregatedScores.earthquake,
                    drought_risk_score: aggregatedScores.drought,
                    // Additional metadata
                    confidence_level: this.calculateConfidence(sourceResults),
                    data_sources: Object.keys(sourceResults.successful).filter(key => sourceResults.successful[key]),
                    primary_risks: this.identifyPrimaryRisks(aggregatedScores),
                    last_updated: new Date().toISOString()
                },
                sources: sourceResults.sources,
                performance: sourceResults.performance,
                external_api_calls: sourceResults.performance.external_api_calls,
                cache_hits: sourceResults.performance.cache_hits,
                cache_misses: sourceResults.performance.cache_misses,
                cached: false,
                processing_time_ms: Date.now() - startTime
            };

            // Cache the result
            this.cacheData(cacheKey, riskAssessment);

            console.log('Climate data aggregation completed:', {
                overall_risk: overallRiskScore,
                primary_risks: riskAssessment.riskData.primary_risks,
                data_sources: riskAssessment.riskData.data_sources.length,
                processing_time: riskAssessment.processing_time_ms,
                confidence: riskAssessment.riskData.confidence_level
            });

            return riskAssessment;

        } catch (error) {
            console.error('Climate data aggregation failed:', error);
            
            if (error instanceof ClimateDataError) {
                throw error;
            }

            throw new ClimateDataError(
                `Climate data aggregation failed: ${error.message}`,
                'aggregation_error',
                true
            );
        }
    }

    /**
     * Fetch data from all available sources
     * @param {number} latitude - Latitude
     * @param {number} longitude - Longitude
     * @param {Array} riskTypes - Risk types to fetch
     * @param {Object} options - Options
     * @returns {Object} Source results
     */
    async fetchFromAllSources(latitude, longitude, riskTypes, options) {
        const results = {
            successful: {},
            failed: {},
            sources: {},
            performance: {
                external_api_calls: 0,
                cache_hits: 0,
                cache_misses: 0,
                source_response_times: {}
            }
        };

        // Define source priorities and risk coverage
        const sourceConfig = {
            fema: { 
                priority: 1, 
                risks: ['flood', 'wildfire', 'hurricane', 'tornado', 'earthquake', 'drought'],
                required: true 
            },
            noaa: { 
                priority: 2, 
                risks: ['heat', 'drought', 'hurricane'], 
                required: false 
            },
            usgs: { 
                priority: 3, 
                risks: ['earthquake'], 
                required: false 
            },
            climateCheck: { 
                priority: 4, 
                risks: ['flood', 'wildfire', 'heat'], 
                required: false,
                premium: true 
            },
            firstStreet: { 
                priority: 5, 
                risks: ['flood', 'wildfire', 'heat'], 
                required: false,
                premium: true 
            }
        };

        // Fetch from each source
        const fetchPromises = Object.entries(sourceConfig).map(async ([sourceName, config]) => {
            const startTime = Date.now();
            
            try {
                // Check if source covers any requested risk types
                const relevantRisks = riskTypes.filter(risk => config.risks.includes(risk));
                if (relevantRisks.length === 0) {
                    results.sources[sourceName] = { skipped: true, reason: 'no_relevant_risks' };
                    return;
                }

                // Skip premium sources if not configured
                if (config.premium && !this.isPremiumSourceAvailable(sourceName)) {
                    results.sources[sourceName] = { skipped: true, reason: 'premium_not_configured' };
                    return;
                }

                const client = this.clients[sourceName];
                if (!client) {
                    throw new Error(`Client not available for source: ${sourceName}`);
                }

                const sourceData = await client.getRiskData(latitude, longitude, relevantRisks, options);
                
                results.successful[sourceName] = true;
                results.sources[sourceName] = {
                    success: true,
                    data: sourceData,
                    risks_covered: relevantRisks,
                    response_time_ms: Date.now() - startTime
                };
                
                results.performance.external_api_calls += sourceData.api_calls || 1;
                results.performance.cache_hits += sourceData.cache_hits || 0;
                results.performance.cache_misses += sourceData.cache_misses || 1;

            } catch (error) {
                console.warn(`Failed to fetch data from ${sourceName}:`, error.message);
                
                results.failed[sourceName] = error.message;
                results.sources[sourceName] = {
                    success: false,
                    error: error.message,
                    retryable: error.retryable !== false,
                    response_time_ms: Date.now() - startTime
                };
            }
            
            results.performance.source_response_times[sourceName] = Date.now() - startTime;
        });

        await Promise.all(fetchPromises);

        // Check if we have minimum required data
        if (!results.successful.fema && sourceConfig.fema.required) {
            console.warn('FEMA data unavailable, using fallback sources');
        }

        return results;
    }

    /**
     * Aggregate risk scores from multiple sources
     * @param {Object} sourceResults - Results from all sources
     * @param {Array} requestedRisks - Requested risk types
     * @returns {Object} Aggregated risk scores
     */
    aggregateRiskScores(sourceResults, requestedRisks) {
        const scores = {};
        
        // Initialize scores for all risk types
        const allRiskTypes = ['flood', 'wildfire', 'heat', 'tornado', 'hurricane', 'earthquake', 'drought'];
        allRiskTypes.forEach(risk => {
            scores[risk] = null;
        });

        // Weight sources by priority and reliability
        const sourceWeights = {
            fema: 0.4,        // Authoritative government source
            firstStreet: 0.3,  // High-quality climate modeling
            climateCheck: 0.15, // Commercial climate data
            noaa: 0.1,         // Government climate data
            usgs: 0.05         // Geological data
        };

        // Aggregate scores for each risk type
        allRiskTypes.forEach(riskType => {
            const riskScores = [];
            const weights = [];

            Object.entries(sourceResults.successful).forEach(([sourceName, isSuccessful]) => {
                if (!isSuccessful) return;

                const sourceData = sourceResults.sources[sourceName]?.data;
                if (!sourceData || !sourceData.risks) return;

                const riskData = sourceData.risks[riskType];
                if (riskData && typeof riskData.score === 'number') {
                    // Normalize score to 0-100 scale
                    const normalizedScore = this.normalizeSourceScore(riskData.score, sourceName, riskType);
                    riskScores.push(normalizedScore);
                    weights.push(sourceWeights[sourceName] || 0.1);
                }
            });

            // Calculate weighted average if we have data
            if (riskScores.length > 0) {
                const weightedSum = riskScores.reduce((sum, score, index) => sum + (score * weights[index]), 0);
                const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
                scores[riskType] = Math.round(weightedSum / totalWeight);
            }
        });

        return scores;
    }

    /**
     * Normalize score from specific source to 0-100 scale
     * @param {number} score - Original score
     * @param {string} source - Source name
     * @param {string} riskType - Risk type
     * @returns {number} Normalized score
     */
    normalizeSourceScore(score, source, riskType) {
        switch (source) {
            case 'fema':
                return RiskNormalizer.normalizeFEMAScore(score);
            case 'firstStreet':
                return RiskNormalizer.normalizeFirstStreetScore(score, riskType);
            case 'noaa':
                if (riskType === 'heat') {
                    return RiskNormalizer.normalizeTemperatureAnomaly(score);
                }
                return Math.round(score);
            default:
                // Assume already normalized or linear 0-100 scale
                return Math.max(0, Math.min(100, Math.round(score)));
        }
    }

    /**
     * Calculate overall risk score from individual risk scores
     * @param {Object} riskScores - Individual risk scores
     * @returns {number} Overall risk score (0-100)
     */
    calculateOverallRisk(riskScores) {
        const validScores = Object.values(riskScores).filter(score => score !== null && score !== undefined);
        
        if (validScores.length === 0) {
            return 0;
        }

        // Weight different risk types based on impact potential
        const riskWeights = {
            flood: 0.25,
            wildfire: 0.20,
            hurricane: 0.20,
            earthquake: 0.15,
            tornado: 0.10,
            heat: 0.05,
            drought: 0.05
        };

        let weightedSum = 0;
        let totalWeight = 0;

        Object.entries(riskScores).forEach(([riskType, score]) => {
            if (score !== null && score !== undefined) {
                const weight = riskWeights[riskType] || 0.1;
                weightedSum += score * weight;
                totalWeight += weight;
            }
        });

        return totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
    }

    /**
     * Calculate confidence level based on data sources and quality
     * @param {Object} sourceResults - Source results
     * @returns {number} Confidence level (0.0 to 1.0)
     */
    calculateConfidence(sourceResults) {
        const successfulSources = Object.keys(sourceResults.successful).filter(
            source => sourceResults.successful[source]
        );

        // Base confidence on number and quality of sources
        let confidence = 0.3; // Base confidence

        if (successfulSources.includes('fema')) confidence += 0.4; // Authoritative source
        if (successfulSources.includes('firstStreet')) confidence += 0.2; // High-quality modeling
        if (successfulSources.includes('climateCheck')) confidence += 0.1;
        if (successfulSources.includes('noaa')) confidence += 0.1;
        if (successfulSources.includes('usgs')) confidence += 0.05;

        // Bonus for multiple sources
        if (successfulSources.length >= 3) confidence += 0.1;
        if (successfulSources.length >= 4) confidence += 0.05;

        return Math.min(1.0, Math.round(confidence * 100) / 100);
    }

    /**
     * Identify primary risk categories
     * @param {Object} riskScores - Risk scores
     * @returns {Array} Primary risk types
     */
    identifyPrimaryRisks(riskScores) {
        const validRisks = Object.entries(riskScores)
            .filter(([_, score]) => score !== null && score !== undefined)
            .sort(([, a], [, b]) => b - a);

        const primaryRisks = [];
        
        // High risk threshold
        const highRiskThreshold = 70;
        
        // Add all high-risk categories
        validRisks.forEach(([riskType, score]) => {
            if (score >= highRiskThreshold) {
                primaryRisks.push(riskType);
            }
        });

        // If no high risks, add the top 2 risks
        if (primaryRisks.length === 0 && validRisks.length > 0) {
            primaryRisks.push(validRisks[0][0]);
            if (validRisks.length > 1 && validRisks[1][1] > 30) {
                primaryRisks.push(validRisks[1][0]);
            }
        }

        return primaryRisks;
    }

    /**
     * Normalize risk types parameter
     * @param {string|Array} riskTypes - Risk types input
     * @returns {Array} Normalized risk types array
     */
    normalizeRiskTypes(riskTypes) {
        if (riskTypes === 'all') {
            return ['flood', 'wildfire', 'heat', 'tornado', 'hurricane', 'earthquake', 'drought'];
        }

        if (typeof riskTypes === 'string') {
            return riskTypes.split(',').map(type => type.trim().toLowerCase());
        }

        if (Array.isArray(riskTypes)) {
            return riskTypes.map(type => String(type).trim().toLowerCase());
        }

        return ['flood', 'wildfire', 'heat']; // Default risk types
    }

    /**
     * Validate coordinates
     * @param {number} latitude - Latitude
     * @param {number} longitude - Longitude
     * @returns {boolean} Valid coordinates
     */
    isValidCoordinate(latitude, longitude) {
        return (
            typeof latitude === 'number' &&
            typeof longitude === 'number' &&
            latitude >= -90 && latitude <= 90 &&
            longitude >= -180 && longitude <= 180 &&
            !isNaN(latitude) && !isNaN(longitude)
        );
    }

    /**
     * Check if premium source is available
     * @param {string} sourceName - Source name
     * @returns {boolean} Available
     */
    isPremiumSourceAvailable(sourceName) {
        const apiKeyMap = {
            climateCheck: 'CLIMATE_CHECK_API_KEY',
            firstStreet: 'FIRST_STREET_API_KEY'
        };

        const envVar = apiKeyMap[sourceName];
        return envVar && !!process.env[envVar];
    }

    /**
     * Cache management
     */
    getCacheKey(latitude, longitude, riskTypes) {
        const coord = `${latitude.toFixed(6)},${longitude.toFixed(6)}`;
        const risks = riskTypes.sort().join(',');
        return `climate:${coord}:${risks}`;
    }

    getCachedData(cacheKey) {
        const cached = this.cache.get(cacheKey);
        if (cached && (Date.now() - cached.timestamp) < this.cacheExpiry) {
            return cached.data;
        }
        
        if (cached) {
            this.cache.delete(cacheKey);
        }
        
        return null;
    }

    cacheData(cacheKey, data) {
        this.cache.set(cacheKey, {
            data: data,
            timestamp: Date.now()
        });

        // Cleanup cache if too large
        if (this.cache.size > 1000) {
            const oldestKeys = Array.from(this.cache.keys()).slice(0, 100);
            oldestKeys.forEach(key => this.cache.delete(key));
        }
    }
}

// Create singleton instance
const climateDataAggregator = new ClimateDataAggregator();

// Export convenience function
async function aggregateClimateData(latitude, longitude, riskTypes = 'all', options = {}) {
    return climateDataAggregator.aggregateClimateData(latitude, longitude, riskTypes, options);
}

module.exports = {
    ClimateDataAggregator,
    RiskNormalizer,
    climateDataAggregator,
    aggregateClimateData
};