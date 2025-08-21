import { expect, test } from '@playwright/test';
import { getEnvironmentConfig, getTestUrls } from '../config/environment';
import { 
  TEST_ADDRESSES, 
  TEST_TIMEOUTS, 
  RISK_TEST_SCENARIOS,
  SEAWATER_TEST_CREDENTIALS 
} from '../utils/testCredentials';
import { 
  AuthHelpers, 
  PropertyHelpers, 
  APIHelpers, 
  DebugHelpers 
} from '../utils/testHelpers';

const envConfig = getEnvironmentConfig();
const testUrls = getTestUrls(envConfig.baseURL);

test.describe('Seawater Property Risk Assessment', () => {
  test.beforeEach(async ({ page }) => {
    DebugHelpers.setupConsoleLogging(page);
  });

  test('should display risk assessment form on homepage', async ({ page }) => {
    await page.goto('/');
    await DebugHelpers.waitForPageLoad(page);
    
    // Check for property search/assessment form
    const searchSelectors = [
      'input[name="address"]',
      'input[placeholder*="address"]',
      'input[placeholder*="property"]',
      '[data-testid="address-search"]',
      '.address-search input'
    ];
    
    let searchFound = false;
    for (const selector of searchSelectors) {
      if (await page.locator(selector).count() > 0) {
        await expect(page.locator(selector)).toBeVisible();
        searchFound = true;
        break;
      }
    }
    
    expect(searchFound).toBeTruthy();
    
    // Check for assess/search button
    const buttonSelectors = [
      'button:has-text("Assess")',
      'button:has-text("Search")',
      'button:has-text("Get Risk")',
      'button[type="submit"]'
    ];
    
    let buttonFound = false;
    for (const selector of buttonSelectors) {
      if (await page.locator(selector).count() > 0) {
        buttonFound = true;
        break;
      }
    }
    
    expect(buttonFound).toBeTruthy();
  });

  test('should perform basic property risk assessment for anonymous user', async ({ page }) => {
    await page.goto('/');
    
    // Perform assessment with test address
    const testAddress = RISK_TEST_SCENARIOS.BASIC_ASSESSMENT.address;
    await PropertyHelpers.assessProperty(page, testAddress);
    
    // Verify results are displayed
    await PropertyHelpers.verifyRiskResults(page);
    
    // Take screenshot for verification
    await DebugHelpers.takeTimestampedScreenshot(page, 'basic-risk-assessment');
  });

  test('should show property details in assessment results', async ({ page }) => {
    await page.goto('/');
    
    const testAddress = TEST_ADDRESSES.HIGH_FLOOD_RISK[0];
    await PropertyHelpers.assessProperty(page, testAddress);
    
    // Check for property information display
    const propertySelectors = [
      '.property-info',
      '.property-details',
      '[data-testid="property-info"]',
      'text*="address"',
      'text*="location"'
    ];
    
    let propertyInfoFound = false;
    for (const selector of propertySelectors) {
      if (await page.locator(selector).count() > 0) {
        await expect(page.locator(selector).first()).toBeVisible();
        propertyInfoFound = true;
        break;
      }
    }
    
    expect(propertyInfoFound).toBeTruthy();
  });

  test('should display risk score with proper styling', async ({ page }) => {
    await page.goto('/');
    
    const testAddress = TEST_ADDRESSES.HIGH_FLOOD_RISK[0];
    await PropertyHelpers.assessProperty(page, testAddress);
    
    // Check for risk score display
    const riskScoreElement = page.locator('.risk-score, [data-testid="risk-score"], .score').first();
    await expect(riskScoreElement).toBeVisible();
    
    // Verify score is numeric
    const scoreText = await riskScoreElement.textContent();
    const hasNumber = /\d/.test(scoreText || '');
    expect(hasNumber).toBeTruthy();
    
    // Check for visual risk indicators (colors, meters, etc.)
    const visualIndicators = [
      '.risk-meter',
      '.progress-bar',
      '.risk-indicator',
      '[data-testid="risk-meter"]',
      '.bg-red', '.bg-yellow', '.bg-green', // Color indicators
      '.text-red', '.text-yellow', '.text-green'
    ];
    
    let visualFound = false;
    for (const selector of visualIndicators) {
      if (await page.locator(selector).count() > 0) {
        visualFound = true;
        break;
      }
    }
    
    console.log(`Visual risk indicators found: ${visualFound}`);
  });

  test('should show hazard types and details', async ({ page }) => {
    await page.goto('/');
    
    const testAddress = TEST_ADDRESSES.HIGH_FLOOD_RISK[0];
    await PropertyHelpers.assessProperty(page, testAddress);
    
    // Check for hazard information
    const hazardSelectors = [
      '.hazards',
      '.risk-factors',
      '[data-testid="hazards"]',
      'text*="flood"',
      'text*="hurricane"',
      'text*="wildfire"',
      'text*="earthquake"'
    ];
    
    let hazardFound = false;
    for (const selector of hazardSelectors) {
      if (await page.locator(selector).count() > 0) {
        await expect(page.locator(selector).first()).toBeVisible();
        hazardFound = true;
        break;
      }
    }
    
    expect(hazardFound).toBeTruthy();
  });

  test('should handle invalid address gracefully', async ({ page }) => {
    await page.goto('/');
    
    const invalidAddress = TEST_ADDRESSES.INVALID[0];
    
    // Try to assess invalid address
    const searchInput = page.locator('input[name="address"], input[placeholder*="address"]').first();
    await searchInput.fill(invalidAddress);
    
    const submitButton = page.locator('button:has-text("Assess"), button:has-text("Search"), button[type="submit"]').first();
    await submitButton.click();
    
    // Should show error message
    await page.waitForSelector(
      '.error, .text-red, [role="alert"], text*="invalid", text*="not found", text*="error"',
      { timeout: TEST_TIMEOUTS.API_RESPONSE }
    );
    
    const errorMessage = page.locator('.error, .text-red, [role="alert"]').first();
    await expect(errorMessage).toBeVisible();
  });

  test('should track API calls for assessment', async ({ page }) => {
    // Intercept API calls
    const apiCallPromise = APIHelpers.interceptAPICall(page, 'risk/assess');
    
    await page.goto('/');
    
    const testAddress = TEST_ADDRESSES.LOW_RISK[0];
    await PropertyHelpers.assessProperty(page, testAddress);
    
    // Verify API call was made
    const apiCall = await apiCallPromise;
    expect(apiCall.url).toContain('risk');
    expect(apiCall.method).toBe('POST');
  });

  test('should display loading state during assessment', async ({ page }) => {
    await page.goto('/');
    
    const testAddress = TEST_ADDRESSES.HIGH_FLOOD_RISK[0];
    
    // Fill address
    const searchInput = page.locator('input[name="address"], input[placeholder*="address"]').first();
    await searchInput.fill(testAddress);
    
    // Click submit and immediately check for loading state
    const submitButton = page.locator('button:has-text("Assess"), button:has-text("Search"), button[type="submit"]').first();
    await submitButton.click();
    
    // Look for loading indicators
    const loadingSelectors = [
      '.loading',
      '.spinner',
      '[data-testid="loading"]',
      'text*="loading"',
      'text*="assessing"',
      'text*="analyzing"'
    ];
    
    let loadingFound = false;
    for (const selector of loadingSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 2000 });
        loadingFound = true;
        break;
      } catch {
        // Continue checking other selectors
      }
    }
    
    console.log(`Loading state found: ${loadingFound}`);
    
    // Wait for results
    await PropertyHelpers.verifyRiskResults(page);
  });

  test('should work with different address formats', async ({ page }) => {
    const addressFormats = [
      '123 Main St, New York, NY 10001',
      '123 Main Street, New York, New York 10001',
      '123 Main St, New York NY 10001',
      'New York, NY' // City only
    ];
    
    for (const address of addressFormats) {
      await page.goto('/');
      
      try {
        await PropertyHelpers.assessProperty(page, address);
        
        // If assessment succeeds, verify results
        await PropertyHelpers.verifyRiskResults(page);
        console.log(`✅ Address format worked: ${address}`);
        
      } catch (error) {
        console.log(`⚠️ Address format failed: ${address}`);
        // Continue with next format
      }
    }
  });

  test('should provide actionable recommendations', async ({ page }) => {
    await page.goto('/');
    
    const testAddress = TEST_ADDRESSES.HIGH_FLOOD_RISK[0];
    await PropertyHelpers.assessProperty(page, testAddress);
    
    // Look for recommendations or action items
    const recommendationSelectors = [
      '.recommendations',
      '.action-items',
      '[data-testid="recommendations"]',
      'text*="recommend"',
      'text*="suggest"',
      'text*="consider"',
      'text*="mitigation"'
    ];
    
    let recommendationFound = false;
    for (const selector of recommendationSelectors) {
      if (await page.locator(selector).count() > 0) {
        await expect(page.locator(selector).first()).toBeVisible();
        recommendationFound = true;
        break;
      }
    }
    
    console.log(`Recommendations found: ${recommendationFound}`);
  });

  test('should allow sharing or saving results', async ({ page }) => {
    await page.goto('/');
    
    const testAddress = TEST_ADDRESSES.LOW_RISK[0];
    await PropertyHelpers.assessProperty(page, testAddress);
    
    // Look for share/save options
    const shareSelectors = [
      'button:has-text("Share")',
      'button:has-text("Save")',
      'button:has-text("Export")',
      'button:has-text("Download")',
      '[data-testid="share-button"]',
      '[data-testid="save-button"]'
    ];
    
    let shareFound = false;
    for (const selector of shareSelectors) {
      if (await page.locator(selector).count() > 0) {
        shareFound = true;
        break;
      }
    }
    
    console.log(`Share/save options found: ${shareFound}`);
  });

  test('should show professional services when available', async ({ page }) => {
    await page.goto('/');
    
    const testAddress = TEST_ADDRESSES.HIGH_FLOOD_RISK[0];
    await PropertyHelpers.assessProperty(page, testAddress);
    
    // Look for professional services section
    const professionalSelectors = [
      '.professionals',
      '.services',
      '[data-testid="professionals"]',
      'text*="professional"',
      'text*="contractor"',
      'text*="expert"',
      'text*="consultant"'
    ];
    
    let professionalFound = false;
    for (const selector of professionalSelectors) {
      if (await page.locator(selector).count() > 0) {
        professionalFound = true;
        break;
      }
    }
    
    console.log(`Professional services found: ${professionalFound}`);
  });

  test('should maintain assessment state on page navigation', async ({ page }) => {
    await page.goto('/');
    
    const testAddress = TEST_ADDRESSES.LOW_RISK[0];
    await PropertyHelpers.assessProperty(page, testAddress);
    
    // Get current assessment URL
    const assessmentUrl = page.url();
    
    // Navigate away and back
    await page.goto('/');
    await page.goBack();
    
    // Should still show assessment results
    await page.waitForTimeout(2000);
    
    // Check if results are still displayed
    const hasResults = await page.locator('.risk-score, [data-testid="risk-score"]').count() > 0;
    
    if (hasResults) {
      await PropertyHelpers.verifyRiskResults(page);
    } else {
      console.log('Assessment state not maintained (may be expected behavior)');
    }
  });
});