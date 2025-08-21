import { Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Page Object for Trial System functionality
 */
export class TrialSystemPage extends BasePage {
  // Selectors
  private readonly selectors = {
    // Trial limit modal
    trialLimitModal: [
      '.trial-limit',
      '.paywall',
      '[data-testid="trial-limit-modal"]',
      '.upgrade-modal',
      '.subscription-modal'
    ],

    // Trial messaging
    trialMessages: [
      'text*="trial limit"',
      'text*="upgrade to continue"',
      'text*="free assessments"',
      'text*="remaining"',
      'text*="used"'
    ],

    // Usage tracking
    usageIndicators: [
      'text*="assessment"',
      'text*="remaining"',
      'text*="used"',
      '.usage-counter',
      '[data-testid="usage-tracker"]',
      '.trial-usage'
    ],

    // Upgrade elements
    upgradeElements: [
      'button:has-text("Upgrade")',
      'button:has-text("Subscribe")',
      'button:has-text("Get Premium")',
      'a:has-text("View Plans")',
      'a:has-text("Pricing")',
      '[data-testid="upgrade-button"]'
    ],

    // Modal close elements
    modalClose: [
      'button:has-text("Close")',
      'button:has-text("×")',
      '.modal-close',
      '[data-testid="modal-close"]',
      'button[aria-label="Close"]'
    ],

    // Cookie consent
    privacyElements: [
      '.cookie-consent',
      '.privacy-notice',
      'text*="cookie"',
      'text*="privacy"',
      '[data-testid="cookie-banner"]'
    ]
  };

  constructor(page: Page) {
    super(page);
  }

  /**
   * Clear all trial-related storage
   */
  async clearTrialStorage(): Promise<void> {
    await this.page.context().clearCookies();
    await this.page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  }

  /**
   * Set trial usage count for testing
   */
  async setTrialUsageCount(count: number): Promise<void> {
    await this.page.evaluate((usageCount) => {
      localStorage.setItem('seawater_usage_count', usageCount.toString());
      localStorage.setItem('seawater_assessments', usageCount.toString());
      
      // Set cookies as well
      document.cookie = `seawater_assessments=${usageCount};`;
      document.cookie = `seawater_usage_count=${usageCount};`;
      
      if (usageCount >= 3) {
        localStorage.setItem('seawater_trial_limit_reached', 'true');
        document.cookie = 'trial_limit_reached=true;';
      }
    }, count);
  }

  /**
   * Check if trial limit modal is displayed
   */
  async isTrialLimitModalVisible(): Promise<boolean> {
    for (const selector of this.selectors.trialLimitModal) {
      if (await this.page.locator(selector).isVisible()) {
        return true;
      }
    }
    return false;
  }

  /**
   * Wait for trial limit modal to appear
   */
  async waitForTrialLimitModal(timeout?: number): Promise<boolean> {
    try {
      await this.page.waitForSelector(
        '.trial-limit, .paywall, [data-testid="trial-limit-modal"], text*="trial limit"',
        { timeout: timeout || this.envConfig.timeout.medium }
      );
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Verify trial limit modal content
   */
  async verifyTrialLimitModalContent(): Promise<{
    hasUpgradeMessage: boolean;
    hasUpgradeButton: boolean;
    upgradeOptionsCount: number;
  }> {
    const hasUpgradeMessage = await this.page.locator(
      'text*="upgrade", text*="premium", text*="continue"'
    ).count() > 0;

    let upgradeOptionsCount = 0;
    for (const element of this.selectors.upgradeElements) {
      if (await this.page.locator(element).isVisible()) {
        upgradeOptionsCount++;
        
        // Verify button is clickable
        await expect(this.page.locator(element)).toBeEnabled();
      }
    }

    return {
      hasUpgradeMessage,
      hasUpgradeButton: upgradeOptionsCount > 0,
      upgradeOptionsCount
    };
  }

  /**
   * Close trial limit modal
   */
  async closeTrialLimitModal(): Promise<boolean> {
    for (const closeSelector of this.selectors.modalClose) {
      if (await this.page.locator(closeSelector).isVisible()) {
        await this.clickElement(closeSelector);
        return true;
      }
    }
    
    // Try Escape key
    await this.page.keyboard.press('Escape');
    await this.page.waitForTimeout(500);
    
    return !(await this.isTrialLimitModalVisible());
  }

  /**
   * Check for usage tracking indicators
   */
  async checkUsageTracking(): Promise<{
    hasUsageIndicator: boolean;
    usageText: string[];
  }> {
    let hasUsageIndicator = false;
    const usageTexts = [];

    for (const indicator of this.selectors.usageIndicators) {
      if (await this.elementExists(indicator)) {
        hasUsageIndicator = true;
        const text = await this.getElementText(indicator);
        if (text) {
          usageTexts.push(text);
        }
      }
    }

    return { hasUsageIndicator, usageText: usageTexts };
  }

  /**
   * Simulate multiple assessments to trigger trial limit
   */
  async performAssessmentsUntilLimit(addresses: string[], maxAssessments: number = 5): Promise<{
    assessmentsCompleted: number;
    trialLimitTriggered: boolean;
  }> {
    let assessmentsCompleted = 0;
    let trialLimitTriggered = false;

    for (let i = 0; i < maxAssessments && !trialLimitTriggered; i++) {
      try {
        const address = addresses[i % addresses.length];
        
        // Navigate to home and perform assessment
        await this.goto(this.envConfig.baseURL);
        
        const addressInput = await this.waitForAnySelector([
          'input[name="address"]',
          'input[placeholder*="address"]'
        ]);
        
        await this.fillInput(addressInput, address);
        
        const submitButton = await this.waitForAnySelector([
          'button:has-text("Assess")',
          'button[type="submit"]'
        ]);
        
        await this.clickElement(submitButton);
        
        // Wait for either results or trial limit modal
        await this.page.waitForTimeout(3000);
        
        if (await this.isTrialLimitModalVisible()) {
          trialLimitTriggered = true;
          console.log(`Trial limit triggered after ${assessmentsCompleted + 1} assessments`);
        } else {
          // Check if results loaded successfully
          const hasResults = await this.elementExists('.risk-score, .assessment-results');
          if (hasResults) {
            assessmentsCompleted++;
            console.log(`Assessment ${assessmentsCompleted} completed successfully`);
          }
        }
        
        await this.page.waitForTimeout(1000);
        
      } catch (error) {
        console.log(`Assessment ${i + 1} failed: ${error}`);
        break;
      }
    }

    return { assessmentsCompleted, trialLimitTriggered };
  }

  /**
   * Check trial persistence across browser sessions
   */
  async checkTrialPersistence(): Promise<{
    cookiesSet: any[];
    localStorageItems: any;
    sessionStorageItems: any;
  }> {
    // Get cookies
    const cookies = await this.page.context().cookies();
    const trialCookies = cookies.filter(cookie => 
      cookie.name.includes('trial') || 
      cookie.name.includes('usage') || 
      cookie.name.includes('assessment') ||
      cookie.name.includes('seawater')
    );

    // Get localStorage
    const localStorageItems = await this.page.evaluate(() => {
      const items: any = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes('seawater') || key.includes('trial') || key.includes('usage'))) {
          items[key] = localStorage.getItem(key);
        }
      }
      return items;
    });

    // Get sessionStorage
    const sessionStorageItems = await this.page.evaluate(() => {
      const items: any = {};
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && (key.includes('seawater') || key.includes('trial') || key.includes('usage'))) {
          items[key] = sessionStorage.getItem(key);
        }
      }
      return items;
    });

    return {
      cookiesSet: trialCookies,
      localStorageItems,
      sessionStorageItems
    };
  }

  /**
   * Verify cookie security settings
   */
  async verifyCookieSecurity(): Promise<{
    secureCount: number;
    httpOnlyCount: number;
    sameSiteCount: number;
    totalTrialCookies: number;
  }> {
    const cookies = await this.page.context().cookies();
    const trialCookies = cookies.filter(cookie => 
      cookie.name.includes('trial') || 
      cookie.name.includes('usage') || 
      cookie.name.includes('seawater')
    );

    const secureCount = trialCookies.filter(cookie => cookie.secure).length;
    const httpOnlyCount = trialCookies.filter(cookie => cookie.httpOnly).length;
    const sameSiteCount = trialCookies.filter(cookie => 
      ['Strict', 'Lax', 'None'].includes(cookie.sameSite || '')
    ).length;

    return {
      secureCount,
      httpOnlyCount,
      sameSiteCount,
      totalTrialCookies: trialCookies.length
    };
  }

  /**
   * Test trial reset for new users
   */
  async testTrialReset(): Promise<boolean> {
    // Clear all storage
    await this.clearTrialStorage();
    await this.page.reload();
    
    // Perform assessment
    await this.goto(this.envConfig.baseURL);
    
    try {
      const addressInput = await this.waitForAnySelector([
        'input[name="address"]',
        'input[placeholder*="address"]'
      ]);
      
      await this.fillInput(addressInput, '123 Test St, Denver, CO');
      
      const submitButton = await this.waitForAnySelector([
        'button:has-text("Assess")',
        'button[type="submit"]'
      ]);
      
      await this.clickElement(submitButton);
      
      // Should get results, not trial limit
      await this.page.waitForTimeout(5000);
      
      const hasResults = await this.elementExists('.risk-score, .assessment-results');
      const hasTrialLimit = await this.isTrialLimitModalVisible();
      
      return hasResults && !hasTrialLimit;
      
    } catch (error) {
      console.log('Trial reset test failed:', error);
      return false;
    }
  }

  /**
   * Handle privacy consent if present
   */
  async handlePrivacyConsent(): Promise<boolean> {
    for (const element of this.selectors.privacyElements) {
      if (await this.page.locator(element).isVisible()) {
        // Look for accept button
        const acceptButtons = [
          'button:has-text("Accept")',
          'button:has-text("OK")',
          'button:has-text("Agree")',
          '.accept-cookies'
        ];
        
        for (const acceptBtn of acceptButtons) {
          if (await this.page.locator(acceptBtn).isVisible()) {
            await this.clickElement(acceptBtn);
            return true;
          }
        }
      }
    }
    return false;
  }

  /**
   * Test network error handling during trial validation
   */
  async testNetworkErrorHandling(): Promise<boolean> {
    // Block trial-related API calls
    await this.page.route('**/api/trial/**', (route) => route.abort());
    await this.page.route('**/api/usage/**', (route) => route.abort());
    await this.page.route('**/api/subscription/**', (route) => route.abort());
    
    try {
      const addressInput = await this.waitForAnySelector([
        'input[name="address"]',
        'input[placeholder*="address"]'
      ]);
      
      await this.fillInput(addressInput, '123 Test St, Denver, CO');
      
      const submitButton = await this.waitForAnySelector([
        'button:has-text("Assess")',
        'button[type="submit"]'
      ]);
      
      await this.clickElement(submitButton);
      
      await this.page.waitForTimeout(5000);
      
      // Should still have some content (graceful error handling)
      const hasContent = await this.elementExists('.risk-score, .error, .loading');
      return hasContent;
      
    } catch (error) {
      console.log('Network error handling test failed:', error);
      return false;
    }
  }

  /**
   * Corrupt trial data and test handling
   */
  async testCorruptedDataHandling(): Promise<boolean> {
    await this.page.evaluate(() => {
      // Corrupt localStorage trial data
      localStorage.setItem('seawater_usage_count', 'invalid_value');
      localStorage.setItem('seawater_trial_data', '{"invalid": json}');
    });

    await this.page.reload();

    try {
      const addressInput = await this.waitForAnySelector([
        'input[name="address"]',
        'input[placeholder*="address"]'
      ]);
      
      await this.fillInput(addressInput, '123 Test St, Denver, CO');
      
      const submitButton = await this.waitForAnySelector([
        'button:has-text("Assess")',
        'button[type="submit"]'
      ]);
      
      await this.clickElement(submitButton);
      
      await this.page.waitForTimeout(5000);
      
      // Should handle corrupted data gracefully
      const hasValidResponse = await this.elementExists('.risk-score, .error, .trial-limit');
      return hasValidResponse;
      
    } catch (error) {
      console.log('Corrupted data handling test failed:', error);
      return false;
    }
  }
}