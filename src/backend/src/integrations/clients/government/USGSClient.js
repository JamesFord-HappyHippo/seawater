/**
 * USGSClient - USGS Earthquake and Geological Data API integration
 * Provides access to real-time and historical earthquake data
 * Supports spatial queries and magnitude filtering
 */

const { EventEmitter } = require('events');

class USGSClient extends EventEmitter {
    constructor(options = {}) {
        super();
        
        this.httpClient = options.httpClient;
        this.cacheManager = options.cacheManager;
        
        // USGS API endpoints
        this.endpoints = {
            earthquake: 'https://earthquake.usgs.gov/fdsnws/event/1',
            waterData: 'https://waterservices.usgs.gov/nwis',
            landSubsidence: 'https://water.usgs.gov/ogw/subsidence'
        };
        
        // Configuration
        this.config = {
            timeout: 30000,
            retryAttempts: 3,
            defaultFormat: 'geojson',
            maxEvents: 20000,
            maxDays: 365
        };
        
        // Cache TTL settings
        this.cacheTTL = {
            earthquake_realtime: 300, // 5 minutes for current events
            earthquake_historical: 86400, // 1 day for historical
            water_data: 3600, // 1 hour for water data
            static_data: 604800 // 1 week for static geological data
        };
        
        // Earthquake magnitude scales
        this.magnitudeScales = {
            micro: { min: -1.0, max: 2.9 },
            minor: { min: 3.0, max: 3.9 },
            light: { min: 4.0, max: 4.9 },
            moderate: { min: 5.0, max: 5.9 },
            strong: { min: 6.0, max: 6.9 },
            major: { min: 7.0, max: 7.9 },
            great: { min: 8.0, max: 10.0 }
        };
        
        // Statistics tracking
        this.stats = {
            totalRequests: 0,
            successfulRequests: 0,
            errorRequests: 0,
            cacheHits: 0,
            averageResponseTime: 0
        };
    }

    /**
     * Get earthquake data for a location and time period
     */
    async getEarthquakeData(query) {
        const requestId = this._generateRequestId();
        const startTime = Date.now();
        
        try {
            // Build cache key
            const cacheKey = `usgs:earthquake:${JSON.stringify(query)}`;
            
            // Determine cache TTL based on query recency
            const isRealtime = this._isRealtimeQuery(query);
            const ttl = isRealtime ? this.cacheTTL.earthquake_realtime : this.cacheTTL.earthquake_historical;
            
            // Check cache first
            if (this.cacheManager) {
                const cached = await this.cacheManager.get(cacheKey);
                if (cached) {
                    this.stats.cacheHits++;
                    this.emit('cacheHit', { requestId, cacheKey });
                    return this._formatEarthquakeResponse(cached);
                }
            }
            
            // Build USGS earthquake API request
            const url = this._buildEarthquakeUrl(query);
            
            console.log(`[${requestId}] Fetching USGS earthquake data: ${url}`);
            
            const response = await this.httpClient.get(url, {
                timeout: this.config.timeout,
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'Seawater-Climate-Platform/1.0'
                }
            });
            
            const responseTime = Date.now() - startTime;
            this._updateStats(true, responseTime);
            
            // Validate GeoJSON response
            if (!response.data || response.data.type !== 'FeatureCollection') {
                throw new Error('Invalid USGS earthquake response format');
            }
            
            const earthquakeData = response.data;
            
            // Cache the response
            if (this.cacheManager) {
                await this.cacheManager.set(cacheKey, earthquakeData, { ttl });
            }
            
            const formattedResponse = this._formatEarthquakeResponse(earthquakeData);
            
            this.emit('dataFetched', {
                requestId,
                endpoint: 'earthquake',
                responseTime,
                eventCount: earthquakeData.features.length
            });
            
            return formattedResponse;
            
        } catch (error) {
            const responseTime = Date.now() - startTime;
            this._updateStats(false, responseTime);
            
            this.emit('requestError', {
                requestId,
                endpoint: 'earthquake',
                error: error.message,
                responseTime
            });
            
            throw new Error(`USGS earthquake request failed: ${error.message}`);
        }
    }

    /**
     * Get earthquakes by coordinates and radius
     */
    async getEarthquakesByLocation(latitude, longitude, options = {}) {
        try {
            const query = {
                format: options.format || this.config.defaultFormat,
                latitude: latitude,
                longitude: longitude,
                maxradiuskm: options.radiusKm || 100,
                minmagnitude: options.minMagnitude || 2.5,
                maxmagnitude: options.maxMagnitude || 10.0,
                starttime: options.startDate || this._getDefaultStartDate(),
                endtime: options.endDate || new Date().toISOString().split('T')[0],
                limit: options.limit || 1000,
                orderby: options.orderBy || 'time-asc'
            };
            
            return await this.getEarthquakeData(query);
            
        } catch (error) {
            throw new Error(`USGS location earthquake lookup failed: ${error.message}`);
        }
    }

    /**
     * Get earthquakes by bounding box
     */
    async getEarthquakesByBoundingBox(minLatitude, minLongitude, maxLatitude, maxLongitude, options = {}) {
        try {
            const query = {
                format: options.format || this.config.defaultFormat,
                minlatitude: minLatitude,
                minlongitude: minLongitude,
                maxlatitude: maxLatitude,
                maxlongitude: maxLongitude,
                minmagnitude: options.minMagnitude || 2.5,
                maxmagnitude: options.maxMagnitude || 10.0,
                starttime: options.startDate || this._getDefaultStartDate(),
                endtime: options.endDate || new Date().toISOString().split('T')[0],
                limit: options.limit || 1000,
                orderby: options.orderBy || 'time-desc'
            };
            
            return await this.getEarthquakeData(query);
            
        } catch (error) {
            throw new Error(`USGS bounding box earthquake lookup failed: ${error.message}`);
        }
    }

    /**
     * Get recent significant earthquakes
     */
    async getSignificantEarthquakes(options = {}) {
        try {
            const query = {
                format: this.config.defaultFormat,
                minmagnitude: options.minMagnitude || 4.5,
                starttime: options.startDate || this._getRelativeDate(-30), // Last 30 days
                endtime: options.endDate || new Date().toISOString().split('T')[0],
                limit: options.limit || 100,
                orderby: 'magnitude-desc'
            };
            
            // Add location filter if specified
            if (options.region) {
                Object.assign(query, this._getRegionBounds(options.region));
            }
            
            return await this.getEarthquakeData(query);
            
        } catch (error) {
            throw new Error(`USGS significant earthquakes lookup failed: ${error.message}`);
        }
    }

    /**
     * Get earthquake risk assessment for a location
     */
    async getEarthquakeRisk(latitude, longitude, options = {}) {
        try {
            // Get historical earthquakes in the area
            const historicalEarthquakes = await this.getEarthquakesByLocation(latitude, longitude, {
                radiusKm: options.radiusKm || 50,
                minMagnitude: 3.0,
                startDate: this._getRelativeDate(-365 * 10), // Last 10 years
                limit: 1000
            });
            
            // Calculate risk metrics
            const riskAssessment = this._calculateEarthquakeRisk(historicalEarthquakes.earthquakes, options);
            
            return {
                location: {
                    latitude,
                    longitude
                },
                riskAssessment,
                historicalData: {
                    earthquakeCount: historicalEarthquakes.earthquakes.length,
                    dateRange: {
                        start: this._getRelativeDate(-365 * 10),
                        end: new Date().toISOString().split('T')[0]
                    },
                    radiusKm: options.radiusKm || 50
                },
                dataSource: 'USGS_Earthquake',
                generatedAt: new Date().toISOString()
            };
            
        } catch (error) {
            throw new Error(`USGS earthquake risk assessment failed: ${error.message}`);
        }
    }

    /**
     * Get real-time earthquake alerts
     */
    async getRealtimeAlerts(options = {}) {
        try {
            const query = {
                format: this.config.defaultFormat,
                minmagnitude: options.minMagnitude || 5.0,
                starttime: this._getRelativeDate(-1), // Last 24 hours
                limit: options.limit || 50,
                orderby: 'time-desc'
            };
            
            const response = await this.getEarthquakeData(query);
            
            // Filter for recent significant events
            const alerts = response.earthquakes.filter(eq => {
                const eventTime = new Date(eq.time);
                const hoursAgo = (Date.now() - eventTime.getTime()) / (1000 * 60 * 60);
                return hoursAgo <= 24 && eq.magnitude >= (options.minMagnitude || 5.0);
            });
            
            return {
                alerts: alerts.map(eq => ({
                    ...eq,
                    alertLevel: this._getAlertLevel(eq.magnitude),
                    tsunami: eq.properties.tsunami === 1,
                    felt: eq.properties.felt || 0,
                    significance: eq.properties.sig || 0
                })),
                alertCount: alerts.length,
                generatedAt: new Date().toISOString(),
                dataSource: 'USGS_Earthquake'
            };
            
        } catch (error) {
            throw new Error(`USGS realtime alerts failed: ${error.message}`);
        }
    }

    /**
     * Build earthquake API URL
     */
    _buildEarthquakeUrl(query) {
        const url = new URL(`${this.endpoints.earthquake}/query`);
        
        // Add query parameters
        for (const [key, value] of Object.entries(query)) {
            if (value !== undefined && value !== null) {
                url.searchParams.append(key, value);
            }
        }
        
        return url.toString();
    }

    /**
     * Format earthquake response to standardized format
     */
    _formatEarthquakeResponse(data) {
        const earthquakes = data.features.map(feature => {
            const props = feature.properties;
            const coords = feature.geometry.coordinates;
            
            return {
                id: feature.id,
                magnitude: props.mag,
                location: {
                    latitude: coords[1],
                    longitude: coords[0],
                    depth: coords[2] || 0
                },
                time: new Date(props.time).toISOString(),
                place: props.place,
                type: props.type,
                properties: {
                    title: props.title,
                    url: props.url,
                    detail: props.detail,
                    felt: props.felt,
                    cdi: props.cdi, // Community Decimal Intensity
                    mmi: props.mmi, // Modified Mercalli Intensity
                    alert: props.alert,
                    status: props.status,
                    tsunami: props.tsunami === 1,
                    significance: props.sig,
                    network: props.net,
                    code: props.code,
                    sources: props.sources,
                    updated: props.updated ? new Date(props.updated).toISOString() : null
                },
                magnitudeType: props.magType,
                magnitudeScale: this._getMagnitudeScale(props.mag),
                distanceFromQuery: null // Will be calculated if location provided
            };
        });
        
        return {
            earthquakes,
            metadata: {
                count: earthquakes.length,
                generated: data.metadata ? new Date(data.metadata.generated).toISOString() : new Date().toISOString(),
                api: data.metadata ? data.metadata.api : 'unknown',
                title: data.metadata ? data.metadata.title : 'USGS Earthquake Data'
            },
            bbox: data.bbox,
            dataSource: 'USGS_Earthquake'
        };
    }

    /**
     * Calculate earthquake risk metrics
     */
    _calculateEarthquakeRisk(earthquakes, options = {}) {
        if (!earthquakes || earthquakes.length === 0) {
            return {
                riskLevel: 'low',
                riskScore: 10,
                maxMagnitude: 0,
                eventFrequency: 0,
                averageMagnitude: 0,
                confidence: 'low'
            };
        }
        
        // Calculate basic statistics
        const magnitudes = earthquakes.map(eq => eq.magnitude).filter(m => m > 0);
        const maxMagnitude = Math.max(...magnitudes);
        const averageMagnitude = magnitudes.reduce((sum, m) => sum + m, 0) / magnitudes.length;
        
        // Calculate frequency by magnitude ranges
        const frequencyAnalysis = {};
        for (const [scale, range] of Object.entries(this.magnitudeScales)) {
            const count = magnitudes.filter(m => m >= range.min && m <= range.max).length;
            frequencyAnalysis[scale] = count;
        }
        
        // Calculate annual frequency
        const yearsOfData = 10; // Based on query range
        const eventFrequency = earthquakes.length / yearsOfData;
        
        // Calculate risk score (0-100)
        let riskScore = 0;
        
        // Base score on maximum magnitude
        if (maxMagnitude >= 7.0) riskScore += 40;
        else if (maxMagnitude >= 6.0) riskScore += 30;
        else if (maxMagnitude >= 5.0) riskScore += 20;
        else if (maxMagnitude >= 4.0) riskScore += 10;
        
        // Add score based on frequency
        if (eventFrequency >= 10) riskScore += 30;
        else if (eventFrequency >= 5) riskScore += 20;
        else if (eventFrequency >= 1) riskScore += 10;
        
        // Add score based on recent activity (last year)
        const lastYear = new Date();
        lastYear.setFullYear(lastYear.getFullYear() - 1);
        const recentEvents = earthquakes.filter(eq => new Date(eq.time) > lastYear);
        if (recentEvents.length >= 5) riskScore += 20;
        else if (recentEvents.length >= 2) riskScore += 10;
        
        // Normalize score
        riskScore = Math.min(riskScore, 100);
        
        // Determine risk level
        let riskLevel;
        if (riskScore >= 70) riskLevel = 'very_high';
        else if (riskScore >= 50) riskLevel = 'high';
        else if (riskScore >= 30) riskLevel = 'moderate';
        else if (riskScore >= 15) riskLevel = 'low';
        else riskLevel = 'very_low';
        
        // Determine confidence based on data amount
        let confidence;
        if (earthquakes.length >= 50) confidence = 'high';
        else if (earthquakes.length >= 20) confidence = 'medium';
        else confidence = 'low';
        
        return {
            riskLevel,
            riskScore,
            maxMagnitude: Math.round(maxMagnitude * 10) / 10,
            averageMagnitude: Math.round(averageMagnitude * 10) / 10,
            eventFrequency: Math.round(eventFrequency * 10) / 10,
            recentActivity: recentEvents.length,
            frequencyByScale: frequencyAnalysis,
            confidence,
            dataYears: yearsOfData,
            totalEvents: earthquakes.length
        };
    }

    /**
     * Get magnitude scale description
     */
    _getMagnitudeScale(magnitude) {
        for (const [scale, range] of Object.entries(this.magnitudeScales)) {
            if (magnitude >= range.min && magnitude <= range.max) {
                return scale;
            }
        }
        return 'unknown';
    }

    /**
     * Get alert level based on magnitude
     */
    _getAlertLevel(magnitude) {
        if (magnitude >= 8.0) return 'red';
        if (magnitude >= 7.0) return 'orange';
        if (magnitude >= 6.0) return 'yellow';
        if (magnitude >= 5.0) return 'green';
        return 'white';
    }

    /**
     * Check if query is for real-time data
     */
    _isRealtimeQuery(query) {
        if (!query.starttime) return true;
        
        const startDate = new Date(query.starttime);
        const daysSinceStart = (Date.now() - startDate.getTime()) / (1000 * 60 * 60 * 24);
        
        return daysSinceStart <= 7; // Consider last 7 days as real-time
    }

    /**
     * Get default start date (30 days ago)
     */
    _getDefaultStartDate() {
        return this._getRelativeDate(-30);
    }

    /**
     * Get date relative to today
     */
    _getRelativeDate(days) {
        const date = new Date();
        date.setDate(date.getDate() + days);
        return date.toISOString().split('T')[0];
    }

    /**
     * Get bounding box for common regions
     */
    _getRegionBounds(region) {
        const regions = {
            california: {
                minlatitude: 32.0,
                minlongitude: -125.0,
                maxlatitude: 42.0,
                maxlongitude: -114.0
            },
            alaska: {
                minlatitude: 54.0,
                minlongitude: -180.0,
                maxlatitude: 72.0,
                maxlongitude: -129.0
            },
            pacific_ring: {
                minlatitude: -60.0,
                minlongitude: 100.0,
                maxlatitude: 60.0,
                maxlongitude: -60.0
            }
        };
        
        return regions[region.toLowerCase()] || {};
    }

    /**
     * Update request statistics
     */
    _updateStats(success, responseTime) {
        this.stats.totalRequests++;
        
        if (success) {
            this.stats.successfulRequests++;
        } else {
            this.stats.errorRequests++;
        }
        
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
        return `usgs_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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
            errorRequests: 0,
            cacheHits: 0,
            averageResponseTime: 0
        };
    }

    /**
     * Test connection to USGS API
     */
    async testConnection() {
        try {
            const testQuery = {
                format: 'geojson',
                minmagnitude: 6.0,
                starttime: this._getRelativeDate(-7),
                limit: 1
            };
            
            const response = await this.getEarthquakeData(testQuery);
            
            return {
                success: true,
                message: 'USGS API connection successful',
                responseTime: this.stats.averageResponseTime,
                eventCount: response.earthquakes.length
            };
            
        } catch (error) {
            return {
                success: false,
                message: `USGS API connection failed: ${error.message}`,
                error: error.message
            };
        }
    }
}

module.exports = USGSClient;