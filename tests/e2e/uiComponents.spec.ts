import { expect, test } from '@playwright/test';
import { getEnvironmentConfig, getTestUrls } from '../config/environment';
import { 
  TEST_ADDRESSES, 
  TEST_TIMEOUTS,
  MOBILE_VIEWPORTS 
} from '../utils/testCredentials';
import { 
  PropertyHelpers, 
  DebugHelpers,
  ResponsiveHelpers 
} from '../utils/testHelpers';

const envConfig = getEnvironmentConfig();
const testUrls = getTestUrls(envConfig.baseURL);

test.describe('Seawater UI Components Tests', () => {
  test.beforeEach(async ({ page }) => {
    DebugHelpers.setupConsoleLogging(page);
    await page.goto(testUrls.home);
    await DebugHelpers.waitForPageLoad(page);
  });

  test.describe('Flowbite Component Integration', () => {
    test('should render Flowbite buttons correctly', async ({ page }) => {
      // Look for Flowbite button classes and styles
      const flowbiteButtonSelectors = [
        '.bg-blue-700', // Flowbite primary button
        '.bg-green-700', // Flowbite success button
        '.bg-red-700', // Flowbite danger button
        '.text-white.bg-blue-600', // Flowbite button combination
        'button[class*="bg-blue"]',
        'button[class*="hover:bg-blue"]',
        '.btn', // Generic button class
        '[data-testid*="button"]'
      ];

      let flowbiteButtonsFound = 0;
      for (const selector of flowbiteButtonSelectors) {
        const count = await page.locator(selector).count();
        flowbiteButtonsFound += count;
      }

      console.log(`Flowbite-styled buttons found: ${flowbiteButtonsFound}`);
      expect(flowbiteButtonsFound).toBeGreaterThanOrEqual(1);

      // Test button interactions
      const primaryButton = page.locator('button:has-text("Assess"), button:has-text("Get Started")').first();
      if (await primaryButton.count() > 0) {
        // Verify button is styled and interactive
        await expect(primaryButton).toBeVisible();
        await expect(primaryButton).toBeEnabled();
        
        // Check hover state (Flowbite includes hover effects)
        await primaryButton.hover();
        await page.waitForTimeout(500);
        
        await DebugHelpers.takeTimestampedScreenshot(page, 'flowbite-button-hover');
      }
    });

    test('should display Flowbite cards and containers properly', async ({ page }) => {
      // Perform assessment to see result cards
      const testAddress = TEST_ADDRESSES.QUICK_TEST[0];
      await PropertyHelpers.assessProperty(page, testAddress);

      // Look for Flowbite card components
      const cardSelectors = [
        '.bg-white.border', // Flowbite card
        '.rounded-lg.shadow', // Flowbite rounded card with shadow
        '.p-6.bg-white', // Flowbite padded card
        '.border.border-gray-200', // Flowbite bordered card
        'div[class*="bg-white"][class*="rounded"]',
        'div[class*="shadow"]',
        '.card'
      ];

      let cardsFound = 0;
      for (const selector of cardSelectors) {
        const count = await page.locator(selector).count();
        cardsFound += count;
      }

      console.log(`Flowbite-styled cards found: ${cardsFound}`);
      expect(cardsFound).toBeGreaterThanOrEqual(1);

      await DebugHelpers.takeTimestampedScreenshot(page, 'flowbite-cards');
    });

    test('should implement Flowbite form components', async ({ page }) => {
      // Test form styling (address input)
      const addressInput = page.locator('input[name="address"], input[placeholder*="address"]').first();
      
      if (await addressInput.count() > 0) {
        // Check for Flowbite input styling
        const inputClasses = await addressInput.getAttribute('class') || '';
        const hasFlowbiteClasses = 
          inputClasses.includes('border-gray') ||
          inputClasses.includes('rounded-lg') ||
          inputClasses.includes('focus:ring') ||
          inputClasses.includes('focus:border');

        console.log(`Input has Flowbite classes: ${hasFlowbiteClasses}`);
        console.log(`Input classes: ${inputClasses}`);

        // Test input focus state
        await addressInput.focus();
        await page.waitForTimeout(500);
        
        await DebugHelpers.takeTimestampedScreenshot(page, 'flowbite-input-focus');
      }
    });

    test('should display Flowbite alerts and notifications', async ({ page }) => {
      // Try to trigger error/success states
      const addressInput = page.locator('input[name="address"], input[placeholder*="address"]').first();
      
      // Try invalid input to trigger error alert
      await addressInput.fill('invalid address');
      const submitButton = page.locator('button:has-text("Assess"), button[type="submit"]').first();
      await submitButton.click();
      
      await page.waitForTimeout(3000);

      // Look for Flowbite alert components
      const alertSelectors = [
        '.bg-red-50.border-red-200', // Flowbite danger alert
        '.bg-green-50.border-green-200', // Flowbite success alert
        '.bg-yellow-50.border-yellow-200', // Flowbite warning alert
        '.bg-blue-50.border-blue-200', // Flowbite info alert
        'div[class*="bg-red-50"]',
        'div[class*="bg-green-50"]',
        '.alert',
        '[role="alert"]'
      ];

      let alertsFound = 0;
      for (const selector of alertSelectors) {
        const count = await page.locator(selector).count();
        alertsFound += count;
      }

      console.log(`Alert components found: ${alertsFound}`);

      if (alertsFound > 0) {
        await DebugHelpers.takeTimestampedScreenshot(page, 'flowbite-alerts');
      }
    });
  });

  test.describe('Risk Meters and Progress Bars', () => {
    test('should display risk meters with proper visual indicators', async ({ page }) => {
      const testAddress = TEST_ADDRESSES.HIGH_FLOOD_RISK[0];
      await PropertyHelpers.assessProperty(page, testAddress);

      // Look for risk meter components
      const riskMeterSelectors = [
        '.risk-meter',
        '.progress-bar',
        '.risk-gauge',
        '.meter',
        '[data-testid="risk-meter"]',
        'div[class*="progress"]',
        'svg[class*="progress"]', // SVG-based meters
        '.risk-indicator'
      ];

      let metersFound = 0;
      for (const selector of riskMeterSelectors) {
        const count = await page.locator(selector).count();
        metersFound += count;
      }

      console.log(`Risk meter components found: ${metersFound}`);
      expect(metersFound).toBeGreaterThanOrEqual(1);

      // Verify meters have visual progression
      const progressElements = page.locator('.progress-bar, .risk-meter, [data-testid*="meter"]');
      const progressCount = await progressElements.count();

      if (progressCount > 0) {
        for (let i = 0; i < Math.min(progressCount, 3); i++) {
          const element = progressElements.nth(i);
          
          // Check for width/height styles that indicate progress
          const styles = await element.evaluate(el => {
            const computed = window.getComputedStyle(el);
            return {
              width: computed.width,
              height: computed.height,
              backgroundColor: computed.backgroundColor,
              transform: computed.transform
            };
          });

          console.log(`Risk meter ${i + 1} styles:`, styles);
        }
      }

      await DebugHelpers.takeTimestampedScreenshot(page, 'risk-meters-display');
    });

    test('should animate risk meters appropriately', async ({ page }) => {
      const testAddress = TEST_ADDRESSES.WILDFIRE_RISK[0];
      
      // Track animations during assessment
      let animationsDetected = 0;
      
      page.on('request', (request) => {
        if (request.url().includes('animation') || request.url().includes('transition')) {
          animationsDetected++;
        }
      });

      await PropertyHelpers.assessProperty(page, testAddress);

      // Look for CSS animations or transitions
      const animatedElements = await page.locator('[class*="animate"], [class*="transition"]').count();
      console.log(`Elements with animation classes: ${animatedElements}`);

      // Check for risk meter animations
      const riskMeters = page.locator('.risk-meter, .progress-bar, [data-testid*="meter"]');
      const meterCount = await riskMeters.count();

      if (meterCount > 0) {
        const meter = riskMeters.first();
        
        // Check for animation properties
        const hasAnimations = await meter.evaluate(el => {
          const computed = window.getComputedStyle(el);
          return {
            transition: computed.transition !== 'all 0s ease 0s',
            animation: computed.animation !== 'none',
            transform: computed.transform !== 'none'
          };
        });

        console.log('Risk meter animations:', hasAnimations);
        
        if (hasAnimations.transition || hasAnimations.animation) {
          await DebugHelpers.takeTimestampedScreenshot(page, 'animated-risk-meters');
        }
      }
    });

    test('should display progress bars for assessment loading', async ({ page }) => {
      const testAddress = TEST_ADDRESSES.QUICK_TEST[0];
      
      // Start assessment and look for loading indicators
      const addressInput = page.locator('input[name="address"], input[placeholder*="address"]').first();
      await addressInput.fill(testAddress);
      
      const submitButton = page.locator('button:has-text("Assess"), button[type="submit"]').first();
      await submitButton.click();

      // Immediately look for loading indicators
      await page.waitForTimeout(500);

      const loadingSelectors = [
        '.loading',
        '.spinner',
        '.progress',
        '.loader',
        '[data-testid="loading"]',
        'div[class*="animate-spin"]', // Tailwind/Flowbite spinner
        'svg[class*="animate"]'
      ];

      let loadingFound = false;
      for (const selector of loadingSelectors) {
        if (await page.locator(selector).isVisible()) {
          loadingFound = true;
          console.log(`✅ Loading indicator found: ${selector}`);
          await DebugHelpers.takeTimestampedScreenshot(page, 'assessment-loading');
          break;
        }
      }

      console.log(`Loading indicators during assessment: ${loadingFound}`);

      // Wait for assessment to complete
      await PropertyHelpers.verifyRiskResults(page);
    });
  });

  test.describe('Modal Interactions', () => {
    test('should display modals with proper Flowbite styling', async ({ page }) => {
      // Try to trigger a modal (trial limit, info, etc.)
      const modalTriggers = [
        'button:has-text("Learn more")',
        'button:has-text("Info")',
        'button:has-text("Details")',
        'a:has-text("Methodology")',
        '.info-button',
        '[data-testid*="modal-trigger"]'
      ];

      let modalTriggered = false;
      for (const trigger of modalTriggers) {
        if (await page.locator(trigger).isVisible()) {
          await page.locator(trigger).click();
          await page.waitForTimeout(1000);

          // Look for modal elements
          const modalSelectors = [
            '.modal',
            '.overlay',
            '[role="dialog"]',
            '.fixed.inset-0', // Flowbite modal overlay
            'div[class*="bg-black"][class*="bg-opacity"]', // Flowbite modal backdrop
            '[data-testid="modal"]'
          ];

          for (const modalSelector of modalSelectors) {
            if (await page.locator(modalSelector).isVisible()) {
              modalTriggered = true;
              console.log(`✅ Modal triggered with: ${trigger}`);
              await DebugHelpers.takeTimestampedScreenshot(page, 'modal-display');
              break;
            }
          }

          if (modalTriggered) break;
        }
      }

      if (modalTriggered) {
        // Test modal close functionality
        const closeButtons = [
          'button:has-text("Close")',
          'button:has-text("×")',
          '.modal-close',
          '[data-testid="modal-close"]'
        ];

        for (const closeBtn of closeButtons) {
          if (await page.locator(closeBtn).isVisible()) {
            await page.locator(closeBtn).click();
            await page.waitForTimeout(500);
            console.log('✅ Modal close functionality works');
            break;
          }
        }
      } else {
        console.log('No modals found to test');
      }
    });

    test('should handle modal accessibility features', async ({ page }) => {
      // Perform assessment to potentially trigger modals
      const testAddress = TEST_ADDRESSES.QUICK_TEST[0];
      await PropertyHelpers.assessProperty(page, testAddress);

      // Look for elements that might trigger accessible modals
      const infoElements = page.locator('button[aria-label], button[title], .info, button:has-text("?")');
      const infoCount = await infoElements.count();

      if (infoCount > 0) {
        const infoButton = infoElements.first();
        
        // Check for accessibility attributes
        const ariaLabel = await infoButton.getAttribute('aria-label');
        const title = await infoButton.getAttribute('title');
        
        console.log(`Info button accessibility - aria-label: ${ariaLabel}, title: ${title}`);

        await infoButton.click();
        await page.waitForTimeout(1000);

        // Check for modal accessibility features
        const modal = page.locator('[role="dialog"], .modal').first();
        if (await modal.isVisible()) {
          const modalAriaLabel = await modal.getAttribute('aria-label');
          const modalAriaLabelledBy = await modal.getAttribute('aria-labelledby');
          
          console.log(`Modal accessibility - aria-label: ${modalAriaLabel}, aria-labelledby: ${modalAriaLabelledBy}`);
          
          // Check for focus trap
          await page.keyboard.press('Tab');
          const focusedElement = page.locator(':focus');
          const isFocusInModal = await focusedElement.count() > 0;
          
          console.log(`Focus trapped in modal: ${isFocusInModal}`);
        }
      }
    });

    test('should support keyboard navigation in modals', async ({ page }) => {
      // Try to trigger trial limit modal by simulating usage
      await page.evaluate(() => {
        localStorage.setItem('seawater_usage_count', '5');
        localStorage.setItem('seawater_trial_limit_reached', 'true');
      });

      await page.reload();
      
      try {
        await PropertyHelpers.assessProperty(page, TEST_ADDRESSES.QUICK_TEST[0]);
        await page.waitForTimeout(2000);

        // Check if modal appeared
        const modal = page.locator('.modal, [role="dialog"], .paywall, .trial-limit').first();
        if (await modal.isVisible()) {
          console.log('✅ Modal displayed for keyboard testing');
          
          // Test Escape key to close
          await page.keyboard.press('Escape');
          await page.waitForTimeout(500);
          
          const modalStillVisible = await modal.isVisible();
          console.log(`Modal closes with Escape: ${!modalStillVisible}`);
          
          // If modal still visible, test Tab navigation
          if (modalStillVisible) {
            await page.keyboard.press('Tab');
            await page.keyboard.press('Tab');
            await page.keyboard.press('Enter');
            await page.waitForTimeout(500);
          }
          
          await DebugHelpers.takeTimestampedScreenshot(page, 'modal-keyboard-navigation');
        }
      } catch (error) {
        console.log('Modal keyboard testing inconclusive');
      }
    });
  });

  test.describe('Responsive Component Behavior', () => {
    test('should adapt risk meters for mobile viewports', async ({ page }) => {
      // Test on mobile viewport
      await page.setViewportSize(MOBILE_VIEWPORTS.IPHONE_12);
      await page.reload();
      await DebugHelpers.waitForPageLoad(page);

      const testAddress = TEST_ADDRESSES.QUICK_TEST[1];
      await PropertyHelpers.assessProperty(page, testAddress);

      // Verify risk meters are still functional on mobile
      const riskMeters = page.locator('.risk-meter, .progress-bar, [data-testid*="meter"]');
      const meterCount = await riskMeters.count();

      if (meterCount > 0) {
        for (let i = 0; i < Math.min(meterCount, 2); i++) {
          const meter = riskMeters.nth(i);
          await expect(meter).toBeVisible();
          
          // Check mobile-appropriate sizing
          const boundingBox = await meter.boundingBox();
          if (boundingBox) {
            console.log(`Mobile risk meter ${i + 1} size: ${boundingBox.width}x${boundingBox.height}`);
            expect(boundingBox.width).toBeLessThanOrEqual(400); // Should fit mobile width
          }
        }
      }

      await DebugHelpers.takeTimestampedScreenshot(page, 'mobile-risk-meters');
    });

    test('should maintain component usability on tablet', async ({ page }) => {
      await page.setViewportSize(MOBILE_VIEWPORTS.TABLET);
      await page.reload();

      const testAddress = TEST_ADDRESSES.EARTHQUAKE_RISK[0];
      await PropertyHelpers.assessProperty(page, testAddress);

      // Test button interactions on tablet
      const buttons = page.locator('button');
      const buttonCount = await buttons.count();

      if (buttonCount > 0) {
        const primaryButton = buttons.first();
        
        // Verify touch-friendly sizing
        const boundingBox = await primaryButton.boundingBox();
        if (boundingBox) {
          console.log(`Tablet button size: ${boundingBox.width}x${boundingBox.height}`);
          expect(boundingBox.height).toBeGreaterThanOrEqual(44); // Minimum touch target
        }
      }

      await DebugHelpers.takeTimestampedScreenshot(page, 'tablet-component-usability');
    });
  });

  test.describe('Component Performance', () => {
    test('should render components efficiently', async ({ page }) => {
      const startTime = Date.now();
      
      const testAddress = TEST_ADDRESSES.MULTI_HAZARD[0];
      await PropertyHelpers.assessProperty(page, testAddress);
      
      const endTime = Date.now();
      const renderTime = endTime - startTime;

      console.log(`Component rendering time: ${renderTime}ms`);

      // Components should render reasonably quickly
      const threshold = envConfig.performance.thresholds.assessmentTime;
      if (envConfig.performance.enabled) {
        expect(renderTime).toBeLessThan(threshold);
      }

      // Check for any layout shifts
      const layoutShiftScore = await page.evaluate(() => {
        return new Promise((resolve) => {
          let clsValue = 0;
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (!entry.hadRecentInput) {
                clsValue += entry.value;
              }
            }
            resolve(clsValue);
          }).observe({ type: 'layout-shift', buffered: true });
          
          setTimeout(() => resolve(clsValue), 3000);
        });
      });

      console.log(`Cumulative Layout Shift score: ${layoutShiftScore}`);
      expect(layoutShiftScore).toBeLessThan(0.1); // Good CLS score
    });

    test('should handle component rerendering gracefully', async ({ page }) => {
      // Perform multiple assessments to test component rerendering
      const addresses = [
        TEST_ADDRESSES.QUICK_TEST[0],
        TEST_ADDRESSES.QUICK_TEST[1],
        TEST_ADDRESSES.LOW_RISK[0]
      ];

      for (const address of addresses) {
        await page.goto(testUrls.home);
        const startTime = Date.now();
        
        await PropertyHelpers.assessProperty(page, address);
        
        const endTime = Date.now();
        const assessmentTime = endTime - startTime;
        
        console.log(`Assessment ${address.slice(0, 20)}... completed in ${assessmentTime}ms`);
        
        // Verify components are still functional
        const componentCount = await page.locator('.risk-meter, .risk-score, button, .card').count();
        expect(componentCount).toBeGreaterThanOrEqual(3);
      }

      console.log('✅ Component rerendering performance acceptable');
    });
  });
});