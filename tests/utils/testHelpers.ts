/**
 * Seawater Test Helper Functions
 * Following Tim-Combo patterns for test utilities
 */

import { Page, expect } from '@playwright/test';
import { SEAWATER_TEST_CREDENTIALS, TEST_TIMEOUTS, TEST_ADDRESSES } from './testCredentials';

/**
 * Authentication helpers
 */
export class AuthHelpers {
  /**
   * Login with test credentials
   */
  static async loginWithCredentials(
    page: Page, 
    userType: 'FREE_USER' | 'PREMIUM_USER' | 'PROFESSIONAL_USER' = 'FREE_USER'
  ): Promise<void> {
    const credentials = SEAWATER_TEST_CREDENTIALS[userType];
    
    await page.goto('/auth/login');
    await page.waitForSelector('form', { timeout: TEST_TIMEOUTS.MEDIUM });
    
    await page.fill('input[type="email"], input[name="email"]', credentials.email);
    await page.fill('input[type="password"], input[name="password"]', credentials.password);
    
    await Promise.all([
      page.waitForNavigation({ timeout: TEST_TIMEOUTS.LONG }),
      page.click('button[type="submit"], button:has-text("Sign In"), button:has-text("Login")')
    ]);
    
    // Verify successful login
    await expect(page).not.toHaveURL(/.*\/auth\/(login|signin)/);
  }

  /**
   * Register a new test user
   */
  static async registerTestUser(page: Page, customData?: Partial<any>): Promise<{
    email: string;
    username: string;
  }> {
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 8);
    const testEmail = `${SEAWATER_TEST_CREDENTIALS.NEW_USER_TEMPLATE.email_prefix}${timestamp}_${randomId}@test.com`;
    
    const userData = {
      email: testEmail,
      password: SEAWATER_TEST_CREDENTIALS.NEW_USER_TEMPLATE.password,
      first_name: SEAWATER_TEST_CREDENTIALS.NEW_USER_TEMPLATE.first_name,
      last_name: SEAWATER_TEST_CREDENTIALS.NEW_USER_TEMPLATE.last_name,
      company: SEAWATER_TEST_CREDENTIALS.NEW_USER_TEMPLATE.company,
      intended_use: SEAWATER_TEST_CREDENTIALS.NEW_USER_TEMPLATE.intended_use,
      ...customData
    };
    
    await page.goto('/auth/register');
    await page.waitForSelector('form', { timeout: TEST_TIMEOUTS.MEDIUM });
    
    // Fill registration form
    await page.fill('input[name="email"]', userData.email);
    await page.fill('input[name="password"]', userData.password);
    await page.fill('input[name="first_name"], input[name="firstName"]', userData.first_name);
    await page.fill('input[name="last_name"], input[name="lastName"]', userData.last_name);
    
    if (await page.locator('input[name="company"]').isVisible()) {
      await page.fill('input[name="company"]', userData.company || '');
    }
    
    // Submit registration
    await page.click('button[type="submit"], button:has-text("Register"), button:has-text("Sign Up")');
    
    // Wait for confirmation page or email verification prompt
    await page.waitForSelector(
      'text*="verification", text*="confirm", text*="check your email"',
      { timeout: TEST_TIMEOUTS.MEDIUM }
    );
    
    return {
      email: testEmail,
      username: `seawater_${timestamp}_${randomId}`
    };
  }

  /**
   * Logout current user
   */
  static async logout(page: Page): Promise<void> {
    // Try multiple logout patterns
    const logoutSelectors = [
      'button:has-text("Logout")',
      'button:has-text("Sign Out")',
      '[data-testid="logout-button"]',
      '.logout-button',
      'nav a:has-text("Logout")'
    ];
    
    for (const selector of logoutSelectors) {
      if (await page.locator(selector).isVisible()) {
        await page.click(selector);
        break;
      }
    }
    
    // Verify logout by checking for auth page redirect
    await page.waitForURL(/.*\/(auth|login|signin)/, { timeout: TEST_TIMEOUTS.MEDIUM });
  }

  /**
   * Check if user is authenticated
   */
  static async isAuthenticated(page: Page): Promise<boolean> {
    try {
      await page.goto('/');
      await page.waitForTimeout(2000);
      
      const currentUrl = page.url();
      return !currentUrl.includes('/auth') && !currentUrl.includes('/login') && !currentUrl.includes('/signin');
    } catch {
      return false;
    }
  }
}

/**
 * Property assessment helpers
 */
export class PropertyHelpers {
  /**
   * Perform a property risk assessment
   */
  static async assessProperty(page: Page, address: string): Promise<void> {
    // Navigate to assessment page or find search bar
    const searchSelectors = [
      'input[name="address"]',
      'input[placeholder*="address"]',
      'input[placeholder*="property"]',
      '[data-testid="address-search"]',
      '.address-search input'
    ];
    
    let searchInput = null;
    for (const selector of searchSelectors) {
      if (await page.locator(selector).isVisible()) {
        searchInput = page.locator(selector);
        break;
      }
    }
    
    if (!searchInput) {
      // Navigate to home page and try again
      await page.goto('/');
      await page.waitForTimeout(2000);
      
      for (const selector of searchSelectors) {
        if (await page.locator(selector).isVisible()) {
          searchInput = page.locator(selector);
          break;
        }
      }
    }
    
    if (!searchInput) {
      throw new Error('Could not find property search input');
    }
    
    // Enter address and submit
    await searchInput.fill(address);
    
    const submitSelectors = [
      'button:has-text("Assess")',
      'button:has-text("Search")',
      'button:has-text("Get Risk")',
      'button[type="submit"]',
      '[data-testid="search-submit"]'
    ];
    
    for (const selector of submitSelectors) {
      if (await page.locator(selector).isVisible()) {
        await page.click(selector);
        break;
      }
    }
    
    // Wait for results to load
    await page.waitForSelector(
      '.risk-score, .assessment-results, [data-testid="risk-results"]',
      { timeout: TEST_TIMEOUTS.API_RESPONSE }
    );
  }

  /**
   * Verify risk assessment results are displayed
   */
  static async verifyRiskResults(page: Page): Promise<void> {
    // Check for risk score display
    await expect(page.locator('.risk-score, [data-testid="risk-score"]')).toBeVisible();
    
    // Check for property information
    await expect(page.locator('.property-info, [data-testid="property-info"]')).toBeVisible();
    
    // Check for hazard information
    await expect(page.locator('.hazards, .risk-factors, [data-testid="hazards"]')).toBeVisible();
  }

  /**
   * Compare two properties
   */
  static async compareProperties(page: Page, address1: string, address2: string): Promise<void> {
    await page.goto('/compare');
    
    // Fill first address
    await page.fill('input[name="address1"], .address-input:first-of-type input', address1);
    
    // Fill second address  
    await page.fill('input[name="address2"], .address-input:nth-of-type(2) input', address2);
    
    // Submit comparison
    await page.click('button:has-text("Compare"), button[type="submit"]');
    
    // Wait for comparison results
    await page.waitForSelector(
      '.comparison-results, [data-testid="comparison-results"]',
      { timeout: TEST_TIMEOUTS.API_RESPONSE }
    );
  }
}

/**
 * Subscription and paywall helpers
 */
export class SubscriptionHelpers {
  /**
   * Trigger free tier limit
   */
  static async triggerFreeTierLimit(page: Page): Promise<void> {
    // Perform assessments up to the free tier limit
    for (let i = 0; i < 4; i++) { // One more than the limit to trigger paywall
      const address = TEST_ADDRESSES.HIGH_FLOOD_RISK[i % TEST_ADDRESSES.HIGH_FLOOD_RISK.length];
      await PropertyHelpers.assessProperty(page, address);
      await page.waitForTimeout(1000); // Brief pause between assessments
    }
  }

  /**
   * Verify paywall is displayed
   */
  static async verifyPaywallDisplay(page: Page): Promise<void> {
    await expect(page.locator(
      '.paywall, .upgrade-prompt, [data-testid="paywall"]'
    )).toBeVisible();
    
    await expect(page.locator('text*="upgrade", text*="premium"')).toBeVisible();
  }

  /**
   * Check subscription tier display
   */
  static async verifySubscriptionTier(page: Page, expectedTier: string): Promise<void> {
    // Look for subscription info in dashboard or profile
    const tierSelectors = [
      '.subscription-tier',
      '[data-testid="subscription-tier"]',
      '.user-tier',
      '.plan-name'
    ];
    
    let found = false;
    for (const selector of tierSelectors) {
      if (await page.locator(selector).isVisible()) {
        await expect(page.locator(selector)).toContainText(expectedTier, { ignoreCase: true });
        found = true;
        break;
      }
    }
    
    if (!found) {
      console.warn(`Could not verify subscription tier display for: ${expectedTier}`);
    }
  }
}

/**
 * Mobile responsive helpers
 */
export class ResponsiveHelpers {
  /**
   * Test mobile navigation
   */
  static async testMobileNavigation(page: Page): Promise<void> {
    // Look for mobile menu button
    const menuButton = page.locator('.mobile-menu-button, .hamburger, [data-testid="mobile-menu"]');
    
    if (await menuButton.isVisible()) {
      await menuButton.click();
      
      // Verify menu opens
      await expect(page.locator('.mobile-menu, .nav-menu, [data-testid="navigation-menu"]')).toBeVisible();
      
      // Test menu close
      await menuButton.click();
      await expect(page.locator('.mobile-menu, .nav-menu, [data-testid="navigation-menu"]')).not.toBeVisible();
    }
  }

  /**
   * Verify responsive design elements
   */
  static async verifyResponsiveElements(page: Page): Promise<void> {
    // Check that main content is visible
    await expect(page.locator('main, .main-content, [role="main"]')).toBeVisible();
    
    // Check that text is readable (not too small)
    const bodyText = page.locator('body');
    const fontSize = await bodyText.evaluate(el => window.getComputedStyle(el).fontSize);
    const fontSizeNum = parseInt(fontSize);
    expect(fontSizeNum).toBeGreaterThanOrEqual(14); // Minimum readable font size
    
    // Check for horizontal scroll (should not exist)
    const hasHorizontalScroll = await page.evaluate(() => document.body.scrollWidth > window.innerWidth);
    expect(hasHorizontalScroll).toBeFalsy();
  }
}

/**
 * API testing helpers
 */
export class APIHelpers {
  /**
   * Intercept and verify API calls
   */
  static async interceptAPICall(page: Page, endpoint: string): Promise<any> {
    return new Promise((resolve) => {
      page.route(`**/${endpoint}*`, (route, request) => {
        resolve({
          url: request.url(),
          method: request.method(),
          headers: request.headers(),
          postData: request.postData()
        });
        route.continue();
      });
    });
  }

  /**
   * Mock API response
   */
  static async mockAPIResponse(page: Page, endpoint: string, response: any): Promise<void> {
    await page.route(`**/${endpoint}*`, (route) => {
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify(response)
      });
    });
  }

  /**
   * Wait for API call to complete
   */
  static async waitForAPICall(page: Page, endpoint: string, timeout = TEST_TIMEOUTS.API_RESPONSE): Promise<void> {
    await page.waitForResponse(
      response => response.url().includes(endpoint) && response.status() < 400,
      { timeout }
    );
  }
}

/**
 * Screenshot and debugging helpers
 */
export class DebugHelpers {
  /**
   * Take screenshot with timestamp
   */
  static async takeTimestampedScreenshot(page: Page, name: string): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    await page.screenshot({ 
      path: `test-results/screenshots/${name}-${timestamp}.png`,
      fullPage: true 
    });
  }

  /**
   * Log page console messages
   */
  static setupConsoleLogging(page: Page): void {
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.error(`Browser Error: ${msg.text()}`);
      } else if (msg.type() === 'warning') {
        console.warn(`Browser Warning: ${msg.text()}`);
      }
    });
    
    page.on('pageerror', (error) => {
      console.error(`Page Error: ${error.message}`);
    });
  }

  /**
   * Wait for page to be fully loaded
   */
  static async waitForPageLoad(page: Page): Promise<void> {
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000); // Additional wait for any async operations
  }
}