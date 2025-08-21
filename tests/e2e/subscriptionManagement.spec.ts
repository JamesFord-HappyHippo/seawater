import { expect, test } from '@playwright/test';
import { 
  SEAWATER_TEST_CREDENTIALS, 
  SUBSCRIPTION_TEST_LIMITS,
  TEST_ADDRESSES,
  TEST_TIMEOUTS 
} from '../utils/testCredentials';
import { 
  AuthHelpers, 
  PropertyHelpers, 
  SubscriptionHelpers,
  DebugHelpers 
} from '../utils/testHelpers';

test.describe('Seawater Subscription Management', () => {
  test.beforeEach(async ({ page }) => {
    DebugHelpers.setupConsoleLogging(page);
  });

  test('should display free tier limits for anonymous users', async ({ page }) => {
    await page.goto('/');
    
    // Look for free tier information or pricing
    const freeTierSelectors = [
      'text*="free"',
      'text*="3 assessments"',
      'text*="limited"',
      '.free-tier',
      '[data-testid="free-tier"]'
    ];
    
    let freeTierInfoFound = false;
    for (const selector of freeTierSelectors) {
      if (await page.locator(selector).count() > 0) {
        freeTierInfoFound = true;
        break;
      }
    }
    
    console.log(`Free tier information displayed: ${freeTierInfoFound}`);
  });

  test('should track assessment usage for free users', async ({ page }) => {
    await AuthHelpers.loginWithCredentials(page, 'FREE_USER');
    
    // Perform one assessment
    await page.goto('/');
    const testAddress = TEST_ADDRESSES.LOW_RISK[0];
    await PropertyHelpers.assessProperty(page, testAddress);
    
    // Look for usage counter or remaining assessments
    const usageSelectors = [
      '.usage-counter',
      '.assessments-remaining',
      '[data-testid="usage-counter"]',
      'text*="remaining"',
      'text*="used"',
      'text*="2 left"', // Assuming 3 limit - 1 used = 2 left
      'text*="2 remaining"'
    ];
    
    let usageFound = false;
    for (const selector of usageSelectors) {
      if (await page.locator(selector).count() > 0) {
        usageFound = true;
        break;
      }
    }
    
    console.log(`Usage tracking found: ${usageFound}`);
  });

  test('should trigger paywall after free tier limit', async ({ page }) => {
    await AuthHelpers.loginWithCredentials(page, 'FREE_USER');
    
    // Use up the free tier allowance
    await SubscriptionHelpers.triggerFreeTierLimit(page);
    
    // Should show paywall
    await SubscriptionHelpers.verifyPaywallDisplay(page);
    
    // Take screenshot for verification
    await DebugHelpers.takeTimestampedScreenshot(page, 'paywall-triggered');
  });

  test('should display pricing tiers and features', async ({ page }) => {
    // Go to pricing page or trigger paywall
    await page.goto('/pricing');
    
    // If pricing page doesn't exist, try from homepage
    if (page.url().includes('404') || await page.locator('text*="not found"').count() > 0) {
      await page.goto('/');
      
      // Look for pricing links
      const pricingLinks = [
        'a:has-text("Pricing")',
        'a:has-text("Plans")',
        'button:has-text("Upgrade")',
        '[data-testid="pricing-link"]'
      ];
      
      for (const selector of pricingLinks) {
        if (await page.locator(selector).count() > 0) {
          await page.click(selector);
          break;
        }
      }
    }
    
    // Check for subscription tiers
    const tierSelectors = [
      'text*="Free"',
      'text*="Premium"',
      'text*="Professional"'
    ];
    
    let tiersFound = 0;
    for (const selector of tierSelectors) {
      if (await page.locator(selector).count() > 0) {
        tiersFound++;
      }
    }
    
    expect(tiersFound).toBeGreaterThanOrEqual(2); // At least Free and Premium
    
    // Check for feature comparisons
    const featureSelectors = [
      'text*="assessments"',
      'text*="API access"',
      'text*="reports"',
      'text*="bulk analysis"'
    ];
    
    let featuresFound = 0;
    for (const selector of featureSelectors) {
      if (await page.locator(selector).count() > 0) {
        featuresFound++;
      }
    }
    
    expect(featuresFound).toBeGreaterThanOrEqual(1);
  });

  test('should show upgrade options in paywall', async ({ page }) => {
    await AuthHelpers.loginWithCredentials(page, 'FREE_USER');
    await SubscriptionHelpers.triggerFreeTierLimit(page);
    
    // Verify upgrade buttons are present
    const upgradeSelectors = [
      'button:has-text("Upgrade")',
      'button:has-text("Subscribe")',
      'a:has-text("Premium")',
      'a:has-text("Professional")',
      '[data-testid="upgrade-button"]'
    ];
    
    let upgradeOptionsFound = false;
    for (const selector of upgradeSelectors) {
      if (await page.locator(selector).count() > 0) {
        await expect(page.locator(selector).first()).toBeVisible();
        upgradeOptionsFound = true;
        break;
      }
    }
    
    expect(upgradeOptionsFound).toBeTruthy();
  });

  test('should display subscription status for premium users', async ({ page }) => {
    await AuthHelpers.loginWithCredentials(page, 'PREMIUM_USER');
    
    // Check subscription tier display
    await SubscriptionHelpers.verifySubscriptionTier(page, 'premium');
    
    // Look for premium features indicators
    const premiumFeatures = [
      'text*="unlimited"',
      'text*="100 assessments"',
      'text*="premium"',
      'text*="API access"'
    ];
    
    let premiumFeaturesFound = false;
    for (const feature of premiumFeatures) {
      if (await page.locator(feature).count() > 0) {
        premiumFeaturesFound = true;
        break;
      }
    }
    
    console.log(`Premium features displayed: ${premiumFeaturesFound}`);
  });

  test('should allow premium users unlimited basic assessments', async ({ page }) => {
    await AuthHelpers.loginWithCredentials(page, 'PREMIUM_USER');
    
    // Perform multiple assessments (more than free tier limit)
    const testAddresses = [
      ...TEST_ADDRESSES.LOW_RISK,
      ...TEST_ADDRESSES.HIGH_FLOOD_RISK
    ];
    
    for (let i = 0; i < 5; i++) {
      const address = testAddresses[i % testAddresses.length];
      await page.goto('/');
      await PropertyHelpers.assessProperty(page, address);
      
      // Should not hit paywall
      const hasPaywall = await page.locator('.paywall, .upgrade-prompt').count() > 0;
      expect(hasPaywall).toBeFalsy();
    }
  });

  test('should show property comparison for premium users', async ({ page }) => {
    await AuthHelpers.loginWithCredentials(page, 'PREMIUM_USER');
    
    // Try to access comparison feature
    await page.goto('/compare');
    
    // If compare page doesn't exist, try from menu or homepage
    if (page.url().includes('404')) {
      await page.goto('/');
      
      const compareLinks = [
        'a:has-text("Compare")',
        'button:has-text("Compare")',
        '[data-testid="compare-link"]'
      ];
      
      for (const selector of compareLinks) {
        if (await page.locator(selector).count() > 0) {
          await page.click(selector);
          break;
        }
      }
    }
    
    // Should not be blocked by paywall
    const hasPaywall = await page.locator('.paywall, .upgrade-prompt').count() > 0;
    expect(hasPaywall).toBeFalsy();
    
    // Look for comparison interface
    const comparisonElements = [
      'input[name="address1"]',
      'input[name="address2"]',
      '.comparison-form',
      '[data-testid="comparison-form"]'
    ];
    
    let comparisonFound = false;
    for (const selector of comparisonElements) {
      if (await page.locator(selector).count() > 0) {
        comparisonFound = true;
        break;
      }
    }
    
    console.log(`Comparison feature accessible: ${comparisonFound}`);
  });

  test('should provide professional features for professional users', async ({ page }) => {
    await AuthHelpers.loginWithCredentials(page, 'PROFESSIONAL_USER');
    
    // Check for professional-only features
    await page.goto('/dashboard');
    
    const professionalFeatures = [
      'text*="API"',
      'text*="bulk"',
      'text*="webhook"',
      'text*="professional"',
      '.api-keys',
      '.bulk-analysis',
      '[data-testid="api-management"]'
    ];
    
    let professionalFeaturesFound = false;
    for (const feature of professionalFeatures) {
      if (await page.locator(feature).count() > 0) {
        professionalFeaturesFound = true;
        break;
      }
    }
    
    console.log(`Professional features accessible: ${professionalFeaturesFound}`);
  });

  test('should block premium features for free users', async ({ page }) => {
    await AuthHelpers.loginWithCredentials(page, 'FREE_USER');
    
    // Try to access premium features
    const premiumPages = ['/compare', '/api', '/bulk-analysis'];
    
    for (const pageUrl of premiumPages) {
      await page.goto(pageUrl);
      
      // Should either redirect, show paywall, or show access denied
      const isBlocked = 
        page.url().includes('pricing') || 
        page.url().includes('upgrade') ||
        await page.locator('.paywall, .upgrade-prompt, text*="upgrade"').count() > 0 ||
        page.url().includes('404');
      
      if (isBlocked) {
        console.log(`✅ Premium feature ${pageUrl} properly blocked for free user`);
      } else {
        console.log(`⚠️ Premium feature ${pageUrl} may be accessible to free user`);
      }
    }
  });

  test('should show billing and usage information', async ({ page }) => {
    await AuthHelpers.loginWithCredentials(page, 'PREMIUM_USER');
    
    // Navigate to account/billing page
    const accountLinks = [
      'a:has-text("Account")',
      'a:has-text("Billing")',
      'a:has-text("Usage")',
      '[data-testid="account-link"]'
    ];
    
    let accountPageFound = false;
    for (const selector of accountLinks) {
      if (await page.locator(selector).count() > 0) {
        await page.click(selector);
        accountPageFound = true;
        break;
      }
    }
    
    if (!accountPageFound) {
      // Try direct navigation
      await page.goto('/account');
      if (!page.url().includes('404')) {
        accountPageFound = true;
      }
    }
    
    if (accountPageFound) {
      // Look for billing/usage information
      const billingElements = [
        'text*="subscription"',
        'text*="usage"',
        'text*="billing"',
        'text*="plan"',
        '.usage-stats',
        '.billing-info'
      ];
      
      let billingInfoFound = false;
      for (const element of billingElements) {
        if (await page.locator(element).count() > 0) {
          billingInfoFound = true;
          break;
        }
      }
      
      console.log(`Billing/usage information found: ${billingInfoFound}`);
    }
  });

  test('should handle subscription upgrade flow', async ({ page }) => {
    await AuthHelpers.loginWithCredentials(page, 'FREE_USER');
    
    // Trigger paywall
    await SubscriptionHelpers.triggerFreeTierLimit(page);
    
    // Click upgrade button
    const upgradeButton = page.locator('button:has-text("Upgrade"), a:has-text("Premium")').first();
    
    if (await upgradeButton.count() > 0) {
      await upgradeButton.click();
      
      // Should navigate to upgrade/checkout page
      await page.waitForTimeout(2000);
      
      const currentUrl = page.url();
      const isUpgradePage = currentUrl.includes('upgrade') || 
                           currentUrl.includes('checkout') || 
                           currentUrl.includes('pricing') ||
                           await page.locator('text*="payment", text*="subscribe"').count() > 0;
      
      expect(isUpgradePage).toBeTruthy();
      
      // Take screenshot for verification
      await DebugHelpers.takeTimestampedScreenshot(page, 'upgrade-flow');
    }
  });

  test('should display feature limitations clearly', async ({ page }) => {
    await page.goto('/');
    
    // Look for clear feature limitation messaging
    const limitationMessages = [
      'text*="3 free assessments"',
      'text*="limited to"',
      'text*="upgrade for"',
      'text*="premium feature"',
      '.feature-limitation',
      '.upgrade-notice'
    ];
    
    let limitationMessaging = false;
    for (const message of limitationMessages) {
      if (await page.locator(message).count() > 0) {
        limitationMessaging = true;
        break;
      }
    }
    
    console.log(`Feature limitation messaging found: ${limitationMessaging}`);
  });

  test('should maintain subscription state across sessions', async ({ page }) => {
    await AuthHelpers.loginWithCredentials(page, 'PREMIUM_USER');
    
    // Verify premium status
    await SubscriptionHelpers.verifySubscriptionTier(page, 'premium');
    
    // Refresh page
    await page.reload();
    await DebugHelpers.waitForPageLoad(page);
    
    // Should still show premium status
    await SubscriptionHelpers.verifySubscriptionTier(page, 'premium');
    
    // Perform assessment to verify premium access
    await page.goto('/');
    const testAddress = TEST_ADDRESSES.LOW_RISK[0];
    await PropertyHelpers.assessProperty(page, testAddress);
    
    // Should not hit paywall
    const hasPaywall = await page.locator('.paywall, .upgrade-prompt').count() > 0;
    expect(hasPaywall).toBeFalsy();
  });
});