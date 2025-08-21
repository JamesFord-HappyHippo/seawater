-- =====================================================
-- USGS Water Monitoring Schema Enhancement
-- Adding comprehensive water monitoring and flood risk capabilities
-- =====================================================

-- =====================================================
-- 1. USGS WATER MONITORING SITES
-- =====================================================

-- USGS water monitoring stations
CREATE TABLE usgs_water_sites (
    id SERIAL PRIMARY KEY,
    
    -- USGS Site identification
    site_number VARCHAR(15) NOT NULL UNIQUE, -- USGS site number (8-15 digits)
    site_name VARCHAR(200) NOT NULL,
    site_type_code VARCHAR(10), -- Stream, Lake, Well, etc.
    site_type_description VARCHAR(100),
    
    -- Geographic location
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    location GEOMETRY(POINT, 4326) NOT NULL,
    elevation_ft DECIMAL(8, 2), -- Elevation in feet above NAVD88
    
    -- Administrative boundaries
    state_code VARCHAR(2),
    county_code VARCHAR(5),
    hydrologic_unit_code VARCHAR(12), -- HUC-12 watershed code
    
    -- Site characteristics
    drainage_area_sq_mi DECIMAL(10, 3), -- Drainage area in square miles
    contributing_drainage_area_sq_mi DECIMAL(10, 3),
    
    -- Data availability
    has_streamflow BOOLEAN DEFAULT FALSE,
    has_gage_height BOOLEAN DEFAULT FALSE,
    has_water_quality BOOLEAN DEFAULT FALSE,
    has_groundwater BOOLEAN DEFAULT FALSE,
    
    -- Period of record
    begin_date DATE,
    end_date DATE, -- NULL if currently active
    
    -- Metadata
    agency_code VARCHAR(10) DEFAULT 'USGS',
    data_source VARCHAR(50) DEFAULT 'USGS_NWIS',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Spatial constraints
    CHECK (latitude >= -90 AND latitude <= 90),
    CHECK (longitude >= -180 AND longitude <= 180)
);

-- =====================================================
-- 2. USGS WATER PARAMETERS
-- =====================================================

-- USGS parameter codes and descriptions
CREATE TABLE usgs_water_parameters (
    id SERIAL PRIMARY KEY,
    
    -- Parameter identification
    parameter_code VARCHAR(5) NOT NULL UNIQUE, -- USGS 5-digit parameter code
    parameter_name VARCHAR(200) NOT NULL,
    parameter_description TEXT,
    
    -- Units and measurement
    unit_code VARCHAR(20),
    unit_description VARCHAR(100),
    
    -- Parameter classification
    parameter_group VARCHAR(50), -- Physical, Chemical, Biological, etc.
    srs_name VARCHAR(100), -- Statistical Reporting Service name
    
    -- Metadata
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- 3. REAL-TIME WATER DATA
-- =====================================================

-- Current/real-time water measurements (last 30 days)
CREATE TABLE usgs_water_measurements_current (
    id BIGSERIAL PRIMARY KEY,
    
    -- Site and parameter reference
    site_id INTEGER NOT NULL REFERENCES usgs_water_sites(id),
    parameter_id INTEGER NOT NULL REFERENCES usgs_water_parameters(id),
    
    -- Measurement data
    measurement_datetime TIMESTAMP NOT NULL,
    measurement_value DECIMAL(12, 4) NOT NULL,
    value_qualifier VARCHAR(50), -- Data quality qualifiers
    approval_level VARCHAR(20), -- Approved, Provisional, etc.
    
    -- Metadata
    method_code VARCHAR(20),
    grade_code VARCHAR(5),
    measured_by VARCHAR(100),
    
    -- Data source tracking
    data_source VARCHAR(50) DEFAULT 'USGS_NWIS_IV',
    retrieved_at TIMESTAMP DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(site_id, parameter_id, measurement_datetime)
);

-- =====================================================
-- 4. HISTORICAL WATER DATA
-- =====================================================

-- Daily aggregated historical measurements
CREATE TABLE usgs_water_measurements_daily (
    id BIGSERIAL PRIMARY KEY,
    
    -- Site and parameter reference
    site_id INTEGER NOT NULL REFERENCES usgs_water_sites(id),
    parameter_id INTEGER NOT NULL REFERENCES usgs_water_parameters(id),
    
    -- Date and statistics
    measurement_date DATE NOT NULL,
    daily_mean DECIMAL(12, 4),
    daily_max DECIMAL(12, 4),
    daily_min DECIMAL(12, 4),
    daily_median DECIMAL(12, 4),
    
    -- Data quality
    observation_count INTEGER, -- Number of measurements used for aggregation
    approval_level VARCHAR(20),
    data_quality_grade VARCHAR(5),
    
    -- Metadata
    statistic_code VARCHAR(5) DEFAULT '00003', -- Mean daily value
    data_source VARCHAR(50) DEFAULT 'USGS_NWIS_DV',
    retrieved_at TIMESTAMP DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(site_id, parameter_id, measurement_date, statistic_code)
);

-- =====================================================
-- 5. FLOOD RISK ASSESSMENTS
-- =====================================================

-- USGS-based flood risk assessments for properties
CREATE TABLE usgs_flood_assessments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Property reference
    property_id UUID NOT NULL REFERENCES properties(id),
    
    -- Assessment metadata
    assessment_date TIMESTAMP DEFAULT NOW(),
    assessment_expires_at TIMESTAMP NOT NULL, -- Cache expiration (1-4 hours)
    assessment_radius_km INTEGER DEFAULT 25, -- Search radius for monitoring sites
    
    -- Overall flood risk
    flood_risk_score INTEGER CHECK (flood_risk_score >= 0 AND flood_risk_score <= 100),
    flood_risk_level VARCHAR(20), -- VERY_LOW, LOW, MODERATE, HIGH, VERY_HIGH, UNKNOWN
    confidence_level VARCHAR(20), -- low, medium, high
    
    -- Site analysis summary
    sites_analyzed INTEGER DEFAULT 0,
    nearest_site_distance_km DECIMAL(6, 2),
    sites_with_historical_data INTEGER DEFAULT 0,
    
    -- Current conditions summary
    average_streamflow_cfs DECIMAL(12, 2), -- cubic feet per second
    average_gage_height_ft DECIMAL(8, 3), -- feet
    max_streamflow_percentile DECIMAL(5, 2), -- vs historical
    max_gage_height_percentile DECIMAL(5, 2), -- vs historical
    
    -- Risk factors
    has_elevated_streamflow BOOLEAN DEFAULT FALSE,
    has_elevated_gage_height BOOLEAN DEFAULT FALSE,
    rapid_change_detected BOOLEAN DEFAULT FALSE,
    
    -- Assessment quality indicators
    data_available BOOLEAN DEFAULT FALSE,
    assessment_confidence DECIMAL(4, 3), -- 0.0 to 1.0
    
    -- Metadata
    data_source VARCHAR(50) DEFAULT 'USGS_Water_Services',
    created_at TIMESTAMP DEFAULT NOW(),
    
    -- Ensure one current assessment per property
    UNIQUE(property_id, assessment_date)
);

-- =====================================================
-- 6. SITE-SPECIFIC FLOOD RISK DATA
-- =====================================================

-- Detailed assessment for each monitoring site
CREATE TABLE usgs_site_flood_assessments (
    id BIGSERIAL PRIMARY KEY,
    
    -- References
    flood_assessment_id UUID NOT NULL REFERENCES usgs_flood_assessments(id) ON DELETE CASCADE,
    site_id INTEGER NOT NULL REFERENCES usgs_water_sites(id),
    
    -- Site location relative to property
    distance_km DECIMAL(6, 2) NOT NULL,
    bearing_degrees DECIMAL(5, 2), -- 0-360 degrees from property
    
    -- Current conditions
    current_streamflow_cfs DECIMAL(12, 2),
    current_gage_height_ft DECIMAL(8, 3),
    current_temperature_c DECIMAL(5, 2),
    measurement_time TIMESTAMP,
    
    -- Historical context
    streamflow_percentile DECIMAL(5, 2), -- vs 5-year average
    gage_height_percentile DECIMAL(5, 2), -- vs 5-year average
    historical_comparison_available BOOLEAN DEFAULT FALSE,
    
    -- Risk scoring
    site_risk_score INTEGER CHECK (site_risk_score >= 0 AND site_risk_score <= 100),
    risk_factors TEXT[], -- Array of contributing risk factors
    
    -- Data quality
    data_quality VARCHAR(20), -- excellent, good, fair, poor
    last_measurement TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- 7. WATER QUALITY ASSESSMENTS
-- =====================================================

-- Water quality assessments for environmental risk
CREATE TABLE usgs_water_quality_assessments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Property reference
    property_id UUID NOT NULL REFERENCES properties(id),
    
    -- Assessment metadata
    assessment_date TIMESTAMP DEFAULT NOW(),
    assessment_radius_km INTEGER DEFAULT 50,
    sites_analyzed INTEGER DEFAULT 0,
    
    -- Overall water quality
    overall_quality VARCHAR(20), -- excellent, good, fair, poor, unknown
    quality_concerns TEXT[], -- Array of identified concerns
    
    -- Parameter summaries
    average_temperature_c DECIMAL(5, 2),
    average_dissolved_oxygen_mg_l DECIMAL(6, 3),
    average_ph DECIMAL(4, 2),
    average_turbidity_ntu DECIMAL(8, 3),
    average_conductivity_us_cm DECIMAL(10, 2),
    
    -- Quality flags
    high_temperature_sites INTEGER DEFAULT 0,
    low_oxygen_sites INTEGER DEFAULT 0,
    ph_outside_range_sites INTEGER DEFAULT 0,
    high_turbidity_sites INTEGER DEFAULT 0,
    
    -- Assessment quality
    data_available BOOLEAN DEFAULT FALSE,
    confidence_level VARCHAR(20), -- low, medium, high
    
    -- Metadata
    data_source VARCHAR(50) DEFAULT 'USGS_Water_Quality',
    created_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- 8. WATER ALERT SYSTEM
-- =====================================================

-- Real-time water alerts and warnings
CREATE TABLE usgs_water_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Alert metadata
    alert_type VARCHAR(50) NOT NULL, -- flood_warning, flood_watch, streamflow_critical
    severity VARCHAR(20) NOT NULL, -- low, medium, high, critical
    alert_level VARCHAR(20) NOT NULL, -- none, low, medium, high, critical
    
    -- Location
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    location GEOMETRY(POINT, 4326) NOT NULL,
    affected_radius_km INTEGER,
    
    -- Alert content
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    recommendations TEXT[], -- Array of recommended actions
    
    -- Affected sites
    primary_site_id INTEGER REFERENCES usgs_water_sites(id),
    affected_sites INTEGER[], -- Array of site IDs
    
    -- Trigger conditions
    trigger_streamflow_cfs DECIMAL(12, 2),
    trigger_gage_height_ft DECIMAL(8, 3),
    trigger_percentile DECIMAL(5, 2),
    
    -- Timing
    alert_issued_at TIMESTAMP DEFAULT NOW(),
    alert_expires_at TIMESTAMP, -- Optional expiration
    alert_status VARCHAR(20) DEFAULT 'active', -- active, expired, cancelled
    
    -- Metadata
    data_source VARCHAR(50) DEFAULT 'USGS_Water_Alerts',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- 9. SPATIAL INDEXES AND OPTIMIZATION
-- =====================================================

-- Spatial indexes for geographic queries
CREATE INDEX idx_usgs_water_sites_location ON usgs_water_sites USING GIST (location);
CREATE INDEX idx_usgs_water_alerts_location ON usgs_water_alerts USING GIST (location);

-- Performance indexes for time-series data
CREATE INDEX idx_usgs_measurements_current_site_param ON usgs_water_measurements_current (site_id, parameter_id);
CREATE INDEX idx_usgs_measurements_current_datetime ON usgs_water_measurements_current (measurement_datetime DESC);
CREATE INDEX idx_usgs_measurements_daily_site_param_date ON usgs_water_measurements_daily (site_id, parameter_id, measurement_date);
CREATE INDEX idx_usgs_measurements_daily_date ON usgs_water_measurements_daily (measurement_date DESC);

-- Assessment lookup indexes
CREATE INDEX idx_usgs_flood_assessments_property ON usgs_flood_assessments (property_id);
CREATE INDEX idx_usgs_flood_assessments_expires ON usgs_flood_assessments (assessment_expires_at);
CREATE INDEX idx_usgs_site_assessments_flood_id ON usgs_site_flood_assessments (flood_assessment_id);
CREATE INDEX idx_usgs_water_quality_property ON usgs_water_quality_assessments (property_id);

-- Alert system indexes
CREATE INDEX idx_usgs_water_alerts_issued ON usgs_water_alerts (alert_issued_at DESC);
CREATE INDEX idx_usgs_water_alerts_status ON usgs_water_alerts (alert_status);
CREATE INDEX idx_usgs_water_alerts_severity ON usgs_water_alerts (severity, alert_level);

-- Site reference indexes
CREATE INDEX idx_usgs_water_sites_number ON usgs_water_sites (site_number);
CREATE INDEX idx_usgs_water_sites_state ON usgs_water_sites (state_code);
CREATE INDEX idx_usgs_water_sites_type ON usgs_water_sites (site_type_code);
CREATE INDEX idx_usgs_water_sites_active ON usgs_water_sites (end_date) WHERE end_date IS NULL;
CREATE INDEX idx_usgs_water_parameters_code ON usgs_water_parameters (parameter_code);

-- =====================================================
-- 10. DATA RETENTION AND CLEANUP
-- =====================================================

-- Function to clean up old current measurements (keep last 30 days)
CREATE OR REPLACE FUNCTION cleanup_usgs_current_measurements()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM usgs_water_measurements_current 
    WHERE measurement_datetime < NOW() - INTERVAL '30 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up expired flood assessments
CREATE OR REPLACE FUNCTION cleanup_expired_usgs_assessments()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM usgs_flood_assessments 
    WHERE assessment_expires_at < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up old alerts (keep last 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_usgs_alerts()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM usgs_water_alerts 
    WHERE alert_issued_at < NOW() - INTERVAL '30 days'
    AND alert_status != 'active';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 11. SAMPLE USGS PARAMETER CODES
-- =====================================================

-- Insert common USGS water parameter codes
INSERT INTO usgs_water_parameters (parameter_code, parameter_name, parameter_description, unit_code, unit_description, parameter_group) VALUES
('00060', 'Streamflow', 'Discharge, cubic feet per second', 'ft3/s', 'cubic feet per second', 'Physical'),
('00065', 'Gage height', 'Gage height, feet', 'ft', 'feet', 'Physical'),
('00010', 'Water temperature', 'Temperature, water, degrees Celsius', 'deg C', 'degrees Celsius', 'Physical'),
('00045', 'Precipitation', 'Precipitation, total, inches', 'in', 'inches', 'Physical'),
('72019', 'Groundwater level', 'Depth to water level, feet below land surface', 'ft', 'feet below land surface', 'Physical'),
('00300', 'Dissolved oxygen', 'Dissolved oxygen, water, unfiltered, milligrams per liter', 'mg/L', 'milligrams per liter', 'Chemical'),
('00400', 'pH', 'pH, water, unfiltered, field, standard units', 'std units', 'standard units', 'Chemical'),
('63680', 'Turbidity', 'Turbidity, water, unfiltered, monochrome near infra-red LED light', 'NTRU', 'nephelometric turbidity ratio units', 'Physical'),
('00095', 'Specific conductance', 'Specific conductance, water, unfiltered, microsiemens per centimeter at 25 degrees Celsius', 'uS/cm', 'microsiemens per centimeter', 'Chemical');

-- =====================================================
-- 12. COMMENTS AND DOCUMENTATION
-- =====================================================

COMMENT ON TABLE usgs_water_sites IS 'USGS water monitoring stations with geographic locations and site characteristics';
COMMENT ON TABLE usgs_water_parameters IS 'USGS parameter codes for different types of water measurements';
COMMENT ON TABLE usgs_water_measurements_current IS 'Real-time/recent water measurements from USGS stations (last 30 days)';
COMMENT ON TABLE usgs_water_measurements_daily IS 'Historical daily aggregated water measurements for trend analysis';
COMMENT ON TABLE usgs_flood_assessments IS 'Property-specific flood risk assessments based on nearby USGS monitoring data';
COMMENT ON TABLE usgs_site_flood_assessments IS 'Detailed flood risk analysis for each monitoring site near a property';
COMMENT ON TABLE usgs_water_quality_assessments IS 'Water quality assessments for environmental risk evaluation';
COMMENT ON TABLE usgs_water_alerts IS 'Real-time flood and water condition alerts based on USGS monitoring data';

COMMENT ON INDEX idx_usgs_water_sites_location IS 'Spatial index for finding nearby USGS monitoring sites - critical for flood risk queries';
COMMENT ON INDEX idx_usgs_measurements_current_datetime IS 'Index for efficient retrieval of recent water measurements';
COMMENT ON INDEX idx_usgs_flood_assessments_expires IS 'Index for cache expiration and cleanup operations';

-- Grant permissions (adjust as needed for your application)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO seawater_app;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO seawater_app;