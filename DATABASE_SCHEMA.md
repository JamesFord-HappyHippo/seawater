# Seawater Climate Risk Platform - Database Schema Design

## Overview

Complete PostgreSQL + PostGIS database schema for the Seawater climate risk platform supporting property-level climate risk assessments, multi-source data integration, and professional tools.

## Schema Architecture

### Core Design Principles
- **PostGIS Integration**: Spatial data types and indexes for geographic queries
- **Multi-Source Support**: Flexible storage for FEMA, NOAA, USGS, and state data
- **Performance Optimized**: Sub-2-second query response times
- **Audit Trail**: Complete data lineage and source tracking
- **Scalable**: Support for 100M+ property records

## Database Setup

```sql
-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create application user
CREATE USER seawater_app WITH PASSWORD 'secure_password_here';
GRANT CONNECT ON DATABASE seawater TO seawater_app;
```

## Core Tables

### 1. Properties Table

```sql
CREATE TABLE properties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    address TEXT NOT NULL,
    normalized_address TEXT NOT NULL,
    street_number VARCHAR(20),
    street_name VARCHAR(255),
    city VARCHAR(100),
    state CHAR(2),
    zip_code VARCHAR(10),
    plus4 VARCHAR(4),
    county VARCHAR(100),
    fips_code VARCHAR(12),
    
    -- Geographic data
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    location GEOMETRY(POINT, 4326) NOT NULL,
    elevation_meters INTEGER,
    
    -- Property characteristics
    property_type VARCHAR(50), -- residential, commercial, industrial
    year_built INTEGER,
    square_feet INTEGER,
    bedrooms INTEGER,
    bathrooms DECIMAL(3,1),
    
    -- Data quality
    geocoding_accuracy VARCHAR(20), -- rooftop, parcel, street, city
    geocoding_source VARCHAR(50), -- mapbox, google, census
    verification_status VARCHAR(20) DEFAULT 'unverified',
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_assessed TIMESTAMP
);

-- Spatial index for location-based queries
CREATE INDEX idx_properties_location ON properties USING GIST (location);

-- Address search indexes
CREATE INDEX idx_properties_normalized_address ON properties USING GIN (to_tsvector('english', normalized_address));
CREATE INDEX idx_properties_zip_code ON properties (zip_code);
CREATE INDEX idx_properties_fips_code ON properties (fips_code);
CREATE INDEX idx_properties_state_city ON properties (state, city);

-- Performance indexes
CREATE INDEX idx_properties_updated_at ON properties (updated_at DESC);
CREATE INDEX idx_properties_last_assessed ON properties (last_assessed DESC);
```

### 2. Climate Risk Assessments Table

```sql
CREATE TABLE climate_risk_assessments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    assessment_date TIMESTAMP DEFAULT NOW(),
    
    -- Overall risk scores (0-100 scale)
    overall_risk_score INTEGER CHECK (overall_risk_score >= 0 AND overall_risk_score <= 100),
    risk_category VARCHAR(20), -- very_low, low, moderate, high, very_high
    
    -- Individual risk components (0-100 scale)
    flood_risk_score INTEGER CHECK (flood_risk_score >= 0 AND flood_risk_score <= 100),
    wildfire_risk_score INTEGER CHECK (wildfire_risk_score >= 0 AND wildfire_risk_score <= 100),
    hurricane_risk_score INTEGER CHECK (hurricane_risk_score >= 0 AND hurricane_risk_score <= 100),
    tornado_risk_score INTEGER CHECK (tornado_risk_score >= 0 AND tornado_risk_score <= 100),
    earthquake_risk_score INTEGER CHECK (earthquake_risk_score >= 0 AND earthquake_risk_score <= 100),
    heat_risk_score INTEGER CHECK (heat_risk_score >= 0 AND heat_risk_score <= 100),
    drought_risk_score INTEGER CHECK (drought_risk_score >= 0 AND drought_risk_score <= 100),
    hail_risk_score INTEGER CHECK (hail_risk_score >= 0 AND hail_risk_score <= 100),
    
    -- FEMA specific data
    fema_flood_zone VARCHAR(10),
    fema_risk_rating VARCHAR(20),
    fema_community_rating INTEGER,
    
    -- Confidence and data quality
    confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
    data_completeness DECIMAL(3,2) CHECK (data_completeness >= 0 AND data_completeness <= 1),
    
    -- Assessment metadata
    assessment_version VARCHAR(20) DEFAULT '1.0',
    expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '30 days'),
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Performance indexes
CREATE INDEX idx_risk_assessments_property_id ON climate_risk_assessments (property_id);
CREATE INDEX idx_risk_assessments_overall_score ON climate_risk_assessments (overall_risk_score);
CREATE INDEX idx_risk_assessments_flood_score ON climate_risk_assessments (flood_risk_score);
CREATE INDEX idx_risk_assessments_expires_at ON climate_risk_assessments (expires_at);
CREATE INDEX idx_risk_assessments_assessment_date ON climate_risk_assessments (assessment_date DESC);

-- Ensure one current assessment per property
CREATE UNIQUE INDEX idx_risk_assessments_current ON climate_risk_assessments (property_id) 
WHERE expires_at > NOW();
```

### 3. Data Sources Table

```sql
CREATE TABLE data_sources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_name VARCHAR(100) NOT NULL UNIQUE,
    source_type VARCHAR(50) NOT NULL, -- api, file, manual
    api_endpoint TEXT,
    api_version VARCHAR(20),
    rate_limit_per_hour INTEGER,
    cost_per_request DECIMAL(10,4),
    
    -- Reliability metrics
    uptime_percentage DECIMAL(5,2),
    average_response_time_ms INTEGER,
    last_successful_call TIMESTAMP,
    last_failed_call TIMESTAMP,
    
    -- Configuration
    is_active BOOLEAN DEFAULT TRUE,
    priority_order INTEGER DEFAULT 1,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Initial data sources
INSERT INTO data_sources (source_name, source_type, api_endpoint, rate_limit_per_hour, cost_per_request) VALUES
('FEMA National Risk Index', 'api', 'https://www.fema.gov/api/open/v2', 1000, 0.00),
('NOAA Climate Data Online', 'api', 'https://www.ncdc.noaa.gov/cdo-web/api/v2', 1000, 0.00),
('USGS Earthquake API', 'api', 'https://earthquake.usgs.gov/fdsnws/event/1/', 1000, 0.00),
('First Street Foundation', 'api', 'https://api.firststreet.org/risk/v1', 10000, 0.003),
('ClimateCheck', 'api', 'https://api.climatecheck.com/v1', 5000, 0.002);
```

### 4. Data Source Responses Table

```sql
CREATE TABLE data_source_responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    source_id UUID NOT NULL REFERENCES data_sources(id),
    
    -- Request details
    request_url TEXT,
    request_params JSONB,
    response_status INTEGER,
    response_time_ms INTEGER,
    
    -- Response data
    raw_response JSONB,
    processed_data JSONB,
    error_message TEXT,
    
    -- Data quality
    data_version VARCHAR(50),
    data_timestamp TIMESTAMP,
    confidence_level DECIMAL(3,2),
    
    created_at TIMESTAMP DEFAULT NOW()
);

-- Performance indexes
CREATE INDEX idx_data_responses_property_source ON data_source_responses (property_id, source_id);
CREATE INDEX idx_data_responses_created_at ON data_source_responses (created_at DESC);
CREATE INDEX idx_data_responses_status ON data_source_responses (response_status);

-- GIN index for JSONB queries
CREATE INDEX idx_data_responses_raw_response ON data_source_responses USING GIN (raw_response);
CREATE INDEX idx_data_responses_processed_data ON data_source_responses USING GIN (processed_data);
```

## User Management Tables

### 5. Users Table

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    email_verified BOOLEAN DEFAULT FALSE,
    
    -- Profile information
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(20),
    company VARCHAR(255),
    job_title VARCHAR(100),
    
    -- Authentication
    password_hash VARCHAR(255),
    salt VARCHAR(255),
    last_login TIMESTAMP,
    login_count INTEGER DEFAULT 0,
    
    -- Subscription
    subscription_tier VARCHAR(20) DEFAULT 'free', -- free, premium, professional, enterprise
    subscription_status VARCHAR(20) DEFAULT 'active',
    subscription_expires TIMESTAMP,
    
    -- Preferences
    preferences JSONB DEFAULT '{}',
    notification_settings JSONB DEFAULT '{}',
    
    -- Account status
    is_active BOOLEAN DEFAULT TRUE,
    is_verified BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_users_email ON users (email);
CREATE INDEX idx_users_subscription_tier ON users (subscription_tier);
CREATE INDEX idx_users_created_at ON users (created_at DESC);
```

### 6. API Keys Table

```sql
CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    key_name VARCHAR(100),
    api_key VARCHAR(255) UNIQUE NOT NULL,
    api_secret VARCHAR(255),
    
    -- Permissions and limits
    allowed_endpoints TEXT[],
    rate_limit_per_hour INTEGER,
    rate_limit_per_day INTEGER,
    
    -- Usage tracking
    total_requests INTEGER DEFAULT 0,
    last_used TIMESTAMP,
    
    -- Key status
    is_active BOOLEAN DEFAULT TRUE,
    expires_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_api_keys_user_id ON api_keys (user_id);
CREATE INDEX idx_api_keys_api_key ON api_keys (api_key);
CREATE INDEX idx_api_keys_is_active ON api_keys (is_active);
```

### 7. Usage Analytics Table

```sql
CREATE TABLE usage_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    api_key_id UUID REFERENCES api_keys(id),
    
    -- Request details
    endpoint VARCHAR(255),
    http_method VARCHAR(10),
    request_size_bytes INTEGER,
    response_size_bytes INTEGER,
    response_time_ms INTEGER,
    status_code INTEGER,
    
    -- Geographic context
    property_count INTEGER DEFAULT 1,
    zip_codes TEXT[],
    states TEXT[],
    
    -- Billing
    billable_request BOOLEAN DEFAULT TRUE,
    cost DECIMAL(10,4) DEFAULT 0.00,
    
    -- Client information
    user_agent TEXT,
    ip_address INET,
    referrer TEXT,
    
    created_at TIMESTAMP DEFAULT NOW()
);

-- Partitioning by month for performance
CREATE TABLE usage_analytics_y2025m01 PARTITION OF usage_analytics
FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

-- Indexes for analytics queries
CREATE INDEX idx_usage_analytics_user_id_date ON usage_analytics (user_id, created_at DESC);
CREATE INDEX idx_usage_analytics_endpoint_date ON usage_analytics (endpoint, created_at DESC);
CREATE INDEX idx_usage_analytics_billable ON usage_analytics (billable_request, created_at DESC);
```

## Geographic Support Tables

### 8. Geographic Boundaries Table

```sql
CREATE TABLE geographic_boundaries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    boundary_type VARCHAR(50) NOT NULL, -- county, flood_zone, wildfire_zone, hurricane_zone
    boundary_name VARCHAR(255) NOT NULL,
    fips_code VARCHAR(12),
    state CHAR(2),
    
    -- Geographic data
    geometry GEOMETRY(MULTIPOLYGON, 4326),
    centroid GEOMETRY(POINT, 4326),
    area_sq_km DECIMAL(12,4),
    
    -- Metadata
    data_source VARCHAR(100),
    data_vintage DATE,
    last_updated TIMESTAMP DEFAULT NOW(),
    
    created_at TIMESTAMP DEFAULT NOW()
);

-- Spatial indexes
CREATE INDEX idx_boundaries_geometry ON geographic_boundaries USING GIST (geometry);
CREATE INDEX idx_boundaries_centroid ON geographic_boundaries USING GIST (centroid);
CREATE INDEX idx_boundaries_type_state ON geographic_boundaries (boundary_type, state);
```

### 9. Climate Projections Table

```sql
CREATE TABLE climate_projections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    
    -- Time period
    projection_year INTEGER NOT NULL,
    scenario VARCHAR(50), -- rcp26, rcp45, rcp60, rcp85
    
    -- Temperature projections (Celsius)
    avg_temp_summer DECIMAL(5,2),
    avg_temp_winter DECIMAL(5,2),
    max_temp_days_over_35c INTEGER, -- extreme heat days
    min_temp_days_below_0c INTEGER, -- freezing days
    
    -- Precipitation projections (mm)
    annual_precipitation DECIMAL(8,2),
    summer_precipitation DECIMAL(8,2),
    winter_precipitation DECIMAL(8,2),
    extreme_precipitation_days INTEGER, -- days over 95th percentile
    
    -- Risk-specific projections
    wildfire_season_length INTEGER, -- days
    hurricane_intensity_change DECIMAL(3,2), -- percentage change
    sea_level_rise_cm DECIMAL(6,2),
    drought_severity_index DECIMAL(5,2),
    
    -- Data source and quality
    model_name VARCHAR(100),
    confidence_interval DECIMAL(3,2),
    data_source VARCHAR(100),
    
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_projections_property_year ON climate_projections (property_id, projection_year);
CREATE INDEX idx_projections_scenario ON climate_projections (scenario);
```

## Performance Optimization

### Materialized Views for Common Queries

```sql
-- Property risk summary view
CREATE MATERIALIZED VIEW property_risk_summary AS
SELECT 
    p.id as property_id,
    p.normalized_address,
    p.city,
    p.state,
    p.zip_code,
    p.location,
    cra.overall_risk_score,
    cra.flood_risk_score,
    cra.wildfire_risk_score,
    cra.hurricane_risk_score,
    cra.earthquake_risk_score,
    cra.assessment_date,
    cra.expires_at
FROM properties p
LEFT JOIN climate_risk_assessments cra ON p.id = cra.property_id 
WHERE cra.expires_at > NOW() OR cra.expires_at IS NULL;

-- Refresh strategy
CREATE INDEX idx_property_risk_summary_location ON property_risk_summary USING GIST (location);
CREATE INDEX idx_property_risk_summary_overall_score ON property_risk_summary (overall_risk_score);

-- Refresh materialized view (run daily)
-- REFRESH MATERIALIZED VIEW CONCURRENTLY property_risk_summary;
```

### Connection Pool Configuration

```sql
-- Database configuration for connection pooling
ALTER SYSTEM SET max_connections = 200;
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET wal_buffers = '16MB';
ALTER SYSTEM SET default_statistics_target = 100;
ALTER SYSTEM SET random_page_cost = 1.1;
SELECT pg_reload_conf();
```

## Sample Queries

### Property Risk Lookup

```sql
-- Get property risk assessment by address
SELECT 
    p.normalized_address,
    cra.overall_risk_score,
    cra.flood_risk_score,
    cra.wildfire_risk_score,
    cra.hurricane_risk_score,
    cra.assessment_date
FROM properties p
JOIN climate_risk_assessments cra ON p.id = cra.property_id
WHERE p.normalized_address ILIKE '%123 Main St%'
  AND cra.expires_at > NOW()
ORDER BY cra.assessment_date DESC
LIMIT 1;
```

### Geographic Risk Search

```sql
-- Find properties within 5km with high flood risk
SELECT 
    p.normalized_address,
    cra.flood_risk_score,
    ST_Distance(p.location, ST_SetSRID(ST_MakePoint(-122.4194, 37.7749), 4326)) as distance_meters
FROM properties p
JOIN climate_risk_assessments cra ON p.id = cra.property_id
WHERE ST_DWithin(
    p.location, 
    ST_SetSRID(ST_MakePoint(-122.4194, 37.7749), 4326), 
    5000  -- 5km radius
)
  AND cra.flood_risk_score >= 70
  AND cra.expires_at > NOW()
ORDER BY distance_meters
LIMIT 50;
```

### Analytics Query

```sql
-- Usage analytics for billing
SELECT 
    u.subscription_tier,
    COUNT(*) as total_requests,
    SUM(ua.cost) as total_cost,
    AVG(ua.response_time_ms) as avg_response_time
FROM usage_analytics ua
JOIN users u ON ua.user_id = u.id
WHERE ua.created_at >= CURRENT_DATE - INTERVAL '30 days'
  AND ua.billable_request = true
GROUP BY u.subscription_tier
ORDER BY total_requests DESC;
```

## Database Migration Strategy

```sql
-- Migration versioning table
CREATE TABLE schema_migrations (
    version VARCHAR(20) PRIMARY KEY,
    description TEXT,
    applied_at TIMESTAMP DEFAULT NOW()
);

-- Track this schema as version 1.0
INSERT INTO schema_migrations (version, description) VALUES 
('1.0.0', 'Initial schema with core tables and PostGIS setup');
```

## Backup and Maintenance

```bash
#!/bin/bash
# Daily backup script
pg_dump -h $DB_HOST -U $DB_USER -d seawater \
  --format=custom \
  --compress=9 \
  --file="/backups/seawater_$(date +%Y%m%d_%H%M%S).backup"

# Vacuum and analyze for performance
psql -h $DB_HOST -U $DB_USER -d seawater -c "VACUUM ANALYZE;"

# Refresh materialized views
psql -h $DB_HOST -U $DB_USER -d seawater -c "REFRESH MATERIALIZED VIEW CONCURRENTLY property_risk_summary;"
```

## Performance Monitoring

```sql
-- Query performance monitoring
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Monitor slow queries
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    rows
FROM pg_stat_statements 
WHERE mean_time > 1000  -- queries taking > 1 second
ORDER BY mean_time DESC
LIMIT 10;
```

This database schema provides a comprehensive foundation for the Seawater climate risk platform with optimized performance, spatial capabilities, and support for multi-source climate data integration.