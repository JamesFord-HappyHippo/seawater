/**
 * APIRateLimiter - Rate limiting and quota management per data source
 * Implements token bucket algorithm with source-specific limits
 * Supports cost-based limiting for premium APIs
 */

const { EventEmitter } = require('events');

class APIRateLimiter extends EventEmitter {
    constructor() {
        super();
        
        // Rate limit configurations by source
        this.rateLimits = new Map();
        
        // Token buckets for each source
        this.buckets = new Map();
        
        // Cost tracking for premium sources
        this.costTracking = new Map();
        
        // Request queues for when rate limited
        this.queues = new Map();
        
        // Initialize with default rate limits
        this._initializeDefaultLimits();
        
        // Cleanup interval for expired buckets
        this.cleanupInterval = setInterval(() => {
            this._cleanupExpiredBuckets();
        }, 60000); // Every minute
    }

    /**
     * Initialize default rate limits for known sources
     */
    _initializeDefaultLimits() {
        const defaultLimits = {
            'FEMA_NRI': {
                requests: 1000,
                window: 3600, // 1 hour in seconds
                priority: 'high',
                cost: 0.0,
                concurrent: 10
            },
            'NOAA_CDO': {
                requests: 1000,
                window: 86400, // 1 day in seconds
                priority: 'high',
                cost: 0.0,
                concurrent: 5
            },
            'USGS_Earthquake': {
                requests: 1000,
                window: 3600, // 1 hour
                priority: 'medium',
                cost: 0.0,
                concurrent: 10
            },
            'FirstStreet': {
                requests: 10000,
                window: 86400, // 1 day
                priority: 'premium',
                cost: 0.003,
                concurrent: 20
            },
            'ClimateCheck': {
                requests: 5000,
                window: 86400, // 1 day
                priority: 'premium',
                cost: 0.002,
                concurrent: 15
            },
            'MapBox_Geocoding': {
                requests: 100000,
                window: 86400, // 1 day
                priority: 'high',
                cost: 0.0075,
                concurrent: 25
            },
            'Google_Geocoding': {
                requests: 40000,
                window: 86400, // 1 day
                priority: 'medium',
                cost: 0.005,
                concurrent: 20
            },
            'Census_Geocoding': {
                requests: 10000,
                window: 86400, // 1 day
                priority: 'high',
                cost: 0.0,
                concurrent: 10
            }
        };

        for (const [source, config] of Object.entries(defaultLimits)) {
            this.setRateLimit(source, config);
        }
    }

    /**
     * Set rate limit configuration for a source
     */
    setRateLimit(source, config) {
        this.rateLimits.set(source, {
            requests: config.requests,
            window: config.window * 1000, // Convert to milliseconds
            priority: config.priority || 'medium',
            cost: config.cost || 0.0,
            concurrent: config.concurrent || 10,
            createdAt: Date.now()
        });

        // Initialize bucket if not exists
        if (!this.buckets.has(source)) {
            this._initializeBucket(source);
        }

        console.log(`Rate limit configured for ${source}:`, config);
    }

    /**
     * Check if request is allowed under rate limits
     */
    async checkRateLimit(source, requestCost = 1) {
        const config = this.rateLimits.get(source);
        if (!config) {
            console.warn(`No rate limit configuration found for source: ${source}`);
            return { allowed: true, reason: 'no_limit_configured' };
        }

        const bucket = this.buckets.get(source);
        if (!bucket) {
            this._initializeBucket(source);
            return { allowed: true, reason: 'new_bucket' };
        }

        // Refill bucket based on time elapsed
        this._refillBucket(source);

        // Check if we have enough tokens
        if (bucket.tokens < requestCost) {
            const waitTime = this._calculateWaitTime(source, requestCost);
            
            this.emit('rateLimitExceeded', {
                source,
                requestCost,
                availableTokens: bucket.tokens,
                waitTime,
                queueLength: this._getQueueLength(source)
            });

            return {
                allowed: false,
                reason: 'rate_limit_exceeded',
                waitTime,
                retryAfter: waitTime
            };
        }

        // Check concurrent request limits
        if (bucket.activeRequests >= config.concurrent) {
            this.emit('concurrentLimitExceeded', {
                source,
                activeRequests: bucket.activeRequests,
                maxConcurrent: config.concurrent
            });

            return {
                allowed: false,
                reason: 'concurrent_limit_exceeded',
                waitTime: 1000, // Wait 1 second and retry
                retryAfter: 1000
            };
        }

        // Check cost limits for premium sources
        if (config.cost > 0) {
            const costCheck = this._checkCostLimit(source, requestCost * config.cost);
            if (!costCheck.allowed) {
                return costCheck;
            }
        }

        // Consume tokens and track cost
        bucket.tokens -= requestCost;
        bucket.activeRequests++;
        
        if (config.cost > 0) {
            this._trackCost(source, requestCost * config.cost);
        }

        this.emit('requestAllowed', {
            source,
            tokensConsumed: requestCost,
            tokensRemaining: bucket.tokens,
            activeRequests: bucket.activeRequests,
            cost: requestCost * config.cost
        });

        return { allowed: true, reason: 'within_limits' };
    }

    /**
     * Mark request as completed to free up concurrent slot
     */
    markRequestCompleted(source) {
        const bucket = this.buckets.get(source);
        if (bucket && bucket.activeRequests > 0) {
            bucket.activeRequests--;
            
            this.emit('requestCompleted', {
                source,
                activeRequests: bucket.activeRequests
            });
        }
    }

    /**
     * Queue request when rate limited
     */
    async queueRequest(source, requestFn, priority = 'normal') {
        const queue = this._getQueue(source);
        
        return new Promise((resolve, reject) => {
            const queueItem = {
                requestFn,
                priority,
                resolve,
                reject,
                timestamp: Date.now()
            };

            // Insert based on priority
            if (priority === 'high') {
                queue.unshift(queueItem);
            } else {
                queue.push(queueItem);
            }

            this.emit('requestQueued', {
                source,
                priority,
                queueLength: queue.length
            });

            // Process queue
            this._processQueue(source);
        });
    }

    /**
     * Process queued requests
     */
    async _processQueue(source) {
        const queue = this._getQueue(source);
        if (queue.length === 0) return;

        // Check if we can process next request
        const check = await this.checkRateLimit(source);
        if (!check.allowed) {
            // Schedule retry
            setTimeout(() => {
                this._processQueue(source);
            }, check.waitTime || 1000);
            return;
        }

        // Process next request in queue
        const queueItem = queue.shift();
        if (queueItem) {
            try {
                const result = await queueItem.requestFn();
                queueItem.resolve(result);
            } catch (error) {
                queueItem.reject(error);
            } finally {
                this.markRequestCompleted(source);
                
                // Continue processing queue
                setTimeout(() => {
                    this._processQueue(source);
                }, 100); // Small delay between requests
            }
        }
    }

    /**
     * Initialize token bucket for source
     */
    _initializeBucket(source) {
        const config = this.rateLimits.get(source);
        if (!config) return;

        this.buckets.set(source, {
            tokens: config.requests,
            maxTokens: config.requests,
            lastRefill: Date.now(),
            activeRequests: 0
        });
    }

    /**
     * Refill token bucket based on elapsed time
     */
    _refillBucket(source) {
        const config = this.rateLimits.get(source);
        const bucket = this.buckets.get(source);
        
        if (!config || !bucket) return;

        const now = Date.now();
        const elapsed = now - bucket.lastRefill;
        const tokensToAdd = Math.floor((elapsed / config.window) * config.requests);

        if (tokensToAdd > 0) {
            bucket.tokens = Math.min(bucket.maxTokens, bucket.tokens + tokensToAdd);
            bucket.lastRefill = now;
        }
    }

    /**
     * Calculate wait time until next request is allowed
     */
    _calculateWaitTime(source, requestCost) {
        const config = this.rateLimits.get(source);
        const bucket = this.buckets.get(source);
        
        if (!config || !bucket) return 1000;

        const tokensNeeded = requestCost - bucket.tokens;
        const timePerToken = config.window / config.requests;
        
        return Math.ceil(tokensNeeded * timePerToken);
    }

    /**
     * Check cost limits for premium sources
     */
    _checkCostLimit(source, requestCost) {
        const dailyCostLimit = this._getDailyCostLimit(source);
        if (dailyCostLimit === null) {
            return { allowed: true, reason: 'no_cost_limit' };
        }

        const currentCost = this._getCurrentDailyCost(source);
        if (currentCost + requestCost > dailyCostLimit) {
            this.emit('costLimitExceeded', {
                source,
                requestCost,
                currentCost,
                dailyLimit: dailyCostLimit
            });

            return {
                allowed: false,
                reason: 'cost_limit_exceeded',
                waitTime: this._getTimeUntilCostReset(),
                retryAfter: this._getTimeUntilCostReset()
            };
        }

        return { allowed: true, reason: 'within_cost_limit' };
    }

    /**
     * Track cost for premium sources
     */
    _trackCost(source, cost) {
        const today = new Date().toISOString().split('T')[0];
        const key = `${source}_${today}`;
        
        if (!this.costTracking.has(key)) {
            this.costTracking.set(key, 0);
        }
        
        this.costTracking.set(key, this.costTracking.get(key) + cost);
    }

    /**
     * Get current daily cost for source
     */
    _getCurrentDailyCost(source) {
        const today = new Date().toISOString().split('T')[0];
        const key = `${source}_${today}`;
        return this.costTracking.get(key) || 0;
    }

    /**
     * Get daily cost limit for source
     */
    _getDailyCostLimit(source) {
        // These could be configured per source or subscription tier
        const limits = {
            'FirstStreet': 30.0, // $30/day
            'ClimateCheck': 20.0, // $20/day
            'MapBox_Geocoding': 100.0, // $100/day
            'Google_Geocoding': 50.0 // $50/day
        };
        
        return limits[source] || null;
    }

    /**
     * Get time until cost tracking resets (midnight UTC)
     */
    _getTimeUntilCostReset() {
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
        tomorrow.setUTCHours(0, 0, 0, 0);
        
        return tomorrow.getTime() - now.getTime();
    }

    /**
     * Get or create queue for source
     */
    _getQueue(source) {
        if (!this.queues.has(source)) {
            this.queues.set(source, []);
        }
        return this.queues.get(source);
    }

    /**
     * Get queue length for source
     */
    _getQueueLength(source) {
        return this._getQueue(source).length;
    }

    /**
     * Clean up expired buckets and cost tracking
     */
    _cleanupExpiredBuckets() {
        const now = Date.now();
        const oneDayAgo = now - (24 * 60 * 60 * 1000);
        
        // Clean up old cost tracking entries
        for (const [key] of this.costTracking) {
            if (key.includes('_')) {
                const dateStr = key.split('_').pop();
                const date = new Date(dateStr);
                if (date.getTime() < oneDayAgo) {
                    this.costTracking.delete(key);
                }
            }
        }
    }

    /**
     * Get rate limit status for source
     */
    getStatus(source) {
        const config = this.rateLimits.get(source);
        const bucket = this.buckets.get(source);
        
        if (!config || !bucket) {
            return { source, status: 'not_configured' };
        }

        this._refillBucket(source);

        return {
            source,
            tokensAvailable: bucket.tokens,
            maxTokens: bucket.maxTokens,
            activeRequests: bucket.activeRequests,
            maxConcurrent: config.concurrent,
            queueLength: this._getQueueLength(source),
            currentDailyCost: this._getCurrentDailyCost(source),
            priority: config.priority,
            utilizationRate: Math.round(((bucket.maxTokens - bucket.tokens) / bucket.maxTokens) * 100)
        };
    }

    /**
     * Get status for all sources
     */
    getAllStatus() {
        const statuses = {};
        for (const source of this.rateLimits.keys()) {
            statuses[source] = this.getStatus(source);
        }
        return statuses;
    }

    /**
     * Reset rate limits for source (admin function)
     */
    resetRateLimit(source) {
        this._initializeBucket(source);
        this.queues.set(source, []);
        
        this.emit('rateLimitReset', { source });
        console.log(`Rate limit reset for source: ${source}`);
    }

    /**
     * Cleanup and destroy rate limiter
     */
    destroy() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }
        
        this.rateLimits.clear();
        this.buckets.clear();
        this.costTracking.clear();
        this.queues.clear();
        
        this.removeAllListeners();
    }
}

module.exports = APIRateLimiter;