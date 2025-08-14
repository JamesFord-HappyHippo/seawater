# Seawater.io Technical Specifications

## System Architecture Overview

### High-Level Architecture
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   React Web     │    │   API Gateway    │    │  Lambda Layer   │
│   Application   │◄──►│    (REST)       │◄──►│   Functions     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                                          │
                        ┌──────────────────┐             │
                        │  External APIs   │◄────────────┘
                        │  FEMA, First St. │
                        │  ClimateCheck    │
                        └──────────────────┘
                                                          │
                        ┌──────────────────┐             │
                        │   PostgreSQL     │◄────────────┘
                        │   + PostGIS      │
                        │   + Redis Cache  │
                        └──────────────────┘
```

## Backend Architecture

### AWS Lambda Functions

#### 1. Risk Score Aggregator
**Purpose**: Combine and normalize risk scores from multiple data sources
**Runtime**: Node.js 18.x
**Memory**: 512MB
**Timeout**: 30 seconds

**API Endpoints**:
- `GET /api/risk/property/{address}` - Get comprehensive risk scores for property
- `GET /api/risk/compare` - Compare risk scores across multiple properties
- `GET /api/risk/trends/{location}` - Get historical risk trends for area

**Dependencies**:
- FEMA NRI API client
- First Street Foundation API client
- ClimateCheck API client
- PostgreSQL with PostGIS
- Redis for caching

**Key Functions**:
```javascript
// Core risk aggregation function
async function aggregateRiskScores(address, sources = ['fema', 'firststreet', 'climatecheck']) {
  const geocoded = await geocodeAddress(address);
  const riskData = await Promise.allSettled([
    getFEMANRIData(geocoded),
    getFirstStreetData(geocoded),
    getClimateCheckData(geocoded)
  ]);
  
  return normalizeAndCombineScores(riskData);
}

// Risk score normalization (0-100 scale)
function normalizeRiskScore(rawScore, sourceType, hazardType) {
  const normalizationRules = {
    fema: { flood: (score) => Math.min(score * 20, 100) },
    firststreet: { flood: (score) => score }, // already 0-100
    climatecheck: { flood: (score) => score * 10 }
  };
  
  return normalizationRules[sourceType][hazardType](rawScore);
}
```

#### 2. Geographic Data Processor
**Purpose**: Handle geocoding, spatial queries, and coordinate transformations
**Runtime**: Node.js 18.x
**Memory**: 1024MB
**Timeout**: 45 seconds

**API Endpoints**:
- `POST /api/geocode` - Convert address to coordinates
- `GET /api/spatial/nearby/{lat}/{lng}` - Find nearby properties and risk data
- `GET /api/spatial/boundary/{type}/{id}` - Get boundary data for counties/census tracts

**Key Functions**:
```javascript
// Address geocoding with multiple providers
async function geocodeAddress(address) {
  const providers = [
    () => geocodeWithMapBox(address),
    () => geocodeWithGoogle(address),
    () => geocodeWithCensus(address) // free fallback
  ];
  
  for (const provider of providers) {
    try {
      const result = await provider();
      if (result.confidence > 0.8) return result;
    } catch (error) {
      console.warn(`Geocoding provider failed: ${error.message}`);
    }
  }
  
  throw new Error('All geocoding providers failed');
}

// Spatial query for risk data
async function getSpatialRiskData(lat, lng, radiusKm = 5) {
  const query = `
    SELECT 
      county_name,
      census_tract,
      flood_risk_score,
      wildfire_risk_score,
      heat_risk_score,
      ST_Distance(
        ST_GeogFromText('POINT(${lng} ${lat})'),
        geom
      ) as distance_meters
    FROM risk_data 
    WHERE ST_DWithin(
      ST_GeogFromText('POINT(${lng} ${lat})'),
      geom,
      ${radiusKm * 1000}
    )
    ORDER BY distance_meters
    LIMIT 50;
  `;
  
  return await executeQuery(query);
}
```

#### 3. FEMA Data Sync
**Purpose**: Synchronize and cache FEMA data sources
**Runtime**: Node.js 18.x
**Memory**: 512MB
**Timeout**: 15 minutes (for batch operations)

**Scheduled Operations**:
- Daily: Update flood map data
- Weekly: Sync National Risk Index updates
- Monthly: Full data refresh and validation

**Key Functions**:
```javascript
// FEMA NRI API integration
async function fetchFEMANRIData(stateCode, countyCode) {
  const response = await fetch(
    `https://hazards.fema.gov/nri/api/v1/national-risk-index/counties/${stateCode}${countyCode}`,
    { headers: { 'Accept': 'application/json' } }
  );
  
  if (!response.ok) {
    throw new Error(`FEMA API error: ${response.status}`);
  }
  
  return await response.json();
}

// Flood zone determination
async function getFloodZone(lat, lng) {
  const wmsUrl = `https://hazards.fema.gov/gis/nfhl/services/FIRMette/MapServer/WMSServer`;
  const params = new URLSearchParams({
    SERVICE: 'WMS',
    VERSION: '1.3.0',
    REQUEST: 'GetFeatureInfo',
    BBOX: `${lng-0.001},${lat-0.001},${lng+0.001},${lat+0.001}`,
    CRS: 'EPSG:4326',
    WIDTH: '101',
    HEIGHT: '101',
    LAYERS: 'FLD_ZONE',
    QUERY_LAYERS: 'FLD_ZONE',
    INFO_FORMAT: 'application/json',
    I: '50',
    J: '50'
  });
  
  const response = await fetch(`${wmsUrl}?${params}`);
  return await response.json();
}
```

#### 4. Premium API Orchestrator
**Purpose**: Manage premium data source integrations and usage tracking
**Runtime**: Node.js 18.x
**Memory**: 512MB
**Timeout**: 30 seconds

**Features**:
- Usage quota management
- Cost tracking and alerts
- Fallback to free sources when quotas exceeded
- Premium feature access control

### Database Schema (PostgreSQL + PostGIS)

#### Core Tables

```sql
-- Geographic reference data
CREATE TABLE counties (
  id SERIAL PRIMARY KEY,
  state_code VARCHAR(2) NOT NULL,
  county_code VARCHAR(3) NOT NULL,
  county_name VARCHAR(100) NOT NULL,
  geom GEOMETRY(MULTIPOLYGON, 4326),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(state_code, county_code)
);

CREATE TABLE census_tracts (
  id SERIAL PRIMARY KEY,
  state_code VARCHAR(2) NOT NULL,
  county_code VARCHAR(3) NOT NULL,
  tract_code VARCHAR(6) NOT NULL,
  geoid VARCHAR(11) NOT NULL,
  geom GEOMETRY(MULTIPOLYGON, 4326),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(geoid)
);

-- Risk score cache
CREATE TABLE risk_scores (
  id SERIAL PRIMARY KEY,
  address_hash VARCHAR(64) NOT NULL, -- SHA-256 of normalized address
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  county_id INTEGER REFERENCES counties(id),
  census_tract_id INTEGER REFERENCES census_tracts(id),
  
  -- FEMA NRI scores
  fema_flood_score INTEGER,
  fema_wildfire_score INTEGER,
  fema_heat_score INTEGER,
  fema_tornado_score INTEGER,
  fema_hurricane_score INTEGER,
  fema_social_vulnerability DECIMAL(4, 2),
  fema_community_resilience DECIMAL(4, 2),
  
  -- First Street Foundation scores
  fs_flood_score INTEGER,
  fs_wildfire_score INTEGER,
  fs_heat_score INTEGER,
  fs_flood_30yr INTEGER,
  fs_wildfire_30yr INTEGER,
  fs_heat_30yr INTEGER,
  
  -- ClimateCheck scores
  cc_precipitation_risk INTEGER,
  cc_drought_risk INTEGER,
  cc_extreme_heat_risk INTEGER,
  cc_wildfire_risk INTEGER,
  cc_flood_risk INTEGER,
  
  -- Metadata
  last_updated TIMESTAMP DEFAULT NOW(),
  data_sources TEXT[], -- array of source names
  cache_expires_at TIMESTAMP,
  
  UNIQUE(address_hash)
);

-- Building code information
CREATE TABLE building_codes (
  id SERIAL PRIMARY KEY,
  jurisdiction_name VARCHAR(100) NOT NULL,
  state_code VARCHAR(2) NOT NULL,
  county_code VARCHAR(3),
  municipality_name VARCHAR(100),
  
  -- Building code adoption status
  current_wind_code VARCHAR(50),
  current_seismic_code VARCHAR(50),
  current_flood_code VARCHAR(50),
  adoption_date DATE,
  enforcement_level VARCHAR(20), -- 'full', 'partial', 'minimal'
  
  -- BCAT data
  bcat_score INTEGER, -- 0-100 score from FEMA BCAT
  bcat_last_updated DATE,
  
  geom GEOMETRY(MULTIPOLYGON, 4326),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- User and search tracking
CREATE TABLE user_searches (
  id SERIAL PRIMARY KEY,
  user_id UUID,
  session_id VARCHAR(100),
  search_address TEXT NOT NULL,
  normalized_address TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  risk_scores_id INTEGER REFERENCES risk_scores(id),
  premium_features_used BOOLEAN DEFAULT FALSE,
  search_timestamp TIMESTAMP DEFAULT NOW(),
  user_agent TEXT,
  ip_address INET
);

-- Professional directory
CREATE TABLE climate_professionals (
  id SERIAL PRIMARY KEY,
  professional_type VARCHAR(50) NOT NULL, -- 'agent', 'inspector', 'insurance'
  name VARCHAR(100) NOT NULL,
  company VARCHAR(100),
  email VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  license_number VARCHAR(50),
  
  -- Climate expertise
  climate_certifications TEXT[],
  specialization_areas TEXT[], -- flood, wildfire, hurricane, etc.
  service_areas GEOMETRY(MULTIPOLYGON, 4326),
  
  -- Rating and reviews
  average_rating DECIMAL(3, 2),
  total_reviews INTEGER DEFAULT 0,
  verified BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### Indexes for Performance

```sql
-- Spatial indexes
CREATE INDEX idx_counties_geom ON counties USING GIST (geom);
CREATE INDEX idx_census_tracts_geom ON census_tracts USING GIST (geom);
CREATE INDEX idx_risk_scores_location ON risk_scores USING GIST (ST_Point(longitude, latitude));
CREATE INDEX idx_building_codes_geom ON building_codes USING GIST (geom);

-- Performance indexes
CREATE INDEX idx_risk_scores_address_hash ON risk_scores (address_hash);
CREATE INDEX idx_risk_scores_expires ON risk_scores (cache_expires_at);
CREATE INDEX idx_user_searches_timestamp ON user_searches (search_timestamp);
CREATE INDEX idx_user_searches_session ON user_searches (session_id);

-- Composite indexes for common queries
CREATE INDEX idx_risk_scores_location_updated ON risk_scores (latitude, longitude, last_updated);
CREATE INDEX idx_building_codes_jurisdiction ON building_codes (state_code, county_code, municipality_name);
```

## Frontend Architecture

### React Component Structure

```
src/
├── components/
│   ├── common/
│   │   ├── Layout.tsx
│   │   ├── Header.tsx
│   │   ├── Footer.tsx
│   │   ├── SearchBar.tsx
│   │   └── LoadingSpinner.tsx
│   ├── maps/
│   │   ├── InteractiveMap.tsx
│   │   ├── RiskOverlay.tsx
│   │   ├── PropertyMarker.tsx
│   │   └── HeatMapLayer.tsx
│   ├── risk/
│   │   ├── RiskScoreCard.tsx
│   │   ├── RiskComparison.tsx
│   │   ├── TrendChart.tsx
│   │   └── HazardBreakdown.tsx
│   ├── education/
│   │   ├── InsuranceGuide.tsx
│   │   ├── BuildingCodeInfo.tsx
│   │   ├── PreparednessList.tsx
│   │   └── StateDisclosures.tsx
│   └── professionals/
│       ├── ProfessionalCard.tsx
│       ├── ProfessionalSearch.tsx
│       └── ReviewSystem.tsx
├── hooks/
│   ├── useGeolocation.ts
│   ├── useRiskData.ts
│   ├── useAddressSearch.ts
│   └── usePremiumFeatures.ts
├── services/
│   ├── api.ts
│   ├── geocoding.ts
│   ├── riskCalculations.ts
│   └── mapboxService.ts
├── types/
│   ├── risk.ts
│   ├── geographic.ts
│   ├── user.ts
│   └── api.ts
└── utils/
    ├── formatters.ts
    ├── validators.ts
    └── constants.ts
```

### Key React Components

#### RiskScoreCard Component
```typescript
interface RiskScoreCardProps {
  address: string;
  riskData: RiskAssessment;
  showPremiumFeatures: boolean;
}

export const RiskScoreCard: React.FC<RiskScoreCardProps> = ({
  address,
  riskData,
  showPremiumFeatures
}) => {
  const hazardTypes = ['flood', 'wildfire', 'heat', 'tornado', 'hurricane'];
  
  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-xl font-bold mb-4">Climate Risk Assessment</h2>
      <p className="text-gray-600 mb-6">{address}</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {hazardTypes.map(hazard => (
          <HazardRiskDisplay
            key={hazard}
            hazardType={hazard}
            scores={{
              fema: riskData.fema[`${hazard}_score`],
              firstStreet: showPremiumFeatures ? riskData.firstStreet[`${hazard}_score`] : null,
              climateCheck: riskData.climateCheck[`${hazard}_risk`]
            }}
          />
        ))}
      </div>
      
      {showPremiumFeatures && (
        <div className="mt-6 border-t pt-6">
          <h3 className="text-lg font-semibold mb-3">30-Year Projections</h3>
          <TrendChart data={riskData.firstStreet.projections} />
        </div>
      )}
    </div>
  );
};
```

#### Interactive Map Component
```typescript
interface InteractiveMapProps {
  center: [number, number];
  zoom: number;
  riskOverlay: 'flood' | 'wildfire' | 'heat' | null;
  properties: PropertyMarker[];
  onLocationSelect: (lat: number, lng: number) => void;
}

export const InteractiveMap: React.FC<InteractiveMapProps> = ({
  center,
  zoom,
  riskOverlay,
  properties,
  onLocationSelect
}) => {
  const mapRef = useRef<mapboxgl.Map>();
  
  useEffect(() => {
    if (!mapRef.current) return;
    
    // Add risk overlay layer
    if (riskOverlay) {
      const layerConfig = getRiskLayerConfig(riskOverlay);
      mapRef.current.addLayer(layerConfig);
    }
    
    return () => {
      if (riskOverlay && mapRef.current?.getLayer(`${riskOverlay}-risk`)) {
        mapRef.current.removeLayer(`${riskOverlay}-risk`);
      }
    };
  }, [riskOverlay]);
  
  const handleMapClick = useCallback((e: mapboxgl.MapMouseEvent) => {
    const { lng, lat } = e.lngLat;
    onLocationSelect(lat, lng);
  }, [onLocationSelect]);
  
  return (
    <div className="w-full h-96 rounded-lg overflow-hidden">
      <Map
        ref={mapRef}
        mapboxAccessToken={process.env.REACT_APP_MAPBOX_TOKEN}
        initialViewState={{ longitude: center[0], latitude: center[1], zoom }}
        style={{ width: '100%', height: '100%' }}
        mapStyle="mapbox://styles/mapbox/light-v11"
        onClick={handleMapClick}
      >
        {properties.map(property => (
          <Marker
            key={property.id}
            longitude={property.longitude}
            latitude={property.latitude}
          >
            <PropertyMarker data={property} />
          </Marker>
        ))}
        
        {riskOverlay && (
          <Source id="risk-data" type="raster" tiles={[getRiskTileUrl(riskOverlay)]}>
            <Layer id={`${riskOverlay}-risk`} type="raster" paint={{ 'raster-opacity': 0.6 }} />
          </Source>
        )}
      </Map>
    </div>
  );
};
```

### TypeScript Interfaces

```typescript
// Core risk assessment types
interface RiskAssessment {
  address: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  fema: FEMAData;
  firstStreet?: FirstStreetData;
  climateCheck?: ClimateCheckData;
  buildingCodes: BuildingCodeData;
  lastUpdated: string;
}

interface FEMAData {
  flood_score: number;
  wildfire_score: number;
  heat_score: number;
  tornado_score: number;
  hurricane_score: number;
  social_vulnerability: number;
  community_resilience: number;
  flood_zone: string;
  requires_flood_insurance: boolean;
}

interface FirstStreetData {
  flood_score: number;
  wildfire_score: number;
  heat_score: number;
  projections: {
    flood_30yr: number;
    wildfire_30yr: number;
    heat_30yr: number;
  };
  property_specific: boolean;
}

interface ClimateCheckData {
  precipitation_risk: number;
  drought_risk: number;
  extreme_heat_risk: number;
  wildfire_risk: number;
  flood_risk: number;
  methodology_version: string;
}

interface BuildingCodeData {
  jurisdiction: string;
  current_codes: {
    wind: string;
    seismic: string;
    flood: string;
  };
  adoption_date: string;
  enforcement_level: 'full' | 'partial' | 'minimal';
  bcat_score: number;
  recommended_upgrades: string[];
}
```

## API Specifications

### REST API Endpoints

#### Risk Assessment APIs

```
GET /api/risk/property
Query Parameters:
  - address: string (required)
  - sources: string[] (optional, default: ['fema'])
  - include_projections: boolean (optional, default: false)

Response:
{
  "success": true,
  "data": {
    "Records": [RiskAssessment],
    "Query_Context": {
      "Mode": "Property_Risk_Assessment",
      "Operation": "READ",
      "Data_Sources": ["fema", "firststreet"],
      "Cache_Status": "hit" | "miss"
    }
  },
  "meta": {
    "Total_Records": 1,
    "Request_ID": "uuid",
    "Timestamp": "2025-07-29T22:40:00Z",
    "Processing_Time_MS": 150
  }
}
```

```
GET /api/risk/compare
Query Parameters:
  - addresses: string[] (required, max 5)
  - hazard_types: string[] (optional)

Response:
{
  "success": true,
  "data": {
    "Records": [RiskComparison],
    "Analytics": {
      "Comparison_Summary": {
        "Lowest_Risk_Address": "string",
        "Highest_Risk_Address": "string",
        "Average_Risk_Score": number
      }
    }
  }
}
```

#### Geographic APIs

```
POST /api/geocode
Request Body:
{
  "address": "string",
  "bias_region": "us" | "ca" (optional),
  "return_components": boolean (optional)
}

Response:
{
  "success": true,
  "data": {
    "Records": [{
      "formatted_address": "string",
      "latitude": number,
      "longitude": number,
      "confidence": number,
      "address_components": {...}
    }]
  }
}
```

#### Professional Directory APIs

```
GET /api/professionals/search
Query Parameters:
  - type: 'agent' | 'inspector' | 'insurance'
  - latitude: number
  - longitude: number
  - radius_km: number (default: 25)
  - specializations: string[] (optional)

Response:
{
  "success": true,
  "data": {
    "Records": [ClimateProfessional],
    "Analytics": {
      "Total_In_Area": number,
      "By_Type": {...},
      "Average_Rating": number
    }
  }
}
```

## Performance Requirements

### Response Time Targets
- Property risk lookup: < 2 seconds
- Map rendering: < 1 second
- Geographic search: < 500ms
- Cached data retrieval: < 200ms

### Scalability Targets
- 1,000 concurrent users
- 10,000 property searches per day
- 99.9% uptime
- Auto-scaling from 0 to 50 Lambda instances

### Caching Strategy
- Redis for API response caching (TTL: 1 hour)
- Browser caching for static assets (TTL: 24 hours)
- Database query result caching (TTL: 6 hours)
- CDN caching for map tiles and images (TTL: 7 days)

## Security Requirements

### Authentication & Authorization
- JWT-based user authentication
- API key authentication for premium features
- Rate limiting: 100 requests per minute per IP
- CORS configuration for web domain only

### Data Protection
- HTTPS/TLS 1.2+ for all communications
- Database encryption at rest
- PII data minimization and anonymization
- Compliance with CCPA/GDPR requirements

### API Security
- Input validation and sanitization
- SQL injection prevention
- XSS protection headers
- API rate limiting and DDoS protection

This technical specification provides the detailed foundation needed to implement the seawater.io climate risk platform according to the implementation plan.
