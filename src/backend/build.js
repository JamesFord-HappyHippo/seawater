#!/usr/bin/env node

const esbuild = require('esbuild');
const path = require('path');
const fs = require('fs');

// Configuration for Lambda bundling
const config = {
  platform: 'node',
  target: 'node22',
  format: 'cjs',
  bundle: true,
  minify: false, // Keep readable for debugging
  sourcemap: false,
  external: [], // Bundle all dependencies for Lambda
  resolveExtensions: ['.js', '.ts'],
  logLevel: 'info',
  nodePaths: [path.join(__dirname, 'node_modules')],
};

// Helper files that need to be copied to each Lambda directory to avoid traversal issues
const helperFiles = [
  'lambdaWrapper.js',
  'validationUtil.js', 
  'dbOperations.js',
  'responseUtil.js',
  'errorHandler.js',
  'dbClient.js',
  'eventParser.js',
  'httpClient.js',
  'cacheManager.js',
  'geocodingService.js',
  'spatialQueries.js',
  'climateDataAggregator.js'
];

/**
 * Copy helper files to each Lambda function directory
 * This avoids directory traversal issues in Lambda runtime
 */
function copyHelpersToLambdaDir(lambdaName) {
  const lambdaDir = path.join(__dirname, 'dist', lambdaName);
  const helpersSourceDir = path.join(__dirname, '../helpers');
  
  // Create lambda-specific directory if it doesn't exist
  if (!fs.existsSync(lambdaDir)) {
    fs.mkdirSync(lambdaDir, { recursive: true });
  }
  
  // Copy each helper file
  for (const helperFile of helperFiles) {
    const sourcePath = path.join(helpersSourceDir, helperFile);
    const destPath = path.join(lambdaDir, helperFile);
    
    if (fs.existsSync(sourcePath)) {
      try {
        fs.copyFileSync(sourcePath, destPath);
      } catch (error) {
        console.warn(`Warning: Could not copy ${helperFile} to ${lambdaName}:`, error.message);
      }
    }
  }
}

// Lambda functions to build  
const lambdaFunctions = [
  {
    name: 'healthCheck',
    entryPoint: '../handlers/healthCheck.js',
    outdir: 'dist/healthCheck',
    outfile: 'dist/healthCheck/index.js'
  },
  {
    name: 'getPropertyRisk',
    entryPoint: '../handlers/climate/getPropertyRisk.js',
    outdir: 'dist/getPropertyRisk',
    outfile: 'dist/getPropertyRisk/index.js'
  },
  {
    name: 'compareProperties',
    entryPoint: '../handlers/climate/compareProperties.js',
    outdir: 'dist/compareProperties',
    outfile: 'dist/compareProperties/index.js'
  },
  {
    name: 'getGeographicRisk',
    entryPoint: '../handlers/climate/getGeographicRisk.js',
    outdir: 'dist/getGeographicRisk',
    outfile: 'dist/getGeographicRisk/index.js'
  },
  {
    name: 'bulkPropertyRisk',
    entryPoint: '../handlers/climate/bulkPropertyRisk.js',
    outdir: 'dist/bulkPropertyRisk',
    outfile: 'dist/bulkPropertyRisk/index.js'
  },
  // Agent Configuration Functions - Agent Factory Backend
  {
    name: 'agentTriggerCreate',
    entryPoint: 'src/handlers/config/agentTriggerCreate.js',
    outdir: 'dist/agentTriggerCreate',
    outfile: 'dist/agentTriggerCreate/index.js'
  },
  {
    name: 'agentTriggerRead',
    entryPoint: 'src/handlers/config/agentTriggerRead.js',
    outdir: 'dist/agentTriggerRead',
    outfile: 'dist/agentTriggerRead/index.js'
  },
  {
    name: 'agentTriggerUpdate',
    entryPoint: 'src/handlers/config/agentTriggerUpdate.js',
    outdir: 'dist/agentTriggerUpdate',
    outfile: 'dist/agentTriggerUpdate/index.js'
  },
  {
    name: 'agentTriggerDelete',
    entryPoint: 'src/handlers/config/agentTriggerDelete.js',
    outdir: 'dist/agentTriggerDelete',
    outfile: 'dist/agentTriggerDelete/index.js'
  }
];

async function buildLambdaFunctions() {
  console.log('🚀 Building Seawater Lambda functions...\n');

  // Ensure dist directory exists
  const distDir = path.join(__dirname, 'dist');
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }

  const results = [];

  for (const func of lambdaFunctions) {
    console.log(`📦 Building ${func.name}...`);
    
    try {
      const entryPoint = path.resolve(__dirname, func.entryPoint);
      
      // Check if entry point exists
      if (!fs.existsSync(entryPoint)) {
        console.error(`❌ Entry point not found: ${entryPoint}`);
        continue;
      }

      const result = await esbuild.build({
        ...config,
        entryPoints: [entryPoint],
        outfile: path.join(__dirname, func.outfile),
        metafile: true,
      });

      // Copy helper files to the Lambda directory
      copyHelpersToLambdaDir(func.name);

      console.log(`✅ Successfully built ${func.name}`);
      console.log(`   📁 Helpers copied to ${func.outdir}`);
      
      // Show bundle information
      if (result.metafile) {
        const analysis = await esbuild.analyzeMetafile(result.metafile, {
          verbose: false,
        });
        console.log(`   Bundle size: ${Math.round(fs.statSync(path.join(__dirname, func.outfile)).size / 1024)}KB`);
      }

      results.push({
        name: func.name,
        status: 'success',
        outfile: func.outfile,
        outdir: func.outdir
      });

    } catch (error) {
      console.error(`❌ Failed to build ${func.name}:`, error.message);
      results.push({
        name: func.name,
        status: 'error',
        error: error.message
      });
    }
  }

  // Summary
  console.log('\n📊 Build Summary:');
  const successful = results.filter(r => r.status === 'success');
  const failed = results.filter(r => r.status === 'error');
  
  console.log(`✅ Successful builds: ${successful.length}`);
  console.log(`❌ Failed builds: ${failed.length}`);
  
  if (successful.length > 0) {
    console.log('\n✅ Successfully built functions:');
    successful.forEach(r => {
      console.log(`   - ${r.name} → ${r.outfile}`);
    });
  }

  if (failed.length > 0) {
    console.log('\n❌ Failed builds:');
    failed.forEach(r => {
      console.log(`   - ${r.name}: ${r.error}`);
    });
    process.exit(1);
  }

  console.log('\n🎉 All Lambda functions built successfully!');
  console.log('\n📁 Built files are ready for deployment in the dist/ directory');
}

// Handle process signals
process.on('SIGINT', () => {
  console.log('\n⚠️  Build interrupted by user');
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('❌ Unhandled promise rejection:', reason);
  process.exit(1);
});

// Run the build
buildLambdaFunctions().catch((error) => {
  console.error('❌ Build failed:', error);
  process.exit(1);
});