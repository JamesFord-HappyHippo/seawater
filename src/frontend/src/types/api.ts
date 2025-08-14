// API-specific type definitions

import { 
  Property, 
  RiskAssessment, 
  PropertyRiskData, 
  Professional, 
  User, 
  APIResponse, 
  APIError,
  PropertyComparison,
  HistoricalEvent,
  ClimateProjection,
  GeocodedAddress,
  HazardType
} from './index';

// API Client Configuration
export interface APIClientConfig {
  baseURL: string;
  apiKey?: string;
  timeout: number;
  retries: number;
  cache: boolean;
}

// Request Parameters
export interface PropertyRiskParams {
  address: string;
  sources?: string[];
  include_projections?: boolean;
  include_building_codes?: boolean;
  radius_analysis?: number;
}

export interface ComparisonParams {
  addresses: string[];
  hazard_types?: HazardType[];
  include_projections?: boolean;
}

export interface GeocodingParams {
  address: string;
  bias_region?: string;
  return_components?: boolean;
  confidence_threshold?: number;
}

export interface SpatialSearchParams {
  latitude: number;
  longitude: number;
  radius_km: number;
  hazard_type?: HazardType;
  limit?: number;
}

export interface ProfessionalSearchParams {
  type?: Professional['type'];
  latitude: number;
  longitude: number;
  radius_km?: number;
  specializations?: string[];
  certifications?: string[];
  min_rating?: number;
  limit?: number;
}

export interface HistoricalEventsParams {
  latitude: number;
  longitude: number;
  radius_km: number;
  years?: number;
  event_types?: HazardType[];
}

export interface TrendDataParams {
  address_hash: string;
  period: 'monthly' | 'yearly' | 'decade';
  hazard_types?: HazardType[];
  start_date?: string;
  end_date?: string;
}

// Response Types
export type PropertyRiskResponse = APIResponse<PropertyRiskData>;
export type PropertyComparisonResponse = APIResponse<PropertyComparison>;
export type GeocodingResponse = APIResponse<{ results: GeocodedAddress[] }>;
export type ProfessionalSearchResponse = APIResponse<{
  professionals: Professional[];
  total_found: number;
  area_stats: {
    by_type: Record<string, number>;
    average_rating: number;
    total_reviews: number;
  };
}>;

export type HistoricalEventsResponse = APIResponse<{
  events: HistoricalEvent[];
  total_found: number;
  time_range: {
    start_date: string;
    end_date: string;
  };
}>;

export type ClimateProjectionsResponse = APIResponse<{
  projections: ClimateProjection[];
  scenarios: string[];
  confidence_level: number;
}>;

export type SpatialSearchResponse = APIResponse<{
  center_point: {
    latitude: number;
    longitude: number;
  };
  radius_km: number;
  properties: Array<{
    distance_km: number;
    address: string;
    risk_score: number;
    primary_hazards: HazardType[];
  }>;
  area_statistics: {
    average_risk_score: number;
    total_properties: number;
    high_risk_count: number;
    flood_zone_distribution?: Record<string, number>;
  };
}>;

// Professional API Types
export interface BulkAnalysisRequest {
  addresses: string[];
  sources?: string[];
  output_format: 'json' | 'csv' | 'excel';
  webhook_url?: string;
  priority: 'low' | 'normal' | 'high';
}

export interface BulkAnalysisJob {
  job_id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  total_addresses: number;
  processed_count: number;
  estimated_completion?: string;
  webhook_configured: boolean;
  created_at: string;
  completed_at?: string;
  download_url?: string;
  error_message?: string;
}

export interface ReportGenerationRequest {
  address: string;
  report_type: 'basic' | 'comprehensive' | 'executive';
  format: 'pdf' | 'html' | 'docx';
  template: 'standard' | 'professional' | 'branded';
  include_sections: string[];
  branding?: {
    company_name: string;
    logo_url?: string;
    contact_info?: string;
  };
}

export interface ReportGenerationResponse {
  report_id: string;
  status: 'generating' | 'completed' | 'failed';
  download_url?: string;
  expires_at: string;
  file_size_bytes?: number;
}

// User Management Types
export interface UserProfileUpdate {
  first_name?: string;
  last_name?: string;
  company?: string;
  phone?: string;
  preferences?: Partial<User['preferences']>;
}

export interface SubscriptionUpgrade {
  tier: User['subscription_tier'];
  billing_cycle: 'monthly' | 'annual';
  payment_method_id?: string;
}

export interface APIKeyRequest {
  name: string;
  permissions: string[];
  rate_limit?: number;
  expires_at?: string;
}

export interface APIKey {
  id: string;
  name: string;
  key: string;
  permissions: string[];
  rate_limit_per_hour: number;
  created_at: string;
  last_used?: string;
  expires_at?: string;
  is_active: boolean;
}

// Webhook Types
export interface WebhookConfig {
  url: string;
  events: string[];
  secret?: string;
  is_active: boolean;
}

export interface WebhookPayload {
  event: string;
  data: any;
  timestamp: string;
  webhook_id: string;
}

// Error Response Types
export type APIErrorResponse = APIError;

export interface ValidationError extends APIError {
  error: {
    code: 'VALIDATION_ERROR';
    message: string;
    details: {
      field: string;
      message: string;
    }[];
  };
}

export interface AuthenticationError extends APIError {
  error: {
    code: 'AUTH_TOKEN_MISSING' | 'AUTH_TOKEN_INVALID' | 'AUTH_TOKEN_EXPIRED';
    message: string;
  };
}

export interface RateLimitError extends APIError {
  error: {
    code: 'RATE_LIMIT_EXCEEDED' | 'QUOTA_EXCEEDED';
    message: string;
    details: {
      limit: number;
      reset_time: string;
      retry_after: number;
    };
  };
}

// Cache Types
export interface CacheConfig {
  ttl: number; // Time to live in seconds
  key_prefix: string;
  serialize: boolean;
}

export interface CachedResponse<T> {
  data: T;
  cached_at: string;
  expires_at: string;
  cache_key: string;
}

// Utility Types for API
export type APIMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export interface APIEndpoint {
  method: APIMethod;
  path: string;
  params?: Record<string, any>;
  body?: any;
  headers?: Record<string, string>;
}

export interface APIRequestConfig {
  timeout?: number;
  retries?: number;
  cache?: boolean | CacheConfig;
  signal?: AbortSignal;
}

// React Query Types
export interface QueryConfig {
  staleTime?: number;
  cacheTime?: number;
  retry?: boolean | number;
  refetchOnWindowFocus?: boolean;
  enabled?: boolean;
}

export interface MutationConfig {
  onSuccess?: (data: any) => void;
  onError?: (error: any) => void;
  onSettled?: () => void;
}

// Export API client interface
export interface APIClient {
  get<T>(endpoint: string, params?: any, config?: APIRequestConfig): Promise<APIResponse<T>>;
  post<T>(endpoint: string, data?: any, config?: APIRequestConfig): Promise<APIResponse<T>>;
  put<T>(endpoint: string, data?: any, config?: APIRequestConfig): Promise<APIResponse<T>>;
  delete<T>(endpoint: string, config?: APIRequestConfig): Promise<APIResponse<T>>;
  patch<T>(endpoint: string, data?: any, config?: APIRequestConfig): Promise<APIResponse<T>>;
}