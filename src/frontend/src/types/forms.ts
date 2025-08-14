// Form-specific type definitions

import { HazardType, SubscriptionTier, Professional } from './index';

// Base Form Types
export interface FormField<T = any> {
  value: T;
  error?: string;
  touched: boolean;
  required?: boolean;
}

export interface FormState<T extends Record<string, any>> {
  fields: {
    [K in keyof T]: FormField<T[K]>;
  };
  isValid: boolean;
  isSubmitting: boolean;
  isDirty: boolean;
}

// Search Forms
export interface AddressSearchForm {
  address: string;
  use_location: boolean;
  recent_search?: string;
}

export interface PropertySearchForm extends AddressSearchForm {
  include_projections: boolean;
  radius_analysis: number;
  hazard_types: HazardType[];
  data_sources: string[];
}

export interface GeographicSearchForm {
  latitude: number;
  longitude: number;
  radius_km: number;
  hazard_filter?: HazardType;
  min_risk_score?: number;
  max_risk_score?: number;
}

export interface ComparisonForm {
  addresses: string[];
  hazard_types: HazardType[];
  include_projections: boolean;
  sort_by: 'overall_risk' | 'flood_risk' | 'wildfire_risk' | 'distance';
  sort_order: 'asc' | 'desc';
}

// User Management Forms
export interface SignUpForm {
  email: string;
  password: string;
  confirm_password: string;
  first_name: string;
  last_name: string;
  company?: string;
  phone?: string;
  subscription_tier: SubscriptionTier;
  accept_terms: boolean;
  marketing_consent: boolean;
}

export interface SignInForm {
  email: string;
  password: string;
  remember_me: boolean;
}

export interface PasswordResetForm {
  email: string;
}

export interface PasswordUpdateForm {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

export interface ProfileUpdateForm {
  first_name: string;
  last_name: string;
  company?: string;
  phone?: string;
  bio?: string;
  website?: string;
  notification_preferences: {
    email_reports: boolean;
    risk_alerts: boolean;
    product_updates: boolean;
    marketing: boolean;
  };
}

export interface PreferencesForm {
  default_radius_km: number;
  preferred_risk_sources: string[];
  units: 'imperial' | 'metric';
  theme: 'light' | 'dark' | 'auto';
  dashboard_layout: 'grid' | 'list' | 'map';
  auto_refresh: boolean;
  cache_duration: number;
}

// Professional Forms
export interface ProfessionalProfileForm {
  type: Professional['type'];
  company: string;
  license_number: string;
  specializations: string[];
  certifications: string[];
  service_areas: string[];
  bio: string;
  website?: string;
  hourly_rate?: number;
  minimum_project_size?: number;
  travel_radius_km: number;
  availability: {
    monday: boolean;
    tuesday: boolean;
    wednesday: boolean;
    thursday: boolean;
    friday: boolean;
    saturday: boolean;
    sunday: boolean;
  };
}

export interface BulkUploadForm {
  file: File | null;
  file_format: 'csv' | 'excel' | 'txt';
  has_headers: boolean;
  address_column: number;
  delimiter?: string;
  encoding: 'utf-8' | 'latin1' | 'ascii';
  validate_addresses: boolean;
  skip_invalid: boolean;
  notification_email?: string;
}

export interface ReportConfigForm {
  template: 'standard' | 'professional' | 'executive';
  format: 'pdf' | 'html' | 'docx';
  include_maps: boolean;
  include_charts: boolean;
  include_recommendations: boolean;
  include_historical_data: boolean;
  include_projections: boolean;
  branding: {
    use_company_branding: boolean;
    company_name?: string;
    logo_file?: File;
    contact_info?: string;
    footer_text?: string;
  };
  delivery: {
    email_recipients: string[];
    auto_generate: boolean;
    schedule?: 'immediate' | 'daily' | 'weekly' | 'monthly';
  };
}

export interface ClientManagementForm {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  company?: string;
  tags: string[];
  notes?: string;
  preferred_contact: 'email' | 'phone' | 'text';
  properties: Array<{
    address: string;
    property_type?: string;
    purchase_status?: 'looking' | 'under_contract' | 'closed';
    priority?: 'low' | 'medium' | 'high';
  }>;
}

export interface APIKeyForm {
  name: string;
  description?: string;
  permissions: string[];
  rate_limit_requests_per_hour: number;
  expires_in_days?: number;
  allowed_domains?: string[];
  webhook_url?: string;
}

// Insurance Forms
export interface InsuranceCalculatorForm {
  property_value: number;
  coverage_type: 'replacement_cost' | 'actual_cash_value';
  deductible_preference: 'low' | 'medium' | 'high';
  flood_coverage: boolean;
  flood_coverage_amount?: number;
  additional_coverage: {
    umbrella: boolean;
    jewelry: boolean;
    art: boolean;
    business_equipment: boolean;
  };
  current_provider?: string;
  current_premium?: number;
  claims_history: Array<{
    date: string;
    type: string;
    amount: number;
  }>;
}

// Filter Forms
export interface RiskFilterForm {
  hazard_types: HazardType[];
  min_overall_score: number;
  max_overall_score: number;
  risk_levels: ('LOW' | 'MODERATE' | 'HIGH' | 'VERY_HIGH' | 'EXTREME')[];
  data_freshness: ('current' | 'recent' | 'stale')[];
  confidence_threshold: number;
}

export interface MapFilterForm {
  show_risk_overlay: boolean;
  overlay_opacity: number;
  active_hazard: HazardType | 'all';
  show_property_markers: boolean;
  marker_size: 'small' | 'medium' | 'large';
  cluster_markers: boolean;
  show_boundaries: boolean;
  boundary_types: ('county' | 'flood_zone' | 'wildfire_zone')[];
}

export interface ProfessionalFilterForm {
  types: Professional['type'][];
  specializations: string[];
  certifications: string[];
  min_rating: number;
  max_distance_km: number;
  availability: 'any' | 'immediate' | 'this_week' | 'this_month';
  price_range: {
    min?: number;
    max?: number;
  };
  verified_only: boolean;
}

// Validation Types
export interface ValidationRule<T = any> {
  required?: boolean;
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: T) => string | undefined;
}

export interface FormValidation<T extends Record<string, any>> {
  [K in keyof T]?: ValidationRule<T[K]> | ValidationRule<T[K]>[];
}

// Form Hook Types
export interface UseFormOptions<T extends Record<string, any>> {
  initialValues: T;
  validation?: FormValidation<T>;
  onSubmit: (values: T) => Promise<void> | void;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
}

export interface UseFormReturn<T extends Record<string, any>> {
  values: T;
  errors: Partial<Record<keyof T, string>>;
  touched: Partial<Record<keyof T, boolean>>;
  isValid: boolean;
  isSubmitting: boolean;
  isDirty: boolean;
  setFieldValue: <K extends keyof T>(field: K, value: T[K]) => void;
  setFieldError: <K extends keyof T>(field: K, error: string) => void;
  setFieldTouched: <K extends keyof T>(field: K, touched: boolean) => void;
  handleChange: (field: keyof T) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  handleBlur: (field: keyof T) => (event: React.FocusEvent) => void;
  handleSubmit: (event: React.FormEvent) => void;
  reset: () => void;
  validate: () => boolean;
}

// Export utility types for forms
export type FormErrors<T> = Partial<Record<keyof T, string>>;
export type FormTouched<T> = Partial<Record<keyof T, boolean>>;
export type FormValues<T> = T;