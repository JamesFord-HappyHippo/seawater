import { useState, useCallback } from 'react';
import { GeocodedAddress } from '@types';

interface UseGeocodingReturn {
  geocodeAddress: (address: string) => Promise<GeocodedAddress[] | null>;
  isLoading: boolean;
  results: GeocodedAddress[] | null;
  error: string | null;
}

/**
 * Hook for geocoding addresses using the Seawater API
 */
export function useGeocoding(): UseGeocodingReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<GeocodedAddress[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const geocodeAddress = useCallback(async (address: string): Promise<GeocodedAddress[] | null> => {
    if (!address.trim()) {
      setResults(null);
      setError(null);
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      // This would normally make an API call to the geocoding service
      // For now, we'll simulate the API response
      await new Promise(resolve => setTimeout(resolve, 300)); // Simulate network delay

      // Mock geocoding results
      const mockResults: GeocodedAddress[] = [
        {
          formatted_address: `${address}, City, State 12345, USA`,
          coordinates: {
            latitude: 40.7128 + (Math.random() - 0.5) * 0.1,
            longitude: -74.0060 + (Math.random() - 0.5) * 0.1,
          },
          address_components: {
            street_number: address.split(' ')[0],
            street_name: address.split(' ').slice(1).join(' '),
            city: 'City',
            state: 'State',
            state_code: 'ST',
            country: 'United States',
            country_code: 'US',
            postal_code: '12345',
            county: 'County',
          },
          confidence: 0.95,
          geocoding_source: 'mapbox',
          place_type: 'address',
        },
      ];

      setResults(mockResults);
      return mockResults;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to geocode address';
      setError(errorMessage);
      setResults(null);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    geocodeAddress,
    isLoading,
    results,
    error,
  };
}