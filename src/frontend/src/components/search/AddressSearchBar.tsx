import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Search, MapPin, Clock, X } from 'lucide-react';
import { clsx } from 'clsx';
import { LatLng, GeocodedAddress } from '@types';
import { useDebounce } from '@hooks/useDebounce';
import { useGeocoding } from '@hooks/useGeocoding';
import { useLocalStorage } from '@hooks/useLocalStorage';

interface AddressSearchBarProps {
  placeholder?: string;
  onSelect: (address: string, coordinates: LatLng) => void;
  suggestions?: boolean;
  geolocation?: boolean;
  className?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  value?: string;
  onChange?: (value: string) => void;
  onError?: (error: string) => void;
}

interface RecentSearch {
  address: string;
  timestamp: Date;
  coordinates: LatLng;
}

export const AddressSearchBar: React.FC<AddressSearchBarProps> = ({
  placeholder = "Enter property address",
  onSelect,
  suggestions = true,
  geolocation = true,
  className,
  disabled = false,
  autoFocus = false,
  value: controlledValue,
  onChange,
  onError,
}) => {
  const [inputValue, setInputValue] = useState(controlledValue || '');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Debounce search input
  const debouncedQuery = useDebounce(inputValue, 300);
  
  // Custom hooks
  const { geocodeAddress, isLoading: isGeocodingLoading, results, error } = useGeocoding();
  const [recentSearches, setRecentSearches] = useLocalStorage<RecentSearch[]>('recent-searches', []);
  
  // Handle controlled vs uncontrolled state
  const isControlled = controlledValue !== undefined;
  const value = isControlled ? controlledValue : inputValue;
  
  const handleInputChange = useCallback((newValue: string) => {
    if (isControlled && onChange) {
      onChange(newValue);
    } else {
      setInputValue(newValue);
    }
    setSelectedIndex(-1);
  }, [isControlled, onChange]);
  
  // Trigger geocoding when debounced query changes
  useEffect(() => {
    if (debouncedQuery.length > 3 && suggestions) {
      geocodeAddress(debouncedQuery);
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  }, [debouncedQuery, suggestions, geocodeAddress]);
  
  // Handle errors
  useEffect(() => {
    if (error && onError) {
      onError(error);
    }
  }, [error, onError]);
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  // Get current location
  const handleUseCurrentLocation = useCallback(async () => {
    if (!geolocation || !navigator.geolocation) return;
    
    setIsLoadingLocation(true);
    
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000, // 5 minutes
        });
      });
      
      const coordinates: LatLng = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
      
      // Reverse geocode to get address
      const reverseResults = await geocodeAddress(`${coordinates.latitude},${coordinates.longitude}`);
      
      if (reverseResults && reverseResults.length > 0) {
        const result = reverseResults[0];
        handleInputChange(result.formatted_address);
        onSelect(result.formatted_address, coordinates);
        setIsOpen(false);
      }
    } catch (error) {
      console.error('Error getting current location:', error);
      if (onError) {
        onError('Unable to get your current location. Please check your browser permissions.');
      }
    } finally {
      setIsLoadingLocation(false);
    }
  }, [geolocation, geocodeAddress, handleInputChange, onSelect, onError]);
  
  // Handle address selection
  const handleSelectAddress = useCallback((address: GeocodedAddress | RecentSearch) => {
    const coordinates = 'coordinates' in address ? address.coordinates : {
      latitude: address.coordinates.latitude,
      longitude: address.coordinates.longitude,
    };
    
    const formattedAddress = 'formatted_address' in address ? address.formatted_address : address.address;
    
    handleInputChange(formattedAddress);
    onSelect(formattedAddress, coordinates);
    setIsOpen(false);
    
    // Add to recent searches
    const newSearch: RecentSearch = {
      address: formattedAddress,
      timestamp: new Date(),
      coordinates,
    };
    
    const updatedRecents = [
      newSearch,
      ...recentSearches.filter(search => search.address !== formattedAddress),
    ].slice(0, 5); // Keep only 5 recent searches
    
    setRecentSearches(updatedRecents);
  }, [handleInputChange, onSelect, recentSearches, setRecentSearches]);
  
  // Handle keyboard navigation
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (!isOpen) return;
    
    const suggestions = results || [];
    const recentSuggestions = inputValue.length <= 3 ? recentSearches : [];
    const allSuggestions = [...suggestions, ...recentSuggestions];
    
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, allSuggestions.length - 1));
        break;
      case 'ArrowUp':
        event.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, -1));
        break;
      case 'Enter':
        event.preventDefault();
        if (selectedIndex >= 0 && allSuggestions[selectedIndex]) {
          handleSelectAddress(allSuggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSelectedIndex(-1);
        break;
    }
  }, [isOpen, results, inputValue, recentSearches, selectedIndex, handleSelectAddress]);
  
  // Clear input
  const handleClear = useCallback(() => {
    handleInputChange('');
    setIsOpen(false);
    inputRef.current?.focus();
  }, [handleInputChange]);
  
  // Remove recent search
  const handleRemoveRecentSearch = useCallback((index: number, event: React.MouseEvent) => {
    event.stopPropagation();
    const updatedRecents = recentSearches.filter((_, i) => i !== index);
    setRecentSearches(updatedRecents);
  }, [recentSearches, setRecentSearches]);
  
  // Prepare suggestions for display
  const suggestions_list = results || [];
  const recent_suggestions = inputValue.length <= 3 ? recentSearches : [];
  const all_suggestions = [...suggestions_list, ...recent_suggestions];
  const show_dropdown = isOpen && (suggestions_list.length > 0 || recent_suggestions.length > 0);
  
  return (
    <div
      ref={containerRef}
      className={clsx(
        'relative w-full',
        className
      )}
    >
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-neutral-400" />
        </div>
        
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          disabled={disabled}
          autoFocus={autoFocus}
          autoComplete="off"
          className={clsx(
            'form-input pl-10 pr-20',
            'w-full',
            disabled && 'opacity-50 cursor-not-allowed',
            'focus:ring-2 focus:ring-seawater-primary focus:border-seawater-primary'
          )}
          aria-label="Property address search"
          aria-expanded={show_dropdown}
          aria-haspopup="listbox"
          aria-autocomplete="list"
          role="combobox"
        />
        
        <div className="absolute inset-y-0 right-0 flex items-center">
          {value && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 mr-1 text-neutral-400 hover:text-neutral-600 focus:outline-none"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          
          {geolocation && (
            <button
              type="button"
              onClick={handleUseCurrentLocation}
              disabled={isLoadingLocation || disabled}
              className={clsx(
                'p-2 mr-1 text-neutral-400 hover:text-seawater-primary',
                'focus:outline-none focus:ring-2 focus:ring-seawater-primary rounded',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
              aria-label="Use current location"
              title="Use my current location"
            >
              <MapPin className={clsx(
                'h-5 w-5',
                isLoadingLocation && 'animate-pulse'
              )} />
            </button>
          )}
        </div>
        
        {(isGeocodingLoading || isLoadingLocation) && (
          <div className="absolute inset-y-0 right-12 flex items-center">
            <div className="spinner spinner-sm" />
          </div>
        )}
      </div>
      
      {show_dropdown && (
        <div className={clsx(
          'absolute z-50 w-full mt-1',
          'bg-white border border-neutral-200 rounded-lg shadow-lg',
          'max-h-80 overflow-y-auto'
        )}>
          {suggestions_list.length > 0 && (
            <div className="p-2">
              <div className="text-xs font-medium text-neutral-500 px-3 py-2">
                Suggestions
              </div>
              {suggestions_list.map((suggestion, index) => (
                <button
                  key={`suggestion-${index}`}
                  type="button"
                  onClick={() => handleSelectAddress(suggestion)}
                  className={clsx(
                    'w-full text-left px-3 py-2 rounded-md',
                    'hover:bg-neutral-50 focus:bg-neutral-50',
                    'focus:outline-none transition-colors duration-150',
                    selectedIndex === index && 'bg-seawater-light'
                  )}
                  role="option"
                  aria-selected={selectedIndex === index}
                >
                  <div className="flex items-center">
                    <MapPin className="h-4 w-4 text-neutral-400 mr-2 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-neutral-900 truncate">
                        {suggestion.formatted_address}
                      </div>
                      {suggestion.confidence && (
                        <div className="text-xs text-neutral-500">
                          Confidence: {Math.round(suggestion.confidence * 100)}%
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
          
          {recent_suggestions.length > 0 && (
            <div className="p-2 border-t border-neutral-100">
              <div className="text-xs font-medium text-neutral-500 px-3 py-2">
                Recent Searches
              </div>
              {recent_suggestions.map((search, index) => (
                <button
                  key={`recent-${index}`}
                  type="button"
                  onClick={() => handleSelectAddress(search)}
                  className={clsx(
                    'w-full text-left px-3 py-2 rounded-md',
                    'hover:bg-neutral-50 focus:bg-neutral-50',
                    'focus:outline-none transition-colors duration-150',
                    'group',
                    selectedIndex === (suggestions_list.length + index) && 'bg-seawater-light'
                  )}
                  role="option"
                  aria-selected={selectedIndex === (suggestions_list.length + index)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center flex-1 min-w-0">
                      <Clock className="h-4 w-4 text-neutral-400 mr-2 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-neutral-900 truncate">
                          {search.address}
                        </div>
                        <div className="text-xs text-neutral-500">
                          {new Date(search.timestamp).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => handleRemoveRecentSearch(index, e)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-neutral-400 hover:text-error focus:outline-none"
                      aria-label="Remove from recent searches"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};