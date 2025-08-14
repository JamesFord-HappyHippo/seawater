-- Seawater Climate Risk Platform - Database Initialization
-- Phase 1 - Core tables for MVP functionality

-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Verify PostGIS installation
SELECT PostGIS_version();

-- Create application user
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'seawater_app') THEN
    CREATE USER seawater_app WITH PASSWORD 'ChangeMe123!';
  END IF;
END
$$;

GRANT CONNECT ON DATABASE seawater TO seawater_app;

-- Core Tables for Phase 1

-- 1. Properties Table
CREATE TABLE IF NOT EXISTS properties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    address TEXT NOT NULL,
    normalized_address TEXT NOT NULL,
    street_number VARCHAR(20),
    street_name VARCHAR(255),
    city VARCHAR(100),
    state CHAR(2),
    zip_code VARCHAR(10),
    county VARCHAR(100),
    fips_code VARCHAR(12),
    
    -- Geographic data
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    location GEOMETRY(POINT, 4326) NOT NULL,
    elevation_meters INTEGER,
    
    -- Data quality
    geocoding_accuracy VARCHAR(20), -- rooftop, parcel, street, city
    geocoding_source VARCHAR(50), -- mapbox, google, census
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_assessed TIMESTAMP
);

-- Spatial index for location-based queries
CREATE INDEX IF NOT EXISTS idx_properties_location ON properties USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_properties_normalized_address ON properties (normalized_address);
CREATE INDEX IF NOT EXISTS idx_properties_zip_code ON properties (zip_code);
CREATE INDEX IF NOT EXISTS idx_properties_fips_code ON properties (fips_code);
CREATE INDEX IF NOT EXISTS idx_properties_state_city ON properties (state, city);

-- 2. Climate Risk Assessments Table
CREATE TABLE IF NOT EXISTS climate_risk_assessments (
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
    
    -- FEMA specific data
    fema_flood_zone VARCHAR(10),
    fema_risk_rating VARCHAR(20),
    
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
CREATE INDEX IF NOT EXISTS idx_risk_assessments_property_id ON climate_risk_assessments (property_id);
CREATE INDEX IF NOT EXISTS idx_risk_assessments_overall_score ON climate_risk_assessments (overall_risk_score);
CREATE INDEX IF NOT EXISTS idx_risk_assessments_flood_score ON climate_risk_assessments (flood_risk_score);
CREATE INDEX IF NOT EXISTS idx_risk_assessments_expires_at ON climate_risk_assessments (expires_at);

-- Ensure one current assessment per property
CREATE UNIQUE INDEX IF NOT EXISTS idx_risk_assessments_current 
ON climate_risk_assessments (property_id) 
WHERE expires_at > NOW();

-- 3. Data Sources Table
CREATE TABLE IF NOT EXISTS data_sources (
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

-- 4. Data Source Responses Table (for audit trail)
CREATE TABLE IF NOT EXISTS data_source_responses (
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
CREATE INDEX IF NOT EXISTS idx_data_responses_property_source ON data_source_responses (property_id, source_id);
CREATE INDEX IF NOT EXISTS idx_data_responses_created_at ON data_source_responses (created_at DESC);

-- GIN index for JSONB queries
CREATE INDEX IF NOT EXISTS idx_data_responses_raw_response ON data_source_responses USING GIN (raw_response);

-- 5. Basic Users Table (for Phase 1)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    email_verified BOOLEAN DEFAULT FALSE,
    
    -- Profile information
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    
    -- Subscription (basic for Phase 1)
    subscription_tier VARCHAR(20) DEFAULT 'free', -- free, premium, professional
    subscription_status VARCHAR(20) DEFAULT 'active',
    
    -- Account status
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_subscription_tier ON users (subscription_tier);

-- Insert initial data sources
INSERT INTO data_sources (source_name, source_type, api_endpoint, rate_limit_per_hour, cost_per_request) VALUES
('FEMA National Risk Index', 'api', 'https://www.fema.gov/api/open/v2', 1000, 0.00),
('NOAA Climate Data Online', 'api', 'https://www.ncdc.noaa.gov/cdo-web/api/v2', 1000, 0.00),
('USGS Earthquake API', 'api', 'https://earthquake.usgs.gov/fdsnws/event/1/', 1000, 0.00),
('MapBox Geocoding', 'api', 'https://api.mapbox.com/geocoding/v5/mapbox.places', 50000, 0.006),
('First Street Foundation', 'api', 'https://api.firststreet.org/risk/v1', 10000, 0.003),
('ClimateCheck', 'api', 'https://api.climatecheck.com/v1', 5000, 0.002)
ON CONFLICT (source_name) DO NOTHING;

-- Insert test properties for development
INSERT INTO properties (address, normalized_address, street_number, street_name, city, state, zip_code, latitude, longitude, location, geocoding_accuracy, geocoding_source) VALUES 
('1600 Pennsylvania Avenue NW, Washington, DC 20500', '1600 Pennsylvania Avenue NW Washington DC 20500', '1600', 'Pennsylvania Avenue NW', 'Washington', 'DC', '20500', 38.8977, -77.0365, ST_SetSRID(ST_MakePoint(-77.0365, 38.8977), 4326), 'rooftop', 'manual'),
('One World Trade Center, New York, NY 10007', 'One World Trade Center New York NY 10007', '1', 'World Trade Center', 'New York', 'NY', '10007', 40.7127, -74.0134, ST_SetSRID(ST_MakePoint(-74.0134, 40.7127), 4326), 'rooftop', 'manual'),
('123 Main Street, Paradise, CA 95969', '123 Main Street Paradise CA 95969', '123', 'Main Street', 'Paradise', 'CA', '95969', 39.7596, -121.6219, ST_SetSRID(ST_MakePoint(-121.6219, 39.7596), 4326), 'street', 'manual'),
('456 Ocean Drive, Miami Beach, FL 33139', '456 Ocean Drive Miami Beach FL 33139', '456', 'Ocean Drive', 'Miami Beach', 'FL', '33139', 25.7617, -80.1918, ST_SetSRID(ST_MakePoint(-80.1918, 25.7617), 4326), 'street', 'manual')
ON CONFLICT DO NOTHING;

-- Insert sample risk assessments
INSERT INTO climate_risk_assessments (
    property_id, 
    overall_risk_score, 
    risk_category,
    flood_risk_score, 
    wildfire_risk_score, 
    hurricane_risk_score,
    earthquake_risk_score,
    heat_risk_score,
    fema_flood_zone,
    confidence_score,
    data_completeness
) 
SELECT 
    p.id,
    CASE 
        WHEN p.city = 'Paradise' THEN 85  -- High wildfire risk
        WHEN p.city = 'Miami Beach' THEN 75  -- High hurricane/flood risk
        WHEN p.city = 'Washington' THEN 45  -- Moderate risk
        ELSE 55
    END as overall_risk_score,
    CASE 
        WHEN p.city = 'Paradise' THEN 'high'
        WHEN p.city = 'Miami Beach' THEN 'high'
        WHEN p.city = 'Washington' THEN 'moderate'
        ELSE 'moderate'
    END as risk_category,
    CASE 
        WHEN p.city = 'Miami Beach' THEN 80
        WHEN p.city = 'Washington' THEN 30
        ELSE 25
    END as flood_risk_score,
    CASE 
        WHEN p.city = 'Paradise' THEN 90
        ELSE 15
    END as wildfire_risk_score,
    CASE 
        WHEN p.city = 'Miami Beach' THEN 85
        ELSE 20
    END as hurricane_risk_score,
    CASE 
        WHEN p.state = 'CA' THEN 65
        ELSE 15
    END as earthquake_risk_score,
    CASE 
        WHEN p.state IN ('FL', 'CA') THEN 70
        ELSE 45
    END as heat_risk_score,
    CASE 
        WHEN p.city = 'Miami Beach' THEN 'AE'
        WHEN p.city = 'Washington' THEN 'X'
        ELSE 'X'
    END as fema_flood_zone,
    0.85 as confidence_score,
    0.75 as data_completeness
FROM properties p
WHERE NOT EXISTS (
    SELECT 1 FROM climate_risk_assessments cra 
    WHERE cra.property_id = p.id AND cra.expires_at > NOW()
);

-- Grant permissions to application user
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO seawater_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO seawater_app;

-- Grant permissions on future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO seawater_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO seawater_app;

-- Materialized view for common queries (Phase 1 simple version)
CREATE MATERIALIZED VIEW IF NOT EXISTS property_risk_summary AS
SELECT 
    p.id as property_id,
    p.normalized_address,
    p.city,
    p.state,
    p.zip_code,
    p.location,
    cra.overall_risk_score,
    cra.risk_category,
    cra.flood_risk_score,
    cra.wildfire_risk_score,
    cra.hurricane_risk_score,
    cra.earthquake_risk_score,
    cra.assessment_date,
    cra.expires_at
FROM properties p
LEFT JOIN climate_risk_assessments cra ON p.id = cra.property_id 
WHERE cra.expires_at > NOW() OR cra.expires_at IS NULL;

-- Index on materialized view
CREATE INDEX IF NOT EXISTS idx_property_risk_summary_location ON property_risk_summary USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_property_risk_summary_overall_score ON property_risk_summary (overall_risk_score);

-- Refresh materialized view
REFRESH MATERIALIZED VIEW property_risk_summary;

-- Create a function to refresh the materialized view
CREATE OR REPLACE FUNCTION refresh_property_risk_summary()
RETURNS VOID AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY property_risk_summary;
END;
$$ LANGUAGE plpgsql;

-- Verify setup
SELECT 
    'PostGIS Version' as component, 
    PostGIS_version() as version
UNION ALL
SELECT 
    'Properties Count' as component, 
    COUNT(*)::text as version 
FROM properties
UNION ALL
SELECT 
    'Risk Assessments Count' as component, 
    COUNT(*)::text as version 
FROM climate_risk_assessments
UNION ALL
SELECT 
    'Data Sources Count' as component, 
    COUNT(*)::text as version 
FROM data_sources;

-- Success message
SELECT 'Seawater Phase 1 database initialization completed successfully!' as status;