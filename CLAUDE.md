# Seawater Climate Risk Platform - Claude Code Configuration

This file provides configuration and guidelines for Claude Code AI assistant to work effectively with the Seawater Climate Risk Platform, leveraging proven patterns from Tim-Combo for climate data automation.

## Project Overview

Seawater is a comprehensive climate risk assessment platform providing property-level risk analysis through integration with FEMA, NOAA, First Street Foundation, and other authoritative climate data sources. The platform serves real estate professionals, insurance companies, and property owners with actionable climate intelligence.

## Environment Configuration

### Development Environment
- **AWS Account**: Dev (532595801838), Media (855652006097) - Tim-Combo multi-account pattern
- **API Base URL**: `https://5puux7rpx0.execute-api.us-east-2.amazonaws.com/dev`
- **Database**: PostgreSQL with PostGIS on HoneyDo infrastructure
- **Authentication**: Mixed - Public trial endpoints + AWS Cognito for premium users
- **Node.js Runtime**: `nodejs18.x`
- **Frontend**: React + Flowbite UI deployed to test.seawater.io via CloudFront

### Climate Data Sources
- **FEMA National Risk Index**: Public flood, wildfire, hurricane data
- **First Street Foundation**: Proprietary flood risk models
- **NOAA Climate Data**: Historical weather patterns and projections
- **USGS**: Geological and hydrological data
- **ClimateCheck**: Commercial climate risk intelligence

## Core Standards Reference

All development standards are maintained in `.clinerules/` directory with climate-specific adaptations:

### API Standards
**Primary File**: `.clinerules/api_standards.md`

Core patterns for climate data:
- **API Response Format**: Always use `APIResponse<ClimateData>` with `Records` array wrapping
- **Geographic Data**: Use standardized lat/lng and address formats
- **Risk Scoring**: Consistent 0-100 risk score methodology
- **Data Sources**: Always include source attribution and confidence levels

### Backend Handler Standards  
**Primary File**: `.clinerules/backend_handler_standards.md`
**Lambda Build Standards**: `.clinerules/lambda_build_standards.md`

Climate-specific requirements:
- **Method-Specific Handlers**: `propertyRiskGet.js`, `riskAssessmentCreate.js`
- **Geospatial Queries**: Use PostGIS for spatial operations
- **Data Caching**: Implement Redis caching for expensive API calls
- **Rate Limiting**: Respect third-party API limits (FEMA: 1000/hour, First Street: 100/hour)

**CRITICAL Lambda Build Requirements:**
- **Helper Imports**: Always use `require('./helperName')` - NO directory traversal
- **Build Structure**: Each Lambda gets own directory with helpers copied locally
- **SAM Template**: Use `CodeUri: ../src/backend/dist/functionName/` and `Handler: index.handler`

### Frontend Standards
**Primary File**: `.clinerules/frontend_standards.md`

Key patterns for climate UI:
- **Technology Stack**: React + TypeScript + Tailwind CSS + Mapbox GL
- **Map Components**: Interactive risk visualization with property overlays
- **Risk Visualization**: Color-coded risk meters and heat maps
- **Professional Dashboard**: Bulk analysis tools and export capabilities

## Climate-Specific Implementation Guidelines

### When Generating Climate API Code
Always reference climate standards:
```javascript
// Correct climate API call pattern
const riskResult = await Make_Authorized_API_Call<PropertyRiskData>(
  API_ENDPOINTS.CLIMATE.PROPERTY_RISK,
  'GET',
  undefined,
  { params: { 
    address: propertyAddress, 
    sources: 'fema,firststreet,noaa',
    analysis_depth: 'comprehensive'
  }}
);

if (riskResult.success) {
  // Use riskResult.data.Records (climate data wrapped in Records array)
  const riskAssessments = riskResult.data.Records;
  const floodRisk = riskAssessments.find(r => r.hazard_type === 'flood');
} else {
  console.error('Climate API Error:', riskResult.message);
}
```

### When Creating Climate Backend Handlers
Follow climate handler standards:
```javascript
// Required imports for climate handlers
const { wrapHandler } = require('./lambdaWrapper');
const { executeQuery, executeGeoQuery } = require('./dbOperations');
const { createSuccessResponse, createErrorResponse } = require('./responseUtil');
const { handleError } = require('./errorHandler');
const { aggregateRiskScores } = require('./climateDataAggregator');

async function getPropertyRiskHandler({ queryStringParameters: queryParams = {}, requestContext }) {
    try {
        const Request_ID = requestContext.requestId;
        const address = queryParams.address;
        const riskSources = (queryParams.sources || 'fema').split(',');
        
        // Geocode address and perform risk analysis
        const coordinates = await geocodeAddress(address);
        const riskData = await aggregateRiskScores(coordinates, riskSources);
        
        return createSuccessResponse(
            { Records: riskData },
            'Climate risk analysis completed',
            {
                Total_Records: riskData.length,
                Request_ID,
                Timestamp: new Date().toISOString(),
                Analysis_Sources: riskSources,
                Coordinates: coordinates
            }
        );
    } catch (error) {
        console.error('Climate Risk Analysis Error:', error);
        return handleError(error, 'CLIMATE_RISK_ANALYSIS_FAILED');
    }
}

exports.handler = wrapHandler(getPropertyRiskHandler);
```

### When Building Climate UI Components
Reference climate-specific patterns:
```tsx
// Climate risk visualization component
interface ClimateRiskMeterProps {
  riskScore: number;          // 0-100 risk score
  hazardType: 'flood' | 'wildfire' | 'hurricane' | 'heat';
  confidenceLevel: number;    // 0-100 confidence in assessment
  dataSource: string;         // 'fema' | 'firststreet' | 'noaa'
}

const ClimateRiskMeter: React.FC<ClimateRiskMeterProps> = ({
  riskScore,
  hazardType,
  confidenceLevel,
  dataSource
}) => {
  const riskLevel = getRiskLevel(riskScore); // 'low' | 'moderate' | 'high' | 'extreme'
  const colorScheme = getHazardColors(hazardType);
  
  return (
    <div className="climate-risk-meter">
      <RiskGauge 
        score={riskScore} 
        level={riskLevel}
        colors={colorScheme}
      />
      <DataAttribution 
        source={dataSource}
        confidence={confidenceLevel}
      />
    </div>
  );
};
```

## Agent Factory Climate Capabilities

The Seawater platform now includes the revolutionary Agent Factory system for autonomous development:

### Climate Data Integration Agent
**Purpose**: Automate integration with new climate data sources
**Capabilities**:
- Generate API clients for FEMA, NOAA, First Street Foundation
- Create data transformation pipelines for risk aggregation
- Build validation rules for climate data consistency

### Geospatial Analysis Agent
**Purpose**: Optimize PostGIS queries and spatial calculations
**Capabilities**:
- Generate spatial indexing strategies
- Create boundary analysis algorithms
- Build property proximity calculations

### Risk Assessment Agent
**Purpose**: Multi-source data aggregation and scoring algorithms
**Capabilities**:
- Combine flood, wildfire, hurricane risk models
- Generate confidence-weighted risk scores
- Create temporal risk projection models

## Validation Checklist

Before completing any climate implementation:

### Climate API Implementation
- [ ] Follows `APIResponse<ClimateData>` format with Records array
- [ ] Includes proper source attribution and confidence levels
- [ ] Implements geographic coordinate validation
- [ ] Uses standardized risk scoring (0-100 scale)
- [ ] Includes data freshness timestamps

### Climate Backend Handler Implementation  
- [ ] Uses method-specific handlers (`propertyRiskGet.js`, `riskAssessmentCreate.js`)
- [ ] Implements PostGIS spatial queries for geographic analysis
- [ ] Includes rate limiting for third-party climate APIs
- [ ] Uses Redis caching for expensive climate calculations
- [ ] Returns climate data in `Records` array format

### Climate Frontend Component Implementation
- [ ] Uses Mapbox GL for interactive climate visualizations
- [ ] Implements risk meters with appropriate color coding
- [ ] Includes data source attribution and confidence indicators
- [ ] Supports bulk analysis for professional users
- [ ] Uses climate-appropriate color schemes (blues for flood, reds for heat/fire)

### Climate Data Quality Implementation
- [ ] Validates geographic coordinates and addresses
- [ ] Implements confidence scoring for risk assessments
- [ ] Handles temporal data (historical vs. projected risks)
- [ ] Includes data lineage and source tracking
- [ ] Implements climate data freshness validation

## Testing & Validation Commands

When implementing climate features, run:
```bash
# Climate data validation
npm run test:climate-data
npm run validate:geospatial

# Performance testing for bulk analysis
npm run test:bulk-climate-analysis

# Map rendering and visualization
npm run test:map-components
```

## Climate Data Sources & Rate Limits

### FEMA National Risk Index
- **Rate Limit**: 1000 requests/hour
- **Coverage**: Continental US counties and census tracts
- **Data Types**: Flood, wildfire, hurricane, tornado, earthquake

### First Street Foundation
- **Rate Limit**: 100 requests/hour (paid tier: 1000/hour)
- **Coverage**: Property-level US flood risk
- **Data Types**: Current and projected flood risk (30-year)

### NOAA Climate Data
- **Rate Limit**: 10,000 requests/day
- **Coverage**: Global historical and projected climate data
- **Data Types**: Temperature, precipitation, extreme weather

### USGS Water Data
- **Rate Limit**: No published limit (be respectful)
- **Coverage**: US water levels, flow rates, flood history
- **Data Types**: Real-time and historical hydrological data

## Success Metrics for Climate Platform

✅ **Agent Factory Integration**: Autonomous climate data source integration  
✅ **Method-Specific Handlers**: Clean API architecture for climate endpoints  
✅ **Node.js 22 Runtime**: Performance optimization for geospatial calculations  
✅ **PostGIS Integration**: Advanced spatial analysis capabilities  
✅ **Multi-Source Risk Aggregation**: Weighted risk scoring from multiple authoritative sources  
✅ **Professional Bulk Analysis**: Scalable risk assessment for real estate portfolios  
✅ **Interactive Risk Visualization**: Mapbox-powered climate risk mapping  
✅ **API Rate Limit Management**: Respectful integration with climate data providers

The Seawater platform is now equipped with autonomous development capabilities through the Agent Factory system, enabling rapid climate data integration and advanced risk analysis features.

## Deployment Implementation Notes

### Actual Implementation vs Documentation Deltas

**Trial System Architecture**: 
- Current SAM template requires JWT for all endpoints
- Trial users need public property risk assessment access  
- Implemented frontend simulation as workaround until public endpoints added

**Multi-Account Deployment Reality**:
- Seawater CloudFront distributions already existed in media account (5 distributions)
- Had to integrate with existing infrastructure vs creating new
- Cross-account bucket policies manually configured for dev→media access

**Frontend-Backend Integration**:
- Original frontend called non-existent `/health` endpoint
- Updated to comprehensive climate risk simulation with 8 hazard types
- Trial limiting system working with cookie-based persistence

**Key Deployment Actions Completed**:
- Tim-Combo multi-account pattern successfully implemented
- test.seawater.io DNS configured and working  
- Enhanced messaging deployed: "Before You Choose" for broader use cases
- Trial system functional with 1 free comprehensive report per browser
- Flowbite UI components integrated throughout platform

## Agent System Architecture

This project includes Adrian's nested markdown agent memory system with the following specialized agents:

### Available Agents
- **Coder**: Implementation and code generation for climate risk features
- **Planner**: Architecture and task breakdown for climate platform components
- **Researcher**: Documentation and climate data source analysis
- **Reviewer**: Code review and climate data accuracy validation
- **Tester**: Test creation and validation for geospatial calculations

### Specialized Domain Agents
- **Transformation Enhancement Agent**: Climate data aggregation and risk scoring optimization
- **Clover Integration Agent**: POS system integration (adaptable for climate service billing)

### Agent Coordination
- **Memory Persistence**: Agents remember climate context across development sessions
- **Task Classification**: Automatic routing to appropriate agents
- **Climate Focus**: All agents trained on climate data standards and risk assessment patterns
- **Progress Tracking**: Todo and state management for climate feature development

## Agent Usage Examples

### Climate Data Integration Workflow
1. **Use Planner Agent**: Design new climate data source integrations
2. **Use Researcher Agent**: Analyze FEMA/NOAA API documentation and data formats
3. **Use Coder Agent**: Implement geospatial PostGIS queries and risk aggregation
4. **Use Reviewer Agent**: Validate climate risk calculations and data accuracy
5. **Use Tester Agent**: Test climate scenarios and edge cases

### Geospatial Development
- **PostGIS Query Optimization**: Use coder agent for spatial indexing and performance
- **Risk Scoring Algorithms**: Use transformation agent for multi-source data aggregation
- **Map Visualization**: Use coder agent for Mapbox GL integration and rendering