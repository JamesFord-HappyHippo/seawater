/**
 * APIHealthMonitor - Track external API health and performance
 * Monitors uptime, response times, error rates, and data quality
 * Provides alerting and automated health check scheduling
 */

const { EventEmitter } = require('events');

class APIHealthMonitor extends EventEmitter {
    constructor(options = {}) {
        super();
        
        this.httpClient = options.httpClient;
        this.checkInterval = options.checkInterval || 300000; // 5 minutes default
        this.alertThresholds = options.alertThresholds || {
            responseTimeMs: 10000, // 10 seconds
            errorRate: 0.1, // 10%
            uptimePercentage: 0.95 // 95%
        };
        
        // Health check configurations
        this.healthChecks = new Map();
        
        // Health metrics storage
        this.metrics = new Map();
        
        // Alert states to prevent spam
        this.alertStates = new Map();
        
        // Monitoring intervals
        this.intervals = new Map();
        
        // Overall monitoring enabled
        this.isMonitoring = false;
        
        this._initializeDefaultHealthChecks();
    }

    /**
     * Initialize default health checks for known sources
     */
    _initializeDefaultHealthChecks() {
        const defaultChecks = {
            'FEMA_NRI': {
                name: 'FEMA National Risk Index',
                url: 'https://www.fema.gov/api/open/v2/FemaWebDisasterSummaries?$top=1',
                method: 'GET',
                expectedStatus: 200,
                timeout: 30000,
                checkInterval: 300000, // 5 minutes
                enabled: true,
                alertOnFailure: true,
                customValidation: (response) => {
                    return response.data && Array.isArray(response.data.FemaWebDisasterSummaries);
                }
            },
            'NOAA_CDO': {
                name: 'NOAA Climate Data Online',
                url: 'https://www.ncei.noaa.gov/access/services/data/v1',
                method: 'GET',
                expectedStatus: [200, 400], // 400 expected without params
                timeout: 45000,
                checkInterval: 600000, // 10 minutes
                enabled: true,
                alertOnFailure: true,
                headers: {
                    'token': process.env.NOAA_API_TOKEN
                }
            },
            'USGS_Earthquake': {
                name: 'USGS Earthquake API',
                url: 'https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&limit=1',
                method: 'GET',
                expectedStatus: 200,
                timeout: 30000,
                checkInterval: 300000, // 5 minutes
                enabled: true,
                alertOnFailure: true,
                customValidation: (response) => {
                    return response.data && response.data.type === 'FeatureCollection';
                }
            },
            'FirstStreet': {
                name: 'First Street Foundation',
                url: 'https://api.firststreet.org/risk/v1/health',
                method: 'GET',
                expectedStatus: 200,
                timeout: 20000,
                checkInterval: 600000, // 10 minutes
                enabled: false, // Enable when API key available
                alertOnFailure: true,
                headers: {
                    'Authorization': `Bearer ${process.env.FIRSTSTREET_API_KEY}`
                }
            },
            'ClimateCheck': {
                name: 'ClimateCheck API',
                url: 'https://api.climatecheck.com/v1/health',
                method: 'GET',
                expectedStatus: 200,
                timeout: 25000,
                checkInterval: 600000, // 10 minutes
                enabled: false, // Enable when API key available
                alertOnFailure: true,
                headers: {
                    'Authorization': `Bearer ${process.env.CLIMATECHECK_API_KEY}`
                }
            },
            'MapBox_Geocoding': {
                name: 'MapBox Geocoding',
                url: `https://api.mapbox.com/geocoding/v5/mapbox.places/test.json?access_token=${process.env.MAPBOX_ACCESS_TOKEN}`,
                method: 'GET',
                expectedStatus: 200,
                timeout: 15000,
                checkInterval: 600000, // 10 minutes
                enabled: false, // Enable when API key available
                alertOnFailure: true,
                customValidation: (response) => {
                    return response.data && Array.isArray(response.data.features);
                }
            },
            'Google_Geocoding': {
                name: 'Google Geocoding',
                url: `https://maps.googleapis.com/maps/api/geocode/json?address=test&key=${process.env.GOOGLE_GEOCODING_API_KEY}`,
                method: 'GET',
                expectedStatus: 200,
                timeout: 15000,
                checkInterval: 600000, // 10 minutes
                enabled: false, // Enable when API key available
                alertOnFailure: true,
                customValidation: (response) => {
                    return response.data && response.data.status;
                }
            },
            'Census_Geocoding': {
                name: 'US Census Geocoding',
                url: 'https://geocoding.geo.census.gov/geocoder/geographies/address?street=4600+Silver+Hill+Rd&city=Washington&state=DC&zip=20233&benchmark=2020&vintage=2020&format=json',
                method: 'GET',
                expectedStatus: 200,
                timeout: 30000,
                checkInterval: 600000, // 10 minutes
                enabled: true,
                alertOnFailure: true,
                customValidation: (response) => {
                    return response.data && response.data.result;
                }
            }
        };

        for (const [sourceId, config] of Object.entries(defaultChecks)) {
            this.addHealthCheck(sourceId, config);
        }
    }

    /**
     * Add health check for a source
     */
    addHealthCheck(sourceId, config) {
        this.healthChecks.set(sourceId, {
            ...config,
            id: sourceId,
            lastCheck: null,
            nextCheck: null
        });

        // Initialize metrics
        this.metrics.set(sourceId, {
            totalChecks: 0,
            successfulChecks: 0,
            failedChecks: 0,
            responseTimes: [],
            uptime: 100,
            lastError: null,
            lastSuccess: null,
            consecutiveFailures: 0,
            averageResponseTime: 0,
            healthStatus: 'unknown' // healthy, degraded, unhealthy, unknown
        });

        // Initialize alert state
        this.alertStates.set(sourceId, {
            lastAlert: null,
            alertActive: false,
            alertCount: 0
        });

        console.log(`Health check added for source: ${sourceId}`);
    }

    /**
     * Start monitoring all enabled health checks
     */
    startMonitoring() {
        if (this.isMonitoring) {
            console.log('Health monitoring already running');
            return;
        }

        this.isMonitoring = true;
        console.log('Starting API health monitoring...');

        for (const [sourceId, config] of this.healthChecks.entries()) {
            if (config.enabled) {
                this._scheduleHealthCheck(sourceId);
            }
        }

        this.emit('monitoringStarted');
    }

    /**
     * Stop monitoring all health checks
     */
    stopMonitoring() {
        if (!this.isMonitoring) {
            console.log('Health monitoring not running');
            return;
        }

        this.isMonitoring = false;
        console.log('Stopping API health monitoring...');

        // Clear all intervals
        for (const [sourceId, interval] of this.intervals.entries()) {
            clearInterval(interval);
        }
        this.intervals.clear();

        this.emit('monitoringStopped');
    }

    /**
     * Schedule health check for a source
     */
    _scheduleHealthCheck(sourceId) {
        const config = this.healthChecks.get(sourceId);
        if (!config || !config.enabled) return;

        // Clear existing interval if any
        if (this.intervals.has(sourceId)) {
            clearInterval(this.intervals.get(sourceId));
        }

        // Schedule regular health checks
        const interval = setInterval(() => {
            this._performHealthCheck(sourceId);
        }, config.checkInterval);

        this.intervals.set(sourceId, interval);

        // Perform initial check after short delay
        setTimeout(() => {
            this._performHealthCheck(sourceId);
        }, 5000);

        console.log(`Health check scheduled for ${sourceId} every ${config.checkInterval}ms`);
    }

    /**
     * Perform health check for a source
     */
    async _performHealthCheck(sourceId) {
        const config = this.healthChecks.get(sourceId);
        const metrics = this.metrics.get(sourceId);
        
        if (!config || !metrics) return;

        const checkId = `health_${sourceId}_${Date.now()}`;
        const startTime = Date.now();

        try {
            console.log(`[${checkId}] Performing health check for ${config.name}`);

            config.lastCheck = startTime;
            metrics.totalChecks++;

            // Perform HTTP request
            const response = await this.httpClient.request({
                url: config.url,
                method: config.method,
                headers: config.headers,
                timeout: config.timeout
            });

            const responseTime = Date.now() - startTime;

            // Validate response
            const isValid = this._validateResponse(response, config);
            
            if (isValid) {
                this._recordSuccess(sourceId, responseTime);
                console.log(`[${checkId}] Health check passed (${responseTime}ms)`);
            } else {
                this._recordFailure(sourceId, new Error('Response validation failed'), responseTime);
                console.log(`[${checkId}] Health check failed - invalid response`);
            }

        } catch (error) {
            const responseTime = Date.now() - startTime;
            this._recordFailure(sourceId, error, responseTime);
            console.error(`[${checkId}] Health check failed:`, error.message);
        }
    }

    /**
     * Validate response based on configuration
     */
    _validateResponse(response, config) {
        // Check status code
        const expectedStatuses = Array.isArray(config.expectedStatus) 
            ? config.expectedStatus 
            : [config.expectedStatus];
            
        if (!expectedStatuses.includes(response.statusCode)) {
            return false;
        }

        // Custom validation if provided
        if (config.customValidation) {
            try {
                return config.customValidation(response);
            } catch (error) {
                console.error(`Custom validation error for ${config.id}:`, error);
                return false;
            }
        }

        return true;
    }

    /**
     * Record successful health check
     */
    _recordSuccess(sourceId, responseTime) {
        const metrics = this.metrics.get(sourceId);
        const alertState = this.alertStates.get(sourceId);
        
        if (!metrics || !alertState) return;

        metrics.successfulChecks++;
        metrics.lastSuccess = Date.now();
        metrics.consecutiveFailures = 0;
        
        // Update response times (keep last 100 measurements)
        metrics.responseTimes.push(responseTime);
        if (metrics.responseTimes.length > 100) {
            metrics.responseTimes.shift();
        }
        
        // Calculate average response time
        metrics.averageResponseTime = Math.round(
            metrics.responseTimes.reduce((sum, rt) => sum + rt, 0) / metrics.responseTimes.length
        );
        
        // Update uptime percentage
        metrics.uptime = (metrics.successfulChecks / metrics.totalChecks) * 100;
        
        // Determine health status
        const errorRate = metrics.failedChecks / metrics.totalChecks;
        if (errorRate <= 0.05 && metrics.averageResponseTime <= this.alertThresholds.responseTimeMs) {
            metrics.healthStatus = 'healthy';
        } else if (errorRate <= 0.15 || metrics.averageResponseTime <= this.alertThresholds.responseTimeMs * 2) {
            metrics.healthStatus = 'degraded';
        } else {
            metrics.healthStatus = 'unhealthy';
        }

        // Clear alert if it was active
        if (alertState.alertActive) {
            alertState.alertActive = false;
            this.emit('healthRestored', {
                sourceId,
                sourceName: this.healthChecks.get(sourceId)?.name,
                metrics: { ...metrics }
            });
        }

        this.emit('healthCheckSuccess', {
            sourceId,
            responseTime,
            uptime: metrics.uptime,
            averageResponseTime: metrics.averageResponseTime
        });
    }

    /**
     * Record failed health check
     */
    _recordFailure(sourceId, error, responseTime) {
        const metrics = this.metrics.get(sourceId);
        const alertState = this.alertStates.get(sourceId);
        const config = this.healthChecks.get(sourceId);
        
        if (!metrics || !alertState || !config) return;

        metrics.failedChecks++;
        metrics.lastError = {
            message: error.message,
            timestamp: Date.now(),
            responseTime
        };
        metrics.consecutiveFailures++;
        
        // Update uptime percentage
        metrics.uptime = (metrics.successfulChecks / metrics.totalChecks) * 100;
        
        // Update health status
        const errorRate = metrics.failedChecks / metrics.totalChecks;
        if (errorRate > 0.5 || metrics.consecutiveFailures >= 3) {
            metrics.healthStatus = 'unhealthy';
        } else if (errorRate > 0.15 || metrics.consecutiveFailures >= 2) {
            metrics.healthStatus = 'degraded';
        }

        this.emit('healthCheckFailure', {
            sourceId,
            error: error.message,
            consecutiveFailures: metrics.consecutiveFailures,
            uptime: metrics.uptime,
            responseTime
        });

        // Send alert if thresholds exceeded and alerting enabled
        if (config.alertOnFailure && this._shouldSendAlert(sourceId)) {
            this._sendAlert(sourceId, error);
        }
    }

    /**
     * Check if alert should be sent
     */
    _shouldSendAlert(sourceId) {
        const metrics = this.metrics.get(sourceId);
        const alertState = this.alertStates.get(sourceId);
        
        if (!metrics || !alertState) return false;

        // Don't send alert if one is already active
        if (alertState.alertActive) return false;

        // Check if thresholds are exceeded
        const errorRate = metrics.failedChecks / metrics.totalChecks;
        const uptimeBelow = metrics.uptime < (this.alertThresholds.uptimePercentage * 100);
        const errorRateHigh = errorRate > this.alertThresholds.errorRate;
        const consecutiveFailures = metrics.consecutiveFailures >= 3;

        return uptimeBelow || errorRateHigh || consecutiveFailures;
    }

    /**
     * Send alert for health issue
     */
    _sendAlert(sourceId, error) {
        const metrics = this.metrics.get(sourceId);
        const alertState = this.alertStates.get(sourceId);
        const config = this.healthChecks.get(sourceId);
        
        if (!metrics || !alertState || !config) return;

        alertState.alertActive = true;
        alertState.lastAlert = Date.now();
        alertState.alertCount++;

        const alertData = {
            sourceId,
            sourceName: config.name,
            error: error.message,
            uptime: metrics.uptime,
            errorRate: (metrics.failedChecks / metrics.totalChecks) * 100,
            consecutiveFailures: metrics.consecutiveFailures,
            averageResponseTime: metrics.averageResponseTime,
            healthStatus: metrics.healthStatus,
            timestamp: Date.now()
        };

        this.emit('healthAlert', alertData);

        console.error(`HEALTH ALERT for ${config.name}:`, {
            uptime: `${metrics.uptime.toFixed(2)}%`,
            errorRate: `${alertData.errorRate.toFixed(2)}%`,
            consecutiveFailures: metrics.consecutiveFailures,
            lastError: error.message
        });
    }

    /**
     * Manually check health of specific source
     */
    async checkHealth(sourceId) {
        const config = this.healthChecks.get(sourceId);
        if (!config) {
            throw new Error(`Health check not configured for source: ${sourceId}`);
        }

        await this._performHealthCheck(sourceId);
        return this.getHealthStatus(sourceId);
    }

    /**
     * Get health status for specific source
     */
    getHealthStatus(sourceId) {
        const config = this.healthChecks.get(sourceId);
        const metrics = this.metrics.get(sourceId);
        const alertState = this.alertStates.get(sourceId);
        
        if (!config || !metrics || !alertState) {
            return { error: 'Source not found or not configured' };
        }

        return {
            sourceId,
            sourceName: config.name,
            enabled: config.enabled,
            healthStatus: metrics.healthStatus,
            uptime: Math.round(metrics.uptime * 100) / 100,
            totalChecks: metrics.totalChecks,
            successfulChecks: metrics.successfulChecks,
            failedChecks: metrics.failedChecks,
            consecutiveFailures: metrics.consecutiveFailures,
            averageResponseTime: metrics.averageResponseTime,
            lastCheck: config.lastCheck,
            lastSuccess: metrics.lastSuccess,
            lastError: metrics.lastError,
            alertActive: alertState.alertActive,
            alertCount: alertState.alertCount,
            checkInterval: config.checkInterval
        };
    }

    /**
     * Get health status for all sources
     */
    getAllHealthStatus() {
        const statuses = {};
        for (const sourceId of this.healthChecks.keys()) {
            statuses[sourceId] = this.getHealthStatus(sourceId);
        }
        return statuses;
    }

    /**
     * Get overall system health summary
     */
    getSystemHealthSummary() {
        const allStatuses = this.getAllHealthStatus();
        const sources = Object.values(allStatuses);
        
        let healthy = 0;
        let degraded = 0;
        let unhealthy = 0;
        let unknown = 0;
        
        let totalUptime = 0;
        let totalResponseTime = 0;
        let totalAlerts = 0;
        
        for (const status of sources) {
            if (status.error) continue;
            
            switch (status.healthStatus) {
                case 'healthy': healthy++; break;
                case 'degraded': degraded++; break;
                case 'unhealthy': unhealthy++; break;
                default: unknown++; break;
            }
            
            totalUptime += status.uptime;
            totalResponseTime += status.averageResponseTime;
            totalAlerts += status.alertCount;
        }
        
        const validSources = sources.filter(s => !s.error).length;
        
        return {
            totalSources: validSources,
            healthy,
            degraded,
            unhealthy,
            unknown,
            overallUptime: validSources > 0 ? Math.round((totalUptime / validSources) * 100) / 100 : 0,
            averageResponseTime: validSources > 0 ? Math.round(totalResponseTime / validSources) : 0,
            totalAlerts,
            systemStatus: this._determineSystemStatus(healthy, degraded, unhealthy, validSources),
            lastUpdated: Date.now()
        };
    }

    /**
     * Determine overall system status
     */
    _determineSystemStatus(healthy, degraded, unhealthy, total) {
        if (total === 0) return 'unknown';
        
        const healthyPercentage = healthy / total;
        const unhealthyPercentage = unhealthy / total;
        
        if (healthyPercentage >= 0.8 && unhealthyPercentage === 0) {
            return 'healthy';
        } else if (unhealthyPercentage <= 0.2) {
            return 'degraded';
        } else {
            return 'unhealthy';
        }
    }

    /**
     * Enable/disable health check for source
     */
    setHealthCheckEnabled(sourceId, enabled) {
        const config = this.healthChecks.get(sourceId);
        if (!config) return false;
        
        config.enabled = enabled;
        
        if (enabled && this.isMonitoring) {
            this._scheduleHealthCheck(sourceId);
        } else {
            const interval = this.intervals.get(sourceId);
            if (interval) {
                clearInterval(interval);
                this.intervals.delete(sourceId);
            }
        }
        
        console.log(`Health check for ${sourceId} ${enabled ? 'enabled' : 'disabled'}`);
        return true;
    }

    /**
     * Update health check configuration
     */
    updateHealthCheck(sourceId, updates) {
        const config = this.healthChecks.get(sourceId);
        if (!config) return false;
        
        Object.assign(config, updates);
        
        // Reschedule if interval changed and monitoring is active
        if (updates.checkInterval && config.enabled && this.isMonitoring) {
            this._scheduleHealthCheck(sourceId);
        }
        
        console.log(`Health check configuration updated for ${sourceId}:`, updates);
        return true;
    }

    /**
     * Reset metrics for source
     */
    resetMetrics(sourceId) {
        const metrics = this.metrics.get(sourceId);
        if (!metrics) return false;
        
        Object.assign(metrics, {
            totalChecks: 0,
            successfulChecks: 0,
            failedChecks: 0,
            responseTimes: [],
            uptime: 100,
            lastError: null,
            lastSuccess: null,
            consecutiveFailures: 0,
            averageResponseTime: 0,
            healthStatus: 'unknown'
        });
        
        const alertState = this.alertStates.get(sourceId);
        if (alertState) {
            alertState.alertActive = false;
            alertState.alertCount = 0;
        }
        
        console.log(`Metrics reset for ${sourceId}`);
        return true;
    }

    /**
     * Clean up and destroy health monitor
     */
    destroy() {
        this.stopMonitoring();
        
        this.healthChecks.clear();
        this.metrics.clear();
        this.alertStates.clear();
        this.intervals.clear();
        
        this.removeAllListeners();
    }
}

module.exports = APIHealthMonitor;