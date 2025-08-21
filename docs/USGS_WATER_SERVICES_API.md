# USGS Water Services API Integration

## Overview

The Seawater Climate Risk Platform now includes comprehensive integration with USGS Water Services APIs to provide real-time flood monitoring, water quality assessment, and advanced flood risk evaluation. This integration enhances our climate risk assessment capabilities by adding authoritative government hydrological data to complement existing FEMA and earthquake risk data.

## New Capabilities

### 🌊 Flood Risk Assessment
- Real-time streamflow and gage height monitoring
- Historical flood condition analysis
- Percentile-based flood risk scoring
- Multi-site risk aggregation

### 💧 Water Quality Monitoring
- Temperature, dissolved oxygen, pH monitoring
- Turbidity and conductivity measurements
- Environmental risk assessment
- Water quality trend analysis

### 🚨 Real-time Alerts
- Flood warning and watch alerts
- Critical streamflow notifications
- Multi-location monitoring
- Customizable alert thresholds

### 📍 Spatial Water Site Discovery
- Geographic radius-based site finding
- Distance-weighted risk calculations
- Drainage basin analysis
- Site characteristic filtering

## API Endpoints

### Enhanced USGS Data Client (`usgsDataClient.js`)

#### `getFloodRisk(latitude, longitude, options)`

Get comprehensive flood risk assessment using USGS water monitoring data.

**Parameters:**
- `latitude` (number): Property latitude (-90 to 90)
- `longitude` (number): Property longitude (-180 to 180)
- `options` (object, optional):
  - `radiusKm` (number): Search radius in kilometers (default: 25)

**Response:**
```json
{
  "success": true,
  "data": {
    "flood_risk_score": 65,
    "risk_level": "HIGH",
    "confidence": "medium",
    "monitoring_sites": [
      {
        "site_number": "01646500",
        "site_name": "POTOMAC RIVER NEAR WASH, DC",
        "distance_km": 12.3,
        "parameters": ["00060", "00065"]
      }
    ],
    "nearest_site_distance_km": 12.3,
    "current_conditions": {
      "sites_with_data": 3,
      "average_streamflow": 2450.5,
      "average_gage_height": 8.25,
      "temperature_range": {
        "min": 18.2,
        "max": 22.1,
        "average": 20.1
      }
    },
    "historical_context": {
      "sites_with_historical_data": 2,
      "data_period": "5 years",
      "analysis": "Current conditions compared against 5-year historical averages and percentiles"
    },
    "site_assessments": [
      {
        "site_number": "01646500",
        "site_name": "POTOMAC RIVER NEAR WASH, DC",
        "distance_km": 12.3,
        "risk_score": 72,
        "has_historical_comparison": true,
        "current_streamflow": 2450.5,
        "current_gage_height": 8.25
      }
    ],
    "data_available": true,
    "coordinates": {
      "latitude": 38.9072,
      "longitude": -77.0369
    }
  },
  "source": "USGS_Multi_Hazard",
  "cached": false,
  "timestamp": "2025-08-20T20:00:00.000Z"
}
```

#### `getWaterMonitoringData(latitude, longitude, options)`

Get comprehensive real-time water monitoring data for environmental assessment.

**Parameters:**
- `latitude` (number): Property latitude
- `longitude` (number): Property longitude  
- `options` (object, optional):
  - `radiusKm` (number): Search radius in kilometers (default: 50)

**Response:**
```json
{
  "success": true,
  "data": {
    "monitoring_sites": [
      {
        "site_number": "01646500",
        "site_name": "POTOMAC RIVER NEAR WASH, DC",
        "latitude": 38.9491,
        "longitude": -77.1197,
        "distance_km": 12.3,
        "site_type": "Stream",
        "drainage_area": 11570,
        "parameters": [
          {
            "code": "00060",
            "name": "Streamflow, ft³/s",
            "unit": "ft3/s",
            "description": "Discharge, cubic feet per second"
          }
        ]
      }
    ],
    "real_time_data": {
      "01646500": {
        "site_number": "01646500",
        "site_name": "POTOMAC RIVER NEAR WASH, DC",
        "latitude": 38.9491,
        "longitude": -77.1197,
        "measurements": {
          "00060": {
            "parameter_code": "00060",
            "parameter_name": "Streamflow, ft³/s",
            "unit": "ft3/s",
            "latest_value": {
              "date_time": "2025-08-20T20:00:00.000Z",
              "value": 2450.5,
              "qualifiers": ["P"]
            },
            "statistics": {
              "count": 96,
              "min": 2100.0,
              "max": 2800.0,
              "mean": 2425.3,
              "median": 2430.0
            }
          }
        }
      }
    },
    "water_quality_summary": {
      "overall_quality": "good",
      "sites_assessed": 3,
      "good_quality_sites": 2,
      "concerns": []
    },
    "flood_indicators": {
      "elevated_streamflow": [],
      "elevated_gage_height": [],
      "rapid_changes": [],
      "overall_flood_risk": "low"
    },
    "data_available": true,
    "coordinates": {
      "latitude": 38.9072,
      "longitude": -77.0369
    }
  },
  "source": "USGS_Multi_Hazard",
  "cached": false,
  "timestamp": "2025-08-20T20:00:00.000Z"
}
```

### Advanced USGS Client (`USGSClient.js`)

#### `getNearbyWaterSites(latitude, longitude, options)`

Find USGS water monitoring sites within a specified radius.

**Parameters:**
- `latitude` (number): Search center latitude
- `longitude` (number): Search center longitude
- `options` (object, optional):
  - `radiusKm` (number): Search radius in kilometers (default: 50)
  - `parameters` (array): USGS parameter codes to filter by

**Response:**
```json
{
  "sites": [
    {
      "siteNumber": "01646500",
      "siteName": "POTOMAC RIVER NEAR WASH, DC LITTLE FALLS PUMP STA",
      "location": {
        "latitude": 38.9491,
        "longitude": -77.1197,
        "distanceKm": 12.3
      },
      "siteType": "Stream",
      "drainageArea": 11570,
      "parameters": [
        {
          "parameterCode": "00060",
          "parameterName": "Streamflow, ft³/s",
          "unit": "ft3/s",
          "description": "Discharge, cubic feet per second"
        }
      ],
      "status": "active"
    }
  ],
  "metadata": {
    "count": 1,
    "queryLocation": {
      "latitude": 38.9072,
      "longitude": -77.0369
    },
    "searchRadius": 50
  }
}
```

#### `getFloodRiskAssessment(latitude, longitude, options)`

Get detailed flood risk assessment with site-specific analysis.

**Parameters:**
- `latitude` (number): Property latitude
- `longitude` (number): Property longitude
- `options` (object, optional):
  - `radiusKm` (number): Search radius in kilometers (default: 25)

**Response:**
```json
{
  "location": {
    "latitude": 38.9072,
    "longitude": -77.0369
  },
  "floodRisk": {
    "riskLevel": "moderate",
    "riskScore": 45,
    "confidence": "medium",
    "siteAssessments": [
      {
        "siteNumber": "01646500",
        "siteName": "POTOMAC RIVER NEAR WASH, DC",
        "riskScore": 45,
        "hasHistoricalComparison": true,
        "factors": [
          "Streamflow at 60th percentile",
          "Gage height at 55th percentile"
        ],
        "currentValues": {
          "streamflow": 2450.5,
          "gageHeight": 8.25
        }
      }
    ],
    "factors": {
      "sitesAnalyzed": 3,
      "hasHistoricalData": true,
      "nearestSiteDistance": 12.3
    }
  },
  "monitoringSites": {
    "total": 5,
    "analyzed": 3,
    "nearest": {
      "siteNumber": "01646500",
      "location": {
        "distanceKm": 12.3
      }
    }
  },
  "dataSource": "USGS_Water",
  "generatedAt": "2025-08-20T20:00:00.000Z"
}
```

#### `getWaterAlerts(latitude, longitude, options)`

Get real-time water alerts and flood warnings for a location.

**Parameters:**
- `latitude` (number): Location latitude
- `longitude` (number): Location longitude
- `options` (object, optional):
  - `radiusKm` (number): Alert search radius (default: 50)

**Response:**
```json
{
  "alerts": [
    {
      "type": "flood_watch",
      "severity": "medium",
      "title": "Elevated Flood Risk",
      "message": "Water levels are elevated above normal ranges. Continue monitoring conditions.",
      "affected_sites": ["POTOMAC RIVER NEAR WASH, DC"],
      "recommendations": [
        "Stay informed about local weather conditions",
        "Avoid unnecessary travel in flood-prone areas",
        "Review emergency preparedness plans"
      ]
    }
  ],
  "alertLevel": "medium",
  "location": {
    "latitude": 38.9072,
    "longitude": -77.0369
  },
  "monitoringSummary": {
    "sitesMonitored": 5,
    "nearestSiteDistance": 12.3,
    "dataQuality": "medium"
  },
  "floodRiskSummary": {
    "riskLevel": "moderate",
    "riskScore": 45,
    "confidence": "medium"
  },
  "generatedAt": "2025-08-20T20:00:00.000Z",
  "dataSource": "USGS_Water"
}
```

#### `monitorWaterAlerts(locations, options)`

Monitor multiple locations for water alerts simultaneously.

**Parameters:**
- `locations` (array): Array of location objects with `latitude`, `longitude`, and optional `id`/`name`
- `options` (object, optional): Global monitoring options

**Response:**
```json
{
  "alerts": [
    {
      "locationId": "dc_office",
      "locationName": "Washington DC Office", 
      "alerts": [...],
      "alertLevel": "medium"
    }
  ],
  "summary": {
    "locationsMonitored": 3,
    "locationsWithAlerts": 1,
    "highestAlertLevel": "medium",
    "totalAlerts": 1
  },
  "generatedAt": "2025-08-20T20:00:00.000Z",
  "dataSource": "USGS_Water"
}
```

## USGS Parameter Codes

### Primary Monitoring Parameters

| Code | Parameter | Unit | Description |
|------|-----------|------|-------------|
| 00060 | Streamflow | ft³/s | Discharge, cubic feet per second |
| 00065 | Gage height | ft | Gage height, feet |
| 00010 | Water temperature | °C | Temperature, water, degrees Celsius |
| 00045 | Precipitation | in | Precipitation, total, inches |
| 72019 | Groundwater level | ft | Depth to water level, feet below land surface |
| 00300 | Dissolved oxygen | mg/L | Dissolved oxygen, water, unfiltered |
| 00400 | pH | std units | pH, water, unfiltered, field |
| 63680 | Turbidity | NTRU | Turbidity, water, unfiltered |
| 00095 | Specific conductance | µS/cm | Specific conductance at 25°C |

## Risk Scoring Methodology

### Flood Risk Calculation

1. **Current vs Historical Comparison**: Compare current streamflow and gage height readings against 5-year historical percentiles
2. **Percentile-based Scoring**: 
   - 98th+ percentile = 90 points (Extreme)
   - 95-98th percentile = 75 points (Very High)
   - 90-95th percentile = 60 points (High)
   - 75-90th percentile = 40 points (Moderate)
   - <75th percentile = 20 points (Low/Normal)
3. **Multi-site Aggregation**: Average risk scores from multiple nearby monitoring sites
4. **Distance Weighting**: Closer sites have higher influence on final risk score
5. **Confidence Assessment**: Based on data availability, historical comparison, and number of sites

### Water Quality Assessment

- **Temperature**: >30°C = Poor, 25-30°C = Fair, <25°C = Good
- **Dissolved Oxygen**: <5 mg/L = Poor, 5-7 mg/L = Fair, >7 mg/L = Good  
- **pH**: Outside 6.5-8.5 = Poor, otherwise Good
- **Overall Quality**: Based on percentage of sites meeting quality thresholds

## Caching Strategy

### Cache TTL (Time To Live)

| Data Type | TTL | Rationale |
|-----------|-----|-----------|
| Real-time water data | 15 minutes | Frequently changing conditions |
| Flood risk assessments | 1 hour | Balance between accuracy and performance |
| Historical water data | 24 hours | Infrequently changing historical patterns |
| Site information | 1 week | Static site characteristics |
| Water quality assessments | 2 hours | Moderate change frequency |

### Cache Keys

- Real-time data: `usgs:water:realtime:{sites}:{parameters}`
- Flood risk: `usgs_flood_risk_{lat}_{lon}_{radius}`
- Water monitoring: `usgs_water_monitoring_{lat}_{lon}_{radius}`
- Site discovery: `usgs:water:sites:{lat}:{lon}:{radius}`

## Rate Limiting

### USGS API Limits
- **Rate**: 10 requests per second
- **Implementation**: Built-in rate limiting with automatic delays
- **Retry Logic**: 3 attempts with exponential backoff
- **Timeout**: 30 seconds per request

### Best Practices
1. Cache aggressively to minimize API calls
2. Batch site requests when possible
3. Use appropriate search radii (25-50km typical)
4. Monitor API response times and adjust accordingly

## Error Handling

### Common Error Scenarios

1. **HTTP 400 - Bad Request**
   - Invalid coordinates (outside valid ranges)
   - Malformed parameter codes
   - Invalid date ranges

2. **HTTP 404 - Not Found**
   - Non-existent site numbers
   - Deprecated API endpoints

3. **HTTP 429 - Rate Limited**
   - Too many requests per second
   - Automatic retry with backoff

4. **HTTP 500 - Server Error**
   - USGS service temporarily unavailable
   - Failover to cached data when possible

### Error Response Format

```json
{
  "success": false,
  "error": {
    "type": "DataSourceError",
    "message": "USGS flood risk API error: HTTP 400: Invalid coordinates",
    "source": "USGS_Multi_Hazard",
    "status": 400,
    "retryable": false
  },
  "timestamp": "2025-08-20T20:00:00.000Z"
}
```

## Database Schema

### Key Tables

- `usgs_water_sites`: Monitoring station information
- `usgs_water_measurements_current`: Real-time measurements (30-day retention)
- `usgs_water_measurements_daily`: Historical daily aggregates
- `usgs_flood_assessments`: Property flood risk assessments
- `usgs_water_alerts`: Real-time alerts and warnings

See `database/migrations/add_usgs_water_monitoring.sql` for complete schema.

## Usage Examples

### Basic Flood Risk Assessment

```javascript
const usgsClient = new UsgsDataClient();

try {
  const floodRisk = await usgsClient.getFloodRisk(38.9072, -77.0369);
  
  if (floodRisk.success) {
    console.log(`Flood Risk Level: ${floodRisk.data.risk_level}`);
    console.log(`Risk Score: ${floodRisk.data.flood_risk_score}/100`);
    console.log(`Confidence: ${floodRisk.data.confidence}`);
    console.log(`Sites Analyzed: ${floodRisk.data.monitoring_sites.length}`);
  }
} catch (error) {
  console.error('Flood risk assessment failed:', error.message);
}
```

### Real-time Water Monitoring

```javascript
const usgsClient = new USGSClient({ httpClient, cacheManager });

try {
  const sites = await usgsClient.getNearbyWaterSites(38.9072, -77.0369, {
    radiusKm: 25,
    parameters: ['00060', '00065'] // Streamflow and gage height
  });
  
  if (sites.sites.length > 0) {
    const realtimeData = await usgsClient.getRealtimeWaterData(
      sites.sites.map(s => s.siteNumber)
    );
    
    console.log(`Found ${sites.sites.length} monitoring sites`);
    console.log('Current conditions:', realtimeData.sites);
  }
} catch (error) {
  console.error('Water monitoring failed:', error.message);
}
```

### Water Alert Monitoring

```javascript
const locations = [
  { id: 'office', name: 'DC Office', latitude: 38.9072, longitude: -77.0369 },
  { id: 'warehouse', name: 'Baltimore Warehouse', latitude: 39.2904, longitude: -76.6122 }
];

try {
  const alerts = await usgsClient.monitorWaterAlerts(locations);
  
  console.log(`Monitoring ${alerts.summary.locationsMonitored} locations`);
  console.log(`Active alerts: ${alerts.summary.totalAlerts}`);
  console.log(`Highest alert level: ${alerts.summary.highestAlertLevel}`);
  
  alerts.alerts.forEach(alert => {
    console.log(`${alert.locationName}: ${alert.alertLevel} (${alert.alerts.length} alerts)`);
  });
} catch (error) {
  console.error('Alert monitoring failed:', error.message);
}
```

## Integration with Existing Systems

### Risk Assessment Integration

The USGS water monitoring data integrates seamlessly with existing FEMA and earthquake risk assessments:

```javascript
// Enhanced property risk assessment
const propertyRisk = {
  earthquake: await usgsClient.getEarthquakeRisk(lat, lon),
  flood: await usgsClient.getFloodRisk(lat, lon),
  fema: await femaClient.getRiskByCoordinates(lat, lon)
};

// Aggregate risk scoring
const overallRisk = calculateAggregateRisk(propertyRisk);
```

### Frontend Integration

New UI components can display:
- Real-time streamflow and gage height charts
- Flood alert indicators and notifications  
- Water quality status dashboards
- Historical flood trend analysis
- Interactive monitoring site maps

### API Response Caching

All water monitoring endpoints respect the existing cache infrastructure:
- Automatic cache key generation
- TTL-based expiration
- Cache warming for frequently accessed locations
- Fallback to cached data during API outages

## Performance Considerations

### Optimization Strategies

1. **Spatial Indexing**: Database queries use PostGIS spatial indexes for fast site discovery
2. **Intelligent Caching**: Different cache TTLs based on data volatility
3. **Batch Processing**: Group multiple site requests to minimize API calls
4. **Async Processing**: Non-blocking concurrent requests for multiple locations
5. **Fallback Handling**: Graceful degradation when specific data unavailable

### Monitoring Metrics

Track these key performance indicators:
- API response times by endpoint
- Cache hit/miss ratios
- Error rates by error type
- Data freshness and staleness
- Alert generation frequency

## Security Considerations

### Data Privacy
- No personal information stored in water monitoring data
- Location data limited to property coordinates
- Alert data anonymized in logs

### API Security
- Rate limiting prevents abuse
- Request validation prevents injection attacks
- Error messages don't expose sensitive system information
- Timeout controls prevent resource exhaustion

## Future Enhancements

### Planned Features
1. **Groundwater Monitoring**: Integration with USGS groundwater level data
2. **Stream Gauge Cameras**: Integration with real-time stream camera feeds
3. **Precipitation Correlation**: Enhanced flood prediction using weather data
4. **Machine Learning**: AI-powered flood prediction models
5. **Mobile Alerts**: Push notifications for critical flood conditions

### API Evolution
- GraphQL endpoint for flexible data queries
- WebSocket support for real-time data streaming
- Batch processing endpoints for bulk assessments
- Enhanced spatial filtering capabilities

This comprehensive USGS Water Services integration significantly enhances the Seawater Climate Risk Platform's flood monitoring and water risk assessment capabilities, providing users with authoritative, real-time governmental data to make informed decisions about climate-related risks.