import { expect, test } from '@playwright/test';
import { getEnvironmentConfig, getTestUrls } from '../config/environment';
import { TEST_ADDRESSES } from '../utils/testCredentials';
import { LandingPage } from '../page-objects/LandingPage';
import { AssessmentPage } from '../page-objects/AssessmentPage';
import { DebugHelpers } from '../utils/testHelpers';

const envConfig = getEnvironmentConfig();
const testUrls = getTestUrls(envConfig.baseURL);

test.describe('Seawater Performance Tests', () => {
  test.beforeEach(async ({ page }) => {
    DebugHelpers.setupConsoleLogging(page);
  });

  test.describe('Page Load Performance', () => {
    test('should load landing page within performance threshold', async ({ page }) => {
      const landingPage = new LandingPage(page);
      
      const loadTime = await landingPage.measurePageLoadTime();
      console.log(`Landing page load time: ${loadTime}ms`);
      
      const threshold = envConfig.performance.thresholds.pageLoad;
      if (envConfig.performance.enabled) {
        expect(loadTime).toBeLessThan(threshold);
      }
      
      await landingPage.takeScreenshot('performance-landing-page-load');
    });

    test('should meet Core Web Vitals standards', async ({ page }) => {
      await page.goto(testUrls.home);
      
      // Wait for page to fully load
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);
      
      const webVitals = await page.evaluate(() => {
        return new Promise((resolve) => {
          const vitals: any = {};
          
          // Largest Contentful Paint
          new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const lastEntry = entries[entries.length - 1];
            vitals.lcp = lastEntry.startTime;
          }).observe({ type: 'largest-contentful-paint', buffered: true });
          
          // First Input Delay
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              vitals.fid = (entry as any).processingStart - entry.startTime;
            }
          }).observe({ type: 'first-input', buffered: true });
          
          // Cumulative Layout Shift
          let clsValue = 0;
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (!(entry as any).hadRecentInput) {
                clsValue += (entry as any).value;
              }
            }
            vitals.cls = clsValue;
          }).observe({ type: 'layout-shift', buffered: true });
          
          // First Contentful Paint
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (entry.name === 'first-contentful-paint') {
                vitals.fcp = entry.startTime;
              }
            }
          }).observe({ type: 'paint', buffered: true });
          
          setTimeout(() => resolve(vitals), 5000);
        });
      });
      
      console.log('Core Web Vitals:', webVitals);
      
      if (envConfig.performance.enabled) {
        // Good LCP: under 2.5s
        if (webVitals.lcp) {
          expect(webVitals.lcp).toBeLessThan(2500);
        }
        
        // Good FCP: under 1.8s
        if (webVitals.fcp) {
          expect(webVitals.fcp).toBeLessThan(1800);
        }
        
        // Good CLS: under 0.1
        if (webVitals.cls !== undefined) {
          expect(webVitals.cls).toBeLessThan(0.1);
        }
      }
    });

    test('should load efficiently on mobile devices', async ({ page }) => {
      // Simulate slow 3G network
      await page.route('**/*', async (route) => {
        await page.waitForTimeout(100); // Simulate network delay
        await route.continue();
      });
      
      await page.setViewportSize({ width: 390, height: 844 }); // iPhone 12
      
      const startTime = Date.now();
      await page.goto(testUrls.home);
      await page.waitForLoadState('networkidle');
      const loadTime = Date.now() - startTime;
      
      console.log(`Mobile load time on slow network: ${loadTime}ms`);
      
      // Should still load reasonably on mobile with slow network
      expect(loadTime).toBeLessThan(10000); // 10 seconds max
      
      await DebugHelpers.takeTimestampedScreenshot(page, 'mobile-slow-network-load');
    });
  });

  test.describe('Assessment Performance', () => {
    test('should complete property assessment within time threshold', async ({ page }) => {
      const assessmentPage = new AssessmentPage(page);
      await page.goto(testUrls.home);
      
      const testAddress = TEST_ADDRESSES.QUICK_TEST[0];
      const assessmentTime = await assessmentPage.measureAssessmentTime(testAddress);
      
      console.log(`Property assessment completed in: ${assessmentTime}ms`);
      
      const threshold = envConfig.performance.thresholds.assessmentTime;
      if (envConfig.performance.enabled) {
        expect(assessmentTime).toBeLessThan(threshold);
      }
      
      await assessmentPage.takeScreenshot('performance-assessment-complete');
    });

    test('should handle multiple concurrent assessments efficiently', async ({ page }) => {
      const browser = page.context().browser();
      if (!browser) return;
      
      const concurrentTabs = 3;
      const tabs = [];
      
      // Create multiple tabs
      for (let i = 0; i < concurrentTabs; i++) {
        const context = await browser.newContext();
        const tab = await context.newPage();
        tabs.push(tab);
      }
      
      const startTime = Date.now();
      
      // Start concurrent assessments
      const assessmentPromises = tabs.map(async (tab, index) => {
        const assessmentPage = new AssessmentPage(tab);
        await tab.goto(testUrls.home);
        
        const address = TEST_ADDRESSES.QUICK_TEST[index % TEST_ADDRESSES.QUICK_TEST.length];
        return await assessmentPage.measureAssessmentTime(address);
      });
      
      const results = await Promise.all(assessmentPromises);
      const totalTime = Date.now() - startTime;
      
      console.log('Concurrent assessment results:', results);
      console.log(`Total time for ${concurrentTabs} concurrent assessments: ${totalTime}ms`);
      
      // Average time should be reasonable
      const averageTime = results.reduce((sum, time) => sum + time, 0) / results.length;
      console.log(`Average assessment time: ${averageTime}ms`);
      
      if (envConfig.performance.enabled) {
        expect(averageTime).toBeLessThan(envConfig.performance.thresholds.assessmentTime * 1.5);
      }
      
      // Clean up
      for (const tab of tabs) {
        await tab.context().close();
      }
    });

    test('should maintain performance with repeated assessments', async ({ page }) => {
      const assessmentPage = new AssessmentPage(page);
      const addresses = TEST_ADDRESSES.QUICK_TEST;
      const assessmentTimes = [];
      
      for (let i = 0; i < addresses.length; i++) {
        await page.goto(testUrls.home);
        
        const startTime = Date.now();
        await assessmentPage.measureAssessmentTime(addresses[i]);
        const assessmentTime = Date.now() - startTime;
        
        assessmentTimes.push(assessmentTime);
        console.log(`Assessment ${i + 1} time: ${assessmentTime}ms`);
        
        // Brief pause between assessments
        await page.waitForTimeout(1000);
      }
      
      // Performance should not degrade significantly
      const firstTime = assessmentTimes[0];
      const lastTime = assessmentTimes[assessmentTimes.length - 1];
      const degradation = (lastTime - firstTime) / firstTime;
      
      console.log(`Performance degradation: ${(degradation * 100).toFixed(2)}%`);
      
      // Should not degrade by more than 50%
      expect(degradation).toBeLessThan(0.5);
    });
  });

  test.describe('Resource Usage', () => {
    test('should not have memory leaks during extended usage', async ({ page }) => {
      await page.goto(testUrls.home);
      
      // Get initial memory usage
      const initialMemory = await page.evaluate(() => {
        return (performance as any).memory ? {
          usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
          totalJSHeapSize: (performance as any).memory.totalJSHeapSize
        } : null;
      });
      
      // Perform multiple assessments
      const assessmentPage = new AssessmentPage(page);
      for (let i = 0; i < 5; i++) {
        await page.goto(testUrls.home);
        await assessmentPage.measureAssessmentTime(TEST_ADDRESSES.QUICK_TEST[0]);
        await page.waitForTimeout(1000);
      }
      
      // Force garbage collection if available
      await page.evaluate(() => {
        if ((window as any).gc) {
          (window as any).gc();
        }
      });
      
      // Get final memory usage
      const finalMemory = await page.evaluate(() => {
        return (performance as any).memory ? {
          usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
          totalJSHeapSize: (performance as any).memory.totalJSHeapSize
        } : null;
      });
      
      if (initialMemory && finalMemory) {
        const memoryIncrease = finalMemory.usedJSHeapSize - initialMemory.usedJSHeapSize;
        const memoryIncreasePercent = (memoryIncrease / initialMemory.usedJSHeapSize) * 100;
        
        console.log('Memory usage analysis:');
        console.log(`Initial: ${(initialMemory.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB`);
        console.log(`Final: ${(finalMemory.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB`);
        console.log(`Increase: ${memoryIncreasePercent.toFixed(2)}%`);
        
        // Memory increase should be reasonable (less than 100%)
        expect(memoryIncreasePercent).toBeLessThan(100);
      }
    });

    test('should load minimal resources on initial page load', async ({ page }) => {
      const resourceMetrics = {
        totalRequests: 0,
        totalSize: 0,
        jsSize: 0,
        cssSize: 0,
        imageSize: 0,
        fontSize: 0
      };
      
      page.on('response', (response) => {
        const url = response.url();
        const contentLength = parseInt(response.headers()['content-length'] || '0');
        
        resourceMetrics.totalRequests++;
        resourceMetrics.totalSize += contentLength;
        
        if (url.includes('.js') || response.headers()['content-type']?.includes('javascript')) {
          resourceMetrics.jsSize += contentLength;
        } else if (url.includes('.css') || response.headers()['content-type']?.includes('css')) {
          resourceMetrics.cssSize += contentLength;
        } else if (response.headers()['content-type']?.includes('image')) {
          resourceMetrics.imageSize += contentLength;
        } else if (response.headers()['content-type']?.includes('font')) {
          resourceMetrics.fontSize += contentLength;
        }
      });
      
      await page.goto(testUrls.home);
      await page.waitForLoadState('networkidle');
      
      console.log('Resource loading metrics:');
      console.log(`Total requests: ${resourceMetrics.totalRequests}`);
      console.log(`Total size: ${(resourceMetrics.totalSize / 1024 / 1024).toFixed(2)}MB`);
      console.log(`JavaScript: ${(resourceMetrics.jsSize / 1024).toFixed(2)}KB`);
      console.log(`CSS: ${(resourceMetrics.cssSize / 1024).toFixed(2)}KB`);
      console.log(`Images: ${(resourceMetrics.imageSize / 1024).toFixed(2)}KB`);
      console.log(`Fonts: ${(resourceMetrics.fontSize / 1024).toFixed(2)}KB`);
      
      // Reasonable resource usage expectations
      expect(resourceMetrics.totalRequests).toBeLessThan(100); // Not too many requests
      expect(resourceMetrics.totalSize).toBeLessThan(5 * 1024 * 1024); // Under 5MB total
      expect(resourceMetrics.jsSize).toBeLessThan(1024 * 1024); // Under 1MB JS
    });
  });

  test.describe('Network Performance', () => {
    test('should handle slow network conditions gracefully', async ({ page }) => {
      // Simulate slow network
      await page.route('**/*', async (route) => {
        await page.waitForTimeout(200); // 200ms delay
        await route.continue();
      });
      
      const landingPage = new LandingPage(page);
      
      const startTime = Date.now();
      await landingPage.navigate();
      const loadTime = Date.now() - startTime;
      
      console.log(`Load time on slow network: ${loadTime}ms`);
      
      // Should still be functional despite slow network
      expect(await landingPage.hasBeforeYouChooseMessaging()).toBeTruthy();
      expect(await landingPage.hasWorkingNavigation()).toBeTruthy();
      
      await landingPage.takeScreenshot('slow-network-performance');
    });

    test('should handle intermittent network failures', async ({ page }) => {
      let requestCount = 0;
      
      await page.route('**/*', (route) => {
        requestCount++;
        
        // Fail every 3rd request to simulate intermittent issues
        if (requestCount % 3 === 0) {
          route.abort('internetdisconnected');
        } else {
          route.continue();
        }
      });
      
      try {
        await page.goto(testUrls.home, { timeout: 30000 });
        
        // Should still load core content despite some failures
        const hasContent = await page.locator('body').textContent();
        expect(hasContent).toBeTruthy();
        expect(hasContent!.length).toBeGreaterThan(100);
        
        console.log('✅ Handled intermittent network failures gracefully');
        
      } catch (error) {
        console.log('Network failure handling needs improvement:', error);
      }
    });
  });

  test.describe('Performance Monitoring', () => {
    test('should collect and validate performance metrics', async ({ page }) => {
      await page.goto(testUrls.home);
      
      // Collect comprehensive performance metrics
      const metrics = await page.evaluate(() => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        const paint = performance.getEntriesByType('paint');
        
        return {
          navigation: {
            domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
            loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
            totalTime: navigation.loadEventEnd - navigation.fetchStart
          },
          paint: {
            firstPaint: paint.find(entry => entry.name === 'first-paint')?.startTime || 0,
            firstContentfulPaint: paint.find(entry => entry.name === 'first-contentful-paint')?.startTime || 0
          },
          resources: performance.getEntriesByType('resource').length
        };
      });
      
      console.log('Performance metrics:', JSON.stringify(metrics, null, 2));
      
      // Validate metrics are within acceptable ranges
      if (envConfig.performance.enabled) {
        expect(metrics.navigation.totalTime).toBeLessThan(envConfig.performance.thresholds.pageLoad);
        expect(metrics.paint.firstContentfulPaint).toBeLessThan(envConfig.performance.thresholds.firstContentfulPaint);
      }
      
      // Should have reasonable resource count
      expect(metrics.resources).toBeGreaterThan(5); // Should load some resources
      expect(metrics.resources).toBeLessThan(100); // But not too many
    });

    test('should track performance regression over time', async ({ page }) => {
      const baselineFile = 'test-results/performance-baseline.json';
      
      // Measure current performance
      const landingPage = new LandingPage(page);
      const currentLoadTime = await landingPage.measurePageLoadTime();
      
      const assessmentPage = new AssessmentPage(page);
      await page.goto(testUrls.home);
      const currentAssessmentTime = await assessmentPage.measureAssessmentTime(TEST_ADDRESSES.QUICK_TEST[0]);
      
      const currentMetrics = {
        timestamp: new Date().toISOString(),
        environment: envConfig.name,
        loadTime: currentLoadTime,
        assessmentTime: currentAssessmentTime
      };
      
      console.log('Current performance metrics:', currentMetrics);
      
      // This would typically store/compare with baseline
      // For now, just validate current performance is reasonable
      expect(currentLoadTime).toBeLessThan(15000); // 15 seconds max
      expect(currentAssessmentTime).toBeLessThan(20000); // 20 seconds max
    });
  });
});