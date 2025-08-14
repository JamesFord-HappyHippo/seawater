/**
 * HTTPClient - Native Node.js HTTP client with retry logic
 * Based on Tim-Combo's proven integration patterns
 * Supports exponential backoff, error classification, and connection pooling
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');
const { EventEmitter } = require('events');

class HTTPClient extends EventEmitter {
    constructor(options = {}) {
        super();
        
        this.defaultTimeout = options.timeout || 30000; // 30 seconds
        this.maxRetries = options.maxRetries || 3;
        this.retryDelay = options.retryDelay || 1000; // Start with 1 second
        this.maxRetryDelay = options.maxRetryDelay || 16000; // Max 16 seconds
        this.userAgent = options.userAgent || 'Seawater-Climate-Platform/1.0';
        
        // Connection pooling - Tim-Combo pattern
        this.agents = {
            http: new http.Agent({
                keepAlive: true,
                maxSockets: 50,
                maxFreeSockets: 10,
                timeout: 60000,
                freeSocketTimeout: 30000
            }),
            https: new https.Agent({
                keepAlive: true,
                maxSockets: 50,
                maxFreeSockets: 10,
                timeout: 60000,
                freeSocketTimeout: 30000
            })
        };
        
        // Request stats for monitoring
        this.stats = {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            retriedRequests: 0,
            totalResponseTime: 0
        };
    }

    /**
     * Make HTTP request with retry logic
     */
    async request(options) {
        const requestId = this._generateRequestId();
        const startTime = Date.now();
        
        this.stats.totalRequests++;
        
        let lastError;
        let attempt = 0;
        
        while (attempt <= this.maxRetries) {
            try {
                if (attempt > 0) {
                    this.stats.retriedRequests++;
                    const delay = this._calculateRetryDelay(attempt);
                    console.log(`[${requestId}] Retry attempt ${attempt} after ${delay}ms delay`);
                    await this._delay(delay);
                }
                
                const result = await this._makeRequest(options, requestId, attempt);
                
                // Record successful request stats
                const responseTime = Date.now() - startTime;
                this.stats.successfulRequests++;
                this.stats.totalResponseTime += responseTime;
                
                this.emit('requestSuccess', {
                    requestId,
                    attempt,
                    responseTime,
                    statusCode: result.statusCode
                });
                
                return result;
                
            } catch (error) {
                lastError = error;
                attempt++;
                
                console.error(`[${requestId}] Request attempt ${attempt} failed:`, {
                    error: error.message,
                    code: error.code,
                    statusCode: error.statusCode,
                    retryable: this._isRetryableError(error)
                });
                
                // Don't retry if error is not retryable
                if (!this._isRetryableError(error)) {
                    break;
                }
                
                this.emit('requestRetry', {
                    requestId,
                    attempt,
                    error: error.message,
                    nextRetryIn: attempt <= this.maxRetries ? this._calculateRetryDelay(attempt) : null
                });
            }
        }
        
        // All retries exhausted
        this.stats.failedRequests++;
        const totalTime = Date.now() - startTime;
        
        this.emit('requestFailed', {
            requestId,
            totalAttempts: attempt,
            totalTime,
            finalError: lastError.message
        });
        
        throw new Error(`Request failed after ${attempt} attempts: ${lastError.message}`);
    }

    /**
     * Make single HTTP request
     */
    _makeRequest(options, requestId, attempt) {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();
            
            // Parse URL and prepare request options
            const url = new URL(options.url);
            const isHttps = url.protocol === 'https:';
            const requestModule = isHttps ? https : http;
            
            const requestOptions = {
                hostname: url.hostname,
                port: url.port || (isHttps ? 443 : 80),
                path: url.pathname + url.search,
                method: options.method || 'GET',
                headers: {
                    'User-Agent': this.userAgent,
                    'Accept': 'application/json',
                    'Accept-Encoding': 'gzip, deflate',
                    ...options.headers
                },
                timeout: options.timeout || this.defaultTimeout,
                agent: this.agents[isHttps ? 'https' : 'http']
            };

            // Add Content-Length for POST/PUT requests
            if (options.data) {
                const postData = typeof options.data === 'string' 
                    ? options.data 
                    : JSON.stringify(options.data);
                    
                requestOptions.headers['Content-Length'] = Buffer.byteLength(postData);
                
                if (!requestOptions.headers['Content-Type']) {
                    requestOptions.headers['Content-Type'] = 'application/json';
                }
            }

            console.log(`[${requestId}] Making ${requestOptions.method} request to ${url.hostname}${requestOptions.path} (attempt ${attempt + 1})`);

            const req = requestModule.request(requestOptions, (res) => {
                let responseData = '';
                
                res.on('data', (chunk) => {
                    responseData += chunk;
                });
                
                res.on('end', () => {
                    const responseTime = Date.now() - startTime;
                    
                    console.log(`[${requestId}] Response received:`, {
                        statusCode: res.statusCode,
                        contentLength: responseData.length,
                        responseTime: `${responseTime}ms`
                    });
                    
                    // Parse JSON response if content-type indicates JSON
                    let parsedData = responseData;
                    const contentType = res.headers['content-type'] || '';
                    
                    if (contentType.includes('application/json') && responseData.trim()) {
                        try {
                            parsedData = JSON.parse(responseData);
                        } catch (parseError) {
                            console.warn(`[${requestId}] Failed to parse JSON response:`, parseError.message);
                            // Keep raw data if JSON parsing fails
                        }
                    }
                    
                    const result = {
                        statusCode: res.statusCode,
                        headers: res.headers,
                        data: parsedData,
                        responseTime,
                        requestId
                    };
                    
                    // Handle HTTP error status codes
                    if (res.statusCode >= 400) {
                        const error = new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`);
                        error.statusCode = res.statusCode;
                        error.response = result;
                        error.retryable = this._isRetryableStatusCode(res.statusCode);
                        reject(error);
                        return;
                    }
                    
                    resolve(result);
                });
            });

            req.on('timeout', () => {
                req.destroy();
                const error = new Error(`Request timeout after ${requestOptions.timeout}ms`);
                error.code = 'TIMEOUT';
                error.retryable = true;
                reject(error);
            });

            req.on('error', (error) => {
                console.error(`[${requestId}] Request error:`, error);
                error.retryable = this._isRetryableNetworkError(error);
                reject(error);
            });

            // Write request data for POST/PUT
            if (options.data) {
                const postData = typeof options.data === 'string' 
                    ? options.data 
                    : JSON.stringify(options.data);
                req.write(postData);
            }

            req.end();
        });
    }

    /**
     * Determine if error is retryable
     */
    _isRetryableError(error) {
        // Network errors are generally retryable
        if (this._isRetryableNetworkError(error)) {
            return true;
        }
        
        // HTTP status code errors
        if (error.statusCode) {
            return this._isRetryableStatusCode(error.statusCode);
        }
        
        return false;
    }

    /**
     * Check if network error is retryable
     */
    _isRetryableNetworkError(error) {
        const retryableCodes = [
            'ECONNRESET',
            'ECONNREFUSED', 
            'ETIMEDOUT',
            'ENOTFOUND',
            'EHOSTUNREACH',
            'ENETUNREACH',
            'EAI_AGAIN',
            'TIMEOUT'
        ];
        
        return retryableCodes.includes(error.code);
    }

    /**
     * Check if HTTP status code is retryable
     */
    _isRetryableStatusCode(statusCode) {
        // 429 (Rate Limited) - Should retry with backoff
        if (statusCode === 429) return true;
        
        // 5xx Server Errors - Generally retryable
        if (statusCode >= 500 && statusCode < 600) return true;
        
        // 408 Request Timeout - Retryable
        if (statusCode === 408) return true;
        
        // 4xx Client Errors (except above) - Generally not retryable
        return false;
    }

    /**
     * Calculate exponential backoff delay
     */
    _calculateRetryDelay(attempt) {
        const baseDelay = this.retryDelay * Math.pow(2, attempt - 1);
        const jitter = Math.random() * 0.1 * baseDelay; // Add 10% jitter
        return Math.min(baseDelay + jitter, this.maxRetryDelay);
    }

    /**
     * Sleep for specified milliseconds
     */
    _delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Generate unique request ID for tracking
     */
    _generateRequestId() {
        return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Convenience methods
     */
    async get(url, options = {}) {
        return this.request({ ...options, method: 'GET', url });
    }

    async post(url, data, options = {}) {
        return this.request({ ...options, method: 'POST', url, data });
    }

    async put(url, data, options = {}) {
        return this.request({ ...options, method: 'PUT', url, data });
    }

    async delete(url, options = {}) {
        return this.request({ ...options, method: 'DELETE', url });
    }

    /**
     * Get performance statistics
     */
    getStats() {
        const avgResponseTime = this.stats.totalRequests > 0 
            ? Math.round(this.stats.totalResponseTime / this.stats.successfulRequests) 
            : 0;
            
        return {
            ...this.stats,
            averageResponseTime: avgResponseTime,
            successRate: this.stats.totalRequests > 0 
                ? Math.round((this.stats.successfulRequests / this.stats.totalRequests) * 100) 
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
            retriedRequests: 0,
            totalResponseTime: 0
        };
    }

    /**
     * Clean up connections
     */
    destroy() {
        this.agents.http.destroy();
        this.agents.https.destroy();
    }
}

module.exports = HTTPClient;