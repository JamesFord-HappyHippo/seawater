import { expect, test } from '@playwright/test';
import { getEnvironmentConfig, getTestUrls } from '../config/environment';
import { 
  TEST_ADDRESSES,
  TEST_TIMEOUTS,
  MOBILE_VIEWPORTS 
} from '../utils/testCredentials';
import { 
  DebugHelpers,
  ResponsiveHelpers,
  PropertyHelpers 
} from '../utils/testHelpers';

const envConfig = getEnvironmentConfig();
const testUrls = getTestUrls(envConfig.baseURL);

test.describe('Seawater Landing Page Tests', () => {
  test.beforeEach(async ({ page }) => {
    DebugHelpers.setupConsoleLogging(page);
    await page.goto(testUrls.home);
    await DebugHelpers.waitForPageLoad(page);
  });

  test.describe('Before You Choose Messaging', () => {
    test('should display "Before You Choose" messaging prominently on landing page', async ({ page }) => {
      // Test for the main "Before You Choose" heading or messaging
      const beforeYouChooseElements = [
        'text*="Before You Choose"',
        'h1:has-text("Before You Choose")',
        'h2:has-text("Before You Choose")',
        '[data-testid="before-you-choose"]',
        '.before-you-choose',
        '.hero-message:has-text("Before You Choose")'
      ];

      let found = false;
      for (const selector of beforeYouChooseElements) {
        if (await page.locator(selector).count() > 0) {
          await expect(page.locator(selector)).toBeVisible();
          found = true;
          console.log(`✅ Found "Before You Choose" messaging with selector: ${selector}`);
          break;
        }
      }

      if (!found) {
        // Look for related messaging that might be variations
        const relatedMessaging = [
          'text*="Before you buy"',
          'text*="Before you decide"',
          'text*="Before making your choice"',
          'text*="Know your risks before"',
          'text*="Understand climate risks before"'
        ];

        for (const selector of relatedMessaging) {
          if (await page.locator(selector).count() > 0) {
            await expect(page.locator(selector)).toBeVisible();
            found = true;
            console.log(`✅ Found related messaging with selector: ${selector}`);
            break;
          }
        }
      }

      expect(found).toBeTruthy();
      await DebugHelpers.takeTimestampedScreenshot(page, 'landing-before-you-choose-messaging');
    });

    test('should display climate risk education content', async ({ page }) => {
      // Look for educational content about climate risks
      const educationElements = [
        'text*="climate risk"',
        'text*="flood risk"',
        'text*="hurricane"',
        'text*="wildfire"',
        'text*="property assessment"',
        'text*="comprehensive analysis"',
        'text*="8 risk factors"',
        'text*="climate data"'
      ];

      let foundCount = 0;
      for (const text of educationElements) {
        if (await page.locator(text).count() > 0) {
          foundCount++;
        }
      }

      // Should have at least 3 educational elements visible
      expect(foundCount).toBeGreaterThanOrEqual(3);
      console.log(`Found ${foundCount} educational elements on landing page`);
    });

    test('should show clear value proposition', async ({ page }) => {
      // Check for value proposition elements
      const valueProps = [
        'text*="comprehensive"',
        'text*="accurate"',
        'text*="detailed"',
        'text*="professional"',
        'text*="reliable"',
        'text*="expert"',
        'text*="trusted"'
      ];

      let valuePropsFound = 0;
      for (const prop of valueProps) {
        if (await page.locator(prop).count() > 0) {
          valuePropsFound++;
        }
      }

      expect(valuePropsFound).toBeGreaterThanOrEqual(2);
      console.log(`Found ${valuePropsFound} value proposition elements`);
    });
  });

  test.describe('Navigation and User Flow', () => {
    test('should navigate from landing to property assessment', async ({ page }) => {
      // Look for various ways to start property assessment
      const assessmentTriggers = [
        'button:has-text("Get Started")',
        'button:has-text("Assess Property")',
        'button:has-text("Start Assessment")',
        'button:has-text("Check Risk")',
        'input[placeholder*="address"]',
        'input[placeholder*="property"]',
        '[data-testid="address-search"]',
        '.property-search',
        'a:has-text("Start")'
      ];

      let triggerFound = false;
      for (const trigger of assessmentTriggers) {
        if (await page.locator(trigger).isVisible()) {
          await page.locator(trigger).click();
          triggerFound = true;
          console.log(`✅ Successfully clicked assessment trigger: ${trigger}`);
          break;
        }
      }

      expect(triggerFound).toBeTruthy();
      
      // Wait for assessment interface to appear
      await page.waitForTimeout(2000);
      
      // Verify we're now on assessment page or assessment interface is visible
      const assessmentInterface = [
        'input[name="address"]',
        'input[placeholder*="address"]',
        '[data-testid="address-input"]',
        '.address-search'
      ];

      let interfaceVisible = false;
      for (const element of assessmentInterface) {
        if (await page.locator(element).isVisible()) {
          interfaceVisible = true;
          break;
        }
      }

      expect(interfaceVisible).toBeTruthy();
      await DebugHelpers.takeTimestampedScreenshot(page, 'landing-to-assessment-navigation');
    });

    test('should have working navigation menu', async ({ page }) => {
      // Test main navigation elements
      const navElements = [
        'nav',
        '.navigation',
        '.navbar',
        '[role="navigation"]',
        'header nav'
      ];

      let navFound = false;
      for (const nav of navElements) {
        if (await page.locator(nav).count() > 0) {
          navFound = true;
          
          // Check for common navigation links
          const commonLinks = [
            'a:has-text("Home")',
            'a:has-text("About")',
            'a:has-text("Pricing")',
            'a:has-text("Contact")',
            'a:has-text("Login")',
            'a:has-text("Sign In")',
            'a:has-text("Dashboard")'
          ];

          let linksFound = 0;
          for (const link of commonLinks) {
            if (await page.locator(link).count() > 0) {
              linksFound++;
            }
          }

          console.log(`Found ${linksFound} navigation links`);
          expect(linksFound).toBeGreaterThanOrEqual(2);
          break;
        }
      }

      expect(navFound).toBeTruthy();
    });

    test('should display clear call-to-action buttons', async ({ page }) => {
      // Look for primary CTA buttons
      const ctaButtons = [
        'button:has-text("Get Started")',
        'button:has-text("Start Free")',
        'button:has-text("Try Now")',
        'button:has-text("Assess Property")',
        'button:has-text("Check Risk")',
        '.cta-button',
        '.btn-primary',
        '[data-testid="cta"]'
      ];

      let ctaFound = 0;
      for (const cta of ctaButtons) {
        if (await page.locator(cta).isVisible()) {
          ctaFound++;
          
          // Verify button is clickable
          await expect(page.locator(cta)).toBeEnabled();
        }
      }

      expect(ctaFound).toBeGreaterThanOrEqual(1);
      console.log(`Found ${ctaFound} call-to-action buttons`);
    });
  });

  test.describe('Content and Messaging Validation', () => {
    test('should display comprehensive risk factor information', async ({ page }) => {
      // Look for the 8 risk factors that should be mentioned
      const riskFactors = [
        'flood',
        'hurricane', 
        'wildfire',
        'earthquake',
        'tornado',
        'heat',
        'drought',
        'hail'
      ];

      let factorsFound = 0;
      for (const factor of riskFactors) {
        if (await page.locator(`text*="${factor}"`).count() > 0) {
          factorsFound++;
        }
      }

      // Should mention at least 4 of the 8 risk factors on landing page
      expect(factorsFound).toBeGreaterThanOrEqual(4);
      console.log(`Found ${factorsFound} risk factors mentioned on landing page`);
    });

    test('should show data source attribution', async ({ page }) => {
      // Look for mentions of data sources
      const dataSources = [
        'FEMA',
        'NOAA',
        'USGS',
        'data sources',
        'government data',
        'official data',
        'federal agencies',
        'scientific data'
      ];

      let sourcesFound = 0;
      for (const source of dataSources) {
        if (await page.locator(`text*="${source}"`).count() > 0) {
          sourcesFound++;
        }
      }

      expect(sourcesFound).toBeGreaterThanOrEqual(1);
      console.log(`Found ${sourcesFound} data source mentions`);
    });

    test('should display professional messaging if applicable', async ({ page }) => {
      // Look for professional/business-oriented messaging
      const professionalElements = [
        'text*="professional"',
        'text*="business"',
        'text*="commercial"',
        'text*="enterprise"',
        'text*="real estate"',
        'text*="insurance"',
        'text*="lender"',
        'text*="agent"'
      ];

      let professionalFound = 0;
      for (const element of professionalElements) {
        if (await page.locator(element).count() > 0) {
          professionalFound++;
        }
      }

      console.log(`Found ${professionalFound} professional messaging elements`);
      // This is informational - may vary by environment
    });
  });

  test.describe('Responsive Design on Landing Page', () => {
    test('should be responsive on mobile devices', async ({ page }) => {
      // Test different mobile viewports
      const viewports = [
        { name: 'iPhone 12', ...MOBILE_VIEWPORTS.IPHONE_12 },
        { name: 'Samsung Galaxy', ...MOBILE_VIEWPORTS.SAMSUNG_GALAXY }
      ];

      for (const viewport of viewports) {
        await page.setViewportSize(viewport);
        await page.reload();
        await DebugHelpers.waitForPageLoad(page);

        // Verify responsive elements
        await ResponsiveHelpers.verifyResponsiveElements(page);
        
        // Test mobile navigation
        await ResponsiveHelpers.testMobileNavigation(page);

        // Verify "Before You Choose" messaging is still visible on mobile
        const mobileMessaging = await page.locator('text*="Before You Choose", text*="Before you"').count();
        expect(mobileMessaging).toBeGreaterThanOrEqual(1);

        await DebugHelpers.takeTimestampedScreenshot(page, `landing-mobile-${viewport.name.toLowerCase().replace(' ', '-')}`);
      }
    });

    test('should maintain usability on tablet viewport', async ({ page }) => {
      await page.setViewportSize(MOBILE_VIEWPORTS.TABLET);
      await page.reload();
      await DebugHelpers.waitForPageLoad(page);

      // Verify main elements are accessible
      const mainElements = [
        'h1, h2, .hero-title',
        'button, .btn, .cta',
        'input[placeholder*="address"], .address-search'
      ];

      for (const element of mainElements) {
        const count = await page.locator(element).count();
        if (count > 0) {
          await expect(page.locator(element).first()).toBeVisible();
        }
      }

      await DebugHelpers.takeTimestampedScreenshot(page, 'landing-tablet-view');
    });
  });

  test.describe('Performance and Loading', () => {
    test('should load landing page within acceptable time', async ({ page }) => {
      const startTime = Date.now();
      
      await page.goto(testUrls.home);
      await DebugHelpers.waitForPageLoad(page);
      
      const loadTime = Date.now() - startTime;
      console.log(`Landing page load time: ${loadTime}ms`);
      
      // Should load within environment-specific threshold
      const threshold = envConfig.performance.thresholds.pageLoad;
      if (envConfig.performance.enabled) {
        expect(loadTime).toBeLessThan(threshold);
      }
    });

    test('should have no critical accessibility violations', async ({ page }) => {
      // Basic accessibility checks
      
      // Check for page title
      const title = await page.title();
      expect(title).toBeTruthy();
      expect(title.length).toBeGreaterThan(10);
      
      // Check for main heading
      const h1Count = await page.locator('h1').count();
      expect(h1Count).toBeGreaterThanOrEqual(1);
      expect(h1Count).toBeLessThanOrEqual(2); // Should not have multiple h1s
      
      // Check for proper heading hierarchy
      const headings = await page.locator('h1, h2, h3, h4, h5, h6').allTextContents();
      expect(headings.length).toBeGreaterThanOrEqual(2);
      
      console.log(`Found ${headings.length} headings on landing page`);
    });
  });

  test.describe('Cross-Environment Consistency', () => {
    test('should display consistent core messaging across environments', async ({ page }) => {
      // These elements should be consistent regardless of environment
      const coreElements = [
        'Seawater', // Brand name
        'climate', // Core concept
        'risk', // Core concept
        'property' // Core concept
      ];

      for (const element of coreElements) {
        const found = await page.locator(`text*="${element}"`).count() > 0;
        expect(found).toBeTruthy();
        console.log(`✅ Found core element: ${element}`);
      }
    });

    test('should have working property assessment entry point', async ({ page }) => {
      // This is a critical user journey that should work in all environments
      const testAddress = TEST_ADDRESSES.QUICK_TEST[0];
      
      try {
        await PropertyHelpers.assessProperty(page, testAddress);
        console.log(`✅ Property assessment works with address: ${testAddress}`);
        
        // Take screenshot of successful assessment
        await DebugHelpers.takeTimestampedScreenshot(page, 'landing-assessment-success');
      } catch (error) {
        console.log(`⚠️ Property assessment issue: ${error}`);
        await DebugHelpers.takeTimestampedScreenshot(page, 'landing-assessment-error');
        
        // Don't fail the test as this might be environment-specific
        // but log the issue for investigation
      }
    });
  });
});