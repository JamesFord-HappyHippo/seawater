/**
 * DataSourceManager - Multi-source orchestration and fallback logic
 * Manages API priority, fallback strategies, and data aggregation
 * Implements circuit breaker pattern for unreliable sources
 */

const { EventEmitter } = require('events');

class DataSourceManager extends EventEmitter {
    constructor(options = {}) {
        super();
        
        this.httpClient = options.httpClient;
        this.rateLimiter = options.rateLimiter;
        this.cacheManager = options.cacheManager;
        this.healthMonitor = options.healthMonitor;
        
        // Data source configurations
        this.sources = new Map();
        
        // Priority configurations by risk type
        this.priorities = {
            flood_risk: ['FEMA_NRI', 'FirstStreet', 'NOAA_Coastal'],
            wildfire_risk: ['CAL_FIRE', 'NIFC', 'FEMA_NRI'],
            hurricane_risk: ['HURDAT2', 'NHC', 'FEMA_NRI'],
            earthquake_risk: ['USGS_Earthquake', 'FEMA_NRI'],
            heat_risk: ['NOAA_CDO', 'NASA_POWER', 'FirstStreet'],
            geocoding: ['MapBox_Geocoding', 'Google_Geocoding', 'Census_Geocoding']
        };
        
        // Circuit breaker states
        this.circuitBreakers = new Map();
        this.circuitBreakerConfig = {
            failureThreshold: 5,
            timeoutMs: 60000, // 1 minute
            resetTimeoutMs: 300000 // 5 minutes
        };
        
        // Request statistics
        this.stats = {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            fallbacksUsed: 0,
            cacheHits: 0,
            averageResponseTime: 0
        };
        
        this._initializeDefaultSources();
    }

    /**
     * Initialize default data source configurations
     */
    _initializeDefaultSources() {
        const defaultSources = {
            'FEMA_NRI': {
                name: 'FEMA National Risk Index',
                baseUrl: 'https://www.fema.gov/api/open/v2',
                type: 'government',
                priority: 1,
                reliability: 0.95,
                avgResponseTime: 2000,
                costPerRequest: 0.0,
                maxRetries: 3,
                timeout: 30000,
                riskTypes: ['flood_risk', 'wildfire_risk', 'hurricane_risk', 'earthquake_risk', 'heat_risk'],
                dataFormats: ['json'],
                authType: 'none'
            },
            'NOAA_CDO': {
                name: 'NOAA Climate Data Online',
                baseUrl: 'https://www.ncei.noaa.gov/access/services/data/v1',
                type: 'government',
                priority: 2,
                reliability: 0.92,
                avgResponseTime: 3000,
                costPerRequest: 0.0,
                maxRetries: 3,
                timeout: 45000,
                riskTypes: ['heat_risk', 'hurricane_risk'],
                dataFormats: ['json', 'csv'],
                authType: 'api_key',
                requiresToken: true
            },
            'USGS_Earthquake': {
                name: 'USGS Earthquake API',
                baseUrl: 'https://earthquake.usgs.gov/fdsnws/event/1',
                type: 'government',
                priority: 1,
                reliability: 0.98,
                avgResponseTime: 1500,
                costPerRequest: 0.0,
                maxRetries: 3,
                timeout: 30000,
                riskTypes: ['earthquake_risk'],
                dataFormats: ['json', 'xml', 'csv'],
                authType: 'none'
            },
            'FirstStreet': {
                name: 'First Street Foundation',
                baseUrl: 'https://api.firststreet.org/risk/v1',
                type: 'premium',
                priority: 2,
                reliability: 0.99,
                avgResponseTime: 1000,
                costPerRequest: 0.003,
                maxRetries: 2,
                timeout: 20000,
                riskTypes: ['flood_risk', 'heat_risk'],
                dataFormats: ['json'],
                authType: 'api_key',
                requiresToken: true
            },
            'ClimateCheck': {
                name: 'ClimateCheck API',
                baseUrl: 'https://api.climatecheck.com/v1',
                type: 'premium',
                priority: 3,
                reliability: 0.97,
                avgResponseTime: 1200,
                costPerRequest: 0.002,
                maxRetries: 2,
                timeout: 25000,
                riskTypes: ['flood_risk', 'wildfire_risk', 'heat_risk'],
                dataFormats: ['json'],
                authType: 'api_key',
                requiresToken: true
            },
            'MapBox_Geocoding': {
                name: 'MapBox Geocoding',
                baseUrl: 'https://api.mapbox.com/geocoding/v5',
                type: 'premium',
                priority: 1,
                reliability: 0.99,
                avgResponseTime: 500,
                costPerRequest: 0.0075,
                maxRetries: 2,
                timeout: 15000,
                riskTypes: ['geocoding'],
                dataFormats: ['json'],
                authType: 'api_key',
                requiresToken: true
            },
            'Google_Geocoding': {
                name: 'Google Geocoding',
                baseUrl: 'https://maps.googleapis.com/maps/api/geocode',
                type: 'premium',
                priority: 2,
                reliability: 0.99,
                avgResponseTime: 600,
                costPerRequest: 0.005,
                maxRetries: 2,
                timeout: 15000,
                riskTypes: ['geocoding'],
                dataFormats: ['json', 'xml'],
                authType: 'api_key',
                requiresToken: true
            },
            'Census_Geocoding': {
                name: 'US Census Geocoding',
                baseUrl: 'https://geocoding.geo.census.gov/geocoder',
                type: 'government',
                priority: 3,
                reliability: 0.85,
                avgResponseTime: 2000,
                costPerRequest: 0.0,
                maxRetries: 3,
                timeout: 30000,
                riskTypes: ['geocoding'],
                dataFormats: ['json', 'xml'],
                authType: 'none'
            }
        };

        for (const [sourceId, config] of Object.entries(defaultSources)) {
            this.registerSource(sourceId, config);
        }
    }

    /**
     * Register a new data source
     */
    registerSource(sourceId, config) {
        this.sources.set(sourceId, {
            ...config,
            id: sourceId,
            lastUsed: null,
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            averageResponseTime: config.avgResponseTime || 2000,
            isEnabled: true
        });

        // Initialize circuit breaker
        this.circuitBreakers.set(sourceId, {
            state: 'CLOSED', // CLOSED, OPEN, HALF_OPEN
            failures: 0,
            lastFailureTime: null,
            nextAttemptTime: null
        });

        console.log(`Data source registered: ${sourceId} (${config.name})`);
    }

    /**
     * Get data from multiple sources with fallback strategy
     */
    async getData(riskType, query, options = {}) {
        const requestId = this._generateRequestId();
        const startTime = Date.now();
        
        this.stats.totalRequests++;

        try {
            // Check cache first if enabled
            if (this.cacheManager && !options.skipCache) {
                const cacheKey = this._buildCacheKey(riskType, query);
                const cachedData = await this.cacheManager.get(cacheKey);
                
                if (cachedData) {
                    this.stats.cacheHits++;
                    this.emit('cacheHit', { requestId, riskType, cacheKey });
                    return {
                        success: true,
                        data: cachedData,
                        source: 'cache',
                        responseTime: Date.now() - startTime,
                        requestId
                    };
                }
            }

            // Get prioritized sources for this risk type
            const prioritizedSources = this._getPrioritizedSources(riskType, options);
            
            if (prioritizedSources.length === 0) {
                throw new Error(`No available sources for risk type: ${riskType}`);
            }

            let lastError;
            let attemptedSources = [];

            // Try each source in priority order
            for (const source of prioritizedSources) {
                try {
                    // Check circuit breaker
                    if (!this._isSourceAvailable(source.id)) {
                        console.log(`[${requestId}] Skipping ${source.id} - circuit breaker OPEN`);
                        continue;
                    }

                    // Check rate limits
                    if (this.rateLimiter) {
                        const rateLimitCheck = await this.rateLimiter.checkRateLimit(source.id);
                        if (!rateLimitCheck.allowed) {
                            console.log(`[${requestId}] Skipping ${source.id} - rate limited`);
                            continue;
                        }
                    }

                    console.log(`[${requestId}] Attempting to fetch from ${source.id}`);
                    attemptedSources.push(source.id);

                    const result = await this._fetchFromSource(source, query, requestId);
                    
                    // Success - record metrics and cache result
                    this._recordSuccess(source.id, Date.now() - startTime);
                    
                    if (this.cacheManager && !options.skipCache) {
                        const cacheKey = this._buildCacheKey(riskType, query);
                        await this.cacheManager.set(cacheKey, result.data, {
                            ttl: this._getCacheTTL(riskType, source.type)
                        });
                    }

                    this.stats.successfulRequests++;
                    
                    this.emit('dataFetched', {
                        requestId,
                        source: source.id,
                        riskType,
                        responseTime: Date.now() - startTime,
                        dataSize: JSON.stringify(result.data).length
                    });

                    return {
                        success: true,
                        data: result.data,
                        source: source.id,
                        responseTime: Date.now() - startTime,
                        requestId,
                        metadata: {
                            sourceType: source.type,
                            reliability: source.reliability,
                            cost: source.costPerRequest,
                            attemptedSources
                        }
                    };

                } catch (error) {
                    lastError = error;
                    this._recordFailure(source.id, error);
                    
                    console.error(`[${requestId}] Failed to fetch from ${source.id}:`, error.message);
                    
                    // Continue to next source if this one fails
                    continue;
                }
            }

            // All sources failed
            this.stats.failedRequests++;
            
            this.emit('allSourcesFailed', {
                requestId,
                riskType,
                attemptedSources,
                finalError: lastError?.message
            });

            throw new Error(`All ${attemptedSources.length} sources failed. Last error: ${lastError?.message}`);

        } catch (error) {
            this.stats.failedRequests++;
            
            this.emit('requestFailed', {
                requestId,
                riskType,
                error: error.message,
                responseTime: Date.now() - startTime
            });

            throw error;
        }
    }

    /**
     * Get data from specific source
     */
    async getDataFromSource(sourceId, query, options = {}) {
        const source = this.sources.get(sourceId);
        if (!source) {
            throw new Error(`Source not found: ${sourceId}`);
        }

        if (!this._isSourceAvailable(sourceId)) {
            throw new Error(`Source unavailable: ${sourceId} (circuit breaker OPEN)`);
        }

        const requestId = this._generateRequestId();
        
        try {
            const result = await this._fetchFromSource(source, query, requestId);
            this._recordSuccess(sourceId, result.responseTime);
            return result;
            
        } catch (error) {
            this._recordFailure(sourceId, error);
            throw error;
        }
    }

    /**
     * Fetch data from a specific source
     */
    async _fetchFromSource(source, query, requestId) {
        const startTime = Date.now();
        
        // Build request URL and options based on source configuration
        const requestUrl = this._buildRequestUrl(source, query);
        const requestOptions = this._buildRequestOptions(source, query);

        console.log(`[${requestId}] Making request to ${source.name}: ${requestUrl}`);

        try {
            const response = await this.httpClient.request({
                url: requestUrl,
                ...requestOptions,
                timeout: source.timeout
            });

            const responseTime = Date.now() - startTime;

            // Mark rate limit request as completed
            if (this.rateLimiter) {
                this.rateLimiter.markRequestCompleted(source.id);
            }

            return {
                data: response.data,
                responseTime,
                statusCode: response.statusCode,
                headers: response.headers
            };

        } catch (error) {
            // Mark rate limit request as completed even on error
            if (this.rateLimiter) {
                this.rateLimiter.markRequestCompleted(source.id);
            }
            
            throw error;
        }
    }

    /**
     * Get prioritized sources for a risk type
     */
    _getPrioritizedSources(riskType, options = {}) {
        const sourceIds = this.priorities[riskType] || [];
        const sources = [];

        for (const sourceId of sourceIds) {
            const source = this.sources.get(sourceId);
            if (source && source.isEnabled && source.riskTypes.includes(riskType)) {
                sources.push(source);
            }
        }

        // Sort by priority and reliability
        sources.sort((a, b) => {
            if (a.priority !== b.priority) {
                return a.priority - b.priority;
            }
            return b.reliability - a.reliability;
        });

        // Filter by source type if specified
        if (options.sourceType) {
            return sources.filter(s => s.type === options.sourceType);
        }

        // Filter by cost if specified
        if (options.maxCost !== undefined) {
            return sources.filter(s => s.costPerRequest <= options.maxCost);
        }

        return sources;
    }

    /**
     * Check if source is available (circuit breaker)
     */
    _isSourceAvailable(sourceId) {
        const breaker = this.circuitBreakers.get(sourceId);
        if (!breaker) return true;

        const now = Date.now();

        switch (breaker.state) {
            case 'CLOSED':
                return true;
                
            case 'OPEN':
                if (now >= breaker.nextAttemptTime) {
                    breaker.state = 'HALF_OPEN';
                    console.log(`Circuit breaker for ${sourceId} moved to HALF_OPEN`);
                    return true;
                }
                return false;
                
            case 'HALF_OPEN':
                return true;
                
            default:
                return true;
        }
    }

    /**
     * Record successful request
     */
    _recordSuccess(sourceId, responseTime) {
        const source = this.sources.get(sourceId);
        const breaker = this.circuitBreakers.get(sourceId);
        
        if (source) {
            source.totalRequests++;
            source.successfulRequests++;
            source.lastUsed = Date.now();
            
            // Update average response time (exponential moving average)
            source.averageResponseTime = source.averageResponseTime * 0.9 + responseTime * 0.1;
        }

        if (breaker) {
            breaker.failures = 0;
            breaker.state = 'CLOSED';
        }
    }

    /**
     * Record failed request
     */
    _recordFailure(sourceId, error) {
        const source = this.sources.get(sourceId);
        const breaker = this.circuitBreakers.get(sourceId);
        
        if (source) {
            source.totalRequests++;
            source.failedRequests++;
        }

        if (breaker) {
            breaker.failures++;
            breaker.lastFailureTime = Date.now();

            if (breaker.failures >= this.circuitBreakerConfig.failureThreshold) {
                breaker.state = 'OPEN';
                breaker.nextAttemptTime = Date.now() + this.circuitBreakerConfig.resetTimeoutMs;
                
                console.log(`Circuit breaker OPENED for ${sourceId} after ${breaker.failures} failures`);
                
                this.emit('circuitBreakerOpened', {
                    sourceId,
                    failures: breaker.failures,
                    nextAttemptTime: breaker.nextAttemptTime
                });
            }
        }
    }

    /**
     * Build request URL for source
     */
    _buildRequestUrl(source, query) {
        // This would be implemented differently for each source type
        // For now, return base URL with query parameters
        const url = new URL(source.baseUrl);
        
        // Add common query parameters
        for (const [key, value] of Object.entries(query)) {
            if (value !== undefined && value !== null) {
                url.searchParams.append(key, value);
            }
        }

        return url.toString();
    }

    /**
     * Build request options for source
     */
    _buildRequestOptions(source, query) {
        const options = {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        };

        // Add authentication if required
        if (source.authType === 'api_key' && source.apiKey) {
            options.headers['Authorization'] = `Bearer ${source.apiKey}`;
        }

        return options;
    }

    /**
     * Build cache key
     */
    _buildCacheKey(riskType, query) {
        const queryStr = JSON.stringify(query);
        const hash = require('crypto').createHash('md5').update(queryStr).digest('hex');
        return `${riskType}:${hash}`;
    }

    /**
     * Get cache TTL based on risk type and source type
     */
    _getCacheTTL(riskType, sourceType) {
        const baseTTL = {
            property_risk: 3600,
            weather_data: 21600,
            geographic_boundaries: 604800,
            historical_disasters: 86400,
            geocoding: 2592000
        };

        let ttl = baseTTL[riskType] || 3600;

        // Adjust based on source type
        if (sourceType === 'premium') {
            ttl *= 2; // Cache premium data longer
        }

        return ttl;
    }

    /**
     * Generate unique request ID
     */
    _generateRequestId() {
        return `dsm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Get source status
     */
    getSourceStatus(sourceId) {
        const source = this.sources.get(sourceId);
        const breaker = this.circuitBreakers.get(sourceId);
        
        if (!source) {
            return { error: 'Source not found' };
        }

        const successRate = source.totalRequests > 0 
            ? Math.round((source.successfulRequests / source.totalRequests) * 100) 
            : 0;

        return {
            id: sourceId,
            name: source.name,
            type: source.type,
            isEnabled: source.isEnabled,
            circuitBreakerState: breaker?.state || 'UNKNOWN',
            totalRequests: source.totalRequests,
            successRate,
            averageResponseTime: Math.round(source.averageResponseTime),
            lastUsed: source.lastUsed,
            reliability: source.reliability,
            costPerRequest: source.costPerRequest,
            failures: breaker?.failures || 0
        };
    }

    /**
     * Get status for all sources
     */
    getAllSourceStatus() {
        const statuses = {};
        for (const sourceId of this.sources.keys()) {
            statuses[sourceId] = this.getSourceStatus(sourceId);
        }
        return statuses;
    }

    /**
     * Enable/disable source
     */
    setSourceEnabled(sourceId, enabled) {
        const source = this.sources.get(sourceId);
        if (source) {
            source.isEnabled = enabled;
            console.log(`Source ${sourceId} ${enabled ? 'enabled' : 'disabled'}`);
        }
    }

    /**
     * Update source configuration
     */
    updateSource(sourceId, updates) {
        const source = this.sources.get(sourceId);
        if (source) {
            Object.assign(source, updates);
            console.log(`Source ${sourceId} updated:`, updates);
        }
    }

    /**
     * Reset circuit breaker for source
     */
    resetCircuitBreaker(sourceId) {
        const breaker = this.circuitBreakers.get(sourceId);
        if (breaker) {
            breaker.state = 'CLOSED';
            breaker.failures = 0;
            breaker.lastFailureTime = null;
            breaker.nextAttemptTime = null;
            
            console.log(`Circuit breaker reset for ${sourceId}`);
            
            this.emit('circuitBreakerReset', { sourceId });
        }
    }

    /**
     * Get overall statistics
     */
    getStats() {
        const avgResponseTime = this.stats.successfulRequests > 0 
            ? Math.round(this.stats.averageResponseTime / this.stats.successfulRequests) 
            : 0;

        return {
            ...this.stats,
            averageResponseTime: avgResponseTime,
            successRate: this.stats.totalRequests > 0 
                ? Math.round((this.stats.successfulRequests / this.stats.totalRequests) * 100) 
                : 0,
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
            failedRequests: 0,
            fallbacksUsed: 0,
            cacheHits: 0,
            averageResponseTime: 0
        };

        // Reset source-specific stats
        for (const source of this.sources.values()) {
            source.totalRequests = 0;
            source.successfulRequests = 0;
            source.failedRequests = 0;
        }
    }
}

module.exports = DataSourceManager;