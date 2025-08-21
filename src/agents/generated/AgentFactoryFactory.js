/**
 * Agent Factory Factory - Creates Agent Factories for different domains
 * 
 * This meta-agent creates specialized Agent Factories for different
 * business domains within Tim-Combo, each with domain-specific patterns.
 */

const AgentFactory = require('./AgentFactory');

class AgentFactoryFactory extends AgentFactory {
  constructor() {
    super();
    this.domainFactories = new Map();
  }

  /**
   * Create a specialized Agent Factory for a specific domain
   */
  createDomainFactory(domain, patterns) {
    const DomainFactory = class extends AgentFactory {
      constructor() {
        super();
        this.domain = domain;
        this.domainPatterns = patterns;
      }

      generateDomainSpecificFeature(config) {
        // Apply domain-specific patterns
        const enhancedConfig = {
          ...config,
          ...this.domainPatterns,
          domain: this.domain
        };

        return this.generateCompleteFeature(enhancedConfig);
      }
    };

    const factory = new DomainFactory();
    this.domainFactories.set(domain, factory);
    
    console.log(`🏭 Created ${domain} Agent Factory`);
    return factory;
  }

  /**
   * Get existing domain factory or create new one
   */
  getDomainFactory(domain) {
    if (!this.domainFactories.has(domain)) {
      throw new Error(`Domain factory for '${domain}' not found. Create it first with createDomainFactory()`);
    }
    return this.domainFactories.get(domain);
  }

  /**
   * Bootstrap common Tim-Combo domain factories
   */
  bootstrapCommonFactories() {
    // Integration Domain Factory
    this.createDomainFactory('integration', {
      defaultContext: 'IntegrationData',
      defaultDashboard: 'CI_Admin',
      dataPattern: 'JSONB',
      standardComponents: ['IntegrationWorkflowWidget', 'IntegrationEmployeeWidget']
    });

    // TimeBridge Domain Factory  
    this.createDomainFactory('timebridge', {
      defaultContext: 'TimeBridgeData',
      defaultDashboard: 'TB_Admin',
      dataPattern: 'JSONB',
      standardComponents: ['TimeBridgeSyncStatusWidget', 'TimeBridgeOnboardingWizard']
    });

    // Analytics Domain Factory
    this.createDomainFactory('analytics', {
      defaultContext: 'AnalyticsData',
      defaultDashboard: 'Analytics',
      dataPattern: 'Normalized',
      standardComponents: ['PredictiveApprovalEngine', 'AnalyticsDashboard']
    });

    // Super Admin Domain Factory
    this.createDomainFactory('superadmin', {
      defaultContext: 'SuperAdminStatus',
      defaultDashboard: 'ResponsiveSuperAdminPanel',
      dataPattern: 'Mixed',
      standardComponents: ['CreateIntegrationInstanceAction', 'WorkQueueWidget']
    });

    console.log('🎯 Bootstrapped all common domain factories');
  }
}

module.exports = AgentFactoryFactory;
