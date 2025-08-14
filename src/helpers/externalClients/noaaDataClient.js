// noaaDataClient.js - Seawater Climate Risk Platform
// NOAA Climate Data Online API client following Tim-Combo patterns

const { HttpClient } = require('../httpClient');
const { DataSourceError, RateLimitError } = require('../errorHandler');
const { getCachedResponse, setCachedResponse } = require('../cacheManager');

/**
 * NOAA Climate Data Online Client
 * Provides access to historical weather and climate data
 */
class NoaaDataClient {
    constructor(config = {}) {
        this.client = new HttpClient({
            baseURL: config.baseURL || 'https://www.ncdc.noaa.gov/cdo-web/api/v2',
            timeout: config.timeout || 30000,
            userAgent: 'Seawater-Climate-Risk/1.0',
            retryConfig: { retries: 3, retryDelay: 2000 },
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'token': config.apiToken || process.env.NOAA_API_TOKEN || ''
            }
        });

        this.rateLimit = {
            hourly: 1000,
            perSecond: 5,
            lastRequestTime: 0
        };

        this.dataSource = 'NOAA_Climate_Data_Online';
    }

    /**
     * Get historical weather extremes for coordinates
     */
    async getHistoricalExtremes(latitude, longitude, years = 30) {
        try {
            await this.checkRateLimit();

            const cacheKey = `noaa_extremes_${latitude}_${longitude}_${years}`;
            
            // Check cache first (12 hour TTL for historical data)
            try {
                const cached = await getCachedResponse(cacheKey);
                if (cached) {
                    console.log('NOAA extremes data cache hit:', { latitude, longitude });
                    return {
                        success: true,
                        data: cached.data,
                        source: this.dataSource,
                        cached: true,
                        timestamp: cached.timestamp
                    };
                }
            } catch (cacheError) {
                console.warn('NOAA extremes cache lookup failed:', cacheError.message);
            }

            console.log('Fetching NOAA historical extremes:', { latitude, longitude, years });

            // Find nearest weather station
            const station = await this.findNearestStation(latitude, longitude);
            if (!station) {
                throw new DataSourceError(
                    'No NOAA weather stations found near location',
                    this.dataSource,
                    404
                );
            }

            // Get historical temperature and precipitation extremes
            const endDate = new Date().toISOString().split('T')[0];
            const startDate = new Date(Date.now() - (years * 365 * 24 * 60 * 60 * 1000))
                .toISOString().split('T')[0];

            const extremesData = await this.getWeatherExtremes(station.id, startDate, endDate);
            
            const processedData = this.processExtremesData(extremesData, latitude, longitude, years);

            // Cache the response
            try {
                await setCachedResponse(cacheKey, {
                    data: processedData,
                    timestamp: new Date().toISOString(),
                    source: this.dataSource
                }, 43200); // 12 hours
            } catch (cacheError) {
                console.warn('Failed to cache NOAA extremes response:', cacheError.message);
            }

            console.log('NOAA extremes data retrieved successfully:', {
                latitude,
                longitude,
                stationUsed: station.name,
                dataYears: years
            });

            return {
                success: true,
                data: processedData,
                source: this.dataSource,
                cached: false,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            console.error('NOAA extremes API error:', {
                error: error.message,
                latitude,
                longitude,
                source: this.dataSource
            });

            if (error.status === 429) {
                throw new RateLimitError(
                    'NOAA API rate limit exceeded',
                    this.dataSource,
                    new Date(Date.now() + 3600000).toISOString() // 1 hour
                );
            }

            throw new DataSourceError(
                `NOAA API error: ${error.message}`,
                this.dataSource,
                error.status || null
            );
        }
    }

    /**
     * Get climate normals for location
     */
    async getClimateNormals(latitude, longitude) {
        try {
            await this.checkRateLimit();

            const cacheKey = `noaa_normals_${latitude}_${longitude}`;
            
            try {
                const cached = await getCachedResponse(cacheKey);
                if (cached) {
                    return {
                        success: true,
                        data: cached.data,
                        source: this.dataSource,
                        cached: true
                    };
                }
            } catch (cacheError) {
                console.warn('NOAA normals cache lookup failed:', cacheError.message);
            }

            console.log('Fetching NOAA climate normals:', { latitude, longitude });

            // Find nearest station
            const station = await this.findNearestStation(latitude, longitude);
            if (!station) {
                throw new DataSourceError(
                    'No NOAA weather stations found near location',
                    this.dataSource,
                    404
                );
            }

            // Get 30-year climate normals (1991-2020)
            const normalsData = await this.getStationNormals(station.id);
            const processedNormals = this.processNormalsData(normalsData, latitude, longitude);

            // Cache for 24 hours (normals change infrequently)
            try {
                await setCachedResponse(cacheKey, {
                    data: processedNormals,
                    timestamp: new Date().toISOString()
                }, 86400); // 24 hours
            } catch (cacheError) {
                console.warn('Failed to cache NOAA normals response:', cacheError.message);
            }

            return {
                success: true,
                data: processedNormals,
                source: this.dataSource,
                cached: false
            };

        } catch (error) {
            console.error('NOAA normals API error:', error);
            throw new DataSourceError(
                `NOAA normals API error: ${error.message}`,
                this.dataSource,
                error.status || null
            );
        }
    }

    /**
     * Get severe weather event history
     */
    async getSevereWeatherHistory(latitude, longitude, years = 20) {
        try {
            await this.checkRateLimit();

            const cacheKey = `noaa_severe_${latitude}_${longitude}_${years}`;
            
            try {
                const cached = await getCachedResponse(cacheKey);
                if (cached) {
                    return {
                        success: true,
                        data: cached.data,
                        source: this.dataSource,
                        cached: true
                    };
                }
            } catch (cacheError) {
                console.warn('NOAA severe weather cache lookup failed:', cacheError.message);
            }

            console.log('Fetching NOAA severe weather history:', { latitude, longitude, years });

            const endDate = new Date().toISOString().split('T')[0];
            const startDate = new Date(Date.now() - (years * 365 * 24 * 60 * 60 * 1000))
                .toISOString().split('T')[0];

            // Query for various severe weather event types
            const eventTypes = ['TORNADO', 'HAIL', 'THUNDERSTORM_WIND', 'FLASH_FLOOD', 'DROUGHT'];
            const severeEvents = await this.getSevereEvents(latitude, longitude, startDate, endDate, eventTypes);
            
            const processedEvents = this.processSevereWeatherData(severeEvents, years);

            // Cache for 6 hours
            try {
                await setCachedResponse(cacheKey, {
                    data: processedEvents,
                    timestamp: new Date().toISOString()
                }, 21600); // 6 hours
            } catch (cacheError) {
                console.warn('Failed to cache NOAA severe weather response:', cacheError.message);
            }

            return {
                success: true,
                data: processedEvents,
                source: this.dataSource,
                cached: false
            };

        } catch (error) {
            console.error('NOAA severe weather API error:', error);
            throw new DataSourceError(
                `NOAA severe weather API error: ${error.message}`,
                this.dataSource,
                error.status || null
            );
        }
    }

    /**
     * Find nearest NOAA weather station
     */
    async findNearestStation(latitude, longitude, radius = 50000) {
        const params = {
            extent: `${latitude - 0.5},${longitude - 0.5},${latitude + 0.5},${longitude + 0.5}`,
            limit: 10,
            sortfield: 'name',
            sortorder: 'asc'
        };

        const response = await this.client.get(
            `/stations${this.client.buildQueryString(params)}`,
            { source: this.dataSource }
        );

        if (!response.data || !response.data.results || response.data.results.length === 0) {
            return null;
        }

        // Find closest station by calculating distance
        let closestStation = null;
        let minDistance = Infinity;

        for (const station of response.data.results) {
            if (station.latitude && station.longitude) {
                const distance = this.calculateDistance(
                    latitude, longitude,
                    station.latitude, station.longitude
                );
                
                if (distance < minDistance && distance <= radius) {
                    minDistance = distance;
                    closestStation = {
                        id: station.id,
                        name: station.name,
                        latitude: station.latitude,
                        longitude: station.longitude,
                        distance: distance,
                        elevation: station.elevation
                    };
                }
            }
        }

        return closestStation;
    }

    /**
     * Get weather extremes for a station
     */
    async getWeatherExtremes(stationId, startDate, endDate) {
        const datatypes = [
            'TMAX', // Maximum temperature
            'TMIN', // Minimum temperature
            'PRCP', // Precipitation
            'SNOW', // Snowfall
            'SNWD'  // Snow depth
        ];

        const params = {
            datasetid: 'GHCND',
            stationid: stationId,
            datatypeid: datatypes.join(','),
            startdate: startDate,
            enddate: endDate,
            limit: 1000,
            units: 'metric'
        };

        const response = await this.client.get(
            `/data${this.client.buildQueryString(params)}`,
            { source: this.dataSource }
        );

        return response.data?.results || [];
    }

    /**
     * Get climate normals for a station
     */
    async getStationNormals(stationId) {
        const params = {
            datasetid: 'NORMAL_MLY',
            stationid: stationId,
            startdate: '2010-01-01',
            enddate: '2010-12-31',
            limit: 1000
        };

        const response = await this.client.get(
            `/data${this.client.buildQueryString(params)}`,
            { source: this.dataSource }
        );

        return response.data?.results || [];
    }

    /**
     * Get severe weather events near coordinates
     */
    async getSevereEvents(latitude, longitude, startDate, endDate, eventTypes) {
        // NOAA Storm Events API (if available) or estimate from weather data
        // For now, return placeholder structure
        return {
            events: [],
            total_events: 0,
            event_types: {}
        };
    }

    /**
     * Process weather extremes data
     */
    processExtremesData(data, latitude, longitude, years) {
        if (!data || data.length === 0) {
            return {
                temperature_extremes: {
                    max_temperature_c: null,
                    min_temperature_c: null,
                    avg_max_temp_c: null,
                    avg_min_temp_c: null
                },
                precipitation_extremes: {
                    max_daily_precipitation_mm: null,
                    avg_annual_precipitation_mm: null,
                    days_with_precipitation: null
                },
                heat_risk_indicators: {
                    days_above_35c: null,
                    heat_wave_frequency: null
                },
                cold_risk_indicators: {
                    days_below_0c: null,
                    extreme_cold_events: null
                },
                data_available: false,
                coordinates: { latitude, longitude },
                years_analyzed: years
            };
        }

        // Group data by type
        const tempMax = data.filter(d => d.datatype === 'TMAX').map(d => d.value / 10); // Convert to Celsius
        const tempMin = data.filter(d => d.datatype === 'TMIN').map(d => d.value / 10);
        const precipitation = data.filter(d => d.datatype === 'PRCP').map(d => d.value / 10); // Convert to mm

        return {
            temperature_extremes: {
                max_temperature_c: tempMax.length > 0 ? Math.max(...tempMax) : null,
                min_temperature_c: tempMin.length > 0 ? Math.min(...tempMin) : null,
                avg_max_temp_c: tempMax.length > 0 ? Math.round(tempMax.reduce((a, b) => a + b, 0) / tempMax.length) : null,
                avg_min_temp_c: tempMin.length > 0 ? Math.round(tempMin.reduce((a, b) => a + b, 0) / tempMin.length) : null
            },
            precipitation_extremes: {
                max_daily_precipitation_mm: precipitation.length > 0 ? Math.max(...precipitation) : null,
                avg_annual_precipitation_mm: precipitation.length > 0 ? 
                    Math.round((precipitation.reduce((a, b) => a + b, 0) / years)) : null,
                days_with_precipitation: precipitation.filter(p => p > 0).length
            },
            heat_risk_indicators: {
                days_above_35c: tempMax.filter(t => t > 35).length,
                heat_wave_frequency: this.calculateHeatWaveFrequency(tempMax)
            },
            cold_risk_indicators: {
                days_below_0c: tempMin.filter(t => t < 0).length,
                extreme_cold_events: tempMin.filter(t => t < -20).length
            },
            data_available: true,
            coordinates: { latitude, longitude },
            years_analyzed: years,
            data_points: data.length
        };
    }

    /**
     * Process climate normals data
     */
    processNormalsData(data, latitude, longitude) {
        if (!data || data.length === 0) {
            return {
                monthly_temperature_normals: {},
                monthly_precipitation_normals: {},
                growing_season: null,
                data_available: false,
                coordinates: { latitude, longitude }
            };
        }

        const tempNormals = {};
        const precipNormals = {};

        data.forEach(item => {
            const month = new Date(item.date).getMonth() + 1;
            
            if (item.datatype.includes('TAVG')) {
                tempNormals[month] = item.value / 10; // Convert to Celsius
            }
            
            if (item.datatype.includes('PRCP')) {
                precipNormals[month] = item.value / 10; // Convert to mm
            }
        });

        return {
            monthly_temperature_normals: tempNormals,
            monthly_precipitation_normals: precipNormals,
            growing_season: this.calculateGrowingSeason(tempNormals),
            data_available: Object.keys(tempNormals).length > 0,
            coordinates: { latitude, longitude },
            normal_period: '1991-2020'
        };
    }

    /**
     * Process severe weather data
     */
    processSevereWeatherData(data, years) {
        return {
            total_severe_events: data.total_events || 0,
            events_per_year: Math.round((data.total_events || 0) / years),
            event_types: data.event_types || {},
            tornado_risk: data.event_types?.TORNADO || 0,
            hail_risk: data.event_types?.HAIL || 0,
            severe_thunderstorm_risk: data.event_types?.THUNDERSTORM_WIND || 0,
            flash_flood_risk: data.event_types?.FLASH_FLOOD || 0,
            drought_episodes: data.event_types?.DROUGHT || 0,
            years_analyzed: years
        };
    }

    /**
     * Calculate heat wave frequency
     */
    calculateHeatWaveFrequency(temperatures) {
        let heatWaves = 0;
        let consecutiveHotDays = 0;
        
        temperatures.forEach(temp => {
            if (temp > 35) {
                consecutiveHotDays++;
            } else {
                if (consecutiveHotDays >= 3) {
                    heatWaves++;
                }
                consecutiveHotDays = 0;
            }
        });
        
        // Check if the last sequence was a heat wave
        if (consecutiveHotDays >= 3) {
            heatWaves++;
        }
        
        return heatWaves;
    }

    /**
     * Calculate growing season length
     */
    calculateGrowingSeason(monthlyTemps) {
        const months = Object.keys(monthlyTemps).map(Number).sort((a, b) => a - b);
        let growingStart = null;
        let growingEnd = null;

        // Find start of growing season (first month avg > 5°C)
        for (const month of months) {
            if (monthlyTemps[month] > 5 && !growingStart) {
                growingStart = month;
            }
        }

        // Find end of growing season (last month avg > 5°C)
        for (let i = months.length - 1; i >= 0; i--) {
            const month = months[i];
            if (monthlyTemps[month] > 5 && !growingEnd) {
                growingEnd = month;
            }
        }

        if (growingStart && growingEnd) {
            const lengthMonths = growingEnd - growingStart + 1;
            return {
                start_month: growingStart,
                end_month: growingEnd,
                length_months: lengthMonths,
                length_days: Math.round(lengthMonths * 30.4)
            };
        }

        return null;
    }

    /**
     * Calculate distance between two points (Haversine formula)
     */
    calculateDistance(lat1, lon1, lat2, lon2) {
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
     * Rate limiting check
     */
    async checkRateLimit() {
        const now = Date.now();
        const timeSinceLastRequest = now - this.rateLimit.lastRequestTime;
        const minInterval = 1000 / this.rateLimit.perSecond;

        if (timeSinceLastRequest < minInterval) {
            const delay = minInterval - timeSinceLastRequest;
            console.log(`NOAA API rate limiting: waiting ${delay}ms`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }

        this.rateLimit.lastRequestTime = Date.now();
    }

    /**
     * Test connection to NOAA API
     */
    async testConnection() {
        try {
            const response = await this.client.get('/datasets?limit=1');
            return {
                success: true,
                status: response.status,
                message: 'NOAA API connection successful',
                data_source: this.dataSource
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                data_source: this.dataSource
            };
        }
    }
}

module.exports = NoaaDataClient;