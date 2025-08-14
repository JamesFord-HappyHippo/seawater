import { useState, useCallback } from 'react';
import { LatLng } from '@types';

interface MapViewState {
  latitude: number;
  longitude: number;
  zoom: number;
  bearing?: number;
  pitch?: number;
}

interface SelectedArea {
  center: LatLng;
  radius: number; // in kilometers
  bounds?: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
}

interface UseMapInteractionOptions {
  initialCenter: LatLng;
  initialZoom: number;
  enableDrawing?: boolean;
}

interface UseMapInteractionReturn {
  viewState: MapViewState;
  setViewState: React.Dispatch<React.SetStateAction<MapViewState>>;
  selectedArea: SelectedArea | null;
  isDrawing: boolean;
  startDrawing: () => void;
  stopDrawing: () => void;
  clearSelection: () => void;
  onAreaComplete: (area: SelectedArea) => void;
}

/**
 * Hook for managing map interactions including drawing and area selection
 */
export function useMapInteraction(options: UseMapInteractionOptions): UseMapInteractionReturn {
  const { initialCenter, initialZoom, enableDrawing = true } = options;

  const [viewState, setViewState] = useState<MapViewState>({
    latitude: initialCenter.latitude,
    longitude: initialCenter.longitude,
    zoom: initialZoom,
  });

  const [selectedArea, setSelectedArea] = useState<SelectedArea | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const startDrawing = useCallback(() => {
    if (!enableDrawing) return;
    setIsDrawing(true);
    setSelectedArea(null);
  }, [enableDrawing]);

  const stopDrawing = useCallback(() => {
    setIsDrawing(false);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedArea(null);
    setIsDrawing(false);
  }, []);

  const onAreaComplete = useCallback((area: SelectedArea) => {
    setSelectedArea(area);
    setIsDrawing(false);
  }, []);

  return {
    viewState,
    setViewState,
    selectedArea,
    isDrawing,
    startDrawing,
    stopDrawing,
    clearSelection,
    onAreaComplete,
  };
}