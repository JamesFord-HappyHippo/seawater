/**
 * Seawater Global Test Teardown
 * Cleanup after all tests complete
 */

import { FullConfig } from '@playwright/test';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting Seawater test environment cleanup...');
  
  try {
    // Clean up any test data if needed
    console.log('🗑️ Cleaning up test data...');
    
    // Generate test summary
    const fs = require('fs');
    const path = require('path');
    
    if (fs.existsSync('test-results/results.json')) {
      const results = JSON.parse(fs.readFileSync('test-results/results.json', 'utf8'));
      
      console.log('\n📊 Test Summary:');
      console.log(`Total tests: ${results.stats?.total || 'Unknown'}`);
      console.log(`Passed: ${results.stats?.passed || 'Unknown'}`);
      console.log(`Failed: ${results.stats?.failed || 'Unknown'}`);
      console.log(`Skipped: ${results.stats?.skipped || 'Unknown'}`);
      
      if (results.stats?.failed > 0) {
        console.log('\n❌ Failed tests detected. Check test-results/ for details.');
      } else {
        console.log('\n✅ All tests passed!');
      }
    }
    
    // Clean up old screenshots/videos if configured
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
    const cleanupDirs = ['test-results/screenshots', 'test-results/videos'];
    
    cleanupDirs.forEach(dir => {
      if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir);
        let deletedCount = 0;
        
        files.forEach((file: string) => {
          const filePath = path.join(dir, file);
          const stats = fs.statSync(filePath);
          
          if (Date.now() - stats.mtime.getTime() > maxAge) {
            fs.unlinkSync(filePath);
            deletedCount++;
          }
        });
        
        if (deletedCount > 0) {
          console.log(`🗑️ Cleaned up ${deletedCount} old files from ${dir}`);
        }
      }
    });
    
    console.log('✅ Seawater test environment cleanup complete');
    
  } catch (error) {
    console.error('❌ Error during test cleanup:', error);
    // Don't throw error to avoid masking test results
  }
}

export default globalTeardown;