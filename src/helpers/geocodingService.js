// geocodingService.js - Seawater Climate Risk Platform
// MapBox geocoding integration following Tim-Combo patterns

const { HTTPClient } = require('./httpClient');
const { ExternalAPIError } = require('./errorHandler');

class GeocodingService {
    constructor() {
        this.client = new HTTPClient();
        this.baseUrl = 'https://api.mapbox.com/geocoding/v5/mapbox.places';
        this.accessToken = process.env.MAPBOX_ACCESS_TOKEN;
        this.cache = new Map(); // Simple in-memory cache
        this.cacheExpiry = 24 * 60 * 60 * 1000; // 24 hours
    }

    /**
     * Geocode an address using MapBox Geocoding API
     * @param {string} address - Address to geocode
     * @param {Object} options - Additional options
     * @returns {Object} Geocoding result
     */
    async geocodeAddress(address, options = {}) {
        try {
            console.log('Geocoding address:', {
                address: address,
                timestamp: new Date().toISOString(),
                platform: 'seawater-climate-risk'
            });

            if (!this.accessToken) {
                throw new ExternalAPIError(
                    'MapBox access token not configured',
                    'mapbox',
                    'configuration_error',
                    false
                );
            }

            // Check cache first
            const cacheKey = this.getCacheKey(address);
            const cachedResult = this.getCachedResult(cacheKey);
            if (cachedResult) {
                console.log('Returning cached geocoding result for:', address);
                return {
                    ...cachedResult,
                    cached: true
                };
            }

            // Prepare request parameters
            const params = {
                access_token: this.accessToken,
                limit: 1,
                types: 'address,poi',
                country: 'US', // Restrict to US for climate risk platform
                ...options
            };

            // Make API request
            const encodedAddress = encodeURIComponent(address.trim());
            const url = `${this.baseUrl}/${encodedAddress}.json`;
            
            const response = await this.client.get(url, { params });

            if (!response.data || !response.data.features || response.data.features.length === 0) {
                return {
                    success: false,
                    error: 'No geocoding results found',
                    address: address,
                    source: 'mapbox'
                };
            }

            const feature = response.data.features[0];
            const [longitude, latitude] = feature.geometry.coordinates;

            const result = {
                success: true,
                address: address,
                normalizedAddress: feature.place_name,
                latitude: latitude,
                longitude: longitude,
                accuracy: this.calculateAccuracy(feature),
                confidence: feature.relevance || 0.8,
                source: 'mapbox',
                placeType: feature.place_type[0],
                context: this.extractContext(feature),
                bbox: feature.bbox,
                cached: false,
                timestamp: new Date().toISOString()
            };

            // Cache the result
            this.cacheResult(cacheKey, result);

            console.log('Geocoding successful:', {
                originalAddress: address,
                normalizedAddress: result.normalizedAddress,
                coordinates: `${latitude}, ${longitude}`,
                accuracy: result.accuracy,
                source: result.source
            });

            return result;

        } catch (error) {
            console.error('Geocoding error:', {
                address: address,
                error: error.message,
                source: 'mapbox'
            });

            if (error instanceof ExternalAPIError) {
                throw error;
            }

            // Handle specific MapBox API errors
            if (error.response) {
                const status = error.response.status;
                const message = error.response.data?.message || error.message;

                if (status === 401) {
                    throw new ExternalAPIError(
                        'Invalid MapBox access token',
                        'mapbox',
                        'authentication_error',
                        false
                    );
                }

                if (status === 429) {
                    throw new ExternalAPIError(
                        'MapBox rate limit exceeded',
                        'mapbox',
                        'rate_limit_error',
                        true
                    );
                }

                throw new ExternalAPIError(
                    `MapBox API error: ${message}`,
                    'mapbox',
                    'api_error',
                    status >= 500
                );
            }

            throw new ExternalAPIError(
                `Geocoding service error: ${error.message}`,
                'mapbox',
                'network_error',
                true
            );
        }
    }

    /**
     * Reverse geocode coordinates to address
     * @param {number} latitude - Latitude
     * @param {number} longitude - Longitude
     * @param {Object} options - Additional options
     * @returns {Object} Reverse geocoding result
     */
    async reverseGeocode(latitude, longitude, options = {}) {
        try {
            console.log('Reverse geocoding coordinates:', {
                latitude: latitude,
                longitude: longitude,
                timestamp: new Date().toISOString()
            });

            if (!this.accessToken) {
                throw new ExternalAPIError(
                    'MapBox access token not configured',
                    'mapbox',
                    'configuration_error',
                    false
                );
            }

            // Check cache
            const cacheKey = this.getCacheKey(`${latitude},${longitude}`);
            const cachedResult = this.getCachedResult(cacheKey);
            if (cachedResult) {
                return {
                    ...cachedResult,
                    cached: true
                };
            }

            const params = {
                access_token: this.accessToken,
                limit: 1,
                types: 'address',
                ...options
            };

            const url = `${this.baseUrl}/${longitude},${latitude}.json`;
            const response = await this.client.get(url, { params });

            if (!response.data || !response.data.features || response.data.features.length === 0) {
                return {
                    success: false,
                    error: 'No reverse geocoding results found',
                    latitude: latitude,
                    longitude: longitude,
                    source: 'mapbox'
                };
            }

            const feature = response.data.features[0];
            const result = {
                success: true,
                latitude: latitude,
                longitude: longitude,
                address: feature.place_name,
                accuracy: this.calculateAccuracy(feature),
                confidence: feature.relevance || 0.8,
                source: 'mapbox',
                placeType: feature.place_type[0],
                context: this.extractContext(feature),
                cached: false,
                timestamp: new Date().toISOString()
            };

            this.cacheResult(cacheKey, result);
            return result;

        } catch (error) {
            console.error('Reverse geocoding error:', error);
            throw new ExternalAPIError(
                `Reverse geocoding error: ${error.message}`,
                'mapbox',
                'api_error',
                true
            );
        }
    }

    /**
     * Batch geocode multiple addresses
     * @param {Array} addresses - Array of addresses to geocode
     * @param {Object} options - Additional options
     * @returns {Array} Array of geocoding results
     */
    async batchGeocode(addresses, options = {}) {
        const results = [];
        const maxConcurrent = options.maxConcurrent || 5;
        
        console.log(`Batch geocoding ${addresses.length} addresses with ${maxConcurrent} concurrent requests`);

        // Process in batches to avoid overwhelming the API
        for (let i = 0; i < addresses.length; i += maxConcurrent) {
            const batch = addresses.slice(i, i + maxConcurrent);
            const batchPromises = batch.map(async (address, index) => {
                try {
                    const result = await this.geocodeAddress(address, options);
                    return {
                        index: i + index,
                        address: address,
                        ...result
                    };
                } catch (error) {
                    return {
                        index: i + index,
                        address: address,
                        success: false,
                        error: error.message,
                        source: 'mapbox'
                    };
                }
            });

            const batchResults = await Promise.all(batchPromises);
            results.push(...batchResults);

            // Small delay between batches to be respectful to the API
            if (i + maxConcurrent < addresses.length) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }

        return results;
    }

    /**
     * Calculate accuracy score based on MapBox feature properties
     * @param {Object} feature - MapBox feature object
     * @returns {string} Accuracy category
     */
    calculateAccuracy(feature) {
        const placeType = feature.place_type[0];
        const relevance = feature.relevance || 0;

        if (placeType === 'address' && relevance > 0.9) {
            return 'exact';
        } else if (placeType === 'address' && relevance > 0.7) {
            return 'high';
        } else if (placeType === 'poi' && relevance > 0.8) {
            return 'high';
        } else if (relevance > 0.5) {
            return 'medium';
        } else {
            return 'low';
        }
    }

    /**
     * Extract geographic context from MapBox feature
     * @param {Object} feature - MapBox feature object
     * @returns {Object} Geographic context
     */
    extractContext(feature) {
        const context = {};
        
        if (feature.context) {
            for (const contextItem of feature.context) {
                const [type] = contextItem.id.split('.');
                
                switch (type) {
                    case 'postcode':
                        context.zipCode = contextItem.text;
                        break;
                    case 'place':
                        context.city = contextItem.text;
                        break;
                    case 'region':
                        context.state = contextItem.text;
                        context.stateCode = contextItem.short_code?.replace('US-', '');
                        break;
                    case 'country':
                        context.country = contextItem.text;
                        context.countryCode = contextItem.short_code;
                        break;
                }
            }
        }

        return context;
    }

    /**
     * Generate cache key for an address
     * @param {string} address - Address or coordinate string
     * @returns {string} Cache key
     */
    getCacheKey(address) {
        return `geocode:${address.toLowerCase().trim()}`;
    }

    /**
     * Get cached result if available and not expired
     * @param {string} cacheKey - Cache key
     * @returns {Object|null} Cached result or null
     */
    getCachedResult(cacheKey) {
        const cached = this.cache.get(cacheKey);
        if (cached && (Date.now() - cached.timestamp) < this.cacheExpiry) {
            return cached.result;
        }
        
        if (cached) {
            this.cache.delete(cacheKey);
        }
        
        return null;
    }

    /**
     * Cache geocoding result
     * @param {string} cacheKey - Cache key
     * @param {Object} result - Result to cache
     */
    cacheResult(cacheKey, result) {
        this.cache.set(cacheKey, {
            result: result,
            timestamp: Date.now()
        });

        // Clean up cache if it gets too large
        if (this.cache.size > 1000) {
            const oldestKeys = Array.from(this.cache.keys()).slice(0, 100);
            oldestKeys.forEach(key => this.cache.delete(key));
        }
    }

    /**
     * Get service status and statistics
     * @returns {Object} Service status
     */
    getStatus() {
        return {
            service: 'mapbox_geocoding',
            configured: !!this.accessToken,
            cache_size: this.cache.size,
            cache_expiry_hours: this.cacheExpiry / (1000 * 60 * 60),
            last_request: this.lastRequestTime,
            base_url: this.baseUrl
        };
    }
}

// Create singleton instance
const geocodingService = new GeocodingService();

// Export convenience functions
async function geocodeAddress(address, options = {}) {
    return geocodingService.geocodeAddress(address, options);
}

async function reverseGeocode(latitude, longitude, options = {}) {
    return geocodingService.reverseGeocode(latitude, longitude, options);
}

async function batchGeocode(addresses, options = {}) {
    return geocodingService.batchGeocode(addresses, options);
}

module.exports = {
    GeocodingService,
    geocodingService,
    geocodeAddress,
    reverseGeocode,
    batchGeocode
};