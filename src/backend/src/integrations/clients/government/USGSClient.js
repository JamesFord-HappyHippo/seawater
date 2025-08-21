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
            waterServices: 'https://waterservices.usgs.gov/nwis',
            waterDataAPI: 'https://api.waterdata.usgs.gov',
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
            water_realtime: 900, // 15 minutes for real-time water data
            water_daily: 7200, // 2 hours for daily water data
            water_historical: 86400, // 1 day for historical water data
            site_data: 604800, // 1 week for static site information
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

        // USGS Water Services parameter codes
        this.waterParameterCodes = {
            streamflow: '00060', // Discharge, cubic feet per second
            gageHeight: '00065', // Gage height, feet
            temperature: '00010', // Temperature, water, degrees Celsius
            precipitation: '00045', // Precipitation, total, inches
            groundwaterLevel: '72019', // Depth to water level, feet below land surface
            turbidity: '63680', // Turbidity, water, unfiltered, monochrome
            dissolvedOxygen: '00300', // Dissolved oxygen, water, unfiltered, milligrams per liter
            ph: '00400', // pH, water, unfiltered, field, standard units
            specificConductance: '00095' // Specific conductance, water, unfiltered, microsiemens per centimeter
        };

        // Flood stage risk levels based on gage height percentiles
        this.floodRiskLevels = {
            normal: { percentile: { min: 0, max: 75 }, level: 'low' },
            elevated: { percentile: { min: 75, max: 90 }, level: 'moderate' },
            minor: { percentile: { min: 90, max: 95 }, level: 'high' },
            moderate: { percentile: { min: 95, max: 98 }, level: 'very_high' },
            major: { percentile: { min: 98, max: 100 }, level: 'extreme' }
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

    // ============================================
    // WATER MONITORING METHODS
    // ============================================

    /**
     * Find nearby USGS water monitoring sites
     */
    async getNearbyWaterSites(latitude, longitude, options = {}) {
        const requestId = this._generateRequestId();
        const startTime = Date.now();
        
        try {
            const cacheKey = `usgs:water:sites:${latitude}:${longitude}:${options.radiusKm || 50}`;
            
            // Check cache first
            if (this.cacheManager) {
                const cached = await this.cacheManager.get(cacheKey);
                if (cached) {
                    this.stats.cacheHits++;
                    this.emit('cacheHit', { requestId, cacheKey });
                    return cached;
                }
            }

            const params = {
                format: 'json',
                lat: latitude,
                lon: longitude,
                within: options.radiusKm || 50, // kilometers
                hasDataTypeCd: 'iv', // Instantaneous values
                siteOutput: 'expanded',
                seriesCatalogOutput: true
            };

            // Add parameter filter if specified
            if (options.parameters) {
                params.parameterCd = Array.isArray(options.parameters) 
                    ? options.parameters.join(',') 
                    : options.parameters;
            } else {
                // Default to streamflow and gage height
                params.parameterCd = [
                    this.waterParameterCodes.streamflow, 
                    this.waterParameterCodes.gageHeight
                ].join(',');
            }

            const url = this._buildWaterUrl('/site/', params);
            console.log(`[${requestId}] Fetching nearby USGS water sites: ${url}`);

            const response = await this.httpClient.get(url, {
                timeout: this.config.timeout,
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'Seawater-Climate-Platform/1.0'
                }
            });

            const responseTime = Date.now() - startTime;
            this._updateStats(true, responseTime);

            const formattedSites = this._formatWaterSitesResponse(response.data, latitude, longitude);

            // Cache the response
            if (this.cacheManager) {
                await this.cacheManager.set(cacheKey, formattedSites, { 
                    ttl: this.cacheTTL.site_data 
                });
            }

            this.emit('dataFetched', {
                requestId,
                endpoint: 'water_sites',
                responseTime,
                siteCount: formattedSites.sites.length
            });

            return formattedSites;

        } catch (error) {
            const responseTime = Date.now() - startTime;
            this._updateStats(false, responseTime);
            
            this.emit('requestError', {
                requestId,
                endpoint: 'water_sites',
                error: error.message,
                responseTime
            });
            
            throw new Error(`USGS water sites lookup failed: ${error.message}`);
        }
    }

    /**
     * Get real-time water data for specific sites
     */
    async getRealtimeWaterData(siteNumbers, options = {}) {
        const requestId = this._generateRequestId();
        const startTime = Date.now();
        
        try {
            const sitesArray = Array.isArray(siteNumbers) ? siteNumbers : [siteNumbers];
            const cacheKey = `usgs:water:realtime:${sitesArray.join(',')}:${options.parameters || 'default'}`;
            
            // Check cache first
            if (this.cacheManager) {
                const cached = await this.cacheManager.get(cacheKey);
                if (cached) {
                    this.stats.cacheHits++;
                    this.emit('cacheHit', { requestId, cacheKey });
                    return cached;
                }
            }

            const params = {
                format: 'json',
                sites: sitesArray.join(','),
                siteStatus: 'active'
            };

            // Add parameter filter
            if (options.parameters) {
                params.parameterCd = Array.isArray(options.parameters) 
                    ? options.parameters.join(',') 
                    : options.parameters;
            } else {
                // Default parameters for flood monitoring
                params.parameterCd = [
                    this.waterParameterCodes.streamflow,
                    this.waterParameterCodes.gageHeight,
                    this.waterParameterCodes.temperature
                ].join(',');
            }

            // Add time period if specified
            if (options.period) {
                params.period = options.period; // e.g., P7D for last 7 days
            }

            const url = this._buildWaterUrl('/iv/', params);
            console.log(`[${requestId}] Fetching real-time USGS water data: ${url}`);

            const response = await this.httpClient.get(url, {
                timeout: this.config.timeout,
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'Seawater-Climate-Platform/1.0'
                }
            });

            const responseTime = Date.now() - startTime;
            this._updateStats(true, responseTime);

            const formattedData = this._formatWaterDataResponse(response.data, 'realtime');

            // Cache for shorter time due to real-time nature
            if (this.cacheManager) {
                await this.cacheManager.set(cacheKey, formattedData, { 
                    ttl: this.cacheTTL.water_realtime 
                });
            }

            this.emit('dataFetched', {
                requestId,
                endpoint: 'water_realtime',
                responseTime,
                siteCount: formattedData.sites.length
            });

            return formattedData;

        } catch (error) {
            const responseTime = Date.now() - startTime;
            this._updateStats(false, responseTime);
            
            this.emit('requestError', {
                requestId,
                endpoint: 'water_realtime',
                error: error.message,
                responseTime
            });
            
            throw new Error(`USGS real-time water data request failed: ${error.message}`);
        }
    }

    /**
     * Get historical daily water data
     */
    async getHistoricalWaterData(siteNumbers, options = {}) {
        const requestId = this._generateRequestId();
        const startTime = Date.now();
        
        try {
            const sitesArray = Array.isArray(siteNumbers) ? siteNumbers : [siteNumbers];
            const startDate = options.startDate || this._getRelativeDate(-365); // Default to 1 year
            const endDate = options.endDate || new Date().toISOString().split('T')[0];
            
            const cacheKey = `usgs:water:daily:${sitesArray.join(',')}:${startDate}:${endDate}`;
            
            // Check cache first
            if (this.cacheManager) {
                const cached = await this.cacheManager.get(cacheKey);
                if (cached) {
                    this.stats.cacheHits++;
                    this.emit('cacheHit', { requestId, cacheKey });
                    return cached;
                }
            }

            const params = {
                format: 'json',
                sites: sitesArray.join(','),
                startDT: startDate,
                endDT: endDate,
                statCd: '00003' // Mean daily value
            };

            // Add parameter filter
            if (options.parameters) {
                params.parameterCd = Array.isArray(options.parameters) 
                    ? options.parameters.join(',') 
                    : options.parameters;
            } else {
                params.parameterCd = [
                    this.waterParameterCodes.streamflow,
                    this.waterParameterCodes.gageHeight
                ].join(',');
            }

            const url = this._buildWaterUrl('/dv/', params);
            console.log(`[${requestId}] Fetching historical USGS water data: ${url}`);

            const response = await this.httpClient.get(url, {
                timeout: this.config.timeout,
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'Seawater-Climate-Platform/1.0'
                }
            });

            const responseTime = Date.now() - startTime;
            this._updateStats(true, responseTime);

            const formattedData = this._formatWaterDataResponse(response.data, 'historical');

            // Cache for longer time due to historical nature
            if (this.cacheManager) {
                await this.cacheManager.set(cacheKey, formattedData, { 
                    ttl: this.cacheTTL.water_historical 
                });
            }

            this.emit('dataFetched', {
                requestId,
                endpoint: 'water_historical',
                responseTime,
                siteCount: formattedData.sites.length
            });

            return formattedData;

        } catch (error) {
            const responseTime = Date.now() - startTime;
            this._updateStats(false, responseTime);
            
            this.emit('requestError', {
                requestId,
                endpoint: 'water_historical',
                error: error.message,
                responseTime
            });
            
            throw new Error(`USGS historical water data request failed: ${error.message}`);
        }
    }

    /**
     * Get flood risk assessment for a location using water data
     */
    async getFloodRiskAssessment(latitude, longitude, options = {}) {
        try {
            console.log(`Getting flood risk assessment for coordinates: ${latitude}, ${longitude}`);

            // Find nearby water monitoring sites
            const nearbySites = await this.getNearbyWaterSites(latitude, longitude, {
                radiusKm: options.radiusKm || 25,
                parameters: [
                    this.waterParameterCodes.streamflow,
                    this.waterParameterCodes.gageHeight
                ]
            });

            if (nearbySites.sites.length === 0) {
                return {
                    location: { latitude, longitude },
                    floodRisk: {
                        riskLevel: 'unknown',
                        riskScore: null,
                        confidence: 'low',
                        reason: 'No nearby USGS monitoring sites found'
                    },
                    nearestSite: null,
                    dataSource: 'USGS_Water',
                    generatedAt: new Date().toISOString()
                };
            }

            // Get current and historical data for the closest sites
            const primarySites = nearbySites.sites.slice(0, 3); // Use top 3 closest sites
            const siteNumbers = primarySites.map(site => site.siteNumber);

            const [currentData, historicalData] = await Promise.all([
                this.getRealtimeWaterData(siteNumbers, { period: 'P7D' }),
                this.getHistoricalWaterData(siteNumbers, { 
                    startDate: this._getRelativeDate(-365 * 5), // 5 years
                    endDate: new Date().toISOString().split('T')[0] 
                })
            ]);

            // Calculate flood risk assessment
            const riskAssessment = this._calculateFloodRisk(
                currentData.sites, 
                historicalData.sites, 
                latitude, 
                longitude,
                options
            );

            return {
                location: { latitude, longitude },
                floodRisk: riskAssessment,
                monitoringSites: {
                    total: nearbySites.sites.length,
                    analyzed: primarySites.length,
                    nearest: nearbySites.sites[0]
                },
                dataSource: 'USGS_Water',
                generatedAt: new Date().toISOString()
            };

        } catch (error) {
            throw new Error(`USGS flood risk assessment failed: ${error.message}`);
        }
    }

    /**
     * Get water quality data for environmental risk assessment
     */
    async getWaterQualityData(siteNumbers, options = {}) {
        const requestId = this._generateRequestId();
        const startTime = Date.now();
        
        try {
            const sitesArray = Array.isArray(siteNumbers) ? siteNumbers : [siteNumbers];
            const cacheKey = `usgs:water:quality:${sitesArray.join(',')}`;
            
            // Check cache first
            if (this.cacheManager) {
                const cached = await this.cacheManager.get(cacheKey);
                if (cached) {
                    this.stats.cacheHits++;
                    this.emit('cacheHit', { requestId, cacheKey });
                    return cached;
                }
            }

            const params = {
                format: 'json',
                sites: sitesArray.join(','),
                parameterCd: [
                    this.waterParameterCodes.temperature,
                    this.waterParameterCodes.dissolvedOxygen,
                    this.waterParameterCodes.ph,
                    this.waterParameterCodes.turbidity,
                    this.waterParameterCodes.specificConductance
                ].join(','),
                period: options.period || 'P30D' // Last 30 days
            };

            const url = this._buildWaterUrl('/iv/', params);
            console.log(`[${requestId}] Fetching USGS water quality data: ${url}`);

            const response = await this.httpClient.get(url, {
                timeout: this.config.timeout,
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'Seawater-Climate-Platform/1.0'
                }
            });

            const responseTime = Date.now() - startTime;
            this._updateStats(true, responseTime);

            const formattedData = this._formatWaterQualityResponse(response.data);

            // Cache for moderate time
            if (this.cacheManager) {
                await this.cacheManager.set(cacheKey, formattedData, { 
                    ttl: this.cacheTTL.water_daily 
                });
            }

            this.emit('dataFetched', {
                requestId,
                endpoint: 'water_quality',
                responseTime,
                siteCount: formattedData.sites.length
            });

            return formattedData;

        } catch (error) {
            const responseTime = Date.now() - startTime;
            this._updateStats(false, responseTime);
            
            this.emit('requestError', {
                requestId,
                endpoint: 'water_quality',
                error: error.message,
                responseTime
            });
            
            throw new Error(`USGS water quality data request failed: ${error.message}`);
        }
    }

    /**
     * Get real-time water alerts for a location
     */
    async getWaterAlerts(latitude, longitude, options = {}) {
        const requestId = this._generateRequestId();
        const startTime = Date.now();
        
        try {
            console.log(`[${requestId}] Getting water alerts for location: ${latitude}, ${longitude}`);
            
            // Get current water conditions
            const waterAssessment = await this.getFloodRiskAssessment(latitude, longitude, {
                radiusKm: options.radiusKm || 50
            });
            
            if (!waterAssessment.floodRisk || waterAssessment.floodRisk.riskLevel === 'unknown') {
                return {
                    alerts: [],
                    alertLevel: 'none',
                    location: { latitude, longitude },
                    message: 'No water monitoring data available for this location',
                    generatedAt: new Date().toISOString(),
                    dataSource: 'USGS_Water'
                };
            }
            
            const alerts = [];
            const floodRisk = waterAssessment.floodRisk;
            
            // Generate alerts based on risk level and conditions
            if (floodRisk.riskLevel === 'very_high' || floodRisk.riskLevel === 'extreme') {
                alerts.push({
                    type: 'flood_warning',
                    severity: 'high',
                    title: 'High Flood Risk Detected',
                    message: `Current water levels are at ${floodRisk.riskScore}% of historical maximum. Immediate attention recommended.`,
                    affected_sites: floodRisk.siteAssessments?.filter(s => s.riskScore >= 75).map(s => s.siteName) || [],
                    recommendations: [
                        'Monitor local flood warnings and evacuation notices',
                        'Avoid low-lying areas and flood-prone roads',
                        'Prepare emergency supplies and evacuation plan'
                    ]
                });
            } else if (floodRisk.riskLevel === 'high') {
                alerts.push({
                    type: 'flood_watch',
                    severity: 'medium',
                    title: 'Elevated Flood Risk',
                    message: `Water levels are elevated above normal ranges. Continue monitoring conditions.`,
                    affected_sites: floodRisk.siteAssessments?.filter(s => s.riskScore >= 60).map(s => s.siteName) || [],
                    recommendations: [
                        'Stay informed about local weather conditions',
                        'Avoid unnecessary travel in flood-prone areas',
                        'Review emergency preparedness plans'
                    ]
                });
            }
            
            // Check for specific site conditions
            if (floodRisk.siteAssessments) {
                floodRisk.siteAssessments.forEach(site => {
                    if (site.currentValues?.streamflow && site.hasHistoricalComparison) {
                        // Check for extremely high streamflow
                        if (site.riskScore >= 90) {
                            alerts.push({
                                type: 'streamflow_critical',
                                severity: 'critical',
                                title: `Critical Streamflow at ${site.siteName}`,
                                message: `Streamflow of ${site.currentValues.streamflow} cfs is at extreme levels`,
                                site_details: {
                                    site_number: site.siteNumber,
                                    site_name: site.siteName,
                                    distance_km: site.distanceKm,
                                    current_streamflow: site.currentValues.streamflow,
                                    current_gage_height: site.currentValues.gageHeight
                                }
                            });
                        }
                    }
                });
            }
            
            // Determine overall alert level
            let alertLevel = 'none';
            if (alerts.some(a => a.severity === 'critical')) alertLevel = 'critical';
            else if (alerts.some(a => a.severity === 'high')) alertLevel = 'high';
            else if (alerts.some(a => a.severity === 'medium')) alertLevel = 'medium';
            else if (alerts.length > 0) alertLevel = 'low';
            
            const responseTime = Date.now() - startTime;
            this._updateStats(true, responseTime);
            
            this.emit('waterAlerts', {
                requestId,
                alertLevel,
                alertCount: alerts.length,
                location: { latitude, longitude },
                responseTime
            });
            
            return {
                alerts,
                alertLevel,
                location: { latitude, longitude },
                monitoringSummary: {
                    sitesMonitored: waterAssessment.monitoringSites?.total || 0,
                    nearestSiteDistance: waterAssessment.monitoringSites?.nearest?.location?.distanceKm || null,
                    dataQuality: floodRisk.confidence
                },
                floodRiskSummary: {
                    riskLevel: floodRisk.riskLevel,
                    riskScore: floodRisk.riskScore,
                    confidence: floodRisk.confidence
                },
                generatedAt: new Date().toISOString(),
                dataSource: 'USGS_Water'
            };
            
        } catch (error) {
            const responseTime = Date.now() - startTime;
            this._updateStats(false, responseTime);
            
            this.emit('requestError', {
                requestId,
                endpoint: 'water_alerts',
                error: error.message,
                responseTime
            });
            
            throw new Error(`USGS water alerts failed: ${error.message}`);
        }
    }

    /**
     * Monitor multiple locations for water alerts
     */
    async monitorWaterAlerts(locations, options = {}) {
        const requestId = this._generateRequestId();
        
        try {
            console.log(`[${requestId}] Monitoring water alerts for ${locations.length} locations`);
            
            const alertPromises = locations.map(location => 
                this.getWaterAlerts(location.latitude, location.longitude, {
                    ...options,
                    locationId: location.id || `${location.latitude}_${location.longitude}`
                })
            );
            
            const results = await Promise.allSettled(alertPromises);
            
            const alerts = [];
            const summary = {
                locationsMonitored: locations.length,
                locationsWithAlerts: 0,
                highestAlertLevel: 'none',
                totalAlerts: 0
            };
            
            results.forEach((result, index) => {
                if (result.status === 'fulfilled') {
                    const locationAlert = result.value;
                    const location = locations[index];
                    
                    if (locationAlert.alerts.length > 0) {
                        summary.locationsWithAlerts++;
                        summary.totalAlerts += locationAlert.alerts.length;
                        
                        // Update highest alert level
                        const alertLevels = ['none', 'low', 'medium', 'high', 'critical'];
                        const currentLevel = alertLevels.indexOf(locationAlert.alertLevel);
                        const highestLevel = alertLevels.indexOf(summary.highestAlertLevel);
                        
                        if (currentLevel > highestLevel) {
                            summary.highestAlertLevel = locationAlert.alertLevel;
                        }
                        
                        alerts.push({
                            locationId: location.id || `${location.latitude}_${location.longitude}`,
                            locationName: location.name || `${location.latitude}, ${location.longitude}`,
                            ...locationAlert
                        });
                    }
                } else {
                    console.error(`Failed to get alerts for location ${index}:`, result.reason);
                }
            });
            
            this.emit('multiLocationAlerts', {
                requestId,
                summary,
                alertCount: alerts.length,
                generatedAt: new Date().toISOString()
            });
            
            return {
                alerts,
                summary,
                generatedAt: new Date().toISOString(),
                dataSource: 'USGS_Water'
            };
            
        } catch (error) {
            this.emit('requestError', {
                requestId,
                endpoint: 'water_alerts_multi',
                error: error.message
            });
            
            throw new Error(`USGS multi-location water monitoring failed: ${error.message}`);
        }
    }

    // ============================================
    // WATER DATA HELPER METHODS
    // ============================================

    /**
     * Build water services API URL
     */
    _buildWaterUrl(endpoint, params) {
        const url = new URL(`${this.endpoints.waterServices}${endpoint}`);
        
        // Add query parameters
        for (const [key, value] of Object.entries(params)) {
            if (value !== undefined && value !== null) {
                url.searchParams.append(key, value);
            }
        }
        
        return url.toString();
    }

    /**
     * Format water sites response
     */
    _formatWaterSitesResponse(data, queryLat, queryLon) {
        if (!data || !data.value || !data.value.timeSeries) {
            return {
                sites: [],
                metadata: {
                    count: 0,
                    queryLocation: { latitude: queryLat, longitude: queryLon }
                }
            };
        }

        // Group data by site
        const siteMap = new Map();
        
        data.value.timeSeries.forEach(series => {
            const sourceInfo = series.sourceInfo;
            const siteNumber = sourceInfo.siteCode[0].value;
            
            if (!siteMap.has(siteNumber)) {
                const lat = parseFloat(sourceInfo.geoLocation.geogLocation.latitude);
                const lon = parseFloat(sourceInfo.geoLocation.geogLocation.longitude);
                const distance = this._calculateDistance(queryLat, queryLon, lat, lon) / 1000; // km
                
                siteMap.set(siteNumber, {
                    siteNumber,
                    siteName: sourceInfo.siteName,
                    location: {
                        latitude: lat,
                        longitude: lon,
                        distanceKm: Math.round(distance * 10) / 10
                    },
                    siteType: sourceInfo.siteProperty?.find(p => p.name === 'siteTypeCd')?.value || 'unknown',
                    drainageArea: sourceInfo.siteProperty?.find(p => p.name === 'drainageAreaVa')?.value || null,
                    parameters: [],
                    status: 'active'
                });
            }
            
            // Add parameter information
            const variable = series.variable;
            const site = siteMap.get(siteNumber);
            site.parameters.push({
                parameterCode: variable.variableCode[0].value,
                parameterName: variable.variableName,
                unit: variable.unit.unitCode,
                description: variable.variableDescription
            });
        });

        // Convert to array and sort by distance
        const sites = Array.from(siteMap.values()).sort((a, b) => 
            a.location.distanceKm - b.location.distanceKm
        );

        return {
            sites,
            metadata: {
                count: sites.length,
                queryLocation: { latitude: queryLat, longitude: queryLon },
                searchRadius: 50 // Default radius
            }
        };
    }

    /**
     * Format water data response (real-time or historical)
     */
    _formatWaterDataResponse(data, dataType) {
        if (!data || !data.value || !data.value.timeSeries) {
            return {
                sites: [],
                metadata: {
                    count: 0,
                    dataType
                }
            };
        }

        // Group data by site
        const siteMap = new Map();
        
        data.value.timeSeries.forEach(series => {
            const sourceInfo = series.sourceInfo;
            const siteNumber = sourceInfo.siteCode[0].value;
            const variable = series.variable;
            const parameterCode = variable.variableCode[0].value;
            
            if (!siteMap.has(siteNumber)) {
                siteMap.set(siteNumber, {
                    siteNumber,
                    siteName: sourceInfo.siteName,
                    location: {
                        latitude: parseFloat(sourceInfo.geoLocation.geogLocation.latitude),
                        longitude: parseFloat(sourceInfo.geoLocation.geogLocation.longitude)
                    },
                    measurements: new Map()
                });
            }
            
            const site = siteMap.get(siteNumber);
            
            // Process measurement values
            const values = series.values[0].value || [];
            const processedValues = values.map(v => ({
                dateTime: v.dateTime,
                value: parseFloat(v.value),
                qualifiers: v.qualifiers || []
            })).filter(v => !isNaN(v.value));
            
            site.measurements.set(parameterCode, {
                parameterCode,
                parameterName: variable.variableName,
                unit: variable.unit.unitCode,
                values: processedValues,
                latestValue: processedValues.length > 0 ? processedValues[processedValues.length - 1] : null,
                statistics: this._calculateWaterDataStatistics(processedValues)
            });
        });

        // Convert measurements Map to object for each site
        const sites = Array.from(siteMap.values()).map(site => ({
            ...site,
            measurements: Object.fromEntries(site.measurements)
        }));

        return {
            sites,
            metadata: {
                count: sites.length,
                dataType,
                generatedAt: new Date().toISOString()
            }
        };
    }

    /**
     * Format water quality response
     */
    _formatWaterQualityResponse(data) {
        const formattedData = this._formatWaterDataResponse(data, 'water_quality');
        
        // Add water quality assessments
        formattedData.sites.forEach(site => {
            site.waterQualityAssessment = this._assessWaterQuality(site.measurements);
        });
        
        return formattedData;
    }

    /**
     * Calculate basic statistics for water data
     */
    _calculateWaterDataStatistics(values) {
        if (!values || values.length === 0) {
            return {
                count: 0,
                min: null,
                max: null,
                mean: null,
                median: null
            };
        }

        const numericValues = values.map(v => v.value).sort((a, b) => a - b);
        const count = numericValues.length;
        const sum = numericValues.reduce((a, b) => a + b, 0);
        const mean = sum / count;
        const median = count % 2 === 0 
            ? (numericValues[count/2 - 1] + numericValues[count/2]) / 2
            : numericValues[Math.floor(count/2)];

        return {
            count,
            min: numericValues[0],
            max: numericValues[count - 1],
            mean: Math.round(mean * 100) / 100,
            median: Math.round(median * 100) / 100
        };
    }

    /**
     * Calculate flood risk based on current and historical water data
     */
    _calculateFloodRisk(currentSites, historicalSites, latitude, longitude, options = {}) {
        if (!currentSites || currentSites.length === 0) {
            return {
                riskLevel: 'unknown',
                riskScore: null,
                confidence: 'low',
                reason: 'No current water data available'
            };
        }

        let totalRiskScore = 0;
        let siteCount = 0;
        const assessments = [];

        currentSites.forEach(currentSite => {
            const historicalSite = historicalSites?.find(h => h.siteNumber === currentSite.siteNumber);
            const siteAssessment = this._assessSiteFloodRisk(currentSite, historicalSite);
            
            if (siteAssessment.riskScore !== null) {
                totalRiskScore += siteAssessment.riskScore;
                siteCount++;
                assessments.push(siteAssessment);
            }
        });

        if (siteCount === 0) {
            return {
                riskLevel: 'unknown',
                riskScore: null,
                confidence: 'low',
                reason: 'No valid flood assessment data available'
            };
        }

        const averageRiskScore = totalRiskScore / siteCount;
        const riskLevel = this._getRiskLevelFromScore(averageRiskScore);
        const confidence = this._calculateFloodRiskConfidence(assessments, siteCount);

        return {
            riskLevel,
            riskScore: Math.round(averageRiskScore),
            confidence,
            siteAssessments: assessments,
            factors: {
                sitesAnalyzed: siteCount,
                hasHistoricalData: assessments.some(a => a.hasHistoricalComparison),
                nearestSiteDistance: Math.min(...assessments.map(a => a.distanceKm || Infinity))
            }
        };
    }

    /**
     * Assess flood risk for individual site
     */
    _assessSiteFloodRisk(currentSite, historicalSite) {
        const streamflow = currentSite.measurements[this.waterParameterCodes.streamflow];
        const gageHeight = currentSite.measurements[this.waterParameterCodes.gageHeight];
        
        if (!streamflow && !gageHeight) {
            return {
                siteNumber: currentSite.siteNumber,
                riskScore: null,
                reason: 'No streamflow or gage height data available'
            };
        }

        let riskScore = 0;
        const factors = [];

        // Assess current levels against historical percentiles
        if (streamflow && historicalSite) {
            const historicalStreamflow = historicalSite.measurements[this.waterParameterCodes.streamflow];
            if (historicalStreamflow) {
                const currentFlow = streamflow.latestValue?.value;
                const percentile = this._calculatePercentile(currentFlow, 
                    historicalStreamflow.values.map(v => v.value));
                
                riskScore += this._getFloodRiskFromPercentile(percentile);
                factors.push(`Streamflow at ${Math.round(percentile)}th percentile`);
            }
        }

        // Assess gage height if available
        if (gageHeight && historicalSite) {
            const historicalGageHeight = historicalSite.measurements[this.waterParameterCodes.gageHeight];
            if (historicalGageHeight) {
                const currentHeight = gageHeight.latestValue?.value;
                const percentile = this._calculatePercentile(currentHeight, 
                    historicalGageHeight.values.map(v => v.value));
                
                riskScore += this._getFloodRiskFromPercentile(percentile);
                factors.push(`Gage height at ${Math.round(percentile)}th percentile`);
            }
        }

        // Average if we have multiple factors
        if (factors.length > 1) {
            riskScore = riskScore / factors.length;
        }

        return {
            siteNumber: currentSite.siteNumber,
            siteName: currentSite.siteName,
            riskScore: Math.round(riskScore),
            hasHistoricalComparison: !!historicalSite,
            factors,
            currentValues: {
                streamflow: streamflow?.latestValue?.value || null,
                gageHeight: gageHeight?.latestValue?.value || null
            }
        };
    }

    /**
     * Calculate percentile for current value against historical data
     */
    _calculatePercentile(currentValue, historicalValues) {
        if (!currentValue || !historicalValues || historicalValues.length === 0) {
            return 50; // Default to median if no data
        }

        const sortedValues = historicalValues.filter(v => !isNaN(v)).sort((a, b) => a - b);
        const belowCount = sortedValues.filter(v => v < currentValue).length;
        
        return (belowCount / sortedValues.length) * 100;
    }

    /**
     * Get flood risk score from percentile
     */
    _getFloodRiskFromPercentile(percentile) {
        if (percentile >= 98) return 90; // Extreme
        if (percentile >= 95) return 75; // Very High
        if (percentile >= 90) return 60; // High
        if (percentile >= 75) return 40; // Moderate
        return 20; // Low/Normal
    }

    /**
     * Calculate confidence level for flood risk assessment
     */
    _calculateFloodRiskConfidence(assessments, siteCount) {
        const hasHistoricalData = assessments.filter(a => a.hasHistoricalComparison).length;
        const historicalRatio = hasHistoricalData / siteCount;
        
        if (siteCount >= 3 && historicalRatio >= 0.7) return 'high';
        if (siteCount >= 2 && historicalRatio >= 0.5) return 'medium';
        return 'low';
    }

    /**
     * Assess water quality from measurements
     */
    _assessWaterQuality(measurements) {
        const assessment = {
            overall: 'good',
            factors: [],
            concerns: []
        };

        // Check temperature
        const temp = measurements[this.waterParameterCodes.temperature];
        if (temp && temp.latestValue) {
            const tempC = temp.latestValue.value;
            if (tempC > 25) {
                assessment.factors.push('elevated temperature');
                if (tempC > 30) assessment.concerns.push('High water temperature may stress aquatic life');
            }
        }

        // Check dissolved oxygen
        const do_ = measurements[this.waterParameterCodes.dissolvedOxygen];
        if (do_ && do_.latestValue) {
            const doValue = do_.latestValue.value;
            if (doValue < 5) {
                assessment.overall = 'poor';
                assessment.concerns.push('Low dissolved oxygen levels');
            } else if (doValue < 7) {
                assessment.overall = 'fair';
                assessment.factors.push('moderate dissolved oxygen');
            }
        }

        // Check pH
        const ph = measurements[this.waterParameterCodes.ph];
        if (ph && ph.latestValue) {
            const phValue = ph.latestValue.value;
            if (phValue < 6.5 || phValue > 8.5) {
                assessment.overall = 'poor';
                assessment.concerns.push('pH outside normal range');
            }
        }

        return assessment;
    }

    /**
     * Get risk level from numeric score
     */
    _getRiskLevelFromScore(score) {
        if (score >= 80) return 'very_high';
        if (score >= 60) return 'high';
        if (score >= 40) return 'moderate';
        if (score >= 20) return 'low';
        return 'very_low';
    }

    /**
     * Calculate distance between two points (Haversine formula)
     */
    _calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371000; // Earth's radius in meters
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
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
     * Test connection to USGS APIs (both earthquake and water services)
     */
    async testConnection() {
        const results = {
            earthquake: { success: false },
            water: { success: false },
            overall: { success: false }
        };
        
        try {
            // Test earthquake API
            const testEarthquakeQuery = {
                format: 'geojson',
                minmagnitude: 6.0,
                starttime: this._getRelativeDate(-7),
                limit: 1
            };
            
            const earthquakeResponse = await this.getEarthquakeData(testEarthquakeQuery);
            results.earthquake = {
                success: true,
                message: 'USGS Earthquake API connection successful',
                eventCount: earthquakeResponse.earthquakes.length
            };
            
        } catch (error) {
            results.earthquake = {
                success: false,
                message: `USGS Earthquake API failed: ${error.message}`,
                error: error.message
            };
        }
        
        try {
            // Test water services API - try to get sites near a known location (Washington DC)
            const testWaterSites = await this.getNearbyWaterSites(38.9072, -77.0369, {
                radiusKm: 50
            });
            
            results.water = {
                success: true,
                message: 'USGS Water Services API connection successful',
                siteCount: testWaterSites.sites.length
            };
            
        } catch (error) {
            results.water = {
                success: false,
                message: `USGS Water Services API failed: ${error.message}`,
                error: error.message
            };
        }
        
        // Overall success if at least one service works
        results.overall = {
            success: results.earthquake.success || results.water.success,
            message: results.earthquake.success && results.water.success 
                ? 'All USGS APIs connected successfully'
                : results.earthquake.success || results.water.success
                ? 'Partial USGS API connectivity'
                : 'All USGS API connections failed',
            responseTime: Math.round(this.stats.averageResponseTime),
            services: results
        };
        
        return results.overall;
    }
}

module.exports = USGSClient;