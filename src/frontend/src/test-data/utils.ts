// Test Data Utilities for Seawater Climate Risk Platform
// Helper functions and utilities for working with test data

import { 
  PropertyRiskData, 
  RiskLevel, 
  HazardType, 
  User, 
  SubscriptionTier,
  Coordinates
} from '../types';

// Risk Level Generators
export const riskLevelUtils = {
  /**
   * Generate a random risk level weighted toward realistic distributions
   */
  generateWeightedRiskLevel(): RiskLevel {
    const weights = {
      'LOW': 30,
      'MODERATE': 35,
      'HIGH': 25,
      'VERY_HIGH': 8,
      'EXTREME': 2
    };
    
    const random = Math.random() * 100;
    let cumulative = 0;
    
    for (const [level, weight] of Object.entries(weights)) {
      cumulative += weight;
      if (random <= cumulative) {
        return level as RiskLevel;
      }
    }
    
    return 'MODERATE';
  },

  /**
   * Convert risk score to risk level
   */
  scoreToLevel(score: number): RiskLevel {
    if (score >= 90) return 'EXTREME';
    if (score >= 75) return 'VERY_HIGH';
    if (score >= 60) return 'HIGH';
    if (score >= 40) return 'MODERATE';
    return 'LOW';
  },

  /**
   * Generate risk score from level with realistic variance
   */
  levelToScoreRange(level: RiskLevel): { min: number; max: number } {
    const ranges = {
      'LOW': { min: 10, max: 39 },
      'MODERATE': { min: 40, max: 59 },
      'HIGH': { min: 60, max: 74 },
      'VERY_HIGH': { min: 75, max: 89 },
      'EXTREME': { min: 90, max: 99 }
    };
    
    return ranges[level];
  }
};

// Geographic Utilities
export const geoUtils = {
  /**
   * Generate coordinates within a bounding box
   */
  generateCoordinatesInBounds(bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  }): Coordinates {
    const latitude = bounds.south + Math.random() * (bounds.north - bounds.south);
    const longitude = bounds.west + Math.random() * (bounds.east - bounds.west);
    
    return {
      latitude: Math.round(latitude * 10000) / 10000,
      longitude: Math.round(longitude * 10000) / 10000
    };
  },

  /**
   * Calculate distance between two coordinates (Haversine formula)
   */
  calculateDistance(coord1: Coordinates, coord2: Coordinates): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(coord2.latitude - coord1.latitude);
    const dLon = this.toRadians(coord2.longitude - coord1.longitude);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(coord1.latitude)) * Math.cos(this.toRadians(coord2.latitude)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    
    return R * c;
  },

  toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  },

  /**
   * Generate realistic US addresses
   */
  generateUSAddress(): string {
    const streetNumbers = [Math.floor(Math.random() * 9999) + 1];
    const streetNames = ['Main St', 'Oak Ave', 'Pine Rd', 'Elm St', 'Cedar Ln', 'Park Blvd', 'First St', 'Second Ave'];
    const cities = [
      { name: 'Miami', state: 'FL', zip: '33132' },
      { name: 'Austin', state: 'TX', zip: '78701' },
      { name: 'Denver', state: 'CO', zip: '80202' },
      { name: 'Portland', state: 'OR', zip: '97201' },
      { name: 'Atlanta', state: 'GA', zip: '30309' },
      { name: 'Seattle', state: 'WA', zip: '98101' }
    ];
    
    const streetNumber = streetNumbers[0];
    const streetName = streetNames[Math.floor(Math.random() * streetNames.length)];
    const city = cities[Math.floor(Math.random() * cities.length)];
    
    return `${streetNumber} ${streetName}, ${city.name}, ${city.state} ${city.zip}`;
  },

  /**
   * Get common hazards by US region
   */
  getRegionalHazards(state: string): HazardType[] {
    const regionalHazards: Record<string, HazardType[]> = {
      'FL': ['hurricane', 'coastal_flooding', 'heat', 'lightning'],
      'TX': ['tornado', 'hurricane', 'heat', 'drought', 'flood', 'hail'],
      'CA': ['wildfire', 'earthquake', 'drought', 'heat'],
      'CO': ['wildfire', 'hail', 'winter_weather', 'tornado'],
      'OR': ['wildfire', 'earthquake', 'flood'],
      'WA': ['earthquake', 'flood', 'wildfire', 'winter_weather'],
      'GA': ['tornado', 'heat', 'flood', 'hurricane'],
      'LA': ['hurricane', 'flood', 'heat', 'tornado'],
      'SC': ['hurricane', 'coastal_flooding', 'tornado', 'heat'],
      'NC': ['hurricane', 'coastal_flooding', 'tornado', 'winter_weather']
    };
    
    return regionalHazards[state] || ['flood', 'heat', 'tornado'];
  }
};

// User Data Generators
export const userDataUtils = {
  /**
   * Generate realistic user profile
   */
  generateUserProfile(tier: SubscriptionTier = 'free'): Partial<User> {
    const firstNames = ['Sarah', 'Michael', 'Jessica', 'David', 'Emily', 'Robert', 'Ashley', 'Christopher'];
    const lastNames = ['Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez'];
    const companies = ['ABC Realty', 'Premier Properties', 'Coastal Insurance', 'Mountain View Homes', null, null];
    
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const company = tier !== 'free' ? companies[Math.floor(Math.random() * companies.length)] : null;
    
    return {
      id: `test_user_${Math.random().toString(36).substr(2, 9)}`,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`,
      first_name: firstName,
      last_name: lastName,
      company: company,
      subscription_tier: tier,
      subscription_status: 'active',
      created_at: this.generateRecentDate(90), // Within last 90 days
      preferences: {
        default_radius_km: [5, 10, 15, 25][Math.floor(Math.random() * 4)],
        preferred_risk_sources: tier === 'free' ? ['fema'] : ['fema', 'firststreet'],
        email_notifications: Math.random() > 0.3,
        units: 'imperial' as const,
        theme: ['light', 'dark', 'auto'][Math.floor(Math.random() * 3)] as any,
        intended_use: tier === 'free' ? 'personal' : Math.random() > 0.5 ? 'business' : 'personal'
      }
    };
  },

  /**
   * Generate realistic usage statistics
   */
  generateUsageStats(tier: SubscriptionTier): any {
    const tierLimits = {
      'free': { monthly: 10, daily: 2 },
      'premium': { monthly: 1000, daily: 50 },
      'professional': { monthly: 5000, daily: 200 },
      'enterprise': { monthly: 25000, daily: 1000 }
    };
    
    const limits = tierLimits[tier];
    const usagePercent = Math.random() * 0.8 + 0.1; // 10-90% of limit
    const currentUsage = Math.floor(limits.monthly * usagePercent);
    
    return {
      current_period_requests: currentUsage,
      current_period_limit: limits.monthly,
      requests_remaining: limits.monthly - currentUsage,
      reset_date: this.generateFutureDate(30),
      total_requests_all_time: Math.floor(currentUsage * (Math.random() * 10 + 1)),
      cost_current_period: tier === 'free' ? 0 : this.getTierPrice(tier)
    };
  },

  generateRecentDate(daysBack: number): string {
    const date = new Date();
    date.setDate(date.getDate() - Math.floor(Math.random() * daysBack));
    return date.toISOString();
  },

  generateFutureDate(daysForward: number): string {
    const date = new Date();
    date.setDate(date.getDate() + Math.floor(Math.random() * daysForward));
    return date.toISOString();
  },

  getTierPrice(tier: SubscriptionTier): number {
    const prices = {
      'free': 0,
      'premium': 49.99,
      'professional': 99.99,
      'enterprise': 499.99
    };
    
    return prices[tier];
  }
};

// Test Data Validators
export const validators = {
  /**
   * Validate property risk data structure
   */
  validatePropertyRiskData(data: PropertyRiskData): boolean {
    try {
      // Check required fields
      if (!data.property || !data.risk_assessment) return false;
      if (!data.property.coordinates || !data.property.address) return false;
      if (!data.risk_assessment.overall_score || !data.risk_assessment.risk_level) return false;
      
      // Validate score ranges
      if (data.risk_assessment.overall_score < 0 || data.risk_assessment.overall_score > 100) return false;
      
      // Validate hazard scores
      if (data.risk_assessment.hazards) {
        for (const hazard of Object.values(data.risk_assessment.hazards)) {
          if (hazard && (hazard.score < 0 || hazard.score > 100)) return false;
        }
      }
      
      return true;
    } catch (error) {
      return false;
    }
  },

  /**
   * Validate coordinate ranges
   */
  validateCoordinates(coords: Coordinates): boolean {
    return coords.latitude >= -90 && 
           coords.latitude <= 90 && 
           coords.longitude >= -180 && 
           coords.longitude <= 180;
  },

  /**
   * Validate user data structure
   */
  validateUserData(user: User): boolean {
    try {
      if (!user.id || !user.email || !user.subscription_tier) return false;
      if (!['free', 'premium', 'professional', 'enterprise'].includes(user.subscription_tier)) return false;
      if (user.email && !user.email.includes('@')) return false;
      
      return true;
    } catch (error) {
      return false;
    }
  }
};

// Data Transformation Utilities
export const transformUtils = {
  /**
   * Convert test data to API response format
   */
  toApiResponse<T>(data: T, success: boolean = true, processingTime: number = 200): any {
    if (success) {
      return {
        success: true,
        data: data,
        meta: {
          request_id: `test_req_${Math.random().toString(36).substr(2, 9)}`,
          timestamp: new Date().toISOString(),
          processing_time_ms: processingTime,
          cache_status: Math.random() > 0.7 ? 'hit' : 'miss',
          cost_credits: Math.random() > 0.5 ? 1 : 2
        }
      };
    } else {
      return {
        success: false,
        error: {
          code: 'TEST_ERROR',
          message: 'Simulated error for testing',
          details: {}
        },
        meta: {
          request_id: `test_req_${Math.random().toString(36).substr(2, 9)}`,
          timestamp: new Date().toISOString()
        }
      };
    }
  },

  /**
   * Add realistic delays to simulate network conditions
   */
  addNetworkDelay<T>(data: T, networkCondition: 'fast' | 'normal' | 'slow' = 'normal'): Promise<T> {
    const delays = {
      'fast': 50 + Math.random() * 100,
      'normal': 200 + Math.random() * 300,
      'slow': 1000 + Math.random() * 2000
    };
    
    return new Promise(resolve => {
      setTimeout(() => resolve(data), delays[networkCondition]);
    });
  },

  /**
   * Generate batch of test data
   */
  generateBatch<T>(generator: () => T, count: number): T[] {
    return Array.from({ length: count }, generator);
  }
};

// Data Privacy Utilities
export const privacyUtils = {
  /**
   * Anonymize user data for testing
   */
  anonymizeUserData(user: User): User {
    return {
      ...user,
      email: `test_user_${user.id.slice(-6)}@example.com`,
      first_name: 'Test',
      last_name: 'User',
      company: user.company ? 'Test Company' : undefined
    };
  },

  /**
   * Generate GDPR-compliant test addresses
   */
  generateAnonymousAddress(): string {
    const houseNumber = Math.floor(Math.random() * 9999) + 1;
    const streetName = 'Test Street';
    const city = 'Test City';
    const state = 'TS';
    const zip = '12345';
    
    return `${houseNumber} ${streetName}, ${city}, ${state} ${zip}`;
  },

  /**
   * Create test data with proper consent flags
   */
  addConsentMetadata<T>(data: T): T & { _test_metadata: any } {
    return {
      ...data,
      _test_metadata: {
        generated_for_testing: true,
        contains_pii: false,
        anonymized: true,
        consent_granted: true,
        retention_period: '30_days',
        generated_at: new Date().toISOString()
      }
    };
  }
};

// Export all utilities
export const testDataUtils = {
  riskLevels: riskLevelUtils,
  geography: geoUtils,
  users: userDataUtils,
  validation: validators,
  transform: transformUtils,
  privacy: privacyUtils
};