-- PostgreSQL + PostGIS Database Initialization for Seawater Platform
-- This script sets up the database schema, PostGIS extensions, and initial data

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;
CREATE EXTENSION IF NOT EXISTS fuzzystrmatch;
CREATE EXTENSION IF NOT EXISTS postgis_tiger_geocoder;
CREATE EXTENSION IF NOT EXISTS uuid-ossp;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Create application schema
CREATE SCHEMA IF NOT EXISTS seawater;
SET search_path TO seawater, public;

-- ==================== GEOGRAPHIC REFERENCE TABLES ====================

-- US States reference table
CREATE TABLE IF NOT EXISTS states (
    id SERIAL PRIMARY KEY,
    state_code VARCHAR(2) NOT NULL UNIQUE,
    state_name VARCHAR(50) NOT NULL,
    state_abbrev VARCHAR(2) NOT NULL,
    fips_code VARCHAR(2) NOT NULL,
    geom GEOMETRY(MULTIPOLYGON, 4326),
    area_sq_km DECIMAL(12, 2),
    population INTEGER,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- US Counties reference table
CREATE TABLE IF NOT EXISTS counties (
    id SERIAL PRIMARY KEY,
    state_id INTEGER REFERENCES states(id),
    state_code VARCHAR(2) NOT NULL,
    county_code VARCHAR(3) NOT NULL,
    county_name VARCHAR(100) NOT NULL,
    fips_code VARCHAR(5) NOT NULL, -- state + county FIPS
    geom GEOMETRY(MULTIPOLYGON, 4326),
    area_sq_km DECIMAL(10, 2),
    population INTEGER,
    county_seat VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(state_code, county_code),
    UNIQUE(fips_code)
);

-- Census Tracts table
CREATE TABLE IF NOT EXISTS census_tracts (
    id SERIAL PRIMARY KEY,
    state_id INTEGER REFERENCES states(id),
    county_id INTEGER REFERENCES counties(id),
    state_code VARCHAR(2) NOT NULL,
    county_code VARCHAR(3) NOT NULL,
    tract_code VARCHAR(6) NOT NULL,
    geoid VARCHAR(11) NOT NULL, -- state + county + tract
    tract_name VARCHAR(100),
    geom GEOMETRY(MULTIPOLYGON, 4326),
    area_sq_km DECIMAL(8, 2),
    population INTEGER,
    housing_units INTEGER,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(geoid)
);

-- Zip Code Tabulation Areas (ZCTA)
CREATE TABLE IF NOT EXISTS zip_codes (
    id SERIAL PRIMARY KEY,
    zip_code VARCHAR(5) NOT NULL UNIQUE,
    zip_plus_four VARCHAR(10),
    city VARCHAR(100),
    state_code VARCHAR(2),
    county_code VARCHAR(3),
    geom GEOMETRY(MULTIPOLYGON, 4326),
    area_sq_km DECIMAL(8, 2),
    population INTEGER,
    created_at TIMESTAMP DEFAULT NOW(),
    INDEX(zip_code, state_code)
);

-- ==================== CLIMATE RISK DATA TABLES ====================

-- Main risk scores cache table
CREATE TABLE IF NOT EXISTS risk_scores (
    id SERIAL PRIMARY KEY,
    address_hash VARCHAR(64) NOT NULL UNIQUE, -- SHA-256 of normalized address
    original_address TEXT NOT NULL,
    normalized_address TEXT,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    
    -- Geographic references
    state_id INTEGER REFERENCES states(id),
    county_id INTEGER REFERENCES counties(id),
    census_tract_id INTEGER REFERENCES census_tracts(id),
    zip_code_id INTEGER REFERENCES zip_codes(id),
    
    -- FEMA National Risk Index scores (0-100 scale)
    fema_overall_risk INTEGER CHECK (fema_overall_risk >= 0 AND fema_overall_risk <= 100),
    fema_flood_score INTEGER CHECK (fema_flood_score >= 0 AND fema_flood_score <= 100),
    fema_wildfire_score INTEGER CHECK (fema_wildfire_score >= 0 AND fema_wildfire_score <= 100),
    fema_heat_score INTEGER CHECK (fema_heat_score >= 0 AND fema_heat_score <= 100),
    fema_tornado_score INTEGER CHECK (fema_tornado_score >= 0 AND fema_tornado_score <= 100),
    fema_hurricane_score INTEGER CHECK (fema_hurricane_score >= 0 AND fema_hurricane_score <= 100),
    fema_hail_score INTEGER CHECK (fema_hail_score >= 0 AND fema_hail_score <= 100),
    fema_drought_score INTEGER CHECK (fema_drought_score >= 0 AND fema_drought_score <= 100),
    fema_earthquake_score INTEGER CHECK (fema_earthquake_score >= 0 AND fema_earthquake_score <= 100),
    fema_social_vulnerability DECIMAL(4, 2) CHECK (fema_social_vulnerability >= 0 AND fema_social_vulnerability <= 1),
    fema_community_resilience DECIMAL(4, 2) CHECK (fema_community_resilience >= 0 AND fema_community_resilience <= 1),
    
    -- FEMA Flood Zone Information
    fema_flood_zone VARCHAR(10), -- AE, X, VE, etc.
    fema_flood_zone_description TEXT,
    fema_requires_flood_insurance BOOLEAN DEFAULT FALSE,
    fema_base_flood_elevation DECIMAL(8, 2), -- in feet above sea level
    
    -- First Street Foundation scores (premium data)
    fs_flood_score INTEGER CHECK (fs_flood_score >= 0 AND fs_flood_score <= 100),
    fs_wildfire_score INTEGER CHECK (fs_wildfire_score >= 0 AND fs_wildfire_score <= 100),
    fs_heat_score INTEGER CHECK (fs_heat_score >= 0 AND fs_heat_score <= 100),
    fs_flood_30yr INTEGER CHECK (fs_flood_30yr >= 0 AND fs_flood_30yr <= 100),
    fs_wildfire_30yr INTEGER CHECK (fs_wildfire_30yr >= 0 AND fs_wildfire_30yr <= 100),
    fs_heat_30yr INTEGER CHECK (fs_heat_30yr >= 0 AND fs_heat_30yr <= 100),
    fs_property_specific BOOLEAN DEFAULT FALSE,
    fs_model_version VARCHAR(20),
    
    -- ClimateCheck scores (premium data)
    cc_precipitation_risk INTEGER CHECK (cc_precipitation_risk >= 0 AND cc_precipitation_risk <= 100),
    cc_drought_risk INTEGER CHECK (cc_drought_risk >= 0 AND cc_drought_risk <= 100),
    cc_extreme_heat_risk INTEGER CHECK (cc_extreme_heat_risk >= 0 AND cc_extreme_heat_risk <= 100),
    cc_wildfire_risk INTEGER CHECK (cc_wildfire_risk >= 0 AND cc_wildfire_risk <= 100),
    cc_flood_risk INTEGER CHECK (cc_flood_risk >= 0 AND cc_flood_risk <= 100),
    cc_methodology_version VARCHAR(20),
    
    -- Data source tracking
    data_sources TEXT[], -- array of source names ['fema', 'firststreet', 'climatecheck']
    last_updated TIMESTAMP DEFAULT NOW(),
    cache_expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '24 hours'),
    data_quality_score DECIMAL(3, 2) DEFAULT 1.0 CHECK (data_quality_score >= 0 AND data_quality_score <= 1),
    
    -- Confidence and reliability metrics
    geocoding_confidence DECIMAL(3, 2) DEFAULT 1.0 CHECK (geocoding_confidence >= 0 AND geocoding_confidence <= 1),
    risk_calculation_confidence DECIMAL(3, 2) DEFAULT 1.0,
    
    created_at TIMESTAMP DEFAULT NOW(),
    
    -- Spatial indexing
    geom GEOMETRY(POINT, 4326) GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)) STORED
);

-- Building codes and regulations table
CREATE TABLE IF NOT EXISTS building_codes (
    id SERIAL PRIMARY KEY,
    jurisdiction_name VARCHAR(100) NOT NULL,
    jurisdiction_type VARCHAR(20) NOT NULL, -- 'state', 'county', 'municipality'
    state_code VARCHAR(2) NOT NULL,
    county_code VARCHAR(3),
    municipality_name VARCHAR(100),
    
    -- Building code adoption status
    current_building_code VARCHAR(50), -- IBC 2021, etc.
    current_wind_code VARCHAR(50), -- ASCE 7-16, etc.
    current_seismic_code VARCHAR(50),
    current_flood_code VARCHAR(50), -- ASCE 24-14, etc.
    adoption_date DATE,
    effective_date DATE,
    enforcement_level VARCHAR(20) CHECK (enforcement_level IN ('full', 'partial', 'minimal', 'voluntary')),
    
    -- FEMA Building Code Assessment Tool (BCAT) data
    bcat_score INTEGER CHECK (bcat_score >= 0 AND bcat_score <= 100),
    bcat_last_updated DATE,
    bcat_assessment_year INTEGER,
    
    -- Wind resistance standards
    wind_speed_design INTEGER, -- mph
    wind_zone VARCHAR(10),
    hurricane_resistant_standards BOOLEAN DEFAULT FALSE,
    
    -- Seismic standards
    seismic_design_category VARCHAR(2), -- A, B, C, D, E, F
    seismic_zone VARCHAR(10),
    
    -- Flood construction standards
    flood_resistant_construction BOOLEAN DEFAULT FALSE,
    freeboard_requirement DECIMAL(4, 2), -- feet above base flood elevation
    
    -- Geographic coverage
    geom GEOMETRY(MULTIPOLYGON, 4326),
    coverage_area_sq_km DECIMAL(10, 2),
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ==================== USER AND SEARCH TRACKING ====================

-- User search history and analytics
CREATE TABLE IF NOT EXISTS user_searches (
    id SERIAL PRIMARY KEY,
    user_id UUID DEFAULT uuid_generate_v4(),
    session_id VARCHAR(100) NOT NULL,
    search_address TEXT NOT NULL,
    normalized_address TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    
    -- Search results
    risk_scores_id INTEGER REFERENCES risk_scores(id),
    search_successful BOOLEAN DEFAULT TRUE,
    error_message TEXT,
    
    -- Premium feature usage
    premium_features_used BOOLEAN DEFAULT FALSE,
    premium_features_list TEXT[], -- array of premium features accessed
    user_tier VARCHAR(20) DEFAULT 'free', -- 'free', 'premium', 'professional', 'enterprise'
    
    -- Search metadata
    search_timestamp TIMESTAMP DEFAULT NOW(),
    response_time_ms INTEGER,
    data_sources_used TEXT[],
    cache_hit BOOLEAN DEFAULT FALSE,
    
    -- Request context
    user_agent TEXT,
    ip_address INET,
    referer_url TEXT,
    api_key_used VARCHAR(50),
    
    -- Geographic context
    search_region VARCHAR(2), -- state code
    search_country VARCHAR(2) DEFAULT 'US',
    
    geom GEOMETRY(POINT, 4326) GENERATED ALWAYS AS (
        CASE 
            WHEN latitude IS NOT NULL AND longitude IS NOT NULL 
            THEN ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
            ELSE NULL
        END
    ) STORED
);

-- API usage tracking for premium features
CREATE TABLE IF NOT EXISTS api_usage (
    id SERIAL PRIMARY KEY,
    user_id UUID,
    api_key VARCHAR(100),
    endpoint VARCHAR(100) NOT NULL,
    method VARCHAR(10) NOT NULL,
    request_timestamp TIMESTAMP DEFAULT NOW(),
    response_status INTEGER,
    response_time_ms INTEGER,
    request_size_bytes INTEGER,
    response_size_bytes INTEGER,
    
    -- Cost tracking
    billable_units INTEGER DEFAULT 1,
    cost_per_unit DECIMAL(8, 4),
    total_cost DECIMAL(10, 4),
    
    -- Rate limiting
    requests_per_minute INTEGER,
    daily_quota_used INTEGER,
    monthly_quota_used INTEGER,
    
    -- Geographic context
    source_ip INET,
    source_country VARCHAR(2),
    
    created_at TIMESTAMP DEFAULT NOW()
);

-- ==================== PROFESSIONAL DIRECTORY ====================

-- Climate-aware professionals directory
CREATE TABLE IF NOT EXISTS climate_professionals (
    id SERIAL PRIMARY KEY,
    professional_type VARCHAR(50) NOT NULL CHECK (professional_type IN ('agent', 'inspector', 'insurance', 'contractor', 'consultant')),
    name VARCHAR(100) NOT NULL,
    company VARCHAR(100),
    email VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    website VARCHAR(200),
    license_number VARCHAR(50),
    license_state VARCHAR(2),
    
    -- Climate expertise
    climate_certifications TEXT[], -- array of certifications
    specialization_areas TEXT[], -- ['flood', 'wildfire', 'hurricane', 'earthquake', 'heat']
    years_experience INTEGER,
    expertise_level VARCHAR(20) CHECK (expertise_level IN ('beginner', 'intermediate', 'expert', 'specialist')),
    
    -- Service areas (geographic coverage)
    service_areas GEOMETRY(MULTIPOLYGON, 4326),
    service_radius_km INTEGER DEFAULT 50,
    primary_state VARCHAR(2),
    service_states TEXT[], -- array of state codes
    
    -- Contact and availability
    contact_preference VARCHAR(20) DEFAULT 'email', -- 'email', 'phone', 'website'
    available_for_consultation BOOLEAN DEFAULT TRUE,
    accepts_new_clients BOOLEAN DEFAULT TRUE,
    consultation_fee DECIMAL(8, 2),
    consultation_fee_type VARCHAR(20), -- 'per_hour', 'flat_rate', 'free'
    
    -- Rating and reviews
    average_rating DECIMAL(3, 2) DEFAULT 0.0 CHECK (average_rating >= 0 AND average_rating <= 5),
    total_reviews INTEGER DEFAULT 0,
    total_consultations INTEGER DEFAULT 0,
    response_time_hours INTEGER DEFAULT 24,
    
    -- Verification status
    verified BOOLEAN DEFAULT FALSE,
    verification_method VARCHAR(50),
    verification_date DATE,
    background_check_status VARCHAR(20), -- 'pending', 'approved', 'failed', 'expired'
    
    -- Professional details
    bio TEXT,
    languages_spoken TEXT[] DEFAULT ARRAY['English'],
    insurance_coverage BOOLEAN DEFAULT FALSE,
    bonded BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_active TIMESTAMP DEFAULT NOW(),
    profile_views INTEGER DEFAULT 0,
    
    -- Business hours
    business_hours JSONB, -- JSON object with days/hours
    timezone VARCHAR(50) DEFAULT 'America/New_York'
);

-- Professional reviews and ratings
CREATE TABLE IF NOT EXISTS professional_reviews (
    id SERIAL PRIMARY KEY,
    professional_id INTEGER REFERENCES climate_professionals(id) ON DELETE CASCADE,
    reviewer_user_id UUID,
    reviewer_name VARCHAR(100),
    reviewer_email VARCHAR(100),
    
    -- Review content
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review_title VARCHAR(200),
    review_text TEXT,
    consultation_type VARCHAR(50), -- 'flood_assessment', 'wildfire_risk', etc.
    
    -- Review verification
    verified_consultation BOOLEAN DEFAULT FALSE,
    helpful_votes INTEGER DEFAULT 0,
    total_votes INTEGER DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    is_public BOOLEAN DEFAULT TRUE,
    flagged BOOLEAN DEFAULT FALSE,
    flag_reason VARCHAR(100)
);

-- ==================== SPATIAL INDEXES ====================

-- Primary spatial indexes for performance
CREATE INDEX IF NOT EXISTS idx_states_geom ON states USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_counties_geom ON counties USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_census_tracts_geom ON census_tracts USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_zip_codes_geom ON zip_codes USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_risk_scores_geom ON risk_scores USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_building_codes_geom ON building_codes USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_user_searches_geom ON user_searches USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_climate_professionals_service_areas ON climate_professionals USING GIST (service_areas);

-- Performance indexes for common queries
CREATE INDEX IF NOT EXISTS idx_risk_scores_address_hash ON risk_scores (address_hash);
CREATE INDEX IF NOT EXISTS idx_risk_scores_coordinates ON risk_scores (latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_risk_scores_expires ON risk_scores (cache_expires_at);
CREATE INDEX IF NOT EXISTS idx_risk_scores_last_updated ON risk_scores (last_updated);
CREATE INDEX IF NOT EXISTS idx_risk_scores_fips ON risk_scores (county_id, census_tract_id);

CREATE INDEX IF NOT EXISTS idx_user_searches_timestamp ON user_searches (search_timestamp);
CREATE INDEX IF NOT EXISTS idx_user_searches_session ON user_searches (session_id);
CREATE INDEX IF NOT EXISTS idx_user_searches_user_id ON user_searches (user_id);
CREATE INDEX IF NOT EXISTS idx_user_searches_premium ON user_searches (premium_features_used, user_tier);

CREATE INDEX IF NOT EXISTS idx_counties_fips ON counties (fips_code);
CREATE INDEX IF NOT EXISTS idx_counties_state ON counties (state_code, county_code);
CREATE INDEX IF NOT EXISTS idx_census_tracts_geoid ON census_tracts (geoid);

CREATE INDEX IF NOT EXISTS idx_api_usage_timestamp ON api_usage (request_timestamp);
CREATE INDEX IF NOT EXISTS idx_api_usage_user ON api_usage (user_id, request_timestamp);
CREATE INDEX IF NOT EXISTS idx_api_usage_endpoint ON api_usage (endpoint, request_timestamp);

CREATE INDEX IF NOT EXISTS idx_professionals_type_location ON climate_professionals (professional_type, primary_state);
CREATE INDEX IF NOT EXISTS idx_professionals_specialization ON climate_professionals USING GIN (specialization_areas);
CREATE INDEX IF NOT EXISTS idx_professionals_rating ON climate_professionals (average_rating DESC, total_reviews DESC);

-- Text search indexes
CREATE INDEX IF NOT EXISTS idx_risk_scores_address_search ON risk_scores USING GIN (to_tsvector('english', normalized_address));
CREATE INDEX IF NOT EXISTS idx_professionals_name_search ON climate_professionals USING GIN (to_tsvector('english', name || ' ' || COALESCE(company, '')));

-- ==================== FUNCTIONS AND TRIGGERS ====================

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at columns
CREATE TRIGGER update_states_updated_at BEFORE UPDATE ON states FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_counties_updated_at BEFORE UPDATE ON counties FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_census_tracts_updated_at BEFORE UPDATE ON census_tracts UPDATED_at BEFORE UPDATE ON census_tracts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_building_codes_updated_at BEFORE UPDATE ON building_codes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_climate_professionals_updated_at BEFORE UPDATE ON climate_professionals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_professional_reviews_updated_at BEFORE UPDATE ON professional_reviews FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate overall risk score
CREATE OR REPLACE FUNCTION calculate_overall_risk_score(
    p_fema_flood INTEGER DEFAULT NULL,
    p_fema_wildfire INTEGER DEFAULT NULL,
    p_fema_heat INTEGER DEFAULT NULL,
    p_fema_tornado INTEGER DEFAULT NULL,
    p_fema_hurricane INTEGER DEFAULT NULL
) RETURNS INTEGER AS $$
DECLARE
    total_score INTEGER := 0;
    count_scores INTEGER := 0;
BEGIN
    -- Weight different risk types (can be adjusted based on location)
    IF p_fema_flood IS NOT NULL THEN
        total_score := total_score + (p_fema_flood * 0.3); -- 30% weight for flood
        count_scores := count_scores + 1;
    END IF;
    
    IF p_fema_wildfire IS NOT NULL THEN
        total_score := total_score + (p_fema_wildfire * 0.25); -- 25% weight for wildfire
        count_scores := count_scores + 1;
    END IF;
    
    IF p_fema_heat IS NOT NULL THEN
        total_score := total_score + (p_fema_heat * 0.2); -- 20% weight for heat
        count_scores := count_scores + 1;
    END IF;
    
    IF p_fema_tornado IS NOT NULL THEN
        total_score := total_score + (p_fema_tornado * 0.15); -- 15% weight for tornado
        count_scores := count_scores + 1;
    END IF;
    
    IF p_fema_hurricane IS NOT NULL THEN
        total_score := total_score + (p_fema_hurricane * 0.1); -- 10% weight for hurricane
        count_scores := count_scores + 1;
    END IF;
    
    -- Return average if we have scores, otherwise NULL
    IF count_scores > 0 THEN
        RETURN ROUND(total_score);
    ELSE
        RETURN NULL;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to get nearby risk scores
CREATE OR REPLACE FUNCTION get_nearby_risk_scores(
    search_lat DECIMAL,
    search_lng DECIMAL,
    radius_km INTEGER DEFAULT 5,
    limit_count INTEGER DEFAULT 50
) RETURNS TABLE (
    id INTEGER,
    address TEXT,
    latitude DECIMAL,
    longitude DECIMAL,
    overall_risk INTEGER,
    distance_km DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        rs.id,
        rs.normalized_address,
        rs.latitude,
        rs.longitude,
        calculate_overall_risk_score(rs.fema_flood_score, rs.fema_wildfire_score, rs.fema_heat_score, rs.fema_tornado_score, rs.fema_hurricane_score),
        ROUND(
            ST_Distance(
                ST_GeogFromText('POINT(' || search_lng || ' ' || search_lat || ')'),
                ST_GeogFromText('POINT(' || rs.longitude || ' ' || rs.latitude || ')')
            ) / 1000.0, 2
        ) as distance_km
    FROM risk_scores rs
    WHERE ST_DWithin(
        ST_GeogFromText('POINT(' || search_lng || ' ' || search_lat || ')'),
        rs.geom::geography,
        radius_km * 1000
    )
    AND rs.cache_expires_at > NOW()
    ORDER BY rs.geom <-> ST_SetSRID(ST_MakePoint(search_lng, search_lat), 4326)
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- ==================== SAMPLE DATA ====================

-- Insert sample US states (abbreviated list for development)
INSERT INTO states (state_code, state_name, state_abbrev, fips_code) VALUES
('FL', 'Florida', 'FL', '12'),
('CA', 'California', 'CA', '06'),
('TX', 'Texas', 'TX', '48'),
('NY', 'New York', 'NY', '36'),
('WA', 'Washington', 'WA', '53')
ON CONFLICT (state_code) DO NOTHING;

-- Create application user and grant permissions
CREATE ROLE seawater_app WITH LOGIN PASSWORD 'changeme_in_production';
GRANT USAGE ON SCHEMA seawater TO seawater_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA seawater TO seawater_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA seawater TO seawater_app;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA seawater TO seawater_app;

-- Grant future permissions
ALTER DEFAULT PRIVILEGES IN SCHEMA seawater GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO seawater_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA seawater GRANT USAGE, SELECT ON SEQUENCES TO seawater_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA seawater GRANT EXECUTE ON FUNCTIONS TO seawater_app;

-- Analyze tables for query planning
ANALYZE;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Seawater PostgreSQL + PostGIS database initialization completed successfully!';
    RAISE NOTICE 'Database schema: seawater';
    RAISE NOTICE 'Application user: seawater_app';
    RAISE NOTICE 'PostGIS version: %', postgis_version();
END $$;