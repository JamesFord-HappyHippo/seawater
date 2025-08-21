// NOAA API Configuration
// Environment configuration for NOAA weather data integration

import { NOAAAPIConfig, NOAACacheConfig } from '../types/noaa';

// Environment variable validation
const validateEnvironment = () => {
  const requiredVars = {
    REACT_APP_NOAA_CDO_TOKEN: process.env.REACT_APP_NOAA_CDO_TOKEN,
  };

  const optionalVars = {
    REACT_APP_NOAA_USER_AGENT: process.env.REACT_APP_NOAA_USER_AGENT,
    REACT_APP_ENABLE_WEATHER_DEBUG: process.env.REACT_APP_ENABLE_WEATHER_DEBUG,
  };

  const missing: string[] = [];
  Object.entries(requiredVars).forEach(([key, value]) => {
    if (!value) {
      missing.push(key);
    }
  });

  return {
    isValid: missing.length === 0,
    missing,
    required: requiredVars,
    optional: optionalVars
  };
};

// Get environment configuration
const env = validateEnvironment();

// Default NOAA API Configuration
export const NOAA_CONFIG: NOAAAPIConfig = {
  climate_data_online: {
    base_url: 'https://www.ncdc.noaa.gov/cdo-web/api/v2',
    token: env.required.REACT_APP_NOAA_CDO_TOKEN || '',
    rate_limit_per_second: 5,
    rate_limit_per_day: 10000
  },
  weather_service: {
    base_url: 'https://api.weather.gov',
    user_agent: env.optional.REACT_APP_NOAA_USER_AGENT || 
                '(seawater.io, contact@seawater.io) Seawater Climate Risk Platform',
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

// Cache Configuration
export const NOAA_CACHE_CONFIG: NOAACacheConfig = {
  real_time_ttl_minutes: 15,     // Active alerts, current observations
  daily_ttl_hours: 6,            // Daily weather data
  monthly_ttl_days: 7,           // Monthly climate data
  historical_ttl_days: 30,       // Historical storm events
  normals_ttl_days: 90           // Climate normals (30-year averages)
};

// Feature flags
export const NOAA_FEATURES = {
  enable_debug_logging: env.optional.REACT_APP_ENABLE_WEATHER_DEBUG === 'true',
  enable_background_refresh: true,
  enable_cache_warming: true,
  enable_fallback_apis: false,
  max_historical_years: 25,
  default_search_radius_km: 50
};

// API Endpoints
export const NOAA_ENDPOINTS = {
  // Climate Data Online
  CDO_DATASETS: '/datasets',
  CDO_DATATYPES: '/datatypes',
  CDO_LOCATIONS: '/locations',
  CDO_STATIONS: '/stations',
  CDO_DATA: '/data',
  
  // Weather Service
  WS_POINTS: '/points',
  WS_FORECAST: '/forecast',
  WS_ALERTS: '/alerts/active',
  WS_OBSERVATIONS: '/observations/latest',
  
  // External data sources
  STORM_EVENTS_CSV: 'https://www.ncei.noaa.gov/pub/data/swdi/stormevents/csvfiles',
  HURDAT_DATABASE: 'https://www.nhc.noaa.gov/data/hurdat/hurdat2-1851-2023-051124.txt'
};

// Error messages
export const NOAA_ERRORS = {
  INVALID_TOKEN: 'NOAA Climate Data Online API token is invalid or missing',
  RATE_LIMITED: 'NOAA API rate limit exceeded. Please wait before making more requests',
  NETWORK_ERROR: 'Failed to connect to NOAA services',
  DATA_NOT_AVAILABLE: 'Weather data not available for this location',
  INVALID_COORDINATES: 'Invalid coordinates provided for weather lookup',
  SERVICE_UNAVAILABLE: 'NOAA service temporarily unavailable'
};

// Configuration validation
export const validateNOAAConfig = (): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check required token
  if (!NOAA_CONFIG.climate_data_online.token) {
    errors.push('NOAA Climate Data Online API token is required');
  }

  // Check user agent format
  const userAgent = NOAA_CONFIG.weather_service.user_agent;
  if (!userAgent.includes('@') || !userAgent.includes('(') || !userAgent.includes(')')) {
    warnings.push('Weather Service API User-Agent should include contact information in format: (domain.com, email@domain.com) App Name');
  }

  // Check rate limits
  if (NOAA_CONFIG.climate_data_online.rate_limit_per_second > 5) {
    warnings.push('Climate Data Online rate limit should not exceed 5 requests per second');
  }

  if (NOAA_CONFIG.climate_data_online.rate_limit_per_day > 10000) {
    warnings.push('Climate Data Online rate limit should not exceed 10,000 requests per day');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

// Helper functions
export const NOAAConfigUtils = {
  /**
   * Get API token for Climate Data Online
   */
  getCDOToken: (): string => {
    return NOAA_CONFIG.climate_data_online.token;
  },

  /**
   * Get formatted user agent for Weather Service API
   */
  getWeatherServiceUserAgent: (): string => {
    return NOAA_CONFIG.weather_service.user_agent;
  },

  /**
   * Check if debug logging is enabled
   */
  isDebugEnabled: (): boolean => {
    return NOAA_FEATURES.enable_debug_logging;
  },

  /**
   * Get cache TTL for data type
   */
  getCacheTTL: (dataType: 'real_time' | 'daily' | 'monthly' | 'historical' | 'normals'): number => {
    switch (dataType) {
      case 'real_time':
        return NOAA_CACHE_CONFIG.real_time_ttl_minutes;
      case 'daily':
        return NOAA_CACHE_CONFIG.daily_ttl_hours * 60;
      case 'monthly':
        return NOAA_CACHE_CONFIG.monthly_ttl_days * 24 * 60;
      case 'historical':
        return NOAA_CACHE_CONFIG.historical_ttl_days * 24 * 60;
      case 'normals':
        return NOAA_CACHE_CONFIG.normals_ttl_days * 24 * 60;
      default:
        return NOAA_CACHE_CONFIG.daily_ttl_hours * 60;
    }
  },

  /**
   * Log debug message if debug mode is enabled
   */
  debugLog: (message: string, data?: any) => {
    if (NOAA_FEATURES.enable_debug_logging) {
      console.log(`[NOAA Debug] ${message}`, data || '');
    }
  },

  /**
   * Log error with context
   */
  errorLog: (message: string, error?: any) => {
    console.error(`[NOAA Error] ${message}`, error || '');
  }
};

// Export environment validation results
export const NOAA_ENV_STATUS = {
  isConfigured: env.isValid,
  missingVariables: env.missing,
  configurationValid: validateNOAAConfig().isValid,
  errors: validateNOAAConfig().errors,
  warnings: validateNOAAConfig().warnings
};

// Log configuration status on module load
if (NOAA_FEATURES.enable_debug_logging) {
  console.log('[NOAA Config] Configuration status:', NOAA_ENV_STATUS);
}

export default NOAA_CONFIG;