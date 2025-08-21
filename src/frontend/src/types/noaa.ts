// NOAA Integration Types for Seawater Climate Risk Platform
// Comprehensive TypeScript definitions for NOAA APIs and data structures

import { Coordinates, HazardType } from './index';

// =====================
// NOAA Climate Data Online (CDO) API Types
// =====================

export interface NOAAClimateDataParams {
  datasetid: string;
  datatypeid?: string;
  locationid?: string;
  stationid?: string;
  startdate: string; // YYYY-MM-DD format
  enddate: string;   // YYYY-MM-DD format
  sortfield?: string;
  sortorder?: 'asc' | 'desc';
  limit?: number;    // Max 1000
  offset?: number;
  units?: 'standard' | 'metric';
  includemetadata?: boolean;
}

export interface NOAAClimateDataResponse<T> {
  metadata: {
    resultset: {
      offset: number;
      count: number;
      limit: number;
    };
  };
  results: T[];
}

export interface NOAADataset {
  uid: string;
  id: string;
  name: string;
  datacoverage: number;
  mindate: string;
  maxdate: string;
}

export interface NOAADataType {
  id: string;
  name: string;
  datacoverage: number;
  mindate: string;
  maxdate: string;
}

export interface NOAALocation {
  id: string;
  name: string;
  datacoverage: number;
  mindate: string;
  maxdate: string;
}

export interface NOAAStation {
  id: string;
  name: string;
  datacoverage: number;
  mindate: string;
  maxdate: string;
  latitude: number;
  longitude: number;
  elevation: number;
  elevationUnit: string;
}

export interface NOAAClimateData {
  date: string;
  datatype: string;
  station: string;
  attributes: string;
  value: number;
}

// Climate Normals (30-year averages)
export interface NOAAClimateNormals {
  location_id: string;
  coordinates: Coordinates;
  period: string; // e.g., "1991-2020"
  temperature: {
    annual_mean: number;
    january_mean: number;
    july_mean: number;
    growing_season_length: number;
    heating_degree_days: number;
    cooling_degree_days: number;
  };
  precipitation: {
    annual_total: number;
    wettest_month: string;
    driest_month: string;
    days_with_precipitation: number;
  };
  extremes: {
    highest_temperature: number;
    lowest_temperature: number;
    maximum_precipitation_24h: number;
  };
}

// =====================
// NOAA Weather Service API Types
// =====================

export interface NOAAWeatherPointParams {
  latitude: number;
  longitude: number;
}

export interface NOAAWeatherPoint {
  '@context': any;
  '@id': string;
  '@type': string;
  cwa: string;
  forecastOffice: string;
  gridId: string;
  gridX: number;
  gridY: number;
  forecast: string;
  forecastHourly: string;
  forecastGridData: string;
  observationStations: string;
  relativeLocation: {
    type: string;
    geometry: {
      type: string;
      coordinates: number[];
    };
    properties: {
      city: string;
      state: string;
      distance: {
        unitCode: string;
        value: number;
      };
      bearing: {
        unitCode: string;
        value: number;
      };
    };
  };
  forecastZone: string;
  county: string;
  fireWeatherZone: string;
  timeZone: string;
  radarStation: string;
}

export interface NOAAForecast {
  '@context': any;
  type: string;
  geometry: {
    type: string;
    coordinates: number[][][];
  };
  properties: {
    updated: string;
    units: string;
    forecastGenerator: string;
    generatedAt: string;
    updateTime: string;
    validTimes: string;
    elevation: {
      unitCode: string;
      value: number;
    };
    periods: NOAAForecastPeriod[];
  };
}

export interface NOAAForecastPeriod {
  number: number;
  name: string;
  startTime: string;
  endTime: string;
  isDaytime: boolean;
  temperature: number;
  temperatureUnit: string;
  temperatureTrend: string | null;
  windSpeed: string;
  windDirection: string;
  icon: string;
  shortForecast: string;
  detailedForecast: string;
}

export interface NOAAAlert {
  '@context': any;
  '@id': string;
  '@type': string;
  id: string;
  areaDesc: string;
  geocode: {
    FIPS6: string[];
    UGC: string[];
  };
  affectedZones: string[];
  references: any[];
  sent: string;
  effective: string;
  onset: string;
  expires: string;
  ends: string;
  status: 'Actual' | 'Exercise' | 'System' | 'Test' | 'Draft';
  messageType: 'Alert' | 'Update' | 'Cancel' | 'Ack' | 'Error';
  category: 'Geo' | 'Met' | 'Safety' | 'Security' | 'Rescue' | 'Fire' | 'Health' | 'Env' | 'Transport' | 'Infra' | 'CBRNE' | 'Other';
  severity: 'Extreme' | 'Severe' | 'Moderate' | 'Minor' | 'Unknown';
  certainty: 'Observed' | 'Likely' | 'Possible' | 'Unlikely' | 'Unknown';
  urgency: 'Immediate' | 'Expected' | 'Future' | 'Past' | 'Unknown';
  event: string;
  sender: string;
  senderName: string;
  headline: string;
  description: string;
  instruction: string;
  response: 'Shelter' | 'Evacuate' | 'Prepare' | 'Execute' | 'Avoid' | 'Monitor' | 'Assess' | 'AllClear' | 'None';
  parameters: Record<string, any[]>;
}

export interface NOAAObservation {
  '@context': any;
  '@id': string;
  '@type': string;
  elevation: {
    unitCode: string;
    value: number;
  };
  station: string;
  timestamp: string;
  rawMessage: string;
  textDescription: string;
  icon: string;
  presentWeather: any[];
  temperature: {
    unitCode: string;
    value: number;
    qualityControl: string;
  };
  dewpoint: {
    unitCode: string;
    value: number;
    qualityControl: string;
  };
  windDirection: {
    unitCode: string;
    value: number;
    qualityControl: string;
  };
  windSpeed: {
    unitCode: string;
    value: number;
    qualityControl: string;
  };
  windGust: {
    unitCode: string;
    value: number;
    qualityControl: string;
  };
  barometricPressure: {
    unitCode: string;
    value: number;
    qualityControl: string;
  };
  seaLevelPressure: {
    unitCode: string;
    value: number;
    qualityControl: string;
  };
  visibility: {
    unitCode: string;
    value: number;
    qualityControl: string;
  };
  maxTemperatureLast24Hours: {
    unitCode: string;
    value: number;
    qualityControl: string;
  };
  minTemperatureLast24Hours: {
    unitCode: string;
    value: number;
    qualityControl: string;
  };
  precipitationLastHour: {
    unitCode: string;
    value: number;
    qualityControl: string;
  };
  precipitationLast3Hours: {
    unitCode: string;
    value: number;
    qualityControl: string;
  };
  precipitationLast6Hours: {
    unitCode: string;
    value: number;
    qualityControl: string;
  };
  relativeHumidity: {
    unitCode: string;
    value: number;
    qualityControl: string;
  };
  windChill: {
    unitCode: string;
    value: number;
    qualityControl: string;
  };
  heatIndex: {
    unitCode: string;
    value: number;
    qualityControl: string;
  };
  cloudLayers: Array<{
    base: {
      unitCode: string;
      value: number;
    };
    amount: string;
  }>;
}

// =====================
// NOAA Storm Events Database Types
// =====================

export interface NOAAStormEvent {
  BEGIN_YEARMONTH: number;
  BEGIN_DAY: number;
  BEGIN_TIME: number;
  END_YEARMONTH: number;
  END_DAY: number;
  END_TIME: number;
  EPISODE_ID: number;
  EVENT_ID: number;
  STATE: string;
  STATE_FIPS: number;
  YEAR: number;
  MONTH_NAME: string;
  EVENT_TYPE: string;
  CZ_TYPE: string;
  CZ_FIPS: number;
  CZ_NAME: string;
  WFO: string;
  BEGIN_DATE_TIME: string;
  CZ_TIMEZONE: string;
  END_DATE_TIME: string;
  INJURIES_DIRECT: number;
  INJURIES_INDIRECT: number;
  DEATHS_DIRECT: number;
  DEATHS_INDIRECT: number;
  DAMAGE_PROPERTY: string;
  DAMAGE_CROPS: string;
  SOURCE: string;
  MAGNITUDE: number;
  MAGNITUDE_TYPE: string;
  FLOOD_CAUSE: string;
  CATEGORY: string;
  TOR_F_SCALE: string;
  TOR_LENGTH: number;
  TOR_WIDTH: number;
  TOR_OTHER_WFO: string;
  TOR_OTHER_CZ_STATE: string;
  TOR_OTHER_CZ_FIPS: number;
  TOR_OTHER_CZ_NAME: string;
  BEGIN_RANGE: number;
  BEGIN_AZIMUTH: string;
  BEGIN_LOCATION: string;
  END_RANGE: number;
  END_AZIMUTH: string;
  END_LOCATION: string;
  BEGIN_LAT: number;
  BEGIN_LON: number;
  END_LAT: number;
  END_LON: number;
  EPISODE_NARRATIVE: string;
  EVENT_NARRATIVE: string;
  DATA_SOURCE: string;
}

export interface NOAAStormEventLocation {
  YEARMONTH: number;
  EPISODE_ID: number;
  EVENT_ID: number;
  LOCATION_INDEX: number;
  RANGE: number;
  AZIMUTH: string;
  LOCATION: string;
  LATITUDE: number;
  LONGITUDE: number;
  LAT2: number;
  LON2: number;
}

export interface NOAAStormEventFatality {
  FAT_YEARMONTH: number;
  FAT_DAY: number;
  FAT_TIME: number;
  FATALITY_ID: number;
  EVENT_ID: number;
  FATALITY_TYPE: string;
  FATALITY_DATE: string;
  FATALITY_AGE: number;
  FATALITY_SEX: string;
  FATALITY_LOCATION: string;
}

// =====================
// NOAA Hurricane Database (HURDAT) Types
// =====================

export interface NOAAHurricaneTrack {
  basin: string;
  cy: number; // Cyclone number
  yyyymmdd: number;
  hhmm: number;
  record_identifier: string;
  status_of_system: string;
  latitude: number;
  longitude: number;
  maximum_sustained_wind: number; // knots
  central_pressure: number; // mb
  development_level: string;
  isotach: number; // 34 kt wind radii maximum extent in northeastern quadrant
  quadrant_wind_radii: {
    ne_34kt?: number;
    se_34kt?: number;
    sw_34kt?: number;
    nw_34kt?: number;
    ne_50kt?: number;
    se_50kt?: number;
    sw_50kt?: number;
    nw_50kt?: number;
    ne_64kt?: number;
    se_64kt?: number;
    sw_64kt?: number;
    nw_64kt?: number;
  };
}

export interface NOAAHurricaneSeason {
  basin: string;
  year: number;
  storms: NOAAHurricaneStorm[];
}

export interface NOAAHurricaneStorm {
  basin: string;
  cy: number;
  yyyymmdd: number;
  time: string;
  record_identifier: string;
  status_of_system: string;
  name: string;
  latitude: number;
  longitude: number;
  maximum_sustained_wind: number;
  central_pressure: number;
  development_level: string;
  isotach: number;
  wind_radii: {
    northeast_34kt?: number;
    southeast_34kt?: number;
    southwest_34kt?: number;
    northwest_34kt?: number;
    northeast_50kt?: number;
    southeast_50kt?: number;
    southwest_50kt?: number;
    northwest_50kt?: number;
    northeast_64kt?: number;
    southeast_64kt?: number;
    southwest_64kt?: number;
    northwest_64kt?: number;
  };
  track_points: NOAAHurricaneTrack[];
}

// =====================
// NOAA Sea Level Trends Types
// =====================

export interface NOAASeaLevelStation {
  station_id: string;
  station_name: string;
  latitude: number;
  longitude: number;
  state: string;
  region: string;
  first_year: number;
  last_year: number;
  years_with_data: number;
  percent_complete: number;
  linear_trend: number; // mm/year
  trend_confidence: number; // 95% confidence interval
}

export interface NOAASeaLevelData {
  station_id: string;
  year: number;
  month: number;
  verified: boolean;
  preliminary: boolean;
  msl: number; // mean sea level in mm
  stddev: number;
}

// =====================
// Enhanced Risk Assessment Types with NOAA Context
// =====================

export interface NOAAWeatherContext {
  location: Coordinates;
  data_sources: {
    climate_normals?: NOAAClimateNormals;
    recent_observations?: NOAAObservation[];
    active_alerts?: NOAAAlert[];
    historical_events?: ProcessedStormEvent[];
    sea_level_trends?: NOAASeaLevelStation;
  };
  risk_adjustments: {
    seasonal_factors: SeasonalRiskFactors;
    historical_frequency: HistoricalFrequencyAnalysis;
    climate_trends: ClimateTrendAnalysis;
    current_conditions_impact: CurrentConditionsImpact;
  };
  confidence_score: number;
  last_updated: string;
}

export interface SeasonalRiskFactors {
  current_season: 'spring' | 'summer' | 'fall' | 'winter';
  season_risk_multipliers: {
    flood: number;
    wildfire: number;
    hurricane: number;
    tornado: number;
    heat: number;
    drought: number;
    hail: number;
  };
  peak_risk_months: {
    [K in HazardType]: number[];
  };
}

export interface HistoricalFrequencyAnalysis {
  analysis_period_years: number;
  events_by_hazard: {
    [K in HazardType]?: {
      total_events: number;
      events_per_decade: number;
      average_severity: number;
      trend_direction: 'increasing' | 'decreasing' | 'stable';
      confidence: number;
    };
  };
  notable_events: ProcessedStormEvent[];
}

export interface ClimateTrendAnalysis {
  temperature_trend: {
    annual_change_per_decade: number; // degrees F per decade
    heating_degree_days_change: number;
    cooling_degree_days_change: number;
    extreme_heat_days_trend: number;
  };
  precipitation_trend: {
    annual_change_per_decade: number; // inches per decade
    extreme_precipitation_frequency_change: number;
    drought_frequency_change: number;
  };
  projections_confidence: number;
}

export interface CurrentConditionsImpact {
  active_hazards: string[];
  risk_modifiers: {
    [K in HazardType]?: {
      current_multiplier: number;
      reason: string;
      expires_at?: string;
    };
  };
  drought_index?: number;
  fire_weather_index?: number;
  flood_stage_status?: string;
}

export interface ProcessedStormEvent {
  event_id: string;
  event_type: HazardType;
  date: string;
  severity_score: number; // 0-100 normalized score
  distance_km: number;
  damages: {
    property_damage_usd?: number;
    crop_damage_usd?: number;
    injuries: number;
    fatalities: number;
  };
  description: string;
  confidence: number;
}

// =====================
// API Client Configuration Types
// =====================

export interface NOAAAPIConfig {
  climate_data_online: {
    base_url: string;
    token: string;
    rate_limit_per_second: number;
    rate_limit_per_day: number;
  };
  weather_service: {
    base_url: string;
    user_agent: string;
    rate_limit_per_second: number;
  };
  storm_events: {
    base_url: string;
    csv_base_url: string;
    cache_duration_hours: number;
  };
  hurricane_database: {
    base_url: string;
    cache_duration_hours: number;
  };
  sea_level_trends: {
    base_url: string;
    cache_duration_hours: number;
  };
}

export interface NOAACacheConfig {
  real_time_ttl_minutes: number; // For current weather, alerts
  daily_ttl_hours: number;       // For daily observations
  monthly_ttl_days: number;      // For monthly climate data
  historical_ttl_days: number;   // For historical events
  normals_ttl_days: number;      // For climate normals
}

// =====================
// Error Types
// =====================

export interface NOAAAPIError {
  code: string;
  message: string;
  api_source: 'climate_data_online' | 'weather_service' | 'storm_events' | 'hurricane_db' | 'sea_level';
  status_code?: number;
  details?: any;
  retry_after?: number;
}

// =====================
// Response Wrapper Types
// =====================

export interface NOAAAPIResponse<T> {
  success: boolean;
  data?: T;
  error?: NOAAAPIError;
  metadata: {
    request_id: string;
    timestamp: string;
    cache_status: 'hit' | 'miss' | 'stale';
    data_source: string;
    processing_time_ms: number;
  };
}

// =====================
// Integration Helper Types
// =====================

export interface LocationWeatherRisk {
  coordinates: Coordinates;
  address: string;
  noaa_context: NOAAWeatherContext;
  enhanced_risk_scores: {
    [K in HazardType]?: {
      base_score: number;
      weather_adjusted_score: number;
      adjustment_factors: {
        historical_frequency: number;
        seasonal_factor: number;
        climate_trend: number;
        current_conditions: number;
      };
      confidence: number;
    };
  };
  recommendations: WeatherRiskRecommendation[];
}

export interface WeatherRiskRecommendation {
  hazard_type: HazardType;
  recommendation_type: 'preparation' | 'mitigation' | 'monitoring' | 'insurance';
  priority: 'high' | 'medium' | 'low';
  description: string;
  timeframe: 'immediate' | 'seasonal' | 'annual' | 'long_term';
  cost_estimate?: string;
  effectiveness_score?: number;
}

// Export utility types for NOAA integration
export type NOAADatasetId = 'GHCND' | 'GSOM' | 'GSOY' | 'NORMAL_ANN' | 'NORMAL_MLY' | 'NEXRAD2' | 'NEXRAD3';
export type NOAADataTypeId = 'TMAX' | 'TMIN' | 'TAVG' | 'PRCP' | 'SNOW' | 'SNWD' | 'AWND' | 'WSF2' | 'WSF5';
export type NOAALocationTypeId = 'FIPS' | 'CITY' | 'STATE' | 'ZIP';