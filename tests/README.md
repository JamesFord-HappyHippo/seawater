# Seawater Climate Risk Platform - Playwright Test Suite

This comprehensive test suite validates the Seawater Climate Risk Platform across multiple environments including www.seawater.io and test.seawater.io.

## Table of Contents

- [Overview](#overview)
- [Test Structure](#test-structure)
- [Setup](#setup)
- [Running Tests](#running-tests)
- [Environment Configuration](#environment-configuration)
- [Test Categories](#test-categories)
- [Page Object Model](#page-object-model)
- [Performance Testing](#performance-testing)
- [Visual Regression Testing](#visual-regression-testing)
- [Accessibility Testing](#accessibility-testing)
- [Cross-Environment Testing](#cross-environment-testing)
- [CI/CD Integration](#cicd-integration)
- [Troubleshooting](#troubleshooting)

## Overview

The Seawater test suite includes:

- **Landing Page Tests**: "Before You Choose" messaging and navigation
- **Trial System Tests**: First-time users, trial limits, and cookie management
- **Property Assessment Tests**: 8-risk climate assessment validation
- **UI Component Tests**: Flowbite components, risk meters, and modals
- **Cross-Environment Tests**: Production vs test environment comparison
- **Performance Tests**: Load times, Core Web Vitals, and resource usage
- **Visual Regression Tests**: Screenshot comparison across browsers
- **Accessibility Tests**: WCAG compliance and screen reader support

## Test Structure

```
tests/
├── e2e/                              # End-to-end tests
│   ├── landingPage.spec.ts           # Landing page functionality
│   ├── trialSystem.spec.ts           # Trial system validation
│   ├── comprehensiveRiskAssessment.spec.ts  # 8-risk assessment
│   ├── uiComponents.spec.ts          # UI component testing
│   ├── userJourneys.spec.ts          # Complete user workflows
│   ├── propertyRiskAssessment.spec.ts # Property assessment core
│   ├── auth.spec.ts                  # Authentication flows
│   ├── subscriptionManagement.spec.ts # Subscription features
│   ├── responsiveDesign.spec.ts      # Mobile/responsive design
│   └── cross-environment/
│       └── environmentComparison.spec.ts # Cross-env validation
├── performance/
│   └── performanceTests.spec.ts      # Performance benchmarks
├── visual/
│   └── visualRegression.spec.ts      # Visual regression testing
├── accessibility/
│   └── accessibilityTests.spec.ts    # WCAG compliance tests
├── page-objects/                     # Page Object Model
│   ├── BasePage.ts                   # Base page functionality
│   ├── LandingPage.ts               # Landing page interactions
│   ├── AssessmentPage.ts            # Assessment functionality
│   ├── TrialSystemPage.ts           # Trial system interactions
│   └── index.ts                     # Page object exports
├── config/
│   └── environment.ts               # Environment configurations
├── utils/
│   ├── testCredentials.ts           # Test data and credentials
│   └── testHelpers.ts               # Helper functions
├── fixtures/                        # Test data files
├── global-setup.ts                  # Global test setup
├── global-teardown.ts               # Global test cleanup
└── README.md                        # This file
```

## Setup

### Prerequisites

- Node.js 18+ 
- npm 8+
- Git

### Installation

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Install Playwright browsers**:
   ```bash
   npx playwright install
   ```

3. **Install system dependencies** (if needed):
   ```bash
   npx playwright install-deps
   ```

## Running Tests

### Basic Test Commands

```bash
# Run all tests
npm test

# Run with UI mode (interactive)
npm run test:ui

# Run in headed mode (see browser)
npm run test:headed

# Debug mode
npm run test:debug

# Generate test report
npm run test:report
```

### Environment-Specific Tests

```bash
# Test against production (www.seawater.io)
npm run test:production

# Test against test environment (test.seawater.io)
npm run test:test-env

# Test against local development
npm run test:local
```

### Test Categories

```bash
# Core functionality tests
npm run test:core

# Landing page tests
npm run test:landing

# Trial system tests
npm run test:trial

# Comprehensive risk assessment
npm run test:comprehensive

# UI components
npm run test:ui

# Cross-environment comparison
npm run test:cross-env

# Performance tests
npm run test:performance

# Visual regression tests
npm run test:visual

# Accessibility tests
npm run test:accessibility

# Full test suite
npm run test:full-suite
```

### Browser-Specific Tests

```bash
# Chrome
npm run test:chrome

# Firefox
npm run test:firefox

# Safari (WebKit)
npm run test:webkit

# Edge
npm run test:edge

# Mobile Chrome
npm run test:mobile

# Tablet
npm run test:tablet
```

## Environment Configuration

### Environment Variables

Set `TEST_ENV` to control which environment to test:

```bash
# Local development
TEST_ENV=local npm test

# Production environment
TEST_ENV=production npm test

# Test environment
TEST_ENV=test npm test
```

### Configuration Files

Edit `tests/config/environment.ts` to customize:

- **Base URLs**: Environment-specific URLs
- **Timeouts**: API and page load timeouts
- **Features**: Enable/disable features per environment
- **Performance Thresholds**: Environment-specific performance expectations
- **SSL Settings**: Certificate validation settings

### Test Data Configuration

Edit `tests/utils/testCredentials.ts` to update:

- **Test Addresses**: Property addresses for risk assessment
- **User Credentials**: Environment-specific test accounts
- **API Endpoints**: Service endpoints for testing
- **Subscription Limits**: Expected trial and subscription limits

## Test Categories

### Landing Page Tests (`landingPage.spec.ts`)

Validates the primary landing page functionality:

- **"Before You Choose" messaging display**
- **Navigation menu functionality**
- **Call-to-action button interactions**
- **Educational content presence**
- **Risk factor mentions**
- **Data source attribution**
- **Responsive design on mobile/tablet**
- **Performance within thresholds**
- **Basic accessibility compliance**

Key test scenarios:
```typescript
// Verify core messaging
await landingPage.hasBeforeYouChooseMessaging();

// Test property assessment entry
await landingPage.navigateToAssessment();

// Check educational content
const education = await landingPage.hasEducationalContent();
```

### Trial System Tests (`trialSystem.spec.ts`)

Comprehensive trial limitation system validation:

- **First-time user full access**
- **Trial limit enforcement**
- **Cookie-based tracking**
- **Cross-session persistence**
- **Modal display and interactions**
- **Upgrade path functionality**
- **Privacy compliance**
- **Error handling**

Key test scenarios:
```typescript
// Test trial progression
const result = await trialPage.performAssessmentsUntilLimit(addresses, 5);

// Verify trial limit modal
const modalVisible = await trialPage.waitForTrialLimitModal();

// Check upgrade options
const upgradeOptions = await trialPage.verifyTrialLimitModalContent();
```

### Comprehensive Risk Assessment Tests (`comprehensiveRiskAssessment.spec.ts`)

Validates the 8-risk climate assessment system:

- **Address input and validation**
- **8-risk factor display (flood, hurricane, wildfire, earthquake, tornado, heat, drought, hail)**
- **Overall risk score calculation**
- **Individual risk scores**
- **Data source attribution (FEMA, NOAA, USGS)**
- **Methodology information**
- **Performance benchmarks**
- **Error handling**

Key test scenarios:
```typescript
// Verify all risk factors
await assessmentPage.verifyAllRiskFactors();

// Check data attribution
const attribution = await assessmentPage.verifyDataAttribution();

// Validate risk scores
await assessmentPage.verifyRiskScores();
```

### UI Component Tests (`uiComponents.spec.ts`)

Tests user interface components and interactions:

- **Flowbite component integration**
- **Risk meter visualizations**
- **Progress bar animations**
- **Modal functionality**
- **Button interactions**
- **Form styling**
- **Responsive behavior**
- **Performance impact**

Key test scenarios:
```typescript
// Test risk meters
const metersFound = await page.locator('.risk-meter').count();

// Verify modal interactions
await page.locator('button:has-text("Learn more")').click();

// Check responsive design
await ResponsiveHelpers.verifyResponsiveElements(page);
```

## Page Object Model

The test suite uses the Page Object Model pattern for maintainable tests:

### BasePage

Provides common functionality for all page objects:

```typescript
export abstract class BasePage {
  protected page: Page;
  
  async goto(url: string): Promise<void>;
  async waitForPageLoad(): Promise<void>;
  async takeScreenshot(name: string): Promise<void>;
  async elementExists(selector: string): Promise<boolean>;
}
```

### LandingPage

Handles landing page interactions:

```typescript
export class LandingPage extends BasePage {
  async navigate(): Promise<void>;
  async hasBeforeYouChooseMessaging(): Promise<boolean>;
  async assessProperty(address: string): Promise<void>;
  async hasWorkingNavigation(): Promise<boolean>;
}
```

### AssessmentPage

Manages property assessment functionality:

```typescript
export class AssessmentPage extends BasePage {
  async verifyRiskResults(): Promise<void>;
  async getDisplayedRiskFactors(): Promise<{[key: string]: boolean}>;
  async verifyDataAttribution(): Promise<{hasAttribution: boolean; sources: string[]}>;
}
```

### TrialSystemPage

Handles trial system interactions:

```typescript
export class TrialSystemPage extends BasePage {
  async clearTrialStorage(): Promise<void>;
  async setTrialUsageCount(count: number): Promise<void>;
  async waitForTrialLimitModal(): Promise<boolean>;
  async performAssessmentsUntilLimit(addresses: string[]): Promise<{assessmentsCompleted: number; trialLimitTriggered: boolean}>;
}
```

## Performance Testing

Performance tests validate:

- **Page load times within thresholds**
- **Core Web Vitals (LCP, FID, CLS, FCP)**
- **Assessment completion times**
- **Resource usage optimization**
- **Network error handling**
- **Memory leak detection**

### Running Performance Tests

```bash
npm run test:performance
```

### Performance Thresholds

Configure in `tests/config/environment.ts`:

```typescript
performance: {
  enabled: true,
  thresholds: {
    pageLoad: 5000,        // 5 seconds
    assessmentTime: 12000, // 12 seconds
    firstContentfulPaint: 2000 // 2 seconds
  }
}
```

## Visual Regression Testing

Visual tests capture and compare screenshots:

- **Landing page layout consistency**
- **Assessment results formatting**
- **UI component rendering**
- **Responsive design across viewports**
- **Brand element consistency**
- **Error state displays**

### Running Visual Tests

```bash
npm run test:visual
```

### Updating Visual Baselines

```bash
npx playwright test tests/visual/ --update-snapshots
```

## Accessibility Testing

Accessibility tests ensure WCAG compliance:

- **Keyboard navigation support**
- **Screen reader compatibility**
- **Color contrast validation**
- **Focus management**
- **ARIA label implementation**
- **Touch target sizing**
- **Reduced motion support**

### Running Accessibility Tests

```bash
npm run test:accessibility
```

### Accessibility Standards

Tests validate against:
- **WCAG 2.1 AA guidelines**
- **Keyboard navigation (Tab, Enter, Escape)**
- **Screen reader support (ARIA labels, roles)**
- **Color contrast ratios**
- **Touch target minimum sizes (44x44px)**
- **Focus visibility and management**

## Cross-Environment Testing

Cross-environment tests compare www.seawater.io and test.seawater.io:

- **DNS resolution and SSL certificates**
- **Core functionality parity**
- **Performance differences**
- **Feature consistency**
- **Error handling comparison**
- **Authentication system validation**

### Running Cross-Environment Tests

```bash
npm run test:cross-env
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Seawater E2E Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Install Playwright
        run: npx playwright install --with-deps
      
      - name: Run core tests
        run: npm run test:core
        env:
          TEST_ENV: production
      
      - name: Upload test results
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: test-results/
```

### Environment-Specific CI

```yaml
# Production environment tests
- name: Test Production
  run: TEST_ENV=production npm run test:production

# Test environment validation
- name: Test Environment
  run: TEST_ENV=test npm run test:test-env

# Performance benchmarks
- name: Performance Tests
  run: npm run test:performance
```

## Troubleshooting

### Common Issues

1. **Test failures due to timeouts**:
   ```bash
   # Increase timeout in playwright.config.ts
   timeout: 90000
   ```

2. **Visual regression failures**:
   ```bash
   # Update visual baselines
   npx playwright test tests/visual/ --update-snapshots
   ```

3. **SSL certificate errors on test environment**:
   ```typescript
   // In environment.ts
   ssl: {
     enabled: true,
     ignoreErrors: true // For test environment
   }
   ```

4. **Trial system not triggering**:
   ```typescript
   // Force trial limit in tests
   await trialPage.setTrialUsageCount(5);
   ```

### Debug Mode

Run tests in debug mode to troubleshoot:

```bash
npm run test:debug
```

### Screenshots and Videos

Tests automatically capture:
- **Screenshots on failure**
- **Videos for failed tests**
- **Traces for debugging**

Access in `test-results/` directory.

### Environment Variables for Debugging

```bash
# Enable verbose logging
DEBUG=pw:api npm test

# Show browser console
PLAYWRIGHT_BROWSER_CHANNEL=chrome npm test

# Disable headless mode
HEADED=true npm test
```

## Test Data Management

### Test Addresses

Organized by risk type in `testCredentials.ts`:

```typescript
export const TEST_ADDRESSES = {
  HIGH_FLOOD_RISK: [
    '123 Riverside Drive, Miami, FL 33101',
    '456 Bayfront Ave, New Orleans, LA 70130'
  ],
  WILDFIRE_RISK: [
    '111 Forest Glen Rd, Paradise, CA 95969'
  ],
  QUICK_TEST: [
    '100 Main St, Denver, CO 80202' // Reliable for quick tests
  ]
};
```

### User Credentials

Environment-specific test accounts:

```typescript
export const ENVIRONMENT_CREDENTIALS = {
  PRODUCTION: {
    FREE_USER: { email: 'seawater_prod_free@happyhippo.ai', password: '123_SeaWater_Prod' }
  },
  TEST: {
    FREE_USER: { email: 'seawater_test_free@happyhippo.ai', password: '123_SeaWater_Test' }
  }
};
```

## Reporting

### HTML Reports

Generate detailed HTML reports:

```bash
npm run test:report
```

### JSON Reports

Structured test results:

```bash
npx playwright test --reporter=json
```

### Custom Reporting

Configure additional reporters in `playwright.config.ts`:

```typescript
reporter: [
  ['html', { outputFolder: 'test-results/html-report' }],
  ['json', { outputFile: 'test-results/results.json' }],
  ['junit', { outputFile: 'test-results/junit.xml' }]
]
```

## Contributing

### Adding New Tests

1. **Create test file** in appropriate directory
2. **Use Page Object Model** for interactions
3. **Follow naming conventions**: `featureName.spec.ts`
4. **Add test script** to `package.json`
5. **Update documentation**

### Test Guidelines

- **Use descriptive test names**
- **Group related tests in describe blocks**
- **Include both positive and negative test cases**
- **Add appropriate timeouts and waits**
- **Use data-testid attributes for reliable selectors**
- **Take screenshots for debugging**

### Code Standards

- **TypeScript for all test files**
- **ESLint and Prettier formatting**
- **Page Object Model pattern**
- **Async/await for all promises**
- **Proper error handling**

---

## Support

For questions or issues with the test suite:

1. **Check this README** for configuration details
2. **Review test failure screenshots** in `test-results/`
3. **Run tests in debug mode** for detailed information
4. **Check environment configuration** for URL and timeout settings

The test suite is designed to provide comprehensive validation of the Seawater Climate Risk Platform across all supported environments and use cases.