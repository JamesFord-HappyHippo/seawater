import React, { useState, useCallback, useEffect } from 'react';
import { Map, Target, Filter, Search, MapPin, Layers, ZoomIn, ZoomOut } from 'lucide-react';
import { clsx } from 'clsx';
import { LatLng, HazardType, RiskLevel, PropertyMarker } from '@types';
import { useMapInteraction } from '@hooks/useMapInteraction';
import { useSpatialSearch } from '@hooks/useSpatialSearch';

interface GeographicSearchProps {
  onAreaSelect: (center: LatLng, radius: number) => void;
  onPropertySelect?: (property: PropertyMarker) => void;
  initialCenter?: LatLng;
  initialZoom?: number;
  maxRadius?: number;
  minRadius?: number;
  className?: string;
  enableDrawing?: boolean;
  showRiskOverlay?: boolean;
  allowMultiSelect?: boolean;
}

interface SearchFilters {
  hazard_type?: HazardType;
  min_risk_score: number;
  max_risk_score: number;
  risk_levels: RiskLevel[];
  radius_km: number;
}

const HAZARD_TYPES: Array<{ value: HazardType; label: string; icon: string }> = [
  { value: 'flood', label: 'Flood', icon: '🌊' },
  { value: 'wildfire', label: 'Wildfire', icon: '🔥' },
  { value: 'hurricane', label: 'Hurricane', icon: '🌀' },
  { value: 'tornado', label: 'Tornado', icon: '🌪️' },
  { value: 'earthquake', label: 'Earthquake', icon: '🏠' },
  { value: 'heat', label: 'Extreme Heat', icon: '🌡️' },
  { value: 'drought', label: 'Drought', icon: '🏜️' },
  { value: 'hail', label: 'Hail', icon: '🧊' },
];

const RISK_LEVELS: Array<{ value: RiskLevel; label: string; color: string }> = [
  { value: 'LOW', label: 'Low', color: 'bg-green-100 text-green-800' },
  { value: 'MODERATE', label: 'Moderate', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'HIGH', label: 'High', color: 'bg-orange-100 text-orange-800' },
  { value: 'VERY_HIGH', label: 'Very High', color: 'bg-red-100 text-red-800' },
  { value: 'EXTREME', label: 'Extreme', color: 'bg-red-200 text-red-900' },
];

export const GeographicSearch: React.FC<GeographicSearchProps> = ({
  onAreaSelect,
  onPropertySelect,
  initialCenter = { latitude: 39.8283, longitude: -98.5795 }, // Geographic center of US
  initialZoom = 4,
  maxRadius = 50,
  minRadius = 1,
  className,
  enableDrawing = true,
  showRiskOverlay = true,
  allowMultiSelect = false,
}) => {
  const [searchCenter, setSearchCenter] = useState<LatLng>(initialCenter);
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedProperties, setSelectedProperties] = useState<PropertyMarker[]>([]);
  
  const [filters, setFilters] = useState<SearchFilters>({
    min_risk_score: 0,
    max_risk_score: 100,
    risk_levels: ['LOW', 'MODERATE', 'HIGH', 'VERY_HIGH', 'EXTREME'],
    radius_km: 10,
  });
  
  // Custom hooks
  const {
    viewState,
    setViewState,
    selectedArea,
    isDrawing,
    startDrawing,
    stopDrawing,
    clearSelection,
  } = useMapInteraction({
    initialCenter,
    initialZoom,
    enableDrawing,
  });
  
  const {
    searchArea,
    results,
    isLoading,
    error,
  } = useSpatialSearch();
  
  // Handle map click to set search center
  const handleMapClick = useCallback((coordinates: LatLng) => {
    if (!isDrawingMode) {
      setSearchCenter(coordinates);
    }
  }, [isDrawingMode]);
  
  // Handle area selection from drawing
  const handleAreaComplete = useCallback((area: { center: LatLng; radius: number }) => {
    setSearchCenter(area.center);
    setFilters(prev => ({ ...prev, radius_km: Math.round(area.radius) }));
    onAreaSelect(area.center, area.radius);
    setIsDrawingMode(false);
  }, [onAreaSelect]);
  
  // Start drawing mode
  const handleStartDrawing = useCallback(() => {
    setIsDrawingMode(true);
    startDrawing();
  }, [startDrawing]);
  
  // Cancel drawing mode
  const handleCancelDrawing = useCallback(() => {
    setIsDrawingMode(false);
    stopDrawing();
  }, [stopDrawing]);
  
  // Search properties in current area
  const handleSearch = useCallback(() => {
    searchArea({
      center: searchCenter,
      radius_km: filters.radius_km,
      hazard_type: filters.hazard_type,
      min_risk_score: filters.min_risk_score,
      max_risk_score: filters.max_risk_score,
    });
  }, [searchArea, searchCenter, filters]);
  
  // Handle property selection
  const handlePropertyClick = useCallback((property: PropertyMarker) => {
    if (allowMultiSelect) {
      setSelectedProperties(prev => {
        const isSelected = prev.some(p => p.id === property.id);
        if (isSelected) {
          return prev.filter(p => p.id !== property.id);
        } else {
          return [...prev, property];
        }
      });
    } else {
      setSelectedProperties([property]);
    }
    
    if (onPropertySelect) {
      onPropertySelect(property);
    }
  }, [allowMultiSelect, onPropertySelect]);
  
  // Update filters
  const updateFilter = useCallback(<K extends keyof SearchFilters>(
    key: K,
    value: SearchFilters[K]
  ) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);
  
  // Zoom to fit all results
  const handleZoomToResults = useCallback(() => {
    if (results && results.properties.length > 0) {
      const coordinates = results.properties.map(p => p.coordinates);
      // Calculate bounds and zoom to fit
      // This would be implemented with your map library's bounds fitting function
    }
  }, [results]);
  
  // Clear all selections
  const handleClearAll = useCallback(() => {
    setSelectedProperties([]);
    clearSelection();
  }, [clearSelection]);
  
  // Auto-search when filters change
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (searchCenter) {
        handleSearch();
      }
    }, 500);
    
    return () => clearTimeout(debounceTimer);
  }, [searchCenter, filters, handleSearch]);
  
  return (
    <div className={clsx('flex flex-col h-full', className)}>
      {/* Header Controls */}
      <div className="flex items-center justify-between p-4 bg-white border-b border-neutral-200">
        <div className="flex items-center space-x-4">
          <h3 className="text-lg font-semibold text-neutral-900 flex items-center">
            <Map className="h-5 w-5 mr-2" />
            Geographic Search
          </h3>
          
          {results && (
            <div className="text-sm text-neutral-600">
              {results.properties.length} properties found
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className={clsx(
              'btn btn-secondary btn-sm',
              showFilters && 'bg-seawater-primary text-white'
            )}
          >
            <Filter className="h-4 w-4 mr-1" />
            Filters
          </button>
          
          {enableDrawing && (
            <button
              type="button"
              onClick={isDrawingMode ? handleCancelDrawing : handleStartDrawing}
              className={clsx(
                'btn btn-sm',
                isDrawingMode ? 'btn-danger' : 'btn-secondary'
              )}
            >
              <Target className="h-4 w-4 mr-1" />
              {isDrawingMode ? 'Cancel' : 'Draw Area'}
            </button>
          )}
          
          <button
            type="button"
            onClick={handleSearch}
            disabled={isLoading}
            className="btn btn-primary btn-sm"
          >
            <Search className="h-4 w-4 mr-1" />
            {isLoading ? 'Searching...' : 'Search'}
          </button>
        </div>
      </div>
      
      {/* Filters Panel */}
      {showFilters && (
        <div className="p-4 bg-neutral-50 border-b border-neutral-200">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Radius */}
            <div>
              <label className="form-label">
                Search Radius: {filters.radius_km} km
              </label>
              <input
                type="range"
                min={minRadius}
                max={maxRadius}
                value={filters.radius_km}
                onChange={(e) => updateFilter('radius_km', Number(e.target.value))}
                className="w-full h-2 bg-neutral-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-neutral-500 mt-1">
                <span>{minRadius} km</span>
                <span>{maxRadius} km</span>
              </div>
            </div>
            
            {/* Risk Score Range */}
            <div>
              <label className="form-label">
                Risk Score: {filters.min_risk_score} - {filters.max_risk_score}
              </label>
              <div className="flex space-x-2">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={filters.min_risk_score}
                  onChange={(e) => updateFilter('min_risk_score', Number(e.target.value))}
                  className="form-input text-sm"
                  placeholder="Min"
                />
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={filters.max_risk_score}
                  onChange={(e) => updateFilter('max_risk_score', Number(e.target.value))}
                  className="form-input text-sm"
                  placeholder="Max"
                />
              </div>
            </div>
            
            {/* Hazard Type */}
            <div>
              <label className="form-label">Hazard Type</label>
              <select
                value={filters.hazard_type || ''}
                onChange={(e) => updateFilter('hazard_type', e.target.value as HazardType || undefined)}
                className="form-input"
              >
                <option value="">All Hazards</option>
                {HAZARD_TYPES.map(hazard => (
                  <option key={hazard.value} value={hazard.value}>
                    {hazard.icon} {hazard.label}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Risk Levels */}
            <div>
              <label className="form-label">Risk Levels</label>
              <div className="flex flex-wrap gap-1">
                {RISK_LEVELS.map(level => (
                  <button
                    key={level.value}
                    type="button"
                    onClick={() => {
                      const newLevels = filters.risk_levels.includes(level.value)
                        ? filters.risk_levels.filter(l => l !== level.value)
                        : [...filters.risk_levels, level.value];
                      updateFilter('risk_levels', newLevels);
                    }}
                    className={clsx(
                      'px-2 py-1 text-xs rounded-md transition-colors',
                      filters.risk_levels.includes(level.value)
                        ? level.color
                        : 'bg-neutral-200 text-neutral-600'
                    )}
                  >
                    {level.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Map Container */}
      <div className="flex-1 relative">
        {/* Map would be rendered here using MapBox GL JS or similar */}
        <div className="absolute inset-0 bg-neutral-100 flex items-center justify-center">
          <div className="text-center">
            <Map className="h-16 w-16 text-neutral-400 mx-auto mb-4" />
            <p className="text-neutral-600">Interactive map will be rendered here</p>
            <p className="text-sm text-neutral-500 mt-2">
              Current center: {searchCenter.latitude.toFixed(4)}, {searchCenter.longitude.toFixed(4)}
            </p>
            {selectedArea && (
              <p className="text-sm text-neutral-500">
                Selected radius: {selectedArea.radius.toFixed(1)} km
              </p>
            )}
          </div>
        </div>
        
        {/* Map Controls */}
        <div className="absolute top-4 right-4 flex flex-col space-y-2">
          <button
            type="button"
            onClick={() => setViewState(prev => ({ ...prev, zoom: prev.zoom + 1 }))}
            className="p-2 bg-white border border-neutral-300 rounded-md shadow-sm hover:bg-neutral-50"
            aria-label="Zoom in"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setViewState(prev => ({ ...prev, zoom: Math.max(prev.zoom - 1, 1) }))}
            className="p-2 bg-white border border-neutral-300 rounded-md shadow-sm hover:bg-neutral-50"
            aria-label="Zoom out"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          
          {showRiskOverlay && (
            <button
              type="button"
              className="p-2 bg-white border border-neutral-300 rounded-md shadow-sm hover:bg-neutral-50"
              aria-label="Toggle risk overlay"
            >
              <Layers className="h-4 w-4" />
            </button>
          )}
          
          {results && results.properties.length > 0 && (
            <button
              type="button"
              onClick={handleZoomToResults}
              className="p-2 bg-white border border-neutral-300 rounded-md shadow-sm hover:bg-neutral-50"
              aria-label="Zoom to results"
            >
              <Target className="h-4 w-4" />
            </button>
          )}
        </div>
        
        {/* Drawing Mode Indicator */}
        {isDrawingMode && (
          <div className="absolute top-4 left-4 bg-seawater-primary text-white px-4 py-2 rounded-md shadow-lg">
            <div className="flex items-center">
              <Target className="h-4 w-4 mr-2" />
              Click and drag to define search area
            </div>
          </div>
        )}
        
        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
            <div className="flex items-center space-x-3">
              <div className="spinner" />
              <span className="text-neutral-600">Searching properties...</span>
            </div>
          </div>
        )}
      </div>
      
      {/* Results Panel */}
      {results && (
        <div className="border-t border-neutral-200 bg-white">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold text-neutral-900">
                Search Results ({results.properties.length})
              </h4>
              
              <div className="flex items-center space-x-2">
                {selectedProperties.length > 0 && (
                  <span className="text-sm text-neutral-600">
                    {selectedProperties.length} selected
                  </span>
                )}
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="btn btn-secondary btn-sm"
                >
                  Clear All
                </button>
              </div>
            </div>
            
            {/* Area Statistics */}
            {results.area_statistics && (
              <div className="grid grid-cols-3 gap-4 mb-4 p-3 bg-neutral-50 rounded-lg">
                <div className="text-center">
                  <div className="text-lg font-bold text-neutral-900">
                    {Math.round(results.area_statistics.average_risk_score)}
                  </div>
                  <div className="text-sm text-neutral-600">Avg Risk Score</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-neutral-900">
                    {results.area_statistics.total_properties}
                  </div>
                  <div className="text-sm text-neutral-600">Total Properties</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-error">
                    {results.area_statistics.high_risk_count}
                  </div>
                  <div className="text-sm text-neutral-600">High Risk</div>
                </div>
              </div>
            )}
            
            {/* Property List */}
            <div className="max-h-64 overflow-y-auto space-y-2">
              {results.properties.map((property, index) => (
                <div
                  key={property.id || index}
                  className={clsx(
                    'flex items-center justify-between p-3 border border-neutral-200 rounded-lg cursor-pointer',
                    'hover:bg-neutral-50 transition-colors',
                    selectedProperties.some(p => p.id === property.id) && 'bg-seawater-light border-seawater-primary'
                  )}
                  onClick={() => handlePropertyClick(property)}
                >
                  <div className="flex items-center space-x-3">
                    <MapPin className="h-4 w-4 text-neutral-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-neutral-900 truncate">
                        {property.address}
                      </div>
                      <div className="text-sm text-neutral-600">
                        {property.distance_km?.toFixed(1)} km away
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <div className="text-center">
                      <div className={clsx(
                        'text-lg font-bold',
                        property.risk_score >= 70 ? 'text-error' :
                        property.risk_score >= 40 ? 'text-warning' : 'text-success'
                      )}>
                        {property.risk_score}
                      </div>
                      <div className="text-xs text-neutral-500">Risk Score</div>
                    </div>
                    
                    <div className="flex space-x-1">
                      {property.primary_hazards.slice(0, 3).map(hazard => (
                        <span key={hazard} className="text-sm">
                          {HAZARD_TYPES.find(h => h.value === hazard)?.icon}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      
      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border-t border-red-200">
          <div className="text-red-800 text-sm">{error}</div>
        </div>
      )}
    </div>
  );
};