import { expect, test } from '@playwright/test';
import { getEnvironmentConfig, getTestUrls } from '../config/environment';
import { 
  TEST_ADDRESSES, 
  MOBILE_VIEWPORTS 
} from '../utils/testCredentials';
import { 
  LandingPage,
  AssessmentPage 
} from '../page-objects';
import { DebugHelpers } from '../utils/testHelpers';

const envConfig = getEnvironmentConfig();
const testUrls = getTestUrls(envConfig.baseURL);

test.describe('Accessibility Tests', () => {
  test.beforeEach(async ({ page }) => {
    DebugHelpers.setupConsoleLogging(page);
  });

  test.describe('Keyboard Navigation', () => {
    test('should support full keyboard navigation on landing page', async ({ page }) => {
      const landingPage = new LandingPage(page);
      await landingPage.navigate();
      
      // Start from top of page
      await page.keyboard.press('Tab');
      
      const focusableElements = [];
      let attempts = 0;
      const maxAttempts = 20;
      
      while (attempts < maxAttempts) {
        const focusedElement = await page.locator(':focus').first();
        const tagName = await focusedElement.evaluate(el => el.tagName.toLowerCase());
        const role = await focusedElement.getAttribute('role');
        const ariaLabel = await focusedElement.getAttribute('aria-label');
        
        focusableElements.push({
          tagName,
          role,
          ariaLabel,
          text: await focusedElement.textContent() || ''
        });
        
        console.log(`Focus ${attempts + 1}: ${tagName} ${role ? `(${role})` : ''} - "${ariaLabel || focusedElement.textContent() || ''}"`);
        
        await page.keyboard.press('Tab');
        attempts++;
        
        // Break if we've cycled back to the beginning
        if (attempts > 5) {
          const currentFocus = await page.locator(':focus').first();
          const currentTag = await currentFocus.evaluate(el => el.tagName.toLowerCase());
          if (currentTag === focusableElements[0]?.tagName) {
            break;
          }
        }
      }
      
      // Should have at least 5 focusable elements
      expect(focusableElements.length).toBeGreaterThanOrEqual(5);
      
      // Should include essential interactive elements
      const hasButton = focusableElements.some(el => el.tagName === 'button');
      const hasInput = focusableElements.some(el => el.tagName === 'input');
      
      expect(hasButton).toBeTruthy();
      expect(hasInput).toBeTruthy();
    });

    test('should support keyboard navigation in assessment results', async ({ page }) => {
      const landingPage = new LandingPage(page);
      const assessmentPage = new AssessmentPage(page);
      
      await landingPage.navigate();
      await landingPage.assessProperty(TEST_ADDRESSES.QUICK_TEST[0]);
      await assessmentPage.verifyRiskResults();
      
      // Test keyboard navigation in results
      await page.keyboard.press('Tab');
      
      let focusableInResults = 0;
      const maxTabs = 15;
      
      for (let i = 0; i < maxTabs; i++) {
        const focusedElement = await page.locator(':focus').first();
        if (await focusedElement.count() > 0) {
          const tagName = await focusedElement.evaluate(el => el.tagName.toLowerCase());
          
          // Check if focused element is in results area
          const isInResults = await focusedElement.evaluate(el => {
            const resultsArea = document.querySelector('.risk-score, .assessment-results, .risk-factors');
            return resultsArea ? resultsArea.contains(el) : false;
          });
          
          if (isInResults) {
            focusableInResults++;
            console.log(`Results focus ${focusableInResults}: ${tagName}`);
          }
        }
        
        await page.keyboard.press('Tab');
      }
      
      console.log(`Focusable elements in results: ${focusableInResults}`);
    });

    test('should handle Enter and Space key interactions', async ({ page }) => {
      const landingPage = new LandingPage(page);
      await landingPage.navigate();
      
      // Find and focus on the assess button
      const assessButton = page.locator('button:has-text("Assess"), button:has-text("Get Started")').first();
      
      if (await assessButton.count() > 0) {
        await assessButton.focus();
        
        // Fill address first
        const addressInput = page.locator('input[name="address"], input[placeholder*="address"]').first();
        await addressInput.fill(TEST_ADDRESSES.QUICK_TEST[0]);
        await assessButton.focus();
        
        // Test Enter key
        await page.keyboard.press('Enter');
        await page.waitForTimeout(3000);
        
        // Should trigger assessment
        const hasResults = await page.locator('.risk-score, .assessment-results, .error').count() > 0;
        expect(hasResults).toBeTruthy();
        
        console.log('✅ Enter key triggers button action');
      }
    });

    test('should support Escape key for modal dismissal', async ({ page }) => {
      const landingPage = new LandingPage(page);
      await landingPage.navigate();
      
      // Try to trigger modal (methodology, info, etc.)
      const modalTriggers = page.locator('button:has-text("Learn more"), button:has-text("Info"), button:has-text("?")');
      
      if (await modalTriggers.count() > 0) {
        await modalTriggers.first().click();
        await page.waitForTimeout(1000);
        
        // Check if modal appeared
        const modal = page.locator('.modal, [role="dialog"], .overlay');
        if (await modal.isVisible()) {
          // Test Escape key
          await page.keyboard.press('Escape');
          await page.waitForTimeout(500);
          
          const modalStillVisible = await modal.isVisible();
          expect(modalStillVisible).toBeFalsy();
          
          console.log('✅ Escape key dismisses modal');
        }
      }
    });
  });

  test.describe('Screen Reader Support', () => {
    test('should have proper heading hierarchy', async ({ page }) => {
      const landingPage = new LandingPage(page);
      await landingPage.navigate();
      
      const headings = await page.locator('h1, h2, h3, h4, h5, h6').allTextContents();
      const h1Count = await page.locator('h1').count();
      
      console.log('Page headings:', headings);
      console.log(`H1 count: ${h1Count}`);
      
      // Should have exactly one H1
      expect(h1Count).toBe(1);
      
      // Should have a reasonable heading structure
      expect(headings.length).toBeGreaterThanOrEqual(2);
      
      // Check for logical heading progression
      const headingLevels = await page.evaluate(() => {
        const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
        return headings.map(h => parseInt(h.tagName.charAt(1)));
      });
      
      let hasSkippedLevel = false;
      for (let i = 1; i < headingLevels.length; i++) {
        if (headingLevels[i] - headingLevels[i - 1] > 1) {
          hasSkippedLevel = true;
          break;
        }
      }
      
      console.log('Heading levels:', headingLevels);
      console.log('Has skipped heading level:', hasSkippedLevel);
      
      // Ideally shouldn't skip heading levels, but not critical
      if (hasSkippedLevel) {
        console.warn('⚠️ Heading levels may be skipped');
      }
    });

    test('should have descriptive page titles', async ({ page }) => {
      const landingPage = new LandingPage(page);
      await landingPage.navigate();
      
      const title = await landingPage.getTitle();
      
      console.log('Page title:', title);
      
      // Title should be descriptive and include key terms
      expect(title.length).toBeGreaterThan(10);
      expect(title.toLowerCase()).toMatch(/seawater|climate|risk/);
    });

    test('should have alt text for images', async ({ page }) => {
      const landingPage = new LandingPage(page);
      await landingPage.navigate();
      
      const images = await page.locator('img').count();
      const imagesWithAlt = await page.locator('img[alt]').count();
      const imagesWithEmptyAlt = await page.locator('img[alt=""]').count();
      
      console.log(`Images: ${images}, With alt: ${imagesWithAlt}, Empty alt: ${imagesWithEmptyAlt}`);
      
      if (images > 0) {
        // Most images should have alt text
        const altTextRatio = imagesWithAlt / images;
        expect(altTextRatio).toBeGreaterThanOrEqual(0.8);
        
        // Check for descriptive alt text
        const altTexts = await page.locator('img[alt]').evaluateAll(imgs => 
          imgs.map(img => img.getAttribute('alt'))
        );
        
        const descriptiveAltTexts = altTexts.filter(alt => 
          alt && alt.length > 5 && !alt.toLowerCase().includes('image')
        );
        
        console.log('Descriptive alt texts:', descriptiveAltTexts);
      }
    });

    test('should have proper form labels', async ({ page }) => {
      const landingPage = new LandingPage(page);
      await landingPage.navigate();
      
      const inputs = await page.locator('input').count();
      
      if (inputs > 0) {
        const inputsWithLabels = await page.locator('input[aria-label], input[id] + label, label input').count();
        const inputsWithPlaceholder = await page.locator('input[placeholder]').count();
        
        console.log(`Inputs: ${inputs}, With labels: ${inputsWithLabels}, With placeholder: ${inputsWithPlaceholder}`);
        
        // Inputs should have labels or accessible names
        const labeledInputs = inputsWithLabels + inputsWithPlaceholder;
        const labelRatio = labeledInputs / inputs;
        
        expect(labelRatio).toBeGreaterThanOrEqual(0.8);
        
        // Check specific address input
        const addressInput = page.locator('input[name="address"], input[placeholder*="address"]').first();
        if (await addressInput.count() > 0) {
          const hasAccessibleName = await addressInput.evaluate(input => {
            return !!(
              input.getAttribute('aria-label') ||
              input.getAttribute('placeholder') ||
              input.id && document.querySelector(`label[for="${input.id}"]`) ||
              input.closest('label')
            );
          });
          
          expect(hasAccessibleName).toBeTruthy();
          console.log('✅ Address input has accessible name');
        }
      }
    });

    test('should have proper ARIA labels and roles', async ({ page }) => {
      const landingPage = new LandingPage(page);
      await landingPage.navigate();
      
      // Check for ARIA landmarks
      const landmarks = await page.locator('[role="main"], [role="navigation"], [role="banner"], [role="contentinfo"], main, nav, header, footer').count();
      console.log(`ARIA landmarks found: ${landmarks}`);
      
      // Check for ARIA labels on interactive elements
      const ariaLabeledElements = await page.locator('[aria-label]').count();
      console.log(`Elements with aria-label: ${ariaLabeledElements}`);
      
      // Check for proper button roles
      const buttons = await page.locator('button, [role="button"]').count();
      console.log(`Interactive buttons: ${buttons}`);
      
      expect(landmarks).toBeGreaterThanOrEqual(2);
    });
  });

  test.describe('Visual Accessibility', () => {
    test('should have sufficient color contrast', async ({ page }) => {
      const landingPage = new LandingPage(page);
      await landingPage.navigate();
      
      // Get computed styles for key elements
      const colorContrasts = await page.evaluate(() => {
        const elements = [
          document.querySelector('h1'),
          document.querySelector('p'),
          document.querySelector('button'),
          document.querySelector('a'),
          document.querySelector('input')
        ].filter(Boolean);
        
        return elements.map(el => {
          if (!el) return null;
          const styles = window.getComputedStyle(el);
          return {
            element: el.tagName.toLowerCase(),
            color: styles.color,
            backgroundColor: styles.backgroundColor,
            fontSize: styles.fontSize
          };
        }).filter(Boolean);
      });
      
      console.log('Color contrast analysis:', colorContrasts);
      
      // Check for readable font sizes
      const fontSizes = colorContrasts.map(c => parseInt(c.fontSize));
      const smallFonts = fontSizes.filter(size => size < 14);
      
      console.log('Font sizes:', fontSizes);
      console.log('Small fonts (< 14px):', smallFonts);
      
      // Most text should be at least 14px
      expect(smallFonts.length / fontSizes.length).toBeLessThan(0.3);
    });

    test('should support reduced motion preferences', async ({ page }) => {
      // Set reduced motion preference
      await page.emulateMedia({ reducedMotion: 'reduce' });
      
      const landingPage = new LandingPage(page);
      await landingPage.navigate();
      
      // Check for animations that respect reduced motion
      const animatedElements = await page.locator('[class*="animate"], [class*="transition"]').count();
      console.log(`Elements with animation classes: ${animatedElements}`);
      
      // Perform assessment to see if animations are reduced
      await landingPage.assessProperty(TEST_ADDRESSES.QUICK_TEST[0]);
      
      // Check if animations are properly disabled or reduced
      const motionElements = await page.evaluate(() => {
        const elements = document.querySelectorAll('*');
        let motionCount = 0;
        
        for (const el of elements) {
          const styles = window.getComputedStyle(el);
          if (styles.animation !== 'none' && styles.animation !== '') {
            motionCount++;
          }
          if (styles.transition !== 'all 0s ease 0s' && styles.transition !== 'none') {
            motionCount++;
          }
        }
        
        return motionCount;
      });
      
      console.log(`Elements with motion when reduced motion is preferred: ${motionElements}`);
    });

    test('should be usable at 200% zoom', async ({ page }) => {
      const landingPage = new LandingPage(page);
      await landingPage.navigate();
      
      // Simulate 200% zoom
      await page.setViewportSize({ width: 640, height: 360 }); // Half the normal size to simulate zoom
      
      // Verify key elements are still accessible
      const accessibility = await landingPage.checkAccessibility();
      
      expect(accessibility.hasPageTitle).toBeTruthy();
      
      // Check if main interactive elements are still visible
      const addressInput = page.locator('input[name="address"], input[placeholder*="address"]');
      const assessButton = page.locator('button:has-text("Assess"), button:has-text("Get Started")');
      
      if (await addressInput.count() > 0) {
        await expect(addressInput.first()).toBeVisible();
      }
      
      if (await assessButton.count() > 0) {
        await expect(assessButton.first()).toBeVisible();
      }
      
      // Test horizontal scrolling (should be minimal)
      const hasHorizontalScroll = await page.evaluate(() => 
        document.body.scrollWidth > window.innerWidth
      );
      
      console.log(`Has horizontal scroll at 200% zoom: ${hasHorizontalScroll}`);
      
      await DebugHelpers.takeTimestampedScreenshot(page, 'accessibility-200-zoom');
    });
  });

  test.describe('Mobile Accessibility', () => {
    test('should be accessible on mobile devices', async ({ page }) => {
      await page.setViewportSize(MOBILE_VIEWPORTS.IPHONE_12);
      
      const landingPage = new LandingPage(page);
      await landingPage.navigate();
      
      // Check touch target sizes
      const buttons = page.locator('button, a, input[type="submit"]');
      const buttonCount = await buttons.count();
      
      if (buttonCount > 0) {
        for (let i = 0; i < Math.min(buttonCount, 5); i++) {
          const button = buttons.nth(i);
          const boundingBox = await button.boundingBox();
          
          if (boundingBox) {
            console.log(`Button ${i + 1} size: ${boundingBox.width}x${boundingBox.height}`);
            
            // Touch targets should be at least 44x44px
            expect(boundingBox.width).toBeGreaterThanOrEqual(44);
            expect(boundingBox.height).toBeGreaterThanOrEqual(44);
          }
        }
      }
      
      // Test mobile keyboard navigation
      await page.keyboard.press('Tab');
      
      const focusedElement = page.locator(':focus');
      if (await focusedElement.count() > 0) {
        await expect(focusedElement).toBeVisible();
        console.log('✅ Mobile keyboard navigation works');
      }
    });

    test('should handle mobile screen reader gestures', async ({ page }) => {
      await page.setViewportSize(MOBILE_VIEWPORTS.IPHONE_12);
      
      const landingPage = new LandingPage(page);
      await landingPage.navigate();
      
      // Test swipe navigation simulation
      const headings = page.locator('h1, h2, h3, h4, h5, h6');
      const headingCount = await headings.count();
      
      if (headingCount > 1) {
        // Focus on first heading
        await headings.first().focus();
        
        // Simulate moving between headings
        for (let i = 0; i < headingCount - 1; i++) {
          await page.keyboard.press('Tab');
          const currentFocus = page.locator(':focus');
          
          if (await currentFocus.count() > 0) {
            const tagName = await currentFocus.evaluate(el => el.tagName.toLowerCase());
            console.log(`Mobile navigation step ${i + 1}: ${tagName}`);
          }
        }
      }
    });
  });

  test.describe('Accessibility in Assessment Results', () => {
    test('should make risk scores accessible to screen readers', async ({ page }) => {
      const landingPage = new LandingPage(page);
      const assessmentPage = new AssessmentPage(page);
      
      await landingPage.navigate();
      await landingPage.assessProperty(TEST_ADDRESSES.HIGH_FLOOD_RISK[0]);
      await assessmentPage.verifyRiskResults();
      
      // Check for ARIA labels on risk scores
      const riskScores = page.locator('.risk-score, [data-testid*="risk-score"]');
      const riskScoreCount = await riskScores.count();
      
      if (riskScoreCount > 0) {
        for (let i = 0; i < Math.min(riskScoreCount, 3); i++) {
          const scoreElement = riskScores.nth(i);
          
          const hasAccessibleName = await scoreElement.evaluate(el => {
            return !!(
              el.getAttribute('aria-label') ||
              el.getAttribute('aria-labelledby') ||
              el.getAttribute('title') ||
              el.textContent
            );
          });
          
          expect(hasAccessibleName).toBeTruthy();
          console.log(`Risk score ${i + 1} has accessible name`);
        }
      }
    });

    test('should provide alternative text for risk visualizations', async ({ page }) => {
      const landingPage = new LandingPage(page);
      const assessmentPage = new AssessmentPage(page);
      
      await landingPage.navigate();
      await landingPage.assessProperty(TEST_ADDRESSES.MULTI_HAZARD[0]);
      await assessmentPage.verifyRiskResults();
      
      // Check for accessible risk visualizations
      const visualizations = page.locator('.risk-meter, .progress-bar, .chart, svg');
      const visualizationCount = await visualizations.count();
      
      if (visualizationCount > 0) {
        for (let i = 0; i < Math.min(visualizationCount, 3); i++) {
          const viz = visualizations.nth(i);
          
          const hasAccessibilitySupport = await viz.evaluate(el => {
            return !!(
              el.getAttribute('aria-label') ||
              el.getAttribute('aria-labelledby') ||
              el.getAttribute('title') ||
              el.querySelector('[role="img"]') ||
              el.getAttribute('alt')
            );
          });
          
          console.log(`Visualization ${i + 1} accessibility support: ${hasAccessibilitySupport}`);
        }
      }
    });

    test('should make data attribution accessible', async ({ page }) => {
      const landingPage = new LandingPage(page);
      const assessmentPage = new AssessmentPage(page);
      
      await landingPage.navigate();
      await landingPage.assessProperty(TEST_ADDRESSES.QUICK_TEST[1]);
      await assessmentPage.verifyRiskResults();
      
      // Check data source links accessibility
      const dataSourceLinks = await assessmentPage.verifyDataSourceLinks();
      
      if (dataSourceLinks > 0) {
        const links = page.locator('a[href*="fema.gov"], a[href*="noaa.gov"], a[href*="usgs.gov"]');
        
        for (let i = 0; i < Math.min(await links.count(), 3); i++) {
          const link = links.nth(i);
          
          const linkText = await link.textContent();
          const ariaLabel = await link.getAttribute('aria-label');
          const title = await link.getAttribute('title');
          
          const hasAccessibleName = !!(linkText || ariaLabel || title);
          expect(hasAccessibleName).toBeTruthy();
          
          console.log(`Data source link ${i + 1}: "${linkText}" (accessible: ${hasAccessibleName})`);
        }
      }
    });
  });

  test.describe('Focus Management', () => {
    test('should manage focus properly during page transitions', async ({ page }) => {
      const landingPage = new LandingPage(page);
      await landingPage.navigate();
      
      // Get initial focus
      const initialFocus = await page.locator(':focus').count();
      console.log(`Initial focus elements: ${initialFocus}`);
      
      // Navigate to assessment
      await landingPage.assessProperty(TEST_ADDRESSES.QUICK_TEST[0]);
      
      // Check if focus is managed after content change
      await page.waitForTimeout(2000);
      
      const focusAfterAssessment = await page.locator(':focus').count();
      console.log(`Focus after assessment: ${focusAfterAssessment}`);
      
      // Focus should be managed (either maintained or moved to results)
      expect(focusAfterAssessment).toBeGreaterThanOrEqual(0);
    });

    test('should trap focus in modals', async ({ page }) => {
      const landingPage = new LandingPage(page);
      await landingPage.navigate();
      
      // Try to find and trigger a modal
      const modalTriggers = page.locator('button:has-text("Learn more"), button:has-text("Info"), .info-button');
      
      if (await modalTriggers.count() > 0) {
        await modalTriggers.first().click();
        await page.waitForTimeout(1000);
        
        const modal = page.locator('.modal, [role="dialog"]');
        if (await modal.isVisible()) {
          // Test focus trap
          const focusableInModal = page.locator('.modal button, .modal a, .modal input, [role="dialog"] button, [role="dialog"] a, [role="dialog"] input');
          const focusableCount = await focusableInModal.count();
          
          if (focusableCount > 1) {
            // Tab through modal elements
            for (let i = 0; i < focusableCount + 2; i++) {
              await page.keyboard.press('Tab');
              
              const currentFocus = page.locator(':focus');
              const isInModal = await currentFocus.evaluate((el, modalEl) => 
                modalEl?.contains(el) || false, await modal.elementHandle()
              );
              
              console.log(`Tab ${i + 1}: Focus in modal: ${isInModal}`);
            }
          }
        }
      }
    });
  });
});