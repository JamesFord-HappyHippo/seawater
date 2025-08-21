// cacheManager.js - Seawater Climate Risk Platform
// Simple cache manager wrapper for external API responses

// Simple in-memory cache for development
// In production, this should use Redis or similar persistent cache
const cache = new Map();

// Default TTL: 1 hour
const DEFAULT_TTL = 3600000;

/**
 * Get cached response
 * @param {string} key - Cache key
 * @returns {Promise<Object|null>} Cached data or null
 */
async function getCachedResponse(key) {
    const cached = cache.get(key);
    
    if (!cached) {
        return null;
    }
    
    // Check if expired
    if (Date.now() > cached.expires) {
        cache.delete(key);
        return null;
    }
    
    return cached.data;
}

/**
 * Set cached response
 * @param {string} key - Cache key
 * @param {Object} data - Data to cache
 * @param {number} ttlSeconds - TTL in seconds
 * @returns {Promise<void>}
 */
async function setCachedResponse(key, data, ttlSeconds = DEFAULT_TTL / 1000) {
    const ttlMs = ttlSeconds * 1000;
    
    cache.set(key, {
        data: data,
        expires: Date.now() + ttlMs,
        created: Date.now()
    });
    
    // Simple cleanup - remove expired entries periodically
    if (cache.size > 1000) {
        cleanup();
    }
}

/**
 * Remove cached response
 * @param {string} key - Cache key
 * @returns {Promise<boolean>} Success status
 */
async function removeCachedResponse(key) {
    return cache.delete(key);
}

/**
 * Clean up expired cache entries
 */
function cleanup() {
    const now = Date.now();
    let cleanedCount = 0;
    
    for (const [key, value] of cache.entries()) {
        if (now > value.expires) {
            cache.delete(key);
            cleanedCount++;
        }
    }
    
    console.log(`Cache cleanup: removed ${cleanedCount} expired entries`);
}

/**
 * Get cache statistics
 * @returns {Object} Cache stats
 */
function getCacheStats() {
    return {
        size: cache.size,
        memoryUsage: process.memoryUsage().heapUsed,
        totalEntries: cache.size
    };
}

/**
 * Clear all cache
 */
function clearCache() {
    cache.clear();
    console.log('Cache cleared');
}

// Periodic cleanup every 5 minutes
setInterval(cleanup, 5 * 60 * 1000);

module.exports = {
    getCachedResponse,
    setCachedResponse,
    removeCachedResponse,
    getCacheStats,
    clearCache
};