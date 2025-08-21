/**
 * Environment-specific configuration for Seawater Climate Risk Platform tests
 * Supports local, production (www.seawater.io), and test (test.seawater.io) environments
 */

export interface EnvironmentConfig {
  name: string;
  baseURL: string;
  apiEndpoint: string;
  timeout: {
    short: number;
    medium: number;
    long: number;
    apiResponse: number;
  };
  features: {
    authentication: boolean;
    subscriptions: boolean;
    propertyAssessment: boolean;
    trialSystem: boolean;
    professionalFeatures: boolean;
  };
  ssl: {
    enabled: boolean;
    ignoreErrors: boolean;
  };
  performance: {
    enabled: boolean;
    thresholds: {
      pageLoad: number;
      assessmentTime: number;
      firstContentfulPaint: number;
    };
  };
  cookies: {
    sameSite: 'strict' | 'lax' | 'none';
    secure: boolean;
  };
}

export const ENVIRONMENTS: Record<string, EnvironmentConfig> = {
  local: {
    name: 'Local Development',
    baseURL: 'http://localhost:3000',
    apiEndpoint: 'http://localhost:3000/api',
    timeout: {
      short: 5000,
      medium: 15000,
      long: 30000,
      apiResponse: 10000,
    },
    features: {
      authentication: true,
      subscriptions: true,
      propertyAssessment: true,
      trialSystem: true,
      professionalFeatures: false, // May not be fully implemented locally
    },
    ssl: {
      enabled: false,
      ignoreErrors: false,
    },
    performance: {
      enabled: true,
      thresholds: {
        pageLoad: 3000,
        assessmentTime: 8000,
        firstContentfulPaint: 1500,
      },
    },
    cookies: {
      sameSite: 'lax',
      secure: false,
    },
  },

  production: {
    name: 'Production (www.seawater.io)',
    baseURL: 'https://www.seawater.io',
    apiEndpoint: 'https://api.seawater.io',
    timeout: {
      short: 8000,
      medium: 20000,
      long: 45000,
      apiResponse: 15000,
    },
    features: {
      authentication: true,
      subscriptions: true,
      propertyAssessment: true,
      trialSystem: true,
      professionalFeatures: true,
    },
    ssl: {
      enabled: true,
      ignoreErrors: false,
    },
    performance: {
      enabled: true,
      thresholds: {
        pageLoad: 5000,
        assessmentTime: 12000,
        firstContentfulPaint: 2000,
      },
    },
    cookies: {
      sameSite: 'strict',
      secure: true,
    },
  },

  test: {
    name: 'Test Environment (test.seawater.io)',
    baseURL: 'https://test.seawater.io',
    apiEndpoint: 'https://test-api.seawater.io',
    timeout: {
      short: 10000,
      medium: 25000,
      long: 60000,
      apiResponse: 20000,
    },
    features: {
      authentication: true,
      subscriptions: true,
      propertyAssessment: true,
      trialSystem: true,
      professionalFeatures: true,
    },
    ssl: {
      enabled: true,
      ignoreErrors: true, // Test environment may have self-signed certs
    },
    performance: {
      enabled: false, // Performance may be slower in test environment
      thresholds: {
        pageLoad: 8000,
        assessmentTime: 20000,
        firstContentfulPaint: 3000,
      },
    },
    cookies: {
      sameSite: 'lax',
      secure: true,
    },
  },
};

/**
 * Get configuration for current test environment
 */
export function getEnvironmentConfig(): EnvironmentConfig {
  const env = process.env.TEST_ENV || 'local';
  const config = ENVIRONMENTS[env];
  
  if (!config) {
    throw new Error(`Unknown test environment: ${env}. Available: ${Object.keys(ENVIRONMENTS).join(', ')}`);
  }
  
  return config;
}

/**
 * Test URLs for different features based on environment
 */
export function getTestUrls(baseURL: string) {
  return {
    home: `${baseURL}/`,
    assessment: `${baseURL}/`,
    auth: {
      login: `${baseURL}/auth/login`,
      register: `${baseURL}/auth/register`,
      logout: `${baseURL}/auth/logout`,
    },
    dashboard: `${baseURL}/dashboard`,
    compare: `${baseURL}/compare`,
    pricing: `${baseURL}/pricing`,
    professional: {
      dashboard: `${baseURL}/professional`,
      bulkAnalysis: `${baseURL}/professional/bulk`,
      apiKeys: `${baseURL}/professional/api-keys`,
      clients: `${baseURL}/professional/clients`,
    },
    api: {
      health: `${baseURL}/api/health`,
      riskAssess: `${baseURL}/api/risk/assess`,
      geocode: `${baseURL}/api/geo/geocode`,
      subscription: `${baseURL}/api/subscription/status`,
    },
  };
}

/**
 * Feature flags for different environments
 */
export function getFeatureFlags(environment: string) {
  const config = ENVIRONMENTS[environment] || ENVIRONMENTS.local;
  return config.features;
}

/**
 * Performance expectations by environment
 */
export function getPerformanceThresholds(environment: string) {
  const config = ENVIRONMENTS[environment] || ENVIRONMENTS.local;
  return config.performance.thresholds;
}

/**
 * DNS and SSL verification settings
 */
export function getSSLConfig(environment: string) {
  const config = ENVIRONMENTS[environment] || ENVIRONMENTS.local;
  return config.ssl;
}

/**
 * Cross-environment comparison tests configuration
 */
export const CROSS_ENVIRONMENT_TESTS = {
  // Tests that should work consistently across environments
  coreFeatures: [
    'landing_page_loads',
    'property_assessment_basic',
    'trial_system_functionality',
    'responsive_design',
  ],
  
  // Tests that may behave differently between environments
  environmentSpecific: [
    'performance_metrics',
    'ssl_certificates',
    'cookie_behavior',
    'api_response_times',
  ],
  
  // Features that should only be tested in specific environments
  productionOnly: [
    'subscription_payments',
    'professional_features_full',
    'third_party_integrations',
  ],
  
  testEnvironmentOnly: [
    'development_features',
    'debug_endpoints',
    'test_data_endpoints',
  ],
};