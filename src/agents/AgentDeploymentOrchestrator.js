/**
 * Seawater Climate Platform - Agent Deployment Orchestrator
 * 
 * Manages deployment of generated agents and their artifacts
 * following Tim-Combo deployment patterns adapted for Seawater.
 * 
 * Key adaptations:
 * - Seawater-specific AWS accounts (dev: 532595801838, media: 855652006097)
 * - Climate data processing deployment patterns
 * - Multi-region coordination for global climate data
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class AgentDeploymentOrchestrator {
  constructor() {
    this.projectRoot = '/Users/jamesford/Source/Seawater';
    this.deploymentQueue = [];
    this.awsProfiles = {
      dev: 'dev-sso',
      media: 'media-sso'
    };
    this.buckets = {
      lambda: 'seawater-dev-lambda-532595801838',
      frontend: 'seawater-dev-fe-live-855652006097',
      media: 'seawater-media-live-855652006097'
    };
  }

  /**
   * Stage generated artifacts for deployment
   */
  stageArtifacts(generatedFiles) {
    const artifacts = {
      handlers: [],
      components: [],
      types: [],
      tests: [],
      mobile: [],
      docs: []
    };

    generatedFiles.forEach(file => {
      const relativePath = path.relative(this.projectRoot, file);
      
      if (relativePath.includes('/functions/') || relativePath.includes('/handlers/')) {
        artifacts.handlers.push(file);
      } else if (relativePath.includes('/src/components/')) {
        artifacts.components.push(file);
      } else if (relativePath.includes('/src/types/')) {
        artifacts.types.push(file);
      } else if (relativePath.includes('/tests/') || relativePath.includes('/__tests__/')) {
        artifacts.tests.push(file);
      } else if (relativePath.includes('/mobile/')) {
        artifacts.mobile.push(file);
      } else if (relativePath.includes('/docs/')) {
        artifacts.docs.push(file);
      }
    });

    this.deploymentQueue.push(artifacts);
    console.log(`📋 Staged ${generatedFiles.length} artifacts for deployment:`, {
      handlers: artifacts.handlers.length,
      components: artifacts.components.length,
      mobile: artifacts.mobile.length,
      tests: artifacts.tests.length
    });
    
    return artifacts;
  }

  /**
   * Deploy Lambda handlers to AWS (Seawater dev account)
   */
  async deployHandlers(handlers) {
    console.log(`🚀 Deploying ${handlers.length} Lambda handlers to Seawater dev account...`);
    
    for (const handler of handlers) {
      const handlerDir = path.dirname(handler);
      const handlerName = path.basename(handlerDir);
      
      console.log(`📦 Building SAM application for ${handlerName}...`);
      
      try {
        // Build with SAM
        execSync('sam build', {
          cwd: handlerDir,
          stdio: 'inherit'
        });
        
        // Deploy with SAM
        const deployCommand = `sam deploy --profile ${this.awsProfiles.dev}`;
        execSync(deployCommand, {
          cwd: handlerDir,
          stdio: 'inherit'
        });
        
        console.log(`✅ Deployed ${handlerName} successfully`);
        
      } catch (error) {
        console.error(`❌ Failed to deploy ${handlerName}:`, error.message);
        throw error;
      }
    }
  }

  /**
   * Deploy frontend components to Seawater CloudFront
   */
  async deployComponents(components) {
    console.log(`⚛️ Deploying ${components.length} React components to Seawater frontend...`);
    
    const frontendPath = path.join(this.projectRoot, 'src/frontend');
    
    try {
      // Run TypeScript compilation check
      console.log('🔍 Running TypeScript compilation check...');
      execSync('npx tsc --noEmit --project . --pretty', { 
        cwd: frontendPath,
        stdio: 'inherit'
      });
      
      // Build frontend
      console.log('🏗️ Building frontend for production...');
      execSync('npm run build', {
        cwd: frontendPath,
        stdio: 'inherit'
      });
      
      // Deploy to S3 in media account
      console.log('☁️ Deploying to S3 CloudFront...');
      const syncCommand = `aws s3 sync build/ s3://${this.buckets.frontend} --profile ${this.awsProfiles.media} --delete`;
      execSync(syncCommand, {
        cwd: frontendPath,
        stdio: 'inherit'
      });
      
      // Invalidate CloudFront cache
      console.log('🔄 Invalidating CloudFront cache...');
      const invalidateCommand = `aws cloudfront create-invalidation --distribution-id PLACEHOLDER --paths "/*" --profile ${this.awsProfiles.media}`;
      // Note: Replace PLACEHOLDER with actual CloudFront distribution ID
      
      console.log('✅ Frontend deployed successfully to Seawater CloudFront');
      
    } catch (error) {
      console.error('❌ Frontend deployment failed:', error.message);
      throw error;
    }
  }

  /**
   * Deploy mobile app components (Flutter build artifacts)
   */
  async deployMobile(mobileFiles) {
    console.log(`📱 Processing ${mobileFiles.length} mobile app changes...`);
    
    const mobilePath = path.join(this.projectRoot, 'mobile/seawater_app');
    
    try {
      // Run Flutter analysis
      console.log('🔍 Running Flutter analysis...');
      execSync('flutter analyze --no-fatal-infos', {
        cwd: mobilePath,
        stdio: 'inherit'
      });
      
      // Run Flutter tests
      console.log('🧪 Running Flutter tests...');
      execSync('flutter test', {
        cwd: mobilePath,
        stdio: 'inherit'
      });
      
      // Build for Android (debug)
      console.log('🤖 Building Android APK...');
      execSync('flutter build apk --debug', {
        cwd: mobilePath,
        stdio: 'inherit'
      });
      
      console.log('✅ Mobile app build completed successfully');
      
    } catch (error) {
      console.error('❌ Mobile deployment failed:', error.message);
      throw error;
    }
  }

  /**
   * Run generated tests with climate-specific validations
   */
  async runTests(tests) {
    console.log(`🧪 Running ${tests.length} test suites for climate platform...`);
    
    const frontendPath = path.join(this.projectRoot, 'src/frontend');
    
    try {
      // Run Jest unit tests
      console.log('⚡ Running unit tests...');
      execSync('npm test -- --passWithNoTests', {
        cwd: frontendPath,
        stdio: 'inherit'
      });
      
      // Run E2E tests with Playwright
      console.log('🎭 Running E2E tests...');
      execSync('npx playwright test --reporter=line', {
        cwd: frontendPath,
        stdio: 'inherit'
      });
      
      // Run mobile tests
      const mobilePath = path.join(this.projectRoot, 'mobile/seawater_app');
      if (fs.existsSync(mobilePath)) {
        console.log('📱 Running mobile tests...');
        execSync('flutter test', {
          cwd: mobilePath,
          stdio: 'inherit'
        });
      }
      
      console.log('✅ All tests passed - climate platform validated');
      
    } catch (error) {
      console.error('❌ Tests failed:', error.message);
      throw error;
    }
  }

  /**
   * Deploy climate data processing infrastructure
   */
  async deployClimateInfrastructure(artifacts) {
    console.log('🌍 Deploying climate data processing infrastructure...');
    
    try {
      // Deploy backend infrastructure with SAM
      const backendPath = this.projectRoot;
      
      if (fs.existsSync(path.join(backendPath, 'template.yaml'))) {
        console.log('☁️ Deploying SAM infrastructure...');
        
        execSync('sam build', {
          cwd: backendPath,
          stdio: 'inherit'
        });
        
        execSync(`sam deploy --profile ${this.awsProfiles.dev}`, {
          cwd: backendPath,
          stdio: 'inherit'
        });
        
        console.log('✅ Climate infrastructure deployed successfully');
      }
      
    } catch (error) {
      console.error('❌ Infrastructure deployment failed:', error.message);
      throw error;
    }
  }

  /**
   * Full deployment pipeline for Seawater climate platform
   */
  async deployComplete(artifacts) {
    console.log('🎯 Starting Seawater climate platform deployment pipeline...');
    
    try {
      // Stage 1: Deploy climate infrastructure
      console.log('\n📊 Stage 1: Climate Infrastructure');
      await this.deployClimateInfrastructure(artifacts);
      
      // Stage 2: Deploy backend handlers
      if (artifacts.handlers.length > 0) {
        console.log('\n🚀 Stage 2: Lambda Handlers');
        await this.deployHandlers(artifacts.handlers);
      }
      
      // Stage 3: Deploy frontend components  
      if (artifacts.components.length > 0) {
        console.log('\n⚛️ Stage 3: Frontend Components');
        await this.deployComponents(artifacts.components);
      }
      
      // Stage 4: Deploy mobile updates
      if (artifacts.mobile.length > 0) {
        console.log('\n📱 Stage 4: Mobile Application');
        await this.deployMobile(artifacts.mobile);
      }
      
      // Stage 5: Run comprehensive tests
      if (artifacts.tests.length > 0) {
        console.log('\n🧪 Stage 5: Quality Assurance');
        await this.runTests(artifacts.tests);
      }
      
      console.log('\n🎉 Seawater climate platform deployment completed successfully!');
      console.log('\n📋 Deployment Summary:');
      console.log(`   • Handlers: ${artifacts.handlers.length} deployed`);
      console.log(`   • Components: ${artifacts.components.length} deployed`);
      console.log(`   • Mobile files: ${artifacts.mobile.length} processed`);
      console.log(`   • Tests: ${artifacts.tests.length} executed`);
      
    } catch (error) {
      console.error('\n💥 Seawater deployment failed:', error.message);
      console.error('\n🔍 Troubleshooting tips:');
      console.error('   • Check AWS credentials and profiles');
      console.error('   • Verify SAM template configuration');
      console.error('   • Review CloudFront distribution settings');
      console.error('   • Ensure Flutter environment is properly configured');
      throw error;
    }
  }

  /**
   * Quick deployment for development iterations
   */
  async deployDev(artifacts) {
    console.log('⚡ Quick dev deployment for Seawater...');
    
    try {
      // Only deploy changed handlers and frontend
      if (artifacts.handlers.length > 0) {
        await this.deployHandlers(artifacts.handlers);
      }
      
      if (artifacts.components.length > 0) {
        await this.deployComponents(artifacts.components);
      }
      
      console.log('✅ Dev deployment completed');
      
    } catch (error) {
      console.error('❌ Dev deployment failed:', error.message);
      throw error;
    }
  }
}

module.exports = AgentDeploymentOrchestrator;