/**
 * Business Logic Tests - Subscription Tiers and Feature Access
 * Testing Free/Premium/Professional feature access control
 */

const { jest } = require('@jest/globals');

// Mock subscription tier definitions
const SUBSCRIPTION_TIERS = {
  free: {
    name: 'Free',
    monthlyQuota: 50,
    features: ['basic_risk_lookup', 'fema_data'],
    dataSources: ['fema'],
    maxAddressesPerSearch: 1,
    supportLevel: 'community',
    apiCalls: {
      risk_assessment: 50,
      geocoding: 100,
      professionals_search: 10
    }
  },
  basic: {
    name: 'Basic',
    monthlyQuota: 500,
    features: ['basic_risk_lookup', 'fema_data', 'geocoding', 'address_validation'],
    dataSources: ['fema'],
    maxAddressesPerSearch: 3,
    supportLevel: 'email',
    apiCalls: {
      risk_assessment: 500,
      geocoding: 1000,
      professionals_search: 100
    }
  },
  premium: {
    name: 'Premium',
    monthlyQuota: 2000,
    features: [
      'basic_risk_lookup', 'fema_data', 'geocoding', 'address_validation',
      'premium_data_sources', 'projections', 'detailed_reports', 'trend_analysis'
    ],
    dataSources: ['fema', 'firststreet', 'climatecheck'],
    maxAddressesPerSearch: 5,
    supportLevel: 'priority_email',
    apiCalls: {
      risk_assessment: 2000,
      geocoding: 4000,
      professionals_search: 500,
      projections: 1000
    }
  },
  professional: {
    name: 'Professional',
    monthlyQuota: 10000,
    features: [
      'basic_risk_lookup', 'fema_data', 'geocoding', 'address_validation',
      'premium_data_sources', 'projections', 'detailed_reports', 'trend_analysis',
      'bulk_processing', 'api_management', 'white_label', 'priority_support'
    ],
    dataSources: ['fema', 'firststreet', 'climatecheck', 'proprietary'],
    maxAddressesPerSearch: 50,
    supportLevel: 'phone',
    apiCalls: {
      risk_assessment: 10000,
      geocoding: 20000,
      professionals_search: 2000,
      projections: 5000,
      bulk_processing: 1000
    }
  }
};

// Mock user subscription tracking
class SubscriptionManager {
  constructor() {
    this.users = new Map();
  }

  createUser(userId, tier = 'free') {
    const user = {
      id: userId,
      tier,
      usageThisMonth: {},
      subscriptionDate: new Date(),
      lastResetDate: new Date()
    };
    
    // Initialize usage counters
    Object.keys(SUBSCRIPTION_TIERS[tier].apiCalls).forEach(endpoint => {
      user.usageThisMonth[endpoint] = 0;
    });
    
    this.users.set(userId, user);
    return user;
  }

  getUser(userId) {
    return this.users.get(userId);
  }

  checkFeatureAccess(userId, feature) {
    const user = this.getUser(userId);
    if (!user) return false;
    
    const tierConfig = SUBSCRIPTION_TIERS[user.tier];
    return tierConfig.features.includes(feature);
  }

  checkDataSourceAccess(userId, dataSource) {
    const user = this.getUser(userId);
    if (!user) return false;
    
    const tierConfig = SUBSCRIPTION_TIERS[user.tier];
    return tierConfig.dataSources.includes(dataSource);
  }

  checkQuotaAvailable(userId, endpoint) {
    const user = this.getUser(userId);
    if (!user) return false;
    
    const tierConfig = SUBSCRIPTION_TIERS[user.tier];
    const currentUsage = user.usageThisMonth[endpoint] || 0;
    const limit = tierConfig.apiCalls[endpoint] || 0;
    
    return currentUsage < limit;
  }

  recordUsage(userId, endpoint, count = 1) {
    const user = this.getUser(userId);
    if (!user) return false;
    
    if (!user.usageThisMonth[endpoint]) {
      user.usageThisMonth[endpoint] = 0;
    }
    
    user.usageThisMonth[endpoint] += count;
    return true;
  }

  getRemainingQuota(userId, endpoint) {
    const user = this.getUser(userId);
    if (!user) return 0;
    
    const tierConfig = SUBSCRIPTION_TIERS[user.tier];
    const currentUsage = user.usageThisMonth[endpoint] || 0;
    const limit = tierConfig.apiCalls[endpoint] || 0;
    
    return Math.max(0, limit - currentUsage);
  }

  upgradeTier(userId, newTier) {
    const user = this.getUser(userId);
    if (!user || !SUBSCRIPTION_TIERS[newTier]) return false;
    
    const oldTier = user.tier;
    user.tier = newTier;
    user.upgradedFrom = oldTier;
    user.upgradeDate = new Date();
    
    // Reset usage with new limits
    const newTierConfig = SUBSCRIPTION_TIERS[newTier];
    Object.keys(newTierConfig.apiCalls).forEach(endpoint => {
      if (!user.usageThisMonth[endpoint]) {
        user.usageThisMonth[endpoint] = 0;
      }
    });
    
    return true;
  }
}

describe('Subscription Tier Feature Access', () => {
  let subscriptionManager;

  beforeEach(() => {
    subscriptionManager = new SubscriptionManager();
  });

  describe('Free Tier Limitations', () => {
    test('should only allow basic features for free tier users', () => {
      const userId = 'free-user-1';
      subscriptionManager.createUser(userId, 'free');

      expect(subscriptionManager.checkFeatureAccess(userId, 'basic_risk_lookup')).toBe(true);
      expect(subscriptionManager.checkFeatureAccess(userId, 'fema_data')).toBe(true);
      
      // Premium features should be denied
      expect(subscriptionManager.checkFeatureAccess(userId, 'premium_data_sources')).toBe(false);
      expect(subscriptionManager.checkFeatureAccess(userId, 'projections')).toBe(false);
      expect(subscriptionManager.checkFeatureAccess(userId, 'bulk_processing')).toBe(false);
    });

    test('should only allow FEMA data source for free tier', () => {
      const userId = 'free-user-2';
      subscriptionManager.createUser(userId, 'free');

      expect(subscriptionManager.checkDataSourceAccess(userId, 'fema')).toBe(true);
      expect(subscriptionManager.checkDataSourceAccess(userId, 'firststreet')).toBe(false);
      expect(subscriptionManager.checkDataSourceAccess(userId, 'climatecheck')).toBe(false);
    });

    test('should enforce strict quota limits for free tier', () => {
      const userId = 'free-user-3';
      subscriptionManager.createUser(userId, 'free');

      // Should have quota initially
      expect(subscriptionManager.checkQuotaAvailable(userId, 'risk_assessment')).toBe(true);
      expect(subscriptionManager.getRemainingQuota(userId, 'risk_assessment')).toBe(50);

      // Use up quota
      for (let i = 0; i < 50; i++) {
        subscriptionManager.recordUsage(userId, 'risk_assessment');
      }

      // Should be at quota limit
      expect(subscriptionManager.checkQuotaAvailable(userId, 'risk_assessment')).toBe(false);
      expect(subscriptionManager.getRemainingQuota(userId, 'risk_assessment')).toBe(0);
    });
  });

  describe('Premium Tier Features', () => {
    test('should allow premium features for premium tier users', () => {
      const userId = 'premium-user-1';
      subscriptionManager.createUser(userId, 'premium');

      // Basic features
      expect(subscriptionManager.checkFeatureAccess(userId, 'basic_risk_lookup')).toBe(true);
      expect(subscriptionManager.checkFeatureAccess(userId, 'geocoding')).toBe(true);

      // Premium features
      expect(subscriptionManager.checkFeatureAccess(userId, 'premium_data_sources')).toBe(true);
      expect(subscriptionManager.checkFeatureAccess(userId, 'projections')).toBe(true);
      expect(subscriptionManager.checkFeatureAccess(userId, 'detailed_reports')).toBe(true);

      // Professional features should still be denied
      expect(subscriptionManager.checkFeatureAccess(userId, 'bulk_processing')).toBe(false);
      expect(subscriptionManager.checkFeatureAccess(userId, 'white_label')).toBe(false);
    });

    test('should allow multiple data sources for premium tier', () => {
      const userId = 'premium-user-2';
      subscriptionManager.createUser(userId, 'premium');

      expect(subscriptionManager.checkDataSourceAccess(userId, 'fema')).toBe(true);
      expect(subscriptionManager.checkDataSourceAccess(userId, 'firststreet')).toBe(true);
      expect(subscriptionManager.checkDataSourceAccess(userId, 'climatecheck')).toBe(true);
      expect(subscriptionManager.checkDataSourceAccess(userId, 'proprietary')).toBe(false); // Professional only
    });

    test('should have higher quota limits for premium tier', () => {
      const userId = 'premium-user-3';
      subscriptionManager.createUser(userId, 'premium');

      expect(subscriptionManager.getRemainingQuota(userId, 'risk_assessment')).toBe(2000);
      expect(subscriptionManager.getRemainingQuota(userId, 'geocoding')).toBe(4000);
      expect(subscriptionManager.getRemainingQuota(userId, 'projections')).toBe(1000);
    });
  });

  describe('Professional Tier Features', () => {
    test('should allow all features for professional tier users', () => {
      const userId = 'professional-user-1';
      subscriptionManager.createUser(userId, 'professional');

      const allFeatures = [
        'basic_risk_lookup', 'premium_data_sources', 'projections',
        'bulk_processing', 'api_management', 'white_label'
      ];

      allFeatures.forEach(feature => {
        expect(subscriptionManager.checkFeatureAccess(userId, feature)).toBe(true);
      });
    });

    test('should allow all data sources for professional tier', () => {
      const userId = 'professional-user-2';
      subscriptionManager.createUser(userId, 'professional');

      const allDataSources = ['fema', 'firststreet', 'climatecheck', 'proprietary'];
      allDataSources.forEach(source => {
        expect(subscriptionManager.checkDataSourceAccess(userId, source)).toBe(true);
      });
    });

    test('should have highest quota limits for professional tier', () => {
      const userId = 'professional-user-3';
      subscriptionManager.createUser(userId, 'professional');

      expect(subscriptionManager.getRemainingQuota(userId, 'risk_assessment')).toBe(10000);
      expect(subscriptionManager.getRemainingQuota(userId, 'bulk_processing')).toBe(1000);
    });
  });

  describe('Tier Upgrades', () => {
    test('should allow tier upgrades with expanded features', () => {
      const userId = 'upgrade-user-1';
      subscriptionManager.createUser(userId, 'free');

      // Initially cannot access premium features
      expect(subscriptionManager.checkFeatureAccess(userId, 'projections')).toBe(false);

      // Upgrade to premium
      const upgraded = subscriptionManager.upgradeTier(userId, 'premium');
      expect(upgraded).toBe(true);

      // Should now have access to premium features
      expect(subscriptionManager.checkFeatureAccess(userId, 'projections')).toBe(true);
      expect(subscriptionManager.checkDataSourceAccess(userId, 'firststreet')).toBe(true);

      const user = subscriptionManager.getUser(userId);
      expect(user.tier).toBe('premium');
      expect(user.upgradedFrom).toBe('free');
    });

    test('should preserve usage history during upgrades', () => {
      const userId = 'upgrade-user-2';
      subscriptionManager.createUser(userId, 'basic');

      // Record some usage
      subscriptionManager.recordUsage(userId, 'risk_assessment', 10);
      expect(subscriptionManager.getRemainingQuota(userId, 'risk_assessment')).toBe(490);

      // Upgrade to premium
      subscriptionManager.upgradeTier(userId, 'premium');

      // Usage should be preserved, but with new limits
      const user = subscriptionManager.getUser(userId);
      expect(user.usageThisMonth.risk_assessment).toBe(10);
      expect(subscriptionManager.getRemainingQuota(userId, 'risk_assessment')).toBe(1990); // 2000 - 10
    });
  });
});

describe('Billing and Usage Tracking', () => {
  let subscriptionManager;

  beforeEach(() => {
    subscriptionManager = new SubscriptionManager();
  });

  test('should accurately track API usage', () => {
    const userId = 'billing-user-1';
    subscriptionManager.createUser(userId, 'premium');

    // Record various API calls
    subscriptionManager.recordUsage(userId, 'risk_assessment', 5);
    subscriptionManager.recordUsage(userId, 'geocoding', 10);
    subscriptionManager.recordUsage(userId, 'projections', 3);

    const user = subscriptionManager.getUser(userId);
    expect(user.usageThisMonth.risk_assessment).toBe(5);
    expect(user.usageThisMonth.geocoding).toBe(10);
    expect(user.usageThisMonth.projections).toBe(3);

    // Check remaining quotas
    expect(subscriptionManager.getRemainingQuota(userId, 'risk_assessment')).toBe(1995);
    expect(subscriptionManager.getRemainingQuota(userId, 'geocoding')).toBe(3990);
    expect(subscriptionManager.getRemainingQuota(userId, 'projections')).toBe(997);
  });

  test('should calculate overage charges for exceeding quotas', () => {
    const calculateOverage = (userId, endpoint) => {
      const user = subscriptionManager.getUser(userId);
      if (!user) return 0;

      const tierConfig = SUBSCRIPTION_TIERS[user.tier];
      const currentUsage = user.usageThisMonth[endpoint] || 0;
      const includedQuota = tierConfig.apiCalls[endpoint] || 0;
      const overage = Math.max(0, currentUsage - includedQuota);

      // Overage pricing per API call (in cents)
      const overagePricing = {
        risk_assessment: 2, // $0.02 per additional call
        geocoding: 1,       // $0.01 per additional call
        projections: 5,     // $0.05 per additional call
        bulk_processing: 10 // $0.10 per additional call
      };

      return overage * (overagePricing[endpoint] || 0);
    };

    const userId = 'overage-user-1';
    subscriptionManager.createUser(userId, 'basic');

    // Exceed risk assessment quota (500 included)
    subscriptionManager.recordUsage(userId, 'risk_assessment', 550);

    const overageCharge = calculateOverage(userId, 'risk_assessment');
    expect(overageCharge).toBe(100); // 50 overage calls * $0.02 = $1.00 = 100 cents
  });

  test('should generate monthly usage reports', () => {
    const generateUsageReport = (userId) => {
      const user = subscriptionManager.getUser(userId);
      if (!user) return null;

      const tierConfig = SUBSCRIPTION_TIERS[user.tier];
      const report = {
        userId: user.id,
        tier: user.tier,
        billingPeriod: {
          start: user.lastResetDate,
          end: new Date()
        },
        usage: {},
        totalCost: 0
      };

      Object.entries(user.usageThisMonth).forEach(([endpoint, usage]) => {
        const included = tierConfig.apiCalls[endpoint] || 0;
        const overage = Math.max(0, usage - included);
        const overageCost = overage * 2; // $0.02 per overage call

        report.usage[endpoint] = {
          calls: usage,
          included,
          overage,
          overageCost
        };

        report.totalCost += overageCost;
      });

      return report;
    };

    const userId = 'report-user-1';
    subscriptionManager.createUser(userId, 'premium');

    // Simulate usage
    subscriptionManager.recordUsage(userId, 'risk_assessment', 1800);
    subscriptionManager.recordUsage(userId, 'geocoding', 3500);
    subscriptionManager.recordUsage(userId, 'projections', 1200);

    const report = generateUsageReport(userId);

    expect(report.userId).toBe(userId);
    expect(report.tier).toBe('premium');
    expect(report.usage.risk_assessment.calls).toBe(1800);
    expect(report.usage.risk_assessment.overage).toBe(0); // Within limit
    expect(report.usage.projections.calls).toBe(1200);
    expect(report.usage.projections.overage).toBe(200); // 200 over limit
  });
});

describe('Professional Features Business Logic', () => {
  let subscriptionManager;

  beforeEach(() => {
    subscriptionManager = new SubscriptionManager();
  });

  test('should support bulk processing for professional tier', () => {
    const processBulkRequest = (userId, addresses) => {
      if (!subscriptionManager.checkFeatureAccess(userId, 'bulk_processing')) {
        throw new Error('Bulk processing not available for this tier');
      }

      if (!subscriptionManager.checkQuotaAvailable(userId, 'bulk_processing')) {
        throw new Error('Bulk processing quota exceeded');
      }

      const tierConfig = SUBSCRIPTION_TIERS[subscriptionManager.getUser(userId).tier];
      if (addresses.length > tierConfig.maxAddressesPerSearch) {
        throw new Error(`Maximum ${tierConfig.maxAddressesPerSearch} addresses per request`);
      }

      // Record usage
      subscriptionManager.recordUsage(userId, 'bulk_processing');
      subscriptionManager.recordUsage(userId, 'risk_assessment', addresses.length);

      return {
        success: true,
        processed: addresses.length,
        remaining_quota: subscriptionManager.getRemainingQuota(userId, 'bulk_processing')
      };
    };

    const professionalUserId = 'prof-user-1';
    const basicUserId = 'basic-user-1';

    subscriptionManager.createUser(professionalUserId, 'professional');
    subscriptionManager.createUser(basicUserId, 'basic');

    const addresses = Array(25).fill().map((_, i) => `${i+1} Test St, City, ST`);

    // Professional user should succeed
    const result = processBulkRequest(professionalUserId, addresses);
    expect(result.success).toBe(true);
    expect(result.processed).toBe(25);

    // Basic user should fail
    expect(() => {
      processBulkRequest(basicUserId, addresses);
    }).toThrow('Bulk processing not available for this tier');
  });

  test('should provide API management features for professional tier', () => {
    const manageApiKey = (userId, action, keyData) => {
      if (!subscriptionManager.checkFeatureAccess(userId, 'api_management')) {
        throw new Error('API management not available for this tier');
      }

      const apiKeys = new Map();

      switch (action) {
        case 'create':
          const newKey = `professional-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          apiKeys.set(newKey, {
            userId,
            name: keyData.name,
            permissions: keyData.permissions || ['read'],
            created: new Date(),
            active: true
          });
          return { success: true, apiKey: newKey };

        case 'revoke':
          if (apiKeys.has(keyData.key)) {
            apiKeys.get(keyData.key).active = false;
            return { success: true, message: 'API key revoked' };
          }
          throw new Error('API key not found');

        case 'list':
          return Array.from(apiKeys.entries()).map(([key, data]) => ({
            key: key.substr(0, 20) + '...',
            name: data.name,
            active: data.active,
            created: data.created
          }));
      }
    };

    const professionalUserId = 'prof-api-user-1';
    const basicUserId = 'basic-api-user-1';

    subscriptionManager.createUser(professionalUserId, 'professional');
    subscriptionManager.createUser(basicUserId, 'basic');

    // Professional user should be able to manage API keys
    const createResult = manageApiKey(professionalUserId, 'create', {
      name: 'Production API Key',
      permissions: ['read', 'write']
    });
    expect(createResult.success).toBe(true);
    expect(createResult.apiKey).toContain('professional-');

    // Basic user should not have access
    expect(() => {
      manageApiKey(basicUserId, 'create', { name: 'Test Key' });
    }).toThrow('API management not available for this tier');
  });

  test('should support white label features for professional tier', () => {
    const configureWhiteLabel = (userId, config) => {
      if (!subscriptionManager.checkFeatureAccess(userId, 'white_label')) {
        throw new Error('White label features not available for this tier');
      }

      const whiteLabelConfig = {
        companyName: config.companyName,
        logo: config.logo,
        primaryColor: config.primaryColor,
        customDomain: config.customDomain,
        removeSeawaterBranding: config.removeSeawaterBranding || false
      };

      // Validate configuration
      const errors = [];
      if (!whiteLabelConfig.companyName || whiteLabelConfig.companyName.length < 2) {
        errors.push('Company name must be at least 2 characters');
      }

      if (whiteLabelConfig.primaryColor && !/^#[0-9A-F]{6}$/i.test(whiteLabelConfig.primaryColor)) {
        errors.push('Primary color must be a valid hex color code');
      }

      if (errors.length > 0) {
        throw new Error(`Configuration errors: ${errors.join(', ')}`);
      }

      return {
        success: true,
        config: whiteLabelConfig,
        message: 'White label configuration updated'
      };
    };

    const professionalUserId = 'prof-wl-user-1';
    subscriptionManager.createUser(professionalUserId, 'professional');

    const config = {
      companyName: 'Acme Risk Assessment',
      logo: 'https://example.com/logo.png',
      primaryColor: '#FF6B35',
      customDomain: 'risk.acme.com',
      removeSeawaterBranding: true
    };

    const result = configureWhiteLabel(professionalUserId, config);
    expect(result.success).toBe(true);
    expect(result.config.companyName).toBe('Acme Risk Assessment');
    expect(result.config.removeSeawaterBranding).toBe(true);
  });
});