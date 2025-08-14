# Seawater Climate Risk Platform - Testing Guide

## Overview

This comprehensive testing guide covers all aspects of testing for the Seawater climate risk platform, ensuring production-ready quality across all components.

## Table of Contents

- [Testing Strategy](#testing-strategy)
- [Test Types and Coverage](#test-types-and-coverage)
- [Running Tests](#running-tests)
- [Test Data Management](#test-data-management)
- [Performance Benchmarks](#performance-benchmarks)
- [Quality Gates](#quality-gates)
- [Troubleshooting](#troubleshooting)

## Testing Strategy

### Test Pyramid Structure

```
                    /\
                   /  \
                  / E2E \
                 /______\
                /        \
               /Integration\
              /___________ \
             /              \
            /  Unit Tests    \
           /                 \
          /__________________\
```

- **Unit Tests (70%)**: Component logic, functions, utilities
- **Integration Tests (20%)**: API endpoints, database operations, external services
- **E2E Tests (10%)**: Complete user workflows, critical paths

### Testing Principles

1. **Test Early, Test Often**: Run tests continuously during development
2. **Test in Production-like Environments**: Use realistic data and conditions
3. **Fail Fast**: Catch issues early in the development cycle
4. **Comprehensive Coverage**: Aim for 90%+ test coverage on critical paths
5. **Data Quality First**: Ensure accuracy of climate risk assessments

## Test Types and Coverage

### 1. Unit Tests
**Location**: `/tests/frontend/unit/`, `/tests/backend/unit/`
**Coverage Target**: 90%+

```bash
# Run all unit tests
npm run test:unit

# Run with coverage
npm run test -- --coverage

# Watch mode for development
npm run test:watch
```

**Key Areas**:
- React component rendering and interactions
- Risk calculation algorithms
- Data normalization functions
- Utility functions and helpers

### 2. Integration Tests
**Location**: `/tests/backend/integration/`, `/tests/frontend/integration/`
**Coverage Target**: 80%+

```bash
# Run integration tests
npm run test:integration

# Run specific integration suite
npm run test:backend
npm run test:frontend
```

**Key Areas**:
- API endpoint functionality
- Database operations with PostGIS
- External API integrations
- User workflow completion

### 3. End-to-End Tests
**Location**: `/tests/e2e/`
**Framework**: Playwright

```bash
# Run E2E tests
npm run test:e2e

# Run in headed mode (with browser UI)
npm run test:e2e -- --headed

# Run specific test file
npx playwright test property-search.spec.ts
```

**Critical User Journeys**:
- Property address search and risk assessment
- Property comparison workflow
- Professional directory search
- Subscription tier feature access

### 4. Performance Tests
**Location**: `/tests/performance/`
**Framework**: Artillery.io

```bash
# Run load tests
npm run test:load

# Run performance audit
npm run test:performance

# Run memory leak detection
npm run test:memory
```

**Performance Targets**:
- API Response Time: <2 seconds (95th percentile)
- Map Loading: <1 second
- Concurrent Users: 1000+
- Database Queries: <500ms (99th percentile)

### 5. Security Tests
**Location**: `/tests/security/`

```bash
# Run security test suite
npm run test:security

# Run security audit
npm audit

# Check for vulnerabilities
npm run security-scan
```

**Security Areas**:
- JWT token validation
- API key authentication
- Input sanitization
- Rate limiting
- CORS configuration

### 6. Data Quality Tests
**Location**: `/tests/data-quality/`

```bash
# Run data quality tests
npm run test:data-quality

# Run external API validation
npm run test:external-apis

# Validate against known benchmarks
npm run test:accuracy
```

**Data Quality Checks**:
- Risk score accuracy against FEMA flood zones
- Cross-source data consistency
- Geographic coordinate validation
- Historical data correlation

## Running Tests

### Local Development

```bash
# Install dependencies
npm install

# Setup test environment
npm run test:setup

# Run all tests
npm run test:all

# Run tests with specific pattern
npm test -- --testNamePattern="RiskScoreCard"

# Run tests for specific file
npm test componentUnitTests.test.tsx
```

### Environment Variables

Create a `.env.test` file with:

```bash
# Test Environment Configuration
NODE_ENV=test
REACT_APP_API_BASE_URL=https://api-test.seawater.io
REACT_APP_MAPBOX_TOKEN=pk.test.mapbox.token

# External API Keys for Testing
FEMA_API_KEY=test-fema-key
FIRST_STREET_API_KEY=test-firststreet-key
CLIMATE_CHECK_API_KEY=test-climatecheck-key

# Database Configuration
DATABASE_URL=postgresql://test:test@localhost:5432/seawater_test
REDIS_URL=redis://localhost:6379/1

# Security Testing
JWT_SECRET=test-jwt-secret-key-for-seawater-testing
RATE_LIMIT_WINDOW=60000
RATE_LIMIT_MAX=100
```

### CI/CD Pipeline

Tests run automatically on:
- Every pull request
- Merge to `develop` branch (staging deployment)
- Merge to `main` branch (production deployment)
- Nightly scheduled runs for comprehensive testing

### Test Parallelization

```bash
# Run tests in parallel (faster CI)
npm run test:ci

# Run specific test suites in parallel
npm run test:unit & npm run test:integration & wait
```

## Test Data Management

### Test Properties

Use predefined test properties from `/tests/config/test-data.json`:

```javascript
const testData = require('./tests/config/test-data.json');

// High flood risk property
const houstonProperty = testData.test_properties.high_flood_risk;

// Low risk baseline
const kansasProperty = testData.test_properties.low_risk_baseline;
```

### Mock Data Generation

```javascript
// Generate realistic test data
const mockRiskData = {
  fema: {
    flood_score: Math.floor(Math.random() * 100),
    wildfire_score: Math.floor(Math.random() * 100),
    // ... other risk scores
  }
};
```

### Database Seeding

```bash
# Seed test database
npm run test:seed

# Reset test database
npm run test:reset

# Load specific test dataset
npm run test:load-data -- --dataset=flood-zones
```

## Performance Benchmarks

### Response Time Targets

| Endpoint | Target (95th percentile) | Timeout |
|----------|-------------------------|---------|
| Property Risk Lookup | <2 seconds | 10 seconds |
| Geocoding | <500ms | 5 seconds |
| Map Rendering | <1 second | 3 seconds |
| Professional Search | <1.5 seconds | 8 seconds |
| Bulk Processing | <30 seconds | 60 seconds |

### Load Testing Scenarios

```yaml
# Artillery configuration
scenarios:
  - name: "Normal Load"
    weight: 60
    arrivalRate: 20  # 20 users/second
    
  - name: "Peak Load"
    weight: 30
    arrivalRate: 50  # 50 users/second
    
  - name: "Stress Test"
    weight: 10
    arrivalRate: 100 # 100 users/second
```

### Memory Usage Monitoring

```bash
# Monitor memory during tests
npm run test:memory

# Generate memory usage report
npm run analyze:memory
```

## Quality Gates

### Test Coverage Requirements

- **Overall Coverage**: 85%+
- **Critical Business Logic**: 95%+
- **API Endpoints**: 90%+
- **Security Functions**: 100%
- **Risk Calculation**: 100%

### Performance Gates

- **P95 Response Time**: <2 seconds
- **Error Rate**: <1% in production
- **Availability**: 99.9% uptime
- **Concurrent Users**: 1000+ without degradation

### Security Gates

- **Vulnerability Scan**: No critical or high severity issues
- **Authentication**: 100% test coverage
- **Input Validation**: 100% test coverage
- **Rate Limiting**: Functional verification required

### Data Quality Gates

- **Risk Score Accuracy**: ±10% variance from known benchmarks
- **Geographic Precision**: Within 10 meters accuracy
- **Data Source Consistency**: <20% variance between sources
- **Historical Correlation**: Statistical significance required

## Continuous Integration

### Pipeline Stages

1. **Code Quality**: Linting, formatting, type checking
2. **Unit Tests**: Component and function testing
3. **Integration Tests**: API and database testing
4. **Security Scan**: Vulnerability and penetration testing
5. **E2E Tests**: Complete user workflow validation
6. **Performance Tests**: Load and stress testing
7. **Data Quality**: Accuracy and consistency validation
8. **Deployment**: Staging/production deployment with smoke tests

### Failure Handling

```bash
# View failed test output
npm run test:debug

# Generate detailed test report
npm run test:report

# Clean up after failed tests
npm run test:cleanup
```

## Troubleshooting

### Common Issues

#### Test Timeouts
```bash
# Increase timeout for slow tests
npm test -- --testTimeout=30000

# Debug hanging tests
npm run test:debug -- --detectOpenHandles
```

#### Database Connection Issues
```bash
# Check database connectivity
npm run test:db-check

# Reset test database
npm run test:db-reset

# Verify PostGIS extensions
npm run test:db-verify
```

#### External API Failures
```bash
# Use mock data for external APIs
export USE_MOCK_APIS=true
npm run test:integration

# Check API key configuration
npm run test:api-keys
```

#### Memory Leaks
```bash
# Detect memory leaks
npm run test -- --detectLeaks

# Force garbage collection
npm run test -- --forceExit
```

### Test Environment Setup

#### Docker Development Environment
```bash
# Start test services
docker-compose -f docker-compose.test.yml up -d

# Run tests in container
docker-compose exec app npm run test:all

# Clean up
docker-compose -f docker-compose.test.yml down
```

#### Local PostgreSQL + PostGIS
```bash
# Install PostGIS extension
psql -d seawater_test -c "CREATE EXTENSION IF NOT EXISTS postgis;"

# Load test geographic data
npm run test:load-geo-data
```

### Debugging Tests

#### Jest Debugging
```bash
# Debug specific test
node --inspect-brk node_modules/.bin/jest --runInBand componentTests.test.tsx

# Use VS Code debugger
# Add breakpoint and run "Debug Jest Tests" configuration
```

#### Playwright Debugging
```bash
# Debug E2E tests with browser
npx playwright test --debug

# Record test execution
npx playwright test --trace on
```

### Performance Debugging

#### Slow Test Analysis
```bash
# Profile test execution
npm run test -- --verbose --coverage=false

# Identify slow tests
npm run test:slow
```

#### Memory Analysis
```bash
# Generate heap snapshot
npm run test:heap-snapshot

# Analyze memory usage
npm run analyze:memory
```

## Best Practices

### Writing Effective Tests

1. **Descriptive Names**: Use clear, descriptive test names
2. **Single Responsibility**: Each test should verify one specific behavior
3. **Independent Tests**: Tests should not depend on each other
4. **Realistic Data**: Use production-like test data
5. **Error Cases**: Test both success and failure scenarios

### Test Organization

```
tests/
├── setup/
│   └── jest.setup.js
├── config/
│   └── test-data.json
├── frontend/
│   ├── unit/
│   └── integration/
├── backend/
│   ├── unit/
│   └── integration/
├── e2e/
├── performance/
├── security/
├── data-quality/
└── utils/
```

### Mock Strategy

- **External APIs**: Always mock in unit tests
- **Database**: Use test database with realistic data
- **Time**: Mock time-dependent functions
- **Random**: Seed random number generators

### Test Maintenance

- **Regular Updates**: Keep tests updated with feature changes
- **Flaky Test Monitoring**: Track and fix unreliable tests
- **Performance Monitoring**: Watch for test suite slowdown
- **Coverage Gaps**: Regularly review and improve coverage

## Reporting and Metrics

### Test Reports

```bash
# Generate HTML test report
npm run test:report

# Export coverage report
npm run test:coverage-export

# Performance test results
npm run test:performance-report
```

### Metrics Dashboard

Monitor key testing metrics:
- Test success rate over time
- Test execution duration trends
- Coverage percentage by component
- Performance benchmark adherence
- Security vulnerability counts

### Alerting

Set up alerts for:
- Test failures in CI/CD pipeline
- Performance degradation
- Security vulnerabilities
- Data quality issues
- Coverage drops below threshold

For additional support or questions about testing, please refer to the [Development Guide](./DEVELOPMENT_GUIDE.md) or contact the development team.