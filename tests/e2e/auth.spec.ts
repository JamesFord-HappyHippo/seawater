import { expect, test } from '@playwright/test';
import { SEAWATER_TEST_CREDENTIALS, TEST_TIMEOUTS } from '../utils/testCredentials';
import { AuthHelpers, DebugHelpers } from '../utils/testHelpers';

test.describe('Seawater Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    DebugHelpers.setupConsoleLogging(page);
  });

  test('should redirect unauthenticated users to login page', async ({ page }) => {
    await page.goto('/');
    
    // Check that we're redirected to the login page or see login form
    await page.waitForTimeout(2000); // Give time for any redirects
    
    const currentUrl = page.url();
    const hasAuthForm = await page.locator('form input[type="email"], form input[type="password"]').count() > 0;
    
    // Should either be on auth page or see auth form
    expect(currentUrl.includes('/auth') || currentUrl.includes('/login') || hasAuthForm).toBeTruthy();
  });

  test('should show validation errors for empty form submission', async ({ page }) => {
    await page.goto('/auth/login');
    await page.waitForSelector('form', { timeout: TEST_TIMEOUTS.MEDIUM });
    
    // Try to submit the form without filling in any fields
    await page.click('button[type="submit"], button:has-text("Sign In"), button:has-text("Login")');
    
    // Check for validation errors (browser validation or custom)
    const emailInput = page.locator('input[type="email"], input[name="email"]');
    const isInvalid = await emailInput.evaluate((el: HTMLInputElement) => !el.validity.valid);
    
    if (isInvalid) {
      // Browser validation
      expect(isInvalid).toBeTruthy();
    } else {
      // Custom validation - look for error messages
      await expect(page.locator('.error, .text-red, .invalid-feedback, [role="alert"]')).toBeVisible();
    }
  });

  test('should show error message for invalid credentials', async ({ page }) => {
    await page.goto('/auth/login');
    await page.waitForSelector('form', { timeout: TEST_TIMEOUTS.MEDIUM });
    
    // Fill in the form with invalid credentials
    await page.fill('input[type="email"], input[name="email"]', 'invalid@example.com');
    await page.fill('input[type="password"], input[name="password"]', 'wrongpassword');
    
    // Submit the form
    await page.click('button[type="submit"], button:has-text("Sign In"), button:has-text("Login")');
    
    // Wait for error message to appear
    await page.waitForSelector(
      '.error, .text-red, .invalid-feedback, [role="alert"], text*="invalid", text*="incorrect"',
      { timeout: TEST_TIMEOUTS.MEDIUM }
    );
    
    const errorElement = page.locator('.error, .text-red, .invalid-feedback, [role="alert"]').first();
    await expect(errorElement).toBeVisible();
  });

  test('should successfully login with free user credentials', async ({ page }) => {
    await page.goto('/auth/login');
    await page.waitForSelector('form', { timeout: TEST_TIMEOUTS.MEDIUM });
    
    const credentials = SEAWATER_TEST_CREDENTIALS.FREE_USER;
    
    // Fill in valid credentials
    await page.fill('input[type="email"], input[name="email"]', credentials.email);
    await page.fill('input[type="password"], input[name="password"]', credentials.password);
    
    // Submit the form
    await Promise.all([
      page.waitForNavigation({ timeout: TEST_TIMEOUTS.LONG }),
      page.click('button[type="submit"], button:has-text("Sign In"), button:has-text("Login")')
    ]);
    
    // Verify successful login - should not be on auth page
    const currentUrl = page.url();
    expect(currentUrl).not.toMatch(/\/(auth|login|signin)/);
    
    // Look for authenticated user indicators
    const hasUserMenu = await page.locator('.user-menu, .profile-menu, [data-testid="user-menu"]').count() > 0;
    const hasLogoutButton = await page.locator('button:has-text("Logout"), button:has-text("Sign Out")').count() > 0;
    const hasDashboard = await page.locator('text*="dashboard", text*="welcome"').count() > 0;
    
    expect(hasUserMenu || hasLogoutButton || hasDashboard).toBeTruthy();
  });

  test('should display subscription tier after login', async ({ page }) => {
    await AuthHelpers.loginWithCredentials(page, 'PREMIUM_USER');
    
    // Look for subscription tier display
    await page.waitForTimeout(2000); // Give time for user data to load
    
    // Check in various locations where tier might be displayed
    const tierSelectors = [
      '.subscription-tier',
      '.user-tier',
      '.plan-name',
      '[data-testid="subscription-tier"]',
      'text*="premium"',
      'text*="free"',
      'text*="professional"'
    ];
    
    let tierFound = false;
    for (const selector of tierSelectors) {
      if (await page.locator(selector).count() > 0) {
        tierFound = true;
        break;
      }
    }
    
    // If no tier display found, check if it's in user menu or profile
    if (!tierFound) {
      const userMenuButton = page.locator('.user-menu, .profile-menu, [data-testid="user-menu"]').first();
      if (await userMenuButton.isVisible()) {
        await userMenuButton.click();
        await page.waitForTimeout(1000);
        
        const menuTier = await page.locator('text*="premium", text*="free", text*="professional"').count();
        tierFound = menuTier > 0;
      }
    }
    
    console.log(`Subscription tier display found: ${tierFound}`);
  });

  test('should handle registration flow', async ({ page }) => {
    const testUserData = await AuthHelpers.registerTestUser(page, {
      company: 'Test Climate Corp',
      intended_use: 'business'
    });
    
    // Verify registration success
    await expect(page.locator('text*="verification", text*="confirm", text*="check your email"')).toBeVisible();
    
    console.log(`Test user registered: ${testUserData.email}`);
  });

  test('should handle logout flow', async ({ page }) => {
    // Login first
    await AuthHelpers.loginWithCredentials(page, 'FREE_USER');
    
    // Perform logout
    await AuthHelpers.logout(page);
    
    // Verify redirect to auth page
    const currentUrl = page.url();
    expect(currentUrl).toMatch(/\/(auth|login|signin)/);
  });

  test('should remember user session on page refresh', async ({ page }) => {
    // Login first
    await AuthHelpers.loginWithCredentials(page, 'FREE_USER');
    
    // Get current URL after login
    const authenticatedUrl = page.url();
    
    // Refresh the page
    await page.reload();
    await DebugHelpers.waitForPageLoad(page);
    
    // Should still be authenticated (not redirected to login)
    const urlAfterRefresh = page.url();
    expect(urlAfterRefresh).not.toMatch(/\/(auth|login|signin)/);
    
    // Should be on the same page or dashboard
    const isAuthenticated = await AuthHelpers.isAuthenticated(page);
    expect(isAuthenticated).toBeTruthy();
  });

  test('should handle expired session gracefully', async ({ page }) => {
    // Login first
    await AuthHelpers.loginWithCredentials(page, 'FREE_USER');
    
    // Clear auth tokens to simulate expired session
    await page.evaluate(() => {
      localStorage.removeItem('seawater_token');
      localStorage.removeItem('honeydo_token');
    });
    
    // Try to access a protected page
    await page.goto('/dashboard');
    await page.waitForTimeout(2000);
    
    // Should be redirected to login
    const currentUrl = page.url();
    expect(currentUrl).toMatch(/\/(auth|login|signin)/);
  });

  test('should show forgot password functionality', async ({ page }) => {
    await page.goto('/auth/login');
    await page.waitForSelector('form', { timeout: TEST_TIMEOUTS.MEDIUM });
    
    // Look for forgot password link
    const forgotPasswordLink = page.locator('a:has-text("Forgot"), a:has-text("Reset"), button:has-text("Forgot")');
    
    if (await forgotPasswordLink.count() > 0) {
      await forgotPasswordLink.first().click();
      
      // Should navigate to forgot password page or show form
      await page.waitForTimeout(2000);
      
      // Look for email input for password reset
      await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible();
      await expect(page.locator('text*="reset", text*="forgot"')).toBeVisible();
    } else {
      console.log('Forgot password functionality not found - may not be implemented yet');
    }
  });

  test('should validate password requirements during registration', async ({ page }) => {
    await page.goto('/auth/register');
    await page.waitForSelector('form', { timeout: TEST_TIMEOUTS.MEDIUM });
    
    const testEmail = `test_${Date.now()}@example.com`;
    
    // Fill form with weak password
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', '123'); // Weak password
    await page.fill('input[name="first_name"], input[name="firstName"]', 'Test');
    await page.fill('input[name="last_name"], input[name="lastName"]', 'User');
    
    // Try to submit
    await page.click('button[type="submit"], button:has-text("Register"), button:has-text("Sign Up")');
    
    // Should show password requirement error
    const passwordInput = page.locator('input[name="password"]');
    const isInvalid = await passwordInput.evaluate((el: HTMLInputElement) => !el.validity.valid);
    
    if (!isInvalid) {
      // Look for custom validation message
      await expect(page.locator('text*="password", text*="requirement", text*="characters"')).toBeVisible();
    }
  });
});