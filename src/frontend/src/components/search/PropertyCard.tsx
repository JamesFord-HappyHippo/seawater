import React, { memo } from 'react';
import { MapPin, Eye, GitCompare, Share2, AlertTriangle, TrendingUp, Calendar } from 'lucide-react';
import { clsx } from 'clsx';
import { Property, RiskAssessment, RiskLevel, HazardType } from '@types';
import { formatDate, formatNumber } from '@utils/formatting';
import { getRiskLevelColor, getRiskLevelIcon } from '@utils/risk';

interface PropertyCardProps {
  address: string;
  riskData: RiskAssessment;
  property?: Property;
  showComparison?: boolean;
  compactView?: boolean;
  onViewDetails: () => void;
  onCompare?: () => void;
  onShare?: () => void;
  className?: string;
  isSelected?: boolean;
  isLoading?: boolean;
}

const HAZARD_LABELS: Record<HazardType, string> = {
  flood: 'Flood',
  wildfire: 'Wildfire',
  hurricane: 'Hurricane',
  tornado: 'Tornado',
  earthquake: 'Earthquake',
  heat: 'Extreme Heat',
  drought: 'Drought',
  hail: 'Hail',
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

export const PropertyCard: React.FC<PropertyCardProps> = memo(({
  address,
  riskData,
  property,
  showComparison = true,
  compactView = false,
  onViewDetails,
  onCompare,
  onShare,
  className,
  isSelected = false,
  isLoading = false,
}) => {
  // Get the top hazards (those with scores > 50)
  const significantHazards = Object.entries(riskData.hazards)
    .filter(([_, hazard]) => hazard && hazard.score > 50)
    .sort(([_, a], [__, b]) => (b?.score || 0) - (a?.score || 0))
    .slice(0, 3);
  
  // Get risk level styling
  const riskLevelColor = getRiskLevelColor(riskData.risk_level);
  const riskLevelIcon = getRiskLevelIcon(riskData.risk_level);
  
  // Format confidence score
  const confidencePercent = Math.round(riskData.confidence_score * 100);
  
  // Data freshness indicator
  const getFreshnessIndicator = (freshness: string) => {
    switch (freshness) {
      case 'current':
        return { text: 'Current', color: 'text-green-600' };
      case 'stale':
        return { text: 'Stale', color: 'text-yellow-600' };
      case 'expired':
        return { text: 'Expired', color: 'text-red-600' };
      default:
        return { text: 'Unknown', color: 'text-neutral-500' };
    }
  };
  
  const freshnessInfo = getFreshnessIndicator(riskData.data_freshness);
  
  if (compactView) {
    return (
      <div
        className={clsx(
          'card card-compact',
          'cursor-pointer transition-all duration-200',
          'hover:shadow-card-hover hover:scale-[1.02]',
          isSelected && 'ring-2 ring-seawater-primary shadow-lg',
          isLoading && 'opacity-60 pointer-events-none',
          className
        )}
        onClick={onViewDetails}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onViewDetails();
          }
        }}
        aria-label={`View details for ${address}`}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center mb-1">
              <MapPin className="h-4 w-4 text-neutral-400 mr-2 flex-shrink-0" />
              <h3 className="text-sm font-medium text-neutral-900 truncate">
                {address}
              </h3>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <span className="text-2xl mr-1">{riskLevelIcon}</span>
                <div>
                  <div className={clsx('text-lg font-bold', riskLevelColor)}>
                    {riskData.overall_score}
                  </div>
                  <div className="text-xs text-neutral-500">
                    {riskData.risk_level}
                  </div>
                </div>
              </div>
              
              {significantHazards.length > 0 && (
                <div className="flex items-center space-x-2">
                  {significantHazards.map(([hazardType, hazard]) => (
                    <div key={hazardType} className="text-center">
                      <div className="text-sm">{HAZARD_ICONS[hazardType as HazardType]}</div>
                      <div className="text-xs font-medium text-neutral-700">
                        {hazard?.score}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-2 ml-4">
            {showComparison && onCompare && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onCompare();
                }}
                className="p-2 text-neutral-400 hover:text-seawater-primary focus:outline-none focus:ring-2 focus:ring-seawater-primary rounded"
                aria-label="Add to comparison"
              >
                <GitCompare className="h-4 w-4" />
              </button>
            )}
            
            {onShare && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onShare();
                }}
                className="p-2 text-neutral-400 hover:text-seawater-primary focus:outline-none focus:ring-2 focus:ring-seawater-primary rounded"
                aria-label="Share property"
              >
                <Share2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div
      className={clsx(
        'card',
        'transition-all duration-200',
        'hover:shadow-card-hover',
        isSelected && 'ring-2 ring-seawater-primary shadow-lg',
        isLoading && 'opacity-60 pointer-events-none',
        className
      )}
    >
      {/* Card Header */}
      <div className="card-header">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center mb-2">
              <MapPin className="h-5 w-5 text-neutral-400 mr-2 flex-shrink-0" />
              <h3 className="text-lg font-semibold text-neutral-900 truncate">
                {address}
              </h3>
            </div>
            
            {property && (
              <div className="flex items-center space-x-4 text-sm text-neutral-600">
                {property.property_type && (
                  <span className="capitalize">{property.property_type}</span>
                )}
                {property.year_built && (
                  <span>Built {property.year_built}</span>
                )}
                {property.square_feet && (
                  <span>{formatNumber(property.square_feet)} sq ft</span>
                )}
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-2 ml-4">
            {showComparison && onCompare && (
              <button
                type="button"
                onClick={onCompare}
                className="btn btn-secondary btn-sm"
                aria-label="Add to comparison"
              >
                <GitCompare className="h-4 w-4 mr-1" />
                Compare
              </button>
            )}
            
            {onShare && (
              <button
                type="button"
                onClick={onShare}
                className="p-2 text-neutral-400 hover:text-seawater-primary focus:outline-none focus:ring-2 focus:ring-seawater-primary rounded"
                aria-label="Share property"
              >
                <Share2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
      
      {/* Overall Risk Score */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-lg font-semibold text-neutral-800">Overall Risk</h4>
          <div className="flex items-center space-x-2 text-sm text-neutral-500">
            <Calendar className="h-4 w-4" />
            <span>Updated {formatDate(riskData.last_updated)}</span>
            <span className={clsx('font-medium', freshnessInfo.color)}>
              {freshnessInfo.text}
            </span>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center">
            <span className="text-4xl mr-3">{riskLevelIcon}</span>
            <div>
              <div className={clsx('text-3xl font-bold', riskLevelColor)}>
                {riskData.overall_score}/100
              </div>
              <div className={clsx('text-sm font-medium', riskLevelColor)}>
                {riskData.risk_level.replace('_', ' ')}
              </div>
            </div>
          </div>
          
          <div className="flex-1">
            <div className="risk-bar">
              <div
                className={clsx(
                  'h-full rounded-full transition-all duration-300',
                  getRiskBarFillClass(riskData.risk_level)
                )}
                style={{ width: `${riskData.overall_score}%` }}
              />
            </div>
            
            <div className="flex justify-between text-xs text-neutral-500 mt-1">
              <span>Low Risk</span>
              <span>High Risk</span>
            </div>
          </div>
        </div>
        
        <div className="mt-3 flex items-center justify-between text-sm">
          <div className="flex items-center text-neutral-600">
            <AlertTriangle className="h-4 w-4 mr-1" />
            <span>Confidence: {confidencePercent}%</span>
          </div>
          
          <div className="flex items-center text-neutral-600">
            <TrendingUp className="h-4 w-4 mr-1" />
            <span>Data Quality: {Math.round(riskData.data_completeness * 100)}%</span>
          </div>
        </div>
      </div>
      
      {/* Individual Hazards */}
      {significantHazards.length > 0 && (
        <div className="mb-6">
          <h4 className="text-lg font-semibold text-neutral-800 mb-3">Key Risk Factors</h4>
          <div className="space-y-3">
            {significantHazards.map(([hazardType, hazard]) => {
              if (!hazard) return null;
              
              const hazardColor = getRiskLevelColor(hazard.level);
              
              return (
                <div key={hazardType} className="flex items-center space-x-3">
                  <div className="flex items-center min-w-0 flex-1">
                    <span className="text-lg mr-2">{HAZARD_ICONS[hazardType as HazardType]}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-neutral-700">
                          {HAZARD_LABELS[hazardType as HazardType]}
                        </span>
                        <span className={clsx('text-sm font-bold', hazardColor)}>
                          {hazard.score}/100
                        </span>
                      </div>
                      <div className="risk-bar">
                        <div
                          className={clsx(
                            'h-full rounded-full transition-all duration-300',
                            getRiskBarFillClass(hazard.level)
                          )}
                          style={{ width: `${hazard.score}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      
      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-4 border-t border-neutral-200">
        <div className="text-sm text-neutral-500">
          Based on {Object.keys(riskData.hazards).length} risk factors
        </div>
        
        <button
          type="button"
          onClick={onViewDetails}
          className="btn btn-primary"
        >
          <Eye className="h-4 w-4 mr-2" />
          View Details
        </button>
      </div>
      
      {isLoading && (
        <div className="absolute inset-0 bg-white/50 flex items-center justify-center rounded-2xl">
          <div className="spinner" />
        </div>
      )}
    </div>
  );
});

PropertyCard.displayName = 'PropertyCard';

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