#!/usr/bin/env node

/**
 * Tim-Combo Agent Factory System
 * 
 * Self-bootstrapping agent generation system that creates specialized agents
 * following all Tim-Combo patterns from .clinerules/ and CLAUDE.md standards.
 * 
 * Usage:
 *   node src/agents/index.js demo                    # Run demonstration
 *   node src/agents/index.js generate [feature]     # Generate feature
 *   node src/agents/index.js bootstrap              # Bootstrap domain factories
 *   node src/agents/index.js mcp-demo               # Run MCP multi-agent demo
 */

const fs = require('fs');
const path = require('path');
const AgentFactory = require('./AgentFactory');
const MCPAgentCoordinator = require('./MCPIntegration');
const { demonstrateAgentFactory } = require('./demo');
const config = require('./config.json');

class TimComboAgentSystem {
  constructor() {
    this.agentFactory = new AgentFactory();
    this.mcpCoordinator = new MCPAgentCoordinator();
    this.config = config;
    
    console.log('🤖 Tim-Combo Agent Factory System Initialized');
    console.log(`📍 Project Root: ${this.config.agentFactory.projectRoot}`);
    console.log(`📁 Output Directory: ${this.config.agentFactory.outputDirectory}`);
  }

  /**
   * Display system information and available commands
   */
  displayHelp() {
    console.log(`
🤖 Tim-Combo Agent Factory System v${this.config.agentFactory.version}
${this.config.agentFactory.description}

🎯 Available Commands:
  demo                    Run complete demonstration
  generate [feature]      Generate specific feature
  bootstrap              Bootstrap domain-specific factories
  mcp-demo               Run MCP multi-agent demonstration
  help                   Show this help message

📋 Agent Types Available:
${Object.entries(this.config.agentTypes).map(([type, info]) => 
  `  ${type.padEnd(20)} ${info.description}`
).join('\n')}

🏗️ Domain Factories:
${Object.entries(this.config.domainFactories).map(([domain, info]) =>
  `  ${domain.padEnd(15)} ${info.description}`
).join('\n')}

🚀 Example Usage:
  node src/agents/index.js demo
  node src/agents/index.js generate employee-management
  node src/agents/index.js mcp-demo
  node src/agents/index.js bootstrap

📚 Documentation: See generated README files in output directory
🔧 Configuration: src/agents/config.json
    `);
  }

  /**
   * Generate a feature based on predefined templates
   */
  async generateFeature(featureName) {
    console.log(`🎯 Generating feature: ${featureName}`);
    
    const featureTemplates = {
      'employee-management': {
        featureName: 'EmployeeManagement',
        description: 'Complete employee data management with JSONB integration patterns',
        domain: 'employee',
        database: {
          tableName: 'employee_records',
          description: 'Employee records with JSONB data from external systems',
          fields: [
            { name: 'Employee_ID', tsType: 'string', nullable: false },
            { name: 'Company_ID', tsType: 'string', nullable: false },
            { name: 'employee_data_jsonb', tsType: 'Record<string, any>', nullable: false },
            { name: 'validation_status', tsType: "'valid' | 'invalid' | 'pending'", nullable: false },
            { name: 'source_system', tsType: "'ADP' | 'QuickBooks' | 'BambooHR'", nullable: false }
          ]
        },
        api: {
          description: 'Employee management API endpoints',
          endpoints: [
            { action: 'GET', path: '/tim/employees' },
            { action: 'CREATE', path: '/tim/employees' },
            { action: 'UPDATE', path: '/tim/employees/{employeeId}' }
          ]
        }
      },
      
      'notification-system': {
        featureName: 'NotificationSystem',
        description: 'Multi-channel notification system with Slack/Teams integration',
        domain: 'notifications',
        database: {
          tableName: 'notification_channels',
          description: 'Notification channel configurations and delivery tracking',
          fields: [
            { name: 'Channel_ID', tsType: 'string', nullable: false },
            { name: 'Company_ID', tsType: 'string', nullable: false },
            { name: 'channel_config', tsType: 'Record<string, any>', nullable: false },
            { name: 'channel_type', tsType: "'slack' | 'teams' | 'email'", nullable: false },
            { name: 'is_active', tsType: 'boolean', nullable: false }
          ]
        }
      },

      'timebridge-sync': {
        featureName: 'TimeBridgeSync',
        description: 'Automated TimeBridge synchronization with real-time monitoring',
        domain: 'timebridge',
        database: {
          tableName: 'timebridge_sync_jobs',
          description: 'TimeBridge synchronization job tracking and status',
          fields: [
            { name: 'Job_ID', tsType: 'string', nullable: false },
            { name: 'Company_ID', tsType: 'string', nullable: false },
            { name: 'sync_config', tsType: 'Record<string, any>', nullable: false },
            { name: 'job_status', tsType: "'pending' | 'running' | 'completed' | 'failed'", nullable: false }
          ]
        }
      }
    };

    const template = featureTemplates[featureName];
    if (!template) {
      console.error(`❌ Feature template '${featureName}' not found`);
      console.log(`📋 Available templates: ${Object.keys(featureTemplates).join(', ')}`);
      return;
    }

    try {
      const result = this.agentFactory.generateCompleteFeature(template);
      console.log(`✅ Feature '${featureName}' generated successfully!`);
      console.log(`📁 Generated ${result.generatedFiles.length} files`);
      return result;
    } catch (error) {
      console.error(`❌ Failed to generate feature '${featureName}':`, error.message);
      throw error;
    }
  }

  /**
   * Bootstrap domain-specific agent factories
   */
  async bootstrapDomainFactories() {
    console.log('🏭 Bootstrapping Domain-Specific Agent Factories...');
    
    const AgentFactoryFactory = require('./generated/AgentFactoryFactory');
    const factoryFactory = new AgentFactoryFactory();
    
    // Create domain factories from config
    Object.entries(this.config.domainFactories).forEach(([domain, domainConfig]) => {
      console.log(`🎯 Creating ${domain} factory...`);
      
      const factory = factoryFactory.createDomainFactory(domain, {
        defaultContext: domainConfig.defaultContext,
        defaultDashboard: domainConfig.defaultDashboard,
        dataPattern: domainConfig.dataPattern,
        standardComponents: domainConfig.standardComponents,
        commonEndpoints: domainConfig.commonEndpoints
      });
      
      console.log(`✅ ${domain} factory created with ${domainConfig.standardComponents.length} standard components`);
    });
    
    console.log('🎉 All domain factories bootstrapped successfully!');
    return factoryFactory;
  }

  /**
   * Run MCP multi-agent demonstration
   */
  async runMCPDemo() {
    console.log('🤝 Starting MCP Multi-Agent Demonstration...');
    
    try {
      const result = await this.mcpCoordinator.demonstrateTimComboWorkflow();
      console.log('✅ MCP demonstration completed successfully!');
      return result;
    } catch (error) {
      console.error('❌ MCP demonstration failed:', error.message);
      throw error;
    }
  }

  /**
   * Generate project status report
   */
  generateStatusReport() {
    const outputDir = path.join(this.config.agentFactory.projectRoot, this.config.agentFactory.outputDirectory);
    
    let generatedFiles = [];
    if (fs.existsSync(outputDir)) {
      const walkDir = (dir) => {
        const files = fs.readdirSync(dir);
        files.forEach(file => {
          const filePath = path.join(dir, file);
          const stat = fs.statSync(filePath);
          if (stat.isDirectory()) {
            walkDir(filePath);
          } else {
            generatedFiles.push(filePath);
          }
        });
      };
      walkDir(outputDir);
    }

    console.log(`
📊 Tim-Combo Agent Factory Status Report
========================================

🎯 System Information:
  Version: ${this.config.agentFactory.version}
  Project Root: ${this.config.agentFactory.projectRoot}
  Output Directory: ${this.config.agentFactory.outputDirectory}

📁 Generated Files: ${generatedFiles.length}
${generatedFiles.map(file => `  📄 ${path.relative(this.config.agentFactory.projectRoot, file)}`).join('\n')}

🤖 Available Agent Types: ${Object.keys(this.config.agentTypes).length}
${Object.keys(this.config.agentTypes).map(type => `  🔧 ${type}`).join('\n')}

🏗️ Domain Factories: ${Object.keys(this.config.domainFactories).length}
${Object.keys(this.config.domainFactories).map(domain => `  🎯 ${domain}`).join('\n')}

🚀 Communication Patterns: ${Object.keys(this.config.communicationPatterns).length}
${Object.keys(this.config.communicationPatterns).map(pattern => `  📡 ${pattern}`).join('\n')}

⚙️ Deployment Environments: ${Object.keys(this.config.deploymentEnvironments).length}
${Object.keys(this.config.deploymentEnvironments).map(env => `  🌍 ${env}`).join('\n')}
    `);
  }

  /**
   * Validate system configuration and dependencies
   */
  validateSystem() {
    console.log('🔍 Validating Tim-Combo Agent Factory System...');
    
    const issues = [];
    
    // Check project root exists
    if (!fs.existsSync(this.config.agentFactory.projectRoot)) {
      issues.push(`❌ Project root not found: ${this.config.agentFactory.projectRoot}`);
    }
    
    // Check .clinerules directory
    const clinerules = path.join(this.config.agentFactory.projectRoot, this.config.timComboStandards.standardsPath);
    if (!fs.existsSync(clinerules)) {
      issues.push(`❌ Standards directory not found: ${clinerules}`);
    } else {
      // Check required standards files
      this.config.timComboStandards.requiredFiles.forEach(file => {
        const filePath = path.join(clinerules, file);
        if (!fs.existsSync(filePath)) {
          issues.push(`❌ Required standards file missing: ${file}`);
        }
      });
    }
    
    // Check output directory can be created
    const outputDir = path.join(this.config.agentFactory.projectRoot, this.config.agentFactory.outputDirectory);
    try {
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
    } catch (error) {
      issues.push(`❌ Cannot create output directory: ${error.message}`);
    }
    
    if (issues.length === 0) {
      console.log('✅ System validation passed - All checks successful!');
      return true;
    } else {
      console.log('⚠️ System validation found issues:');
      issues.forEach(issue => console.log(`  ${issue}`));
      return false;
    }
  }
}

// Command line interface
async function main() {
  const system = new TimComboAgentSystem();
  const command = process.argv[2] || 'help';
  const parameter = process.argv[3];

  try {
    // Always validate system first
    if (!system.validateSystem()) {
      console.log('\n❌ System validation failed. Please fix issues before proceeding.');
      process.exit(1);
    }

    switch (command) {
      case 'demo':
        await demonstrateAgentFactory();
        break;

      case 'generate':
        if (!parameter) {
          console.error('❌ Feature name required for generate command');
          console.log('📋 Example: node src/agents/index.js generate employee-management');
          process.exit(1);
        }
        await system.generateFeature(parameter);
        break;

      case 'bootstrap':
        await system.bootstrapDomainFactories();
        break;

      case 'mcp-demo':
        await system.runMCPDemo();
        break;

      case 'status':
        system.generateStatusReport();
        break;

      case 'help':
      default:
        system.displayHelp();
        break;
    }

  } catch (error) {
    console.error('\n💥 Fatal Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run CLI if this file is executed directly
if (require.main === module) {
  main();
}

module.exports = TimComboAgentSystem;