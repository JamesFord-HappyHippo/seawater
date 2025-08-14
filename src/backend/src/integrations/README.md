# Seawater Climate Data Integration Platform

A robust, enterprise-grade climate data integration system that aggregates risk information from multiple authoritative sources including FEMA, NOAA, USGS, and premium data providers.

## 🏗️ Architecture Overview

The integration platform follows Tim-Combo's proven patterns with native Node.js HTTP clients, comprehensive retry logic, and sophisticated error handling.

### Core Components

```
integrations/
├── core/                     # Core infrastructure
│   ├── HTTPClient.js         # Native HTTP with retry logic
│   ├── APIRateLimiter.js     # Token bucket rate limiting
│   ├── CacheManager.js       # Redis-based caching
│   ├── DataSourceManager.js  # Multi-source orchestration
│   └── APIHealthMonitor.js   # Health monitoring & alerts
├── clients/                  # Data source clients
│   ├── government/           # Government APIs (FEMA, USGS, NOAA)
│   ├── state/               # State-specific APIs (CAL FIRE, etc.)
│   ├── premium/             # Premium APIs (FirstStreet, ClimateCheck)
│   └── geocoding/           # Geocoding services
├── utils/                   # Utilities
│   ├── RiskScoreAggregator.js # Multi-source risk calculation
│   ├── AuthenticationManager.js # API key & OAuth management
│   └── ErrorClassifier.js   # Error categorization
└── examples/                # Usage examples
```

## 🚀 Quick Start

### Installation

```bash
npm install
```

### Environment Configuration

```bash
# Required for geocoding
export MAPBOX_ACCESS_TOKEN=your_mapbox_token

# Optional - for enhanced functionality
export NOAA_API_TOKEN=your_noaa_token
export FIRSTSTREET_API_KEY=your_firststreet_key
export CLIMATECHECK_API_KEY=your_climatecheck_key
export GOOGLE_GEOCODING_API_KEY=your_google_key

# Optional - Redis for caching
export REDIS_URL=redis://localhost:6379
```

### Basic Usage

```javascript
const { ClimateDataIntegration } = require('./src/backend/src/integrations');

// Initialize platform
const climate = new ClimateDataIntegration({
    mapboxToken: process.env.MAPBOX_ACCESS_TOKEN,
    enableMonitoring: true,
    rateLimitingEnabled: true
});

// Get comprehensive risk assessment
const assessment = await climate.getPropertyRiskAssessment(
    '1600 Pennsylvania Avenue NW, Washington, DC 20500'
);

console.log(`Overall Risk Score: ${assessment.overallRisk.score}/100`);
console.log(`Risk Level: ${assessment.overallRisk.level}`);
console.log(`Confidence: ${Math.round(assessment.overallRisk.confidence * 100)}%`);
```

## 📊 Data Sources

### Government Data Sources (Free)
- **FEMA National Risk Index** - 18 natural hazards by census tract
- **USGS Earthquake API** - Real-time and historical earthquake data
- **NOAA Climate Data Online** - Weather and climate data
- **US Census Geocoding** - Address standardization
- **National Hurricane Center** - Hurricane tracking and history

### State and Regional Sources
- **CAL FIRE** - California wildfire risk data
- **NIFC** - National wildfire incident data
- **State Emergency Management** - Localized risk data

### Premium Data Sources
- **First Street Foundation** (~$30/month) - Property-specific climate risk
- **ClimateCheck** - Detailed risk assessments
- **MapBox Geocoding** - High-precision address lookup

## 🔄 Data Source Priority & Fallback

The platform uses intelligent source prioritization with automatic fallbacks:

```javascript
// Risk assessment data source priority
const DATA_SOURCE_PRIORITY = {
    flood_risk: ['FEMA_NRI', 'FirstStreet', 'NOAA_Coastal'],
    wildfire_risk: ['CAL_FIRE', 'NIFC', 'FEMA_NRI'],
    hurricane_risk: ['HURDAT2', 'NHC', 'FEMA_NRI'],
    earthquake_risk: ['USGS_Earthquake', 'FEMA_NRI'],
    heat_risk: ['NOAA_CDO', 'NASA_POWER', 'FirstStreet']
};
```

## 🛡️ Reliability Features

### Rate Limiting
- Token bucket algorithm with per-source limits
- Cost-based limiting for premium APIs
- Automatic request queuing and retry

### Error Handling
- Circuit breaker pattern for unreliable sources
- Exponential backoff with jitter
- Comprehensive error classification

### Caching Strategy
```javascript
const CACHE_TTL = {
    property_risk: 3600,        // 1 hour
    weather_data: 21600,        // 6 hours  
    geographic_boundaries: 604800, // 1 week
    historical_disasters: 86400,   // 1 day
    geocoding: 2592000          // 30 days
};
```

### Health Monitoring
- Automated health checks every 5 minutes
- Performance metrics and uptime tracking
- Alert system for service degradation

## 📈 Risk Score Aggregation

### Multi-Source Confidence Weighting

```javascript
// Source reliability weights
const SOURCE_WEIGHTS = {
    'FEMA_NRI': 0.95,
    'FirstStreet': 0.90,
    'USGS_Earthquake': 0.95,
    'NOAA_CDO': 0.90,
    'CAL_FIRE': 0.88
};
```

### Risk Level Classification

| Score Range | Risk Level | Description |
|-------------|------------|-------------|
| 0-20        | Very Low   | Minimal climate risk |
| 21-40       | Low        | Below average risk |
| 41-60       | Moderate   | Average risk level |
| 61-80       | High       | Above average risk |
| 81-100      | Very High  | Extreme risk level |

## 🔧 API Examples

### Property Risk Assessment

```javascript
const assessment = await climate.getPropertyRiskAssessment(address);

// Response structure
{
    propertyId: "abc123...",
    assessmentDate: "2025-08-13T...",
    overallRisk: {
        score: 65,
        level: "high",
        confidence: 0.87,
        description: "High Risk"
    },
    riskBreakdown: {
        flood_risk: { score: 75, level: "high", confidence: 0.9 },
        wildfire_risk: { score: 45, level: "moderate", confidence: 0.8 },
        earthquake_risk: { score: 30, level: "low", confidence: 0.95 }
    },
    location: {
        address: "123 Main St, City, State",
        coordinates: { latitude: 37.7749, longitude: -122.4194 },
        components: { city: "San Francisco", state: "CA", ... }
    },
    dataQuality: {
        overallConfidence: 0.87,
        dataCompleteness: 0.92,
        sourceReliability: 0.91,
        lastUpdated: "2025-08-13T..."
    }
}
```

### Coordinate-Based Assessment

```javascript
const assessment = await climate.getRiskAssessmentByCoordinates(
    37.7749,  // latitude
    -122.4194 // longitude
);
```

### Batch Processing

```javascript
const results = await climate.batchRiskAssessment([
    "123 Main St, City, State",
    "456 Oak Ave, Town, State",
    // ... more addresses
], {
    batchSize: 10,
    concurrent: 5
});
```

## 📋 Configuration Options

### Platform Initialization

```javascript
const climate = new ClimateDataIntegration({
    // Geocoding configuration
    mapboxToken: process.env.MAPBOX_ACCESS_TOKEN,
    
    // Caching configuration
    cache: {
        redisClient: redisClient, // Optional Redis client
        keyPrefix: 'seawater:',
        defaultTTL: 3600
    },
    
    // HTTP client configuration
    http: {
        timeout: 30000,
        maxRetries: 3,
        retryDelay: 1000,
        userAgent: 'Seawater-Platform/1.0'
    },
    
    // Platform features
    enableMonitoring: true,
    rateLimitingEnabled: true,
    fallbackEnabled: true,
    defaultCacheTTL: 3600
});
```

## 🔍 Monitoring & Health Checks

### Health Status

```javascript
const health = await climate.getHealthStatus();

// Monitor individual data sources
console.log(health.dataSources.FEMA_NRI.healthStatus); // healthy/degraded/unhealthy
```

### Platform Statistics

```javascript
const stats = climate.getStats();

console.log(`HTTP Success Rate: ${stats.httpClient.successRate}%`);
console.log(`Cache Hit Rate: ${stats.cacheManager.hitRate}%`);
console.log(`Average Response Time: ${stats.httpClient.averageResponseTime}ms`);
```

### Integration Tests

```javascript
const testResults = await climate.testIntegrations();

// Check which APIs are operational
for (const [service, result] of Object.entries(testResults)) {
    console.log(`${service}: ${result.success ? 'OK' : 'FAILED'}`);
}
```

## 🚨 Error Handling

### Error Types and Responses

```javascript
try {
    const assessment = await climate.getPropertyRiskAssessment(address);
} catch (error) {
    if (error.message.includes('geocoding failed')) {
        // Handle address not found
    } else if (error.message.includes('All sources failed')) {
        // Handle total API failure
    } else if (error.message.includes('Rate limit exceeded')) {
        // Handle rate limiting
    }
}
```

### Circuit Breaker States

- **CLOSED**: Normal operation
- **OPEN**: Source temporarily disabled due to failures
- **HALF_OPEN**: Testing if source has recovered

## 📊 Performance Optimization

### Response Time Targets
- Property risk assessment: < 2 seconds
- Batch processing: < 500ms per address
- Health checks: < 1 second

### Caching Strategy
- **Geographic boundaries**: 1 week (rarely change)
- **Historical disasters**: 1 day (stable data)
- **Real-time alerts**: 5 minutes (time-sensitive)
- **Property risk**: 1 hour (balanced freshness/performance)

### Rate Limit Management
- **Government APIs**: Conservative limits to ensure availability
- **Premium APIs**: Cost-optimized with intelligent queuing
- **Geocoding**: Aggressive caching to minimize usage

## 🔐 Security & Authentication

### API Key Management
```javascript
// Environment variables for secure storage
process.env.MAPBOX_ACCESS_TOKEN
process.env.NOAA_API_TOKEN
process.env.FIRSTSTREET_API_KEY
```

### Request Authentication
- Bearer tokens for premium APIs
- API key headers for geocoding services
- No authentication required for government APIs

## 🧪 Testing

### Run Examples
```bash
# Set required environment variables
export MAPBOX_ACCESS_TOKEN=your_token

# Run all examples
node src/backend/src/integrations/examples/basic-usage.js
```

### Integration Tests
```bash
# Test all API connections
npm run test:integrations

# Test specific components
npm run test:core
npm run test:clients
```

## 📚 Additional Resources

### Documentation
- [FEMA National Risk Index API Documentation](https://www.fema.gov/about/openfema/api)
- [USGS Earthquake API Documentation](https://earthquake.usgs.gov/fdsnws/event/1/)
- [NOAA Climate Data Online Documentation](https://www.ncei.noaa.gov/support/access-data-service-api-user-documentation)
- [MapBox Geocoding API Documentation](https://docs.mapbox.com/api/search/geocoding/)

### Tim-Combo Integration Patterns
This platform implements proven patterns from Tim-Combo's enterprise integrations:
- Native Node.js HTTP clients (no external dependencies like axios)
- Comprehensive retry logic with exponential backoff
- Circuit breaker pattern for unreliable sources
- Structured JSON logging for monitoring
- Connection pooling and timeout management

## 🤝 Contributing

### Adding New Data Sources
1. Create client in appropriate `clients/` subdirectory
2. Implement standard interface methods
3. Add source to `DataSourceManager` configuration
4. Update risk aggregation weights in `RiskScoreAggregator`
5. Add health checks to `APIHealthMonitor`

### Code Standards
- Follow Tim-Combo patterns for HTTP handling
- Implement comprehensive error handling
- Add extensive logging for monitoring
- Include thorough input validation
- Maintain backward compatibility

## 📄 License

Copyright (c) 2025 Seawater Climate Risk Platform. All rights reserved.

---

**Built with the Tim-Combo integration architecture** - Proven patterns for enterprise-grade API integrations with robust error handling, intelligent fallbacks, and comprehensive monitoring.