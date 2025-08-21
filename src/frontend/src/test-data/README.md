# Seawater Climate Risk Platform - Test Data Documentation

## Overview

This directory contains comprehensive test data for the Seawater Climate Risk Platform, designed to support thorough testing of all mobile features while maintaining data privacy and creating realistic user scenarios for the travel-focused climate risk platform.

## Directory Structure

```
src/test-data/
├── index.ts                    # Main export file
├── travel-scenarios.ts         # Travel planning and relocation scenarios
├── property-assessments.ts     # Property risk profiles for various locations
├── user-journeys.ts           # User flow scenarios and behavior analytics
├── api-mock-responses.ts      # Mock API responses for development/testing
├── mobile-scenarios.ts        # Mobile-specific testing scenarios
├── performance-data.ts        # Performance and load testing data
├── utils.ts                   # Helper functions and utilities
└── README.md                  # This documentation file
```

## Test Data Categories

### 1. Travel Scenarios (`travel-scenarios.ts`)

Realistic travel planning scenarios focusing on climate risk assessment:

#### Available Scenarios:
- **Sicily Travel Planning**: Summer and spring travel with heat and volcanic risks
- **Austin Relocation**: Comprehensive family relocation assessment with neighborhood comparisons
- **Miami Vacation Rental**: Coastal property assessment with hurricane/flooding risks
- **California Wildfire**: Wine country and Lake Tahoe scenarios during fire season
- **Caribbean Hurricane Season**: Barbados and Jamaica travel planning during peak hurricane season

#### Usage Example:
```typescript
import { travelScenarios } from './test-data';

// Access Sicily summer travel scenario
const sicilyData = travelScenarios.sicily.palermo_summer_2024;

// Get Miami vacation rental data
const miamiRental = travelScenarios.miami.south_beach_condo;
```

### 2. Property Assessments (`property-assessments.ts`)

Comprehensive property risk profiles for testing various risk levels and locations:

#### Data Categories:
- **Major US Cities**: Miami, New Orleans, Atlanta, Denver, Portland
- **International Locations**: Amsterdam, Tokyo, Sydney
- **Extreme Risk Properties**: Death Valley, Florida Keys
- **Property Comparisons**: Side-by-side risk analysis
- **Professional Services**: Inspector, insurance agent, contractor data

#### Usage Example:
```typescript
import { propertyAssessments } from './test-data';

// Get Miami high-risk property
const miamiProperty = propertyAssessments.majorUSCities.miami_florida;

// Get international comparison
const tokyoProperty = propertyAssessments.international.tokyo_japan;

// Get extreme risk scenarios
const extremeRisk = propertyAssessments.extremeRisk.death_valley_california;
```

### 3. User Journeys (`user-journeys.ts`)

Complete user flow scenarios from registration to subscription management:

#### Journey Types:
- **Registration Flows**: Homebuyer, real estate professional, insurance agent
- **Trial Conversion**: Successful and failed conversion scenarios
- **Subscription Upgrades**: Premium to professional, professional to enterprise
- **Behavior Analytics**: Power user, casual user, churned user profiles
- **A/B Testing**: Pricing page, onboarding flow, mobile CTA tests

#### Usage Example:
```typescript
import { userJourneys } from './test-data';

// Get trial conversion scenario
const conversion = userJourneys.trialConversion.successful_conversion_homebuyer;

// Get A/B test data
const pricingTest = userJourneys.abTesting.pricing_page_test;
```

### 4. API Mock Responses (`api-mock-responses.ts`)

Realistic mock responses for all external APIs and services:

#### API Coverage:
- **FEMA National Risk Index**: Success responses, rate limits, errors
- **NOAA Weather Service**: Forecasts, alerts, historical data
- **USGS Earthquake Data**: Recent earthquakes, no activity scenarios
- **MapBox Geocoding**: Successful, ambiguous, and failed geocoding
- **Failure Scenarios**: Network timeouts, service maintenance, authentication errors

#### Usage Example:
```typescript
import { apiMockResponses } from './test-data';

// Mock FEMA API response
const femaResponse = apiMockResponses.fema.miami_property_success;

// Mock NOAA weather data
const noaaWeather = apiMockResponses.noaa.current_forecast_miami;

// Mock API failure
const timeout = apiMockResponses.failures.network_timeout;
```

### 5. Mobile Scenarios (`mobile-scenarios.ts`)

Mobile-specific testing scenarios for iOS and Android platforms:

#### Scenario Types:
- **Location Permissions**: First-time, denied, settings recovery flows
- **Offline Mode**: Cached data, no cache, partial connectivity
- **Push Notifications**: Weather alerts, risk updates, subscription notifications
- **App Store Testing**: Reviews, ratings, ASO metrics
- **Social Sharing**: Property sharing, educational content, viral metrics

#### Usage Example:
```typescript
import { mobileScenarios } from './test-data';

// Test location permission flow
const locationFlow = mobileScenarios.locationPermissions.first_time_permission_flow;

// Test offline mode
const offlineMode = mobileScenarios.offlineMode.cached_data_available;

// Test push notifications
const notifications = mobileScenarios.pushNotifications.weather_alert_notifications;
```

### 6. Performance Data (`performance-data.ts`)

Comprehensive performance and load testing scenarios:

#### Performance Categories:
- **High-Volume Users**: Hurricane season peaks, conference surges
- **Concurrent Location Requests**: Geocoding load tests, mobile bursts
- **Database Stress Tests**: Read/write heavy scenarios, mixed workloads
- **API Rate Limiting**: Subscription tier limits, abuse prevention
- **Mobile Network Simulations**: Various connection conditions, transitions
- **Performance Benchmarks**: SLA targets, scalability metrics

#### Usage Example:
```typescript
import { performanceData } from './test-data';

// Hurricane season peak load test
const peakLoad = performanceData.highVolumeUsers.hurricane_season_peak;

// Database stress test
const dbStress = performanceData.databaseStress.high_read_volume_test;

// Mobile network simulation
const networkTest = performanceData.mobileNetwork.network_conditions[0];
```

## Utility Functions (`utils.ts`)

Helper functions for working with test data:

### Available Utilities:

#### Risk Level Utilities:
```typescript
import { testDataUtils } from './test-data';

// Generate weighted risk level
const riskLevel = testDataUtils.riskLevels.generateWeightedRiskLevel();

// Convert score to level
const level = testDataUtils.riskLevels.scoreToLevel(75); // Returns 'VERY_HIGH'
```

#### Geographic Utilities:
```typescript
// Generate coordinates within bounds
const coords = testDataUtils.geography.generateCoordinatesInBounds({
  north: 26.0,
  south: 25.0,
  east: -80.0,
  west: -81.0
});

// Calculate distance between points
const distance = testDataUtils.geography.calculateDistance(coord1, coord2);

// Generate US address
const address = testDataUtils.geography.generateUSAddress();
```

#### User Data Generators:
```typescript
// Generate user profile
const user = testDataUtils.users.generateUserProfile('premium');

// Generate usage statistics
const usage = testDataUtils.users.generateUsageStats('professional');
```

#### Data Transformation:
```typescript
// Convert to API response format
const apiResponse = testDataUtils.transform.toApiResponse(data, true, 250);

// Add network delay simulation
const delayedData = await testDataUtils.transform.addNetworkDelay(data, 'slow');
```

#### Privacy Utilities:
```typescript
// Anonymize user data
const anonymizedUser = testDataUtils.privacy.anonymizeUserData(user);

// Add consent metadata
const testData = testDataUtils.privacy.addConsentMetadata(rawData);
```

## Usage in Testing

### Unit Tests:
```typescript
import { propertyAssessments, testDataUtils } from '../test-data';

describe('Risk Assessment Component', () => {
  it('should display high risk properties correctly', () => {
    const highRiskProperty = propertyAssessments.majorUSCities.miami_florida;
    const component = render(<RiskAssessment data={highRiskProperty} />);
    
    expect(component.getByText('HIGH')).toBeInTheDocument();
  });
});
```

### Integration Tests:
```typescript
import { apiMockResponses } from '../test-data';

describe('Property Search Integration', () => {
  it('should handle FEMA API responses', async () => {
    // Mock API response
    jest.spyOn(api, 'getPropertyRisk').mockResolvedValue(
      apiMockResponses.fema.miami_property_success
    );
    
    const result = await searchProperty('Miami, FL');
    expect(result.risk_assessment.overall_score).toBe(78);
  });
});
```

### Performance Tests:
```typescript
import { performanceData } from '../test-data';

describe('Load Testing', () => {
  it('should handle hurricane season peak load', () => {
    const testConfig = performanceData.highVolumeUsers.hurricane_season_peak;
    
    // Simulate concurrent users
    const promises = Array.from(
      { length: testConfig.user_simulation.concurrent_users },
      () => simulateUserSession()
    );
    
    // Test performance expectations
    // ...
  });
});
```

### Mobile Testing:
```typescript
import { mobileScenarios } from '../test-data';

describe('Mobile Location Permissions', () => {
  it('should handle permission denied gracefully', () => {
    const scenario = mobileScenarios.locationPermissions.permission_denied_scenario;
    
    // Simulate permission denial
    mockLocationPermission('denied');
    
    // Test fallback behavior
    const app = renderMobileApp();
    expect(app.getByText('Enter address manually')).toBeVisible();
  });
});
```

## Data Privacy and Compliance

All test data is designed with privacy in mind:

- **No Real PII**: All user data uses fictional names and contact information
- **Anonymized Addresses**: Real addresses are used for geographic accuracy but associated with fictional users
- **GDPR Compliant**: Includes consent metadata and retention policies
- **Test Environment Only**: Clearly marked as test data with appropriate metadata

## Maintenance and Updates

### Adding New Test Data:

1. **Create the data structure** following existing patterns
2. **Use utility functions** for consistency
3. **Include comprehensive documentation**
4. **Add validation** using the validator utilities
5. **Update this README** with new scenarios

### Data Quality Guidelines:

- **Realistic Values**: Use actual climate data ranges and patterns
- **Geographic Accuracy**: Ensure coordinates match real locations
- **Temporal Consistency**: Use realistic timestamps and date ranges
- **Statistical Validity**: Maintain proper distributions and correlations

## Example Integration

Here's a complete example of integrating test data into a component test:

```typescript
import { render, screen, waitFor } from '@testing-library/react';
import { travelScenarios, apiMockResponses, testDataUtils } from '../test-data';
import TravelRiskAssessment from '../components/TravelRiskAssessment';

describe('Travel Risk Assessment', () => {
  it('should display Sicily summer travel risks correctly', async () => {
    // Get test scenario
    const scenario = travelScenarios.sicily.palermo_summer_2024;
    
    // Mock API response
    const mockResponse = testDataUtils.transform.toApiResponse(
      scenario.risk_assessment
    );
    
    // Render component with test data
    const component = render(
      <TravelRiskAssessment 
        location={scenario.location}
        travelDates={scenario.travel_dates}
      />
    );
    
    // Test UI rendering
    await waitFor(() => {
      expect(screen.getByText('HIGH')).toBeInTheDocument();
      expect(screen.getByText('Extreme heat risk')).toBeInTheDocument();
    });
  });
});
```

This comprehensive test data suite enables thorough testing of all Seawater platform features while maintaining realistic scenarios that reflect actual user needs and climate risk patterns.