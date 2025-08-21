/**
 * Seawater Test Credentials for Development Environment
 * 
 * NOTE: These credentials are for development testing only.
 * Uses HoneyDo's Cognito infrastructure for authentication.
 */

export const SEAWATER_TEST_CREDENTIALS = {
  // Free tier user (using HoneyDo Cognito)
  FREE_USER: {
    email: 'seawater_free@happyhippo.ai',
    password: '123_SeaWater',
    first_name: 'Free',
    last_name: 'User',
    subscription_tier: 'free'
  },
  
  // Premium tier user
  PREMIUM_USER: {
    email: 'seawater_premium@happyhippo.ai',
    password: '123_SeaWater',
    first_name: 'Premium',
    last_name: 'User',
    subscription_tier: 'premium'
  },
  
  // Professional tier user  
  PROFESSIONAL_USER: {
    email: 'seawater_pro@happyhippo.ai',
    password: '123_SeaWater',
    first_name: 'Professional',
    last_name: 'User',
    subscription_tier: 'professional'
  },
  
  // Test user for new registrations
  NEW_USER_TEMPLATE: {
    email_prefix: 'seawater_test_',
    password: '123_SeaWater',
    first_name: 'Test',
    last_name: 'User',
    company: 'Test Company',
    intended_use: 'business'
  }
};

/**
 * Test property addresses for risk assessments
 * Organized by risk type and severity for comprehensive testing
 */
export const TEST_ADDRESSES = {
  // High flood risk properties
  HIGH_FLOOD_RISK: [
    '123 Riverside Drive, Miami, FL 33101',
    '456 Bayfront Ave, New Orleans, LA 70130',
    '789 Coastal Blvd, Virginia Beach, VA 23451',
    '101 Waterfront Way, Charleston, SC 29401',
    '555 Bay Street, Galveston, TX 77550'
  ],
  
  // Low risk properties
  LOW_RISK: [
    '321 Mountain View Rd, Denver, CO 80202',
    '654 Prairie Lane, Omaha, NE 68102',
    '987 Hillside Dr, Phoenix, AZ 85001',
    '123 Highland Ave, Flagstaff, AZ 86001',
    '456 Valley Road, Boise, ID 83702'
  ],
  
  // Wildfire risk properties
  WILDFIRE_RISK: [
    '111 Forest Glen Rd, Paradise, CA 95969',
    '222 Oak Canyon Dr, Malibu, CA 90265',
    '333 Pine Ridge Way, Boulder, CO 80301',
    '444 Canyon View Dr, Santa Barbara, CA 93105',
    '777 Ridge Road, Napa, CA 94558'
  ],

  // Hurricane risk properties
  HURRICANE_RISK: [
    '100 Ocean Drive, Key West, FL 33040',
    '200 Beachfront Blvd, Outer Banks, NC 27949',
    '300 Gulf Shore Dr, Gulf Shores, AL 36542',
    '400 Atlantic Ave, Virginia Beach, VA 23451'
  ],

  // Earthquake risk properties
  EARTHQUAKE_RISK: [
    '500 Fault Line Rd, San Francisco, CA 94102',
    '600 Seismic St, Los Angeles, CA 90210',
    '700 Tremor Trail, Anchorage, AK 99501',
    '800 Shake Ave, Seattle, WA 98101'
  ],

  // Tornado risk properties
  TORNADO_RISK: [
    '900 Twister Ln, Moore, OK 73160',
    '1000 Storm St, Joplin, MO 64801',
    '1100 Cyclone Ct, Tuscaloosa, AL 35401',
    '1200 Whirlwind Way, El Reno, OK 73036'
  ],

  // Heat risk properties
  HEAT_RISK: [
    '1300 Desert Dr, Phoenix, AZ 85001',
    '1400 Scorching St, Las Vegas, NV 89101',
    '1500 Blazing Blvd, Death Valley, CA 92328',
    '1600 Sweltering Sq, Tucson, AZ 85701'
  ],

  // Drought risk properties
  DROUGHT_RISK: [
    '1700 Arid Ave, Bakersfield, CA 93301',
    '1800 Parched Pl, Lubbock, TX 79401',
    '1900 Barren Blvd, Fresno, CA 93701',
    '2000 Dry Dr, Amarillo, TX 79101'
  ],
  
  // Multi-hazard properties (for comprehensive assessment testing)
  MULTI_HAZARD: [
    '2100 Risk Ridge Rd, Santa Monica, CA 90401', // Fire + Earthquake + Heat
    '2200 Danger Dr, Houston, TX 77001', // Hurricane + Flood + Heat
    '2300 Peril Pike, Miami Beach, FL 33139', // Hurricane + Flood + Heat
    '2400 Hazard Heights, New Orleans, LA 70112' // Hurricane + Flood + Heat
  ],
  
  // Invalid/test addresses
  INVALID: [
    '999 Nonexistent St, Faketown, XX 99999',
    'Not a real address',
    '',
    '123 Incomplete',
    'Special Characters !@#$%^&*()',
    '   ', // Whitespace only
    'Very Long Address Name That Exceeds Normal Limits And Should Be Handled Gracefully By The System Without Breaking The UI Or Causing Errors, Located Somewhere in the United States of America on a Very Long Street Name'
  ],

  // Test addresses for specific feature testing
  QUICK_TEST: [
    '100 Main St, Denver, CO 80202', // Reliable low-risk address for quick tests
    '200 Beach Rd, Miami, FL 33101', // Reliable high-risk address for quick tests
  ]
};

/**
 * API endpoints for testing
 */
export const SEAWATER_API_ENDPOINTS = {
  HEALTH: '/api/health',
  RISK_ASSESS: '/api/risk/assess',
  GEOCODE: '/api/geo/geocode',
  PROFESSIONALS: '/api/professionals/search',
  SUBSCRIPTION: '/api/subscription/current',
  REPORTS: '/api/reports/generate'
};

/**
 * Test environments
 */
export const TEST_ENVIRONMENTS = {
  LOCAL: 'http://localhost:3000',
  PRODUCTION: 'https://www.seawater.io',
  TEST: 'https://test.seawater.io',
  DEV: process.env.SEAWATER_DEV_URL || 'https://dev.seawater.ai',
  STAGING: process.env.SEAWATER_STAGING_URL || 'https://staging.seawater.ai'
};

/**
 * Environment-specific credentials for production and test domains
 */
export const ENVIRONMENT_CREDENTIALS = {
  PRODUCTION: {
    FREE_USER: {
      email: 'seawater_prod_free@happyhippo.ai',
      password: '123_SeaWater_Prod',
      subscription_tier: 'free'
    },
    PREMIUM_USER: {
      email: 'seawater_prod_premium@happyhippo.ai',
      password: '123_SeaWater_Prod',
      subscription_tier: 'premium'
    },
    PROFESSIONAL_USER: {
      email: 'seawater_prod_pro@happyhippo.ai',
      password: '123_SeaWater_Prod',
      subscription_tier: 'professional'
    }
  },
  TEST: {
    FREE_USER: {
      email: 'seawater_test_free@happyhippo.ai',
      password: '123_SeaWater_Test',
      subscription_tier: 'free'
    },
    PREMIUM_USER: {
      email: 'seawater_test_premium@happyhippo.ai',
      password: '123_SeaWater_Test',
      subscription_tier: 'premium'
    },
    PROFESSIONAL_USER: {
      email: 'seawater_test_pro@happyhippo.ai',
      password: '123_SeaWater_Test',
      subscription_tier: 'professional'
    }
  }
};

/**
 * Expected subscription limits for testing
 */
export const SUBSCRIPTION_TEST_LIMITS = {
  free: {
    monthly_assessments: 3,
    api_calls_per_hour: 0,
    bulk_analysis: false,
    professional_reports: false
  },
  premium: {
    monthly_assessments: 100,
    api_calls_per_hour: 100,
    bulk_analysis: true,
    professional_reports: true
  },
  professional: {
    monthly_assessments: 1000,
    api_calls_per_hour: 1000,
    bulk_analysis: true,
    professional_reports: true
  }
};

/**
 * Test timeouts and delays
 */
export const TEST_TIMEOUTS = {
  SHORT: 5000,
  MEDIUM: 15000,
  LONG: 30000,
  API_RESPONSE: 10000,
  PAGE_LOAD: 20000,
  REPORT_GENERATION: 60000
};

/**
 * Mobile viewport sizes for responsive testing
 */
export const MOBILE_VIEWPORTS = {
  IPHONE_12: { width: 390, height: 844 },
  SAMSUNG_GALAXY: { width: 412, height: 915 },
  TABLET: { width: 768, height: 1024 }
};

/**
 * Risk assessment test scenarios
 */
export const RISK_TEST_SCENARIOS = {
  BASIC_ASSESSMENT: {
    address: TEST_ADDRESSES.HIGH_FLOOD_RISK[0],
    expected_hazards: ['flood', 'hurricane'],
    expected_score_range: [7, 10]
  },
  COMPARISON_TEST: {
    addresses: [
      TEST_ADDRESSES.HIGH_FLOOD_RISK[0],
      TEST_ADDRESSES.LOW_RISK[0]
    ],
    expected_difference: 'significant'
  },
  BULK_ANALYSIS: {
    addresses: [
      ...TEST_ADDRESSES.HIGH_FLOOD_RISK,
      ...TEST_ADDRESSES.LOW_RISK
    ],
    format: 'json',
    expected_count: 6
  }
};