// httpClient.js - Seawater Climate Risk Platform
// Native Node.js HTTP client following Tim-Combo patterns (no axios dependency)

const https = require('https');
const http = require('http');
const { URL } = require('url');
const { DataSourceError } = require('./errorHandler');

/**
 * Make HTTP request using native Node.js modules
 * Following Tim-Combo pattern of no external HTTP libraries
 */
function makeHttpRequest(options) {
    return new Promise((resolve, reject) => {
        const url = new URL(options.url);
        const isHttps = url.protocol === 'https:';
        const client = isHttps ? https : http;

        const requestOptions = {
            hostname: url.hostname,
            port: url.port || (isHttps ? 443 : 80),
            path: url.pathname + url.search,
            method: options.method || 'GET',
            headers: {
                'User-Agent': options.userAgent || 'Seawater-Climate-Risk/1.0',
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                ...options.headers
            },
            timeout: options.timeout || 30000
        };

        // Add body content length for POST requests
        if (options.data) {
            const bodyString = typeof options.data === 'string' ? options.data : JSON.stringify(options.data);
            requestOptions.headers['Content-Length'] = Buffer.byteLength(bodyString);
        }

        const startTime = Date.now();

        const req = client.request(requestOptions, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                const duration = Date.now() - startTime;
                
                console.log('HTTP Request completed:', {
                    type: 'http_request_complete',
                    timestamp: new Date().toISOString(),
                    platform: 'seawater-climate-risk',
                    url: options.url,
                    method: requestOptions.method,
                    status: res.statusCode,
                    duration_ms: duration,
                    response_size: data.length
                });

                let parsedData = data;
                
                // Try to parse JSON response
                if (res.headers['content-type']?.includes('application/json')) {
                    try {
                        parsedData = JSON.parse(data);
                    } catch (parseError) {
                        console.warn('Failed to parse JSON response:', parseError.message);
                    }
                }

                const response = {
                    status: res.statusCode,
                    statusText: res.statusMessage,
                    headers: res.headers,
                    data: parsedData,
                    duration: duration,
                    url: options.url
                };

                if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve(response);
                } else {
                    reject(new DataSourceError(
                        `HTTP ${res.statusCode}: ${res.statusMessage}`,
                        options.source || 'unknown',
                        res.statusCode
                    ));
                }
            });
        });

        req.on('error', (error) => {
            const duration = Date.now() - startTime;
            
            console.error('HTTP Request error:', {
                type: 'http_request_error',
                timestamp: new Date().toISOString(),
                platform: 'seawater-climate-risk',
                url: options.url,
                error: error.message,
                duration_ms: duration
            });

            reject(new DataSourceError(
                `Network error: ${error.message}`,
                options.source || 'unknown',
                null
            ));
        });

        req.on('timeout', () => {
            req.destroy();
            reject(new DataSourceError(
                `Request timeout after ${options.timeout || 30000}ms`,
                options.source || 'unknown',
                null
            ));
        });

        // Write request body for POST requests
        if (options.data) {
            const bodyString = typeof options.data === 'string' ? options.data : JSON.stringify(options.data);
            req.write(bodyString);
        }

        req.end();
    });
}

/**
 * HTTP client with retry logic following Tim-Combo patterns
 */
class HttpClient {
    constructor(config = {}) {
        this.baseURL = config.baseURL || '';
        this.timeout = config.timeout || 30000;
        this.retryConfig = config.retryConfig || { retries: 3, retryDelay: 1000 };
        this.userAgent = config.userAgent || 'Seawater-Climate-Risk/1.0';
        this.defaultHeaders = config.headers || {};
    }

    /**
     * Make GET request with retry logic
     */
    async get(path, options = {}) {
        return this.request({
            method: 'GET',
            url: this.baseURL + path,
            ...options
        });
    }

    /**
     * Make POST request with retry logic
     */
    async post(path, data, options = {}) {
        return this.request({
            method: 'POST',
            url: this.baseURL + path,
            data: data,
            ...options
        });
    }

    /**
     * Make request with retry logic
     */
    async request(options) {
        const requestOptions = {
            ...options,
            headers: { ...this.defaultHeaders, ...options.headers },
            timeout: options.timeout || this.timeout,
            userAgent: this.userAgent
        };

        let lastError = null;
        
        for (let attempt = 0; attempt <= this.retryConfig.retries; attempt++) {
            try {
                if (attempt > 0) {
                    const delay = this.retryConfig.retryDelay * Math.pow(2, attempt - 1);
                    console.log(`Retrying request (attempt ${attempt}/${this.retryConfig.retries}) after ${delay}ms delay`);
                    await this.delay(delay);
                }

                const response = await makeHttpRequest(requestOptions);
                
                if (attempt > 0) {
                    console.log(`Request succeeded on retry attempt ${attempt}`);
                }
                
                return response;

            } catch (error) {
                lastError = error;
                
                console.warn(`Request attempt ${attempt + 1} failed:`, {
                    url: requestOptions.url,
                    error: error.message,
                    retryable: this.shouldRetry(error),
                    attemptsRemaining: this.retryConfig.retries - attempt
                });

                // Don't retry on non-retryable errors
                if (!this.shouldRetry(error)) {
                    break;
                }

                // Don't retry on last attempt
                if (attempt === this.retryConfig.retries) {
                    break;
                }
            }
        }

        // If all retries failed, throw the last error
        throw lastError;
    }

    /**
     * Determine if error should be retried
     */
    shouldRetry(error) {
        // Retry on network errors
        if (error.message.includes('ECONNRESET') || 
            error.message.includes('ETIMEDOUT') || 
            error.message.includes('ENOTFOUND') ||
            error.message.includes('Network error')) {
            return true;
        }

        // Retry on specific HTTP status codes
        if (error.status) {
            const retryableStatusCodes = [408, 429, 500, 502, 503, 504];
            return retryableStatusCodes.includes(error.status);
        }

        return false;
    }

    /**
     * Simple delay helper
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Build query string from object
     */
    buildQueryString(params) {
        if (!params || Object.keys(params).length === 0) {
            return '';
        }

        const searchParams = new URLSearchParams();
        
        for (const [key, value] of Object.entries(params)) {
            if (value !== null && value !== undefined) {
                searchParams.append(key, String(value));
            }
        }

        return '?' + searchParams.toString();
    }

    /**
     * Create a new client instance with different configuration
     */
    withConfig(newConfig) {
        return new HttpClient({
            baseURL: this.baseURL,
            timeout: this.timeout,
            retryConfig: this.retryConfig,
            userAgent: this.userAgent,
            headers: this.defaultHeaders,
            ...newConfig
        });
    }
}

module.exports = {
    HttpClient,
    makeHttpRequest
};