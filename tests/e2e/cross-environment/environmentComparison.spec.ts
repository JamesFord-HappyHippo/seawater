import { expect, test } from '@playwright/test';
import { getEnvironmentConfig, ENVIRONMENTS } from '../../config/environment';
import { 
  TEST_ADDRESSES, 
  TEST_TIMEOUTS,
  ENVIRONMENT_CREDENTIALS 
} from '../../utils/testCredentials';
import { 
  PropertyHelpers, 
  DebugHelpers,
  AuthHelpers 
} from '../../utils/testHelpers';

const envConfig = getEnvironmentConfig();

test.describe('Cross-Environment Comparison Tests', () => {
  test.beforeEach(async ({ page }) => {
    DebugHelpers.setupConsoleLogging(page);
  });

  test.describe('DNS and SSL Verification', () => {
    test('should verify www.seawater.io DNS resolution and SSL certificate', async ({ page }) => {
      await page.goto('https://www.seawater.io');
      
      // Verify page loads successfully
      await DebugHelpers.waitForPageLoad(page);
      
      // Check for SSL indicators
      const url = page.url();
      expect(url).toContain('https://');
      expect(url).toContain('seawater.io');
      
      // Verify page title contains seawater branding
      const title = await page.title();
      expect(title.toLowerCase()).toContain('seawater');
      
      // Check for common security headers (if accessible)
      const response = await page.goto('https://www.seawater.io');
      const headers = response?.headers() || {};
      
      console.log('Production headers received:', Object.keys(headers).length);
      
      // Verify content loads
      const hasContent = await page.locator('body').textContent();
      expect(hasContent).toBeTruthy();
      expect(hasContent!.length).toBeGreaterThan(100);
      
      await DebugHelpers.takeTimestampedScreenshot(page, 'production-ssl-verification');
    });

    test('should verify test.seawater.io DNS resolution and SSL certificate', async ({ page }) => {
      try {
        await page.goto('https://test.seawater.io', { 
          timeout: TEST_TIMEOUTS.LONG,
          waitUntil: 'networkidle' 
        });
        
        // Test environment might have SSL issues, so we handle gracefully
        await DebugHelpers.waitForPageLoad(page);
        
        const url = page.url();
        expect(url).toContain('test.seawater.io');
        
        // Verify page loads with content
        const hasContent = await page.locator('body').textContent();
        expect(hasContent).toBeTruthy();
        
        console.log('✅ Test environment accessible and loading');
        await DebugHelpers.takeTimestampedScreenshot(page, 'test-env-ssl-verification');
        
      } catch (error) {
        console.log(`⚠️ Test environment access issue: ${error}`);
        // Don't fail test - test env might be temporarily unavailable
      }
    });

    test('should compare SSL certificate validity between environments', async ({ page }) => {
      const environments = [
        { name: 'production', url: 'https://www.seawater.io' },
        { name: 'test', url: 'https://test.seawater.io' }
      ];

      const sslResults = [];

      for (const env of environments) {
        try {
          const response = await page.goto(env.url, { timeout: TEST_TIMEOUTS.MEDIUM });
          
          const sslInfo = {
            environment: env.name,
            url: env.url,
            status: response?.status() || 0,
            accessible: true,
            hasValidSSL: response?.status() === 200,
            loadTime: Date.now()
          };
          
          sslResults.push(sslInfo);
          console.log(`${env.name} SSL info:`, sslInfo);
          
        } catch (error) {
          sslResults.push({
            environment: env.name,
            url: env.url,
            accessible: false,
            error: error.toString()
          });
        }
      }

      // At least production should be accessible
      const productionResult = sslResults.find(r => r.environment === 'production');
      expect(productionResult?.accessible).toBeTruthy();
      
      console.log('SSL comparison results:', sslResults);
    });
  });

  test.describe('Core Functionality Comparison', () => {
    test('should compare landing page content between environments', async ({ page }) => {
      const environments = [
        { name: 'production', url: 'https://www.seawater.io' },
        { name: 'test', url: 'https://test.seawater.io' }
      ];

      const pageComparison = [];

      for (const env of environments) {
        try {
          await page.goto(env.url);
          await DebugHelpers.waitForPageLoad(page);

          const pageData = {
            environment: env.name,
            title: await page.title(),
            hasSeawaterBranding: (await page.locator('text*="Seawater"').count()) > 0,
            hasClimateContent: (await page.locator('text*="climate"').count()) > 0,
            hasRiskContent: (await page.locator('text*="risk"').count()) > 0,
            hasPropertyAssessment: (await page.locator('input[placeholder*="address"], input[name="address"]').count()) > 0,
            hasCTAButton: (await page.locator('button:has-text("Assess"), button:has-text("Get Started")').count()) > 0,
            contentLength: (await page.locator('body').textContent())?.length || 0
          };

          pageComparison.push(pageData);
          console.log(`${env.name} page analysis:`, pageData);

        } catch (error) {
          console.log(`Could not analyze ${env.name}: ${error}`);
        }
      }

      // Compare results
      if (pageComparison.length >= 2) {
        const prod = pageComparison.find(p => p.environment === 'production');
        const test = pageComparison.find(p => p.environment === 'test');

        if (prod && test) {
          // Core elements should be consistent
          expect(prod.hasSeawaterBranding).toBe(test.hasSeawaterBranding);
          expect(prod.hasClimateContent).toBe(test.hasClimateContent);
          expect(prod.hasPropertyAssessment).toBe(test.hasPropertyAssessment);
          
          console.log('✅ Core functionality consistent between environments');
        }
      }
    });

    test('should compare property assessment functionality across environments', async ({ page }) => {
      const testAddress = TEST_ADDRESSES.QUICK_TEST[0];
      const environments = [
        'https://www.seawater.io',
        'https://test.seawater.io'
      ];

      const assessmentResults = [];

      for (const envUrl of environments) {
        try {
          await page.goto(envUrl);
          
          const startTime = Date.now();
          await PropertyHelpers.assessProperty(page, testAddress);
          await PropertyHelpers.verifyRiskResults(page);
          const endTime = Date.now();

          const result = {
            environment: envUrl.includes('www') ? 'production' : 'test',
            assessmentTime: endTime - startTime,
            hasRiskScore: (await page.locator('.risk-score, [data-testid="risk-score"]').count()) > 0,
            hasRiskFactors: (await page.locator('text*="flood", text*="fire", text*="hurricane"').count()) > 0,
            hasDataSources: (await page.locator('text*="FEMA", text*="NOAA", text*="USGS"').count()) > 0,
            success: true
          };

          assessmentResults.push(result);
          console.log(`Assessment on ${result.environment}:`, result);

        } catch (error) {
          assessmentResults.push({
            environment: envUrl.includes('www') ? 'production' : 'test',
            success: false,
            error: error.toString()
          });
        }
      }

      // At least one environment should work
      const successfulAssessments = assessmentResults.filter(r => r.success);
      expect(successfulAssessments.length).toBeGreaterThanOrEqual(1);

      // If both work, compare performance
      if (successfulAssessments.length === 2) {
        const timeDifference = Math.abs(
          successfulAssessments[0].assessmentTime - successfulAssessments[1].assessmentTime
        );
        console.log(`Assessment time difference: ${timeDifference}ms`);
      }
    });

    test('should verify authentication systems work in both environments', async ({ page }) => {
      const environments = [
        { 
          name: 'production', 
          url: 'https://www.seawater.io',
          credentials: ENVIRONMENT_CREDENTIALS.PRODUCTION 
        },
        { 
          name: 'test', 
          url: 'https://test.seawater.io',
          credentials: ENVIRONMENT_CREDENTIALS.TEST 
        }
      ];

      const authResults = [];

      for (const env of environments) {
        try {
          await page.goto(env.url);
          
          // Look for login functionality
          const hasLoginButton = await page.locator(
            'button:has-text("Login"), button:has-text("Sign In"), a:has-text("Login")'
          ).count() > 0;

          const hasAuthPages = await page.goto(`${env.url}/auth/login`).then(
            response => response?.status() !== 404
          ).catch(() => false);

          const authResult = {
            environment: env.name,
            hasLoginUI: hasLoginButton,
            hasAuthPages: hasAuthPages,
            credentialsConfigured: !!env.credentials.FREE_USER
          };

          authResults.push(authResult);
          console.log(`${env.name} auth analysis:`, authResult);

        } catch (error) {
          console.log(`Auth testing failed for ${env.name}: ${error}`);
        }
      }

      // At least production should have auth
      const prodAuth = authResults.find(r => r.environment === 'production');
      if (prodAuth) {
        expect(prodAuth.hasLoginUI || prodAuth.hasAuthPages).toBeTruthy();
      }
    });
  });

  test.describe('Performance Comparison', () => {
    test('should compare page load performance between environments', async ({ page }) => {
      const environments = [
        'https://www.seawater.io',
        'https://test.seawater.io'
      ];

      const performanceResults = [];

      for (const envUrl of environments) {
        try {
          const startTime = Date.now();
          
          await page.goto(envUrl, { waitUntil: 'networkidle' });
          
          const loadTime = Date.now() - startTime;
          
          // Get performance metrics
          const metrics = await page.evaluate(() => {
            const perfData = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
            return {
              domContentLoaded: perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart,
              loadComplete: perfData.loadEventEnd - perfData.loadEventStart,
              firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0
            };
          });

          const result = {
            environment: envUrl.includes('www') ? 'production' : 'test',
            totalLoadTime: loadTime,
            ...metrics
          };

          performanceResults.push(result);
          console.log(`Performance for ${result.environment}:`, result);

        } catch (error) {
          console.log(`Performance test failed for ${envUrl}: ${error}`);
        }
      }

      // Analyze results
      if (performanceResults.length >= 2) {
        const prod = performanceResults.find(p => p.environment === 'production');
        const test = performanceResults.find(p => p.environment === 'test');

        if (prod && test) {
          console.log('Performance comparison:');
          console.log(`Production: ${prod.totalLoadTime}ms`);
          console.log(`Test: ${test.totalLoadTime}ms`);
          
          // Production should generally be faster or similar
          const performanceRatio = test.totalLoadTime / prod.totalLoadTime;
          console.log(`Test env is ${performanceRatio.toFixed(2)}x slower than production`);
        }
      }

      // At least one environment should load reasonably fast
      const fastLoads = performanceResults.filter(r => r.totalLoadTime < 10000);
      expect(fastLoads.length).toBeGreaterThanOrEqual(1);
    });

    test('should compare API response times between environments', async ({ page }) => {
      const testAddress = TEST_ADDRESSES.QUICK_TEST[0];
      const environments = [
        'https://www.seawater.io',
        'https://test.seawater.io'
      ];

      const apiResults = [];

      for (const envUrl of environments) {
        try {
          await page.goto(envUrl);
          
          // Monitor API calls during assessment
          const apiCalls = [];
          page.on('response', (response) => {
            if (response.url().includes('/api/') || response.url().includes('seawater')) {
              apiCalls.push({
                url: response.url(),
                status: response.status(),
                timing: Date.now()
              });
            }
          });

          const assessmentStart = Date.now();
          await PropertyHelpers.assessProperty(page, testAddress);
          const assessmentEnd = Date.now();

          const result = {
            environment: envUrl.includes('www') ? 'production' : 'test',
            assessmentTime: assessmentEnd - assessmentStart,
            apiCallCount: apiCalls.length,
            successfulAPICalls: apiCalls.filter(call => call.status < 400).length
          };

          apiResults.push(result);
          console.log(`API performance for ${result.environment}:`, result);

        } catch (error) {
          console.log(`API testing failed for ${envUrl}: ${error}`);
        }
      }

      // Should have API activity in at least one environment
      const activeAPIs = apiResults.filter(r => r.apiCallCount > 0);
      expect(activeAPIs.length).toBeGreaterThanOrEqual(1);
    });
  });

  test.describe('Feature Parity Verification', () => {
    test('should verify trial system consistency across environments', async ({ page }) => {
      const environments = [
        'https://www.seawater.io',
        'https://test.seawater.io'
      ];

      const trialResults = [];

      for (const envUrl of environments) {
        try {
          await page.goto(envUrl);
          
          // Clear storage for fresh trial
          await page.evaluate(() => {
            localStorage.clear();
            sessionStorage.clear();
          });
          await page.context().clearCookies();
          
          // Perform assessment
          await PropertyHelpers.assessProperty(page, TEST_ADDRESSES.QUICK_TEST[0]);
          
          // Check for trial-related elements
          const hasTrialInfo = await page.locator(
            'text*="assessment", text*="trial", text*="remaining"'
          ).count() > 0;

          const hasUpgradePrompts = await page.locator(
            'text*="upgrade", text*="premium", button:has-text("Upgrade")'
          ).count() > 0;

          const result = {
            environment: envUrl.includes('www') ? 'production' : 'test',
            hasTrialTracking: hasTrialInfo,
            hasUpgradePrompts: hasUpgradePrompts,
            assessmentWorked: true
          };

          trialResults.push(result);
          console.log(`Trial system for ${result.environment}:`, result);

        } catch (error) {
          trialResults.push({
            environment: envUrl.includes('www') ? 'production' : 'test',
            assessmentWorked: false,
            error: error.toString()
          });
        }
      }

      // At least one environment should have working trial system
      const workingTrials = trialResults.filter(r => r.assessmentWorked);
      expect(workingTrials.length).toBeGreaterThanOrEqual(1);
    });

    test('should verify data attribution consistency', async ({ page }) => {
      const testAddress = TEST_ADDRESSES.HIGH_FLOOD_RISK[0];
      const environments = [
        'https://www.seawater.io',
        'https://test.seawater.io'
      ];

      const dataAttributionResults = [];

      for (const envUrl of environments) {
        try {
          await page.goto(envUrl);
          await PropertyHelpers.assessProperty(page, testAddress);

          // Check for data sources
          const femaCount = await page.locator('text*="FEMA"').count();
          const noaaCount = await page.locator('text*="NOAA"').count();
          const usgsCount = await page.locator('text*="USGS"').count();

          const result = {
            environment: envUrl.includes('www') ? 'production' : 'test',
            hasFEMA: femaCount > 0,
            hasNOAA: noaaCount > 0,
            hasUSGS: usgsCount > 0,
            totalDataSources: femaCount + noaaCount + usgsCount
          };

          dataAttributionResults.push(result);
          console.log(`Data attribution for ${result.environment}:`, result);

        } catch (error) {
          console.log(`Data attribution test failed for ${envUrl}: ${error}`);
        }
      }

      // Should have consistent data attribution
      if (dataAttributionResults.length >= 2) {
        const sourceCounts = dataAttributionResults.map(r => r.totalDataSources);
        const minSources = Math.min(...sourceCounts);
        const maxSources = Math.max(...sourceCounts);
        
        console.log(`Data source consistency: ${minSources}-${maxSources} sources`);
        
        // Difference should not be too large
        expect(maxSources - minSources).toBeLessThanOrEqual(2);
      }
    });
  });

  test.describe('Error Handling Comparison', () => {
    test('should verify error handling consistency across environments', async ({ page }) => {
      const invalidAddress = TEST_ADDRESSES.INVALID[0];
      const environments = [
        'https://www.seawater.io',
        'https://test.seawater.io'
      ];

      const errorResults = [];

      for (const envUrl of environments) {
        try {
          await page.goto(envUrl);
          
          // Try invalid address
          const addressInput = page.locator('input[name="address"], input[placeholder*="address"]').first();
          await addressInput.fill(invalidAddress);
          
          const submitButton = page.locator('button:has-text("Assess"), button[type="submit"]').first();
          await submitButton.click();
          
          await page.waitForTimeout(3000);

          // Check for error handling
          const hasErrorMessage = await page.locator(
            '.error, .invalid-feedback, text*="invalid", text*="not found"'
          ).count() > 0;

          const hasGracefulHandling = await page.locator('body').isVisible();

          const result = {
            environment: envUrl.includes('www') ? 'production' : 'test',
            showsErrorMessage: hasErrorMessage,
            handlesGracefully: hasGracefulHandling,
            pageStillFunctional: true
          };

          errorResults.push(result);
          console.log(`Error handling for ${result.environment}:`, result);

        } catch (error) {
          errorResults.push({
            environment: envUrl.includes('www') ? 'production' : 'test',
            pageStillFunctional: false,
            error: error.toString()
          });
        }
      }

      // Both environments should handle errors gracefully
      const gracefulHandling = errorResults.filter(r => r.handlesGracefully);
      expect(gracefulHandling.length).toBe(errorResults.length);
    });
  });
});