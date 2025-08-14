-- =====================================================
-- Seawater.io Database Migration and Setup Scripts
-- PostgreSQL 15+ with PostGIS Extension
-- =====================================================

-- =====================================================
-- INITIAL DATABASE SETUP
-- =====================================================

-- Create database (run as superuser)
-- CREATE DATABASE seawater_production;
-- CREATE DATABASE seawater_staging;
-- CREATE DATABASE seawater_development;

-- Create application user (run as superuser)
-- CREATE USER seawater_app WITH PASSWORD 'your_secure_password_here';
-- GRANT CONNECT ON DATABASE seawater_production TO seawater_app;
-- GRANT CONNECT ON DATABASE seawater_staging TO seawater_app;
-- GRANT CONNECT ON DATABASE seawater_development TO seawater_app;

-- Connect to the database
\c seawater_production

-- =====================================================
-- MIGRATION TRACKING
-- =====================================================

-- Create migrations tracking table
CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(14) PRIMARY KEY, -- YYYYMMDDHHMMSS format
    name VARCHAR(255) NOT NULL,
    executed_at TIMESTAMP DEFAULT NOW(),
    checksum VARCHAR(64) -- SHA-256 of migration content
);

-- Insert initial migration
INSERT INTO schema_migrations (version, name, checksum) VALUES 
('20250813000001', 'initial_schema_creation', 'placeholder_checksum')
ON CONFLICT (version) DO NOTHING;

-- =====================================================
-- PARTITIONING STRATEGY FOR LARGE TABLES
-- =====================================================

-- Partition usage_logs by month for performance
CREATE TABLE usage_logs_template (
    LIKE usage_logs INCLUDING ALL
);

-- Create monthly partitions for usage logs
CREATE OR REPLACE FUNCTION create_monthly_partition(table_name TEXT, start_date DATE)
RETURNS VOID AS $$
DECLARE
    partition_name TEXT;
    end_date DATE;
BEGIN
    partition_name := table_name || '_' || to_char(start_date, 'YYYY_MM');
    end_date := start_date + INTERVAL '1 month';
    
    EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I PARTITION OF %I
        FOR VALUES FROM (%L) TO (%L)',
        partition_name, table_name, start_date, end_date);
        
    -- Create indexes on partition
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON %I (user_id, created_at)', 
                   'idx_' || partition_name || '_user_date', partition_name);
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON %I (created_at)', 
                   'idx_' || partition_name || '_date', partition_name);
END;
$$ LANGUAGE plpgsql;

-- Convert usage_logs to partitioned table (for new installations)
-- For existing databases, this requires data migration
DROP TABLE IF EXISTS usage_logs CASCADE;

CREATE TABLE usage_logs (
    id UUID NOT NULL DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    session_id UUID REFERENCES user_sessions(id),
    
    -- Usage details
    action_type VARCHAR(50) NOT NULL,
    resource_type VARCHAR(50),
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
    
    created_at TIMESTAMP DEFAULT NOW(),
    
    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Create initial partitions for current and next 12 months
DO $$
DECLARE
    month_start DATE;
BEGIN
    month_start := date_trunc('month', CURRENT_DATE);
    
    FOR i IN 0..11 LOOP
        PERFORM create_monthly_partition('usage_logs', month_start + (i || ' months')::INTERVAL);
    END LOOP;
END $$;

-- Similarly partition search_history by month
DROP TABLE IF EXISTS search_history CASCADE;

CREATE TABLE search_history (
    id UUID NOT NULL DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    session_id UUID REFERENCES user_sessions(id),
    
    -- Search details
    search_query TEXT NOT NULL,
    search_type VARCHAR(50) NOT NULL,
    
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
    search_bbox GEOMETRY(POLYGON, 4326),
    
    -- Performance metrics
    response_time_ms INTEGER,
    cache_hit BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP DEFAULT NOW(),
    
    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Create search_history partitions
DO $$
DECLARE
    month_start DATE;
BEGIN
    month_start := date_trunc('month', CURRENT_DATE);
    
    FOR i IN 0..11 LOOP
        PERFORM create_monthly_partition('search_history', month_start + (i || ' months')::INTERVAL);
    END LOOP;
END $$;

-- =====================================================
-- AUTOMATED PARTITION MANAGEMENT
-- =====================================================

-- Function to automatically create next month's partition
CREATE OR REPLACE FUNCTION maintain_monthly_partitions()
RETURNS VOID AS $$
DECLARE
    next_month DATE;
    partition_tables TEXT[] := ARRAY['usage_logs', 'search_history', 'api_requests'];
    table_name TEXT;
BEGIN
    next_month := date_trunc('month', CURRENT_DATE + INTERVAL '2 months');
    
    FOREACH table_name IN ARRAY partition_tables LOOP
        PERFORM create_monthly_partition(table_name, next_month);
    END LOOP;
    
    -- Clean up old partitions (older than 2 years)
    FOREACH table_name IN ARRAY partition_tables LOOP
        PERFORM drop_old_partitions(table_name, CURRENT_DATE - INTERVAL '2 years');
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to drop old partitions
CREATE OR REPLACE FUNCTION drop_old_partitions(base_table TEXT, cutoff_date DATE)
RETURNS VOID AS $$
DECLARE
    partition_record RECORD;
BEGIN
    FOR partition_record IN 
        SELECT schemaname, tablename 
        FROM pg_tables 
        WHERE tablename LIKE base_table || '_%'
        AND tablename ~ '[0-9]{4}_[0-9]{2}$'
        AND to_date(substring(tablename from '[0-9]{4}_[0-9]{2}$'), 'YYYY_MM') < cutoff_date
    LOOP
        EXECUTE format('DROP TABLE IF EXISTS %I.%I CASCADE', 
                      partition_record.schemaname, partition_record.tablename);
        RAISE NOTICE 'Dropped old partition: %', partition_record.tablename;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- DATABASE ROLES AND PERMISSIONS
-- =====================================================

-- Create specialized roles
CREATE ROLE seawater_readonly;
CREATE ROLE seawater_analytics;
CREATE ROLE seawater_api;

-- Grant permissions to readonly role
GRANT CONNECT ON DATABASE seawater_production TO seawater_readonly;
GRANT USAGE ON SCHEMA public TO seawater_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO seawater_readonly;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO seawater_readonly;

-- Grant permissions to analytics role (includes readonly + some writes for analytics tables)
GRANT seawater_readonly TO seawater_analytics;
GRANT INSERT, UPDATE, DELETE ON analytics_daily TO seawater_analytics;
GRANT INSERT ON usage_logs TO seawater_analytics;
GRANT INSERT ON search_history TO seawater_analytics;

-- Grant permissions to API role (main application user)
GRANT seawater_analytics TO seawater_api;
GRANT INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO seawater_api;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT INSERT, UPDATE, DELETE ON TABLES TO seawater_api;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO seawater_api;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO seawater_api;

-- Assign main application user to API role
GRANT seawater_api TO seawater_app;

-- =====================================================
-- PERFORMANCE MONITORING SETUP
-- =====================================================

-- Enable query statistics collection
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Create performance monitoring view
CREATE VIEW performance_summary AS
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    rows,
    100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0) AS hit_percent
FROM pg_stat_statements 
ORDER BY total_time DESC;

-- Create slow query alerts view
CREATE VIEW slow_queries AS
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    rows
FROM pg_stat_statements 
WHERE mean_time > 1000 -- queries taking more than 1 second on average
ORDER BY mean_time DESC;

-- =====================================================
-- DATA ARCHIVAL AND CLEANUP PROCEDURES
-- =====================================================

-- Function to archive old risk assessments
CREATE OR REPLACE FUNCTION archive_old_risk_assessments()
RETURNS INTEGER AS $$
DECLARE
    archived_count INTEGER;
BEGIN
    -- Archive assessments older than 6 months that are expired
    CREATE TABLE IF NOT EXISTS risk_assessments_archive (LIKE risk_assessments INCLUDING ALL);
    
    WITH archived AS (
        DELETE FROM risk_assessments 
        WHERE cache_expires_at < NOW() - INTERVAL '6 months'
        RETURNING *
    )
    INSERT INTO risk_assessments_archive SELECT * FROM archived;
    
    GET DIAGNOSTICS archived_count = ROW_COUNT;
    
    RETURN archived_count;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up expired user sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
    cleaned_count INTEGER;
BEGIN
    DELETE FROM user_sessions WHERE expires_at < NOW();
    GET DIAGNOSTICS cleaned_count = ROW_COUNT;
    RETURN cleaned_count;
END;
$$ LANGUAGE plpgsql;

-- Function to update analytics daily
CREATE OR REPLACE FUNCTION update_daily_analytics(target_date DATE DEFAULT CURRENT_DATE)
RETURNS VOID AS $$
BEGIN
    INSERT INTO analytics_daily (
        date_recorded,
        daily_active_users,
        new_registrations,
        subscription_signups,
        total_searches,
        unique_properties_searched,
        avg_response_time_ms,
        revenue_cents
    )
    SELECT 
        target_date,
        COUNT(DISTINCT user_id) FILTER (WHERE action_type = 'search'),
        COUNT(*) FILTER (WHERE table_name = 'users' AND created_at::DATE = target_date),
        COUNT(*) FILTER (WHERE table_name = 'user_subscriptions' AND created_at::DATE = target_date),
        COUNT(*) FILTER (WHERE action_type = 'search'),
        COUNT(DISTINCT resource_id) FILTER (WHERE action_type = 'search'),
        AVG(processing_time_ms) FILTER (WHERE processing_time_ms IS NOT NULL),
        SUM(cost_cents)
    FROM usage_logs ul
    WHERE ul.created_at::DATE = target_date
    ON CONFLICT (date_recorded) DO UPDATE SET
        daily_active_users = EXCLUDED.daily_active_users,
        new_registrations = EXCLUDED.new_registrations,
        subscription_signups = EXCLUDED.subscription_signups,
        total_searches = EXCLUDED.total_searches,
        unique_properties_searched = EXCLUDED.unique_properties_searched,
        avg_response_time_ms = EXCLUDED.avg_response_time_ms,
        revenue_cents = EXCLUDED.revenue_cents;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- BACKUP AND RECOVERY PROCEDURES
-- =====================================================

-- Create backup metadata table
CREATE TABLE backup_log (
    id SERIAL PRIMARY KEY,
    backup_type VARCHAR(20) NOT NULL, -- 'full', 'incremental', 'schema_only'
    backup_location TEXT NOT NULL,
    file_size_bytes BIGINT,
    checksum VARCHAR(64),
    started_at TIMESTAMP NOT NULL,
    completed_at TIMESTAMP,
    status VARCHAR(20) DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
    error_message TEXT,
    retention_until DATE
);

-- Function to log backup operations
CREATE OR REPLACE FUNCTION log_backup_start(
    backup_type_param VARCHAR(20),
    backup_location_param TEXT
) RETURNS INTEGER AS $$
DECLARE
    backup_id INTEGER;
BEGIN
    INSERT INTO backup_log (backup_type, backup_location, started_at, retention_until)
    VALUES (
        backup_type_param, 
        backup_location_param, 
        NOW(),
        CASE 
            WHEN backup_type_param = 'full' THEN CURRENT_DATE + INTERVAL '1 year'
            WHEN backup_type_param = 'incremental' THEN CURRENT_DATE + INTERVAL '3 months'
            ELSE CURRENT_DATE + INTERVAL '1 month'
        END
    )
    RETURNING id INTO backup_id;
    
    RETURN backup_id;
END;
$$ LANGUAGE plpgsql;

-- Function to complete backup logging
CREATE OR REPLACE FUNCTION log_backup_complete(
    backup_id_param INTEGER,
    file_size_param BIGINT DEFAULT NULL,
    checksum_param VARCHAR(64) DEFAULT NULL,
    error_param TEXT DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
    UPDATE backup_log 
    SET 
        completed_at = NOW(),
        file_size_bytes = file_size_param,
        checksum = checksum_param,
        status = CASE WHEN error_param IS NULL THEN 'completed' ELSE 'failed' END,
        error_message = error_param
    WHERE id = backup_id_param;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- MONITORING AND ALERTING FUNCTIONS
-- =====================================================

-- Function to check database health
CREATE OR REPLACE FUNCTION check_database_health()
RETURNS TABLE(
    check_name TEXT,
    status TEXT,
    details TEXT
) AS $$
BEGIN
    -- Check disk space
    RETURN QUERY
    SELECT 
        'disk_space'::TEXT,
        CASE WHEN pg_database_size(current_database()) > 0.8 * 1024^3 * 1024 THEN 'WARNING' ELSE 'OK' END,
        'Database size: ' || pg_size_pretty(pg_database_size(current_database()));
    
    -- Check long running queries
    RETURN QUERY
    SELECT 
        'long_queries'::TEXT,
        CASE WHEN COUNT(*) > 5 THEN 'WARNING' ELSE 'OK' END,
        'Long running queries: ' || COUNT(*)::TEXT
    FROM pg_stat_activity 
    WHERE state = 'active' AND query_start < NOW() - INTERVAL '1 minute';
    
    -- Check expired cache entries
    RETURN QUERY
    SELECT 
        'expired_cache'::TEXT,
        CASE WHEN COUNT(*) > 1000 THEN 'WARNING' ELSE 'OK' END,
        'Expired risk assessments: ' || COUNT(*)::TEXT
    FROM risk_assessments 
    WHERE cache_expires_at < NOW();
    
    -- Check connection count
    RETURN QUERY
    SELECT 
        'connections'::TEXT,
        CASE WHEN COUNT(*) > 80 THEN 'WARNING' ELSE 'OK' END,
        'Active connections: ' || COUNT(*)::TEXT
    FROM pg_stat_activity;
END;
$$ LANGUAGE plpgsql;

-- Function to get table sizes for monitoring
CREATE OR REPLACE FUNCTION get_table_sizes()
RETURNS TABLE(
    schema_name TEXT,
    table_name TEXT,
    row_estimate BIGINT,
    total_size TEXT,
    index_size TEXT,
    toast_size TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        schemaname::TEXT,
        tablename::TEXT,
        n_tup_ins - n_tup_del as row_estimate,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
        pg_size_pretty(pg_indexes_size(schemaname||'.'||tablename)) as index_size,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) as toast_size
    FROM pg_stat_user_tables 
    ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- SCHEDULED MAINTENANCE JOBS
-- =====================================================

-- Create a simple job scheduler table for database maintenance
CREATE TABLE scheduled_jobs (
    id SERIAL PRIMARY KEY,
    job_name VARCHAR(100) NOT NULL UNIQUE,
    job_function VARCHAR(100) NOT NULL, -- function name to execute
    schedule_expression VARCHAR(100) NOT NULL, -- cron-like expression
    last_run TIMESTAMP,
    next_run TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Insert maintenance jobs
INSERT INTO scheduled_jobs (job_name, job_function, schedule_expression, next_run) VALUES
('cleanup_expired_cache', 'cleanup_expired_cache', '0 2 * * *', NOW() + INTERVAL '1 day'), -- Daily at 2 AM
('cleanup_expired_sessions', 'cleanup_expired_sessions', '0 3 * * *', NOW() + INTERVAL '1 day'), -- Daily at 3 AM
('maintain_partitions', 'maintain_monthly_partitions', '0 1 1 * *', NOW() + INTERVAL '1 month'), -- Monthly
('update_analytics', 'update_daily_analytics', '0 4 * * *', NOW() + INTERVAL '1 day'), -- Daily at 4 AM
('archive_old_data', 'archive_old_risk_assessments', '0 1 * * 0', NOW() + INTERVAL '1 week'); -- Weekly on Sunday

-- Function to execute scheduled job
CREATE OR REPLACE FUNCTION execute_scheduled_job(job_name_param VARCHAR(100))
RETURNS TEXT AS $$
DECLARE
    job_record RECORD;
    result_message TEXT;
BEGIN
    SELECT * INTO job_record FROM scheduled_jobs WHERE job_name = job_name_param AND is_active = true;
    
    IF job_record IS NULL THEN
        RETURN 'Job not found or inactive: ' || job_name_param;
    END IF;
    
    -- Execute the job function
    BEGIN
        EXECUTE 'SELECT ' || job_record.job_function || '()';
        
        -- Update last run time
        UPDATE scheduled_jobs 
        SET last_run = NOW(),
            next_run = CASE 
                WHEN schedule_expression = '0 2 * * *' THEN NOW() + INTERVAL '1 day'
                WHEN schedule_expression = '0 3 * * *' THEN NOW() + INTERVAL '1 day'
                WHEN schedule_expression = '0 1 1 * *' THEN NOW() + INTERVAL '1 month'
                WHEN schedule_expression = '0 4 * * *' THEN NOW() + INTERVAL '1 day'
                WHEN schedule_expression = '0 1 * * 0' THEN NOW() + INTERVAL '1 week'
                ELSE NOW() + INTERVAL '1 day'
            END
        WHERE job_name = job_name_param;
        
        result_message := 'Successfully executed job: ' || job_name_param;
        
    EXCEPTION WHEN others THEN
        result_message := 'Error executing job ' || job_name_param || ': ' || SQLERRM;
    END;
    
    RETURN result_message;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- INITIAL DATA POPULATION
-- =====================================================

-- Insert comprehensive subscription tiers
INSERT INTO subscription_tiers (
    tier_name, 
    tier_display_name, 
    monthly_price_cents, 
    annual_price_cents, 
    searches_per_month, 
    properties_per_search,
    api_calls_per_month,
    data_sources, 
    premium_data, 
    projections,
    bulk_analysis,
    api_access,
    white_label,
    priority_support,
    sort_order
) VALUES 
(
    'free', 
    'Free Basic', 
    0, 
    0, 
    10, 
    1,
    0,
    ARRAY['fema'], 
    false, 
    false,
    false,
    false,
    false,
    false,
    1
),
(
    'premium', 
    'Premium Individual', 
    1999, 
    19999, 
    500, 
    1,
    0,
    ARRAY['fema', 'first_street', 'climate_check'], 
    true, 
    true,
    false,
    false,
    false,
    false,
    2
),
(
    'professional', 
    'Professional', 
    9999, 
    99999, 
    5000, 
    10,
    1000,
    ARRAY['fema', 'first_street', 'climate_check'], 
    true, 
    true,
    true,
    true,
    false,
    true,
    3
),
(
    'enterprise', 
    'Enterprise', 
    199999, 
    1999999, 
    -1, 
    100,
    10000,
    ARRAY['fema', 'first_street', 'climate_check'], 
    true, 
    true,
    true,
    true,
    true,
    true,
    4
)
ON CONFLICT (tier_name) DO UPDATE SET
    tier_display_name = EXCLUDED.tier_display_name,
    monthly_price_cents = EXCLUDED.monthly_price_cents,
    annual_price_cents = EXCLUDED.annual_price_cents,
    updated_at = NOW();

-- Insert flood zones with descriptions
INSERT INTO flood_zones (zone_code, zone_description, insurance_required) VALUES
('AE', 'Base Floodplain with Base Flood Elevation determined', true),
('A', 'Base Floodplain without Base Flood Elevation determined', true),
('AH', 'Base Floodplain with flood depths of 1 to 3 feet (ponding areas)', true),
('AO', 'Base Floodplain with flood depths of 1 to 3 feet (sheet flow areas)', true),
('AR', 'Areas that result from the decertification of a previously accredited flood protection system', true),
('A99', 'Base Floodplain with flood protection measures under construction', true),
('VE', 'Coastal Floodplain with Base Flood Elevation and wave action', true),
('V', 'Coastal Floodplain without Base Flood Elevation determined', true),
('X', 'Areas outside the 0.2% annual chance floodplain', false),
('X500', 'Areas of 0.2% annual chance flood (500-year flood)', false),
('D', 'Areas of undetermined but possible flood hazards', false)
ON CONFLICT (zone_code) DO UPDATE SET
    zone_description = EXCLUDED.zone_description,
    insurance_required = EXCLUDED.insurance_required;

-- Insert sample US states (you would typically load this from a complete dataset)
INSERT INTO states (state_code, state_name, state_fips, population) VALUES
('AL', 'Alabama', '01', 5024279),
('AK', 'Alaska', '02', 733391),
('AZ', 'Arizona', '04', 7151502),
('AR', 'Arkansas', '05', 3011524),
('CA', 'California', '06', 39538223),
('CO', 'Colorado', '08', 5773714),
('CT', 'Connecticut', '09', 3605944),
('DE', 'Delaware', '10', 989948),
('FL', 'Florida', '12', 21538187),
('GA', 'Georgia', '13', 10711908),
('HI', 'Hawaii', '15', 1455271),
('ID', 'Idaho', '16', 1839106),
('IL', 'Illinois', '17', 12812508),
('IN', 'Indiana', '18', 6785528),
('IA', 'Iowa', '19', 3190369),
('KS', 'Kansas', '20', 2937880),
('KY', 'Kentucky', '21', 4505836),
('LA', 'Louisiana', '22', 4657757),
('ME', 'Maine', '23', 1362359),
('MD', 'Maryland', '24', 6177224),
('MA', 'Massachusetts', '25', 7001399),
('MI', 'Michigan', '26', 10037261),
('MN', 'Minnesota', '27', 5737915),
('MS', 'Mississippi', '28', 2961279),
('MO', 'Missouri', '29', 6196540),
('MT', 'Montana', '30', 1084225),
('NE', 'Nebraska', '31', 1961504),
('NV', 'Nevada', '32', 3104614),
('NH', 'New Hampshire', '33', 1395231),
('NJ', 'New Jersey', '34', 9288994),
('NM', 'New Mexico', '35', 2117522),
('NY', 'New York', '36', 20201249),
('NC', 'North Carolina', '37', 10439388),
('ND', 'North Dakota', '38', 779094),
('OH', 'Ohio', '39', 11799448),
('OK', 'Oklahoma', '40', 3959353),
('OR', 'Oregon', '41', 4237256),
('PA', 'Pennsylvania', '42', 13002700),
('RI', 'Rhode Island', '44', 1097379),
('SC', 'South Carolina', '45', 5118425),
('SD', 'South Dakota', '46', 886667),
('TN', 'Tennessee', '47', 6910840),
('TX', 'Texas', '48', 29145505),
('UT', 'Utah', '49', 3271616),
('VT', 'Vermont', '50', 643077),
('VA', 'Virginia', '51', 8631393),
('WA', 'Washington', '53', 7705281),
('WV', 'West Virginia', '54', 1793716),
('WI', 'Wisconsin', '55', 5893718),
('WY', 'Wyoming', '56', 576851)
ON CONFLICT (state_code) DO UPDATE SET
    state_name = EXCLUDED.state_name,
    population = EXCLUDED.population;

-- =====================================================
-- VERIFICATION AND TESTING QUERIES
-- =====================================================

-- Verify all extensions are installed
SELECT 
    extname,
    extversion,
    extrelocatable,
    extnamespace::regnamespace AS schema
FROM pg_extension 
WHERE extname IN ('postgis', 'postgis_topology', 'uuid-ossp', 'pg_trgm', 'btree_gist', 'pg_stat_statements');

-- Verify all tables are created
SELECT 
    schemaname,
    tablename,
    tableowner,
    hasindexes,
    hasrules,
    hastriggers
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;

-- Verify spatial indexes
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE indexname LIKE '%_geom' OR indexname LIKE '%_location' OR indexname LIKE '%_areas'
ORDER BY tablename, indexname;

-- Check constraint violations
SELECT 
    conname,
    conrelid::regclass,
    pg_get_constraintdef(oid)
FROM pg_constraint 
WHERE contype = 'c' -- check constraints
ORDER BY conrelid::regclass::text;

-- Verify foreign keys
SELECT 
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;

-- Migration completion log
INSERT INTO schema_migrations (version, name) VALUES 
('20250813000002', 'partitioning_and_maintenance_setup');

-- Final success message
DO $$
BEGIN
    RAISE NOTICE 'Seawater.io database migration completed successfully!';
    RAISE NOTICE 'Database: %', current_database();
    RAISE NOTICE 'Schema version: 20250813000002';
    RAISE NOTICE 'Tables created: %', (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public');
    RAISE NOTICE 'Indexes created: %', (SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public');
END $$;