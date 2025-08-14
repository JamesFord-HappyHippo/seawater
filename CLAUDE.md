# Claude Code AI Assistant Configuration

This file provides configuration and guidelines for Claude Code AI assistant to work effectively with the Seawater Climate Risk Platform project.

## Project Overview

Seawater is a climate risk platform providing accessible climate risk information to home buyers, movers, and real estate professionals. The platform integrates multiple data sources (FEMA, First Street Foundation, ClimateCheck) with interactive mapping and educational content.

## Environment Configurations

### Development Environment
- **AWS Account**: TBD (to be configured during Phase 1)
- **Backend Infrastructure**:
  - Runtime: AWS Lambda (Node.js 18.x)
  - Database: PostgreSQL + PostGIS on AWS RDS
  - Caching: Redis ElastiCache
  - API Gateway: AWS API Gateway
  - Storage: AWS S3 for static assets
  - CDN: AWS CloudFront

- **Frontend Configuration**:
  - Framework: React 18 + TypeScript
  - Build Tool: Vite or Create React App
  - Mapping: MapBox GL JS
  - Styling: Tailwind CSS
  - State Management: React Context + React Query
  - Charts: Chart.js for data visualization

### Production Environment
- **Multi-tier Architecture**:
  - **API Layer**: AWS Lambda functions with API Gateway
  - **Database Layer**: PostgreSQL + PostGIS with read replicas
  - **Caching Layer**: Redis for API response caching
  - **CDN Layer**: CloudFront for global distribution
  - **Monitoring**: CloudWatch + X-Ray for observability

## Core Development Standards

### API Standards
**Response Format**: Consistent JSON structure across all endpoints
```javascript
// Standard API response format
{
  "success": true,
  "data": {
    "records": [...], // Always wrap data in records array
    "metadata": {
      "total": 100,
      "page": 1,
      "limit": 20
    }
  },
  "message": "Success message",
  "requestId": "uuid-from-aws-context",
  "timestamp": "2025-08-13T12:00:00Z"
}

// Error response format
{
  "success": false,
  "error": {
    "code": "PROPERTY_NOT_FOUND",
    "message": "Property not found for the provided address",
    "details": {...}
  },
  "requestId": "uuid-from-aws-context",
  "timestamp": "2025-08-13T12:00:00Z"
}
```

### Backend Handler Standards
**Required Pattern**: All Lambda handlers must follow this structure
```javascript
const { wrapHandler } = require('./utils/lambdaWrapper');
const { executeQuery } = require('./utils/dbOperations');
const { createSuccessResponse, createErrorResponse } = require('./utils/responseUtil');
const { handleError } = require('./utils/errorHandler');

async function handlerName({ queryStringParameters = {}, body, requestContext }) {
    try {
        const requestId = requestContext.requestId;
        
        // Handler logic here
        const results = await executeQuery(query, params);
        
        return createSuccessResponse(
            { records: results },
            'Operation completed successfully',
            {
                totalRecords: results.length,
                requestId,
                timestamp: new Date().toISOString()
            }
        );
    } catch (error) {
        console.error('Handler Error:', error);
        return handleError(error, requestId);
    }
}

exports.handler = wrapHandler(handlerName);
```

### Frontend Component Standards
**Technology Stack Requirements**:
- **React 18** with TypeScript for type safety
- **Tailwind CSS** for consistent styling
- **MapBox GL JS** for interactive mapping
- **React Query** for API state management
- **React Context** for global state

**Component Structure Pattern**:
```tsx
// Feature-based organization pattern
src/
├── components/           # Shared UI components
│   ├── ui/              # Basic UI elements (Button, Input, etc.)
│   └── maps/            # Map-related components
├── features/            # Feature-based organization
│   ├── risk-assessment/ # Property risk assessment
│   ├── mapping/         # Interactive mapping
│   ├── education/       # Educational content
│   └── professional/    # Professional tools
├── hooks/               # Custom React hooks
├── services/            # API services
├── utils/               # Utility functions
└── types/               # TypeScript type definitions
```

### Database Standards
**Schema Design Principles**:
- **PostGIS Integration**: Leverage geographic extensions for spatial queries
- **Indexing Strategy**: Optimize for location-based searches
- **Data Source Integration**: Separate tables for each data provider
- **Caching Strategy**: Redis for frequently accessed climate data

```sql
-- Example table structure for climate risk data
CREATE TABLE climate_risk_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_address TEXT NOT NULL,
    lat DECIMAL(10, 8) NOT NULL,
    lng DECIMAL(11, 8) NOT NULL,
    location GEOMETRY(POINT, 4326), -- PostGIS geometry column
    fema_risk_score INTEGER,
    flood_zone VARCHAR(10),
    wildfire_risk_score INTEGER,
    heat_risk_score INTEGER,
    data_sources JSONB, -- Track which APIs provided data
    last_updated TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Spatial index for location-based queries
CREATE INDEX idx_climate_risk_location ON climate_risk_assessments USING GIST (location);
```

## Data Integration Standards

### External API Integration
**Data Sources Configuration**:
```javascript
// API configuration for climate data sources
const DATA_SOURCES = {
    FEMA: {
        baseUrl: 'https://www.fema.gov/api/open/v2',
        rateLimits: { requests: 1000, window: '1h' },
        free: true
    },
    FIRST_STREET: {
        baseUrl: 'https://api.firststreet.org/risk/v1',
        rateLimits: { requests: 10000, window: '1d' },
        cost: '$30/month',
        authentication: 'API_KEY'
    },
    CLIMATE_CHECK: {
        baseUrl: 'https://api.climatecheck.com/v1',
        rateLimits: { requests: 5000, window: '1d' },
        cost: 'Usage-based',
        authentication: 'API_KEY'
    }
};
```

**Caching Strategy**:
- **Climate Data**: Cache for 24 hours (changes slowly)
- **Property Data**: Cache for 1 hour (may have updates)
- **Educational Content**: Cache for 7 days (static content)

### Error Handling Standards
**Fail-Fast Philosophy**: Make failures visible and actionable
```javascript
// Error handling for external API failures
const handleDataSourceError = (source, error, fallbackOptions = []) => {
    console.error(`${source} API Error:`, error);
    
    // Log for monitoring
    logApiFailure(source, error);
    
    // Try fallback data sources if available
    if (fallbackOptions.length > 0) {
        return tryFallbackSources(fallbackOptions);
    }
    
    // Return structured error for frontend handling
    throw new APIError({
        code: `${source}_UNAVAILABLE`,
        message: `Climate data temporarily unavailable from ${source}`,
        severity: 'WARNING',
        retryable: true
    });
};
```

## Testing Standards

### Test Strategy
```javascript
// Package.json scripts for comprehensive testing
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:integration": "jest --testPathPattern=integration",
    "test:e2e": "playwright test",
    "test:api": "newman run postman/seawater-api.json",
    "test:performance": "artillery run artillery/load-test.yml",
    "lint": "eslint src/ --ext .ts,.tsx",
    "typecheck": "tsc --noEmit"
  }
}
```

### Testing Requirements
- [ ] Unit tests for all utility functions
- [ ] Integration tests for API endpoints  
- [ ] E2E tests for critical user flows
- [ ] Performance tests for map rendering
- [ ] API contract tests for external services

## Implementation Guidelines

### Climate Risk Assessment Flow
```javascript
// Standard flow for property risk assessment
async function assessPropertyRisk(address) {
    try {
        // 1. Geocode address
        const location = await geocodeAddress(address);
        
        // 2. Query multiple data sources in parallel
        const [femaData, firstStreetData, climateCheckData] = await Promise.allSettled([
            fetchFEMAData(location),
            fetchFirstStreetData(location),
            fetchClimateCheckData(location)
        ]);
        
        // 3. Aggregate risk scores
        const riskAssessment = aggregateRiskScores({
            fema: femaData.value,
            firstStreet: firstStreetData.value,
            climateCheck: climateCheckData.value
        });
        
        // 4. Cache results
        await cacheRiskAssessment(address, riskAssessment);
        
        return riskAssessment;
    } catch (error) {
        throw new Error(`Risk assessment failed: ${error.message}`);
    }
}
```

### MapBox Integration Pattern
```tsx
// MapBox component with climate data overlay
import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';

const ClimateRiskMap: React.FC<{ riskData: RiskData[] }> = ({ riskData }) => {
    const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<mapboxgl.Map | null>(null);
    
    useEffect(() => {
        if (map.current) return;
        
        map.current = new mapboxgl.Map({
            container: mapContainer.current!,
            style: 'mapbox://styles/mapbox/light-v11',
            center: [-98.5795, 39.8283], // US center
            zoom: 4
        });
        
        // Add climate risk layers
        map.current.on('load', () => {
            addClimateRiskLayers(map.current!, riskData);
        });
    }, [riskData]);
    
    return <div ref={mapContainer} className="h-96 w-full rounded-lg" />;
};
```

## Deployment Standards

### Infrastructure as Code
```yaml
# AWS SAM template structure
AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2016-10-31

Globals:
  Function:
    Runtime: nodejs18.x
    MemorySize: 512
    Timeout: 30
    Environment:
      Variables:
        NODE_ENV: !Ref Environment
        DB_HOST: !Ref DatabaseHost
        REDIS_HOST: !Ref RedisHost

Resources:
  # API Gateway
  SeawaterAPI:
    Type: AWS::Serverless::Api
    Properties:
      StageName: !Ref Environment
      Cors:
        AllowMethods: "'GET,POST,PUT,DELETE'"
        AllowHeaders: "'Content-Type,Authorization'"
        AllowOrigin: "'*'"

  # Lambda Functions
  GetPropertyRisk:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: src/handlers/property/
      Handler: getRisk.handler
      Events:
        Api:
          Type: Api
          Properties:
            Path: /property/{address}/risk
            Method: GET
```

### Environment Configuration
```bash
# Environment variables for different deployment stages
# Development
MAPBOX_TOKEN=pk.dev_token_here
FEMA_API_KEY=dev_key
FIRST_STREET_API_KEY=dev_key

# Production  
MAPBOX_TOKEN=pk.prod_token_here
FEMA_API_KEY=prod_key
FIRST_STREET_API_KEY=prod_key
```

## Validation Checklist

### API Implementation
- [ ] Follows standard response format with records array
- [ ] Implements proper error handling with structured errors
- [ ] Uses request ID from AWS Lambda context
- [ ] Includes response caching where appropriate
- [ ] Validates input parameters and sanitizes data

### Frontend Component Implementation
- [ ] Uses TypeScript with proper type definitions
- [ ] Implements responsive design with Tailwind CSS
- [ ] Uses React Query for API state management
- [ ] Includes loading states and error boundaries
- [ ] Optimizes map rendering performance

### Database Implementation
- [ ] Uses PostGIS for spatial queries
- [ ] Implements proper indexing for location searches
- [ ] Separates data by source for auditability
- [ ] Includes data freshness tracking
- [ ] Uses connection pooling for performance

## Current System State (August 13, 2025)

### Project Status: **PLANNING PHASE** 📋
**Status**: Project documentation and technical specifications complete
**Next Phase**: Begin Phase 1 MVP Development (8-12 weeks)

### Key Achievements
✅ **Complete Business Case**: Financial analysis showing 282% ROI over 3 years  
✅ **Technical Specifications**: Full AWS architecture with React frontend  
✅ **Implementation Plan**: 26-week roadmap with 3-phase approach  
✅ **Risk Assessment**: Comprehensive risk analysis with go/no-go criteria  
✅ **Market Research**: Analysis of climate risk data landscape  

### Technology Stack Confirmed
- **Backend**: AWS Lambda + PostgreSQL + PostGIS + Redis
- **Frontend**: React 18 + TypeScript + Tailwind + MapBox
- **Data Sources**: FEMA (free) + First Street ($30/month) + ClimateCheck
- **Infrastructure**: AWS SAM for IaC deployment

### Development Readiness Checklist
- [ ] Market validation with 25+ customer interviews
- [ ] Technical team assembly (2 FTE developers + 0.5 FTE geo specialist)
- [ ] AWS account setup and IAM configuration
- [ ] Data source API access confirmed (FEMA, First Street, ClimateCheck)
- [ ] MapBox account and API key acquired
- [ ] Development environment infrastructure deployed

### Phase 1 MVP Scope (8-12 weeks, $120K-$180K)
1. **Core Infrastructure**: AWS Lambda + PostgreSQL + API Gateway
2. **FEMA Integration**: National Risk Index data integration
3. **Basic Frontend**: React app with property search and risk display
4. **Educational Content**: Basic climate risk information system
5. **Geocoding**: Address-to-coordinates conversion

### Key Files for Development Phase
**Infrastructure**:
- `IAC/sam/` - AWS SAM templates for serverless architecture
- `IAC/sam/Live_IAC/` - Production-ready infrastructure templates

**Configuration**:
- `.env.development` - Development environment variables
- `.env.production` - Production environment variables
- `package.json` - Dependencies and build scripts

### Success Metrics for MVP
- **Performance**: <2 seconds response time for property risk lookup
- **Reliability**: 99.9% API uptime
- **Scale**: Handle 1,000 concurrent users
- **Data**: FEMA risk scores for all US properties

### Investment Summary
| Phase | Duration | Investment | Key Features |
|-------|----------|------------|--------------|
| **Phase 1** | 8-12 weeks | $120K-$180K | MVP with FEMA data |
| **Phase 2** | 6-8 weeks | $90K-$120K | Premium features + mapping |
| **Phase 3** | 4-6 weeks | $60K-$90K | Full platform launch |
| **Total** | 18-26 weeks | **$270K-$390K** | Complete platform |

## Getting Help

For development guidance:
1. **Reference this CLAUDE.md** for consistent patterns and standards
2. **Check existing documentation** in project root for business requirements
3. **Follow AWS Well-Architected principles** for infrastructure decisions
4. **Validate against success metrics** before completing major features

## Best Practices

1. **Climate Data First**: Design around reliable climate data integration
2. **Performance Critical**: Sub-2-second response times are non-negotiable
3. **Scalable Architecture**: Build for 100K+ users from day one
4. **Educational Focus**: Every risk score needs contextual explanation
5. **Professional Ready**: Design components for B2B use cases from MVP
6. **Data Source Diversity**: Never depend on single climate data provider
7. **Geographic Accuracy**: PostGIS and proper coordinate systems essential
8. **User Experience**: Complex climate data must be simple to understand