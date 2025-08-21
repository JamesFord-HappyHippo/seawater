// React Hook for Weather Risk Integration
// Manages NOAA weather data and integration with property risk assessments

import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Coordinates,
  PropertyRiskData,
  NOAAWeatherContextSummary,
  ProcessedStormEvent
} from '../types';
import { 
  NOAAWeatherContext,
  LocationWeatherRisk,
  NOAAAlert,
  NOAAObservation
} from '../types/noaa';
import { weatherRiskIntegration, WeatherRiskUtils } from '../api/weatherRiskIntegration';
import { noaaDataClient } from '../api/noaaDataClient';

interface UseWeatherRiskState {
  // Core data
  weatherContext?: NOAAWeatherContext;
  weatherContextSummary?: NOAAWeatherContextSummary;
  enhancedRiskData?: PropertyRiskData;
  historicalEvents: ProcessedStormEvent[];
  activeAlerts: NOAAAlert[];
  currentObservations: NOAAObservation[];
  
  // Status
  isLoading: boolean;
  isRefreshing: boolean;
  error?: string;
  lastUpdated?: Date;
  
  // Capabilities
  hasWeatherData: boolean;
  weatherConfidence: number;
}

interface UseWeatherRiskOptions {
  // Auto-refresh settings
  autoRefresh?: boolean;
  refreshInterval?: number; // minutes
  
  // Data fetching options
  includeHistoricalEvents?: boolean;
  historicalYears?: number;
  includeCurrentObservations?: boolean;
  
  // Error handling
  retryOnError?: boolean;
  maxRetries?: number;
}

interface UseWeatherRiskReturn extends UseWeatherRiskState {
  // Actions
  refreshWeatherData: () => Promise<void>;
  enhancePropertyRisk: (propertyRiskData: PropertyRiskData) => Promise<PropertyRiskData | null>;
  getQuickRiskCheck: () => Promise<{ hasActiveAlerts: boolean; alertCount: number; riskFactors: string[] }>;
  
  // Utilities
  clearError: () => void;
  clearCache: () => void;
}

const DEFAULT_OPTIONS: Required<UseWeatherRiskOptions> = {
  autoRefresh: false,
  refreshInterval: 15, // 15 minutes
  includeHistoricalEvents: true,
  historicalYears: 20,
  includeCurrentObservations: true,
  retryOnError: true,
  maxRetries: 3
};

export function useWeatherRisk(
  coordinates: Coordinates | null,
  options: UseWeatherRiskOptions = {}
): UseWeatherRiskReturn {
  
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const retryCount = useRef(0);
  const refreshTimer = useRef<NodeJS.Timeout>();
  
  const [state, setState] = useState<UseWeatherRiskState>({
    historicalEvents: [],
    activeAlerts: [],
    currentObservations: [],
    isLoading: false,
    isRefreshing: false,
    hasWeatherData: false,
    weatherConfidence: 0
  });

  // Clear error helper
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: undefined }));
  }, []);

  // Clear cache helper
  const clearCache = useCallback(() => {
    noaaDataClient.clearCache();
  }, []);

  // Main weather data fetching function
  const fetchWeatherData = useCallback(async (isRefresh = false) => {
    if (!coordinates) return;

    setState(prev => ({ 
      ...prev, 
      isLoading: !isRefresh, 
      isRefreshing: isRefresh,
      error: undefined 
    }));

    try {
      // Fetch comprehensive weather context
      const weatherContextResponse = await noaaDataClient.getComprehensiveWeatherContext(coordinates);
      
      if (!weatherContextResponse.success) {
        throw new Error(weatherContextResponse.error?.message || 'Failed to fetch weather context');
      }

      const weatherContext = weatherContextResponse.data!;
      
      // Fetch additional data in parallel
      const [alertsResponse, observationsResponse, historicalResponse] = await Promise.allSettled([
        noaaDataClient.getActiveAlerts(coordinates),
        opts.includeCurrentObservations ? noaaDataClient.getCurrentObservations(coordinates) : Promise.resolve({ success: false, data: [] }),
        opts.includeHistoricalEvents ? noaaDataClient.getHistoricalStormEvents({
          coordinates,
          radius_km: 50,
          start_year: new Date().getFullYear() - opts.historicalYears
        }) : Promise.resolve({ success: false, data: [] })
      ]);

      // Process results
      const activeAlerts = alertsResponse.status === 'fulfilled' && alertsResponse.value.success 
        ? alertsResponse.value.data || [] 
        : [];
      
      const currentObservations = observationsResponse.status === 'fulfilled' && observationsResponse.value.success 
        ? observationsResponse.value.data || [] 
        : [];
      
      const historicalEvents = historicalResponse.status === 'fulfilled' && historicalResponse.value.success 
        ? historicalResponse.value.data || [] 
        : [];

      // Create weather context summary
      const weatherContextSummary: NOAAWeatherContextSummary = {
        has_weather_data: true,
        active_alerts_count: activeAlerts.length,
        historical_events_count: historicalEvents.length,
        climate_risk_factors: {
          temperature_trend: weatherContext.risk_adjustments.climate_trends.temperature_trend.annual_change_per_decade > 0.1 ? 'increasing' : 
                             weatherContext.risk_adjustments.climate_trends.temperature_trend.annual_change_per_decade < -0.1 ? 'decreasing' : 'stable',
          precipitation_trend: weatherContext.risk_adjustments.climate_trends.precipitation_trend.annual_change_per_decade > 0.05 ? 'increasing' : 
                              weatherContext.risk_adjustments.climate_trends.precipitation_trend.annual_change_per_decade < -0.05 ? 'decreasing' : 'stable',
          extreme_weather_frequency: weatherContext.risk_adjustments.climate_trends.precipitation_trend.extreme_precipitation_frequency_change > 0.02 ? 'increasing' : 
                                   weatherContext.risk_adjustments.climate_trends.precipitation_trend.extreme_precipitation_frequency_change < -0.02 ? 'decreasing' : 'stable'
        },
        seasonal_risk_elevation: {
          current_season: weatherContext.risk_adjustments.seasonal_factors.current_season,
          elevated_hazards: Object.entries(weatherContext.risk_adjustments.seasonal_factors.season_risk_multipliers)
            .filter(([_, multiplier]) => multiplier > 1.1)
            .map(([hazard, _]) => hazard as any),
          risk_multiplier: Math.max(...Object.values(weatherContext.risk_adjustments.seasonal_factors.season_risk_multipliers))
        },
        weather_confidence_score: weatherContext.confidence_score,
        last_weather_update: weatherContext.last_updated,
        significant_weather_insights: [
          ...(activeAlerts.length > 0 ? [`${activeAlerts.length} active weather alert(s)`] : []),
          ...(historicalEvents.length > 10 ? [`High event frequency: ${historicalEvents.length} events in analysis period`] : [])
        ]
      };

      setState(prev => ({
        ...prev,
        weatherContext,
        weatherContextSummary,
        historicalEvents,
        activeAlerts,
        currentObservations,
        isLoading: false,
        isRefreshing: false,
        hasWeatherData: true,
        weatherConfidence: weatherContext.confidence_score,
        lastUpdated: new Date(),
        error: undefined
      }));

      // Reset retry count on success
      retryCount.current = 0;

    } catch (error) {
      console.error('Error fetching weather data:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      // Retry logic
      if (opts.retryOnError && retryCount.current < opts.maxRetries) {
        retryCount.current++;
        console.log(`Retrying weather data fetch (attempt ${retryCount.current}/${opts.maxRetries})`);
        
        // Exponential backoff
        setTimeout(() => {
          fetchWeatherData(isRefresh);
        }, Math.pow(2, retryCount.current) * 1000);
        
        return;
      }

      setState(prev => ({
        ...prev,
        isLoading: false,
        isRefreshing: false,
        error: errorMessage
      }));
    }
  }, [coordinates, opts]);

  // Refresh weather data
  const refreshWeatherData = useCallback(async () => {
    await fetchWeatherData(true);
  }, [fetchWeatherData]);

  // Enhance property risk with weather data
  const enhancePropertyRisk = useCallback(async (propertyRiskData: PropertyRiskData): Promise<PropertyRiskData | null> => {
    try {
      const enhancedData = await weatherRiskIntegration.enhancePropertyRiskWithWeather(propertyRiskData);
      
      setState(prev => ({
        ...prev,
        enhancedRiskData: enhancedData
      }));
      
      return enhancedData;
    } catch (error) {
      console.error('Error enhancing property risk:', error);
      return null;
    }
  }, []);

  // Quick risk check
  const getQuickRiskCheck = useCallback(async () => {
    if (!coordinates) {
      return { hasActiveAlerts: false, alertCount: 0, riskFactors: [] };
    }
    
    return WeatherRiskUtils.quickWeatherRiskCheck(coordinates);
  }, [coordinates]);

  // Initial data fetch
  useEffect(() => {
    if (coordinates) {
      fetchWeatherData(false);
    } else {
      // Clear data when coordinates are null
      setState({
        historicalEvents: [],
        activeAlerts: [],
        currentObservations: [],
        isLoading: false,
        isRefreshing: false,
        hasWeatherData: false,
        weatherConfidence: 0
      });
    }
  }, [coordinates, fetchWeatherData]);

  // Auto-refresh setup
  useEffect(() => {
    if (opts.autoRefresh && coordinates && state.hasWeatherData) {
      refreshTimer.current = setInterval(() => {
        refreshWeatherData();
      }, opts.refreshInterval * 60 * 1000);

      return () => {
        if (refreshTimer.current) {
          clearInterval(refreshTimer.current);
        }
      };
    }
  }, [opts.autoRefresh, opts.refreshInterval, coordinates, state.hasWeatherData, refreshWeatherData]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (refreshTimer.current) {
        clearInterval(refreshTimer.current);
      }
    };
  }, []);

  return {
    ...state,
    refreshWeatherData,
    enhancePropertyRisk,
    getQuickRiskCheck,
    clearError,
    clearCache
  };
}

// Helper hook for quick weather status
export function useQuickWeatherStatus(coordinates: Coordinates | null) {
  const [status, setStatus] = useState<{
    hasActiveAlerts: boolean;
    alertCount: number;
    riskFactors: string[];
    isLoading: boolean;
  }>({
    hasActiveAlerts: false,
    alertCount: 0,
    riskFactors: [],
    isLoading: false
  });

  useEffect(() => {
    if (!coordinates) return;

    const checkStatus = async () => {
      setStatus(prev => ({ ...prev, isLoading: true }));
      
      try {
        const result = await WeatherRiskUtils.quickWeatherRiskCheck(coordinates);
        setStatus({
          ...result,
          isLoading: false
        });
      } catch (error) {
        setStatus({
          hasActiveAlerts: false,
          alertCount: 0,
          riskFactors: [],
          isLoading: false
        });
      }
    };

    checkStatus();
  }, [coordinates]);

  return status;
}

// Helper hook for weather data validation
export function useWeatherDataValidation() {
  const validateNOAAToken = useCallback(async (): Promise<{ isValid: boolean; issues: string[] }> => {
    return noaaDataClient.validateConfiguration();
  }, []);

  const checkAPIStatus = useCallback(async (): Promise<{ 
    climateDataOnline: boolean; 
    weatherService: boolean;
    overallHealth: boolean;
  }> => {
    try {
      // Test basic API endpoints
      const [cdoTest, wsTest] = await Promise.allSettled([
        noaaDataClient.getClimateDatasets(),
        noaaDataClient.getWeatherPoint({ latitude: 40.7128, longitude: -74.0060 }) // NYC test
      ]);

      const climateDataOnline = cdoTest.status === 'fulfilled' && cdoTest.value.success;
      const weatherService = wsTest.status === 'fulfilled' && wsTest.value.success;

      return {
        climateDataOnline,
        weatherService,
        overallHealth: climateDataOnline && weatherService
      };
    } catch (error) {
      return {
        climateDataOnline: false,
        weatherService: false,
        overallHealth: false
      };
    }
  }, []);

  return {
    validateNOAAToken,
    checkAPIStatus
  };
}