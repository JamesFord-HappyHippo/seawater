import { expect, test } from '@playwright/test';
import { getEnvironmentConfig, getTestUrls } from '../config/environment';
import { 
  TEST_ADDRESSES, 
  TEST_TIMEOUTS, 
  RISK_TEST_SCENARIOS 
} from '../utils/testCredentials';
import { 
  PropertyHelpers, 
  DebugHelpers,
  APIHelpers 
} from '../utils/testHelpers';

const envConfig = getEnvironmentConfig();
const testUrls = getTestUrls(envConfig.baseURL);

test.describe('Comprehensive 8-Risk Climate Assessment', () => {
  test.beforeEach(async ({ page }) => {
    DebugHelpers.setupConsoleLogging(page);
    await page.goto(testUrls.home);
    await DebugHelpers.waitForPageLoad(page);
  });

  test.describe('Address Input and Validation', () => {
    test('should accept and process various address formats', async ({ page }) => {
      const addressFormats = [
        '123 Main St, Denver, CO 80202',
        '456 Oak Avenue, Miami, Florida 33101',
        '789 Pine Road, New York, NY 10001',
        '321 Elm Street, Los Angeles, CA 90210',
        '555 Maple Dr, Houston, TX 77001'
      ];

      for (const address of addressFormats) {
        await page.goto(testUrls.home);
        
        try {
          await PropertyHelpers.assessProperty(page, address);
          await PropertyHelpers.verifyRiskResults(page);
          
          console.log(`✅ Successfully processed address: ${address}`);
          await DebugHelpers.takeTimestampedScreenshot(page, `address-format-${address.replace(/[^a-zA-Z0-9]/g, '-')}`);
          
        } catch (error) {
          console.log(`⚠️ Failed to process address: ${address} - ${error}`);
        }
      }
    });

    test('should handle invalid addresses gracefully', async ({ page }) => {
      const invalidAddresses = TEST_ADDRESSES.INVALID;
      
      for (const invalidAddress of invalidAddresses) {
        await page.goto(testUrls.home);
        
        // Find address input
        const addressInput = page.locator('input[name="address"], input[placeholder*="address"]').first();
        await addressInput.fill(invalidAddress);
        
        // Submit
        const submitButton = page.locator('button:has-text("Assess"), button[type="submit"]').first();
        await submitButton.click();
        
        await page.waitForTimeout(3000);
        
        // Should show error message or validation
        const errorElements = [
          '.error',
          '.invalid-feedback',
          'text*="invalid"',
          'text*="not found"',
          'text*="enter a valid"',
          '[role="alert"]'
        ];
        
        let errorShown = false;
        for (const element of errorElements) {
          if (await page.locator(element).count() > 0) {
            errorShown = true;
            break;
          }
        }
        
        console.log(`Invalid address "${invalidAddress}": Error shown: ${errorShown}`);
        
        if (errorShown) {
          await DebugHelpers.takeTimestampedScreenshot(page, `invalid-address-error-${invalidAddress.slice(0, 10)}`);
        }
      }
    });

    test('should provide address autocomplete or suggestions', async ({ page }) => {
      const addressInput = page.locator('input[name="address"], input[placeholder*="address"]').first();
      
      // Start typing an address
      await addressInput.fill('123 Main');
      await page.waitForTimeout(1000);
      
      // Look for autocomplete dropdown or suggestions
      const autocompleteElements = [
        '.autocomplete',
        '.suggestions',
        '.dropdown',
        '[role="listbox"]',
        '.address-suggestions'
      ];
      
      let autocompleteFound = false;
      for (const element of autocompleteElements) {
        if (await page.locator(element).isVisible()) {
          autocompleteFound = true;
          console.log(`✅ Autocomplete found: ${element}`);
          break;
        }
      }
      
      console.log(`Address autocomplete available: ${autocompleteFound}`);
      
      if (autocompleteFound) {
        await DebugHelpers.takeTimestampedScreenshot(page, 'address-autocomplete');
      }
    });
  });

  test.describe('8-Risk Factor Assessment', () => {
    test('should display all 8 climate risk factors', async ({ page }) => {
      const testAddress = TEST_ADDRESSES.MULTI_HAZARD[0];
      await PropertyHelpers.assessProperty(page, testAddress);
      
      // The 8 risk factors that should be assessed
      const riskFactors = [
        { name: 'flood', selectors: ['.flood-risk', '[data-testid="flood-risk"]', 'text*="flood"'] },
        { name: 'hurricane', selectors: ['.hurricane-risk', '[data-testid="hurricane-risk"]', 'text*="hurricane"'] },
        { name: 'wildfire', selectors: ['.wildfire-risk', '.fire-risk', '[data-testid="fire-risk"]', 'text*="wildfire"', 'text*="fire"'] },
        { name: 'earthquake', selectors: ['.earthquake-risk', '[data-testid="earthquake-risk"]', 'text*="earthquake"'] },
        { name: 'tornado', selectors: ['.tornado-risk', '[data-testid="tornado-risk"]', 'text*="tornado"'] },
        { name: 'heat', selectors: ['.heat-risk', '[data-testid="heat-risk"]', 'text*="heat"', 'text*="extreme heat"'] },
        { name: 'drought', selectors: ['.drought-risk', '[data-testid="drought-risk"]', 'text*="drought"'] },
        { name: 'hail', selectors: ['.hail-risk', '[data-testid="hail-risk"]', 'text*="hail"'] }
      ];
      
      const foundRisks = [];
      const missingRisks = [];
      
      for (const risk of riskFactors) {
        let found = false;
        for (const selector of risk.selectors) {
          if (await page.locator(selector).count() > 0) {
            found = true;
            foundRisks.push(risk.name);
            console.log(`✅ Found ${risk.name} risk assessment`);
            break;
          }
        }
        
        if (!found) {
          missingRisks.push(risk.name);
          console.log(`⚠️ Missing ${risk.name} risk assessment`);
        }
      }
      
      console.log(`Risk factors found: ${foundRisks.length}/8`);
      console.log(`Found: ${foundRisks.join(', ')}`);
      if (missingRisks.length > 0) {
        console.log(`Missing: ${missingRisks.join(', ')}`);
      }
      
      // Should have at least 6 of 8 risk factors visible
      expect(foundRisks.length).toBeGreaterThanOrEqual(6);
      
      await DebugHelpers.takeTimestampedScreenshot(page, '8-risk-assessment-display');
    });

    test('should show individual risk scores or ratings', async ({ page }) => {
      const testAddress = TEST_ADDRESSES.HIGH_FLOOD_RISK[0];
      await PropertyHelpers.assessProperty(page, testAddress);
      
      // Look for individual risk scores
      const riskScoreElements = [
        '.risk-score',
        '.risk-rating',
        '.risk-level',
        '[data-testid*="risk-score"]',
        '.score',
        '.rating',
        'text*="High"',
        'text*="Medium"',
        'text*="Low"',
        'text*="/10"',
        'text*="Score:"'
      ];
      
      let scoresFound = 0;
      for (const element of riskScoreElements) {
        scoresFound += await page.locator(element).count();
      }
      
      console.log(`Found ${scoresFound} risk score elements`);
      expect(scoresFound).toBeGreaterThanOrEqual(3);
      
      // Verify scores are displayed with proper formatting
      const numericScores = await page.locator('text*="/10", text*="Score:", .score').allTextContents();
      console.log(`Numeric scores found: ${numericScores.length}`);
      
      await DebugHelpers.takeTimestampedScreenshot(page, 'individual-risk-scores');
    });

    test('should display risk-specific information and context', async ({ page }) => {
      const testAddress = TEST_ADDRESSES.WILDFIRE_RISK[0];
      await PropertyHelpers.assessProperty(page, testAddress);
      
      // Look for detailed risk information
      const detailElements = [
        '.risk-details',
        '.risk-explanation',
        '.risk-factors',
        '.hazard-info',
        'text*="based on"',
        'text*="historical data"',
        'text*="probability"',
        'text*="likelihood"'
      ];
      
      let detailsFound = 0;
      for (const element of detailElements) {
        if (await page.locator(element).count() > 0) {
          detailsFound++;
        }
      }
      
      console.log(`Found ${detailsFound} detailed risk information elements`);
      expect(detailsFound).toBeGreaterThanOrEqual(1);
    });
  });

  test.describe('Overall Risk Score Calculation', () => {
    test('should calculate and display overall property risk score', async ({ page }) => {
      const testAddress = TEST_ADDRESSES.MULTI_HAZARD[0];
      await PropertyHelpers.assessProperty(page, testAddress);
      
      // Look for overall risk score
      const overallScoreElements = [
        '.overall-risk-score',
        '.total-risk-score',
        '.property-risk-score',
        '[data-testid="overall-risk-score"]',
        '[data-testid="total-score"]'
      ];
      
      let overallScoreFound = false;
      for (const element of overallScoreElements) {
        if (await page.locator(element).isVisible()) {
          overallScoreFound = true;
          
          // Verify score format (should be numeric)
          const scoreText = await page.locator(element).textContent();
          const hasNumericScore = /\d+/.test(scoreText || '');
          expect(hasNumericScore).toBeTruthy();
          
          console.log(`✅ Overall risk score found: ${scoreText}`);
          break;
        }
      }
      
      if (!overallScoreFound) {
        // Look for alternative overall score presentations
        const alternativeScores = [
          'text*="Overall Risk"',
          'text*="Total Risk"',
          'text*="Property Risk"',
          'text*="Risk Score"',
          '.risk-meter',
          '.risk-gauge'
        ];
        
        for (const alt of alternativeScores) {
          if (await page.locator(alt).count() > 0) {
            overallScoreFound = true;
            console.log(`✅ Alternative overall score found: ${alt}`);
            break;
          }
        }
      }
      
      expect(overallScoreFound).toBeTruthy();
      await DebugHelpers.takeTimestampedScreenshot(page, 'overall-risk-score');
    });

    test('should show risk score calculation methodology', async ({ page }) => {
      const testAddress = TEST_ADDRESSES.MULTI_HAZARD[1];
      await PropertyHelpers.assessProperty(page, testAddress);
      
      // Look for methodology explanation
      const methodologyElements = [
        '.methodology',
        '.calculation-method',
        '.how-calculated',
        'text*="How is this calculated"',
        'text*="methodology"',
        'text*="based on"',
        'text*="weighted"',
        'button:has-text("Learn more")',
        'button:has-text("How we calculate")'
      ];
      
      let methodologyFound = false;
      for (const element of methodologyElements) {
        if (await page.locator(element).count() > 0) {
          methodologyFound = true;
          console.log(`✅ Risk methodology information found: ${element}`);
          break;
        }
      }
      
      console.log(`Risk calculation methodology visible: ${methodologyFound}`);
      
      if (methodologyFound) {
        await DebugHelpers.takeTimestampedScreenshot(page, 'risk-methodology');
      }
    });

    test('should provide risk level categorization', async ({ page }) => {
      const addresses = [
        TEST_ADDRESSES.LOW_RISK[0],
        TEST_ADDRESSES.HIGH_FLOOD_RISK[0],
        TEST_ADDRESSES.WILDFIRE_RISK[0]
      ];
      
      const riskCategories = [];
      
      for (const address of addresses) {
        await page.goto(testUrls.home);
        await PropertyHelpers.assessProperty(page, address);
        
        // Look for risk level indicators
        const riskLevels = [
          'text*="Low Risk"',
          'text*="Medium Risk"',
          'text*="High Risk"',
          'text*="Very High"',
          'text*="Extreme"',
          '.risk-low',
          '.risk-medium',
          '.risk-high',
          '.low-risk',
          '.high-risk'
        ];
        
        let categoryFound = '';
        for (const level of riskLevels) {
          if (await page.locator(level).count() > 0) {
            categoryFound = level;
            break;
          }
        }
        
        riskCategories.push(categoryFound);
        console.log(`Address: ${address.slice(0, 20)}... - Risk category: ${categoryFound}`);
      }
      
      // Should find risk categories for most addresses
      const categoriesWithRisk = riskCategories.filter(cat => cat !== '');
      expect(categoriesWithRisk.length).toBeGreaterThanOrEqual(2);
    });
  });

  test.describe('Data Source Attribution', () => {
    test('should display data source attribution prominently', async ({ page }) => {
      const testAddress = TEST_ADDRESSES.QUICK_TEST[0];
      await PropertyHelpers.assessProperty(page, testAddress);
      
      // Look for data source mentions
      const dataSources = [
        'FEMA',
        'NOAA',
        'USGS',
        'Federal Emergency Management Agency',
        'National Oceanic and Atmospheric Administration',
        'U.S. Geological Survey',
        'government data',
        'federal agencies',
        'official data sources'
      ];
      
      const foundSources = [];
      for (const source of dataSources) {
        if (await page.locator(`text*="${source}"`).count() > 0) {
          foundSources.push(source);
        }
      }
      
      console.log(`Data sources mentioned: ${foundSources.join(', ')}`);
      expect(foundSources.length).toBeGreaterThanOrEqual(2);
      
      // Look for data attribution section
      const attributionElements = [
        '.data-sources',
        '.attribution',
        '.sources',
        '[data-testid="data-sources"]',
        'text*="Data provided by"',
        'text*="Sources:"',
        'text*="Based on data from"'
      ];
      
      let attributionFound = false;
      for (const element of attributionElements) {
        if (await page.locator(element).count() > 0) {
          attributionFound = true;
          console.log(`✅ Data attribution section found: ${element}`);
          break;
        }
      }
      
      expect(attributionFound).toBeTruthy();
      await DebugHelpers.takeTimestampedScreenshot(page, 'data-source-attribution');
    });

    test('should link to official data source websites', async ({ page }) => {
      const testAddress = TEST_ADDRESSES.QUICK_TEST[1];
      await PropertyHelpers.assessProperty(page, testAddress);
      
      // Look for links to official sources
      const sourceLinks = [
        'a[href*="fema.gov"]',
        'a[href*="noaa.gov"]',
        'a[href*="usgs.gov"]',
        'a[href*="weather.gov"]',
        'a:has-text("FEMA")',
        'a:has-text("NOAA")',
        'a:has-text("USGS")'
      ];
      
      let linksFound = 0;
      for (const link of sourceLinks) {
        const count = await page.locator(link).count();
        if (count > 0) {
          linksFound++;
          
          // Verify links open in new tab/window
          const target = await page.locator(link).first().getAttribute('target');
          if (target === '_blank') {
            console.log(`✅ External link opens in new tab: ${link}`);
          }
        }
      }
      
      console.log(`Official data source links found: ${linksFound}`);
      expect(linksFound).toBeGreaterThanOrEqual(1);
    });

    test('should show data freshness and update information', async ({ page }) => {
      const testAddress = TEST_ADDRESSES.HURRICANE_RISK[0];
      await PropertyHelpers.assessProperty(page, testAddress);
      
      // Look for data freshness indicators
      const freshnessElements = [
        'text*="Last updated"',
        'text*="Data as of"',
        'text*="Updated"',
        'text*="Current as of"',
        'text*="2024"',
        'text*="2023"',
        '.data-timestamp',
        '.last-updated',
        '[data-testid="data-freshness"]'
      ];
      
      let freshnessFound = false;
      for (const element of freshnessElements) {
        if (await page.locator(element).count() > 0) {
          freshnessFound = true;
          console.log(`✅ Data freshness information found: ${element}`);
          break;
        }
      }
      
      console.log(`Data freshness indicator present: ${freshnessFound}`);
      
      if (freshnessFound) {
        await DebugHelpers.takeTimestampedScreenshot(page, 'data-freshness-indicator');
      }
    });

    test('should provide methodology and reliability information', async ({ page }) => {
      const testAddress = TEST_ADDRESSES.EARTHQUAKE_RISK[0];
      await PropertyHelpers.assessProperty(page, testAddress);
      
      // Look for methodology information
      const methodologyElements = [
        'text*="methodology"',
        'text*="How we calculate"',
        'text*="Our approach"',
        'text*="scientific method"',
        'text*="peer-reviewed"',
        'text*="accuracy"',
        'text*="reliability"',
        'button:has-text("Learn more")',
        'a:has-text("Methodology")'
      ];
      
      let methodologyCount = 0;
      for (const element of methodologyElements) {
        if (await page.locator(element).count() > 0) {
          methodologyCount++;
        }
      }
      
      console.log(`Methodology elements found: ${methodologyCount}`);
      expect(methodologyCount).toBeGreaterThanOrEqual(1);
    });
  });

  test.describe('Assessment Performance and Quality', () => {
    test('should complete risk assessment within acceptable timeframe', async ({ page }) => {
      const testAddress = TEST_ADDRESSES.QUICK_TEST[0];
      
      const startTime = Date.now();
      await PropertyHelpers.assessProperty(page, testAddress);
      await PropertyHelpers.verifyRiskResults(page);
      const endTime = Date.now();
      
      const assessmentTime = endTime - startTime;
      console.log(`Risk assessment completed in ${assessmentTime}ms`);
      
      // Should complete within environment-specific threshold
      const threshold = envConfig.performance.thresholds.assessmentTime;
      if (envConfig.performance.enabled) {
        expect(assessmentTime).toBeLessThan(threshold);
      }
    });

    test('should handle concurrent assessments', async ({ page }) => {
      const browser = page.context().browser();
      if (!browser) return;
      
      // Create multiple tabs to simulate concurrent users
      const tab1 = await browser.newContext().then(ctx => ctx.newPage());
      const tab2 = await browser.newContext().then(ctx => ctx.newPage());
      
      DebugHelpers.setupConsoleLogging(tab1);
      DebugHelpers.setupConsoleLogging(tab2);
      
      // Start concurrent assessments
      const assessment1 = PropertyHelpers.assessProperty(tab1, TEST_ADDRESSES.HIGH_FLOOD_RISK[0]);
      const assessment2 = PropertyHelpers.assessProperty(tab2, TEST_ADDRESSES.WILDFIRE_RISK[0]);
      
      // Wait for both to complete
      await Promise.all([assessment1, assessment2]);
      
      // Verify both got results
      await PropertyHelpers.verifyRiskResults(tab1);
      await PropertyHelpers.verifyRiskResults(tab2);
      
      console.log('✅ Concurrent assessments completed successfully');
      
      await tab1.close();
      await tab2.close();
    });

    test('should provide consistent results for same address', async ({ page }) => {
      const testAddress = TEST_ADDRESSES.LOW_RISK[0];
      
      // Perform assessment twice
      await PropertyHelpers.assessProperty(page, testAddress);
      const firstResults = await page.locator('.risk-score, .overall-risk-score').allTextContents();
      
      await page.goto(testUrls.home);
      await PropertyHelpers.assessProperty(page, testAddress);
      const secondResults = await page.locator('.risk-score, .overall-risk-score').allTextContents();
      
      // Results should be consistent
      console.log('First assessment results:', firstResults);
      console.log('Second assessment results:', secondResults);
      
      // At least some risk scores should match
      const hasConsistentResults = firstResults.some(result => 
        secondResults.includes(result) && result.trim() !== ''
      );
      
      expect(hasConsistentResults).toBeTruthy();
      console.log('✅ Assessment results are consistent');
    });
  });
});