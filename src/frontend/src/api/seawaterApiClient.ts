// Seawater Climate Risk API Client - Following HoneyDo patterns
import { 
  APIResponse, 
  APIError,
  PropertyRiskParams,
  PropertyRiskResponse,
  ComparisonParams,
  PropertyComparisonResponse,
  GeocodingParams,
  GeocodingResponse,
  ProfessionalSearchParams,
  ProfessionalSearchResponse,
  SpatialSearchParams,
  SpatialSearchResponse,
  HistoricalEventsParams,
  HistoricalEventsResponse,
  ClimateProjectionsResponse,
  BulkAnalysisRequest,
  BulkAnalysisJob,
  ReportGenerationRequest,
  ReportGenerationResponse,
  UserProfileUpdate,
  SubscriptionUpgrade,
  APIKeyRequest,
  APIKey,
  WebhookConfig,
  TrendDataParams
} from '../types/api';

// Environment configuration - Production API endpoint
const API_BASE = process.env.REACT_APP_SEAWATER_API_URL || 'https://5puux7rpx0.execute-api.us-east-2.amazonaws.com/dev';

// Seawater API endpoints for climate risk platform
export const SEAWATER_API_ENDPOINTS = {
  // Authentication endpoints (using HoneyDo Cognito)
  AUTH: {
    REGISTER: API_BASE + '/auth/register',
    PROFILE: API_BASE + '/auth/profile',
    USAGE: API_BASE + '/auth/usage',
    SUBSCRIPTION: API_BASE + '/auth/subscription'
  },

  // Property risk assessment endpoints
  RISK: {
    ASSESS: API_BASE + '/risk/assess',
    COMPARE: API_BASE + '/risk/compare',
    BATCH: API_BASE + '/risk/batch',
    TRENDS: (addressHash: string) => API_BASE + `/risk/trends/${addressHash}`,
    HISTORY: API_BASE + '/risk/history'
  },

  // Geographic and mapping endpoints
  GEO: {
    GEOCODE: API_BASE + '/geo/geocode',
    REVERSE: API_BASE + '/geo/reverse',
    SEARCH: API_BASE + '/geo/search',
    SPATIAL: API_BASE + '/geo/spatial'
  },

  // Climate data endpoints
  CLIMATE: {
    CURRENT: API_BASE + '/climate/current',
    PROJECTIONS: API_BASE + '/climate/projections',
    HISTORICAL: API_BASE + '/climate/historical',
    SCENARIOS: API_BASE + '/climate/scenarios'
  },

  // Professional services endpoints
  PROFESSIONALS: {
    SEARCH: API_BASE + '/professionals/search',
    GET: (professionalId: string) => API_BASE + `/professionals/${professionalId}`,
    CONTACT: (professionalId: string) => API_BASE + `/professionals/${professionalId}/contact`,
    REVIEWS: (professionalId: string) => API_BASE + `/professionals/${professionalId}/reviews`
  },

  // Report generation endpoints
  REPORTS: {
    GENERATE: API_BASE + '/reports/generate',
    STATUS: (reportId: string) => API_BASE + `/reports/${reportId}/status`,
    DOWNLOAD: (reportId: string) => API_BASE + `/reports/${reportId}/download`,
    LIST: API_BASE + '/reports'
  },

  // Subscription management endpoints
  SUBSCRIPTION: {
    CURRENT: API_BASE + '/subscription/current',
    UPGRADE: API_BASE + '/subscription/upgrade',
    BILLING: API_BASE + '/subscription/billing',
    USAGE: API_BASE + '/subscription/usage',
    HISTORY: API_BASE + '/subscription/history'
  },

  // API management endpoints (Professional tier)
  API_KEYS: {
    LIST: API_BASE + '/api-keys',
    CREATE: API_BASE + '/api-keys',
    REVOKE: (keyId: string) => API_BASE + `/api-keys/${keyId}/revoke`,
    USAGE: (keyId: string) => API_BASE + `/api-keys/${keyId}/usage`
  },

  // Webhook management endpoints (Professional tier)
  WEBHOOKS: {
    LIST: API_BASE + '/webhooks',
    CREATE: API_BASE + '/webhooks',
    UPDATE: (webhookId: string) => API_BASE + `/webhooks/${webhookId}`,
    DELETE: (webhookId: string) => API_BASE + `/webhooks/${webhookId}`,
    TEST: (webhookId: string) => API_BASE + `/webhooks/${webhookId}/test`
  },

  // Health check endpoint
  HEALTH: API_BASE + '/health'
};

// Subscription tier type definition
export type SubscriptionTier = 'free' | 'premium' | 'professional';

// Subscription tier configurations
export const SUBSCRIPTION_LIMITS = {
  free: {
    monthly_assessments: 3,
    api_calls_per_hour: 0,
    bulk_analysis: false,
    professional_reports: false,
    api_access: false,
    webhook_support: false
  },
  premium: {
    monthly_assessments: 100,
    api_calls_per_hour: 100,
    bulk_analysis: true,
    professional_reports: true,
    api_access: true,
    webhook_support: false
  },
  professional: {
    monthly_assessments: 1000,
    api_calls_per_hour: 1000,
    bulk_analysis: true,
    professional_reports: true,
    api_access: true,
    webhook_support: true
  }
};

// Enhanced API client following HoneyDo patterns
export const Make_Seawater_API_Call = async <T>(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  body?: any,
  options: any = {}
): Promise<APIResponse<T>> => {
  try {
    // Get auth token from HoneyDo Cognito
    const token = localStorage.getItem('honeydo_token') || localStorage.getItem('seawater_token');
    
    // Debug logging (only in development)
    if (process.env.REACT_APP_ENABLE_DEBUG_LOGGING === 'true') {
      console.log(`[Seawater API] Making ${method} request to: ${endpoint}`, {
        options,
        hasToken: !!token,
        hasBody: !!body
      });
    }

    // Build fetch options with proper headers
    const fetchOptions: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-Client-Version': process.env.REACT_APP_VERSION || '1.0.0',
        'X-Client-Type': 'seawater-climate-risk-app',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...(options.headers || {})
      }
    };

    // Add request body for POST/PUT requests
    if (['POST', 'PUT'].includes(method) && body !== undefined) {
      fetchOptions.body = JSON.stringify(body);
    }

    // Build URL with query parameters if provided
    let url = endpoint.startsWith('http') ? endpoint : API_BASE + endpoint;
    
    if (options.params) {
      const searchParams = new URLSearchParams();
      Object.entries(options.params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      });
      const queryString = searchParams.toString();
      if (queryString) {
        url = `${url}${url.includes('?') ? '&' : '?'}${queryString}`;
      }
    }

    // Make the fetch request
    const response = await fetch(url, fetchOptions);
    
    // Check response content type
    const contentType = response.headers.get('content-type');
    const isJson = contentType && contentType.includes('application/json');
    
    // Process JSON responses
    if (isJson) {
      try {
        const data = await response.json();
        
        // Debug successful responses
        if (process.env.REACT_APP_ENABLE_DEBUG_LOGGING === 'true' && data.success) {
          console.log(`[Seawater API] Success response from ${endpoint}:`, {
            message: data.message,
            dataType: typeof data.data,
            hasRiskData: !!data.data?.risk_assessment,
            hasProperties: !!data.data?.properties
          });
        }
        
        return data as APIResponse<T>;
      } catch (jsonError) {
        console.error('[Seawater API] JSON parse error:', jsonError);
        
        return {
          success: false,
          error: {
            code: 'JSON_PARSE_ERROR',
            message: 'Server returned invalid JSON',
            details: `Status ${response.status} ${response.statusText} for ${url}`
          }
        };
      }
    }
    
    // Handle non-JSON responses (usually errors)
    try {
      const textContent = await response.text();
      const preview = textContent.substring(0, 200) + (textContent.length > 200 ? '...' : '');
      console.error(`[Seawater API] Non-JSON response: ${contentType} for ${url}, preview: ${preview}`);
      
      return {
        success: false,
        error: {
          code: 'NON_JSON_RESPONSE',
          message: 'Server response was not in JSON format',
          details: `Content-Type: ${contentType || 'unknown'}, Status: ${response.status}`
        }
      };
    } catch (e) {
      console.error('[Seawater API] Could not read response:', e);
      
      return {
        success: false,
        error: {
          code: 'RESPONSE_READ_ERROR',
          message: 'Unable to read server response',
          details: `Status ${response.status} ${response.statusText} for ${url}`
        }
      };
    }
  } catch (error) {
    // Handle network errors and other exceptions
    console.error('[Seawater API] Request failed:', error);
    
    return {
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message: error instanceof Error ? error.message : 'Network request failed',
        details: JSON.stringify(error)
      }
    };
  }
};

// Helper function to make authorized API calls with subscription tier validation
export const MakeAuthorizedCall = async <T>(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  body?: any,
  options: any = {},
  requiredTier?: SubscriptionTier
): Promise<APIResponse<T>> => {
  // Check subscription tier if required
  if (requiredTier) {
    const userTier = localStorage.getItem('seawater_user_tier') as SubscriptionTier;
    if (!userTier || !isSubscriptionTierSufficient(userTier, requiredTier)) {
      return {
        success: false,
        error: {
          code: 'INSUFFICIENT_SUBSCRIPTION',
          message: `Feature requires ${requiredTier} tier, current tier: ${userTier || 'none'}`,
          details: 'Please upgrade your subscription to access this feature'
        }
      };
    }
  }

  return Make_Seawater_API_Call<T>(endpoint, method, body, options);
};

// Helper function to check if subscription tier is sufficient
function isSubscriptionTierSufficient(currentTier: SubscriptionTier, requiredTier: SubscriptionTier): boolean {
  const tierHierarchy: Record<SubscriptionTier, number> = {
    free: 0,
    premium: 1,
    professional: 2
  };
  
  return tierHierarchy[currentTier] >= tierHierarchy[requiredTier];
}

// Convenience wrapper for the SeawaterApiClient class
export class SeawaterApiClient {
  // Test API connection
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const response = await Make_Seawater_API_Call(SEAWATER_API_ENDPOINTS.HEALTH);
      if (response.success) {
        return { success: true, message: 'Seawater API connection successful' };
      } else {
        return { success: false, message: response.error.message || 'API connection failed' };
      }
    } catch (error) {
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'API connection test failed' 
      };
    }
  }

  // Property Risk Assessment Methods
  async assessPropertyRisk(params: PropertyRiskParams): Promise<PropertyRiskResponse> {
    return MakeAuthorizedCall(SEAWATER_API_ENDPOINTS.RISK.ASSESS, 'POST', params);
  }

  async compareProperties(params: ComparisonParams): Promise<PropertyComparisonResponse> {
    return MakeAuthorizedCall(SEAWATER_API_ENDPOINTS.RISK.COMPARE, 'POST', params, {}, 'premium');
  }

  async getTrendData(addressHash: string, params: TrendDataParams): Promise<APIResponse<any>> {
    return MakeAuthorizedCall(SEAWATER_API_ENDPOINTS.RISK.TRENDS(addressHash), 'GET', undefined, { params }, 'premium');
  }

  async getHistoricalEvents(params: HistoricalEventsParams): Promise<HistoricalEventsResponse> {
    return MakeAuthorizedCall(SEAWATER_API_ENDPOINTS.RISK.HISTORY, 'GET', undefined, { params });
  }

  // Geographic and Mapping Methods
  async geocodeAddress(params: GeocodingParams): Promise<GeocodingResponse> {
    return Make_Seawater_API_Call(SEAWATER_API_ENDPOINTS.GEO.GEOCODE, 'GET', undefined, { params });
  }

  async spatialSearch(params: SpatialSearchParams): Promise<SpatialSearchResponse> {
    return MakeAuthorizedCall(SEAWATER_API_ENDPOINTS.GEO.SPATIAL, 'GET', undefined, { params }, 'premium');
  }

  // Climate Data Methods
  async getClimateProjections(latitude: number, longitude: number): Promise<ClimateProjectionsResponse> {
    return MakeAuthorizedCall(SEAWATER_API_ENDPOINTS.CLIMATE.PROJECTIONS, 'GET', undefined, { 
      params: { latitude, longitude } 
    }, 'premium');
  }

  // Professional Services Methods
  async searchProfessionals(params: ProfessionalSearchParams): Promise<ProfessionalSearchResponse> {
    return Make_Seawater_API_Call(SEAWATER_API_ENDPOINTS.PROFESSIONALS.SEARCH, 'GET', undefined, { params });
  }

  async contactProfessional(professionalId: string, message: string, contactInfo: any): Promise<APIResponse<any>> {
    return MakeAuthorizedCall(SEAWATER_API_ENDPOINTS.PROFESSIONALS.CONTACT(professionalId), 'POST', {
      message,
      contact_info: contactInfo
    });
  }

  // Report Generation Methods (Premium/Professional)
  async generateReport(params: ReportGenerationRequest): Promise<APIResponse<ReportGenerationResponse>> {
    return MakeAuthorizedCall(SEAWATER_API_ENDPOINTS.REPORTS.GENERATE, 'POST', params, {}, 'premium');
  }

  async getReportStatus(reportId: string): Promise<APIResponse<ReportGenerationResponse>> {
    return MakeAuthorizedCall(SEAWATER_API_ENDPOINTS.REPORTS.STATUS(reportId), 'GET', undefined, {}, 'premium');
  }

  async listReports(): Promise<APIResponse<ReportGenerationResponse[]>> {
    return MakeAuthorizedCall(SEAWATER_API_ENDPOINTS.REPORTS.LIST, 'GET', undefined, {}, 'premium');
  }

  // Bulk Analysis Methods (Professional)
  async createBulkAnalysis(request: BulkAnalysisRequest): Promise<APIResponse<BulkAnalysisJob>> {
    return MakeAuthorizedCall(SEAWATER_API_ENDPOINTS.RISK.BATCH, 'POST', request, {}, 'professional');
  }

  // User Profile and Subscription Methods
  async getUserProfile(): Promise<APIResponse<any>> {
    return MakeAuthorizedCall(SEAWATER_API_ENDPOINTS.AUTH.PROFILE, 'GET');
  }

  async updateUserProfile(updates: UserProfileUpdate): Promise<APIResponse<any>> {
    return MakeAuthorizedCall(SEAWATER_API_ENDPOINTS.AUTH.PROFILE, 'PUT', updates);
  }

  async getCurrentSubscription(): Promise<APIResponse<any>> {
    return MakeAuthorizedCall(SEAWATER_API_ENDPOINTS.SUBSCRIPTION.CURRENT, 'GET');
  }

  async upgradeSubscription(upgrade: SubscriptionUpgrade): Promise<APIResponse<any>> {
    return MakeAuthorizedCall(SEAWATER_API_ENDPOINTS.SUBSCRIPTION.UPGRADE, 'POST', upgrade);
  }

  async getUsageStats(): Promise<APIResponse<any>> {
    return MakeAuthorizedCall(SEAWATER_API_ENDPOINTS.SUBSCRIPTION.USAGE, 'GET');
  }

  // API Key Management (Professional)
  async createApiKey(request: APIKeyRequest): Promise<APIResponse<APIKey>> {
    return MakeAuthorizedCall(SEAWATER_API_ENDPOINTS.API_KEYS.CREATE, 'POST', request, {}, 'professional');
  }

  async listApiKeys(): Promise<APIResponse<APIKey[]>> {
    return MakeAuthorizedCall(SEAWATER_API_ENDPOINTS.API_KEYS.LIST, 'GET', undefined, {}, 'professional');
  }

  async revokeApiKey(keyId: string): Promise<APIResponse<any>> {
    return MakeAuthorizedCall(SEAWATER_API_ENDPOINTS.API_KEYS.REVOKE(keyId), 'DELETE', undefined, {}, 'professional');
  }

  // Webhook Management (Professional)
  async createWebhook(config: WebhookConfig): Promise<APIResponse<any>> {
    return MakeAuthorizedCall(SEAWATER_API_ENDPOINTS.WEBHOOKS.CREATE, 'POST', config, {}, 'professional');
  }

  async listWebhooks(): Promise<APIResponse<any[]>> {
    return MakeAuthorizedCall(SEAWATER_API_ENDPOINTS.WEBHOOKS.LIST, 'GET', undefined, {}, 'professional');
  }

  async updateWebhook(webhookId: string, config: Partial<WebhookConfig>): Promise<APIResponse<any>> {
    return MakeAuthorizedCall(SEAWATER_API_ENDPOINTS.WEBHOOKS.UPDATE(webhookId), 'PUT', config, {}, 'professional');
  }

  async deleteWebhook(webhookId: string): Promise<APIResponse<any>> {
    return MakeAuthorizedCall(SEAWATER_API_ENDPOINTS.WEBHOOKS.DELETE(webhookId), 'DELETE', undefined, {}, 'professional');
  }

  // Usage tracking for free tier limits
  async checkUsageLimits(): Promise<{ canMakeRequest: boolean; remaining: number; resetDate: Date }> {
    try {
      const userTier = localStorage.getItem('seawater_user_tier') as SubscriptionTier || 'free';
      const response = await this.getUsageStats();
      
      if (!response.success) {
        // If usage check fails, allow request but warn
        console.warn('Could not check usage limits, allowing request');
        return { canMakeRequest: true, remaining: 0, resetDate: new Date() };
      }

      const limits = SUBSCRIPTION_LIMITS[userTier];
      const usage = response.data;
      
      return {
        canMakeRequest: usage.monthly_assessments < limits.monthly_assessments,
        remaining: Math.max(0, limits.monthly_assessments - usage.monthly_assessments),
        resetDate: new Date(usage.reset_date)
      };
    } catch (error) {
      console.error('Error checking usage limits:', error);
      return { canMakeRequest: true, remaining: 0, resetDate: new Date() };
    }
  }
}

// Export singleton instance for backward compatibility
export const seawaterApiClient = new SeawaterApiClient();

// Helper function to check if user has reached free tier limit
export async function checkFreeTierLimits(): Promise<{
  hasReachedLimit: boolean;
  usageInfo: {
    used: number;
    limit: number;
    remaining: number;
    resetDate: Date;
  };
}> {
  const userTier = localStorage.getItem('seawater_user_tier') as SubscriptionTier || 'free';
  
  if (userTier !== 'free') {
    return {
      hasReachedLimit: false,
      usageInfo: {
        used: 0,
        limit: SUBSCRIPTION_LIMITS[userTier].monthly_assessments,
        remaining: SUBSCRIPTION_LIMITS[userTier].monthly_assessments,
        resetDate: new Date()
      }
    };
  }

  const usageCheck = await seawaterApiClient.checkUsageLimits();
  const limits = SUBSCRIPTION_LIMITS.free;
  
  return {
    hasReachedLimit: !usageCheck.canMakeRequest,
    usageInfo: {
      used: limits.monthly_assessments - usageCheck.remaining,
      limit: limits.monthly_assessments,
      remaining: usageCheck.remaining,
      resetDate: usageCheck.resetDate
    }
  };
}