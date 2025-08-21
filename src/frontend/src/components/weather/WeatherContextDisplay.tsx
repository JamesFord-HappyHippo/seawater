import React, { memo } from 'react';
import { 
  CloudRain, 
  Thermometer, 
  Wind, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  Calendar,
  Clock,
  Info
} from 'lucide-react';
import { clsx } from 'clsx';
import { 
  NOAAWeatherContextSummary, 
  HazardType,
  ComponentSize 
} from '../../types';
import { formatDate } from '../../utils/formatting';

interface WeatherContextDisplayProps extends ComponentSize {
  weatherContext: NOAAWeatherContextSummary;
  showDetails?: boolean;
  className?: string;
}

const HAZARD_ICONS: Record<HazardType, string> = {
  flood: '🌊',
  wildfire: '🔥',
  hurricane: '🌀',
  tornado: '🌪️',
  earthquake: '🏠',
  heat: '🌡️',
  drought: '🏜️',
  hail: '🧊',
  avalanche: '🏔️',
  coastal_flooding: '🌊',
  cold_wave: '🥶',
  ice_storm: '🧊',
  landslide: '🗻',
  lightning: '⚡',
  riverine_flooding: '🌊',
  strong_wind: '💨',
  tsunami: '🌊',
  volcanic_activity: '🌋',
  winter_weather: '❄️'
};

const TREND_COLORS = {
  increasing: 'text-error',
  decreasing: 'text-success',
  stable: 'text-neutral-600'
};

const TREND_ICONS = {
  increasing: TrendingUp,
  decreasing: TrendingDown,
  stable: () => <div className="w-4 h-4 border-b-2 border-neutral-400" />
};

export const WeatherContextDisplay: React.FC<WeatherContextDisplayProps> = memo(({
  weatherContext,
  showDetails = true,
  size = 'medium',
  className
}) => {
  if (!weatherContext.has_weather_data) {
    return (
      <div className={clsx('card p-4 bg-neutral-50', className)}>
        <div className="flex items-center space-x-2 text-neutral-600">
          <Info className="h-5 w-5" />
          <span className="text-sm">Weather data not available for this location</span>
        </div>
      </div>
    );
  }

  const sizeStyles = {
    small: {
      container: 'p-3',
      title: 'text-lg',
      subtitle: 'text-sm',
      text: 'text-xs',
      icon: 'h-4 w-4'
    },
    medium: {
      container: 'p-4',
      title: 'text-xl',
      subtitle: 'text-base',
      text: 'text-sm',
      icon: 'h-5 w-5'
    },
    large: {
      container: 'p-6',
      title: 'text-2xl',
      subtitle: 'text-lg',
      text: 'text-base',
      icon: 'h-6 w-6'
    }
  };

  const styles = sizeStyles[size];

  return (
    <div className={clsx('card bg-gradient-to-br from-sky-50 to-blue-50', styles.container, className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <CloudRain className={clsx('text-sky-600', styles.icon)} />
          <h3 className={clsx('font-semibold text-neutral-900', styles.title)}>
            Weather Context
          </h3>
        </div>
        <div className="flex items-center space-x-2">
          <div className={clsx(
            'px-2 py-1 rounded-full text-xs font-medium',
            weatherContext.weather_confidence_score > 0.8 ? 'bg-success text-success-content' :
            weatherContext.weather_confidence_score > 0.6 ? 'bg-warning text-warning-content' :
            'bg-error text-error-content'
          )}>
            {Math.round(weatherContext.weather_confidence_score * 100)}% Confidence
          </div>
        </div>
      </div>

      {/* Active Alerts Section */}
      {weatherContext.active_alerts_count > 0 && (
        <div className="mb-4 p-3 bg-warning/10 border border-warning/20 rounded-lg">
          <div className="flex items-center space-x-2 mb-2">
            <AlertTriangle className={clsx('text-warning', styles.icon)} />
            <span className={clsx('font-medium text-warning-content', styles.subtitle)}>
              Active Weather Alerts
            </span>
          </div>
          <p className={clsx('text-warning-content', styles.text)}>
            {weatherContext.active_alerts_count} weather alert{weatherContext.active_alerts_count > 1 ? 's' : ''} currently active for this area
          </p>
        </div>
      )}

      {/* Climate Risk Factors */}
      <div className="mb-4">
        <h4 className={clsx('font-medium text-neutral-700 mb-3', styles.subtitle)}>
          Climate Trends
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <ClimateFactorCard
            label="Temperature"
            trend={weatherContext.climate_risk_factors.temperature_trend}
            icon={Thermometer}
            size={size}
          />
          <ClimateFactorCard
            label="Precipitation"
            trend={weatherContext.climate_risk_factors.precipitation_trend}
            icon={CloudRain}
            size={size}
          />
          <ClimateFactorCard
            label="Extreme Weather"
            trend={weatherContext.climate_risk_factors.extreme_weather_frequency}
            icon={Wind}
            size={size}
          />
        </div>
      </div>

      {/* Seasonal Risk Elevation */}
      <div className="mb-4">
        <div className="flex items-center space-x-2 mb-3">
          <Calendar className={clsx('text-neutral-600', styles.icon)} />
          <h4 className={clsx('font-medium text-neutral-700', styles.subtitle)}>
            Current Season Risk ({weatherContext.seasonal_risk_elevation.current_season})
          </h4>
        </div>
        
        {weatherContext.seasonal_risk_elevation.elevated_hazards.length > 0 ? (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              {weatherContext.seasonal_risk_elevation.elevated_hazards.map(hazard => (
                <div
                  key={hazard}
                  className="flex items-center space-x-1 px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-xs"
                >
                  <span>{HAZARD_ICONS[hazard]}</span>
                  <span className="capitalize">{hazard.replace('_', ' ')}</span>
                </div>
              ))}
            </div>
            <p className={clsx('text-neutral-600', styles.text)}>
              Risk multiplier: {weatherContext.seasonal_risk_elevation.risk_multiplier.toFixed(2)}x
            </p>
          </div>
        ) : (
          <p className={clsx('text-neutral-600', styles.text)}>
            No significantly elevated seasonal risks
          </p>
        )}
      </div>

      {/* Historical Context */}
      <div className="mb-4">
        <h4 className={clsx('font-medium text-neutral-700 mb-2', styles.subtitle)}>
          Historical Context
        </h4>
        <p className={clsx('text-neutral-600', styles.text)}>
          {weatherContext.historical_events_count} weather events recorded in analysis period
        </p>
      </div>

      {/* Weather Insights */}
      {showDetails && weatherContext.significant_weather_insights.length > 0 && (
        <div className="mb-4">
          <h4 className={clsx('font-medium text-neutral-700 mb-3', styles.subtitle)}>
            Key Insights
          </h4>
          <div className="space-y-2">
            {weatherContext.significant_weather_insights.map((insight, index) => (
              <div key={index} className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-sky-500 rounded-full mt-1.5 flex-shrink-0" />
                <p className={clsx('text-neutral-700', styles.text)}>{insight}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Last Updated */}
      <div className="pt-3 border-t border-neutral-200">
        <div className="flex items-center space-x-2 text-neutral-500">
          <Clock className={clsx('', styles.icon)} />
          <span className={styles.text}>
            Updated {formatDate(weatherContext.last_weather_update)}
          </span>
        </div>
      </div>
    </div>
  );
});

// Climate Factor Card Component
interface ClimateFactorCardProps extends ComponentSize {
  label: string;
  trend: 'increasing' | 'decreasing' | 'stable';
  icon: React.ComponentType<{ className?: string }>;
}

const ClimateFactorCard: React.FC<ClimateFactorCardProps> = memo(({
  label,
  trend,
  icon: Icon,
  size = 'medium'
}) => {
  const TrendIcon = TREND_ICONS[trend];
  const trendColor = TREND_COLORS[trend];

  const sizeStyles = {
    small: {
      container: 'p-2',
      text: 'text-xs',
      icon: 'h-3 w-3'
    },
    medium: {
      container: 'p-3',
      text: 'text-sm',
      icon: 'h-4 w-4'
    },
    large: {
      container: 'p-4',
      text: 'text-base',
      icon: 'h-5 w-5'
    }
  };

  const styles = sizeStyles[size];

  return (
    <div className={clsx('bg-white rounded-lg border border-neutral-200', styles.container)}>
      <div className="flex items-center justify-between mb-1">
        <Icon className={clsx('text-neutral-600', styles.icon)} />
        <TrendIcon className={clsx(trendColor, styles.icon)} />
      </div>
      <p className={clsx('font-medium text-neutral-900', styles.text)}>{label}</p>
      <p className={clsx('capitalize', trendColor, styles.text)}>{trend}</p>
    </div>
  );
});

ClimateFactorCard.displayName = 'ClimateFactorCard';
WeatherContextDisplay.displayName = 'WeatherContextDisplay';