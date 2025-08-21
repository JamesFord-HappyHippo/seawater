import React, { useState, useMemo } from 'react';
import { X, ArrowUpDown, Download, Share2, Crown, AlertTriangle, TrendingDown } from 'lucide-react';
import { clsx } from 'clsx';
import { PropertyComparison as PropertyComparisonType, HazardType, RiskLevel } from '../../types';
import { getRiskLevelColor, getRiskLevelIcon } from '../../utils/risk';
import { formatNumber } from '../../utils/formatting';

interface PropertyComparisonProps {
  data: PropertyComparisonType;
  onRemoveProperty: (propertyId: string) => void;
  onExport?: () => void;
  onShare?: () => void;
  className?: string;
  maxProperties?: number;
}

const HAZARD_LABELS: Record<HazardType, string> = {
  flood: 'Flood',
  wildfire: 'Wildfire',
  hurricane: 'Hurricane',
  tornado: 'Tornado',
  earthquake: 'Earthquake',
  heat: 'Heat',
  drought: 'Drought',
  hail: 'Hail',
  // Additional FEMA hazards
  avalanche: 'Avalanche',
  coastal_flooding: 'Coastal Flooding',
  cold_wave: 'Cold Wave',
  ice_storm: 'Ice Storm',
  landslide: 'Landslide',
  lightning: 'Lightning',
  riverine_flooding: 'Riverine Flooding',
  strong_wind: 'Strong Wind',
  tsunami: 'Tsunami',
  volcanic_activity: 'Volcanic Activity',
  winter_weather: 'Winter Weather',
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
  // Additional FEMA hazards
  avalanche: '⛷️',
  coastal_flooding: '🌊',
  cold_wave: '🥶',
  ice_storm: '🧊',
  landslide: '⛰️',
  lightning: '⚡',
  riverine_flooding: '🌊',
  strong_wind: '💨',
  tsunami: '🌊',
  volcanic_activity: '🌋',
  winter_weather: '❄️',
};

type SortField = 'overall_score' | 'rank' | HazardType;
type SortDirection = 'asc' | 'desc';

export const PropertyComparison: React.FC<PropertyComparisonProps> = ({
  data,
  onRemoveProperty,
  onExport,
  onShare,
  className,
  maxProperties = 4,
}) => {
  const [sortField, setSortField] = useState<SortField>('rank');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [viewMode, setViewMode] = useState<'side-by-side' | 'table'>('side-by-side');
  
  // Get all unique hazard types from the data
  const allHazardTypes = useMemo(() => {
    const hazardSet = new Set<HazardType>();
    data.properties.forEach(property => {
      Object.keys(property.risk_assessment.hazards).forEach(hazard => {
        hazardSet.add(hazard as HazardType);
      });
    });
    return Array.from(hazardSet).sort();
  }, [data.properties]);
  
  // Sort properties based on current sort settings
  const sortedProperties = useMemo(() => {
    const sorted = [...data.properties].sort((a, b) => {
      let aValue: number;
      let bValue: number;
      
      if (sortField === 'overall_score') {
        aValue = a.risk_assessment.overall_score;
        bValue = b.risk_assessment.overall_score;
      } else if (sortField === 'rank') {
        aValue = a.rank;
        bValue = b.rank;
      } else {
        // Hazard type
        aValue = a.risk_assessment.hazards[sortField]?.score || 0;
        bValue = b.risk_assessment.hazards[sortField]?.score || 0;
      }
      
      const modifier = sortDirection === 'asc' ? 1 : -1;
      return (aValue - bValue) * modifier;
    });
    
    return sorted;
  }, [data.properties, sortField, sortDirection]);
  
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection(field === 'overall_score' || allHazardTypes.includes(field as HazardType) ? 'desc' : 'asc');
    }
  };
  
  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-4 w-4 opacity-0 group-hover:opacity-100" />;
    }
    return (
      <ArrowUpDown className={clsx(
        'h-4 w-4',
        sortDirection === 'desc' && 'rotate-180'
      )} />
    );
  };
  
  const getRankBadge = (rank: number) => {
    const badges = {
      1: { icon: Crown, color: 'text-yellow-600 bg-yellow-50', label: 'Best Choice' },
      2: { icon: TrendingDown, color: 'text-blue-600 bg-blue-50', label: 'Good Option' },
      3: { icon: AlertTriangle, color: 'text-orange-600 bg-orange-50', label: 'Consider' },
    };
    
    const badge = badges[rank as keyof typeof badges];
    if (!badge) return null;
    
    const Icon = badge.icon;
    
    return (
      <div className={clsx(
        'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
        badge.color
      )}>
        <Icon className="h-3 w-3 mr-1" />
        {badge.label}
      </div>
    );
  };
  
  if (viewMode === 'table') {
    return (
      <div className={clsx('card', className)}>
        {/* Header */}
        <div className="card-header">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="card-title">Property Risk Comparison</h3>
              <p className="text-sm text-neutral-600 mt-1">
                Comparing {data.properties.length} properties
              </p>
            </div>
            
            <div className="flex items-center space-x-2">
              <div className="flex items-center bg-neutral-100 rounded-lg p-1">
                <button
                  type="button"
                  onClick={() => setViewMode('side-by-side')}
                  className="px-3 py-1 text-sm rounded-md text-neutral-600 hover:text-neutral-900"
                >
                  Cards
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  className="px-3 py-1 text-sm bg-white rounded-md shadow-sm text-neutral-900 font-medium"
                >
                  Table
                </button>
              </div>
              
              {onExport && (
                <button
                  type="button"
                  onClick={onExport}
                  className="btn btn-secondary btn-sm"
                  aria-label="Export comparison"
                >
                  <Download className="h-4 w-4" />
                </button>
              )}
              
              {onShare && (
                <button
                  type="button"
                  onClick={onShare}
                  className="btn btn-secondary btn-sm"
                  aria-label="Share comparison"
                >
                  <Share2 className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>
        
        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-neutral-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-neutral-700">
                  Property
                </th>
                <th className="px-4 py-3 text-center">
                  <button
                    type="button"
                    onClick={() => handleSort('rank')}
                    className="group flex items-center justify-center space-x-1 text-sm font-medium text-neutral-700 hover:text-neutral-900"
                  >
                    <span>Rank</span>
                    {getSortIcon('rank')}
                  </button>
                </th>
                <th className="px-4 py-3 text-center">
                  <button
                    type="button"
                    onClick={() => handleSort('overall_score')}
                    className="group flex items-center justify-center space-x-1 text-sm font-medium text-neutral-700 hover:text-neutral-900"
                  >
                    <span>Overall Score</span>
                    {getSortIcon('overall_score')}
                  </button>
                </th>
                {allHazardTypes.map(hazardType => (
                  <th key={hazardType} className="px-4 py-3 text-center">
                    <button
                      type="button"
                      onClick={() => handleSort(hazardType)}
                      className="group flex items-center justify-center space-x-1 text-sm font-medium text-neutral-700 hover:text-neutral-900"
                    >
                      <span className="mr-1">{HAZARD_ICONS[hazardType]}</span>
                      <span>{HAZARD_LABELS[hazardType]}</span>
                      {getSortIcon(hazardType)}
                    </button>
                  </th>
                ))}
                <th className="px-4 py-3 w-16"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {sortedProperties.map((property, index) => (
                <tr
                  key={property.property.id || index}
                  className="hover:bg-neutral-50"
                >
                  <td className="px-4 py-4">
                    <div>
                      <div className="font-medium text-neutral-900 truncate max-w-xs">
                        {property.property.address}
                      </div>
                      <div className="mt-1">
                        {getRankBadge(property.rank)}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <div className="text-lg font-bold text-neutral-900">
                      #{property.rank}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <div className="flex flex-col items-center">
                      <div className={clsx(
                        'text-lg font-bold',
                        getRiskLevelColor(property.risk_assessment.risk_level)
                      )}>
                        {property.risk_assessment.overall_score}
                      </div>
                      <div className="text-xs text-neutral-500">
                        {property.risk_assessment.risk_level}
                      </div>
                    </div>
                  </td>
                  {allHazardTypes.map(hazardType => {
                    const hazard = property.risk_assessment.hazards[hazardType];
                    return (
                      <td key={hazardType} className="px-4 py-4 text-center">
                        {hazard ? (
                          <div className="flex flex-col items-center">
                            <div className={clsx(
                              'text-sm font-medium',
                              getRiskLevelColor(hazard.level)
                            )}>
                              {hazard.score}
                            </div>
                            <div className="text-xs text-neutral-500">
                              {hazard.level}
                            </div>
                          </div>
                        ) : (
                          <div className="text-neutral-400">–</div>
                        )}
                      </td>
                    );
                  })}
                  <td className="px-4 py-4">
                    <button
                      type="button"
                      onClick={() => onRemoveProperty(property.property.id || '')}
                      className="p-1 text-neutral-400 hover:text-error focus:outline-none focus:ring-2 focus:ring-error rounded"
                      aria-label="Remove property from comparison"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Summary */}
        <div className="card-header border-t border-neutral-200 mt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-seawater-primary">
                {data.analytics.lowest_risk.split(',')[0]}
              </div>
              <div className="text-sm text-neutral-600">Lowest Risk</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-error">
                {data.analytics.highest_risk.split(',')[0]}
              </div>
              <div className="text-sm text-neutral-600">Highest Risk</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-neutral-700">
                {Math.round(data.analytics.average_score)}
              </div>
              <div className="text-sm text-neutral-600">Average Score</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-neutral-700">
                {data.analytics.risk_range}
              </div>
              <div className="text-sm text-neutral-600">Risk Range</div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // Side-by-side view
  return (
    <div className={clsx('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold text-neutral-900">Property Risk Comparison</h3>
          <p className="text-neutral-600 mt-1">
            Comparing {data.properties.length} properties side by side
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <div className="flex items-center bg-neutral-100 rounded-lg p-1">
            <button
              type="button"
              onClick={() => setViewMode('side-by-side')}
              className="px-3 py-1 text-sm bg-white rounded-md shadow-sm text-neutral-900 font-medium"
            >
              Cards
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className="px-3 py-1 text-sm rounded-md text-neutral-600 hover:text-neutral-900"
            >
              Table
            </button>
          </div>
          
          {onExport && (
            <button
              type="button"
              onClick={onExport}
              className="btn btn-secondary"
              aria-label="Export comparison"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </button>
          )}
          
          {onShare && (
            <button
              type="button"
              onClick={onShare}
              className="btn btn-secondary"
              aria-label="Share comparison"
            >
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </button>
          )}
        </div>
      </div>
      
      {/* Properties Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {sortedProperties.map((property, index) => (
          <div
            key={property.property.id || index}
            className={clsx(
              'card relative',
              property.rank === 1 && 'ring-2 ring-seawater-primary shadow-lg'
            )}
          >
            {/* Remove Button */}
            <button
              type="button"
              onClick={() => onRemoveProperty(property.property.id || '')}
              className="absolute top-4 right-4 p-1 text-neutral-400 hover:text-error focus:outline-none focus:ring-2 focus:ring-error rounded z-10"
              aria-label="Remove property from comparison"
            >
              <X className="h-4 w-4" />
            </button>
            
            {/* Rank Badge */}
            <div className="mb-4">
              {getRankBadge(property.rank)}
            </div>
            
            {/* Property Info */}
            <div className="mb-4">
              <h4 className="font-semibold text-neutral-900 mb-2 pr-8 truncate">
                {property.property.address}
              </h4>
              
              {/* Overall Score */}
              <div className="flex items-center space-x-3 mb-4">
                <span className="text-3xl">
                  {getRiskLevelIcon(property.risk_assessment.risk_level)}
                </span>
                <div>
                  <div className={clsx(
                    'text-2xl font-bold',
                    getRiskLevelColor(property.risk_assessment.risk_level)
                  )}>
                    {property.risk_assessment.overall_score}
                  </div>
                  <div className="text-sm text-neutral-500">
                    {property.risk_assessment.risk_level}
                  </div>
                </div>
              </div>
              
              {/* Risk Progress Bar */}
              <div className="risk-bar mb-4">
                <div
                  className={clsx(
                    'h-full rounded-full transition-all duration-300',
                    getRiskBarFillClass(property.risk_assessment.risk_level)
                  )}
                  style={{ width: `${property.risk_assessment.overall_score}%` }}
                />
              </div>
            </div>
            
            {/* Individual Hazards */}
            <div className="space-y-3">
              {allHazardTypes.map(hazardType => {
                const hazard = property.risk_assessment.hazards[hazardType];
                return (
                  <div key={hazardType} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <span className="text-sm mr-2">{HAZARD_ICONS[hazardType]}</span>
                      <span className="text-sm font-medium text-neutral-700">
                        {HAZARD_LABELS[hazardType]}
                      </span>
                    </div>
                    {hazard ? (
                      <div className={clsx(
                        'text-sm font-bold',
                        getRiskLevelColor(hazard.level)
                      )}>
                        {hazard.score}
                      </div>
                    ) : (
                      <div className="text-sm text-neutral-400">–</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      
      {/* Summary */}
      <div className="card">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div>
            <div className="text-3xl font-bold text-seawater-primary mb-2">
              🏆
            </div>
            <div className="text-lg font-semibold text-neutral-900 truncate">
              {data.analytics.lowest_risk.split(',')[0]}
            </div>
            <div className="text-sm text-neutral-600">Best Choice</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-error mb-2">
              ⚠️
            </div>
            <div className="text-lg font-semibold text-neutral-900 truncate">
              {data.analytics.highest_risk.split(',')[0]}
            </div>
            <div className="text-sm text-neutral-600">Highest Risk</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-neutral-700 mb-2">
              {Math.round(data.analytics.average_score)}
            </div>
            <div className="text-sm text-neutral-600">Average Risk Score</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-neutral-700 mb-2">
              {data.analytics.risk_range}
            </div>
            <div className="text-sm text-neutral-600">Risk Range</div>
          </div>
        </div>
      </div>
    </div>
  );
};

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