// Weather Components Exports
// Comprehensive NOAA weather integration components for Seawater Climate Risk Platform

export { WeatherContextDisplay } from './WeatherContextDisplay';
export { HistoricalWeatherTimeline } from './HistoricalWeatherTimeline';
export { WeatherRiskEnhancement } from './WeatherRiskEnhancement';
export { WeatherDashboard } from './WeatherDashboard';

// Note: Component prop types are not exported as they are internal to each component
// Use the component directly with TypeScript inference for prop types

// Re-export NOAA types for convenience
export type {
  NOAAWeatherContext,
  ProcessedStormEvent,
  NOAAAlert,
  NOAAObservation,
  NOAAClimateNormals,
  LocationWeatherRisk,
  WeatherRiskRecommendation
} from '../../types/noaa';

export type {
  NOAAWeatherContextSummary
} from '../../types/index';