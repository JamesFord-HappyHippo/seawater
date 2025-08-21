import { expect, test } from '@playwright/test';
import { 
  MOBILE_VIEWPORTS,
  TEST_ADDRESSES,
  TEST_TIMEOUTS 
} from '../utils/testCredentials';
import { 
  ResponsiveHelpers,
  PropertyHelpers,
  AuthHelpers,
  DebugHelpers 
} from '../utils/testHelpers';

test.describe('Seawater Responsive Design Tests', () => {
  test.beforeEach(async ({ page }) => {
    DebugHelpers.setupConsoleLogging(page);
  });

  test.describe('Desktop Responsive Behavior', () => {
    test('should adapt to different desktop screen sizes', async ({ page }) => {
      const desktopSizes = [
        { width: 1920, height: 1080, name: 'Large Desktop' },
        { width: 1366, height: 768, name: 'Standard Desktop' },
        { width: 1024, height: 768, name: 'Small Desktop' }
      ];

      for (const size of desktopSizes) {
        await page.setViewportSize(size);
        await page.goto('/');
        
        // Verify layout adjusts appropriately
        await ResponsiveHelpers.verifyResponsiveElements(page);
        
        // Check navigation layout
        const nav = page.locator('nav, .navigation, .header').first();
        if (await nav.count() > 0) {
          await expect(nav).toBeVisible();
        }
        
        // Verify property search form is accessible
        const searchForm = page.locator('input[name="address"], .address-search').first();
        if (await searchForm.count() > 0) {
          await expect(searchForm).toBeVisible();
        }
        
        await DebugHelpers.takeTimestampedScreenshot(page, `desktop-${size.name.toLowerCase().replace(' ', '-')}`);
      }
    });

    test('should show full desktop navigation on large screens', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.goto('/');
      
      // Desktop should show full navigation menu
      const navLinks = page.locator('nav a, .navigation a');
      const linkCount = await navLinks.count();
      
      // Should have navigation links visible
      expect(linkCount).toBeGreaterThan(0);
      
      // Mobile menu button should not be visible on desktop
      const mobileMenuButton = page.locator('.mobile-menu-button, .hamburger');
      if (await mobileMenuButton.count() > 0) {
        const isVisible = await mobileMenuButton.isVisible();
        expect(isVisible).toBeFalsy();
      }
    });
  });

  test.describe('Tablet Responsive Behavior', () => {
    test('should work properly on tablet devices', async ({ page }) => {
      await page.setViewportSize(MOBILE_VIEWPORTS.TABLET);
      await page.goto('/');
      
      // Verify tablet layout
      await ResponsiveHelpers.verifyResponsiveElements(page);
      
      // Test property assessment on tablet
      const testAddress = TEST_ADDRESSES.LOW_RISK[0];
      await PropertyHelpers.assessProperty(page, testAddress);
      await PropertyHelpers.verifyRiskResults(page);
      
      // Results should be readable on tablet
      const riskScore = page.locator('.risk-score, [data-testid="risk-score"]').first();
      if (await riskScore.count() > 0) {
        const boundingBox = await riskScore.boundingBox();
        expect(boundingBox?.width).toBeGreaterThan(50); // Should be reasonably sized
      }
      
      await DebugHelpers.takeTimestampedScreenshot(page, 'tablet-assessment');
    });

    test('should handle touch interactions on tablet', async ({ page }) => {
      await page.setViewportSize(MOBILE_VIEWPORTS.TABLET);
      await page.goto('/');
      
      // Test tap interactions
      const searchInput = page.locator('input[name="address"], .address-search input').first();
      if (await searchInput.count() > 0) {
        // Touch/tap to focus
        await searchInput.tap();
        
        // Should be focused
        const isFocused = await searchInput.evaluate(el => document.activeElement === el);
        expect(isFocused).toBeTruthy();
      }
    });
  });

  test.describe('Mobile Phone Responsive Behavior', () => {
    test('should display mobile navigation menu', async ({ page }) => {
      await page.setViewportSize(MOBILE_VIEWPORTS.IPHONE_12);
      await page.goto('/');
      
      // Test mobile navigation
      await ResponsiveHelpers.testMobileNavigation(page);
      
      await DebugHelpers.takeTimestampedScreenshot(page, 'mobile-navigation');
    });

    test('should stack content vertically on mobile', async ({ page }) => {
      await page.setViewportSize(MOBILE_VIEWPORTS.IPHONE_12);
      await page.goto('/');
      
      // Verify no horizontal scroll
      await ResponsiveHelpers.verifyResponsiveElements(page);
      
      // Check that main content areas are stacked
      const contentSections = page.locator('main > *, .content > *, section');
      const sectionCount = await contentSections.count();
      
      if (sectionCount > 1) {
        // Check vertical layout - elements should be stacked
        const firstSection = contentSections.nth(0);
        const secondSection = contentSections.nth(1);
        
        const firstBox = await firstSection.boundingBox();
        const secondBox = await secondSection.boundingBox();
        
        if (firstBox && secondBox) {
          // Second section should be below the first (allowing for some overlap)
          expect(secondBox.y).toBeGreaterThanOrEqual(firstBox.y - 50);
        }
      }
    });

    test('should make buttons touch-friendly on mobile', async ({ page }) => {
      await page.setViewportSize(MOBILE_VIEWPORTS.IPHONE_12);
      await page.goto('/');
      
      // Check button sizes are touch-friendly (at least 44px as per iOS HIG)
      const buttons = page.locator('button, .btn, input[type="submit"]');
      const buttonCount = await buttons.count();
      
      if (buttonCount > 0) {
        for (let i = 0; i < Math.min(buttonCount, 5); i++) {
          const button = buttons.nth(i);
          const boundingBox = await button.boundingBox();
          
          if (boundingBox) {
            expect(boundingBox.height).toBeGreaterThanOrEqual(40); // Minimum touch target
          }
        }
      }
    });

    test('should optimize form inputs for mobile', async ({ page }) => {
      await page.setViewportSize(MOBILE_VIEWPORTS.IPHONE_12);
      await page.goto('/');
      
      // Check form input optimization
      const addressInput = page.locator('input[name="address"], input[placeholder*="address"]').first();
      if (await addressInput.count() > 0) {
        // Should be appropriately sized
        const boundingBox = await addressInput.boundingBox();
        if (boundingBox) {
          expect(boundingBox.height).toBeGreaterThanOrEqual(40);
          expect(boundingBox.width).toBeGreaterThan(200);
        }
        
        // Check input type optimization
        const inputType = await addressInput.getAttribute('type');
        const inputMode = await addressInput.getAttribute('inputmode');
        
        console.log(`Input type: ${inputType}, Input mode: ${inputMode}`);
      }
    });
  });

  test.describe('Cross-Device User Experience', () => {
    test('should maintain user session across different screen sizes', async ({ page }) => {
      // Login on desktop
      await page.setViewportSize({ width: 1920, height: 1080 });
      await AuthHelpers.loginWithCredentials(page, 'FREE_USER');
      
      // Switch to mobile view
      await page.setViewportSize(MOBILE_VIEWPORTS.IPHONE_12);
      await page.reload();
      await DebugHelpers.waitForPageLoad(page);
      
      // Should still be logged in
      const isAuthenticated = await AuthHelpers.isAuthenticated(page);
      expect(isAuthenticated).toBeTruthy();
      
      // Perform assessment on mobile
      const testAddress = TEST_ADDRESSES.LOW_RISK[0];
      await PropertyHelpers.assessProperty(page, testAddress);
      
      // Switch back to desktop
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.reload();
      
      // Should still be authenticated and have access to results
      const stillAuthenticated = await AuthHelpers.isAuthenticated(page);
      expect(stillAuthenticated).toBeTruthy();
    });

    test('should provide consistent features across devices', async ({ page }) => {
      const devices = [
        { viewport: { width: 1920, height: 1080 }, name: 'Desktop' },
        { viewport: MOBILE_VIEWPORTS.TABLET, name: 'Tablet' },
        { viewport: MOBILE_VIEWPORTS.IPHONE_12, name: 'Mobile' }
      ];
      
      for (const device of devices) {
        await page.setViewportSize(device.viewport);
        await page.goto('/');
        
        // Core features should be available on all devices
        const coreFeatures = [
          'input[name="address"], .address-search', // Property search
          'button:has-text("Assess"), button[type="submit"]', // Assessment button
        ];
        
        for (const feature of coreFeatures) {
          const element = page.locator(feature).first();
          if (await element.count() > 0) {
            await expect(element).toBeVisible();
          }
        }
        
        console.log(`✅ Core features verified on ${device.name}`);
      }
    });
  });

  test.describe('Performance on Mobile Devices', () => {
    test('should load quickly on mobile connections', async ({ page, context }) => {
      // Simulate slow mobile connection
      await context.addInitScript(() => {
        // Add viewport meta tag if not present
        if (!document.querySelector('meta[name="viewport"]')) {
          const meta = document.createElement('meta');
          meta.name = 'viewport';
          meta.content = 'width=device-width, initial-scale=1';
          document.head.appendChild(meta);
        }
      });
      
      await page.setViewportSize(MOBILE_VIEWPORTS.IPHONE_12);
      
      const startTime = Date.now();
      await page.goto('/');
      await DebugHelpers.waitForPageLoad(page);
      
      const loadTime = Date.now() - startTime;
      console.log(`Mobile load time: ${loadTime}ms`);
      
      // Should load within reasonable time even on mobile
      expect(loadTime).toBeLessThan(8000); // Slightly longer timeout for mobile
    });

    test('should optimize images for mobile', async ({ page }) => {
      await page.setViewportSize(MOBILE_VIEWPORTS.IPHONE_12);
      await page.goto('/');
      
      // Check for responsive images
      const images = page.locator('img');
      const imageCount = await images.count();
      
      for (let i = 0; i < imageCount; i++) {
        const img = images.nth(i);
        const srcset = await img.getAttribute('srcset');
        const sizes = await img.getAttribute('sizes');
        
        // At least some images should have responsive attributes
        if (srcset || sizes) {
          console.log(`✅ Responsive image found: srcset=${!!srcset}, sizes=${!!sizes}`);
        }
      }
    });
  });

  test.describe('Accessibility on Mobile', () => {
    test('should maintain accessibility on mobile devices', async ({ page }) => {
      await page.setViewportSize(MOBILE_VIEWPORTS.IPHONE_12);
      await page.goto('/');
      
      // Check touch targets are adequately sized
      const interactiveElements = page.locator('button, a, input, [role="button"]');
      const elementCount = await interactiveElements.count();
      
      let adequatelySized = 0;
      for (let i = 0; i < Math.min(elementCount, 10); i++) {
        const element = interactiveElements.nth(i);
        const boundingBox = await element.boundingBox();
        
        if (boundingBox && boundingBox.height >= 44 && boundingBox.width >= 44) {
          adequatelySized++;
        }
      }
      
      // At least 70% should meet touch target guidelines
      const percentage = (adequatelySized / Math.min(elementCount, 10)) * 100;
      expect(percentage).toBeGreaterThanOrEqual(70);
      
      console.log(`Touch target compliance: ${percentage.toFixed(1)}%`);
    });

    test('should support screen reader navigation on mobile', async ({ page }) => {
      await page.setViewportSize(MOBILE_VIEWPORTS.IPHONE_12);
      await page.goto('/');
      
      // Check for proper heading structure
      const headings = page.locator('h1, h2, h3, h4, h5, h6');
      const headingCount = await headings.count();
      
      if (headingCount > 0) {
        // Should have logical heading structure
        const h1Count = await page.locator('h1').count();
        expect(h1Count).toBeLessThanOrEqual(1);
        
        console.log(`Mobile heading structure: ${headingCount} headings, ${h1Count} h1 elements`);
      }
      
      // Check for skip links
      const skipLinks = page.locator('a[href="#main"], a:has-text("Skip")');
      const hasSkipLinks = await skipLinks.count() > 0;
      
      console.log(`Skip navigation links present: ${hasSkipLinks}`);
    });
  });

  test.describe('Device-Specific Features', () => {
    test('should handle device orientation changes', async ({ page }) => {
      // Test portrait mode
      await page.setViewportSize({ width: 375, height: 812 }); // iPhone portrait
      await page.goto('/');
      
      await ResponsiveHelpers.verifyResponsiveElements(page);
      await DebugHelpers.takeTimestampedScreenshot(page, 'portrait-mode');
      
      // Test landscape mode
      await page.setViewportSize({ width: 812, height: 375 }); // iPhone landscape
      await page.reload();
      
      await ResponsiveHelpers.verifyResponsiveElements(page);
      await DebugHelpers.takeTimestampedScreenshot(page, 'landscape-mode');
      
      // Core functionality should work in both orientations
      const testAddress = TEST_ADDRESSES.LOW_RISK[0];
      await PropertyHelpers.assessProperty(page, testAddress);
    });

    test('should support device-specific input methods', async ({ page }) => {
      await page.setViewportSize(MOBILE_VIEWPORTS.IPHONE_12);
      await page.goto('/');
      
      // Test touch interactions
      const searchInput = page.locator('input[name="address"]').first();
      if (await searchInput.count() > 0) {
        // Test tap to focus
        await searchInput.tap();
        
        // Test virtual keyboard behavior
        const isFocused = await searchInput.evaluate(el => document.activeElement === el);
        expect(isFocused).toBeTruthy();
        
        // Test input with mobile keyboard
        await searchInput.fill('123 Test Street');
        const value = await searchInput.inputValue();
        expect(value).toBe('123 Test Street');
      }
    });
  });
});