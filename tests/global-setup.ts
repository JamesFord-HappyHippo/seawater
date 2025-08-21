/**
 * Seawater Global Test Setup
 * Prepares test environment and test data
 */

import { chromium, FullConfig } from '@playwright/test';
import { SEAWATER_TEST_CREDENTIALS, TEST_ENVIRONMENTS } from './utils/testCredentials';

async function globalSetup(config: FullConfig) {
  console.log('🌊 Setting up Seawater test environment...');
  
  // Create a browser instance for setup
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Get the base URL from config
    const baseURL = config.projects[0].use.baseURL || TEST_ENVIRONMENTS.LOCAL;
    console.log(`Using base URL: ${baseURL}`);
    
    // Test API connectivity
    console.log('🔌 Testing API connectivity...');
    try {
      const response = await page.request.get(`${baseURL}/api/health`);
      if (response.ok()) {
        console.log('✅ API is responsive');
      } else {
        console.warn(`⚠️ API health check returned status: ${response.status()}`);
      }
    } catch (error) {
      console.warn('⚠️ Could not connect to API, tests may fail:', error);
    }
    
    // Verify test user accounts exist (if possible)
    console.log('👥 Checking test user accounts...');
    try {
      // Navigate to login page to verify it loads
      await page.goto(`${baseURL}/auth/login`, { timeout: 30000 });
      console.log('✅ Login page accessible');
    } catch (error) {
      console.warn('⚠️ Could not access login page:', error);
    }
    
    // Set up test directories
    console.log('📁 Setting up test directories...');
    const fs = require('fs');
    const testDirs = [
      'test-results',
      'test-results/screenshots',
      'test-results/videos',
      'test-results/traces'
    ];
    
    testDirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`Created directory: ${dir}`);
      }
    });
    
    // Store environment info for tests
    process.env.SEAWATER_TEST_BASE_URL = baseURL;
    process.env.SEAWATER_TEST_READY = 'true';
    
    console.log('✅ Seawater test environment setup complete');
    
  } catch (error) {
    console.error('❌ Error during test setup:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

export default globalSetup;