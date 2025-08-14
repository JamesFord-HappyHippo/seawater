# Seawater Climate Risk Platform - REST API Architecture

## API Structure Overview

The Seawater API follows RESTful principles with a resource-based URL structure designed for serverless AWS Lambda + API Gateway architecture. All endpoints return JSON responses and support CORS for web applications.

### Base URL Structure
```
Production:  https://api.seawater.io/v1
Staging:     https://api-staging.seawater.io/v1
Development: https://api-dev.seawater.io/v1
```

### Versioning Strategy
- **Path-based versioning**: `/v1/`, `/v2/` in URL path
- **Header-based fallback**: `API-Version: v1` header support
- **Backward compatibility**: v1 maintained for minimum 12 months after v2 release
- **Deprecation notice**: 90-day notice via response headers and documentation

## Authentication & Authorization

### JWT Token Authentication
```http
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

### API Key Authentication (Professional Tier)
```http
X-API-Key: <api_key>
Authorization: Bearer <jwt_token>  # Still required
```

### Rate Limiting by Tier
- **Free Tier**: 100 requests/hour, 1000 requests/day
- **Premium Tier**: 1000 requests/hour, 10000 requests/day  
- **Professional Tier**: 5000 requests/hour, 50000 requests/day
- **Enterprise Tier**: Custom limits

### Rate Limit Headers
```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1640995200
X-RateLimit-Retry-After: 60
```

## Core API Endpoints

### 1. Property Risk Assessment

#### Get Property Risk Assessment
```http
GET /v1/properties/risk?address={address}&sources={sources}&include_projections={boolean}
```

**Query Parameters:**
- `address` (string, required): Property address
- `sources` (array, optional): Data sources ['fema', 'firststreet', 'climatecheck']
- `include_projections` (boolean, optional): Include 30-year projections (premium)
- `include_building_codes` (boolean, optional): Include building code information
- `radius_analysis` (number, optional): Radius in km for area analysis (1-25)

**Authentication:** Bearer token required
**Rate Limit:** Counts as 1-5 requests based on sources used

**Response 200 OK:**
```json
{
  "success": true,
  "data": {
    "property": {
      "address": "123 Main St, Miami, FL 33101",
      "formatted_address": "123 Main Street, Miami, FL 33101, USA",
      "coordinates": {
        "latitude": 25.7617,
        "longitude": -80.1918
      },
      "confidence": 0.95,
      "geocoding_source": "mapbox"
    },
    "risk_assessment": {
      "overall_score": 72,
      "risk_level": "HIGH",
      "last_updated": "2025-01-15T10:30:00Z",
      "data_freshness": "current",
      "hazards": {
        "flood": {
          "score": 85,
          "level": "VERY_HIGH",
          "sources": {
            "fema": {
              "score": 90,
              "flood_zone": "AE",
              "base_flood_elevation": 12.5,
              "requires_insurance": true
            },
            "firststreet": {
              "score": 82,
              "flood_factor": 8,
              "property_specific": true,
              "projections_30yr": 88
            },
            "climatecheck": {
              "score": 83,
              "precipitation_risk": 78
            }
          }
        },
        "wildfire": {
          "score": 15,
          "level": "LOW",
          "sources": {
            "fema": {"score": 10},
            "firststreet": {"score": 18, "projections_30yr": 22},
            "climatecheck": {"score": 17}
          }
        },
        "heat": {
          "score": 68,
          "level": "MODERATE_HIGH",
          "sources": {
            "fema": {"score": 65},
            "firststreet": {"score": 72, "projections_30yr": 82},
            "climatecheck": {"score": 67}
          }
        },
        "hurricane": {
          "score": 78,
          "level": "HIGH",
          "sources": {
            "fema": {"score": 80},
            "climatecheck": {"score": 76}
          }
        }
      },
      "social_vulnerability": 0.45,
      "community_resilience": 0.72,
      "building_codes": {
        "jurisdiction": "Miami-Dade County",
        "current_codes": {
          "wind": "ASCE 7-16",
          "flood": "2021 Florida Building Code",
          "seismic": "ASCE 7-16"
        },
        "bcat_score": 78,
        "enforcement_level": "full"
      }
    }
  },
  "meta": {
    "request_id": "req_2025011510300123",
    "timestamp": "2025-01-15T10:30:00Z",
    "processing_time_ms": 1250,
    "cache_status": "miss",
    "cost_credits": 3,
    "data_sources_used": ["fema", "firststreet", "climatecheck"]
  }
}
```

#### Compare Multiple Properties
```http
POST /v1/properties/compare
```

**Request Body:**
```json
{
  "addresses": [
    "123 Main St, Miami, FL 33101",
    "456 Oak Ave, Austin, TX 78701",
    "789 Pine St, Seattle, WA 98101"
  ],
  "hazard_types": ["flood", "wildfire", "heat"],
  "include_projections": false
}
```

**Response 200 OK:**
```json
{
  "success": true,
  "data": {
    "comparison": [
      {
        "address": "123 Main St, Miami, FL 33101",
        "overall_score": 72,
        "hazards": {"flood": 85, "wildfire": 15, "heat": 68},
        "rank": 3
      },
      {
        "address": "456 Oak Ave, Austin, TX 78701", 
        "overall_score": 45,
        "hazards": {"flood": 25, "wildfire": 35, "heat": 75},
        "rank": 1
      },
      {
        "address": "789 Pine St, Seattle, WA 98101",
        "overall_score": 38,
        "hazards": {"flood": 20, "wildfire": 45, "heat": 25},
        "rank": 2
      }
    ],
    "analytics": {
      "lowest_risk": "456 Oak Ave, Austin, TX 78701",
      "highest_risk": "123 Main St, Miami, FL 33101",
      "average_score": 51.67,
      "risk_range": 34
    }
  }
}
```

### 2. Geographic Services

#### Geocode Address
```http
POST /v1/geocoding/address
```

**Request Body:**
```json
{
  "address": "123 Main Street, Miami, FL",
  "bias_region": "us",
  "return_components": true,
  "confidence_threshold": 0.8
}
```

**Response 200 OK:**
```json
{
  "success": true,
  "data": {
    "results": [
      {
        "formatted_address": "123 Main Street, Miami, FL 33101, USA",
        "latitude": 25.7617,
        "longitude": -80.1918,
        "confidence": 0.95,
        "address_components": {
          "street_number": "123",
          "street_name": "Main Street",
          "city": "Miami",
          "state": "Florida",
          "state_code": "FL",
          "country": "United States",
          "country_code": "US",
          "postal_code": "33101",
          "county": "Miami-Dade County"
        },
        "place_type": "address",
        "geocoding_source": "mapbox"
      }
    ]
  },
  "meta": {
    "request_id": "req_2025011510300124",
    "processing_time_ms": 150
  }
}
```

#### Reverse Geocoding
```http
GET /v1/geocoding/reverse?lat={latitude}&lng={longitude}
```

#### Spatial Property Search
```http
GET /v1/properties/spatial/nearby?lat={lat}&lng={lng}&radius_km={radius}&hazard_type={hazard}
```

**Response 200 OK:**
```json
{
  "success": true,
  "data": {
    "center_point": {
      "latitude": 25.7617,
      "longitude": -80.1918
    },
    "radius_km": 5,
    "properties": [
      {
        "distance_km": 1.2,
        "address": "456 Near St, Miami, FL 33101",
        "risk_score": 68,
        "primary_hazards": ["flood", "hurricane"]
      }
    ],
    "area_statistics": {
      "average_risk_score": 71,
      "total_properties": 342,
      "high_risk_count": 156,
      "flood_zone_distribution": {
        "AE": 45,
        "VE": 12,
        "X": 285
      }
    }
  }
}
```

#### Boundary Data
```http
GET /v1/geographic/boundaries/{type}/{identifier}
```

**Path Parameters:**
- `type`: county, census_tract, zip_code, flood_zone
- `identifier`: FIPS code, ZIP code, or flood zone designation

### 3. Historical Data & Trends

#### Historical Risk Trends
```http
GET /v1/properties/trends/{address_hash}?period={period}&hazard_types={hazards}
```

#### Historical Disaster Events
```http
GET /v1/geographic/disasters/history?lat={lat}&lng={lng}&radius_km={radius}&years={years}
```

### 4. Professional Directory

#### Search Climate Professionals
```http
GET /v1/professionals/search
```

**Query Parameters:**
- `type`: agent, inspector, insurance_agent, contractor
- `latitude`, `longitude`: Search center coordinates  
- `radius_km`: Search radius (default: 25, max: 100)
- `specializations`: Array of climate specializations
- `certifications`: Required certifications
- `min_rating`: Minimum rating (1-5)
- `limit`: Results limit (default: 20, max: 100)

**Response 200 OK:**
```json
{
  "success": true,
  "data": {
    "professionals": [
      {
        "id": "prof_12345",
        "type": "agent",
        "name": "John Smith",
        "company": "Climate Ready Realty",
        "email": "john@climaterealty.com",
        "phone": "+1-305-555-0123",
        "distance_km": 2.3,
        "specializations": ["flood_risk", "hurricane_prep", "resilient_construction"],
        "certifications": ["NAR_GREEN", "FEMA_CERTIFIED"],
        "rating": 4.8,
        "review_count": 156,
        "verified": true,
        "service_areas": ["Miami-Dade", "Broward"],
        "bio": "Specializing in climate-resilient properties...",
        "website": "https://climaterealty.com"
      }
    ],
    "total_found": 23,
    "area_stats": {
      "by_type": {
        "agent": 15,
        "inspector": 5,
        "insurance_agent": 3
      },
      "average_rating": 4.6,
      "total_reviews": 1247
    }
  }
}
```

### 5. User Management & Subscriptions

#### User Profile
```http
GET /v1/users/profile
PUT /v1/users/profile
```

#### Subscription Management
```http
GET /v1/users/subscription
POST /v1/users/subscription/upgrade
POST /v1/users/subscription/cancel
```

#### Usage Analytics
```http
GET /v1/users/usage?period={monthly|daily}&start_date={date}&end_date={date}
```

## Professional API Features

### 1. Bulk Property Analysis

#### Bulk Risk Assessment
```http
POST /v1/professional/bulk/risk-assessment
```

**Request Body:**
```json
{
  "addresses": ["address1", "address2", "..."],
  "sources": ["fema", "firststreet", "climatecheck"],
  "output_format": "json",
  "webhook_url": "https://your-domain.com/webhooks/bulk-complete",
  "priority": "normal"
}
```

**Response 202 Accepted:**
```json
{
  "success": true,
  "data": {
    "job_id": "job_bulk_12345",
    "status": "queued",
    "estimated_completion": "2025-01-15T10:45:00Z",
    "total_addresses": 250,
    "webhook_configured": true
  }
}
```

#### Bulk Job Status
```http
GET /v1/professional/bulk/jobs/{job_id}
```

### 2. Export & Reporting

#### Generate Property Report
```http
POST /v1/professional/reports/property
```

**Request Body:**
```json
{
  "address": "123 Main St, Miami, FL 33101",
  "report_type": "comprehensive",
  "format": "pdf",
  "template": "professional",
  "include_sections": ["risk_assessment", "insurance_guidance", "building_codes", "recommendations"],
  "branding": {
    "company_name": "Your Realty Company",
    "logo_url": "https://your-domain.com/logo.png"
  }
}
```

#### Export Search Results
```http
POST /v1/professional/export/csv
```

### 3. Webhooks

#### Register Webhook
```http
POST /v1/professional/webhooks
```

**Request Body:**
```json
{
  "url": "https://your-domain.com/webhooks/seawater",
  "events": ["bulk_job_complete", "data_update", "quota_warning"],
  "secret": "your_webhook_secret"
}
```

## External API Integration Endpoints

### 1. FEMA Data Integration

#### FEMA National Risk Index
```http
GET /v1/data-sources/fema/nri/{state_code}/{county_code}
```

#### FEMA Flood Maps
```http  
GET /v1/data-sources/fema/flood-zone?lat={lat}&lng={lng}
```

### 2. Premium Data Sources

#### First Street Foundation
```http
GET /v1/data-sources/firststreet/risk-factor?lat={lat}&lng={lng}
```

#### ClimateCheck
```http
GET /v1/data-sources/climatecheck/risk?lat={lat}&lng={lng}
```

## Error Handling

### Standard Error Response Format
```json
{
  "success": false,
  "error": {
    "code": "INVALID_ADDRESS",
    "message": "The provided address could not be geocoded",
    "details": {
      "address": "123 Fake St",
      "geocoding_attempts": ["mapbox", "google", "census"],
      "best_match_confidence": 0.12
    },
    "suggestion": "Please provide a more complete address including city and state"
  },
  "meta": {
    "request_id": "req_2025011510300125",
    "timestamp": "2025-01-15T10:30:00Z"
  }
}
```

### HTTP Status Codes

#### Success Codes
- `200 OK`: Request successful, data returned
- `201 Created`: Resource created successfully  
- `202 Accepted`: Request accepted for processing (async operations)
- `204 No Content`: Request successful, no data to return

#### Client Error Codes
- `400 Bad Request`: Invalid request format or parameters
- `401 Unauthorized`: Authentication required or invalid
- `402 Payment Required`: Subscription upgrade needed
- `403 Forbidden`: Access denied for current user role
- `404 Not Found`: Resource not found
- `409 Conflict`: Request conflicts with current state
- `422 Unprocessable Entity`: Valid format but invalid data
- `429 Too Many Requests`: Rate limit exceeded

#### Server Error Codes
- `500 Internal Server Error`: Unexpected server error
- `502 Bad Gateway`: Upstream service error
- `503 Service Unavailable`: Service temporarily unavailable
- `504 Gateway Timeout`: Upstream service timeout

### Error Code Reference

#### Authentication Errors
- `AUTH_TOKEN_MISSING`: Authorization header missing
- `AUTH_TOKEN_INVALID`: JWT token invalid or expired
- `AUTH_TOKEN_EXPIRED`: JWT token expired
- `API_KEY_MISSING`: API key required for professional features
- `API_KEY_INVALID`: Invalid API key provided

#### Validation Errors
- `INVALID_ADDRESS`: Address format invalid or not geocodable
- `INVALID_COORDINATES`: Latitude/longitude out of range
- `INVALID_HAZARD_TYPE`: Unsupported hazard type specified
- `INVALID_DATE_RANGE`: Date range invalid or too large
- `MISSING_REQUIRED_PARAM`: Required query parameter missing

#### Rate Limiting Errors
- `RATE_LIMIT_EXCEEDED`: Too many requests in time window
- `QUOTA_EXCEEDED`: Monthly quota limit reached
- `CONCURRENT_LIMIT_EXCEEDED`: Too many simultaneous requests

#### Data Source Errors
- `DATA_SOURCE_UNAVAILABLE`: External data source temporarily unavailable
- `DATA_SOURCE_ERROR`: Error from external data provider
- `DATA_NOT_FOUND`: No risk data available for location
- `DATA_STALE`: Cached data expired, refresh in progress

#### Premium Feature Errors
- `PREMIUM_REQUIRED`: Feature requires premium subscription
- `INSUFFICIENT_CREDITS`: Not enough API credits remaining
- `FEATURE_NOT_AVAILABLE`: Feature not available in current region

## Caching Strategy

### Multi-Layer Caching Architecture

#### 1. API Gateway Caching
- **Duration**: 5 minutes for frequently requested data
- **Cache Keys**: Include user tier, location precision, query parameters
- **Cache Control**: `public, max-age=300` for public data

#### 2. Lambda Memory Caching
- **Duration**: Function lifetime (up to 15 minutes)
- **Use Cases**: Database connections, external API responses
- **Implementation**: In-memory objects and Maps

#### 3. Redis Distributed Cache
- **Duration**: 1-6 hours based on data type
- **Risk Assessments**: 1 hour TTL
- **Geographic Data**: 6 hours TTL  
- **Professional Directory**: 3 hours TTL
- **Cache Warming**: Background jobs for popular queries

#### 4. Database Query Caching
- **Duration**: 30 minutes for expensive spatial queries
- **Materialized Views**: Updated nightly for common aggregations
- **Query Result Cache**: PostgreSQL query result caching

### Cache Invalidation Strategy

#### Time-Based Expiration
- Risk scores: 1 hour
- Professional listings: 3 hours
- Geographic boundaries: 24 hours
- Static content: 7 days

#### Event-Based Invalidation
- Data source updates: Clear related risk assessments
- Professional profile changes: Clear directory cache
- User subscription changes: Clear feature access cache

## Performance Optimization

### Lambda Cold Start Mitigation

#### 1. Provisioned Concurrency
```yaml
# SAM Template Example
RiskAssessmentFunction:
  Type: AWS::Serverless::Function
  Properties:
    Runtime: nodejs18.x
    CodeUri: functions/risk-assessment/
    ProvisionedConcurrencyConfig:
      ProvisionedConcurrencyMinCapacity: 5
      ProvisionedConcurrencyMaxCapacity: 100
```

#### 2. Connection Pooling
```javascript
// Database connection pool
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,  // Maximum 5 connections per Lambda
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Redis connection reuse
let redisClient;
const getRedisClient = () => {
  if (!redisClient) {
    redisClient = new Redis(process.env.REDIS_URL);
  }
  return redisClient;
};
```

### Parallel Processing

#### 1. External API Calls
```javascript
// Parallel data fetching
async function aggregateRiskData(coordinates) {
  const [femaData, firstStreetData, climateCheckData] = await Promise.allSettled([
    fetchFEMAData(coordinates),
    fetchFirstStreetData(coordinates), 
    fetchClimateCheckData(coordinates)
  ]);
  
  return combineResults([femaData, firstStreetData, climateCheckData]);
}
```

#### 2. Background Processing
```javascript
// SQS integration for heavy operations
const sqs = new AWS.SQS();

async function queueBulkAnalysis(addresses) {
  const chunks = chunkArray(addresses, 10);
  
  const promises = chunks.map(chunk => 
    sqs.sendMessage({
      QueueUrl: process.env.BULK_ANALYSIS_QUEUE,
      MessageBody: JSON.stringify({
        addresses: chunk,
        timestamp: new Date().toISOString()
      })
    }).promise()
  );
  
  await Promise.all(promises);
}
```

### Response Compression

#### GZIP Compression
- Enable at API Gateway level
- Compress responses > 1KB
- Average 70% size reduction

#### Response Optimization
```javascript
// Selective field inclusion
function optimizeResponse(data, userTier) {
  if (userTier === 'free') {
    delete data.risk_assessment.projections_30yr;
    delete data.risk_assessment.property_specific_data;
  }
  
  return data;
}
```

## Monitoring & Observability

### CloudWatch Metrics

#### API Performance Metrics
- Request latency (P50, P95, P99)
- Error rates by endpoint
- Throttling events
- Cache hit/miss rates

#### Business Metrics  
- API usage by subscription tier
- Most requested locations
- Professional feature adoption
- Data source reliability

#### Custom Metrics
```javascript
const AWS = require('aws-sdk');
const cloudwatch = new AWS.CloudWatch();

async function recordCustomMetric(metricName, value, unit = 'Count') {
  await cloudwatch.putMetricData({
    Namespace: 'Seawater/API',
    MetricData: [{
      MetricName: metricName,
      Value: value,
      Unit: unit,
      Timestamp: new Date()
    }]
  }).promise();
}
```

### Structured Logging
```javascript
const logger = require('pino')({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => ({ level: label })
  }
});

// Request logging middleware
exports.logRequest = (event, context) => {
  logger.info({
    requestId: context.awsRequestId,
    path: event.path,
    method: event.httpMethod,
    userAgent: event.headers['User-Agent'],
    ip: event.requestContext.identity.sourceIp
  }, 'Incoming request');
};
```

## Security Implementation

### Input Validation
```javascript
const Joi = require('joi');

const propertyRiskSchema = Joi.object({
  address: Joi.string().min(5).max(500).required(),
  sources: Joi.array().items(
    Joi.string().valid('fema', 'firststreet', 'climatecheck')
  ).default(['fema']),
  include_projections: Joi.boolean().default(false)
});

// Validation middleware
exports.validateRequest = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.query);
    if (error) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.details[0].message
        }
      });
    }
    req.validated = value;
    next();
  };
};
```

### SQL Injection Prevention
```javascript
// Parameterized queries only
async function getRiskData(latitude, longitude, radiusKm) {
  const query = `
    SELECT * FROM risk_scores 
    WHERE ST_DWithin(
      ST_Point($1, $2)::geography,
      ST_Point(longitude, latitude)::geography,
      $3
    )
    ORDER BY 
      ST_Distance(
        ST_Point($1, $2)::geography,
        ST_Point(longitude, latitude)::geography
      )
    LIMIT 50
  `;
  
  return await pool.query(query, [longitude, latitude, radiusKm * 1000]);
}
```

### Rate Limiting Implementation
```javascript
const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');

const createRateLimiter = (windowMs, max) => {
  return rateLimit({
    store: new RedisStore({
      sendCommand: (...args) => redisClient.call(...args),
    }),
    windowMs,
    max,
    message: {
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests, please try again later'
      }
    }
  });
};
```

## OpenAPI 3.0 Specification

### Core Schema Definitions
```yaml
openapi: 3.0.3
info:
  title: Seawater Climate Risk API
  version: 1.0.0
  description: Comprehensive climate risk assessment API for real estate professionals
  contact:
    name: Seawater API Support
    email: api-support@seawater.io
    url: https://docs.seawater.io
  license:
    name: MIT
    url: https://opensource.org/licenses/MIT

servers:
  - url: https://api.seawater.io/v1
    description: Production server
  - url: https://api-staging.seawater.io/v1  
    description: Staging server

security:
  - BearerAuth: []
  - ApiKeyAuth: []

components:
  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
    ApiKeyAuth:
      type: apiKey
      in: header
      name: X-API-Key

  schemas:
    RiskAssessment:
      type: object
      properties:
        overall_score:
          type: integer
          minimum: 0
          maximum: 100
        risk_level:
          type: string
          enum: [LOW, MODERATE, HIGH, VERY_HIGH]
        hazards:
          type: object
          properties:
            flood:
              $ref: '#/components/schemas/HazardAssessment'
            wildfire:
              $ref: '#/components/schemas/HazardAssessment'
            heat:
              $ref: '#/components/schemas/HazardAssessment'
            hurricane:
              $ref: '#/components/schemas/HazardAssessment'
        last_updated:
          type: string
          format: date-time

    HazardAssessment:
      type: object
      properties:
        score:
          type: integer
          minimum: 0
          maximum: 100
        level:
          type: string
          enum: [LOW, MODERATE, HIGH, VERY_HIGH]
        sources:
          type: object
          properties:
            fema:
              $ref: '#/components/schemas/FEMAHazardData'
            firststreet:
              $ref: '#/components/schemas/FirstStreetHazardData'
            climatecheck:
              $ref: '#/components/schemas/ClimateCheckHazardData'

    Error:
      type: object
      properties:
        success:
          type: boolean
          enum: [false]
        error:
          type: object
          properties:
            code:
              type: string
            message:
              type: string
            details:
              type: object
            suggestion:
              type: string

paths:
  /v1/properties/risk:
    get:
      summary: Get property risk assessment
      description: Retrieve comprehensive climate risk assessment for a property
      operationId: getPropertyRisk
      parameters:
        - name: address
          in: query
          required: true
          schema:
            type: string
            minLength: 5
            maxLength: 500
          example: "123 Main St, Miami, FL 33101"
        - name: sources
          in: query
          schema:
            type: array
            items:
              type: string
              enum: [fema, firststreet, climatecheck]
            default: [fema]
        - name: include_projections
          in: query
          schema:
            type: boolean
            default: false
      responses:
        '200':
          description: Risk assessment retrieved successfully
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                    enum: [true]
                  data:
                    type: object
                    properties:
                      risk_assessment:
                        $ref: '#/components/schemas/RiskAssessment'
        '400':
          $ref: '#/components/responses/BadRequest'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '429':
          $ref: '#/components/responses/TooManyRequests'

  responses:
    BadRequest:
      description: Bad request - validation error
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'
    Unauthorized:
      description: Authentication required
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'
    TooManyRequests:
      description: Rate limit exceeded
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'
```

## Implementation Architecture for AWS Lambda

### Lambda Function Structure
```
functions/
├── risk-assessment/
│   ├── index.js                 # Main handler
│   ├── services/
│   │   ├── femaService.js       # FEMA API integration
│   │   ├── firstStreetService.js # First Street integration  
│   │   ├── climateCheckService.js # ClimateCheck integration
│   │   └── aggregationService.js # Risk score aggregation
│   ├── utils/
│   │   ├── validation.js        # Input validation
│   │   ├── caching.js          # Cache management
│   │   └── formatting.js       # Response formatting
│   └── package.json
├── geocoding/
├── professionals/
├── bulk-analysis/
└── shared/
    ├── database/
    │   ├── connection.js
    │   └── queries.js
    ├── auth/
    │   ├── jwt.js
    │   └── rateLimit.js
    └── utils/
        ├── logger.js
        └── metrics.js
```

### SAM Template Example
```yaml
AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2016-10-31

Globals:
  Function:
    Runtime: nodejs18.x
    Timeout: 30
    MemorySize: 512
    Environment:
      Variables:
        DATABASE_URL: !Ref DatabaseConnectionString
        REDIS_URL: !Ref RedisConnectionString
        LOG_LEVEL: info

Resources:
  SeawaterAPI:
    Type: AWS::Serverless::Api
    Properties:
      StageName: v1
      Cors:
        AllowMethods: "'GET,POST,PUT,DELETE,OPTIONS'"
        AllowHeaders: "'Content-Type,Authorization,X-API-Key'"
        AllowOrigin: "'https://seawater.io'"
      Auth:
        DefaultAuthorizer: JWTAuthorizer
        Authorizers:
          JWTAuthorizer:
            FunctionArn: !GetAtt AuthorizerFunction.Arn

  RiskAssessmentFunction:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: functions/risk-assessment/
      Handler: index.handler
      Events:
        GetRisk:
          Type: Api
          Properties:
            RestApiId: !Ref SeawaterAPI
            Path: /properties/risk
            Method: get
      Environment:
        Variables:
          FEMA_API_BASE: https://hazards.fema.gov/nri/api/v1
          FIRSTSTREET_API_KEY: !Ref FirstStreetAPIKey
          CLIMATECHECK_API_KEY: !Ref ClimateCheckAPIKey

  GeocodingFunction:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: functions/geocoding/
      Handler: index.handler
      Events:
        PostGeocode:
          Type: Api
          Properties:
            RestApiId: !Ref SeawaterAPI
            Path: /geocoding/address
            Method: post
```

This comprehensive REST API architecture provides:

1. **Complete endpoint coverage** for all Seawater platform requirements
2. **Scalable serverless architecture** optimized for AWS Lambda + API Gateway
3. **Multi-tier authentication** supporting free, premium, and professional users
4. **Comprehensive caching strategy** for sub-2-second response times
5. **Professional API features** including bulk processing and webhooks
6. **Production-ready error handling** with detailed error codes and responses  
7. **Performance optimization** strategies for Lambda cold starts and external API integration
8. **Security best practices** including rate limiting, input validation, and SQL injection prevention
9. **Complete OpenAPI 3.0 specification** for immediate implementation
10. **Monitoring and observability** setup for production operation

The architecture is designed to handle 1000+ concurrent users and 100K+ monthly requests while maintaining the <2 second response time target through aggressive caching, parallel processing, and optimized Lambda functions.