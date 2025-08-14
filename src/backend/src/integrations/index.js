/**
 * Climate Data Integration Platform - Main Entry Point
 * Seawater Climate Risk Platform
 * 
 * This module provides a unified interface to all climate data sources
 * following Tim-Combo's proven integration patterns
 */

// Core infrastructure
const HTTPClient = require('./core/HTTPClient');
const APIRateLimiter = require('./core/APIRateLimiter');
const CacheManager = require('./core/CacheManager');
const DataSourceManager = require('./core/DataSourceManager');
const APIHealthMonitor = require('./core/APIHealthMonitor');

// Government data clients
const FEMAClient = require('./clients/government/FEMAClient');
const USGSClient = require('./clients/government/USGSClient');

// Geocoding clients
const MapBoxGeocodingClient = require('./clients/geocoding/MapBoxGeocodingClient');

// Utilities
const RiskScoreAggregator = require('./utils/RiskScoreAggregator');

/**
 * Climate Data Integration Platform
 * Orchestrates all external API integrations with fallback strategies
 */
class ClimateDataIntegration {
    constructor(options = {}) {
        // Initialize core infrastructure
        this.httpClient = new HTTPClient(options.http);
        this.rateLimiter = new APIRateLimiter();
        this.cacheManager = new CacheManager(options.cache);
        this.healthMonitor = new APIHealthMonitor({ httpClient: this.httpClient });
        
        // Initialize data source manager with core components
        this.dataSourceManager = new DataSourceManager({
            httpClient: this.httpClient,
            rateLimiter: this.rateLimiter,
            cacheManager: this.cacheManager,
            healthMonitor: this.healthMonitor
        });
        
        // Initialize government data clients
        this.femaClient = new FEMAClient({
            httpClient: this.httpClient,
            cacheManager: this.cacheManager
        });
        
        this.usgsClient = new USGSClient({
            httpClient: this.httpClient,
            cacheManager: this.cacheManager
        });
        
        // Initialize geocoding clients
        this.mapboxGeocoder = new MapBoxGeocodingClient({
            httpClient: this.httpClient,
            cacheManager: this.cacheManager,
            accessToken: options.mapboxToken
        });
        
        // Initialize risk aggregation
        this.riskAggregator = new RiskScoreAggregator();
        
        // Platform configuration
        this.config = {
            enableMonitoring: options.enableMonitoring !== false,
            defaultCacheTTL: options.defaultCacheTTL || 3600,
            rateLimitingEnabled: options.rateLimitingEnabled !== false,
            fallbackEnabled: options.fallbackEnabled !== false
        };
        
        // Initialize platform
        this._initialize();
    }

    /**
     * Initialize the integration platform
     */
    async _initialize() {
        console.log('Initializing Climate Data Integration Platform...');
        
        // Start health monitoring if enabled
        if (this.config.enableMonitoring) {
            this.healthMonitor.startMonitoring();
        }
        
        // Setup event handlers
        this._setupEventHandlers();
        
        console.log('Climate Data Integration Platform initialized successfully');
    }

    /**
     * Setup event handlers for monitoring and logging
     */
    _setupEventHandlers() {
        // HTTP Client events
        this.httpClient.on('requestSuccess', (data) => {
            console.log(`HTTP request successful: ${data.requestId} (${data.responseTime}ms)`);
        });
        
        this.httpClient.on('requestFailed', (data) => {
            console.error(`HTTP request failed: ${data.requestId} - ${data.finalError}`);
        });
        
        // Rate limiter events
        this.rateLimiter.on('rateLimitExceeded', (data) => {
            console.warn(`Rate limit exceeded for ${data.source}: wait ${data.waitTime}ms`);
        });
        
        // Health monitor events
        this.healthMonitor.on('healthAlert', (data) => {
            console.error(`HEALTH ALERT: ${data.sourceName} - ${data.error}`);
        });
        
        this.healthMonitor.on('healthRestored', (data) => {
            console.log(`Health restored for ${data.sourceName}`);
        });
        
        // Data source manager events
        this.dataSourceManager.on('dataFetched', (data) => {
            console.log(`Data fetched from ${data.source}: ${data.responseTime}ms`);
        });
        
        this.dataSourceManager.on('allSourcesFailed', (data) => {
            console.error(`All sources failed for ${data.riskType}: ${data.finalError}`);
        });
    }

    /**
     * Get comprehensive property risk assessment
     */
    async getPropertyRiskAssessment(address, options = {}) {
        try {
            console.log(`Starting comprehensive risk assessment for: ${address}`);
            
            // Step 1: Geocode the address
            const geocodeResult = await this.mapboxGeocoder.geocodeAddress(address, {
                limit: 1,
                country: 'us'
            });
            
            if (!geocodeResult.results || geocodeResult.results.length === 0) {
                throw new Error(`Unable to geocode address: ${address}`);
            }
            
            const location = geocodeResult.results[0];
            const { latitude, longitude } = location.location;
            
            console.log(`Address geocoded to: ${latitude}, ${longitude}`);
            
            // Step 2: Gather data from multiple sources
            const sourceData = {};
            
            // Get FEMA National Risk Index data
            try {
                const femaData = await this.femaClient.getRiskByAddress(address, {
                    stateCode: location.components.state
                });
                sourceData['FEMA_NRI'] = {
                    risks: this._extractFEMARisks(femaData),
                    lastUpdated: new Date().toISOString(),
                    dataQuality: 0.95
                };
            } catch (error) {
                console.warn(`FEMA data unavailable: ${error.message}`);
            }
            
            // Get USGS earthquake data
            try {
                const earthquakeRisk = await this.usgsClient.getEarthquakeRisk(latitude, longitude, {
                    radiusKm: 50
                });
                sourceData['USGS_Earthquake'] = {
                    risks: {
                        earthquake_risk: {
                            score: earthquakeRisk.riskAssessment.riskScore,
                            confidence: this._mapConfidenceToScore(earthquakeRisk.riskAssessment.confidence)
                        }
                    },
                    lastUpdated: earthquakeRisk.generatedAt,
                    dataQuality: 0.90
                };
            } catch (error) {
                console.warn(`USGS earthquake data unavailable: ${error.message}`);
            }
            
            // Step 3: Aggregate risk scores from all sources
            const propertyId = this._generatePropertyId(address, latitude, longitude);
            const riskAssessment = await this.riskAggregator.aggregateRiskScores(
                propertyId,
                sourceData,
                options
            );
            
            // Step 4: Enhance with location context
            const enhancedAssessment = {
                ...riskAssessment,
                location: {
                    address: location.formattedAddress,
                    coordinates: {
                        latitude,
                        longitude
                    },
                    components: location.components,
                    geocodingAccuracy: location.accuracy,
                    geocodingConfidence: location.confidence
                },
                dataSources: Object.keys(sourceData),
                platformInfo: {
                    version: '1.0.0',
                    generatedBy: 'Seawater Climate Data Integration Platform'
                }
            };
            
            console.log(`Risk assessment completed for ${address}:`, {
                overallScore: enhancedAssessment.overallRisk.score,
                confidence: enhancedAssessment.overallRisk.confidence,
                sourcesUsed: enhancedAssessment.dataSources.length
            });
            
            return enhancedAssessment;
            
        } catch (error) {
            console.error(`Property risk assessment failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get risk assessment by coordinates
     */
    async getRiskAssessmentByCoordinates(latitude, longitude, options = {}) {
        try {
            // Reverse geocode to get address context
            const reverseGeocode = await this.mapboxGeocoder.reverseGeocode(longitude, latitude);
            const addressContext = reverseGeocode.results[0];
            
            // Use coordinate-based risk assessment
            const propertyId = this._generatePropertyId(null, latitude, longitude);
            
            // Gather coordinate-based data
            const sourceData = {};
            
            // USGS earthquake data
            try {
                const earthquakeRisk = await this.usgsClient.getEarthquakeRisk(latitude, longitude);
                sourceData['USGS_Earthquake'] = {
                    risks: {
                        earthquake_risk: {
                            score: earthquakeRisk.riskAssessment.riskScore,
                            confidence: this._mapConfidenceToScore(earthquakeRisk.riskAssessment.confidence)
                        }
                    },
                    lastUpdated: earthquakeRisk.generatedAt,
                    dataQuality: 0.90
                };
            } catch (error) {
                console.warn(`USGS earthquake data unavailable: ${error.message}`);
            }
            
            // Aggregate risks
            const riskAssessment = await this.riskAggregator.aggregateRiskScores(
                propertyId,
                sourceData,
                options
            );
            
            return {
                ...riskAssessment,
                location: {
                    coordinates: { latitude, longitude },
                    addressContext: addressContext?.formattedAddress,
                    components: addressContext?.components
                }
            };
            
        } catch (error) {
            throw new Error(`Coordinate risk assessment failed: ${error.message}`);
        }
    }

    /**
     * Batch process multiple addresses
     */
    async batchRiskAssessment(addresses, options = {}) {
        const results = [];
        const batchSize = options.batchSize || 10;
        const concurrent = options.concurrent || 3;
        
        console.log(`Starting batch risk assessment for ${addresses.length} addresses`);
        
        for (let i = 0; i < addresses.length; i += batchSize) {
            const batch = addresses.slice(i, i + batchSize);
            
            const batchPromises = batch.map(async (address) => {
                try {
                    const assessment = await this.getPropertyRiskAssessment(address, options);
                    return {
                        address,
                        success: true,
                        assessment,
                        error: null
                    };
                } catch (error) {
                    return {
                        address,
                        success: false,
                        assessment: null,
                        error: error.message
                    };
                }
            });
            
            const batchResults = await Promise.all(batchPromises);
            results.push(...batchResults);
            
            // Rate limiting delay
            if (i + batchSize < addresses.length) {
                await this._delay(2000);
            }
        }
        
        const successCount = results.filter(r => r.success).length;
        
        return {
            results,
            summary: {
                total: addresses.length,
                successful: successCount,
                failed: addresses.length - successCount,
                successRate: Math.round((successCount / addresses.length) * 100)
            }
        };
    }

    /**
     * Get platform health status
     */
    async getHealthStatus() {
        return {
            platform: {
                status: 'operational',
                version: '1.0.0',
                uptime: process.uptime()
            },
            components: {
                httpClient: this.httpClient.getStats(),
                rateLimiter: this.rateLimiter.getAllStatus(),
                healthMonitor: this.healthMonitor.getSystemHealthSummary(),
                riskAggregator: this.riskAggregator.getStats()
            },
            dataSources: this.dataSourceManager.getAllSourceStatus()
        };
    }

    /**
     * Get platform statistics
     */
    getStats() {
        return {
            httpClient: this.httpClient.getStats(),
            rateLimiter: this.rateLimiter.getAllStatus(),
            cacheManager: this.cacheManager.getStats(),
            riskAggregator: this.riskAggregator.getStats(),
            dataSources: this.dataSourceManager.getStats()
        };
    }

    /**
     * Test all integrations
     */
    async testIntegrations() {
        const results = {};
        
        // Test FEMA API
        try {
            results.fema = await this.femaClient.testConnection();
        } catch (error) {
            results.fema = { success: false, error: error.message };
        }
        
        // Test USGS API
        try {
            results.usgs = await this.usgsClient.testConnection();
        } catch (error) {
            results.usgs = { success: false, error: error.message };
        }
        
        // Test MapBox Geocoding
        try {
            results.mapbox = await this.mapboxGeocoder.testConnection();
        } catch (error) {
            results.mapbox = { success: false, error: error.message };
        }
        
        return results;
    }

    /**
     * Helper method to extract FEMA risks
     */
    _extractFEMARisks(femaData) {
        if (!femaData || !femaData[0]) return {};
        
        const data = femaData[0];
        const risks = {};
        
        if (data.hazardRisks) {
            for (const [hazardType, hazardData] of Object.entries(data.hazardRisks)) {
                if (hazardData.score !== null) {
                    risks[hazardType] = {
                        score: Math.round(hazardData.score * 100),
                        confidence: 0.9
                    };
                }
            }
        }
        
        return risks;
    }

    /**
     * Map confidence strings to numeric scores
     */
    _mapConfidenceToScore(confidence) {
        const mapping = {
            'high': 0.9,
            'medium': 0.7,
            'low': 0.5
        };
        
        return mapping[confidence] || 0.7;
    }

    /**
     * Generate property ID
     */
    _generatePropertyId(address, latitude, longitude) {
        const base = address || `${latitude},${longitude}`;
        return require('crypto').createHash('md5').update(base).digest('hex');
    }

    /**
     * Add delay for rate limiting
     */
    _delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Cleanup and destroy platform
     */
    async destroy() {
        console.log('Shutting down Climate Data Integration Platform...');
        
        this.healthMonitor.stopMonitoring();
        this.httpClient.destroy();
        this.rateLimiter.destroy();
        this.cacheManager.destroy();
        
        console.log('Platform shutdown complete');
    }
}

module.exports = {
    ClimateDataIntegration,
    // Export individual components for advanced usage
    HTTPClient,
    APIRateLimiter,
    CacheManager,
    DataSourceManager,
    APIHealthMonitor,
    FEMAClient,
    USGSClient,
    MapBoxGeocodingClient,
    RiskScoreAggregator
};