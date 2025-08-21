import React, { memo, useState, useEffect } from 'react';
import { 
  Cloud,
  AlertTriangle,
  Calendar,
  TrendingUp,
  Loader2,
  RefreshCw,
  Settings,
  Eye,
  EyeOff
} from 'lucide-react';
import { clsx } from 'clsx';
import { 
  PropertyRiskData,
  NOAAWeatherContextSummary,
  ProcessedStormEvent,
  Coordinates,
  HazardType,
  ComponentSize
} from '../../types';
import { WeatherContextDisplay } from './WeatherContextDisplay';
import { HistoricalWeatherTimeline } from './HistoricalWeatherTimeline';
import { WeatherRiskEnhancement } from './WeatherRiskEnhancement';
import { weatherRiskIntegration } from '../../api/weatherRiskIntegration';
import { noaaDataClient } from '../../api/noaaDataClient';

interface WeatherDashboardProps extends ComponentSize {
  propertyRiskData: PropertyRiskData;
  showAllSections?: boolean;
  className?: string;
}

interface WeatherDashboardState {
  weatherContext?: NOAAWeatherContextSummary;
  historicalEvents: ProcessedStormEvent[];
  enhancedRiskData?: PropertyRiskData;
  isLoading: boolean;
  error?: string;
  lastUpdated?: string;
}

export const WeatherDashboard: React.FC<WeatherDashboardProps> = memo(({
  propertyRiskData,
  showAllSections = true,
  size = 'medium',
  className
}) => {
  const [state, setState] = useState<WeatherDashboardState>({
    historicalEvents: [],
    isLoading: true
  });

  const [visibleSections, setVisibleSections] = useState({
    weatherContext: true,
    historicalTimeline: true,
    riskEnhancements: true
  });

  // Load weather data
  useEffect(() => {
    loadWeatherData();
  }, [propertyRiskData.property.coordinates]);

  const loadWeatherData = async () => {
    setState(prev => ({ ...prev, isLoading: true, error: undefined }));

    try {
      // Get enhanced risk data with weather context
      const enhancedRiskData = await weatherRiskIntegration.enhancePropertyRiskWithWeather(
        propertyRiskData
      );

      // Get historical events
      const historicalEventsResponse = await noaaDataClient.getHistoricalStormEvents({
        coordinates: propertyRiskData.property.coordinates,
        radius_km: 50,
        start_year: new Date().getFullYear() - 20
      });

      setState(prev => ({
        ...prev,
        weatherContext: enhancedRiskData.risk_assessment.weather_context,
        enhancedRiskData,
        historicalEvents: historicalEventsResponse.data || [],
        isLoading: false,
        lastUpdated: new Date().toISOString()
      }));

    } catch (error) {
      console.error('Error loading weather data:', error);
      setState(prev => ({
        ...prev,
        error: 'Failed to load weather data',
        isLoading: false
      }));
    }
  };

  const toggleSection = (section: keyof typeof visibleSections) => {
    setVisibleSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const sizeStyles = {
    small: {
      container: 'p-3',
      title: 'text-lg',
      subtitle: 'text-sm',
      text: 'text-xs',
      icon: 'h-4 w-4',
      spacing: 'space-y-3'
    },
    medium: {
      container: 'p-4',
      title: 'text-xl',
      subtitle: 'text-base',
      text: 'text-sm',
      icon: 'h-5 w-5',
      spacing: 'space-y-4'
    },
    large: {
      container: 'p-6',
      title: 'text-2xl',
      subtitle: 'text-lg',
      text: 'text-base',
      icon: 'h-6 w-6',
      spacing: 'space-y-6'
    }
  };

  const styles = sizeStyles[size];

  return (
    <div className={clsx('card', styles.container, className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Cloud className={clsx('text-sky-600', styles.icon)} />
          <div>
            <h2 className={clsx('font-bold text-neutral-900', styles.title)}>
              Weather Risk Intelligence
            </h2>
            <p className={clsx('text-neutral-600', styles.text)}>
              NOAA-enhanced risk assessment for {propertyRiskData.property.formatted_address}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {/* Refresh Button */}
          <button
            onClick={loadWeatherData}
            disabled={state.isLoading}
            className={clsx(
              'p-2 rounded-lg border border-neutral-200 hover:bg-neutral-50 transition-colors',
              state.isLoading && 'opacity-50 cursor-not-allowed'
            )}
            title="Refresh weather data"
          >
            {state.isLoading ? (
              <Loader2 className={clsx('animate-spin text-neutral-600', styles.icon)} />
            ) : (
              <RefreshCw className={clsx('text-neutral-600', styles.icon)} />
            )}
          </button>

          {/* Section Visibility Toggle */}
          {showAllSections && (
            <div className="flex items-center space-x-1">
              <Settings className={clsx('text-neutral-500', styles.icon)} />
              <div className="flex space-x-1">
                {Object.entries(visibleSections).map(([section, visible]) => (
                  <button
                    key={section}
                    onClick={() => toggleSection(section as keyof typeof visibleSections)}
                    className={clsx(
                      'p-1 rounded text-xs',
                      visible ? 'bg-seawater-primary text-white' : 'bg-neutral-200 text-neutral-600'
                    )}
                    title={`${visible ? 'Hide' : 'Show'} ${section}`}
                  >
                    {visible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Loading State */}
      {state.isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className={clsx('animate-spin text-seawater-primary mx-auto mb-3', styles.icon)} />
            <p className={clsx('text-neutral-600', styles.text)}>
              Loading weather intelligence...
            </p>
          </div>
        </div>
      )}

      {/* Error State */}
      {state.error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <AlertTriangle className={clsx('text-red-500', styles.icon)} />
            <div>
              <p className={clsx('font-medium text-red-800', styles.text)}>
                Weather Data Error
              </p>
              <p className={clsx('text-red-600', styles.text)}>
                {state.error}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Weather Context Section */}
      {!state.isLoading && state.weatherContext && visibleSections.weatherContext && (
        <div className="mb-6">
          <WeatherContextDisplay
            weatherContext={state.weatherContext}
            size={size}
            showDetails={true}
          />
        </div>
      )}

      {/* Risk Enhancement Analysis */}
      {!state.isLoading && 
       state.enhancedRiskData && 
       visibleSections.riskEnhancements && 
       showAllSections && (
        <div className="mb-6">
          <div className="mb-4">
            <div className="flex items-center space-x-2 mb-3">
              <TrendingUp className={clsx('text-neutral-700', styles.icon)} />
              <h3 className={clsx('font-semibold text-neutral-900', styles.subtitle)}>
                Weather-Enhanced Risk Analysis
              </h3>
            </div>
            <p className={clsx('text-neutral-600', styles.text)}>
              Individual hazard assessments adjusted with NOAA weather data
            </p>
          </div>

          <div className={clsx('grid gap-4', 
            size === 'small' ? 'grid-cols-1' :
            size === 'medium' ? 'grid-cols-1 lg:grid-cols-2' :
            'grid-cols-1 xl:grid-cols-2'
          )}>
            {/* Show top weather-enhanced hazards */}
            {getTopWeatherEnhancedHazards(state.enhancedRiskData).map(({ hazardType, hazardData }) => (
              <WeatherRiskEnhancement
                key={hazardType}
                hazardType={hazardType}
                originalHazard={hazardData}
                size={size}
              />
            ))}
          </div>
        </div>
      )}

      {/* Historical Weather Timeline */}
      {!state.isLoading && 
       state.historicalEvents.length > 0 && 
       visibleSections.historicalTimeline && 
       showAllSections && (
        <div className="mb-6">
          <HistoricalWeatherTimeline
            events={state.historicalEvents}
            size={size}
            maxEvents={20}
            showFilters={true}
          />
        </div>
      )}

      {/* Weather Data Summary */}
      {!state.isLoading && state.lastUpdated && (
        <div className="pt-4 border-t border-neutral-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Calendar className={clsx('text-neutral-500', styles.icon)} />
              <span className={clsx('text-neutral-600', styles.text)}>
                Weather data last updated: {new Date(state.lastUpdated).toLocaleString()}
              </span>
            </div>
            
            <div className="flex items-center space-x-4">
              {state.weatherContext && (
                <div className={clsx('text-neutral-600', styles.text)}>
                  Confidence: {Math.round(state.weatherContext.weather_confidence_score * 100)}%
                </div>
              )}
              
              <div className={clsx('text-neutral-600', styles.text)}>
                {state.historicalEvents.length} historical events
              </div>
            </div>
          </div>
        </div>
      )}

      {/* No Weather Data Available */}
      {!state.isLoading && !state.weatherContext && !state.error && (
        <div className="text-center py-8">
          <Cloud className={clsx('text-neutral-400 mx-auto mb-3', styles.icon)} />
          <p className={clsx('text-neutral-600', styles.text)}>
            Weather intelligence not available for this location
          </p>
          <button
            onClick={loadWeatherData}
            className={clsx(
              'mt-3 px-4 py-2 bg-seawater-primary text-white rounded-lg hover:bg-seawater-primary/90 transition-colors',
              styles.text
            )}
          >
            Retry Loading Weather Data
          </button>
        </div>
      )}
    </div>
  );
});

// Helper function to get top weather-enhanced hazards
function getTopWeatherEnhancedHazards(
  riskData: PropertyRiskData
): Array<{ hazardType: HazardType; hazardData: any }> {
  const weatherEnhancedHazards = Object.entries(riskData.risk_assessment.hazards)
    .filter(([_, hazardData]) => 
      hazardData && 
      hazardData.weather_adjusted_score !== undefined &&
      Math.abs(hazardData.weather_adjusted_score - hazardData.score) > 1
    )
    .map(([hazardType, hazardData]) => ({
      hazardType: hazardType as HazardType,
      hazardData,
      scoreDifference: Math.abs(hazardData!.weather_adjusted_score! - hazardData!.score)
    }))
    .sort((a, b) => b.scoreDifference - a.scoreDifference)
    .slice(0, 4); // Show top 4 most weather-affected hazards

  return weatherEnhancedHazards;
}

WeatherDashboard.displayName = 'WeatherDashboard';