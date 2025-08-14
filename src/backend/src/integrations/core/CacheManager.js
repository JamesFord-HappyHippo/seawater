/**
 * CacheManager - Redis-based response caching with TTL strategies
 * Optimizes API call frequency and improves response times
 * Supports multiple cache levels and invalidation strategies
 */

const { EventEmitter } = require('events');

class CacheManager extends EventEmitter {
    constructor(options = {}) {
        super();
        
        this.redisClient = options.redisClient || null;
        this.keyPrefix = options.keyPrefix || 'seawater:climate:';
        this.defaultTTL = options.defaultTTL || 3600; // 1 hour default
        this.compression = options.compression || false;
        
        // Cache TTL strategies by data type
        this.ttlConfig = {
            property_risk: 3600, // 1 hour - risk scores change slowly
            weather_data: 21600, // 6 hours - weather data updates periodically  
            geographic_boundaries: 604800, // 1 week - boundaries rarely change
            historical_disasters: 86400, // 1 day - historical data is stable
            geocoding: 2592000, // 30 days - address coordinates don't change
            real_time_alerts: 300, // 5 minutes - alerts need to be current
            climate_projections: 2592000, // 30 days - long-term projections are stable
            api_health: 60 // 1 minute - health status changes quickly
        };
        
        // In-memory fallback cache for when Redis is unavailable
        this.memoryCache = new Map();
        this.memoryCacheMaxSize = options.memoryCacheMaxSize || 1000;
        
        // Statistics tracking
        this.stats = {
            hits: 0,
            misses: 0,
            sets: 0,
            deletes: 0,
            errors: 0,
            totalRequests: 0
        };
        
        // Setup Redis connection if provided
        if (this.redisClient) {
            this._setupRedisEventHandlers();
        }
        
        // Cleanup interval for memory cache
        this.cleanupInterval = setInterval(() => {
            this._cleanupMemoryCache();
        }, 300000); // Every 5 minutes
    }

    /**
     * Get cached data
     */
    async get(key, options = {}) {
        this.stats.totalRequests++;
        
        const fullKey = this._buildKey(key);
        
        try {
            // Try Redis first
            if (this.redisClient && await this._isRedisAvailable()) {
                const cached = await this.redisClient.get(fullKey);
                if (cached !== null) {
                    this.stats.hits++;
                    const data = this._deserialize(cached);
                    
                    this.emit('cacheHit', {
                        key: fullKey,
                        source: 'redis',
                        dataSize: cached.length
                    });
                    
                    return data;
                }
            }
            
            // Fallback to memory cache
            const memoryData = this.memoryCache.get(fullKey);
            if (memoryData && !this._isExpired(memoryData.expires)) {
                this.stats.hits++;
                
                this.emit('cacheHit', {
                    key: fullKey,
                    source: 'memory',
                    dataSize: JSON.stringify(memoryData.data).length
                });
                
                return memoryData.data;
            }
            
            // Cache miss
            this.stats.misses++;
            this.emit('cacheMiss', { key: fullKey });
            return null;
            
        } catch (error) {
            this.stats.errors++;
            console.error('Cache get error:', error);
            
            this.emit('cacheError', {
                operation: 'get',
                key: fullKey,
                error: error.message
            });
            
            return null;
        }
    }

    /**
     * Set cached data with TTL
     */
    async set(key, data, options = {}) {
        const fullKey = this._buildKey(key);
        const ttl = options.ttl || this._getTTLForKey(key) || this.defaultTTL;
        const serialized = this._serialize(data);
        
        try {
            // Set in Redis if available
            if (this.redisClient && await this._isRedisAvailable()) {
                await this.redisClient.setex(fullKey, ttl, serialized);
            }
            
            // Always set in memory cache as fallback
            this._setMemoryCache(fullKey, data, ttl);
            
            this.stats.sets++;
            
            this.emit('cacheSet', {
                key: fullKey,
                ttl,
                dataSize: serialized.length,
                source: this.redisClient ? 'redis+memory' : 'memory'
            });
            
            return true;
            
        } catch (error) {
            this.stats.errors++;
            console.error('Cache set error:', error);
            
            this.emit('cacheError', {
                operation: 'set',
                key: fullKey,
                error: error.message
            });
            
            return false;
        }
    }

    /**
     * Delete cached data
     */
    async delete(key) {
        const fullKey = this._buildKey(key);
        
        try {
            // Delete from Redis
            if (this.redisClient && await this._isRedisAvailable()) {
                await this.redisClient.del(fullKey);
            }
            
            // Delete from memory cache
            this.memoryCache.delete(fullKey);
            
            this.stats.deletes++;
            
            this.emit('cacheDelete', { key: fullKey });
            
            return true;
            
        } catch (error) {
            this.stats.errors++;
            console.error('Cache delete error:', error);
            
            this.emit('cacheError', {
                operation: 'delete',
                key: fullKey,
                error: error.message
            });
            
            return false;
        }
    }

    /**
     * Clear cache by pattern
     */
    async clearByPattern(pattern) {
        const fullPattern = this._buildKey(pattern);
        let clearedCount = 0;
        
        try {
            // Clear from Redis using pattern
            if (this.redisClient && await this._isRedisAvailable()) {
                const keys = await this.redisClient.keys(fullPattern);
                if (keys.length > 0) {
                    await this.redisClient.del(...keys);
                    clearedCount += keys.length;
                }
            }
            
            // Clear from memory cache
            for (const key of this.memoryCache.keys()) {
                if (this._matchesPattern(key, fullPattern)) {
                    this.memoryCache.delete(key);
                    clearedCount++;
                }
            }
            
            this.emit('cacheClearPattern', {
                pattern: fullPattern,
                clearedCount
            });
            
            return clearedCount;
            
        } catch (error) {
            this.stats.errors++;
            console.error('Cache clear pattern error:', error);
            
            this.emit('cacheError', {
                operation: 'clearByPattern',
                pattern: fullPattern,
                error: error.message
            });
            
            return 0;
        }
    }

    /**
     * Get or set cached data (cache-aside pattern)
     */
    async getOrSet(key, fetchFunction, options = {}) {
        // Try to get from cache first
        let data = await this.get(key, options);
        
        if (data !== null) {
            return data;
        }
        
        // Data not in cache, fetch it
        try {
            data = await fetchFunction();
            
            if (data !== null && data !== undefined) {
                await this.set(key, data, options);
            }
            
            return data;
            
        } catch (error) {
            console.error('Cache fetch function error:', error);
            throw error;
        }
    }

    /**
     * Batch get multiple keys
     */
    async getMultiple(keys, options = {}) {
        const results = {};
        const fullKeys = keys.map(key => this._buildKey(key));
        
        try {
            // Try Redis batch get
            if (this.redisClient && await this._isRedisAvailable()) {
                const values = await this.redisClient.mget(...fullKeys);
                
                for (let i = 0; i < keys.length; i++) {
                    if (values[i] !== null) {
                        results[keys[i]] = this._deserialize(values[i]);
                        this.stats.hits++;
                    } else {
                        this.stats.misses++;
                    }
                    this.stats.totalRequests++;
                }
            } else {
                // Fallback to individual gets
                for (const key of keys) {
                    results[key] = await this.get(key, options);
                }
            }
            
            return results;
            
        } catch (error) {
            this.stats.errors++;
            console.error('Cache batch get error:', error);
            return {};
        }
    }

    /**
     * Batch set multiple key-value pairs
     */
    async setMultiple(keyValuePairs, options = {}) {
        const defaultTTL = options.ttl || this.defaultTTL;
        
        try {
            if (this.redisClient && await this._isRedisAvailable()) {
                // Use Redis pipeline for batch operations
                const pipeline = this.redisClient.pipeline();
                
                for (const [key, value] of Object.entries(keyValuePairs)) {
                    const fullKey = this._buildKey(key);
                    const ttl = this._getTTLForKey(key) || defaultTTL;
                    const serialized = this._serialize(value);
                    
                    pipeline.setex(fullKey, ttl, serialized);
                    this._setMemoryCache(fullKey, value, ttl);
                }
                
                await pipeline.exec();
                this.stats.sets += Object.keys(keyValuePairs).length;
            } else {
                // Fallback to individual sets
                for (const [key, value] of Object.entries(keyValuePairs)) {
                    await this.set(key, value, options);
                }
            }
            
            return true;
            
        } catch (error) {
            this.stats.errors++;
            console.error('Cache batch set error:', error);
            return false;
        }
    }

    /**
     * Check if key exists in cache
     */
    async exists(key) {
        const fullKey = this._buildKey(key);
        
        try {
            // Check Redis first
            if (this.redisClient && await this._isRedisAvailable()) {
                const exists = await this.redisClient.exists(fullKey);
                if (exists) return true;
            }
            
            // Check memory cache
            const memoryData = this.memoryCache.get(fullKey);
            return memoryData && !this._isExpired(memoryData.expires);
            
        } catch (error) {
            console.error('Cache exists check error:', error);
            return false;
        }
    }

    /**
     * Extend TTL for existing key
     */
    async extend(key, additionalTTL) {
        const fullKey = this._buildKey(key);
        
        try {
            if (this.redisClient && await this._isRedisAvailable()) {
                const currentTTL = await this.redisClient.ttl(fullKey);
                if (currentTTL > 0) {
                    await this.redisClient.expire(fullKey, currentTTL + additionalTTL);
                }
            }
            
            // Extend memory cache TTL
            const memoryData = this.memoryCache.get(fullKey);
            if (memoryData) {
                memoryData.expires = Date.now() + (additionalTTL * 1000);
                this.memoryCache.set(fullKey, memoryData);
            }
            
            return true;
            
        } catch (error) {
            console.error('Cache extend error:', error);
            return false;
        }
    }

    /**
     * Build cache key with prefix
     */
    _buildKey(key) {
        return `${this.keyPrefix}${key}`;
    }

    /**
     * Get TTL for specific key based on data type
     */
    _getTTLForKey(key) {
        for (const [type, ttl] of Object.entries(this.ttlConfig)) {
            if (key.includes(type)) {
                return ttl;
            }
        }
        return null;
    }

    /**
     * Serialize data for storage
     */
    _serialize(data) {
        try {
            return JSON.stringify(data);
        } catch (error) {
            console.error('Serialization error:', error);
            return null;
        }
    }

    /**
     * Deserialize data from storage
     */
    _deserialize(data) {
        try {
            return JSON.parse(data);
        } catch (error) {
            console.error('Deserialization error:', error);
            return null;
        }
    }

    /**
     * Set data in memory cache with expiration
     */
    _setMemoryCache(key, data, ttl) {
        // Implement LRU eviction if cache is full
        if (this.memoryCache.size >= this.memoryCacheMaxSize) {
            const firstKey = this.memoryCache.keys().next().value;
            this.memoryCache.delete(firstKey);
        }
        
        this.memoryCache.set(key, {
            data,
            expires: Date.now() + (ttl * 1000),
            created: Date.now()
        });
    }

    /**
     * Check if memory cache entry is expired
     */
    _isExpired(expirationTime) {
        return Date.now() > expirationTime;
    }

    /**
     * Clean up expired entries from memory cache
     */
    _cleanupMemoryCache() {
        const now = Date.now();
        let cleanedCount = 0;
        
        for (const [key, value] of this.memoryCache.entries()) {
            if (this._isExpired(value.expires)) {
                this.memoryCache.delete(key);
                cleanedCount++;
            }
        }
        
        if (cleanedCount > 0) {
            this.emit('memoryCacheCleanup', {
                cleanedCount,
                remainingEntries: this.memoryCache.size
            });
        }
    }

    /**
     * Check if Redis is available
     */
    async _isRedisAvailable() {
        if (!this.redisClient) return false;
        
        try {
            await this.redisClient.ping();
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Setup Redis event handlers
     */
    _setupRedisEventHandlers() {
        if (!this.redisClient) return;
        
        this.redisClient.on('error', (error) => {
            console.error('Redis error:', error);
            this.emit('redisError', error);
        });
        
        this.redisClient.on('connect', () => {
            console.log('Redis connected');
            this.emit('redisConnected');
        });
        
        this.redisClient.on('disconnect', () => {
            console.log('Redis disconnected');
            this.emit('redisDisconnected');
        });
    }

    /**
     * Check if key matches pattern (simple wildcard support)
     */
    _matchesPattern(key, pattern) {
        const regex = pattern.replace(/\*/g, '.*').replace(/\?/g, '.');
        return new RegExp(`^${regex}$`).test(key);
    }

    /**
     * Get cache statistics
     */
    getStats() {
        const hitRate = this.stats.totalRequests > 0 
            ? Math.round((this.stats.hits / this.stats.totalRequests) * 100) 
            : 0;
            
        return {
            ...this.stats,
            hitRate,
            memoryCacheSize: this.memoryCache.size,
            memoryCacheMaxSize: this.memoryCacheMaxSize,
            redisAvailable: this.redisClient ? true : false
        };
    }

    /**
     * Reset statistics
     */
    resetStats() {
        this.stats = {
            hits: 0,
            misses: 0,
            sets: 0,
            deletes: 0,
            errors: 0,
            totalRequests: 0
        };
    }

    /**
     * Flush all cache data
     */
    async flush() {
        try {
            // Flush Redis
            if (this.redisClient && await this._isRedisAvailable()) {
                const keys = await this.redisClient.keys(`${this.keyPrefix}*`);
                if (keys.length > 0) {
                    await this.redisClient.del(...keys);
                }
            }
            
            // Clear memory cache
            this.memoryCache.clear();
            
            this.emit('cacheFlush');
            return true;
            
        } catch (error) {
            console.error('Cache flush error:', error);
            return false;
        }
    }

    /**
     * Cleanup and destroy cache manager
     */
    destroy() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }
        
        this.memoryCache.clear();
        this.removeAllListeners();
    }
}

module.exports = CacheManager;