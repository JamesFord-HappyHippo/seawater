-- =====================================================
-- Seawater.io Climate Risk Platform Database Schema
-- PostgreSQL 15+ with PostGIS Extension
-- =====================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm; -- for fuzzy text search
CREATE EXTENSION IF NOT EXISTS btree_gist; -- for advanced indexing

-- =====================================================
-- 1. CORE GEOGRAPHIC REFERENCE DATA
-- =====================================================

-- US States and territories
CREATE TABLE states (
    id SERIAL PRIMARY KEY,
    state_code VARCHAR(2) NOT NULL UNIQUE,
    state_name VARCHAR(50) NOT NULL,
    state_fips VARCHAR(2) NOT NULL UNIQUE,
    geom GEOMETRY(MULTIPOLYGON, 4326),
    population INTEGER,
    area_sq_km DECIMAL(10, 2),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- US Counties 
CREATE TABLE counties (
    id SERIAL PRIMARY KEY,
    state_id INTEGER NOT NULL REFERENCES states(id),
    county_code VARCHAR(3) NOT NULL,
    county_name VARCHAR(100) NOT NULL,
    county_fips VARCHAR(5) NOT NULL UNIQUE, -- state_fips + county_code
    geom GEOMETRY(MULTIPOLYGON, 4326),
    population INTEGER,
    area_sq_km DECIMAL(10, 2),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(state_id, county_code)
);

-- Census tracts for detailed geographic analysis
CREATE TABLE census_tracts (
    id SERIAL PRIMARY KEY,
    county_id INTEGER NOT NULL REFERENCES counties(id),
    tract_code VARCHAR(6) NOT NULL,
    geoid VARCHAR(11) NOT NULL UNIQUE, -- full FIPS code
    tract_name VARCHAR(100),
    geom GEOMETRY(MULTIPOLYGON, 4326),
    population INTEGER,
    median_income INTEGER,
    housing_units INTEGER,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ZIP codes for address normalization
CREATE TABLE zip_codes (
    id SERIAL PRIMARY KEY,
    zip_code VARCHAR(5) NOT NULL,
    zip4_code VARCHAR(4),
    city VARCHAR(100) NOT NULL,
    state_id INTEGER NOT NULL REFERENCES states(id),
    county_id INTEGER REFERENCES counties(id),
    geom GEOMETRY(MULTIPOLYGON, 4326),
    centroid GEOMETRY(POINT, 4326),
    population INTEGER,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(zip_code, city, state_id)
);

-- =====================================================
-- 2. PROPERTY AND ADDRESS MANAGEMENT
-- =====================================================

-- Normalized property records
CREATE TABLE properties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Address normalization
    raw_address TEXT NOT NULL,
    normalized_address TEXT NOT NULL,
    address_hash VARCHAR(64) NOT NULL UNIQUE, -- SHA-256 of normalized address
    
    -- Address components
    house_number VARCHAR(20),
    street_name VARCHAR(100),
    street_type VARCHAR(20), -- St, Ave, Blvd, etc.
    unit_number VARCHAR(20),
    city VARCHAR(100) NOT NULL,
    state_id INTEGER NOT NULL REFERENCES states(id),
    county_id INTEGER REFERENCES counties(id),
    census_tract_id INTEGER REFERENCES census_tracts(id),
    zip_code_id INTEGER REFERENCES zip_codes(id),
    
    -- Precise location
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    location GEOMETRY(POINT, 4326) NOT NULL, -- PostGIS geometry column
    
    -- Geocoding metadata
    geocoding_confidence DECIMAL(4, 3), -- 0.0 to 1.0
    geocoding_source VARCHAR(50), -- 'mapbox', 'google', 'census'
    geocoding_date TIMESTAMP DEFAULT NOW(),
    
    -- Property characteristics (when available)
    property_type VARCHAR(50), -- residential, commercial, industrial
    year_built INTEGER,
    square_feet INTEGER,
    stories INTEGER,
    basement BOOLEAN,
    
    -- Audit fields
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_verified TIMESTAMP,
    verification_source VARCHAR(50)
);

-- Property aliases for handling multiple address formats
CREATE TABLE property_aliases (
    id SERIAL PRIMARY KEY,
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    alias_address TEXT NOT NULL,
    alias_hash VARCHAR(64) NOT NULL,
    source VARCHAR(50), -- 'user_input', 'geocoding_variant', 'usps'
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(alias_hash)
);

-- =====================================================
-- 3. CLIMATE RISK ASSESSMENT DATA
-- =====================================================

-- Master risk assessments table
CREATE TABLE risk_assessments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID NOT NULL REFERENCES properties(id),
    
    -- Assessment metadata
    assessment_date TIMESTAMP DEFAULT NOW(),
    assessment_version VARCHAR(20) DEFAULT '1.0',
    data_sources TEXT[] NOT NULL, -- array of source names
    cache_expires_at TIMESTAMP NOT NULL,
    confidence_level DECIMAL(4, 3), -- overall confidence 0.0 to 1.0
    
    -- Overall risk scores (0-100 normalized scale)
    overall_risk_score INTEGER CHECK (overall_risk_score >= 0 AND overall_risk_score <= 100),
    flood_risk_score INTEGER CHECK (flood_risk_score >= 0 AND flood_risk_score <= 100),
    wildfire_risk_score INTEGER CHECK (wildfire_risk_score >= 0 AND wildfire_risk_score <= 100),
    heat_risk_score INTEGER CHECK (heat_risk_score >= 0 AND heat_risk_score <= 100),
    tornado_risk_score INTEGER CHECK (tornado_risk_score >= 0 AND tornado_risk_score <= 100),
    hurricane_risk_score INTEGER CHECK (hurricane_risk_score >= 0 AND hurricane_risk_score <= 100),
    earthquake_risk_score INTEGER CHECK (earthquake_risk_score >= 0 AND earthquake_risk_score <= 100),
    drought_risk_score INTEGER CHECK (drought_risk_score >= 0 AND drought_risk_score <= 100),
    
    -- Vulnerability factors
    social_vulnerability_score DECIMAL(4, 2), -- FEMA social vulnerability
    community_resilience_score DECIMAL(4, 2), -- FEMA community resilience
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Source-specific risk data storage
CREATE TABLE risk_data_sources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    risk_assessment_id UUID NOT NULL REFERENCES risk_assessments(id) ON DELETE CASCADE,
    
    -- Data source identification
    source_name VARCHAR(50) NOT NULL, -- 'fema_nri', 'first_street', 'climate_check'
    source_version VARCHAR(20),
    api_endpoint TEXT,
    request_timestamp TIMESTAMP DEFAULT NOW(),
    response_timestamp TIMESTAMP,
    
    -- Raw API response storage
    raw_request JSONB,
    raw_response JSONB NOT NULL,
    
    -- Parsed risk scores from this source
    parsed_scores JSONB NOT NULL,
    
    -- Quality metrics
    data_quality_score DECIMAL(4, 3), -- 0.0 to 1.0
    completeness_percentage INTEGER CHECK (completeness_percentage >= 0 AND completeness_percentage <= 100),
    
    -- API usage tracking
    api_cost_cents INTEGER DEFAULT 0,
    rate_limit_remaining INTEGER,
    
    created_at TIMESTAMP DEFAULT NOW()
);

-- Historical risk trends for time-series analysis
CREATE TABLE risk_trends (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID NOT NULL REFERENCES properties(id),
    
    -- Time period
    trend_year INTEGER NOT NULL CHECK (trend_year >= 1950 AND trend_year <= 2100),
    trend_type VARCHAR(20) NOT NULL, -- 'historical', 'projected'
    scenario VARCHAR(50), -- 'rcp26', 'rcp45', 'rcp85' for projections
    
    -- Risk scores for this year
    flood_score INTEGER CHECK (flood_score >= 0 AND flood_score <= 100),
    wildfire_score INTEGER CHECK (wildfire_score >= 0 AND wildfire_score <= 100),
    heat_score INTEGER CHECK (heat_score >= 0 AND heat_score <= 100),
    tornado_score INTEGER CHECK (tornado_score >= 0 AND tornado_score <= 100),
    hurricane_score INTEGER CHECK (hurricane_score >= 0 AND hurricane_score <= 100),
    
    -- Confidence intervals
    confidence_lower DECIMAL(4, 3),
    confidence_upper DECIMAL(4, 3),
    
    data_source VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(property_id, trend_year, trend_type, scenario, data_source)
);

-- =====================================================
-- 4. FLOOD ZONE AND INSURANCE DATA
-- =====================================================

-- FEMA flood zones
CREATE TABLE flood_zones (
    id SERIAL PRIMARY KEY,
    zone_code VARCHAR(10) NOT NULL, -- A, AE, VE, X, etc.
    zone_description TEXT NOT NULL,
    insurance_required BOOLEAN NOT NULL,
    base_flood_elevation DECIMAL(8, 3), -- feet above sea level
    
    -- Zone boundaries
    geom GEOMETRY(MULTIPOLYGON, 4326),
    effective_date DATE,
    
    -- FEMA identifiers
    panel_number VARCHAR(11),
    community_id VARCHAR(6),
    version_date DATE,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Property flood zone assignments
CREATE TABLE property_flood_zones (
    id SERIAL PRIMARY KEY,
    property_id UUID NOT NULL REFERENCES properties(id),
    flood_zone_id INTEGER NOT NULL REFERENCES flood_zones(id),
    
    -- Assignment details
    assignment_method VARCHAR(50), -- 'spatial_intersection', 'manual', 'api_lookup'
    confidence DECIMAL(4, 3),
    base_flood_elevation DECIMAL(8, 3),
    
    effective_date DATE NOT NULL,
    expiration_date DATE,
    
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(property_id, flood_zone_id, effective_date)
);

-- =====================================================
-- 5. BUILDING CODES AND REGULATIONS
-- =====================================================

-- Building code jurisdictions
CREATE TABLE building_code_jurisdictions (
    id SERIAL PRIMARY KEY,
    jurisdiction_name VARCHAR(100) NOT NULL,
    jurisdiction_type VARCHAR(50) NOT NULL, -- 'state', 'county', 'municipality'
    
    -- Geographic reference
    state_id INTEGER NOT NULL REFERENCES states(id),
    county_id INTEGER REFERENCES counties(id),
    
    -- Jurisdiction boundaries
    geom GEOMETRY(MULTIPOLYGON, 4326),
    
    -- Contact information
    contact_email VARCHAR(100),
    website_url TEXT,
    phone VARCHAR(20),
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Building code adoption tracking
CREATE TABLE building_codes (
    id SERIAL PRIMARY KEY,
    jurisdiction_id INTEGER NOT NULL REFERENCES building_code_jurisdictions(id),
    
    -- Code information
    code_type VARCHAR(50) NOT NULL, -- 'wind', 'seismic', 'flood', 'fire', 'general'
    code_name VARCHAR(100) NOT NULL, -- 'IBC 2021', 'ASCE 7-16', etc.
    code_edition VARCHAR(20),
    
    -- Adoption details
    adoption_date DATE NOT NULL,
    effective_date DATE NOT NULL,
    enforcement_level VARCHAR(20) NOT NULL CHECK (enforcement_level IN ('full', 'partial', 'minimal', 'none')),
    
    -- BCAT scoring (FEMA Building Code Assessment Tool)
    bcat_score INTEGER CHECK (bcat_score >= 0 AND bcat_score <= 100),
    bcat_assessment_date DATE,
    
    -- Compliance requirements
    inspection_required BOOLEAN DEFAULT FALSE,
    permit_required BOOLEAN DEFAULT FALSE,
    special_provisions TEXT,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(jurisdiction_id, code_type, adoption_date)
);

-- =====================================================
-- 6. USER MANAGEMENT AND AUTHENTICATION
-- =====================================================

-- User accounts
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Basic user information
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255), -- for local auth, null for OAuth only
    
    -- Profile information
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(20),
    
    -- User type and status
    user_type VARCHAR(50) DEFAULT 'individual' CHECK (user_type IN ('individual', 'professional', 'enterprise')),
    account_status VARCHAR(20) DEFAULT 'active' CHECK (account_status IN ('active', 'suspended', 'deleted')),
    
    -- Authentication
    email_verified BOOLEAN DEFAULT FALSE,
    email_verification_token VARCHAR(255),
    password_reset_token VARCHAR(255),
    password_reset_expires TIMESTAMP,
    
    -- OAuth integration
    oauth_provider VARCHAR(50), -- 'google', 'facebook', 'apple'
    oauth_id VARCHAR(255),
    
    -- Preferences
    preferences JSONB DEFAULT '{}',
    notification_settings JSONB DEFAULT '{"email": true, "marketing": false}',
    
    -- Audit fields
    last_login TIMESTAMP,
    login_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP
);

-- User sessions for tracking
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Session information
    session_token VARCHAR(255) NOT NULL UNIQUE,
    device_type VARCHAR(50),
    user_agent TEXT,
    ip_address INET,
    
    -- Location information
    country_code VARCHAR(2),
    region VARCHAR(100),
    city VARCHAR(100),
    
    -- Session lifecycle
    created_at TIMESTAMP DEFAULT NOW(),
    last_activity TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP NOT NULL,
    
    -- Security flags
    is_suspicious BOOLEAN DEFAULT FALSE,
    security_flags TEXT[]
);

-- =====================================================
-- 7. SUBSCRIPTION AND BILLING
-- =====================================================

-- Subscription tiers configuration
CREATE TABLE subscription_tiers (
    id SERIAL PRIMARY KEY,
    tier_name VARCHAR(50) NOT NULL UNIQUE,
    tier_display_name VARCHAR(100) NOT NULL,
    
    -- Pricing
    monthly_price_cents INTEGER NOT NULL,
    annual_price_cents INTEGER,
    
    -- Feature limits
    searches_per_month INTEGER,
    properties_per_search INTEGER DEFAULT 1,
    api_calls_per_month INTEGER,
    data_sources TEXT[] DEFAULT ARRAY['fema'], -- available data sources
    
    -- Feature flags
    premium_data BOOLEAN DEFAULT FALSE,
    projections BOOLEAN DEFAULT FALSE,
    bulk_analysis BOOLEAN DEFAULT FALSE,
    api_access BOOLEAN DEFAULT FALSE,
    white_label BOOLEAN DEFAULT FALSE,
    priority_support BOOLEAN DEFAULT FALSE,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- User subscriptions
CREATE TABLE user_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    tier_id INTEGER NOT NULL REFERENCES subscription_tiers(id),
    
    -- Subscription details
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'past_due', 'suspended')),
    
    -- Billing cycle
    billing_cycle VARCHAR(10) NOT NULL CHECK (billing_cycle IN ('monthly', 'annual')),
    current_period_start TIMESTAMP NOT NULL,
    current_period_end TIMESTAMP NOT NULL,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    canceled_at TIMESTAMP,
    
    -- Payment tracking
    stripe_subscription_id VARCHAR(255),
    stripe_customer_id VARCHAR(255),
    
    -- Usage tracking
    searches_used_this_period INTEGER DEFAULT 0,
    api_calls_used_this_period INTEGER DEFAULT 0,
    last_usage_reset TIMESTAMP DEFAULT NOW(),
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Usage tracking for billing and analytics
CREATE TABLE usage_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    session_id UUID REFERENCES user_sessions(id),
    
    -- Usage details
    action_type VARCHAR(50) NOT NULL, -- 'search', 'api_call', 'export'
    resource_type VARCHAR(50), -- 'property_risk', 'professional_search'
    resource_id UUID,
    
    -- Billing information
    billable BOOLEAN DEFAULT TRUE,
    cost_cents INTEGER DEFAULT 0,
    subscription_id UUID REFERENCES user_subscriptions(id),
    
    -- Request details
    request_data JSONB,
    response_size_bytes INTEGER,
    processing_time_ms INTEGER,
    
    -- Geographic context
    user_location GEOMETRY(POINT, 4326),
    search_location GEOMETRY(POINT, 4326),
    
    created_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- 8. PROFESSIONAL DIRECTORY
-- =====================================================

-- Climate and real estate professionals
CREATE TABLE professionals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id), -- link to user account if they have one
    
    -- Basic information
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    company_name VARCHAR(200),
    title VARCHAR(100),
    
    -- Contact information
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    website_url TEXT,
    
    -- Professional details
    professional_type VARCHAR(50) NOT NULL CHECK (professional_type IN ('real_estate_agent', 'home_inspector', 'insurance_agent', 'contractor', 'consultant')),
    license_number VARCHAR(100),
    license_state_id INTEGER REFERENCES states(id),
    license_expiration DATE,
    
    -- Climate expertise
    climate_certifications TEXT[], -- array of certification names
    specialization_areas TEXT[], -- flood, wildfire, hurricane, etc.
    years_experience INTEGER,
    
    -- Service areas (geographic coverage)
    service_areas GEOMETRY(MULTIPOLYGON, 4326),
    service_radius_km INTEGER, -- simplified circular service area
    
    -- Business information
    business_address TEXT,
    business_location GEOMETRY(POINT, 4326),
    business_hours JSONB,
    accepts_new_clients BOOLEAN DEFAULT TRUE,
    
    -- Rating and verification
    average_rating DECIMAL(3, 2) CHECK (average_rating >= 0 AND average_rating <= 5),
    total_reviews INTEGER DEFAULT 0,
    verified BOOLEAN DEFAULT FALSE,
    verification_method VARCHAR(50), -- 'license_check', 'manual_review'
    verified_at TIMESTAMP,
    
    -- Profile visibility
    is_active BOOLEAN DEFAULT TRUE,
    profile_completeness INTEGER DEFAULT 0 CHECK (profile_completeness >= 0 AND profile_completeness <= 100),
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Professional reviews and ratings
CREATE TABLE professional_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    professional_id UUID NOT NULL REFERENCES professionals(id),
    reviewer_user_id UUID REFERENCES users(id),
    
    -- Review content
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title VARCHAR(200),
    review_text TEXT,
    
    -- Review categories
    communication_rating INTEGER CHECK (communication_rating >= 1 AND communication_rating <= 5),
    expertise_rating INTEGER CHECK (expertise_rating >= 1 AND expertise_rating <= 5),
    responsiveness_rating INTEGER CHECK (responsiveness_rating >= 1 AND responsiveness_rating <= 5),
    
    -- Transaction context
    transaction_type VARCHAR(50), -- 'home_purchase', 'inspection', 'insurance_quote'
    transaction_date DATE,
    property_address TEXT,
    
    -- Moderation
    is_verified BOOLEAN DEFAULT FALSE,
    is_featured BOOLEAN DEFAULT FALSE,
    moderation_status VARCHAR(20) DEFAULT 'pending' CHECK (moderation_status IN ('pending', 'approved', 'rejected')),
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- 9. SEARCH AND ANALYTICS TRACKING
-- =====================================================

-- User search history
CREATE TABLE search_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    session_id UUID REFERENCES user_sessions(id),
    
    -- Search details
    search_query TEXT NOT NULL,
    search_type VARCHAR(50) NOT NULL, -- 'address', 'coordinates', 'area'
    
    -- Results
    property_id UUID REFERENCES properties(id),
    risk_assessment_id UUID REFERENCES risk_assessments(id),
    results_count INTEGER DEFAULT 0,
    
    -- Search context
    user_agent TEXT,
    ip_address INET,
    referrer_url TEXT,
    
    -- Geographic context
    user_location GEOMETRY(POINT, 4326),
    search_bbox GEOMETRY(POLYGON, 4326), -- bounding box for area searches
    
    -- Performance metrics
    response_time_ms INTEGER,
    cache_hit BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP DEFAULT NOW()
);

-- Popular searches for optimization
CREATE TABLE popular_searches (
    id SERIAL PRIMARY KEY,
    
    -- Search pattern
    normalized_query TEXT NOT NULL,
    query_type VARCHAR(50) NOT NULL,
    
    -- Frequency tracking
    search_count INTEGER DEFAULT 1,
    unique_user_count INTEGER DEFAULT 1,
    
    -- Geographic clustering
    centroid GEOMETRY(POINT, 4326),
    search_radius_km DECIMAL(8, 2),
    
    -- Time periods
    first_searched TIMESTAMP DEFAULT NOW(),
    last_searched TIMESTAMP DEFAULT NOW(),
    
    -- Analytics
    avg_response_time_ms INTEGER,
    conversion_rate DECIMAL(5, 4), -- searches that led to subscription
    
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(normalized_query, query_type)
);

-- Business intelligence aggregations
CREATE TABLE analytics_daily (
    id SERIAL PRIMARY KEY,
    date_recorded DATE NOT NULL UNIQUE,
    
    -- User metrics
    daily_active_users INTEGER DEFAULT 0,
    new_registrations INTEGER DEFAULT 0,
    subscription_signups INTEGER DEFAULT 0,
    subscription_cancellations INTEGER DEFAULT 0,
    
    -- Usage metrics
    total_searches INTEGER DEFAULT 0,
    unique_properties_searched INTEGER DEFAULT 0,
    api_calls INTEGER DEFAULT 0,
    
    -- Performance metrics
    avg_response_time_ms INTEGER,
    error_rate DECIMAL(5, 4),
    
    -- Revenue metrics
    revenue_cents INTEGER DEFAULT 0,
    api_costs_cents INTEGER DEFAULT 0,
    
    -- Geographic distribution
    top_states JSONB, -- {"CA": 150, "TX": 120, ...}
    top_metros JSONB,
    
    created_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- 10. API AND EXTERNAL INTEGRATION TRACKING
-- =====================================================

-- API key management for external integrations
CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    
    -- Key information
    key_name VARCHAR(100) NOT NULL,
    key_hash VARCHAR(255) NOT NULL UNIQUE, -- hashed version of the actual key
    key_prefix VARCHAR(10) NOT NULL, -- first 8 characters for identification
    
    -- Permissions and limits
    allowed_endpoints TEXT[], -- specific endpoints this key can access
    rate_limit_per_minute INTEGER DEFAULT 100,
    rate_limit_per_day INTEGER DEFAULT 1000,
    
    -- Usage tracking
    total_requests INTEGER DEFAULT 0,
    last_used TIMESTAMP,
    
    -- Key lifecycle
    is_active BOOLEAN DEFAULT TRUE,
    expires_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- API request logging
CREATE TABLE api_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    api_key_id UUID REFERENCES api_keys(id),
    user_id UUID REFERENCES users(id),
    
    -- Request details
    endpoint VARCHAR(200) NOT NULL,
    method VARCHAR(10) NOT NULL,
    request_headers JSONB,
    request_body JSONB,
    
    -- Response details
    response_status INTEGER NOT NULL,
    response_size_bytes INTEGER,
    response_time_ms INTEGER,
    
    -- Rate limiting
    rate_limit_remaining INTEGER,
    rate_limit_reset_at TIMESTAMP,
    
    -- Geographic and network info
    client_ip INET,
    user_agent TEXT,
    
    created_at TIMESTAMP DEFAULT NOW()
);

-- External data source monitoring
CREATE TABLE data_source_status (
    id SERIAL PRIMARY KEY,
    
    -- Source identification
    source_name VARCHAR(50) NOT NULL UNIQUE,
    source_url TEXT NOT NULL,
    api_version VARCHAR(20),
    
    -- Status monitoring
    current_status VARCHAR(20) DEFAULT 'unknown' CHECK (current_status IN ('operational', 'degraded', 'outage', 'maintenance', 'unknown')),
    last_check TIMESTAMP DEFAULT NOW(),
    last_successful_request TIMESTAMP,
    
    -- Performance metrics
    avg_response_time_ms INTEGER,
    success_rate_24h DECIMAL(5, 4),
    
    -- Rate limiting and costs
    rate_limit_per_minute INTEGER,
    rate_limit_per_day INTEGER,
    cost_per_request_cents INTEGER,
    
    -- Monitoring configuration
    check_interval_minutes INTEGER DEFAULT 5,
    alert_on_failure BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE OPTIMIZATION
-- =====================================================

-- Spatial indexes (GIST)
CREATE INDEX idx_states_geom ON states USING GIST (geom);
CREATE INDEX idx_counties_geom ON counties USING GIST (geom);
CREATE INDEX idx_census_tracts_geom ON census_tracts USING GIST (geom);
CREATE INDEX idx_zip_codes_geom ON zip_codes USING GIST (geom);
CREATE INDEX idx_zip_codes_centroid ON zip_codes USING GIST (centroid);
CREATE INDEX idx_properties_location ON properties USING GIST (location);
CREATE INDEX idx_flood_zones_geom ON flood_zones USING GIST (geom);
CREATE INDEX idx_building_code_jurisdictions_geom ON building_code_jurisdictions USING GIST (geom);
CREATE INDEX idx_professionals_service_areas ON professionals USING GIST (service_areas);
CREATE INDEX idx_professionals_business_location ON professionals USING GIST (business_location);
CREATE INDEX idx_search_history_user_location ON search_history USING GIST (user_location);
CREATE INDEX idx_search_history_bbox ON search_history USING GIST (search_bbox);
CREATE INDEX idx_popular_searches_centroid ON popular_searches USING GIST (centroid);

-- Property address optimization
CREATE INDEX idx_properties_address_hash ON properties (address_hash);
CREATE INDEX idx_properties_normalized_address ON properties USING GIN (to_tsvector('english', normalized_address));
CREATE INDEX idx_property_aliases_hash ON property_aliases (alias_hash);

-- Risk assessment optimization
CREATE INDEX idx_risk_assessments_property_id ON risk_assessments (property_id);
CREATE INDEX idx_risk_assessments_expires ON risk_assessments (cache_expires_at);
CREATE INDEX idx_risk_assessments_date ON risk_assessments (assessment_date);
CREATE INDEX idx_risk_data_sources_assessment_id ON risk_data_sources (risk_assessment_id);
CREATE INDEX idx_risk_data_sources_source_name ON risk_data_sources (source_name);
CREATE INDEX idx_risk_trends_property_year ON risk_trends (property_id, trend_year);

-- User and session optimization
CREATE INDEX idx_users_email ON users (email);
CREATE INDEX idx_users_type_status ON users (user_type, account_status);
CREATE INDEX idx_user_sessions_token ON user_sessions (session_token);
CREATE INDEX idx_user_sessions_expires ON user_sessions (expires_at);
CREATE INDEX idx_user_sessions_user_id ON user_sessions (user_id);

-- Subscription and billing optimization
CREATE INDEX idx_user_subscriptions_user_id ON user_subscriptions (user_id);
CREATE INDEX idx_user_subscriptions_status ON user_subscriptions (status);
CREATE INDEX idx_user_subscriptions_period_end ON user_subscriptions (current_period_end);
CREATE INDEX idx_usage_logs_user_date ON usage_logs (user_id, created_at);
CREATE INDEX idx_usage_logs_subscription_id ON usage_logs (subscription_id);

-- Professional directory optimization
CREATE INDEX idx_professionals_type ON professionals (professional_type);
CREATE INDEX idx_professionals_active_verified ON professionals (is_active, verified);
CREATE INDEX idx_professionals_rating ON professionals (average_rating DESC);
CREATE INDEX idx_professional_reviews_professional_id ON professional_reviews (professional_id);

-- Search and analytics optimization
CREATE INDEX idx_search_history_user_id_date ON search_history (user_id, created_at);
CREATE INDEX idx_search_history_property_id ON search_history (property_id);
CREATE INDEX idx_popular_searches_count ON popular_searches (search_count DESC);
CREATE INDEX idx_analytics_daily_date ON analytics_daily (date_recorded);

-- API and integration optimization
CREATE INDEX idx_api_keys_user_id ON api_keys (user_id);
CREATE INDEX idx_api_keys_hash ON api_keys (key_hash);
CREATE INDEX idx_api_requests_key_date ON api_requests (api_key_id, created_at);
CREATE INDEX idx_api_requests_endpoint ON api_requests (endpoint);

-- Composite indexes for common query patterns
CREATE INDEX idx_properties_state_city ON properties (state_id, city);
CREATE INDEX idx_properties_county_updated ON properties (county_id, updated_at);
CREATE INDEX idx_risk_assessments_scores ON risk_assessments (overall_risk_score, flood_risk_score, wildfire_risk_score);
CREATE INDEX idx_flood_zones_code_effective ON flood_zones (zone_code, effective_date);
CREATE INDEX idx_building_codes_jurisdiction_type ON building_codes (jurisdiction_id, code_type);

-- Text search optimization
CREATE INDEX idx_properties_city_trgm ON properties USING GIN (city gin_trgm_ops);
CREATE INDEX idx_professionals_name_trgm ON professionals USING GIN ((first_name || ' ' || last_name) gin_trgm_ops);
CREATE INDEX idx_professionals_company_trgm ON professionals USING GIN (company_name gin_trgm_ops);

-- =====================================================
-- FUNCTIONS AND TRIGGERS
-- =====================================================

-- Function to update geometry column when lat/lng changes
CREATE OR REPLACE FUNCTION update_property_geometry()
RETURNS TRIGGER AS $$
BEGIN
    NEW.location = ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for automatic geometry updates
CREATE TRIGGER trigger_update_property_geometry
    BEFORE INSERT OR UPDATE OF latitude, longitude ON properties
    FOR EACH ROW EXECUTE FUNCTION update_property_geometry();

-- Function to calculate address hash
CREATE OR REPLACE FUNCTION calculate_address_hash()
RETURNS TRIGGER AS $$
BEGIN
    NEW.address_hash = encode(digest(UPPER(TRIM(NEW.normalized_address)), 'sha256'), 'hex');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for automatic address hash calculation
CREATE TRIGGER trigger_calculate_address_hash
    BEFORE INSERT OR UPDATE OF normalized_address ON properties
    FOR EACH ROW EXECUTE FUNCTION calculate_address_hash();

-- Function to update professional average rating
CREATE OR REPLACE FUNCTION update_professional_rating()
RETURNS TRIGGER AS $$
DECLARE
    new_avg DECIMAL(3,2);
    new_count INTEGER;
BEGIN
    SELECT 
        ROUND(AVG(rating::DECIMAL), 2),
        COUNT(*)
    INTO new_avg, new_count
    FROM professional_reviews 
    WHERE professional_id = COALESCE(NEW.professional_id, OLD.professional_id)
    AND moderation_status = 'approved';
    
    UPDATE professionals 
    SET 
        average_rating = new_avg,
        total_reviews = new_count,
        updated_at = NOW()
    WHERE id = COALESCE(NEW.professional_id, OLD.professional_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger for automatic rating updates
CREATE TRIGGER trigger_update_professional_rating
    AFTER INSERT OR UPDATE OR DELETE ON professional_reviews
    FOR EACH ROW EXECUTE FUNCTION update_professional_rating();

-- Function to track subscription usage
CREATE OR REPLACE FUNCTION track_subscription_usage()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.action_type = 'search' AND NEW.billable THEN
        UPDATE user_subscriptions 
        SET searches_used_this_period = searches_used_this_period + 1
        WHERE id = NEW.subscription_id;
    ELSIF NEW.action_type = 'api_call' AND NEW.billable THEN
        UPDATE user_subscriptions 
        SET api_calls_used_this_period = api_calls_used_this_period + 1
        WHERE id = NEW.subscription_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for usage tracking
CREATE TRIGGER trigger_track_subscription_usage
    AFTER INSERT ON usage_logs
    FOR EACH ROW EXECUTE FUNCTION track_subscription_usage();

-- =====================================================
-- VIEWS FOR COMMON QUERIES
-- =====================================================

-- Comprehensive property view with all related data
CREATE VIEW property_details AS
SELECT 
    p.id,
    p.normalized_address,
    p.latitude,
    p.longitude,
    p.location,
    p.property_type,
    p.year_built,
    
    -- Geographic references
    s.state_name,
    s.state_code,
    c.county_name,
    ct.geoid as census_tract,
    z.zip_code,
    
    -- Latest risk assessment
    ra.overall_risk_score,
    ra.flood_risk_score,
    ra.wildfire_risk_score,
    ra.heat_risk_score,
    ra.assessment_date,
    ra.confidence_level,
    
    -- Flood zone information
    fz.zone_code as flood_zone,
    fz.insurance_required as flood_insurance_required,
    
    p.created_at,
    p.updated_at
FROM properties p
LEFT JOIN states s ON p.state_id = s.id
LEFT JOIN counties c ON p.county_id = c.id  
LEFT JOIN census_tracts ct ON p.census_tract_id = ct.id
LEFT JOIN zip_codes z ON p.zip_code_id = z.id
LEFT JOIN risk_assessments ra ON p.id = ra.property_id AND ra.assessment_date = (
    SELECT MAX(assessment_date) FROM risk_assessments WHERE property_id = p.id
)
LEFT JOIN property_flood_zones pfz ON p.id = pfz.property_id AND pfz.effective_date = (
    SELECT MAX(effective_date) FROM property_flood_zones WHERE property_id = p.id
)
LEFT JOIN flood_zones fz ON pfz.flood_zone_id = fz.id;

-- Professional directory view with ratings and service areas
CREATE VIEW professional_directory AS
SELECT 
    p.id,
    p.first_name,
    p.last_name,
    p.company_name,
    p.professional_type,
    p.email,
    p.phone,
    p.website_url,
    p.license_number,
    s.state_name as license_state,
    p.climate_certifications,
    p.specialization_areas,
    p.years_experience,
    p.average_rating,
    p.total_reviews,
    p.verified,
    p.accepts_new_clients,
    p.business_location,
    p.service_areas,
    p.service_radius_km
FROM professionals p
LEFT JOIN states s ON p.license_state_id = s.id
WHERE p.is_active = true;

-- User subscription summary
CREATE VIEW user_subscription_summary AS
SELECT 
    u.id as user_id,
    u.email,
    u.first_name,
    u.last_name,
    u.user_type,
    
    -- Current subscription
    st.tier_name,
    st.tier_display_name,
    us.status as subscription_status,
    us.billing_cycle,
    us.current_period_end,
    
    -- Usage this period
    us.searches_used_this_period,
    st.searches_per_month as searches_allowed,
    us.api_calls_used_this_period,
    st.api_calls_per_month as api_calls_allowed,
    
    -- Feature access
    st.premium_data,
    st.projections,
    st.bulk_analysis,
    st.api_access,
    
    us.created_at as subscription_start
FROM users u
LEFT JOIN user_subscriptions us ON u.id = us.user_id AND us.status = 'active'
LEFT JOIN subscription_tiers st ON us.tier_id = st.id;

-- =====================================================
-- SAMPLE DATA FOR DEVELOPMENT AND TESTING
-- =====================================================

-- Insert basic subscription tiers
INSERT INTO subscription_tiers (tier_name, tier_display_name, monthly_price_cents, annual_price_cents, searches_per_month, data_sources, premium_data, projections) VALUES
('free', 'Free Basic', 0, 0, 10, ARRAY['fema'], false, false),
('premium', 'Premium Individual', 1999, 19999, 500, ARRAY['fema', 'first_street', 'climate_check'], true, true),
('professional', 'Professional', 9999, 99999, 5000, ARRAY['fema', 'first_street', 'climate_check'], true, true),
('enterprise', 'Enterprise', 199999, 1999999, -1, ARRAY['fema', 'first_street', 'climate_check'], true, true);

-- Sample state data (partial)
INSERT INTO states (state_code, state_name, state_fips) VALUES
('CA', 'California', '06'),
('TX', 'Texas', '48'),
('FL', 'Florida', '12'),
('NY', 'New York', '36'),
('WA', 'Washington', '53');

-- Sample flood zones
INSERT INTO flood_zones (zone_code, zone_description, insurance_required) VALUES
('AE', 'Base Floodplain with Base Flood Elevation', true),
('A', 'Base Floodplain without Base Flood Elevation', true),
('VE', 'Coastal Floodplain with Base Flood Elevation and Wave Action', true),
('X', 'Moderate to Low Risk Area', false),
('X500', '500-year Floodplain', false);

-- =====================================================
-- MAINTENANCE AND MONITORING FUNCTIONS
-- =====================================================

-- Function to clean expired cache entries
CREATE OR REPLACE FUNCTION cleanup_expired_cache()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM risk_assessments 
    WHERE cache_expires_at < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate database statistics
CREATE OR REPLACE FUNCTION get_database_stats()
RETURNS TABLE(
    table_name TEXT,
    row_count BIGINT,
    size_bytes BIGINT,
    index_size_bytes BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        schemaname||'.'||tablename as table_name,
        n_tup_ins - n_tup_del as row_count,
        pg_total_relation_size(schemaname||'.'||tablename) as size_bytes,
        pg_indexes_size(schemaname||'.'||tablename) as index_size_bytes
    FROM pg_stat_user_tables 
    ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- COMMENTS AND DOCUMENTATION
-- =====================================================

COMMENT ON DATABASE seawater IS 'Climate risk assessment platform database with PostGIS spatial capabilities';

COMMENT ON TABLE properties IS 'Master table for all property records with normalized addresses and spatial indexing';
COMMENT ON TABLE risk_assessments IS 'Aggregated climate risk scores from multiple data sources';
COMMENT ON TABLE risk_data_sources IS 'Raw API responses and source-specific data with JSONB storage';
COMMENT ON TABLE professionals IS 'Directory of climate-aware real estate and insurance professionals';
COMMENT ON TABLE users IS 'User accounts with authentication and profile information';
COMMENT ON TABLE user_subscriptions IS 'Active subscriptions with usage tracking and billing information';

COMMENT ON INDEX idx_properties_location IS 'Spatial index for geographic property queries - critical for performance';
COMMENT ON INDEX idx_risk_assessments_expires IS 'Index for cache cleanup and expiration checking';
COMMENT ON INDEX idx_professionals_service_areas IS 'Spatial index for professional service area searches';