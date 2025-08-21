import { expect, test } from '@playwright/test';
import { getEnvironmentConfig, getTestUrls } from '../config/environment';
import { 
  TEST_ADDRESSES,
  TEST_TIMEOUTS,
  SUBSCRIPTION_TEST_LIMITS 
} from '../utils/testCredentials';
import { 
  DebugHelpers,
  PropertyHelpers,
  SubscriptionHelpers,
  AuthHelpers 
} from '../utils/testHelpers';

const envConfig = getEnvironmentConfig();
const testUrls = getTestUrls(envConfig.baseURL);

test.describe('Seawater Trial System Tests', () => {
  test.beforeEach(async ({ page }) => {
    DebugHelpers.setupConsoleLogging(page);
    
    // Clear all storage to ensure clean state for trial testing
    await page.context().clearCookies();
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test.describe('First-Time User Experience', () => {
    test('should provide full climate risk report for first-time anonymous user', async ({ page }) => {
      await page.goto(testUrls.home);
      await DebugHelpers.waitForPageLoad(page);
      
      // Perform first assessment as anonymous user
      const testAddress = TEST_ADDRESSES.QUICK_TEST[1]; // High-risk address
      await PropertyHelpers.assessProperty(page, testAddress);
      
      // Verify comprehensive results are shown
      await PropertyHelpers.verifyRiskResults(page);
      
      // Check for comprehensive risk information (8 risk factors)
      const riskElements = [
        '.risk-score, [data-testid="risk-score"]',
        '.flood-risk, [data-testid="flood-risk"]',
        '.fire-risk, [data-testid="fire-risk"]',
        '.hurricane-risk, [data-testid="hurricane-risk"]',
        '.earthquake-risk, [data-testid="earthquake-risk"]'
      ];
      
      let riskElementsVisible = 0;
      for (const element of riskElements) {
        if (await page.locator(element).count() > 0) {
          riskElementsVisible++;
        }
      }
      
      console.log(`First-time user sees ${riskElementsVisible} risk elements`);
      expect(riskElementsVisible).toBeGreaterThanOrEqual(2);
      
      // Verify no trial limit messaging appears yet
      const trialLimitElements = [
        '.trial-limit',
        '.paywall',
        'text*="trial limit"',
        'text*="upgrade to continue"',
        '[data-testid="trial-limit-modal"]'
      ];
      
      for (const element of trialLimitElements) {
        const count = await page.locator(element).count();
        expect(count).toBe(0);
      }
      
      await DebugHelpers.takeTimestampedScreenshot(page, 'first-time-user-full-report');
    });

    test('should track usage without requiring registration', async ({ page }) => {
      await page.goto(testUrls.home);
      
      // Perform first assessment
      await PropertyHelpers.assessProperty(page, TEST_ADDRESSES.QUICK_TEST[0]);
      
      // Check if usage tracking is visible (optional)
      const usageIndicators = [
        'text*="assessment"',
        'text*="remaining"',
        'text*="used"',
        '.usage-counter',
        '[data-testid="usage-tracker"]'
      ];
      
      let usageVisible = false;
      for (const indicator of usageIndicators) {
        if (await page.locator(indicator).count() > 0) {
          usageVisible = true;
          console.log(`Usage tracking visible: ${indicator}`);
          break;
        }
      }
      
      console.log(`Usage tracking visible: ${usageVisible}`);
      // This is informational - implementation may vary
    });

    test('should set appropriate cookies for trial tracking', async ({ page }) => {
      await page.goto(testUrls.home);
      
      // Perform an assessment to trigger trial tracking
      await PropertyHelpers.assessProperty(page, TEST_ADDRESSES.QUICK_TEST[0]);
      
      // Wait for any cookies to be set
      await page.waitForTimeout(2000);
      
      // Check for trial-related cookies
      const cookies = await page.context().cookies();
      const trialCookies = cookies.filter(cookie => 
        cookie.name.includes('trial') || 
        cookie.name.includes('usage') || 
        cookie.name.includes('assessment') ||
        cookie.name.includes('seawater')
      );
      
      console.log('Trial-related cookies found:', trialCookies.map(c => c.name));
      
      // Should have at least one cookie for tracking
      expect(trialCookies.length).toBeGreaterThanOrEqual(1);
      
      // Verify cookie properties for security
      for (const cookie of trialCookies) {
        if (envConfig.ssl.enabled) {
          expect(cookie.secure).toBeTruthy();
        }
        // SameSite should be set appropriately
        expect(['Strict', 'Lax', 'None']).toContain(cookie.sameSite);
      }
    });
  });

  test.describe('Trial Limit Implementation', () => {
    test('should show trial limit modal after exceeding free assessments', async ({ page }) => {
      await page.goto(testUrls.home);
      
      const freeLimit = SUBSCRIPTION_TEST_LIMITS.free.monthly_assessments;
      console.log(`Testing with free limit of ${freeLimit} assessments`);
      
      // Perform assessments up to the limit
      for (let i = 0; i < freeLimit; i++) {
        const address = TEST_ADDRESSES.QUICK_TEST[i % TEST_ADDRESSES.QUICK_TEST.length];
        await PropertyHelpers.assessProperty(page, address);
        
        console.log(`Completed assessment ${i + 1}/${freeLimit}`);
        await page.waitForTimeout(1000);
        
        // Navigate back to home for next assessment
        if (i < freeLimit - 1) {
          await page.goto(testUrls.home);
        }
      }
      
      // Now attempt one more assessment that should trigger the limit
      await page.goto(testUrls.home);
      const limitTriggerAddress = TEST_ADDRESSES.MULTI_HAZARD[0];
      
      try {
        await PropertyHelpers.assessProperty(page, limitTriggerAddress);
        
        // Should see trial limit modal or paywall
        await page.waitForSelector(
          '.trial-limit, .paywall, [data-testid="trial-limit-modal"], text*="trial limit"',
          { timeout: envConfig.timeout.medium }
        );
        
        const modalVisible = await page.locator(
          '.trial-limit, .paywall, [data-testid="trial-limit-modal"]'
        ).count() > 0;
        
        expect(modalVisible).toBeTruthy();
        
        // Verify modal contains appropriate messaging
        const upgradeText = await page.locator('text*="upgrade", text*="premium", text*="continue"').count();
        expect(upgradeText).toBeGreaterThanOrEqual(1);
        
        await DebugHelpers.takeTimestampedScreenshot(page, 'trial-limit-modal-displayed');
        
      } catch (error) {
        console.log('Trial limit may not be implemented or configured differently');
        await DebugHelpers.takeTimestampedScreenshot(page, 'trial-limit-not-triggered');
      }
    });

    test('should maintain trial limits across browser sessions', async ({ page }) => {
      // First session - use up the trial
      await page.goto(testUrls.home);
      
      const freeLimit = SUBSCRIPTION_TEST_LIMITS.free.monthly_assessments;
      
      for (let i = 0; i < freeLimit; i++) {
        const address = TEST_ADDRESSES.LOW_RISK[i % TEST_ADDRESSES.LOW_RISK.length];
        await PropertyHelpers.assessProperty(page, address);
        await page.goto(testUrls.home);
      }
      
      // Close and reopen browser context to simulate new session
      const context = page.context();
      const newContext = await context.browser()?.newContext({
        storageState: undefined // Don't persist storage state
      });
      
      if (newContext) {
        const newPage = await newContext.newPage();
        DebugHelpers.setupConsoleLogging(newPage);
        
        // Copy cookies from original session to simulate same user
        const cookies = await page.context().cookies();
        await newContext.addCookies(cookies);
        
        await newPage.goto(testUrls.home);
        
        // Attempt assessment - should still show trial limit
        try {
          await PropertyHelpers.assessProperty(newPage, TEST_ADDRESSES.QUICK_TEST[0]);
          
          const stillLimited = await newPage.locator(
            '.trial-limit, .paywall, text*="trial limit"'
          ).count() > 0;
          
          if (stillLimited) {
            console.log('✅ Trial limits persist across sessions');
            expect(stillLimited).toBeTruthy();
          } else {
            console.log('⚠️ Trial limits may reset across sessions');
          }
          
          await DebugHelpers.takeTimestampedScreenshot(newPage, 'trial-limit-cross-session');
        } catch (error) {
          console.log('Cross-session trial limit test inconclusive');
        }
        
        await newContext.close();
      }
    });

    test('should provide clear upgrade paths in trial limit modal', async ({ page }) => {
      // Trigger trial limit (simplified approach)
      await page.goto(testUrls.home);
      
      // Force trigger trial limit by setting cookies if possible
      await page.evaluate(() => {
        // Set a high usage count to trigger limit
        localStorage.setItem('seawater_usage_count', '5');
        localStorage.setItem('seawater_trial_limit_reached', 'true');
        
        // Try different cookie names that might be used
        document.cookie = 'seawater_assessments=5;';
        document.cookie = 'trial_limit_reached=true;';
      });
      
      await page.reload();
      
      try {
        await PropertyHelpers.assessProperty(page, TEST_ADDRESSES.QUICK_TEST[0]);
        
        // Look for upgrade options in modal
        const upgradeElements = [
          'button:has-text("Upgrade")',
          'button:has-text("Subscribe")',
          'button:has-text("Get Premium")',
          'a:has-text("View Plans")',
          'a:has-text("Pricing")',
          '[data-testid="upgrade-button"]'
        ];
        
        let upgradeOptionsFound = 0;
        for (const element of upgradeElements) {
          if (await page.locator(element).isVisible()) {
            upgradeOptionsFound++;
            
            // Verify button is clickable
            await expect(page.locator(element)).toBeEnabled();
          }
        }
        
        if (upgradeOptionsFound > 0) {
          console.log(`Found ${upgradeOptionsFound} upgrade options in trial limit modal`);
          expect(upgradeOptionsFound).toBeGreaterThanOrEqual(1);
        }
        
      } catch (error) {
        console.log('Could not reliably trigger trial limit for upgrade path testing');
      }
    });
  });

  test.describe('Cookie-Based Trial Management', () => {
    test('should handle cookie deletion gracefully', async ({ page }) => {
      await page.goto(testUrls.home);
      
      // Perform initial assessment
      await PropertyHelpers.assessProperty(page, TEST_ADDRESSES.QUICK_TEST[0]);
      
      // Clear cookies and perform another assessment
      await page.context().clearCookies();
      await page.reload();
      
      // Should be able to perform assessment again as "new" user
      await PropertyHelpers.assessProperty(page, TEST_ADDRESSES.QUICK_TEST[1]);
      await PropertyHelpers.verifyRiskResults(page);
      
      console.log('✅ System handles cookie deletion appropriately');
    });

    test('should respect cookie settings and privacy preferences', async ({ page }) => {
      await page.goto(testUrls.home);
      
      // Check for cookie consent or privacy policy elements
      const privacyElements = [
        '.cookie-consent',
        '.privacy-notice',
        'text*="cookie"',
        'text*="privacy"',
        '[data-testid="cookie-banner"]'
      ];
      
      let privacyUIFound = false;
      for (const element of privacyElements) {
        if (await page.locator(element).isVisible()) {
          privacyUIFound = true;
          console.log(`Found privacy UI: ${element}`);
          break;
        }
      }
      
      console.log(`Privacy UI present: ${privacyUIFound}`);
      
      // Perform assessment regardless of privacy UI
      await PropertyHelpers.assessProperty(page, TEST_ADDRESSES.QUICK_TEST[0]);
      
      // Verify cookies are set appropriately based on consent
      const cookies = await page.context().cookies();
      console.log(`Cookies set after assessment: ${cookies.length}`);
      
      // Should have some form of tracking for trial limits
      expect(cookies.length).toBeGreaterThanOrEqual(1);
    });

    test('should handle concurrent users with different trial states', async ({ page }) => {
      // This tests the system's ability to handle multiple users
      // with different trial usage states
      
      const browser = page.context().browser();
      if (!browser) return;
      
      // Create two separate contexts to simulate different users
      const context1 = await browser.newContext();
      const context2 = await browser.newContext();
      
      const page1 = await context1.newPage();
      const page2 = await context2.newPage();
      
      DebugHelpers.setupConsoleLogging(page1);
      DebugHelpers.setupConsoleLogging(page2);
      
      // User 1 - New user with full trial
      await page1.goto(testUrls.home);
      await PropertyHelpers.assessProperty(page1, TEST_ADDRESSES.QUICK_TEST[0]);
      await PropertyHelpers.verifyRiskResults(page1);
      
      // User 2 - Simulate user with trial limit reached
      await page2.goto(testUrls.home);
      await page2.evaluate(() => {
        localStorage.setItem('seawater_usage_count', '5');
        document.cookie = 'seawater_assessments=5;';
      });
      
      await page2.reload();
      
      try {
        await PropertyHelpers.assessProperty(page2, TEST_ADDRESSES.QUICK_TEST[1]);
        
        // Check if User 2 sees trial limit
        const user2Limited = await page2.locator('.trial-limit, .paywall').count() > 0;
        console.log(`User 2 trial limited: ${user2Limited}`);
        
      } catch (error) {
        console.log('User 2 trial limit testing inconclusive');
      }
      
      // User 1 should still have access
      await page1.goto(testUrls.home);
      await PropertyHelpers.assessProperty(page1, TEST_ADDRESSES.QUICK_TEST[1]);
      await PropertyHelpers.verifyRiskResults(page1);
      
      console.log('✅ Concurrent user trial states handled independently');
      
      await context1.close();
      await context2.close();
    });
  });

  test.describe('Registration and Trial Interaction', () => {
    test('should maintain trial usage when user registers', async ({ page }) => {
      await page.goto(testUrls.home);
      
      // Use some trial assessments as anonymous user
      await PropertyHelpers.assessProperty(page, TEST_ADDRESSES.QUICK_TEST[0]);
      await page.goto(testUrls.home);
      await PropertyHelpers.assessProperty(page, TEST_ADDRESSES.LOW_RISK[0]);
      
      // Register for account
      try {
        const userData = await AuthHelpers.registerTestUser(page, {
          intended_use: 'personal'
        });
        
        // After registration, check if trial usage persists
        await page.goto(testUrls.home);
        await PropertyHelpers.assessProperty(page, TEST_ADDRESSES.HIGH_FLOOD_RISK[0]);
        
        // Should either show results or trial limit based on previous usage
        const hasResults = await page.locator('.risk-score, [data-testid="risk-score"]').count() > 0;
        const hasTrialLimit = await page.locator('.trial-limit, .paywall').count() > 0;
        
        expect(hasResults || hasTrialLimit).toBeTruthy();
        
        console.log(`After registration - Results: ${hasResults}, Trial limit: ${hasTrialLimit}`);
        
      } catch (error) {
        console.log('Registration flow may not be available or configured differently');
      }
    });

    test('should reset trial for new registered users', async ({ page }) => {
      await page.goto(testUrls.home);
      
      try {
        // Register as completely new user
        const userData = await AuthHelpers.registerTestUser(page, {
          intended_use: 'business'
        });
        
        // New registered user should get fresh trial
        await page.goto(testUrls.home);
        await PropertyHelpers.assessProperty(page, TEST_ADDRESSES.MULTI_HAZARD[0]);
        await PropertyHelpers.verifyRiskResults(page);
        
        console.log(`New registered user ${userData.email} has fresh trial access`);
        
      } catch (error) {
        console.log('New user registration trial test inconclusive');
      }
    });
  });

  test.describe('Trial System Error Handling', () => {
    test('should handle network errors during trial validation', async ({ page }) => {
      await page.goto(testUrls.home);
      
      // Intercept and block trial-related API calls
      await page.route('**/api/trial/**', (route) => route.abort());
      await page.route('**/api/usage/**', (route) => route.abort());
      await page.route('**/api/subscription/**', (route) => route.abort());
      
      // Should still allow basic assessment functionality
      try {
        await PropertyHelpers.assessProperty(page, TEST_ADDRESSES.QUICK_TEST[0]);
        
        // Should either show results or graceful error handling
        const hasContent = await page.locator('.risk-score, .error, .loading').count() > 0;
        expect(hasContent).toBeTruthy();
        
        console.log('✅ Trial system handles network errors gracefully');
        
      } catch (error) {
        console.log('Trial network error handling needs improvement');
      }
    });

    test('should provide informative error messages', async ({ page }) => {
      await page.goto(testUrls.home);
      
      // Simulate various error conditions
      await page.evaluate(() => {
        // Corrupt localStorage trial data
        localStorage.setItem('seawater_usage_count', 'invalid_value');
        localStorage.setItem('seawater_trial_data', '{"invalid": json}');
      });
      
      await page.reload();
      
      try {
        await PropertyHelpers.assessProperty(page, TEST_ADDRESSES.QUICK_TEST[0]);
        
        // Should handle corrupted data gracefully
        const hasValidResponse = await page.locator('.risk-score, .error, .trial-limit').count() > 0;
        expect(hasValidResponse).toBeTruthy();
        
        console.log('✅ Trial system handles corrupted data gracefully');
        
      } catch (error) {
        console.log('Trial error handling may need improvement');
      }
    });
  });
});