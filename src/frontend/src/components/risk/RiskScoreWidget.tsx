import React, { memo, useMemo } from 'react';
import { TrendingUp, TrendingDown, Info, AlertTriangle } from 'lucide-react';
import { clsx } from 'clsx';
import { HazardType, RiskLevel, MultiSourceScore, ComponentSize } from '@types';
import { getRiskLevelColor, getRiskLevelIcon } from '@utils/risk';
import { formatDate } from '@utils/formatting';

interface RiskScoreWidgetProps extends ComponentSize {
  hazardType: HazardType;
  scores: MultiSourceScore;
  showSources?: boolean;
  showProjections?: boolean;
  projections30yr?: number;
  lastUpdated?: string;
  confidence?: number;
  interactive?: boolean;
  onClick?: (data: RiskScoreData) => void;
  className?: string;
}

interface RiskScoreData {
  hazardType: HazardType;
  currentScore: number;
  riskLevel: RiskLevel;
  sources: MultiSourceScore;
  projections30yr?: number;
  confidence?: number;
}

const HAZARD_LABELS: Record<HazardType, string> = {
  flood: 'Flood Risk',
  wildfire: 'Wildfire Risk',
  hurricane: 'Hurricane Risk',
  tornado: 'Tornado Risk',
  earthquake: 'Earthquake Risk',
  heat: 'Extreme Heat Risk',
  drought: 'Drought Risk',
  hail: 'Hail Risk',
};

const HAZARD_ICONS: Record<HazardType, string> = {
  flood: '🌊',
  wildfire: '🔥',
  hurricane: '🌀',
  tornado: '🌪️',
  earthquake: '🏠',
  heat: '🌡️',
  drought: '🏜️',
  hail: '🧊',
};

const HAZARD_DESCRIPTIONS: Record<HazardType, string> = {
  flood: 'Potential for flooding from rivers, coastal storms, or heavy rainfall',
  wildfire: 'Risk of wildfire ignition and spread in the surrounding area',
  hurricane: 'Exposure to hurricane-force winds and storm surge',
  tornado: 'Likelihood of tornado activity and associated wind damage',
  earthquake: 'Seismic activity and potential for ground shaking',
  heat: 'Risk of dangerous heat conditions and heat-related health impacts',
  drought: 'Potential for water scarcity and drought conditions',
  hail: 'Risk of hail damage from severe thunderstorms',
};

export const RiskScoreWidget: React.FC<RiskScoreWidgetProps> = memo(({
  hazardType,
  scores,
  showSources = false,
  showProjections = false,
  projections30yr,
  lastUpdated,
  confidence,
  interactive = false,
  onClick,
  size = 'medium',
  className,
}) => {
  // Calculate aggregate score from multiple sources
  const aggregateData = useMemo(() => {
    const sourceScores = Object.values(scores).filter(Boolean).map(source => source.score);
    
    if (sourceScores.length === 0) {
      return {
        score: 0,
        riskLevel: 'LOW' as RiskLevel,
        sourceCount: 0,
      };
    }
    
    // Weighted average (all sources equal weight for now)
    const avgScore = sourceScores.reduce((sum, score) => sum + score, 0) / sourceScores.length;
    
    // Determine risk level
    const riskLevel: RiskLevel = 
      avgScore >= 80 ? 'EXTREME' :
      avgScore >= 60 ? 'VERY_HIGH' :
      avgScore >= 40 ? 'HIGH' :
      avgScore >= 20 ? 'MODERATE' : 'LOW';
    
    return {
      score: Math.round(avgScore),
      riskLevel,
      sourceCount: sourceScores.length,
    };
  }, [scores]);
  
  // Projection trend
  const projectionTrend = useMemo(() => {
    if (!projections30yr || !aggregateData.score) return null;
    
    const change = projections30yr - aggregateData.score;
    const changePercent = Math.round((change / aggregateData.score) * 100);
    
    return {
      change,
      changePercent,
      direction: change > 0 ? 'up' : change < 0 ? 'down' : 'stable',
    };
  }, [projections30yr, aggregateData.score]);
  
  // Handle click
  const handleClick = () => {
    if (interactive && onClick) {
      const data: RiskScoreData = {
        hazardType,
        currentScore: aggregateData.score,
        riskLevel: aggregateData.riskLevel,
        sources: scores,
        projections30yr,
        confidence,
      };
      onClick(data);
    }
  };
  
  // Size-based styles
  const sizeStyles = {
    small: {
      container: 'p-3',
      icon: 'text-lg',
      score: 'text-xl',
      label: 'text-xs',
      description: 'text-xs',
    },
    medium: {
      container: 'p-4',
      icon: 'text-2xl',
      score: 'text-2xl',
      label: 'text-sm',
      description: 'text-sm',
    },
    large: {
      container: 'p-6',
      icon: 'text-3xl',
      score: 'text-3xl',
      label: 'text-base',
      description: 'text-base',
    },
  };
  
  const styles = sizeStyles[size];
  const riskColor = getRiskLevelColor(aggregateData.riskLevel);
  const riskIcon = getRiskLevelIcon(aggregateData.riskLevel);
  
  return (
    <div
      className={clsx(
        'card',
        'transition-all duration-200',
        interactive && 'cursor-pointer hover:shadow-card-hover hover:scale-[1.02]',
        `shadow-risk-${aggregateData.riskLevel.toLowerCase()}`,
        styles.container,
        className
      )}
      onClick={handleClick}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={interactive ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      } : undefined}
      aria-label={interactive ? `View details for ${HAZARD_LABELS[hazardType]}` : undefined}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-2">
          <span className={styles.icon}>{HAZARD_ICONS[hazardType]}</span>
          <div>
            <h3 className={clsx('font-semibold text-neutral-900', styles.label)}>
              {HAZARD_LABELS[hazardType]}
            </h3>
            {size !== 'small' && (
              <p className={clsx('text-neutral-600 mt-1', styles.description)}>
                {HAZARD_DESCRIPTIONS[hazardType]}
              </p>
            )}
          </div>
        </div>
        
        {confidence && (
          <div className="flex items-center text-neutral-500">
            <Info className="h-4 w-4 mr-1" />
            <span className="text-xs">{Math.round(confidence * 100)}%</span>
          </div>
        )}
      </div>
      
      {/* Main Score Display */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <span className="text-2xl">{riskIcon}</span>
          <div>
            <div className={clsx('font-bold', riskColor, styles.score)}>
              {aggregateData.score}
            </div>
            <div className={clsx('text-neutral-600', styles.label)}>
              {aggregateData.riskLevel.replace('_', ' ')}
            </div>
          </div>
        </div>
        
        {/* Projection Trend */}
        {showProjections && projectionTrend && (
          <div className="text-right">
            <div className="flex items-center justify-end space-x-1">
              {projectionTrend.direction === 'up' ? (
                <TrendingUp className={clsx('h-4 w-4', 
                  projectionTrend.change > 10 ? 'text-error' : 'text-warning'
                )} />
              ) : projectionTrend.direction === 'down' ? (
                <TrendingDown className="h-4 w-4 text-success" />
              ) : (
                <div className="h-4 w-4" />
              )}
              <span className={clsx(
                'text-sm font-medium',
                projectionTrend.direction === 'up' && projectionTrend.change > 10 ? 'text-error' :
                projectionTrend.direction === 'up' ? 'text-warning' :
                projectionTrend.direction === 'down' ? 'text-success' : 'text-neutral-600'
              )}>
                {projectionTrend.changePercent > 0 ? '+' : ''}{projectionTrend.changePercent}%
              </span>
            </div>
            <div className={clsx('text-neutral-500', styles.description)}>
              by 2050
            </div>
          </div>
        )}
      </div>
      
      {/* Risk Bar */}
      <div className="mb-4">
        <div className="risk-bar">
          <div
            className={clsx(
              'h-full rounded-full transition-all duration-500',
              getRiskBarFillClass(aggregateData.riskLevel)
            )}
            style={{ width: `${aggregateData.score}%` }}
          />
        </div>
        {size !== 'small' && (
          <div className="flex justify-between text-xs text-neutral-500 mt-1">
            <span>Low Risk</span>
            <span>High Risk</span>
          </div>
        )}
      </div>
      
      {/* Data Sources */}
      {showSources && aggregateData.sourceCount > 0 && (
        <div className="space-y-2">
          <div className={clsx('font-medium text-neutral-700', styles.description)}>
            Data Sources ({aggregateData.sourceCount})
          </div>
          <div className="grid grid-cols-1 gap-2">
            {Object.entries(scores).filter(([_, source]) => source).map(([sourceName, source]) => (
              <div key={sourceName} className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className={clsx(
                    'w-2 h-2 rounded-full',
                    source!.score >= 70 ? 'bg-error' :
                    source!.score >= 40 ? 'bg-warning' : 'bg-success'
                  )} />
                  <span className={clsx('text-neutral-600 capitalize', styles.description)}>
                    {sourceName}
                  </span>
                </div>
                <span className={clsx('font-medium text-neutral-900', styles.description)}>
                  {source!.score}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Last Updated */}
      {lastUpdated && size !== 'small' && (
        <div className="mt-4 pt-3 border-t border-neutral-200">
          <div className={clsx('text-neutral-500 flex items-center', styles.description)}>
            <AlertTriangle className="h-3 w-3 mr-1" />
            Updated {formatDate(lastUpdated)}
          </div>
        </div>
      )}
      
      {/* Interactive Indicator */}
      {interactive && (
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-2 h-2 bg-seawater-primary rounded-full" />
        </div>
      )}
    </div>
  );
});

RiskScoreWidget.displayName = 'RiskScoreWidget';

// Helper function to get risk bar fill class
function getRiskBarFillClass(riskLevel: RiskLevel): string {
  switch (riskLevel) {
    case 'LOW':
      return 'risk-bar-fill-low';
    case 'MODERATE':
      return 'risk-bar-fill-moderate';
    case 'HIGH':
      return 'risk-bar-fill-high';
    case 'VERY_HIGH':
    case 'EXTREME':
      return 'risk-bar-fill-extreme';
    default:
      return 'risk-bar-fill-low';
  }
}