import { useState, useCallback } from 'react';
import { LatLng, HazardType, PropertyMarker } from '../types';

interface SpatialSearchParams {
  center: LatLng;
  radius_km: number;
  hazard_type?: HazardType;
  min_risk_score?: number;
  max_risk_score?: number;
}

interface SpatialSearchResults {
  center_point: LatLng;
  radius_km: number;
  properties: Array<PropertyMarker & {
    distance_km: number;
  }>;
  area_statistics: {
    average_risk_score: number;
    total_properties: number;
    high_risk_count: number;
    flood_zone_distribution?: Record<string, number>;
  };
}

interface UseSpatialSearchReturn {
  searchArea: (params: SpatialSearchParams) => Promise<void>;
  results: SpatialSearchResults | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook for spatial property search within geographic areas
 */
export function useSpatialSearch(): UseSpatialSearchReturn {
  const [results, setResults] = useState<SpatialSearchResults | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchArea = useCallback(async (params: SpatialSearchParams) => {
    setIsLoading(true);
    setError(null);

    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Generate mock results based on search parameters
      const mockProperties: Array<PropertyMarker & { distance_km: number }> = Array.from(
        { length: Math.floor(Math.random() * 20) + 5 },
        (_, index) => {
          const distance = Math.random() * params.radius_km;
          const angle = Math.random() * 2 * Math.PI;
          
          // Calculate coordinates within the search radius
          const lat = params.center.latitude + (distance / 111) * Math.cos(angle);
          const lng = params.center.longitude + (distance / (111 * Math.cos(params.center.latitude * Math.PI / 180))) * Math.sin(angle);
          
          const riskScore = Math.floor(Math.random() * 100);
          const primaryHazards: HazardType[] = ['flood', 'wildfire', 'hurricane', 'heat']
            .filter(() => Math.random() > 0.7) as HazardType[];

          return {
            id: `property-${index}`,
            coordinates: { latitude: lat, longitude: lng },
            risk_score: riskScore,
            risk_level: riskScore >= 70 ? 'HIGH' : riskScore >= 40 ? 'MODERATE' : 'LOW' as any,
            address: `${Math.floor(Math.random() * 9999) + 1} ${['Main', 'Oak', 'Pine', 'Cedar', 'Maple'][Math.floor(Math.random() * 5)]} St`,
            primary_hazards: primaryHazards.length > 0 ? primaryHazards : ['flood'],
            distance_km: distance,
          };
        }
      );

      // Filter by risk score if specified
      const filteredProperties = mockProperties.filter(property => {
        if (params.min_risk_score !== undefined && property.risk_score < params.min_risk_score) {
          return false;
        }
        if (params.max_risk_score !== undefined && property.risk_score > params.max_risk_score) {
          return false;
        }
        return true;
      });

      // Calculate area statistics
      const totalProperties = filteredProperties.length;
      const averageRiskScore = totalProperties > 0 
        ? filteredProperties.reduce((sum, p) => sum + p.risk_score, 0) / totalProperties
        : 0;
      const highRiskCount = filteredProperties.filter(p => p.risk_score >= 70).length;

      const mockResults: SpatialSearchResults = {
        center_point: params.center,
        radius_km: params.radius_km,
        properties: filteredProperties.sort((a, b) => a.distance_km - b.distance_km),
        area_statistics: {
          average_risk_score: Math.round(averageRiskScore),
          total_properties: totalProperties,
          high_risk_count: highRiskCount,
          flood_zone_distribution: {
            'AE': Math.floor(totalProperties * 0.3),
            'VE': Math.floor(totalProperties * 0.1),
            'X': Math.floor(totalProperties * 0.6),
          },
        },
      };

      setResults(mockResults);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to search area';
      setError(errorMessage);
      setResults(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    searchArea,
    results,
    isLoading,
    error,
  };
}