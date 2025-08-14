// Core type definitions for the Seawater Climate Risk Platform

// Geographic Types
export interface LatLng {
  latitude: number;
  longitude: number;
}

export interface Coordinates extends LatLng {}

export interface BoundingBox {
  north: number;
  south: number;
  east: number;
  west: number;
}

// Address Types
export interface AddressComponents {
  street_number?: string;
  street_name?: string;
  city?: string;
  state?: string;
  state_code?: string;
  country?: string;
  country_code?: string;
  postal_code?: string;
  county?: string;
}

export interface GeocodedAddress {
  formatted_address: string;
  coordinates: Coordinates;
  address_components: AddressComponents;
  confidence: number;
  geocoding_source: string;
  place_type: 'address' | 'street' | 'city' | 'region';
}

// Property Types
export interface Property {
  id?: string;
  address: string;
  formatted_address: string;
  coordinates: Coordinates;
  property_type?: 'residential' | 'commercial' | 'industrial';
  year_built?: number;
  square_feet?: number;
  bedrooms?: number;
  bathrooms?: number;
  elevation_meters?: number;
}

// Risk Assessment Types
export type RiskLevel = 'LOW' | 'MODERATE' | 'HIGH' | 'VERY_HIGH' | 'EXTREME';
export type HazardType = 'flood' | 'wildfire' | 'hurricane' | 'tornado' | 'earthquake' | 'heat' | 'drought' | 'hail';

export interface DataSource {
  name: string;
  score: number;
  data?: Record<string, any>;
  confidence?: number;
  last_updated?: string;
}

export interface MultiSourceScore {
  fema?: DataSource;
  firststreet?: DataSource;
  climatecheck?: DataSource;
  [key: string]: DataSource | undefined;
}

export interface HazardAssessment {
  score: number;
  level: RiskLevel;
  sources: MultiSourceScore;
  projections_30yr?: number;
  description?: string;
  recommendations?: string[];
}

export interface RiskAssessment {
  overall_score: number;
  risk_level: RiskLevel;
  last_updated: string;
  data_freshness: 'current' | 'stale' | 'expired';
  confidence_score: number;
  data_completeness: number;
  hazards: {
    flood?: HazardAssessment;
    wildfire?: HazardAssessment;
    hurricane?: HazardAssessment;
    tornado?: HazardAssessment;
    earthquake?: HazardAssessment;
    heat?: HazardAssessment;
    drought?: HazardAssessment;
    hail?: HazardAssessment;
  };
  social_vulnerability?: number;
  community_resilience?: number;
  building_codes?: BuildingCodeInfo;
}

export interface PropertyRiskData {
  property: Property;
  risk_assessment: RiskAssessment;
}

// Building Code Types
export interface BuildingCodeInfo {
  jurisdiction: string;
  current_codes: {
    wind?: string;
    flood?: string;
    seismic?: string;
    fire?: string;
  };
  bcat_score?: number;
  enforcement_level: 'full' | 'partial' | 'minimal' | 'none';
  last_updated?: string;
}

// Insurance Types
export interface InsuranceEstimate {
  flood_premium_annual?: number;
  homeowners_premium_annual?: number;
  total_premium_annual: number;
  coverage_recommendations: {
    flood_coverage?: number;
    wind_coverage?: number;
    liability_coverage?: number;
  };
  deductibles: {
    flood?: number;
    wind?: number;
    standard?: number;
  };
  providers: Array<{
    name: string;
    premium: number;
    rating: string;
    contact?: string;
  }>;
}

// Professional Types
export interface Professional {
  id: string;
  type: 'agent' | 'inspector' | 'insurance_agent' | 'contractor';
  name: string;
  company: string;
  email: string;
  phone: string;
  distance_km?: number;
  specializations: string[];
  certifications: string[];
  rating: number;
  review_count: number;
  verified: boolean;
  service_areas: string[];
  bio?: string;
  website?: string;
  license_number?: string;
}

// User Types
export type SubscriptionTier = 'free' | 'premium' | 'professional' | 'enterprise';

export interface User {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  company?: string;
  subscription_tier: SubscriptionTier;
  subscription_status: 'active' | 'cancelled' | 'expired' | 'past_due';
  subscription_expires?: string;
  preferences: UserPreferences;
  created_at: string;
  last_login?: string;
}

export interface UserPreferences {
  default_radius_km: number;
  preferred_risk_sources: string[];
  email_notifications: boolean;
  units: 'imperial' | 'metric';
  theme: 'light' | 'dark' | 'auto';
  dashboard_layout?: string;
}

export interface APIUsage {
  current_period_requests: number;
  current_period_limit: number;
  requests_remaining: number;
  reset_date: string;
  total_requests_all_time: number;
  cost_current_period: number;
}

// API Response Types
export interface APIResponse<T> {
  success: boolean;
  data: T;
  meta?: {
    request_id: string;
    timestamp: string;
    processing_time_ms: number;
    cache_status: 'hit' | 'miss' | 'stale';
    cost_credits?: number;
    data_sources_used?: string[];
  };
}

export interface APIError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, any>;
    suggestion?: string;
  };
  meta?: {
    request_id: string;
    timestamp: string;
  };
}

// Comparison Types
export interface PropertyComparison {
  properties: Array<{
    property: Property;
    risk_assessment: RiskAssessment;
    rank: number;
  }>;
  analytics: {
    lowest_risk: string;
    highest_risk: string;
    average_score: number;
    risk_range: number;
  };
}

// Map Types
export interface MapViewState {
  longitude: number;
  latitude: number;
  zoom: number;
  bearing?: number;
  pitch?: number;
}

export interface RiskOverlay {
  type: HazardType;
  enabled: boolean;
  opacity: number;
  color_scale: string[];
  legend: Array<{
    color: string;
    label: string;
    min_value: number;
    max_value: number;
  }>;
}

export interface PropertyMarker {
  id: string;
  coordinates: Coordinates;
  risk_score: number;
  risk_level: RiskLevel;
  address: string;
  primary_hazards: HazardType[];
}

// Historical Data Types
export interface HistoricalEvent {
  id: string;
  event_type: HazardType;
  name: string;
  date: string;
  severity: number;
  description: string;
  affected_area: BoundingBox;
  damages?: {
    economic_loss?: number;
    casualties?: number;
    properties_affected?: number;
  };
}

export interface ClimateProjection {
  year: number;
  scenario: 'rcp26' | 'rcp45' | 'rcp60' | 'rcp85';
  temperature: {
    avg_summer: number;
    avg_winter: number;
    extreme_heat_days: number;
  };
  precipitation: {
    annual: number;
    extreme_days: number;
  };
  hazard_projections: {
    [K in HazardType]?: {
      score: number;
      change_percent: number;
      confidence: number;
    };
  };
}

// Chart Data Types
export interface ChartDataPoint {
  x: string | number | Date;
  y: number;
  label?: string;
  color?: string;
}

export interface TimeSeriesData {
  label: string;
  data: ChartDataPoint[];
  color: string;
  hazard_type?: HazardType;
}

// Form Types
export interface SearchFormData {
  address: string;
  include_projections?: boolean;
  radius_analysis?: number;
  hazard_types?: HazardType[];
}

export interface ComparisonFormData {
  addresses: string[];
  hazard_types: HazardType[];
  include_projections: boolean;
}

// Component Props Types
export interface ComponentSize {
  size?: 'small' | 'medium' | 'large';
}

export interface ComponentVariant {
  variant?: 'default' | 'outline' | 'ghost' | 'destructive';
}

export interface LoadingState {
  isLoading: boolean;
  error?: string | null;
}

// Export utility types
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// Event Types
export interface MapEvent {
  type: 'click' | 'hover' | 'zoom' | 'move';
  coordinates?: Coordinates;
  features?: any[];
}

export interface RiskScoreEvent {
  hazard_type: HazardType;
  score: number;
  level: RiskLevel;
  source?: string;
}

// Export all types as a namespace for easier importing
export * from './api';
export * from './forms';
export * from './charts';