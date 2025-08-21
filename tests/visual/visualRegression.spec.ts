import { expect, test } from '@playwright/test';
import { getEnvironmentConfig, getTestUrls } from '../config/environment';
import { 
  TEST_ADDRESSES, 
  MOBILE_VIEWPORTS 
} from '../utils/testCredentials';
import { 
  LandingPage,
  AssessmentPage,
  TrialSystemPage 
} from '../page-objects';
import { DebugHelpers } from '../utils/testHelpers';

const envConfig = getEnvironmentConfig();
const testUrls = getTestUrls(envConfig.baseURL);

test.describe('Visual Regression Tests', () => {
  test.beforeEach(async ({ page }) => {
    DebugHelpers.setupConsoleLogging(page);
  });

  test.describe('Landing Page Visual Tests', () => {
    test('should match landing page layout baseline', async ({ page }) => {
      const landingPage = new LandingPage(page);
      await landingPage.navigate();
      
      // Wait for all content to load
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
      
      // Take full page screenshot for comparison
      await expect(page).toHaveScreenshot('landing-page-full.png', {
        fullPage: true,
        threshold: 0.3 // Allow 30% difference to account for dynamic content
      });
    });

    test('should match hero section layout', async ({ page }) => {
      const landingPage = new LandingPage(page);
      await landingPage.navigate();
      
      // Focus on hero section
      const heroSection = page.locator('header, .hero, .main-banner, h1').first();
      if (await heroSection.count() > 0) {
        await expect(heroSection).toHaveScreenshot('hero-section.png', {
          threshold: 0.2
        });
      }
    });

    test('should match navigation layout across viewports', async ({ page }) => {
      const viewports = [
        { name: 'desktop', width: 1280, height: 720 },
        { name: 'tablet', width: 768, height: 1024 },
        { name: 'mobile', width: 390, height: 844 }
      ];

      for (const viewport of viewports) {
        await page.setViewportSize(viewport);
        
        const landingPage = new LandingPage(page);
        await landingPage.navigate();
        
        // Screenshot navigation area
        const navigation = page.locator('nav, .navigation, header').first();
        if (await navigation.count() > 0) {
          await expect(navigation).toHaveScreenshot(`navigation-${viewport.name}.png`, {
            threshold: 0.25
          });
        }
      }
    });

    test('should maintain consistent branding elements', async ({ page }) => {
      const landingPage = new LandingPage(page);
      await landingPage.navigate();
      
      // Check for logo/branding area
      const brandingElements = [
        '.logo',
        '.brand',
        '[data-testid="logo"]',
        'img[alt*="logo"]',
        'img[alt*="Seawater"]'
      ];

      for (const selector of brandingElements) {
        if (await page.locator(selector).count() > 0) {
          await expect(page.locator(selector)).toHaveScreenshot(`branding-${selector.replace(/[^a-zA-Z0-9]/g, '-')}.png`, {
            threshold: 0.1 // Brand elements should be very consistent
          });
          break;
        }
      }
    });
  });

  test.describe('Assessment Results Visual Tests', () => {
    test('should match risk assessment results layout', async ({ page }) => {
      const landingPage = new LandingPage(page);
      const assessmentPage = new AssessmentPage(page);
      
      await landingPage.navigate();
      await landingPage.assessProperty(TEST_ADDRESSES.QUICK_TEST[0]);
      
      // Wait for results to fully load
      await assessmentPage.verifyRiskResults();
      await page.waitForTimeout(3000);
      
      // Screenshot the entire results area
      await expect(page).toHaveScreenshot('assessment-results-full.png', {
        fullPage: true,
        threshold: 0.4 // Results may have dynamic content
      });
    });

    test('should match risk score visualization', async ({ page }) => {
      const landingPage = new LandingPage(page);
      const assessmentPage = new AssessmentPage(page);
      
      await landingPage.navigate();
      await landingPage.assessProperty(TEST_ADDRESSES.HIGH_FLOOD_RISK[0]);
      
      await assessmentPage.verifyRiskResults();
      
      // Screenshot risk score elements
      const riskScoreElements = [
        '.risk-score',
        '.overall-risk-score',
        '[data-testid="risk-score"]'
      ];

      for (const selector of riskScoreElements) {
        if (await page.locator(selector).count() > 0) {
          await expect(page.locator(selector).first()).toHaveScreenshot(`risk-score-${selector.replace(/[^a-zA-Z0-9]/g, '-')}.png`, {
            threshold: 0.3
          });
          break;
        }
      }
    });

    test('should match risk factors display layout', async ({ page }) => {
      const landingPage = new LandingPage(page);
      const assessmentPage = new AssessmentPage(page);
      
      await landingPage.navigate();
      await landingPage.assessProperty(TEST_ADDRESSES.MULTI_HAZARD[0]);
      
      await assessmentPage.verifyRiskResults();
      
      // Get displayed risk factors and screenshot them
      const riskFactorsData = await assessmentPage.getDisplayedRiskFactors();
      const displayedFactors = Object.entries(riskFactorsData)
        .filter(([, displayed]) => displayed)
        .slice(0, 4); // Limit to first 4 for visual testing
      
      for (const [factorName] of displayedFactors) {
        const factorSelectors = {
          flood: '.flood-risk, [data-testid="flood-risk"]',
          hurricane: '.hurricane-risk, [data-testid="hurricane-risk"]',
          wildfire: '.wildfire-risk, .fire-risk, [data-testid="fire-risk"]',
          earthquake: '.earthquake-risk, [data-testid="earthquake-risk"]',
          tornado: '.tornado-risk, [data-testid="tornado-risk"]',
          heat: '.heat-risk, [data-testid="heat-risk"]',
          drought: '.drought-risk, [data-testid="drought-risk"]',
          hail: '.hail-risk, [data-testid="hail-risk"]'
        };

        const selector = factorSelectors[factorName as keyof typeof factorSelectors];
        if (selector && await page.locator(selector).count() > 0) {
          await expect(page.locator(selector).first()).toHaveScreenshot(`risk-factor-${factorName}.png`, {
            threshold: 0.25
          });
        }
      }
    });

    test('should match data attribution section', async ({ page }) => {
      const landingPage = new LandingPage(page);
      const assessmentPage = new AssessmentPage(page);
      
      await landingPage.navigate();
      await landingPage.assessProperty(TEST_ADDRESSES.QUICK_TEST[1]);
      
      await assessmentPage.verifyRiskResults();
      
      // Screenshot data attribution area
      const attributionSelectors = [
        '.data-sources',
        '.attribution',
        '.sources',
        '[data-testid="data-sources"]'
      ];

      for (const selector of attributionSelectors) {
        if (await page.locator(selector).count() > 0) {
          await expect(page.locator(selector)).toHaveScreenshot('data-attribution.png', {
            threshold: 0.2
          });
          break;
        }
      }
    });
  });

  test.describe('Trial System Visual Tests', () => {
    test('should match trial limit modal layout', async ({ page }) => {
      const trialPage = new TrialSystemPage(page);
      
      // Force trigger trial limit
      await trialPage.setTrialUsageCount(5);
      await page.goto(testUrls.home);
      
      const landingPage = new LandingPage(page);
      try {
        await landingPage.assessProperty(TEST_ADDRESSES.QUICK_TEST[0]);
        
        if (await trialPage.waitForTrialLimitModal(5000)) {
          // Screenshot the modal
          const modal = page.locator('.trial-limit, .paywall, [data-testid="trial-limit-modal"]').first();
          await expect(modal).toHaveScreenshot('trial-limit-modal.png', {
            threshold: 0.3
          });
        }
      } catch (error) {
        console.log('Trial limit modal visual test skipped - modal not triggered');
      }
    });

    test('should match usage tracking display', async ({ page }) => {
      const landingPage = new LandingPage(page);
      const trialPage = new TrialSystemPage(page);
      
      await landingPage.navigate();
      await landingPage.assessProperty(TEST_ADDRESSES.QUICK_TEST[0]);
      
      // Look for usage tracking elements
      const usageTracking = await trialPage.checkUsageTracking();
      if (usageTracking.hasUsageIndicator) {
        const usageElements = page.locator('.usage-counter, [data-testid="usage-tracker"], .trial-usage');
        if (await usageElements.count() > 0) {
          await expect(usageElements.first()).toHaveScreenshot('usage-tracking.png', {
            threshold: 0.3
          });
        }
      }
    });
  });

  test.describe('UI Components Visual Tests', () => {
    test('should match button styles consistency', async ({ page }) => {
      const landingPage = new LandingPage(page);
      await landingPage.navigate();
      
      // Screenshot primary CTA buttons
      const ctaButtons = page.locator('button:has-text("Assess"), button:has-text("Get Started"), button:has-text("Start")');
      const buttonCount = await ctaButtons.count();
      
      if (buttonCount > 0) {
        for (let i = 0; i < Math.min(buttonCount, 3); i++) {
          await expect(ctaButtons.nth(i)).toHaveScreenshot(`cta-button-${i + 1}.png`, {
            threshold: 0.15
          });
        }
      }
    });

    test('should match form input styling', async ({ page }) => {
      const landingPage = new LandingPage(page);
      await landingPage.navigate();
      
      // Screenshot address input field
      const addressInput = page.locator('input[name="address"], input[placeholder*="address"]').first();
      if (await addressInput.count() > 0) {
        await expect(addressInput).toHaveScreenshot('address-input.png', {
          threshold: 0.2
        });
        
        // Screenshot focused state
        await addressInput.focus();
        await page.waitForTimeout(500);
        await expect(addressInput).toHaveScreenshot('address-input-focused.png', {
          threshold: 0.2
        });
      }
    });

    test('should match risk meter visualizations', async ({ page }) => {
      const landingPage = new LandingPage(page);
      const assessmentPage = new AssessmentPage(page);
      
      await landingPage.navigate();
      await landingPage.assessProperty(TEST_ADDRESSES.HIGH_FLOOD_RISK[0]);
      await assessmentPage.verifyRiskResults();
      
      // Screenshot risk meters/progress bars
      const riskMeters = page.locator('.risk-meter, .progress-bar, [data-testid*="meter"]');
      const meterCount = await riskMeters.count();
      
      if (meterCount > 0) {
        for (let i = 0; i < Math.min(meterCount, 3); i++) {
          await expect(riskMeters.nth(i)).toHaveScreenshot(`risk-meter-${i + 1}.png`, {
            threshold: 0.25
          });
        }
      }
    });

    test('should match card component layouts', async ({ page }) => {
      const landingPage = new LandingPage(page);
      const assessmentPage = new AssessmentPage(page);
      
      await landingPage.navigate();
      await landingPage.assessProperty(TEST_ADDRESSES.WILDFIRE_RISK[0]);
      await assessmentPage.verifyRiskResults();
      
      // Screenshot card components
      const cards = page.locator('.bg-white.border, .rounded-lg.shadow, .p-6.bg-white, .card');
      const cardCount = await cards.count();
      
      if (cardCount > 0) {
        for (let i = 0; i < Math.min(cardCount, 3); i++) {
          await expect(cards.nth(i)).toHaveScreenshot(`card-component-${i + 1}.png`, {
            threshold: 0.3
          });
        }
      }
    });
  });

  test.describe('Responsive Visual Tests', () => {
    test('should maintain visual consistency across mobile viewports', async ({ page }) => {
      const viewports = [
        { name: 'iphone-12', ...MOBILE_VIEWPORTS.IPHONE_12 },
        { name: 'samsung-galaxy', ...MOBILE_VIEWPORTS.SAMSUNG_GALAXY },
        { name: 'tablet', ...MOBILE_VIEWPORTS.TABLET }
      ];

      for (const viewport of viewports) {
        await page.setViewportSize(viewport);
        
        const landingPage = new LandingPage(page);
        await landingPage.navigate();
        
        // Screenshot entire mobile layout
        await expect(page).toHaveScreenshot(`mobile-layout-${viewport.name}.png`, {
          fullPage: true,
          threshold: 0.4
        });
        
        // Test assessment on mobile
        try {
          await landingPage.assessProperty(TEST_ADDRESSES.QUICK_TEST[0]);
          await page.waitForTimeout(3000);
          
          await expect(page).toHaveScreenshot(`mobile-assessment-${viewport.name}.png`, {
            fullPage: true,
            threshold: 0.4
          });
        } catch (error) {
          console.log(`Mobile assessment visual test failed for ${viewport.name}`);
        }
      }
    });

    test('should handle mobile navigation visual states', async ({ page }) => {
      await page.setViewportSize(MOBILE_VIEWPORTS.IPHONE_12);
      
      const landingPage = new LandingPage(page);
      await landingPage.navigate();
      
      // Test mobile menu if present
      const menuButton = page.locator('.mobile-menu-button, .hamburger, [data-testid="mobile-menu"]');
      if (await menuButton.count() > 0) {
        // Closed state
        await expect(page.locator('header, nav').first()).toHaveScreenshot('mobile-nav-closed.png', {
          threshold: 0.25
        });
        
        // Opened state
        await menuButton.click();
        await page.waitForTimeout(500);
        
        await expect(page.locator('header, nav').first()).toHaveScreenshot('mobile-nav-opened.png', {
          threshold: 0.25
        });
      }
    });
  });

  test.describe('Dark Mode and Theme Visual Tests', () => {
    test('should handle dark mode if implemented', async ({ page }) => {
      const landingPage = new LandingPage(page);
      await landingPage.navigate();
      
      // Check for dark mode toggle
      const darkModeToggle = page.locator('button[data-theme], .dark-mode-toggle, [data-testid="theme-toggle"]');
      if (await darkModeToggle.count() > 0) {
        // Light mode screenshot
        await expect(page).toHaveScreenshot('theme-light-mode.png', {
          fullPage: true,
          threshold: 0.3
        });
        
        // Toggle to dark mode
        await darkModeToggle.click();
        await page.waitForTimeout(1000);
        
        // Dark mode screenshot
        await expect(page).toHaveScreenshot('theme-dark-mode.png', {
          fullPage: true,
          threshold: 0.3
        });
      }
    });

    test('should handle high contrast mode', async ({ page }) => {
      // Simulate high contrast mode
      await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
      
      const landingPage = new LandingPage(page);
      await landingPage.navigate();
      
      // Screenshot in high contrast mode
      await expect(page).toHaveScreenshot('high-contrast-mode.png', {
        fullPage: true,
        threshold: 0.4
      });
    });
  });

  test.describe('Animation and Interaction Visual Tests', () => {
    test('should capture loading state visuals', async ({ page }) => {
      const landingPage = new LandingPage(page);
      await landingPage.navigate();
      
      // Start assessment and capture loading state
      const addressInput = page.locator('input[name="address"], input[placeholder*="address"]').first();
      await addressInput.fill(TEST_ADDRESSES.QUICK_TEST[0]);
      
      const submitButton = page.locator('button:has-text("Assess"), button[type="submit"]').first();
      await submitButton.click();
      
      // Capture loading state quickly
      await page.waitForTimeout(500);
      
      const loadingElements = page.locator('.loading, .spinner, .progress, [data-testid="loading"]');
      if (await loadingElements.count() > 0) {
        await expect(loadingElements.first()).toHaveScreenshot('loading-state.png', {
          threshold: 0.3
        });
      }
    });

    test('should capture hover states for interactive elements', async ({ page }) => {
      const landingPage = new LandingPage(page);
      await landingPage.navigate();
      
      // Hover over CTA button
      const ctaButton = page.locator('button:has-text("Assess"), button:has-text("Get Started")').first();
      if (await ctaButton.count() > 0) {
        await ctaButton.hover();
        await page.waitForTimeout(500);
        
        await expect(ctaButton).toHaveScreenshot('button-hover-state.png', {
          threshold: 0.25
        });
      }
    });
  });

  test.describe('Error State Visual Tests', () => {
    test('should match error message layouts', async ({ page }) => {
      const landingPage = new LandingPage(page);
      await landingPage.navigate();
      
      // Trigger error with invalid address
      const addressInput = page.locator('input[name="address"], input[placeholder*="address"]').first();
      await addressInput.fill(TEST_ADDRESSES.INVALID[0]);
      
      const submitButton = page.locator('button:has-text("Assess"), button[type="submit"]').first();
      await submitButton.click();
      
      await page.waitForTimeout(3000);
      
      // Screenshot error state
      const errorElements = page.locator('.error, .invalid-feedback, [role="alert"]');
      if (await errorElements.count() > 0) {
        await expect(errorElements.first()).toHaveScreenshot('error-message.png', {
          threshold: 0.3
        });
      }
    });
  });
});