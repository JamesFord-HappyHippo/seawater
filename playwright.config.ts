import { defineConfig, devices } from '@playwright/test';

/**
 * Seawater Climate Risk Platform - Enhanced Playwright Test Configuration
 * Supports both www.seawater.io and test.seawater.io environments
 * Includes performance monitoring, visual regression, and accessibility testing
 */

// Environment configuration
const getEnvironmentConfig = () => {
  const env = process.env.TEST_ENV || 'local';
  
  const configs = {
    local: {
      baseURL: 'http://localhost:3000',
      use: {
        headless: true,
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
      }
    },
    production: {
      baseURL: 'https://www.seawater.io',
      use: {
        headless: true,
        screenshot: 'always',
        video: 'on',
      }
    },
    test: {
      baseURL: 'https://test.seawater.io',
      use: {
        headless: true,
        screenshot: 'always',
        video: 'on',
      }
    }
  };
  
  return configs[env] || configs.local;
};

const envConfig = getEnvironmentConfig();

export default defineConfig({
  testDir: './tests',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['html', { outputFolder: 'test-results/html-report' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ...(process.env.CI ? [['github']] : [])
  ],
  
  /* Global timeout for each test */
  timeout: 90000, // Increased for comprehensive testing
  
  /* Global expect timeout */
  expect: {
    /* Timeout for assertions */
    timeout: 10000,
    /* Threshold for visual comparisons */
    threshold: 0.2,
    /* Animation handling */
    animations: 'disabled',
  },
  
  /* Shared settings for all the projects below. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: envConfig.baseURL,

    /* Collect trace when retrying the failed test. */
    trace: 'on-first-retry',
    
    /* Screenshot on failure */
    screenshot: envConfig.use.screenshot,
    
    /* Video recording */
    video: envConfig.use.video,
    
    /* Global timeout for actions */
    actionTimeout: 15000,
    
    /* Global timeout for navigations */
    navigationTimeout: 30000,
    
    /* Enable headless mode for CI/CD compatibility */
    headless: envConfig.use.headless,
    
    /* Ignore HTTPS errors for test environments */
    ignoreHTTPSErrors: process.env.TEST_ENV === 'test',
    
    /* User agent for testing */
    userAgent: 'Seawater-Test-Bot/1.0 (Playwright)',
    
    /* Viewport for testing */
    viewport: { width: 1280, height: 720 },
    
    /* Extra HTTP headers */
    extraHTTPHeaders: {
      'Accept-Language': 'en-US,en;q=0.9',
    },
  },

  /* Configure projects for major browsers */
  projects: [
    // Desktop browsers for comprehensive testing
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
      },
    },
    {
      name: 'firefox',
      use: { 
        ...devices['Desktop Firefox'],
        viewport: { width: 1280, height: 720 },
      },
    },
    {
      name: 'webkit',
      use: { 
        ...devices['Desktop Safari'],
        viewport: { width: 1280, height: 720 },
      },
    },

    // Mobile viewports for responsive design testing
    {
      name: 'Mobile Chrome',
      use: { 
        ...devices['Pixel 5'],
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: 'Mobile Safari',
      use: { 
        ...devices['iPhone 12'],
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: 'Tablet iPad',
      use: { 
        ...devices['iPad Pro'],
        isMobile: true,
        hasTouch: true,
      },
    },

    // Branded browsers for compatibility testing
    {
      name: 'Microsoft Edge',
      use: { 
        ...devices['Desktop Edge'], 
        channel: 'msedge',
        viewport: { width: 1280, height: 720 },
      },
    },
    {
      name: 'Google Chrome',
      use: { 
        ...devices['Desktop Chrome'], 
        channel: 'chrome',
        viewport: { width: 1280, height: 720 },
      },
    },

    // Environment-specific projects
    {
      name: 'production-chromium',
      use: { 
        ...devices['Desktop Chrome'],
        baseURL: 'https://www.seawater.io',
      },
      testMatch: ['**/e2e/production/**', '**/e2e/cross-environment/**'],
    },
    {
      name: 'test-env-chromium',
      use: { 
        ...devices['Desktop Chrome'],
        baseURL: 'https://test.seawater.io',
        ignoreHTTPSErrors: true,
      },
      testMatch: ['**/e2e/test-environment/**', '**/e2e/cross-environment/**'],
    },

    // Performance testing project
    {
      name: 'performance',
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
      },
      testMatch: ['**/performance/**'],
    },

    // Accessibility testing project
    {
      name: 'accessibility',
      use: { 
        ...devices['Desktop Chrome'],
        // Reduced motion for accessibility testing
        reducedMotion: 'reduce',
      },
      testMatch: ['**/accessibility/**'],
    },

    // Visual regression testing project
    {
      name: 'visual-regression',
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
        // Ensure consistent rendering for visual tests
        deviceScaleFactor: 1,
      },
      testMatch: ['**/visual/**'],
    },
  ],

  /* Folders to ignore */
  testIgnore: [
    'tests/utils/**',
    'tests/fixtures/**',
    'tests/helpers/**',
    'tests/page-objects/**'
  ],

  /* Output directories */
  outputDir: 'test-results/',
  
  /* Global setup for test environment */
  globalSetup: require.resolve('./tests/global-setup.ts'),
  
  /* Global teardown for test environment */
  globalTeardown: require.resolve('./tests/global-teardown.ts'),

  /* Run your local dev server before starting the tests */
  webServer: process.env.TEST_ENV === 'local' ? {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
    stderr: 'pipe',
    stdout: 'pipe',
  } : undefined,

  /* Metadata for test runs */
  metadata: {
    testEnvironment: process.env.TEST_ENV || 'local',
    baseURL: envConfig.baseURL,
    testSuite: 'Seawater Climate Risk Platform E2E Tests',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  },
});