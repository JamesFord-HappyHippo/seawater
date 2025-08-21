# NOAA Weather Integration for Seawater Climate Risk Platform

## Overview

This comprehensive integration adds extensive NOAA (National Oceanic and Atmospheric Administration) weather and climate data to the Seawater Climate Risk Platform. The integration enhances property risk assessments with historical weather context, current conditions, climate trends, and real-time weather alerts.

## Features Implemented

### 🌊 Core NOAA API Integration
- **NOAA Climate Data Online (CDO)**: Historical climate data, normals, and trends
- **NOAA Weather Service API**: Real-time alerts, forecasts, and current observations  
- **NOAA Storm Events Database**: Historical severe weather events (1950-2025)
- **Hurricane Database (HURDAT)**: Hurricane tracking data
- **Sea Level Trends**: Coastal flood risk data

### 🎯 Risk Assessment Enhancement
- **Weather-Adjusted Risk Scores**: Original risk scores enhanced with weather context
- **Historical Frequency Analysis**: Risk adjustments based on past weather events
- **Seasonal Risk Factors**: Risk multipliers based on current season and climate patterns
- **Climate Trend Integration**: Long-term climate change impact on risk calculations
- **Current Conditions Impact**: Real-time weather affecting immediate risk levels

### 📊 Data Intelligence
- **Intelligent Caching**: Multi-tier caching strategy for different data types
- **Rate Limiting**: Respects NOAA API limits (5 req/sec CDO, 10,000/day)
- **Data Quality Scoring**: Confidence metrics for weather-enhanced assessments
- **Geographic Clustering**: Efficient API usage through spatial optimization

### 🖥️ User Interface Components
- **Weather Context Display**: Comprehensive weather summary with climate trends
- **Historical Weather Timeline**: Interactive timeline of past weather events
- **Weather Risk Enhancement**: Detailed view of weather adjustments to risk scores
- **Weather Dashboard**: Complete weather intelligence overview

## Setup and Configuration

### 1. Environment Variables

Add these environment variables to your `.env` file:

```bash
# Required: NOAA Climate Data Online API Token
REACT_APP_NOAA_CDO_TOKEN=your_noaa_token_here

# Optional: Custom User-Agent for Weather Service API
REACT_APP_NOAA_USER_AGENT="(yoursite.com, contact@yoursite.com) Your App Name"

# Optional: Enable debug logging
REACT_APP_ENABLE_WEATHER_DEBUG=true
```

### 2. Get NOAA API Token

1. Visit: https://www.ncdc.noaa.gov/cdo-web/token
2. Enter your email address
3. You'll receive a free API token within seconds
4. Add the token to your environment variables

### 3. Weather Service API

The NOAA Weather Service API requires no authentication, only a proper User-Agent header with contact information.

## Usage Examples

### Basic Weather Risk Integration

```typescript
import { useWeatherRisk } from '../hooks/useWeatherRisk';
import { WeatherDashboard } from '../components/weather';

function PropertyAssessment({ propertyData }: { propertyData: PropertyRiskData }) {
  const {
    weatherContext,
    enhancedRiskData,
    isLoading,
    refreshWeatherData,
    enhancePropertyRisk
  } = useWeatherRisk(propertyData.property.coordinates);

  const handleEnhanceRisk = async () => {
    const enhanced = await enhancePropertyRisk(propertyData);
    if (enhanced) {
      console.log('Risk enhanced with weather data:', enhanced);
    }
  };

  return (
    <div>
      {/* Original risk display */}
      <RiskScoreWidget hazardType="flood" scores={propertyData.risk_assessment.hazards.flood?.sources} />
      
      {/* Weather-enhanced dashboard */}
      <WeatherDashboard 
        propertyRiskData={enhancedRiskData || propertyData}
        showAllSections={true}
      />
    </div>
  );
}
```

### Quick Weather Status Check

```typescript
import { useQuickWeatherStatus } from '../hooks/useWeatherRisk';

function PropertyCard({ coordinates }: { coordinates: Coordinates }) {
  const { hasActiveAlerts, alertCount, riskFactors } = useQuickWeatherStatus(coordinates);

  return (
    <div className="property-card">
      {hasActiveAlerts && (
        <div className="alert-indicator">
          ⚠️ {alertCount} active weather alert{alertCount > 1 ? 's' : ''}
        </div>
      )}
      {/* Rest of property card */}
    </div>
  );
}
```

### Manual Weather Data Integration

```typescript
import { noaaDataClient, weatherRiskIntegration } from '../api';

async function getWeatherIntelligence(coordinates: Coordinates) {
  // Get comprehensive weather context
  const weatherResponse = await noaaDataClient.getComprehensiveWeatherContext(coordinates);
  
  if (weatherResponse.success) {
    const context = weatherResponse.data;
    
    // Access different weather data sources
    const alerts = context.data_sources.active_alerts || [];
    const historicalEvents = context.data_sources.historical_events || [];
    const climateNormals = context.data_sources.climate_normals;
    
    console.log('Active alerts:', alerts.length);
    console.log('Historical events:', historicalEvents.length);
    console.log('Climate confidence:', context.confidence_score);
  }
}
```

## API Structure

### Core Clients

#### NOAADataClient (`/api/noaaDataClient.ts`)
- **Climate Data**: `getClimateData()`, `getClimateNormals()`, `getClimateStations()`
- **Weather Service**: `getWeatherPoint()`, `getForecast()`, `getActiveAlerts()`
- **Historical Data**: `getHistoricalStormEvents()`
- **Comprehensive**: `getComprehensiveWeatherContext()`

#### WeatherRiskIntegrationService (`/api/weatherRiskIntegration.ts`)
- **Risk Enhancement**: `enhancePropertyRiskWithWeather()`
- **Weather Context**: `getWeatherEnhancedPropertyRisk()`
- **Quick Checks**: `WeatherRiskUtils.quickWeatherRiskCheck()`

### React Components

#### Weather Dashboard (`/components/weather/WeatherDashboard.tsx`)
Complete weather intelligence overview with:
- Weather context summary
- Historical event timeline  
- Risk enhancement analysis
- Real-time data refresh

#### Weather Context Display (`/components/weather/WeatherContextDisplay.tsx`)
- Climate trend indicators
- Active alert notifications
- Seasonal risk elevation
- Weather confidence scoring

#### Historical Weather Timeline (`/components/weather/HistoricalWeatherTimeline.tsx`)
- Chronological event listing
- Event frequency analysis
- Damage and impact statistics
- Interactive event filtering

#### Weather Risk Enhancement (`/components/weather/WeatherRiskEnhancement.tsx`)
- Original vs weather-adjusted risk scores
- Detailed adjustment factor breakdown
- Weather impact explanations
- Confidence metrics

### React Hooks

#### useWeatherRisk (`/hooks/useWeatherRisk.ts`)
Comprehensive weather data management:
- Auto-refresh capabilities
- Error handling with retry logic
- Cache management
- Real-time data integration

#### useQuickWeatherStatus (`/hooks/useWeatherRisk.ts`)
Lightweight weather status checking:
- Active alert detection
- Basic risk factor identification
- Minimal performance impact

## Data Enhancement Process

### 1. Historical Frequency Analysis
```typescript
// Analyzes historical storm events for frequency-based risk adjustments
const historicalFactor = calculateHistoricalFrequencyFactor(hazardType, historicalEvents);
// Range: 0.8 - 1.3x based on event frequency and severity
```

### 2. Seasonal Risk Factors
```typescript
// Applies seasonal multipliers based on climate patterns
const seasonalFactor = calculateSeasonalFactor(hazardType, currentSeason);
// Example: Hurricane risk 1.5x during hurricane season (June-November)
```

### 3. Climate Trend Integration
```typescript
// Long-term climate change impact on hazard risk
const climateFactor = calculateClimateTrendFactor(hazardType, climateData);
// Based on temperature trends, precipitation changes, extreme event frequency
```

### 4. Current Conditions Impact
```typescript
// Real-time weather impact on immediate risk
const currentFactor = calculateCurrentConditionsFactor(hazardType, alerts, observations);
// Active alerts, current temperature, humidity, wind conditions
```

### 5. Final Risk Calculation
```typescript
const weatherAdjustedScore = originalScore * (
  historicalFactor * 0.3 +
  seasonalFactor * 0.25 +
  climateFactor * 0.25 +
  currentFactor * 0.2
);
```

## Caching Strategy

### Multi-Tier Caching System
- **Real-time data** (15 min TTL): Active alerts, current observations
- **Daily data** (6 hour TTL): Daily weather observations
- **Monthly data** (7 day TTL): Monthly climate summaries
- **Historical data** (30 day TTL): Storm events, historical analysis
- **Climate normals** (90 day TTL): 30-year climate averages

### Cache Warming
```typescript
// Proactively cache frequently accessed data
await noaaDataClient.getClimateNormals(coordinates);
await noaaDataClient.getActiveAlerts(coordinates);
```

## Performance Considerations

### Rate Limiting
- **Climate Data Online**: 5 requests/second, 10,000/day limit
- **Weather Service**: ~10 requests/second (undocumented, conservative)
- **Intelligent queuing**: Automatic request spacing and retry logic

### Geographic Optimization
- **Spatial clustering**: Group nearby requests to minimize API calls
- **Data sharing**: Cache weather data for geographic regions
- **Fallback strategies**: Graceful degradation when APIs are unavailable

### Memory Management
- **Automatic cache cleanup**: Remove expired cache entries
- **Memory limits**: Maximum cache size to prevent memory leaks
- **Selective loading**: Only fetch required data types

## Error Handling

### Robust Error Recovery
```typescript
// Automatic retry with exponential backoff
if (retryCount < maxRetries) {
  setTimeout(() => retry(), Math.pow(2, retryCount) * 1000);
}

// Graceful degradation
if (!weatherResponse.success) {
  return originalRiskAssessment; // Fall back to non-weather-enhanced data
}

// User-friendly error messages
const errorMessage = weatherResponse.error?.code === 'RATE_LIMITED' 
  ? 'Weather data temporarily unavailable. Please try again in a few minutes.'
  : 'Unable to load weather data for this location.';
```

### Validation and Safety
- **Configuration validation**: Check API tokens and settings on startup
- **Data validation**: Verify response formats and required fields
- **Boundary checking**: Ensure risk scores stay within valid ranges (0-100)

## Integration Points

### Existing Risk Assessment
The weather integration enhances existing risk assessments without breaking changes:

```typescript
interface HazardAssessment {
  score: number;                    // Original score (unchanged)
  weather_adjusted_score?: number;  // New: Weather-enhanced score
  weather_adjustment_factors?: {    // New: Detailed adjustment breakdown
    historical_frequency?: number;
    seasonal_factor?: number;
    climate_trend?: number;
    current_conditions?: number;
  };
}

interface RiskAssessment {
  // All existing fields remain unchanged
  weather_context?: NOAAWeatherContextSummary; // New: Weather summary
}
```

### PropertyAssessment Page Integration
```typescript
// Add weather dashboard to existing property assessment
<PropertyAssessment>
  {/* Existing components */}
  <RiskScoreWidget />
  <RiskAttribution />
  
  {/* New weather integration */}
  <WeatherDashboard 
    propertyRiskData={propertyRiskData}
    showAllSections={true}
  />
</PropertyAssessment>
```

## Future Enhancements

### Planned Features
1. **Advanced Visualizations**: Interactive weather maps and charts
2. **Predictive Analytics**: Machine learning weather risk models
3. **Real-time Monitoring**: WebSocket connections for live weather updates
4. **Custom Alerts**: User-defined weather alert thresholds
5. **Historical Correlation**: Statistical analysis of weather events vs. property damage

### API Expansions
1. **NOAA Sea Level Rise**: Enhanced coastal flood risk modeling
2. **NOAA Drought Monitor**: Advanced drought risk assessment
3. **NOAA Climate Projections**: Future climate scenario modeling
4. **NOAA Aviation Weather**: Additional weather data sources

## Troubleshooting

### Common Issues

#### Missing NOAA Token
```bash
Error: NOAA Climate Data Online API token is required
Solution: Add REACT_APP_NOAA_CDO_TOKEN to environment variables
```

#### Rate Limit Exceeded
```bash
Error: NOAA API rate limit exceeded
Solution: Requests are automatically queued and retried. Wait a few seconds.
```

#### No Weather Data for Location
```bash
Warning: Weather data not available for this location
Solution: NOAA data coverage varies by location. This is normal for some areas.
```

#### Weather Service API Errors
```bash
Error: User-Agent header required
Solution: Ensure REACT_APP_NOAA_USER_AGENT includes contact information
```

### Debug Mode
Enable debug logging to troubleshoot issues:
```bash
REACT_APP_ENABLE_WEATHER_DEBUG=true
```

This will log detailed information about:
- API requests and responses
- Cache hit/miss statistics
- Rate limiting status
- Data processing steps

## Testing

### Unit Tests
```typescript
// Test weather risk enhancement
describe('WeatherRiskIntegration', () => {
  it('should enhance flood risk during rainy season', async () => {
    const enhanced = await weatherRiskIntegration.enhancePropertyRiskWithWeather(mockPropertyData);
    expect(enhanced.risk_assessment.hazards.flood?.weather_adjusted_score).toBeGreaterThan(
      enhanced.risk_assessment.hazards.flood?.score
    );
  });
});
```

### Integration Tests
```typescript
// Test NOAA API integration
describe('NOAADataClient', () => {
  it('should fetch active alerts for coordinates', async () => {
    const response = await noaaDataClient.getActiveAlerts({ latitude: 40.7128, longitude: -74.0060 });
    expect(response.success).toBe(true);
    expect(Array.isArray(response.data)).toBe(true);
  });
});
```

## Contributing

When extending the weather integration:

1. **Follow TypeScript patterns**: Use existing type definitions
2. **Maintain caching strategy**: Implement appropriate TTL for new data types
3. **Add error handling**: Include retry logic and graceful degradation
4. **Update documentation**: Document new features and API changes
5. **Test thoroughly**: Include unit and integration tests

## Support

For questions about the NOAA integration:

1. **Check logs**: Enable debug mode for detailed troubleshooting
2. **Validate configuration**: Use built-in configuration validation
3. **Review NOAA documentation**: https://www.weather.gov/documentation/services-web-api
4. **Test API connectivity**: Use provided validation hooks

## License and Attribution

This integration uses free, public APIs provided by NOAA. Attribution requirements:
- **Data Source**: National Oceanic and Atmospheric Administration (NOAA)
- **No cost**: All NOAA APIs used are free for public use
- **Rate limits**: Respect API rate limits and terms of service

---

*NOAA Integration completed for Seawater Climate Risk Platform*  
*Documentation last updated: August 2025*