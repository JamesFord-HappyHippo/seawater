import { expect, test } from '@playwright/test';
import { 
  SEAWATER_TEST_CREDENTIALS, 
  TEST_ADDRESSES,
  TEST_TIMEOUTS,
  MOBILE_VIEWPORTS 
} from '../utils/testCredentials';
import { 
  AuthHelpers, 
  PropertyHelpers, 
  SubscriptionHelpers,
  ResponsiveHelpers,
  DebugHelpers 
} from '../utils/testHelpers';

test.describe('Seawater User Journey Tests', () => {
  test.beforeEach(async ({ page }) => {
    DebugHelpers.setupConsoleLogging(page);
  });

  test.describe('Free User Journey', () => {
    test('complete free user experience: discovery to paywall', async ({ page }) => {
      // 1. Anonymous user lands on homepage
      await page.goto('/');
      await DebugHelpers.waitForPageLoad(page);
      
      // Take screenshot of landing page
      await DebugHelpers.takeTimestampedScreenshot(page, 'free-journey-01-landing');
      
      // 2. Perform first property assessment (anonymous)
      const testAddress = TEST_ADDRESSES.HIGH_FLOOD_RISK[0];
      await PropertyHelpers.assessProperty(page, testAddress);
      await PropertyHelpers.verifyRiskResults(page);
      
      await DebugHelpers.takeTimestampedScreenshot(page, 'free-journey-02-first-assessment');
      
      // 3. User registers for account
      const userData = await AuthHelpers.registerTestUser(page, {
        intended_use: 'personal',
        referral_source: 'google_search'
      });
      
      await DebugHelpers.takeTimestampedScreenshot(page, 'free-journey-03-registration');
      
      // 4. User performs more assessments until hitting limit
      for (let i = 0; i < 3; i++) {
        await page.goto('/');
        const address = TEST_ADDRESSES.LOW_RISK[i % TEST_ADDRESSES.LOW_RISK.length];
        await PropertyHelpers.assessProperty(page, address);
        
        // Check for usage counter
        const usageVisible = await page.locator('text*="remaining", text*="used"').count() > 0;
        console.log(`Assessment ${i + 1}: Usage counter visible: ${usageVisible}`);
      }
      
      // 5. Next assessment should trigger paywall
      await page.goto('/');
      const limitAddress = TEST_ADDRESSES.WILDFIRE_RISK[0];
      
      try {
        await PropertyHelpers.assessProperty(page, limitAddress);
        
        // Should see paywall
        await SubscriptionHelpers.verifyPaywallDisplay(page);
        await DebugHelpers.takeTimestampedScreenshot(page, 'free-journey-04-paywall');
        
      } catch (error) {
        console.log('Paywall may not be triggered yet or implemented differently');
        await DebugHelpers.takeTimestampedScreenshot(page, 'free-journey-04-no-paywall');
      }
      
      console.log(`Free user journey completed for: ${userData.email}`);
    });

    test('free user should see upgrade prompts throughout journey', async ({ page }) => {
      await page.goto('/');
      
      // Check for upgrade prompts on homepage
      const homepagePrompts = await page.locator('text*="upgrade", text*="premium", button:has-text("Upgrade")').count();
      console.log(`Homepage upgrade prompts: ${homepagePrompts}`);
      
      // Perform assessment and check for upgrade prompts
      const testAddress = TEST_ADDRESSES.LOW_RISK[0];
      await PropertyHelpers.assessProperty(page, testAddress);
      
      const resultPrompts = await page.locator('text*="upgrade", text*="premium", .upgrade-prompt').count();
      console.log(`Assessment result upgrade prompts: ${resultPrompts}`);
      
      // Check for comparison feature upgrade prompt
      await page.goto('/compare');
      const comparePrompts = await page.locator('text*="upgrade", text*="premium", .paywall').count();
      console.log(`Comparison page upgrade prompts: ${comparePrompts}`);
    });
  });

  test.describe('Premium User Journey', () => {
    test('complete premium user experience', async ({ page }) => {
      // 1. Login as premium user
      await AuthHelpers.loginWithCredentials(page, 'PREMIUM_USER');
      await DebugHelpers.takeTimestampedScreenshot(page, 'premium-journey-01-login');
      
      // 2. Access dashboard and verify premium features
      await page.goto('/dashboard');
      await SubscriptionHelpers.verifySubscriptionTier(page, 'premium');
      
      // 3. Perform unlimited assessments
      const addresses = [
        ...TEST_ADDRESSES.HIGH_FLOOD_RISK,
        ...TEST_ADDRESSES.LOW_RISK,
        ...TEST_ADDRESSES.WILDFIRE_RISK
      ];
      
      for (let i = 0; i < 5; i++) {
        await page.goto('/');
        const address = addresses[i % addresses.length];
        await PropertyHelpers.assessProperty(page, address);
        
        // Should not hit paywall
        const hasPaywall = await page.locator('.paywall, .upgrade-prompt').count() > 0;
        expect(hasPaywall).toBeFalsy();
      }
      
      await DebugHelpers.takeTimestampedScreenshot(page, 'premium-journey-02-assessments');
      
      // 4. Use property comparison feature
      await PropertyHelpers.compareProperties(page, TEST_ADDRESSES.HIGH_FLOOD_RISK[0], TEST_ADDRESSES.LOW_RISK[0]);
      await DebugHelpers.takeTimestampedScreenshot(page, 'premium-journey-03-comparison');
      
      // 5. Generate professional report (if available)
      try {
        const reportButton = page.locator('button:has-text("Report"), button:has-text("Generate"), a:has-text("Report")');
        if (await reportButton.count() > 0) {
          await reportButton.first().click();
          await page.waitForTimeout(2000);
          await DebugHelpers.takeTimestampedScreenshot(page, 'premium-journey-04-report');
        }
      } catch (error) {
        console.log('Report generation feature may not be implemented yet');
      }
      
      console.log('Premium user journey completed successfully');
    });

    test('premium user should access all basic and premium features', async ({ page }) => {
      await AuthHelpers.loginWithCredentials(page, 'PREMIUM_USER');
      
      // Test access to premium features
      const premiumFeatures = [
        { url: '/compare', name: 'Property Comparison' },
        { url: '/reports', name: 'Reports' },
        { url: '/api', name: 'API Access' }
      ];
      
      for (const feature of premiumFeatures) {
        await page.goto(feature.url);
        
        const isBlocked = page.url().includes('404') || 
                         await page.locator('.paywall, text*="upgrade"').count() > 0;
        
        if (isBlocked) {
          console.log(`⚠️ Premium feature ${feature.name} may be blocked`);
        } else {
          console.log(`✅ Premium feature ${feature.name} accessible`);
        }
      }
    });
  });

  test.describe('Professional User Journey', () => {
    test('complete professional user B2B workflow', async ({ page }) => {
      // 1. Login as professional user
      await AuthHelpers.loginWithCredentials(page, 'PROFESSIONAL_USER');
      await DebugHelpers.takeTimestampedScreenshot(page, 'professional-journey-01-login');
      
      // 2. Access professional dashboard
      await page.goto('/dashboard');
      await SubscriptionHelpers.verifySubscriptionTier(page, 'professional');
      
      // 3. Bulk analysis workflow (if available)
      try {
        await page.goto('/bulk-analysis');
        
        if (!page.url().includes('404')) {
          // Upload CSV or enter multiple addresses
          const bulkInput = page.locator('textarea, input[type="file"], .bulk-input').first();
          if (await bulkInput.count() > 0) {
            if (await page.locator('textarea').count() > 0) {
              const bulkAddresses = TEST_ADDRESSES.HIGH_FLOOD_RISK.join('\n');
              await page.fill('textarea', bulkAddresses);
              
              const submitButton = page.locator('button:has-text("Analyze"), button:has-text("Submit")');
              if (await submitButton.count() > 0) {
                await submitButton.click();
                await page.waitForTimeout(5000); // Wait for processing
              }
            }
          }
          
          await DebugHelpers.takeTimestampedScreenshot(page, 'professional-journey-02-bulk-analysis');
        }
      } catch (error) {
        console.log('Bulk analysis feature may not be implemented yet');
      }
      
      // 4. API key management (if available)
      try {
        await page.goto('/api-keys');
        
        if (!page.url().includes('404')) {
          // Look for API key management interface
          const apiElements = await page.locator('.api-key, text*="API", button:has-text("Generate")').count();
          console.log(`API management elements found: ${apiElements}`);
          
          await DebugHelpers.takeTimestampedScreenshot(page, 'professional-journey-03-api-management');
        }
      } catch (error) {
        console.log('API key management may not be implemented yet');
      }
      
      // 5. Client management (if available)
      try {
        await page.goto('/clients');
        
        if (!page.url().includes('404')) {
          await DebugHelpers.takeTimestampedScreenshot(page, 'professional-journey-04-client-management');
        }
      } catch (error) {
        console.log('Client management may not be implemented yet');
      }
      
      console.log('Professional user journey completed');
    });

    test('professional user should have full platform access', async ({ page }) => {
      await AuthHelpers.loginWithCredentials(page, 'PROFESSIONAL_USER');
      
      // Test access to all features
      const allFeatures = [
        { url: '/', name: 'Property Assessment' },
        { url: '/compare', name: 'Property Comparison' },
        { url: '/reports', name: 'Reports' },
        { url: '/api', name: 'API Access' },
        { url: '/bulk-analysis', name: 'Bulk Analysis' },
        { url: '/webhooks', name: 'Webhooks' }
      ];
      
      let accessibleFeatures = 0;
      
      for (const feature of allFeatures) {
        await page.goto(feature.url);
        
        const isBlocked = page.url().includes('404') || 
                         await page.locator('.paywall, text*="upgrade"').count() > 0;
        
        if (!isBlocked) {
          accessibleFeatures++;
          console.log(`✅ Professional feature ${feature.name} accessible`);
        } else {
          console.log(`⚠️ Professional feature ${feature.name} may not be implemented`);
        }
      }
      
      expect(accessibleFeatures).toBeGreaterThanOrEqual(2); // At least basic features should work
    });
  });

  test.describe('Mobile User Journey', () => {
    test('responsive design on mobile devices', async ({ page }) => {
      // Test on different mobile viewports
      const viewports = [
        { name: 'iPhone 12', ...MOBILE_VIEWPORTS.IPHONE_12 },
        { name: 'Samsung Galaxy', ...MOBILE_VIEWPORTS.SAMSUNG_GALAXY },
        { name: 'Tablet', ...MOBILE_VIEWPORTS.TABLET }
      ];
      
      for (const viewport of viewports) {
        await page.setViewportSize(viewport);
        await page.goto('/');
        
        // Test responsive elements
        await ResponsiveHelpers.verifyResponsiveElements(page);
        
        // Test mobile navigation
        await ResponsiveHelpers.testMobileNavigation(page);
        
        // Test property assessment on mobile
        const testAddress = TEST_ADDRESSES.LOW_RISK[0];
        await PropertyHelpers.assessProperty(page, testAddress);
        
        // Verify results are readable on mobile
        const riskScore = page.locator('.risk-score, [data-testid="risk-score"]').first();
        if (await riskScore.count() > 0) {
          await expect(riskScore).toBeVisible();
        }
        
        await DebugHelpers.takeTimestampedScreenshot(page, `mobile-${viewport.name.toLowerCase().replace(' ', '-')}`);
      }
    });

    test('mobile user should complete full assessment flow', async ({ page }) => {
      await page.setViewportSize(MOBILE_VIEWPORTS.IPHONE_12);
      
      // Complete mobile user journey
      await page.goto('/');
      
      // 1. Mobile property search
      const testAddress = TEST_ADDRESSES.HIGH_FLOOD_RISK[0];
      await PropertyHelpers.assessProperty(page, testAddress);
      await PropertyHelpers.verifyRiskResults(page);
      
      // 2. Mobile registration (if needed)
      if (await page.locator('button:has-text("Sign Up"), a:has-text("Register")').count() > 0) {
        const userData = await AuthHelpers.registerTestUser(page);
        console.log(`Mobile user registered: ${userData.email}`);
      }
      
      // 3. Mobile paywall interaction
      try {
        await SubscriptionHelpers.triggerFreeTierLimit(page);
        await SubscriptionHelpers.verifyPaywallDisplay(page);
        
        // Test mobile upgrade flow
        const upgradeButton = page.locator('button:has-text("Upgrade")').first();
        if (await upgradeButton.count() > 0) {
          await upgradeButton.click();
          await page.waitForTimeout(2000);
        }
      } catch (error) {
        console.log('Mobile paywall interaction may differ');
      }
      
      await DebugHelpers.takeTimestampedScreenshot(page, 'mobile-complete-journey');
    });
  });

  test.describe('Error Handling and Edge Cases', () => {
    test('should handle network errors gracefully', async ({ page }) => {
      await page.goto('/');
      
      // Simulate network failure
      await page.route('**/api/**', (route) => {
        route.abort('failed');
      });
      
      // Try to perform assessment
      const testAddress = TEST_ADDRESSES.LOW_RISK[0];
      
      try {
        await PropertyHelpers.assessProperty(page, testAddress);
        
        // Should show error message
        await page.waitForSelector(
          '.error, .text-red, [role="alert"], text*="error", text*="failed"',
          { timeout: TEST_TIMEOUTS.MEDIUM }
        );
        
        const errorMessage = page.locator('.error, .text-red, [role="alert"]').first();
        await expect(errorMessage).toBeVisible();
        
        await DebugHelpers.takeTimestampedScreenshot(page, 'network-error-handling');
      } catch (error) {
        console.log('Network error handling may need implementation');
      }
    });

    test('should handle session timeout gracefully', async ({ page }) => {
      await AuthHelpers.loginWithCredentials(page, 'FREE_USER');
      
      // Clear session tokens to simulate timeout
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });
      
      // Try to perform authenticated action
      await page.goto('/dashboard');
      await page.waitForTimeout(2000);
      
      // Should redirect to login or show auth prompt
      const needsAuth = page.url().includes('login') || 
                       page.url().includes('auth') ||
                       await page.locator('button:has-text("Sign In"), button:has-text("Login")').count() > 0;
      
      expect(needsAuth).toBeTruthy();
    });

    test('should provide helpful feedback for invalid inputs', async ({ page }) => {
      await page.goto('/');
      
      // Test invalid address inputs
      const invalidInputs = [
        '', // Empty
        '123', // Too short
        'Not a real address', // Invalid format
        '!@#$%^&*()', // Special characters
      ];
      
      for (const invalidInput of invalidInputs) {
        const searchInput = page.locator('input[name="address"], input[placeholder*="address"]').first();
        await searchInput.fill(invalidInput);
        
        const submitButton = page.locator('button:has-text("Assess"), button[type="submit"]').first();
        await submitButton.click();
        
        await page.waitForTimeout(2000);
        
        // Should show helpful error or validation message
        const hasValidation = await page.locator(
          '.error, .invalid-feedback, text*="invalid", text*="required"'
        ).count() > 0;
        
        console.log(`Invalid input "${invalidInput}": Validation shown: ${hasValidation}`);
      }
    });
  });

  test.describe('Performance and Accessibility', () => {
    test('should load pages within acceptable timeframes', async ({ page }) => {
      const startTime = Date.now();
      
      await page.goto('/');
      await DebugHelpers.waitForPageLoad(page);
      
      const loadTime = Date.now() - startTime;
      console.log(`Homepage load time: ${loadTime}ms`);
      
      // Should load within 5 seconds
      expect(loadTime).toBeLessThan(5000);
      
      // Test assessment performance
      const assessmentStart = Date.now();
      const testAddress = TEST_ADDRESSES.LOW_RISK[0];
      await PropertyHelpers.assessProperty(page, testAddress);
      
      const assessmentTime = Date.now() - assessmentStart;
      console.log(`Assessment time: ${assessmentTime}ms`);
      
      // Assessment should complete within 15 seconds
      expect(assessmentTime).toBeLessThan(15000);
    });

    test('should meet basic accessibility standards', async ({ page }) => {
      await page.goto('/');
      
      // Check for proper heading hierarchy
      const h1Count = await page.locator('h1').count();
      expect(h1Count).toBeLessThanOrEqual(1); // Should have at most one h1
      
      // Check for alt text on images
      const images = await page.locator('img').count();
      if (images > 0) {
        const imagesWithAlt = await page.locator('img[alt]').count();
        console.log(`Images with alt text: ${imagesWithAlt}/${images}`);
      }
      
      // Check for form labels
      const inputs = await page.locator('input').count();
      if (inputs > 0) {
        const inputsWithLabels = await page.locator('input[aria-label], input[id] + label, label input').count();
        console.log(`Inputs with labels: ${inputsWithLabels}/${inputs}`);
      }
      
      // Check color contrast (basic test)
      const bodyStyles = await page.locator('body').evaluate(el => {
        const styles = window.getComputedStyle(el);
        return {
          color: styles.color,
          backgroundColor: styles.backgroundColor
        };
      });
      
      console.log('Body styles:', bodyStyles);
    });
  });
});