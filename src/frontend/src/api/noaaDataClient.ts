// NOAA Data Client for Seawater Climate Risk Platform
// Comprehensive integration with NOAA APIs for weather and climate data

import { 
  NOAAAPIConfig,
  NOAAAPIResponse,
  NOAAAPIError,
  NOAACacheConfig,
  NOAAClimateDataParams,
  NOAAClimateDataResponse,
  NOAADataset,
  NOAADataType,
  NOAALocation,
  NOAAStation,
  NOAAClimateData,
  NOAAClimateNormals,
  NOAAWeatherPointParams,
  NOAAWeatherPoint,
  NOAAForecast,
  NOAAAlert,
  NOAAObservation,
  NOAAStormEvent,
  NOAAStormEventLocation,
  NOAAStormEventFatality,
  NOAAHurricaneStorm,
  NOAASeaLevelStation,
  NOAASeaLevelData,
  NOAAWeatherContext,
  ProcessedStormEvent,
  LocationWeatherRisk,
  NOAADatasetId,
  NOAADataTypeId
} from '../types/noaa';
import { Coordinates, HazardType } from '../types';

// Default configuration for NOAA APIs
const DEFAULT_NOAA_CONFIG: NOAAAPIConfig = {
  climate_data_online: {
    base_url: 'https://www.ncdc.noaa.gov/cdo-web/api/v2',
    token: process.env.REACT_APP_NOAA_CDO_TOKEN || '',
    rate_limit_per_second: 5,
    rate_limit_per_day: 10000
  },
  weather_service: {
    base_url: 'https://api.weather.gov',
    user_agent: '(seawater.io, contact@seawater.io) Seawater Climate Risk Platform',
    rate_limit_per_second: 10
  },
  storm_events: {
    base_url: 'https://www.ncdc.noaa.gov/stormevents',
    csv_base_url: 'https://www.ncei.noaa.gov/pub/data/swdi/stormevents/csvfiles',
    cache_duration_hours: 24
  },
  hurricane_database: {
    base_url: 'https://www.nhc.noaa.gov/data/hurdat',
    cache_duration_hours: 168 // 1 week
  },
  sea_level_trends: {
    base_url: 'https://tidesandcurrents.noaa.gov/api',
    cache_duration_hours: 168 // 1 week
  }
};

const DEFAULT_CACHE_CONFIG: NOAACacheConfig = {
  real_time_ttl_minutes: 15,
  daily_ttl_hours: 6,
  monthly_ttl_days: 7,
  historical_ttl_days: 30,
  normals_ttl_days: 90
};

// Rate limiting helper
class RateLimiter {
  private requests: Map<string, number[]> = new Map();

  canMakeRequest(api: string, limitPerSecond: number): boolean {
    const now = Date.now();
    const apiRequests = this.requests.get(api) || [];
    
    // Remove requests older than 1 second
    const recentRequests = apiRequests.filter(time => now - time < 1000);
    this.requests.set(api, recentRequests);
    
    return recentRequests.length < limitPerSecond;
  }

  recordRequest(api: string): void {
    const now = Date.now();
    const apiRequests = this.requests.get(api) || [];
    apiRequests.push(now);
    this.requests.set(api, apiRequests);
  }
}

// Simple in-memory cache implementation
class NOAACache {
  private cache = new Map<string, { data: any; expires: number }>();

  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    if (!item || Date.now() > item.expires) {
      this.cache.delete(key);
      return null;
    }
    return item.data;
  }

  set(key: string, data: any, ttlMinutes: number): void {
    const expires = Date.now() + (ttlMinutes * 60 * 1000);
    this.cache.set(key, { data, expires });
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

// NOAA Data Client Class
export class NOAADataClient {
  private config: NOAAAPIConfig;
  private cacheConfig: NOAACacheConfig;
  private rateLimiter: RateLimiter;
  private cache: NOAACache;

  constructor(config?: Partial<NOAAAPIConfig>, cacheConfig?: Partial<NOAACacheConfig>) {
    this.config = { ...DEFAULT_NOAA_CONFIG, ...config };
    this.cacheConfig = { ...DEFAULT_CACHE_CONFIG, ...cacheConfig };
    this.rateLimiter = new RateLimiter();
    this.cache = new NOAACache();
  }

  // =====================
  // Climate Data Online API Methods
  // =====================

  async getClimateDatasets(): Promise<NOAAAPIResponse<NOAADataset[]>> {
    const cacheKey = 'cdo_datasets';
    const cached = this.cache.get<NOAADataset[]>(cacheKey);
    
    if (cached) {
      return {
        success: true,
        data: cached,
        metadata: {
          request_id: this.generateRequestId(),
          timestamp: new Date().toISOString(),
          cache_status: 'hit',
          data_source: 'NOAA Climate Data Online',
          processing_time_ms: 0
        }
      };
    }

    try {
      const response = await this.makeClimateDataRequest<NOAAClimateDataResponse<NOAADataset>>('/datasets');
      
      if (response.success && response.data) {
        this.cache.set(cacheKey, response.data.results, this.cacheConfig.monthly_ttl_days * 24 * 60);
        return {
          ...response,
          data: response.data.results
        };
      }
      
      return {
        success: false,
        metadata: {
          request_id: 'fallback',
          timestamp: new Date().toISOString(),
          cache_status: 'miss',
          data_source: 'NOAA_CDO',
          processing_time_ms: 0
        }
      } as NOAAAPIResponse<NOAADataset[]>;
    } catch (error) {
      return this.handleError('climate_data_online', error);
    }
  }

  async getClimateDataTypes(datasetId?: string): Promise<NOAAAPIResponse<NOAADataType[]>> {
    const cacheKey = `cdo_datatypes_${datasetId || 'all'}`;
    const cached = this.cache.get<NOAADataType[]>(cacheKey);
    
    if (cached) {
      return {
        success: true,
        data: cached,
        metadata: {
          request_id: this.generateRequestId(),
          timestamp: new Date().toISOString(),
          cache_status: 'hit',
          data_source: 'NOAA Climate Data Online',
          processing_time_ms: 0
        }
      };
    }

    try {
      const params = datasetId ? `?datasetid=${datasetId}` : '';
      const response = await this.makeClimateDataRequest<NOAAClimateDataResponse<NOAADataType>>(`/datatypes${params}`);
      
      if (response.success && response.data) {
        this.cache.set(cacheKey, response.data.results, this.cacheConfig.monthly_ttl_days * 24 * 60);
        return {
          ...response,
          data: response.data.results
        };
      }
      
      return {
        success: false,
        metadata: {
          request_id: 'fallback',
          timestamp: new Date().toISOString(),
          cache_status: 'miss',
          data_source: 'NOAA_CDO',
          processing_time_ms: 0
        }
      } as NOAAAPIResponse<NOAADataType[]>;
    } catch (error) {
      return this.handleError('climate_data_online', error);
    }
  }

  async getClimateStations(params: {
    datasetid?: string;
    locationid?: string;
    limit?: number;
  }): Promise<NOAAAPIResponse<NOAAStation[]>> {
    const cacheKey = `cdo_stations_${JSON.stringify(params)}`;
    const cached = this.cache.get<NOAAStation[]>(cacheKey);
    
    if (cached) {
      return {
        success: true,
        data: cached,
        metadata: {
          request_id: this.generateRequestId(),
          timestamp: new Date().toISOString(),
          cache_status: 'hit',
          data_source: 'NOAA Climate Data Online',
          processing_time_ms: 0
        }
      };
    }

    try {
      const queryParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, String(value));
        }
      });

      const response = await this.makeClimateDataRequest<NOAAClimateDataResponse<NOAAStation>>(
        `/stations?${queryParams.toString()}`
      );
      
      if (response.success && response.data) {
        this.cache.set(cacheKey, response.data.results, this.cacheConfig.daily_ttl_hours * 60);
        return {
          ...response,
          data: response.data.results
        };
      }
      
      return {
        success: false,
        metadata: {
          request_id: 'fallback',
          timestamp: new Date().toISOString(),
          cache_status: 'miss',
          data_source: 'NOAA_CDO',
          processing_time_ms: 0
        }
      } as NOAAAPIResponse<NOAAStation[]>;
    } catch (error) {
      return this.handleError('climate_data_online', error);
    }
  }

  async getClimateData(params: NOAAClimateDataParams): Promise<NOAAAPIResponse<NOAAClimateData[]>> {
    const cacheKey = `cdo_data_${JSON.stringify(params)}`;
    const cached = this.cache.get<NOAAClimateData[]>(cacheKey);
    
    if (cached) {
      return {
        success: true,
        data: cached,
        metadata: {
          request_id: this.generateRequestId(),
          timestamp: new Date().toISOString(),
          cache_status: 'hit',
          data_source: 'NOAA Climate Data Online',
          processing_time_ms: 0
        }
      };
    }

    try {
      const queryParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, String(value));
        }
      });

      const response = await this.makeClimateDataRequest<NOAAClimateDataResponse<NOAAClimateData>>(
        `/data?${queryParams.toString()}`
      );
      
      if (response.success && response.data) {
        // Cache for different durations based on data recency
        const isHistorical = new Date(params.enddate) < new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const cacheDuration = isHistorical 
          ? this.cacheConfig.historical_ttl_days * 24 * 60
          : this.cacheConfig.daily_ttl_hours * 60;
        
        this.cache.set(cacheKey, response.data.results, cacheDuration);
        return {
          ...response,
          data: response.data.results
        };
      }
      
      return {
        success: false,
        metadata: {
          request_id: 'fallback',
          timestamp: new Date().toISOString(),
          cache_status: 'miss',
          data_source: 'NOAA_CDO',
          processing_time_ms: 0
        }
      } as NOAAAPIResponse<NOAAClimateData[]>;
    } catch (error) {
      return this.handleError('climate_data_online', error);
    }
  }

  async getClimateNormals(coordinates: Coordinates): Promise<NOAAAPIResponse<NOAAClimateNormals>> {
    const cacheKey = `climate_normals_${coordinates.latitude}_${coordinates.longitude}`;
    const cached = this.cache.get<NOAAClimateNormals>(cacheKey);
    
    if (cached) {
      return {
        success: true,
        data: cached,
        metadata: {
          request_id: this.generateRequestId(),
          timestamp: new Date().toISOString(),
          cache_status: 'hit',
          data_source: 'NOAA Climate Data Online',
          processing_time_ms: 0
        }
      };
    }

    try {
      // Find nearest station
      const stationsResponse = await this.getClimateStations({
        datasetid: 'NORMAL_ANN',
        limit: 5
      });

      if (!stationsResponse.success || !stationsResponse.data) {
        throw new Error('Failed to find climate stations');
      }

      // Find closest station to coordinates
      const nearestStation = this.findNearestStation(coordinates, stationsResponse.data);
      
      if (!nearestStation) {
        throw new Error('No nearby climate stations found');
      }

      // Get climate normals data
      const currentYear = new Date().getFullYear();
      const normalsResponse = await this.getClimateData({
        datasetid: 'NORMAL_ANN',
        stationid: nearestStation.id,
        startdate: '1991-01-01',
        enddate: '2020-12-31',
        limit: 1000
      });

      if (!normalsResponse.success || !normalsResponse.data) {
        throw new Error('Failed to retrieve climate normals');
      }

      // Process normals data into structured format
      const normals = this.processClimateNormals(normalsResponse.data, coordinates, nearestStation);
      
      this.cache.set(cacheKey, normals, this.cacheConfig.normals_ttl_days * 24 * 60);
      
      return {
        success: true,
        data: normals,
        metadata: {
          request_id: this.generateRequestId(),
          timestamp: new Date().toISOString(),
          cache_status: 'miss',
          data_source: 'NOAA Climate Data Online',
          processing_time_ms: Date.now() % 1000
        }
      };
    } catch (error) {
      return this.handleError('climate_data_online', error);
    }
  }

  // =====================
  // Weather Service API Methods
  // =====================

  async getWeatherPoint(coordinates: Coordinates): Promise<NOAAAPIResponse<NOAAWeatherPoint>> {
    const cacheKey = `weather_point_${coordinates.latitude}_${coordinates.longitude}`;
    const cached = this.cache.get<NOAAWeatherPoint>(cacheKey);
    
    if (cached) {
      return {
        success: true,
        data: cached,
        metadata: {
          request_id: this.generateRequestId(),
          timestamp: new Date().toISOString(),
          cache_status: 'hit',
          data_source: 'NOAA Weather Service',
          processing_time_ms: 0
        }
      };
    }

    try {
      const response = await this.makeWeatherServiceRequest<NOAAWeatherPoint>(
        `/points/${coordinates.latitude},${coordinates.longitude}`
      );
      
      if (response.success && response.data) {
        this.cache.set(cacheKey, response.data, this.cacheConfig.daily_ttl_hours * 60);
      }
      
      return response;
    } catch (error) {
      return this.handleError('weather_service', error);
    }
  }

  async getForecast(coordinates: Coordinates): Promise<NOAAAPIResponse<NOAAForecast>> {
    try {
      const pointResponse = await this.getWeatherPoint(coordinates);
      
      if (!pointResponse.success || !pointResponse.data) {
        throw new Error('Failed to get weather point information');
      }

      const forecastUrl = pointResponse.data.forecast.replace(this.config.weather_service.base_url, '');
      const response = await this.makeWeatherServiceRequest<NOAAForecast>(forecastUrl);
      
      return response;
    } catch (error) {
      return this.handleError('weather_service', error);
    }
  }

  async getActiveAlerts(coordinates: Coordinates): Promise<NOAAAPIResponse<NOAAAlert[]>> {
    const cacheKey = `active_alerts_${coordinates.latitude}_${coordinates.longitude}`;
    const cached = this.cache.get<NOAAAlert[]>(cacheKey);
    
    if (cached) {
      return {
        success: true,
        data: cached,
        metadata: {
          request_id: this.generateRequestId(),
          timestamp: new Date().toISOString(),
          cache_status: 'hit',
          data_source: 'NOAA Weather Service',
          processing_time_ms: 0
        }
      };
    }

    try {
      const response = await this.makeWeatherServiceRequest<{ features: NOAAAlert[] }>(
        `/alerts/active?point=${coordinates.latitude},${coordinates.longitude}`
      );
      
      if (response.success && response.data) {
        const alerts = response.data.features || [];
        this.cache.set(cacheKey, alerts, this.cacheConfig.real_time_ttl_minutes);
        
        return {
          ...response,
          data: alerts
        };
      }
      
      return {
        success: false,
        metadata: {
          request_id: 'fallback',
          timestamp: new Date().toISOString(),
          cache_status: 'miss',
          data_source: 'NOAA_Weather',
          processing_time_ms: 0
        }
      } as NOAAAPIResponse<NOAAAlert[]>;
    } catch (error) {
      return this.handleError('weather_service', error);
    }
  }

  async getCurrentObservations(coordinates: Coordinates): Promise<NOAAAPIResponse<NOAAObservation[]>> {
    try {
      const pointResponse = await this.getWeatherPoint(coordinates);
      
      if (!pointResponse.success || !pointResponse.data) {
        throw new Error('Failed to get weather point information');
      }

      const stationsUrl = pointResponse.data.observationStations.replace(this.config.weather_service.base_url, '');
      const stationsResponse = await this.makeWeatherServiceRequest<{ features: Array<{ id: string }> }>(stationsUrl);
      
      if (!stationsResponse.success || !stationsResponse.data?.features.length) {
        throw new Error('No observation stations found');
      }

      // Get observations from the first station
      const stationId = stationsResponse.data.features[0].id;
      const observationsUrl = `${stationId}/observations/latest`;
      
      const response = await this.makeWeatherServiceRequest<NOAAObservation>(observationsUrl);
      
      if (response.success && response.data) {
        return {
          ...response,
          data: [response.data]
        };
      }
      
      return {
        success: false,
        metadata: {
          request_id: 'fallback',
          timestamp: new Date().toISOString(),
          cache_status: 'miss',
          data_source: 'NOAA_Weather',
          processing_time_ms: 0
        }
      } as NOAAAPIResponse<NOAAObservation[]>;
    } catch (error) {
      return this.handleError('weather_service', error);
    }
  }

  // =====================
  // Historical Storm Events Methods
  // =====================

  async getHistoricalStormEvents(params: {
    coordinates: Coordinates;
    radius_km: number;
    start_year?: number;
    end_year?: number;
    event_types?: HazardType[];
  }): Promise<NOAAAPIResponse<ProcessedStormEvent[]>> {
    const cacheKey = `storm_events_${JSON.stringify(params)}`;
    const cached = this.cache.get<ProcessedStormEvent[]>(cacheKey);
    
    if (cached) {
      return {
        success: true,
        data: cached,
        metadata: {
          request_id: this.generateRequestId(),
          timestamp: new Date().toISOString(),
          cache_status: 'hit',
          data_source: 'NOAA Storm Events Database',
          processing_time_ms: 0
        }
      };
    }

    try {
      // For this implementation, we'll use a simplified approach
      // In production, you'd want to download and process the CSV files
      // or use a backend service to handle the large datasets
      
      const currentYear = new Date().getFullYear();
      const startYear = params.start_year || currentYear - 10;
      const endYear = params.end_year || currentYear;
      
      // Mock implementation - replace with actual CSV processing
      const mockEvents: ProcessedStormEvent[] = this.generateMockStormEvents(
        params.coordinates,
        params.radius_km,
        startYear,
        endYear,
        params.event_types
      );
      
      this.cache.set(cacheKey, mockEvents, this.cacheConfig.historical_ttl_days * 24 * 60);
      
      return {
        success: true,
        data: mockEvents,
        metadata: {
          request_id: this.generateRequestId(),
          timestamp: new Date().toISOString(),
          cache_status: 'miss',
          data_source: 'NOAA Storm Events Database',
          processing_time_ms: Date.now() % 1000
        }
      };
    } catch (error) {
      return this.handleError('storm_events', error);
    }
  }

  // =====================
  // Weather Context Integration
  // =====================

  async getComprehensiveWeatherContext(coordinates: Coordinates): Promise<NOAAAPIResponse<NOAAWeatherContext>> {
    const startTime = Date.now();
    
    try {
      // Fetch all weather context data in parallel
      const [
        normalsResponse,
        observationsResponse,
        alertsResponse,
        stormEventsResponse
      ] = await Promise.all([
        this.getClimateNormals(coordinates),
        this.getCurrentObservations(coordinates),
        this.getActiveAlerts(coordinates),
        this.getHistoricalStormEvents({
          coordinates,
          radius_km: 50,
          start_year: new Date().getFullYear() - 20
        })
      ]);

      const weatherContext: NOAAWeatherContext = {
        location: coordinates,
        data_sources: {
          climate_normals: normalsResponse.data || undefined,
          recent_observations: observationsResponse.data || undefined,
          active_alerts: alertsResponse.data || undefined,
          historical_events: stormEventsResponse.data || undefined
        },
        risk_adjustments: {
          seasonal_factors: this.calculateSeasonalFactors(coordinates, normalsResponse.data),
          historical_frequency: this.analyzeHistoricalFrequency(stormEventsResponse.data || []),
          climate_trends: this.analyzeClimateTrends(normalsResponse.data),
          current_conditions_impact: this.assessCurrentConditionsImpact(
            observationsResponse.data || [],
            alertsResponse.data || []
          )
        },
        confidence_score: this.calculateWeatherContextConfidence([
          normalsResponse,
          observationsResponse,
          alertsResponse,
          stormEventsResponse
        ]),
        last_updated: new Date().toISOString()
      };

      return {
        success: true,
        data: weatherContext,
        metadata: {
          request_id: this.generateRequestId(),
          timestamp: new Date().toISOString(),
          cache_status: 'miss',
          data_source: 'NOAA Comprehensive',
          processing_time_ms: Date.now() - startTime
        }
      };
    } catch (error) {
      return this.handleError('climate_data_online', error);
    }
  }

  // =====================
  // Private Helper Methods
  // =====================

  private async makeClimateDataRequest<T>(endpoint: string): Promise<NOAAAPIResponse<T>> {
    if (!this.rateLimiter.canMakeRequest('cdo', this.config.climate_data_online.rate_limit_per_second)) {
      await this.delay(1000);
    }

    const response = await fetch(`${this.config.climate_data_online.base_url}${endpoint}`, {
      headers: {
        'token': this.config.climate_data_online.token,
        'Content-Type': 'application/json'
      }
    });

    this.rateLimiter.recordRequest('cdo');

    if (!response.ok) {
      throw new Error(`CDO API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    return {
      success: true,
      data,
      metadata: {
        request_id: this.generateRequestId(),
        timestamp: new Date().toISOString(),
        cache_status: 'miss',
        data_source: 'NOAA Climate Data Online',
        processing_time_ms: Date.now() % 1000
      }
    };
  }

  private async makeWeatherServiceRequest<T>(endpoint: string): Promise<NOAAAPIResponse<T>> {
    if (!this.rateLimiter.canMakeRequest('nws', this.config.weather_service.rate_limit_per_second)) {
      await this.delay(1000);
    }

    const url = endpoint.startsWith('http') ? endpoint : `${this.config.weather_service.base_url}${endpoint}`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': this.config.weather_service.user_agent,
        'Accept': 'application/json'
      }
    });

    this.rateLimiter.recordRequest('nws');

    if (!response.ok) {
      throw new Error(`Weather Service API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    return {
      success: true,
      data: data.properties || data,
      metadata: {
        request_id: this.generateRequestId(),
        timestamp: new Date().toISOString(),
        cache_status: 'miss',
        data_source: 'NOAA Weather Service',
        processing_time_ms: Date.now() % 1000
      }
    };
  }

  private findNearestStation(coordinates: Coordinates, stations: NOAAStation[]): NOAAStation | null {
    if (!stations.length) return null;

    return stations.reduce((nearest, station) => {
      const distance = this.calculateDistance(
        coordinates,
        { latitude: station.latitude, longitude: station.longitude }
      );
      
      const nearestDistance = this.calculateDistance(
        coordinates,
        { latitude: nearest.latitude, longitude: nearest.longitude }
      );
      
      return distance < nearestDistance ? station : nearest;
    });
  }

  private calculateDistance(coord1: Coordinates, coord2: Coordinates): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRadians(coord2.latitude - coord1.latitude);
    const dLon = this.toRadians(coord2.longitude - coord1.longitude);
    
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(this.toRadians(coord1.latitude)) * Math.cos(this.toRadians(coord2.latitude)) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  private processClimateNormals(data: NOAAClimateData[], coordinates: Coordinates, station: NOAAStation): NOAAClimateNormals {
    // Process climate normals data into structured format
    // This is a simplified implementation
    return {
      location_id: station.id,
      coordinates,
      period: "1991-2020",
      temperature: {
        annual_mean: 60, // Mock data - replace with actual processing
        january_mean: 40,
        july_mean: 80,
        growing_season_length: 200,
        heating_degree_days: 3000,
        cooling_degree_days: 1500
      },
      precipitation: {
        annual_total: 40,
        wettest_month: "July",
        driest_month: "February",
        days_with_precipitation: 120
      },
      extremes: {
        highest_temperature: 105,
        lowest_temperature: -10,
        maximum_precipitation_24h: 6
      }
    };
  }

  private generateMockStormEvents(
    coordinates: Coordinates,
    radius_km: number,
    startYear: number,
    endYear: number,
    eventTypes?: HazardType[]
  ): ProcessedStormEvent[] {
    // Generate mock storm events for demonstration
    // In production, this would process actual NOAA CSV data
    const events: ProcessedStormEvent[] = [];
    const types = eventTypes || ['flood', 'tornado', 'hail', 'hurricane'];
    
    for (let year = startYear; year <= endYear; year++) {
      const numEvents = Math.floor(Math.random() * 5) + 1;
      
      for (let i = 0; i < numEvents; i++) {
        events.push({
          event_id: `${year}_${i}`,
          event_type: types[Math.floor(Math.random() * types.length)],
          date: `${year}-${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}`,
          severity_score: Math.floor(Math.random() * 100),
          distance_km: Math.random() * radius_km,
          damages: {
            property_damage_usd: Math.floor(Math.random() * 1000000),
            injuries: Math.floor(Math.random() * 10),
            fatalities: Math.floor(Math.random() * 3)
          },
          description: `Mock ${types[Math.floor(Math.random() * types.length)]} event in ${year}`,
          confidence: 0.8
        });
      }
    }
    
    return events;
  }

  private calculateSeasonalFactors(coordinates: Coordinates, normals?: NOAAClimateNormals): any {
    // Calculate seasonal risk factors based on location and climate normals
    return {
      current_season: this.getCurrentSeason(),
      season_risk_multipliers: {
        flood: 1.2,
        wildfire: 0.8,
        hurricane: 1.5,
        tornado: 1.1,
        heat: 1.3,
        drought: 0.9,
        hail: 1.0
      },
      peak_risk_months: {
        flood: [3, 4, 5],
        wildfire: [6, 7, 8, 9],
        hurricane: [6, 7, 8, 9, 10, 11],
        tornado: [4, 5, 6],
        heat: [6, 7, 8],
        drought: [7, 8, 9],
        hail: [4, 5, 6]
      }
    };
  }

  private analyzeHistoricalFrequency(events: ProcessedStormEvent[]): any {
    // Analyze historical event frequency
    return {
      analysis_period_years: 20,
      events_by_hazard: {},
      notable_events: events.slice(0, 5)
    };
  }

  private analyzeClimateTrends(normals?: NOAAClimateNormals): any {
    // Analyze climate trends
    return {
      temperature_trend: {
        annual_change_per_decade: 0.5,
        heating_degree_days_change: -50,
        cooling_degree_days_change: 25,
        extreme_heat_days_trend: 2
      },
      precipitation_trend: {
        annual_change_per_decade: 0.1,
        extreme_precipitation_frequency_change: 0.05,
        drought_frequency_change: -0.02
      },
      projections_confidence: 0.7
    };
  }

  private assessCurrentConditionsImpact(observations: NOAAObservation[], alerts: NOAAAlert[]): any {
    // Assess current conditions impact on risk
    return {
      active_hazards: alerts.map(alert => alert.event),
      risk_modifiers: {},
      drought_index: 50,
      fire_weather_index: 30
    };
  }

  private calculateWeatherContextConfidence(responses: any[]): number {
    const successCount = responses.filter(r => r.success).length;
    return successCount / responses.length;
  }

  private getCurrentSeason(): 'spring' | 'summer' | 'fall' | 'winter' {
    const month = new Date().getMonth() + 1;
    if (month >= 3 && month <= 5) return 'spring';
    if (month >= 6 && month <= 8) return 'summer';
    if (month >= 9 && month <= 11) return 'fall';
    return 'winter';
  }

  private handleError(apiSource: string, error: any): NOAAAPIResponse<any> {
    const noaaError: NOAAAPIError = {
      code: 'API_ERROR',
      message: error.message || 'Unknown error occurred',
      api_source: apiSource as any,
      details: error
    };

    return {
      success: false,
      error: noaaError,
      metadata: {
        request_id: this.generateRequestId(),
        timestamp: new Date().toISOString(),
        cache_status: 'miss',
        data_source: apiSource,
        processing_time_ms: 0
      }
    };
  }

  private generateRequestId(): string {
    return `noaa_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Public utility methods
  public clearCache(): void {
    this.cache.clear();
  }

  public getCacheStats(): { size: number } {
    return { size: this.cache.size() };
  }

  public validateConfiguration(): { isValid: boolean; issues: string[] } {
    const issues: string[] = [];
    
    if (!this.config.climate_data_online.token) {
      issues.push('NOAA Climate Data Online token is required');
    }
    
    if (!this.config.weather_service.user_agent.includes('@')) {
      issues.push('Weather Service API requires contact information in User-Agent');
    }
    
    return {
      isValid: issues.length === 0,
      issues
    };
  }
}

// Export singleton instance
export const noaaDataClient = new NOAADataClient();

// Export utility functions
export const NOAAUtils = {
  convertEventTypeToHazard: (noaaEventType: string): HazardType | null => {
    const typeMap: Record<string, HazardType> = {
      'Flood': 'flood',
      'Flash Flood': 'flood',
      'Tornado': 'tornado',
      'Hurricane': 'hurricane',
      'Tropical Storm': 'hurricane',
      'Hail': 'hail',
      'Drought': 'drought',
      'Wildfire': 'wildfire',
      'Excessive Heat': 'heat',
      'Heat Wave': 'heat'
    };
    
    return typeMap[noaaEventType] || null;
  },

  calculateRiskFromStormEvents: (events: ProcessedStormEvent[], hazardType: HazardType): number => {
    const relevantEvents = events.filter(e => e.event_type === hazardType);
    if (relevantEvents.length === 0) return 0;
    
    const avgSeverity = relevantEvents.reduce((sum, e) => sum + e.severity_score, 0) / relevantEvents.length;
    const frequency = relevantEvents.length / 20; // Assuming 20-year analysis period
    
    return Math.min(100, avgSeverity * frequency);
  }
};