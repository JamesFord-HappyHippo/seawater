/**
 * MapBoxGeocodingClient - MapBox Geocoding API integration
 * High-performance geocoding service with global coverage
 * Supports address lookup, reverse geocoding, and batch processing
 */

const { EventEmitter } = require('events');

class MapBoxGeocodingClient extends EventEmitter {
    constructor(options = {}) {
        super();
        
        this.httpClient = options.httpClient;
        this.cacheManager = options.cacheManager;
        this.accessToken = options.accessToken || process.env.MAPBOX_ACCESS_TOKEN;
        
        if (!this.accessToken) {
            console.warn('MapBox access token not provided - geocoding will not work');
        }
        
        // MapBox API configuration
        this.baseUrl = 'https://api.mapbox.com/geocoding/v5';
        this.config = {
            timeout: 15000,
            retryAttempts: 2,
            rateLimit: 100000, // requests per day
            costPerRequest: 0.0075
        };
        
        // Geocoding endpoints
        this.endpoints = {
            places: '/mapbox.places',
            places_permanent: '/mapbox.places-permanent'
        };
        
        // Feature types for filtering
        this.featureTypes = {
            country: 'country',
            region: 'region',
            postcode: 'postcode',
            district: 'district',
            place: 'place',
            locality: 'locality',
            neighborhood: 'neighborhood',
            address: 'address',
            poi: 'poi'
        };
        
        // Cache TTL settings
        this.cacheTTL = {
            address_geocoding: 2592000, // 30 days - addresses don't change
            reverse_geocoding: 2592000, // 30 days
            batch_geocoding: 2592000 // 30 days
        };
        
        // Statistics tracking
        this.stats = {
            totalRequests: 0,
            successfulRequests: 0,
            errorRequests: 0,
            cacheHits: 0,
            totalCost: 0,
            averageResponseTime: 0
        };
    }

    /**
     * Geocode address to coordinates
     */
    async geocodeAddress(address, options = {}) {
        const requestId = this._generateRequestId();
        const startTime = Date.now();
        
        try {
            if (!this.accessToken) {
                throw new Error('MapBox access token not configured');
            }
            
            // Build cache key
            const cacheKey = `mapbox:geocode:${address}:${JSON.stringify(options)}`;
            
            // Check cache first
            if (this.cacheManager) {
                const cached = await this.cacheManager.get(cacheKey);
                if (cached) {
                    this.stats.cacheHits++;
                    this.emit('cacheHit', { requestId, cacheKey });
                    return this._formatGeocodeResponse(cached, address);
                }
            }
            
            // Build MapBox geocoding URL
            const url = this._buildGeocodeUrl(address, options);
            
            console.log(`[${requestId}] Geocoding address with MapBox: ${address}`);
            
            const response = await this.httpClient.get(url, {
                timeout: this.config.timeout,
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'Seawater-Climate-Platform/1.0'
                }
            });
            
            const responseTime = Date.now() - startTime;
            this._updateStats(true, responseTime, this.config.costPerRequest);
            
            // Validate response
            if (!response.data || !response.data.features) {
                throw new Error('Invalid MapBox geocoding response format');
            }
            
            const geocodeData = response.data;
            
            // Cache the response
            if (this.cacheManager) {
                await this.cacheManager.set(cacheKey, geocodeData, {
                    ttl: this.cacheTTL.address_geocoding
                });
            }
            
            const formattedResponse = this._formatGeocodeResponse(geocodeData, address);
            
            this.emit('geocodeSuccess', {
                requestId,
                address,
                resultCount: geocodeData.features.length,
                responseTime,
                cost: this.config.costPerRequest
            });
            
            return formattedResponse;
            
        } catch (error) {
            const responseTime = Date.now() - startTime;
            this._updateStats(false, responseTime, 0);
            
            this.emit('geocodeError', {
                requestId,
                address,
                error: error.message,
                responseTime
            });
            
            throw new Error(`MapBox geocoding failed: ${error.message}`);
        }
    }

    /**
     * Reverse geocode coordinates to address
     */
    async reverseGeocode(longitude, latitude, options = {}) {
        const requestId = this._generateRequestId();
        const startTime = Date.now();
        
        try {
            if (!this.accessToken) {
                throw new Error('MapBox access token not configured');
            }
            
            // Build cache key
            const cacheKey = `mapbox:reverse:${longitude},${latitude}:${JSON.stringify(options)}`;
            
            // Check cache first
            if (this.cacheManager) {
                const cached = await this.cacheManager.get(cacheKey);
                if (cached) {
                    this.stats.cacheHits++;
                    this.emit('cacheHit', { requestId, cacheKey });
                    return this._formatReverseGeocodeResponse(cached, longitude, latitude);
                }
            }
            
            // Build reverse geocoding URL
            const url = this._buildReverseGeocodeUrl(longitude, latitude, options);
            
            console.log(`[${requestId}] Reverse geocoding with MapBox: ${longitude}, ${latitude}`);
            
            const response = await this.httpClient.get(url, {
                timeout: this.config.timeout,
                headers: {
                    'Accept': 'application/json'
                }
            });
            
            const responseTime = Date.now() - startTime;
            this._updateStats(true, responseTime, this.config.costPerRequest);
            
            if (!response.data || !response.data.features) {
                throw new Error('Invalid MapBox reverse geocoding response');
            }
            
            const reverseData = response.data;
            
            // Cache the response
            if (this.cacheManager) {
                await this.cacheManager.set(cacheKey, reverseData, {
                    ttl: this.cacheTTL.reverse_geocoding
                });
            }
            
            const formattedResponse = this._formatReverseGeocodeResponse(reverseData, longitude, latitude);
            
            this.emit('reverseGeocodeSuccess', {
                requestId,
                coordinates: [longitude, latitude],
                resultCount: reverseData.features.length,
                responseTime,
                cost: this.config.costPerRequest
            });
            
            return formattedResponse;
            
        } catch (error) {
            const responseTime = Date.now() - startTime;
            this._updateStats(false, responseTime, 0);
            
            throw new Error(`MapBox reverse geocoding failed: ${error.message}`);
        }
    }

    /**
     * Batch geocode multiple addresses
     */
    async batchGeocode(addresses, options = {}) {
        const requestId = this._generateRequestId();
        const startTime = Date.now();
        
        try {
            const results = [];
            const batchSize = options.batchSize || 10;
            const concurrent = options.concurrent || 5;
            
            console.log(`[${requestId}] Starting batch geocoding of ${addresses.length} addresses`);
            
            // Process addresses in batches to respect rate limits
            for (let i = 0; i < addresses.length; i += batchSize) {
                const batch = addresses.slice(i, i + batchSize);
                
                // Process batch with concurrency control
                const batchPromises = batch.map(async (address, index) => {
                    try {
                        // Add delay to prevent overwhelming the API
                        await this._delay(index * 100);
                        
                        const result = await this.geocodeAddress(address, options);
                        return {
                            address,
                            success: true,
                            result: result.results[0] || null,
                            error: null
                        };
                    } catch (error) {
                        return {
                            address,
                            success: false,
                            result: null,
                            error: error.message
                        };
                    }
                });
                
                // Wait for batch to complete
                const batchResults = await Promise.all(batchPromises);
                results.push(...batchResults);
                
                // Progress update
                this.emit('batchProgress', {
                    requestId,
                    completed: results.length,
                    total: addresses.length,
                    percentage: Math.round((results.length / addresses.length) * 100)
                });
                
                // Rate limiting delay between batches
                if (i + batchSize < addresses.length) {
                    await this._delay(1000);
                }
            }
            
            const responseTime = Date.now() - startTime;
            const successCount = results.filter(r => r.success).length;
            const errorCount = results.filter(r => !r.success).length;
            
            this.emit('batchComplete', {
                requestId,
                totalAddresses: addresses.length,
                successCount,
                errorCount,
                responseTime,
                totalCost: successCount * this.config.costPerRequest
            });
            
            return {
                results,
                summary: {
                    total: addresses.length,
                    successful: successCount,
                    failed: errorCount,
                    successRate: Math.round((successCount / addresses.length) * 100),
                    totalCost: successCount * this.config.costPerRequest,
                    averageTimePerAddress: Math.round(responseTime / addresses.length)
                },
                requestId,
                dataSource: 'MapBox_Geocoding'
            };
            
        } catch (error) {
            throw new Error(`MapBox batch geocoding failed: ${error.message}`);
        }
    }

    /**
     * Search for places with autocomplete
     */
    async searchPlaces(query, options = {}) {
        const requestId = this._generateRequestId();
        
        try {
            if (!this.accessToken) {
                throw new Error('MapBox access token not configured');
            }
            
            const url = this._buildSearchUrl(query, options);
            
            console.log(`[${requestId}] Searching places with MapBox: ${query}`);
            
            const response = await this.httpClient.get(url, {
                timeout: this.config.timeout,
                headers: {
                    'Accept': 'application/json'
                }
            });
            
            if (!response.data || !response.data.features) {
                throw new Error('Invalid MapBox search response');
            }
            
            return this._formatSearchResponse(response.data, query);
            
        } catch (error) {
            throw new Error(`MapBox place search failed: ${error.message}`);
        }
    }

    /**
     * Build geocoding URL
     */
    _buildGeocodeUrl(address, options) {
        const encodedAddress = encodeURIComponent(address);
        const endpoint = options.permanent ? this.endpoints.places_permanent : this.endpoints.places;
        
        const url = new URL(`${this.baseUrl}${endpoint}/${encodedAddress}.json`);
        
        // Required access token
        url.searchParams.append('access_token', this.accessToken);
        
        // Optional parameters
        if (options.country) {
            url.searchParams.append('country', Array.isArray(options.country) ? options.country.join(',') : options.country);
        }
        
        if (options.proximity) {
            url.searchParams.append('proximity', `${options.proximity.longitude},${options.proximity.latitude}`);
        }
        
        if (options.types) {
            url.searchParams.append('types', Array.isArray(options.types) ? options.types.join(',') : options.types);
        }
        
        if (options.bbox) {
            url.searchParams.append('bbox', options.bbox.join(','));
        }
        
        if (options.limit) {
            url.searchParams.append('limit', Math.min(options.limit, 10).toString());
        }
        
        if (options.language) {
            url.searchParams.append('language', options.language);
        }
        
        return url.toString();
    }

    /**
     * Build reverse geocoding URL
     */
    _buildReverseGeocodeUrl(longitude, latitude, options) {
        const endpoint = options.permanent ? this.endpoints.places_permanent : this.endpoints.places;
        const url = new URL(`${this.baseUrl}${endpoint}/${longitude},${latitude}.json`);
        
        url.searchParams.append('access_token', this.accessToken);
        
        if (options.types) {
            url.searchParams.append('types', Array.isArray(options.types) ? options.types.join(',') : options.types);
        }
        
        if (options.language) {
            url.searchParams.append('language', options.language);
        }
        
        return url.toString();
    }

    /**
     * Build search URL
     */
    _buildSearchUrl(query, options) {
        const encodedQuery = encodeURIComponent(query);
        const url = new URL(`${this.baseUrl}${this.endpoints.places}/${encodedQuery}.json`);
        
        url.searchParams.append('access_token', this.accessToken);
        
        if (options.autocomplete !== false) {
            url.searchParams.append('autocomplete', 'true');
        }
        
        if (options.types) {
            url.searchParams.append('types', Array.isArray(options.types) ? options.types.join(',') : options.types);
        }
        
        if (options.proximity) {
            url.searchParams.append('proximity', `${options.proximity.longitude},${options.proximity.latitude}`);
        }
        
        if (options.country) {
            url.searchParams.append('country', Array.isArray(options.country) ? options.country.join(',') : options.country);
        }
        
        return url.toString();
    }

    /**
     * Format geocoding response
     */
    _formatGeocodeResponse(data, originalAddress) {
        const results = data.features.map(feature => {
            const coords = feature.geometry.coordinates;
            const props = feature.properties;
            
            return {
                formattedAddress: feature.place_name,
                location: {
                    latitude: coords[1],
                    longitude: coords[0]
                },
                accuracy: this._getAccuracyFromType(feature.place_type),
                components: this._extractAddressComponents(feature),
                placeType: feature.place_type ? feature.place_type[0] : 'unknown',
                relevance: feature.relevance || 1.0,
                properties: {
                    mapboxId: feature.id,
                    wikidata: props.wikidata,
                    short_code: props.short_code,
                    category: props.category,
                    landmark: props.landmark,
                    address: props.address
                },
                bbox: feature.bbox,
                confidence: this._calculateConfidence(feature, originalAddress)
            };
        });
        
        return {
            query: originalAddress,
            results,
            resultCount: results.length,
            dataSource: 'MapBox_Geocoding',
            attribution: data.attribution
        };
    }

    /**
     * Format reverse geocoding response
     */
    _formatReverseGeocodeResponse(data, longitude, latitude) {
        const results = data.features.map(feature => ({
            formattedAddress: feature.place_name,
            components: this._extractAddressComponents(feature),
            placeType: feature.place_type ? feature.place_type[0] : 'unknown',
            relevance: feature.relevance || 1.0,
            properties: {
                mapboxId: feature.id,
                wikidata: feature.properties.wikidata,
                short_code: feature.properties.short_code,
                category: feature.properties.category
            }
        }));
        
        return {
            query: {
                latitude,
                longitude
            },
            results,
            resultCount: results.length,
            dataSource: 'MapBox_Geocoding'
        };
    }

    /**
     * Format search response
     */
    _formatSearchResponse(data, query) {
        const results = data.features.map(feature => ({
            name: feature.text,
            fullName: feature.place_name,
            location: {
                latitude: feature.geometry.coordinates[1],
                longitude: feature.geometry.coordinates[0]
            },
            type: feature.place_type ? feature.place_type[0] : 'unknown',
            relevance: feature.relevance,
            properties: feature.properties
        }));
        
        return {
            query,
            results,
            dataSource: 'MapBox_Geocoding'
        };
    }

    /**
     * Extract address components from MapBox feature
     */
    _extractAddressComponents(feature) {
        const components = {
            streetNumber: null,
            streetName: null,
            city: null,
            county: null,
            state: null,
            country: null,
            postalCode: null
        };
        
        // Extract from place_name hierarchy
        if (feature.context) {
            for (const context of feature.context) {
                const id = context.id;
                
                if (id.startsWith('postcode')) {
                    components.postalCode = context.text;
                } else if (id.startsWith('place')) {
                    components.city = context.text;
                } else if (id.startsWith('district')) {
                    components.county = context.text;
                } else if (id.startsWith('region')) {
                    components.state = context.text;
                } else if (id.startsWith('country')) {
                    components.country = context.text;
                }
            }
        }
        
        // Extract address details
        if (feature.properties.address) {
            components.streetNumber = feature.properties.address;
        }
        
        if (feature.text && feature.place_type && feature.place_type.includes('address')) {
            components.streetName = feature.text;
        }
        
        return components;
    }

    /**
     * Get accuracy level from place type
     */
    _getAccuracyFromType(placeTypes) {
        if (!placeTypes || !Array.isArray(placeTypes)) return 'unknown';
        
        if (placeTypes.includes('address')) return 'rooftop';
        if (placeTypes.includes('poi')) return 'premise';
        if (placeTypes.includes('neighborhood')) return 'neighborhood';
        if (placeTypes.includes('locality') || placeTypes.includes('place')) return 'city';
        if (placeTypes.includes('district')) return 'county';
        if (placeTypes.includes('region')) return 'state';
        if (placeTypes.includes('country')) return 'country';
        
        return 'approximate';
    }

    /**
     * Calculate confidence score
     */
    _calculateConfidence(feature, originalAddress) {
        let confidence = feature.relevance || 0.5;
        
        // Boost confidence for exact address matches
        if (feature.place_type && feature.place_type.includes('address')) {
            confidence += 0.2;
        }
        
        // Reduce confidence for very generic results
        if (feature.place_type && (feature.place_type.includes('country') || feature.place_type.includes('region'))) {
            confidence -= 0.2;
        }
        
        return Math.max(0, Math.min(1, confidence));
    }

    /**
     * Add delay for rate limiting
     */
    _delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Update request statistics
     */
    _updateStats(success, responseTime, cost) {
        this.stats.totalRequests++;
        
        if (success) {
            this.stats.successfulRequests++;
        } else {
            this.stats.errorRequests++;
        }
        
        this.stats.totalCost += cost;
        
        // Update average response time
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
        return `mapbox_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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
            averageCostPerRequest: this.stats.totalRequests > 0 
                ? Math.round((this.stats.totalCost / this.stats.totalRequests) * 10000) / 10000 
                : 0,
            cacheHitRate: this.stats.totalRequests > 0 
                ? Math.round((this.stats.cacheHits / this.stats.totalRequests) * 100) 
                : 0
        };
    }

    /**
     * Test connection to MapBox API
     */
    async testConnection() {
        try {
            const testResult = await this.geocodeAddress('1600 Pennsylvania Avenue NW, Washington, DC', {
                limit: 1
            });
            
            return {
                success: true,
                message: 'MapBox Geocoding API connection successful',
                responseTime: this.stats.averageResponseTime,
                resultCount: testResult.results.length
            };
            
        } catch (error) {
            return {
                success: false,
                message: `MapBox API connection failed: ${error.message}`,
                error: error.message
            };
        }
    }
}

module.exports = MapBoxGeocodingClient;