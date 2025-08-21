import React, { memo } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Calendar,
  Thermometer,
  CloudRain,
  Wind,
  AlertTriangle,
  CheckCircle,
  Info,
  BarChart3
} from 'lucide-react';
import { clsx } from 'clsx';
import { 
  HazardAssessment,
  HazardType,
  ComponentSize 
} from '../../types';

interface WeatherRiskEnhancementProps extends ComponentSize {
  hazardType: HazardType;
  originalHazard: HazardAssessment;
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

const FACTOR_ICONS = {
  historical_frequency: BarChart3,
  seasonal_factor: Calendar,
  climate_trend: TrendingUp,
  current_conditions: Wind
};

const FACTOR_LABELS = {
  historical_frequency: 'Historical Events',
  seasonal_factor: 'Seasonal Factor',
  climate_trend: 'Climate Trend',
  current_conditions: 'Current Conditions'
};

const FACTOR_DESCRIPTIONS = {
  historical_frequency: 'Adjustment based on historical weather event frequency in this area',
  seasonal_factor: 'Current season risk multiplier based on typical weather patterns',
  climate_trend: 'Long-term climate change impact on this hazard type',
  current_conditions: 'Real-time weather conditions affecting immediate risk'
};

export const WeatherRiskEnhancement: React.FC<WeatherRiskEnhancementProps> = memo(({
  hazardType,
  originalHazard,
  size = 'medium',
  className
}) => {
  const hasWeatherEnhancement = originalHazard.weather_adjusted_score !== undefined;
  
  if (!hasWeatherEnhancement) {
    return (
      <div className={clsx('card p-4 bg-neutral-50', className)}>
        <div className="flex items-center space-x-2 text-neutral-600">
          <Info className="h-5 w-5" />
          <span className="text-sm">Weather enhancement not available for this hazard</span>
        </div>
      </div>
    );
  }

  const originalScore = originalHazard.score;
  const weatherAdjustedScore = originalHazard.weather_adjusted_score!;
  const adjustmentFactors = originalHazard.weather_adjustment_factors!;
  
  const scoreDifference = weatherAdjustedScore - originalScore;
  const scoreChangePercent = originalScore > 0 ? ((scoreDifference / originalScore) * 100) : 0;
  
  const sizeStyles = {
    small: {
      container: 'p-3',
      title: 'text-lg',
      subtitle: 'text-sm',
      text: 'text-xs',
      icon: 'h-4 w-4',
      hazardIcon: 'text-lg'
    },
    medium: {
      container: 'p-4',
      title: 'text-xl',
      subtitle: 'text-base',
      text: 'text-sm',
      icon: 'h-5 w-5',
      hazardIcon: 'text-xl'
    },
    large: {
      container: 'p-6',
      title: 'text-2xl',
      subtitle: 'text-lg',
      text: 'text-base',
      icon: 'h-6 w-6',
      hazardIcon: 'text-2xl'
    }
  };

  const styles = sizeStyles[size];

  return (
    <div className={clsx('card', styles.container, className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <span className={styles.hazardIcon}>{HAZARD_ICONS[hazardType]}</span>
          <div>
            <h3 className={clsx('font-semibold text-neutral-900 capitalize', styles.title)}>
              {hazardType.replace('_', ' ')} Weather Enhancement
            </h3>
            <p className={clsx('text-neutral-600', styles.text)}>
              Risk score adjusted using NOAA weather data
            </p>
          </div>
        </div>
      </div>

      {/* Score Comparison */}
      <div className="mb-6">
        <div className="grid grid-cols-2 gap-4">
          {/* Original Score */}
          <div className="bg-neutral-50 rounded-lg p-4 text-center">
            <div className={clsx('text-neutral-600 mb-1', styles.text)}>Original Score</div>
            <div className={clsx('font-bold text-neutral-900', styles.title)}>{originalScore}</div>
            <div className={clsx('text-neutral-500', styles.text)}>Base assessment</div>
          </div>

          {/* Weather-Adjusted Score */}
          <div className={clsx(
            'rounded-lg p-4 text-center',
            scoreDifference > 5 ? 'bg-red-50 border border-red-200' :
            scoreDifference < -5 ? 'bg-green-50 border border-green-200' :
            'bg-blue-50 border border-blue-200'
          )}>
            <div className={clsx('text-neutral-600 mb-1', styles.text)}>Weather-Adjusted</div>
            <div className={clsx('font-bold', styles.title,
              scoreDifference > 5 ? 'text-red-700' :
              scoreDifference < -5 ? 'text-green-700' :
              'text-blue-700'
            )}>
              {weatherAdjustedScore}
            </div>
            <div className={clsx('flex items-center justify-center space-x-1', styles.text)}>
              {Math.abs(scoreDifference) > 1 && (
                <>
                  {scoreDifference > 0 ? (
                    <TrendingUp className={clsx('text-red-500', styles.icon)} />
                  ) : (
                    <TrendingDown className={clsx('text-green-500', styles.icon)} />
                  )}
                  <span className={clsx(
                    scoreDifference > 0 ? 'text-red-600' : 'text-green-600'
                  )}>
                    {scoreDifference > 0 ? '+' : ''}{scoreDifference.toFixed(0)} 
                    ({scoreChangePercent > 0 ? '+' : ''}{scoreChangePercent.toFixed(1)}%)
                  </span>
                </>
              )}
              {Math.abs(scoreDifference) <= 1 && (
                <span className="text-neutral-600">No significant change</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Adjustment Factors */}
      <div className="mb-6">
        <h4 className={clsx('font-medium text-neutral-700 mb-4', styles.subtitle)}>
          Weather Adjustment Factors
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {Object.entries(adjustmentFactors).map(([factorKey, factorValue]) => {
            const IconComponent = FACTOR_ICONS[factorKey as keyof typeof FACTOR_ICONS];
            const label = FACTOR_LABELS[factorKey as keyof typeof FACTOR_LABELS];
            const description = FACTOR_DESCRIPTIONS[factorKey as keyof typeof FACTOR_DESCRIPTIONS];
            
            return (
              <AdjustmentFactorCard
                key={factorKey}
                icon={IconComponent}
                label={label}
                value={factorValue}
                description={description}
                size={size}
              />
            );
          })}
        </div>
      </div>

      {/* Weather Impact Summary */}
      <div className="mb-4">
        <h4 className={clsx('font-medium text-neutral-700 mb-3', styles.subtitle)}>
          Weather Impact Summary
        </h4>
        
        <div className={clsx(
          'p-3 rounded-lg border',
          Math.abs(scoreDifference) <= 1 ? 'bg-blue-50 border-blue-200' :
          scoreDifference > 5 ? 'bg-red-50 border-red-200' :
          scoreDifference < -5 ? 'bg-green-50 border-green-200' :
          scoreDifference > 0 ? 'bg-orange-50 border-orange-200' :
          'bg-green-50 border-green-200'
        )}>
          <div className="flex items-start space-x-3">
            {Math.abs(scoreDifference) <= 1 ? (
              <CheckCircle className={clsx('text-blue-600 flex-shrink-0 mt-0.5', styles.icon)} />
            ) : scoreDifference > 5 ? (
              <AlertTriangle className={clsx('text-red-600 flex-shrink-0 mt-0.5', styles.icon)} />
            ) : (
              <Info className={clsx('text-orange-600 flex-shrink-0 mt-0.5', styles.icon)} />
            )}
            
            <div>
              <p className={clsx('font-medium', styles.text,
                Math.abs(scoreDifference) <= 1 ? 'text-blue-800' :
                scoreDifference > 5 ? 'text-red-800' :
                scoreDifference < -5 ? 'text-green-800' :
                scoreDifference > 0 ? 'text-orange-800' :
                'text-green-800'
              )}>
                {Math.abs(scoreDifference) <= 1 ? 'Weather conditions have minimal impact on risk' :
                 scoreDifference > 10 ? 'Weather conditions significantly increase risk' :
                 scoreDifference > 5 ? 'Weather conditions moderately increase risk' :
                 scoreDifference < -10 ? 'Weather conditions significantly reduce risk' :
                 scoreDifference < -5 ? 'Weather conditions moderately reduce risk' :
                 scoreDifference > 0 ? 'Weather conditions slightly increase risk' :
                 'Weather conditions slightly reduce risk'}
              </p>
              
              <p className={clsx('text-neutral-600 mt-1', styles.text)}>
                {getWeatherImpactExplanation(hazardType, adjustmentFactors, scoreDifference)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Confidence Score */}
      <div className="pt-3 border-t border-neutral-200">
        <div className="flex items-center justify-between">
          <span className={clsx('text-neutral-600', styles.text)}>
            Weather Enhancement Confidence
          </span>
          <div className={clsx(
            'px-2 py-1 rounded-full text-xs font-medium',
            (originalHazard.confidence || 0.8) > 0.8 ? 'bg-success text-success-content' :
            (originalHazard.confidence || 0.8) > 0.6 ? 'bg-warning text-warning-content' :
            'bg-error text-error-content'
          )}>
            {Math.round((originalHazard.confidence || 0.8) * 100)}%
          </div>
        </div>
      </div>
    </div>
  );
});

// Adjustment Factor Card Component
interface AdjustmentFactorCardProps extends ComponentSize {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  description: string;
}

const AdjustmentFactorCard: React.FC<AdjustmentFactorCardProps> = memo(({
  icon: Icon,
  label,
  value,
  description,
  size = 'medium'
}) => {
  const isNeutral = Math.abs(value - 1.0) < 0.05;
  const isIncrease = value > 1.0;
  
  const sizeStyles = {
    small: {
      container: 'p-2',
      text: 'text-xs',
      icon: 'h-3 w-3',
      value: 'text-sm'
    },
    medium: {
      container: 'p-3',
      text: 'text-sm',
      icon: 'h-4 w-4',
      value: 'text-base'
    },
    large: {
      container: 'p-4',
      text: 'text-base',
      icon: 'h-5 w-5',
      value: 'text-lg'
    }
  };

  const styles = sizeStyles[size];

  return (
    <div className={clsx(
      'border rounded-lg transition-colors',
      styles.container,
      isNeutral ? 'bg-neutral-50 border-neutral-200' :
      isIncrease ? 'bg-red-50 border-red-200' :
      'bg-green-50 border-green-200'
    )}>
      <div className="flex items-center justify-between mb-2">
        <Icon className={clsx('text-neutral-600', styles.icon)} />
        <div className={clsx(
          'font-semibold',
          styles.value,
          isNeutral ? 'text-neutral-700' :
          isIncrease ? 'text-red-700' :
          'text-green-700'
        )}>
          {value.toFixed(2)}x
        </div>
      </div>
      
      <h5 className={clsx('font-medium text-neutral-900 mb-1', styles.text)}>
        {label}
      </h5>
      
      <p className={clsx('text-neutral-600', styles.text)}>
        {description}
      </p>
      
      {!isNeutral && (
        <div className="mt-2">
          <div className={clsx(
            'inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium',
            isIncrease ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
          )}>
            {isIncrease ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            <span>
              {isIncrease ? 'Increases' : 'Reduces'} risk by {Math.abs((value - 1.0) * 100).toFixed(0)}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
});

// Helper function to generate weather impact explanations
function getWeatherImpactExplanation(
  hazardType: HazardType,
  factors: Record<string, number>,
  scoreDifference: number
): string {
  const dominantFactor = Object.entries(factors)
    .sort(([,a], [,b]) => Math.abs(b - 1.0) - Math.abs(a - 1.0))[0];
  
  const factorName = FACTOR_LABELS[dominantFactor[0] as keyof typeof FACTOR_LABELS];
  const factorValue = dominantFactor[1];
  
  if (Math.abs(factorValue - 1.0) < 0.05) {
    return 'Current weather patterns align with typical risk levels for this hazard.';
  }
  
  const direction = factorValue > 1.0 ? 'increase' : 'decrease';
  const magnitude = Math.abs(factorValue - 1.0) > 0.2 ? 'significantly' : 'moderately';
  
  const hazardContext = {
    flood: factorValue > 1.0 ? 'due to recent precipitation or seasonal flooding patterns' : 'due to dry conditions or improved drainage',
    wildfire: factorValue > 1.0 ? 'due to dry conditions and fire weather patterns' : 'due to moisture or reduced fire weather risk',
    hurricane: factorValue > 1.0 ? 'during active hurricane season or favorable conditions' : 'outside peak season or unfavorable conditions',
    heat: factorValue > 1.0 ? 'during hot weather periods or heat dome conditions' : 'during cooler periods or improved ventilation',
    drought: factorValue > 1.0 ? 'due to persistent dry conditions' : 'due to adequate precipitation',
    tornado: factorValue > 1.0 ? 'during peak tornado season or unstable atmospheric conditions' : 'during quieter weather periods',
    hail: factorValue > 1.0 ? 'during severe thunderstorm season' : 'during stable atmospheric conditions',
    // Additional FEMA hazards
    avalanche: factorValue > 1.0 ? 'due to snow accumulation and unstable slope conditions' : 'due to stable snow conditions',
    coastal_flooding: factorValue > 1.0 ? 'due to storm surge or high tide conditions' : 'due to calm coastal conditions',
    cold_wave: factorValue > 1.0 ? 'during arctic air mass intrusions' : 'during milder weather patterns',
    ice_storm: factorValue > 1.0 ? 'during freezing rain events' : 'during stable temperature conditions',
    landslide: factorValue > 1.0 ? 'due to saturated soil and slope instability' : 'due to stable ground conditions',
    lightning: factorValue > 1.0 ? 'during thunderstorm activity' : 'during clear weather conditions',
    riverine_flooding: factorValue > 1.0 ? 'due to upstream precipitation or snowmelt' : 'due to normal river levels',
    strong_wind: factorValue > 1.0 ? 'during high pressure gradient conditions' : 'during calm weather patterns',
    tsunami: factorValue > 1.0 ? 'based on seismic activity patterns' : 'during stable seismic conditions',
    volcanic_activity: factorValue > 1.0 ? 'based on geological monitoring data' : 'during dormant periods',
    winter_weather: factorValue > 1.0 ? 'during active winter storm patterns' : 'during mild winter conditions',
    earthquake: factorValue > 1.0 ? 'based on geological stress patterns' : 'during stable geological conditions'
  }[hazardType] || 'based on current weather patterns';
  
  return `${factorName} ${magnitude} ${direction}s risk ${hazardContext}.`;
}

AdjustmentFactorCard.displayName = 'AdjustmentFactorCard';
WeatherRiskEnhancement.displayName = 'WeatherRiskEnhancement';