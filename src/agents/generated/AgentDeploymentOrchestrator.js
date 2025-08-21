/**
 * Agent Deployment Orchestrator
 * 
 * Manages deployment of generated agents and their artifacts
 * following Tim-Combo deployment patterns.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class AgentDeploymentOrchestrator {
  constructor() {
    this.projectRoot = '/Users/jamesford/Source/Tim-Combo';
    this.deploymentQueue = [];
  }

  /**
   * Stage generated artifacts for deployment
   */
  stageArtifacts(generatedFiles) {
    const artifacts = {
      handlers: [],
      components: [],
      types: [],
      tests: []
    };

    generatedFiles.forEach(file => {
      const relativePath = path.relative(this.projectRoot, file);
      
      if (relativePath.includes('/handlers/')) {
        artifacts.handlers.push(file);
      } else if (relativePath.includes('/components/')) {
        artifacts.components.push(file);
      } else if (relativePath.includes('/types/')) {
        artifacts.types.push(file);
      } else if (relativePath.includes('/tests/')) {
        artifacts.tests.push(file);
      }
    });

    this.deploymentQueue.push(artifacts);
    return artifacts;
  }

  /**
   * Deploy Lambda handlers to AWS
   */
  async deployHandlers(handlers) {
    console.log(`🚀 Deploying ${handlers.length} Lambda handlers...`);
    
    for (const handler of handlers) {
      const handlerName = path.basename(handler, '.js');
      console.log(`📦 Packaging ${handlerName}...`);
      
      // Package handler following Tim-Combo patterns
      const zipCommand = `cd ${path.dirname(handler)} && zip ${handlerName}.zip ${handlerName}.js`;
      execSync(zipCommand);
      
      // Upload to S3 bucket
      const uploadCommand = `aws s3 cp ${handlerName}.zip s3://tim-dev-lambda/ --profile dev-sso`;
      execSync(uploadCommand);
      
      console.log(`✅ Deployed ${handlerName}`);
    }
  }

  /**
   * Deploy frontend components
   */
  async deployComponents(components) {
    console.log(`⚛️ Deploying ${components.length} React components...`);
    
    // Run TypeScript compilation check
    execSync('npx tsc --noEmit --project . --pretty', { 
      cwd: path.join(this.projectRoot, 'src/frontend'),
      stdio: 'inherit'
    });
    
    // Build frontend
    execSync('npm run build:sandbox', {
      cwd: path.join(this.projectRoot, 'src/frontend'),
      stdio: 'inherit'
    });
    
    // Deploy to S3
    execSync('aws s3 sync build/ s3://tim-sb-fe-live-855652006097 --profile media-sso --delete', {
      cwd: path.join(this.projectRoot, 'src/frontend'),
      stdio: 'inherit'
    });
    
    console.log('✅ Frontend deployed successfully');
  }

  /**
   * Run generated tests
   */
  async runTests(tests) {
    console.log(`🧪 Running ${tests.length} test suites...`);
    
    try {
      // Run TypeScript tests
      execSync('npm test', {
        cwd: path.join(this.projectRoot, 'src/frontend'),
        stdio: 'inherit'
      });
      
      // Run E2E tests
      execSync('npx playwright test --reporter=line', {
        cwd: path.join(this.projectRoot, 'src/frontend'),
        stdio: 'inherit'
      });
      
      console.log('✅ All tests passed');
    } catch (error) {
      console.error('❌ Tests failed:', error.message);
      throw error;
    }
  }

  /**
   * Full deployment pipeline
   */
  async deployComplete(artifacts) {
    console.log('🎯 Starting complete deployment pipeline...');
    
    try {
      // Stage 1: Deploy backend handlers
      if (artifacts.handlers.length > 0) {
        await this.deployHandlers(artifacts.handlers);
      }
      
      // Stage 2: Deploy frontend components  
      if (artifacts.components.length > 0) {
        await this.deployComponents(artifacts.components);
      }
      
      // Stage 3: Run tests
      if (artifacts.tests.length > 0) {
        await this.runTests(artifacts.tests);
      }
      
      console.log('🎉 Deployment pipeline completed successfully!');
      
    } catch (error) {
      console.error('💥 Deployment failed:', error.message);
      throw error;
    }
  }
}

module.exports = AgentDeploymentOrchestrator;
