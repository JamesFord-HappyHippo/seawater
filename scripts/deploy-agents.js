#!/usr/bin/env node

/**
 * Seawater Agent Deployment Script
 * 
 * Integrates AgentFactory generation with AgentDeploymentOrchestrator
 * for complete autonomous development and deployment.
 */

const AgentDeploymentOrchestrator = require('../src/agents/AgentDeploymentOrchestrator');
const AgentFactory = require('../src/agents/AgentFactory');

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'full';
  
  console.log('🌊 Seawater Climate Platform - Agent Deployment');
  console.log('================================================\n');
  
  try {
    const agentFactory = new AgentFactory();
    const orchestrator = new AgentDeploymentOrchestrator();
    
    switch (command) {
      case 'generate':
        console.log('🏭 Generating agents only...');
        await generateAgents(agentFactory);
        break;
        
      case 'deploy':
        console.log('🚀 Deploying existing artifacts...');
        await deployExisting(orchestrator);
        break;
        
      case 'dev':
        console.log('⚡ Quick dev deployment...');
        await deployDev(agentFactory, orchestrator);
        break;
        
      case 'full':
      default:
        console.log('🎯 Full generation and deployment pipeline...');
        await deployFull(agentFactory, orchestrator);
        break;
    }
    
    console.log('\n✅ Agent deployment completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Agent deployment failed:', error.message);
    process.exit(1);
  }
}

/**
 * Generate agents without deployment
 */
async function generateAgents(agentFactory) {
  const config = {
    projectType: 'climate-platform',
    features: ['risk-assessment', 'data-integration', 'mobile-support'],
    environment: 'development'
  };
  
  console.log('📋 Generating climate platform agents...');
  const generatedFiles = await agentFactory.generateAgents(config);
  
  console.log(`✅ Generated ${generatedFiles.length} files:`);
  generatedFiles.slice(0, 5).forEach(file => console.log(`   • ${file}`));
  if (generatedFiles.length > 5) {
    console.log(`   • ... and ${generatedFiles.length - 5} more`);
  }
}

/**
 * Deploy existing artifacts
 */
async function deployExisting(orchestrator) {
  // Find recently modified files in key directories
  const { execSync } = require('child_process');
  
  try {
    const recentFiles = execSync('find src functions mobile -name "*.js" -o -name "*.tsx" -o -name "*.dart" -mtime -1', {
      encoding: 'utf8',
      cwd: orchestrator.projectRoot
    }).trim().split('\n').filter(f => f.length > 0);
    
    if (recentFiles.length === 0) {
      console.log('ℹ️ No recent changes found to deploy');
      return;
    }
    
    const artifacts = orchestrator.stageArtifacts(recentFiles);
    await orchestrator.deployComplete(artifacts);
    
  } catch (error) {
    console.log('⚠️ Could not find recent files, deploying all artifacts...');
    
    // Fallback: deploy common artifact locations
    const commonArtifacts = [
      'src/frontend/src/components',
      'functions',
      'mobile/seawater_app/lib'
    ].filter(dir => require('fs').existsSync(dir));
    
    if (commonArtifacts.length > 0) {
      const artifacts = orchestrator.stageArtifacts(commonArtifacts);
      await orchestrator.deployDev(artifacts);
    }
  }
}

/**
 * Quick development deployment
 */
async function deployDev(agentFactory, orchestrator) {
  // Generate minimal agents for dev
  const config = {
    projectType: 'climate-platform',
    features: ['risk-assessment'],
    environment: 'development',
    minimal: true
  };
  
  const generatedFiles = await agentFactory.generateAgents(config);
  const artifacts = orchestrator.stageArtifacts(generatedFiles);
  
  await orchestrator.deployDev(artifacts);
}

/**
 * Full generation and deployment pipeline
 */
async function deployFull(agentFactory, orchestrator) {
  // Generate comprehensive agents
  const config = {
    projectType: 'climate-platform',
    features: [
      'risk-assessment',
      'data-integration', 
      'mobile-support',
      'real-time-monitoring',
      'multi-region'
    ],
    environment: process.env.NODE_ENV || 'development',
    dataIntegrations: [
      'fema-nri',
      'usgs-earthquake',
      'noaa-weather'
    ]
  };
  
  console.log('🏭 Generating comprehensive climate platform agents...');
  const generatedFiles = await agentFactory.generateAgents(config);
  
  console.log('📋 Staging artifacts for deployment...');
  const artifacts = orchestrator.stageArtifacts(generatedFiles);
  
  console.log('🚀 Starting full deployment pipeline...');
  await orchestrator.deployComplete(artifacts);
}

// Help text
function showHelp() {
  console.log('Seawater Agent Deployment Commands:');
  console.log('');
  console.log('  npm run deploy-agents              # Full generation and deployment');
  console.log('  npm run deploy-agents generate     # Generate agents only');
  console.log('  npm run deploy-agents deploy       # Deploy existing artifacts');
  console.log('  npm run deploy-agents dev          # Quick dev deployment');
  console.log('');
}

if (require.main === module) {
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    showHelp();
  } else {
    main();
  }
}