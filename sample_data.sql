-- =====================================================
-- Seawater.io Sample Data and Performance Testing
-- PostgreSQL 15+ with PostGIS Extension
-- =====================================================

-- =====================================================
-- SAMPLE GEOGRAPHIC DATA
-- =====================================================

-- Sample counties for major states
INSERT INTO counties (state_id, county_code, county_name, county_fips, population, area_sq_km) VALUES 
-- California counties
((SELECT id FROM states WHERE state_code = 'CA'), '001', 'Alameda County', '06001', 1685886, 2127.23),
((SELECT id FROM states WHERE state_code = 'CA'), '013', 'Contra Costa County', '06013', 1161413, 2078.26),
((SELECT id FROM states WHERE state_code = 'CA'), '041', 'Marin County', '06041', 262231, 2145.43),
((SELECT id FROM states WHERE state_code = 'CA'), '075', 'San Francisco County', '06075', 881549, 121.46),
((SELECT id FROM states WHERE state_code = 'CA'), '081', 'San Mateo County', '06081', 771410, 1162.66),
((SELECT id FROM states WHERE state_code = 'CA'), '085', 'Santa Clara County', '06085', 1927852, 3377.16),
((SELECT id FROM states WHERE state_code = 'CA'), '037', 'Los Angeles County', '06037', 10014009, 12305.26),
((SELECT id FROM states WHERE state_code = 'CA'), '073', 'San Diego County', '06073', 3338330, 11719.95),
-- Florida counties
((SELECT id FROM states WHERE state_code = 'FL'), '086', 'Miami-Dade County', '12086', 2716940, 5009.25),
((SELECT id FROM states WHERE state_code = 'FL'), '011', 'Broward County', '12011', 1944375, 3238.84),
((SELECT id FROM states WHERE state_code = 'FL'), '099', 'Palm Beach County', '12099', 1492191, 5636.67),
((SELECT id FROM states WHERE state_code = 'FL'), '095', 'Orange County', '12095', 1393452, 2433.70),
((SELECT id FROM states WHERE state_code = 'FL'), '103', 'Pinellas County', '12103', 959107, 727.45),
-- Texas counties  
((SELECT id FROM states WHERE state_code = 'TX'), '201', 'Harris County', '48201', 4731145, 4601.51),
((SELECT id FROM states WHERE state_code = 'TX'), '113', 'Dallas County', '48113', 2613539, 2266.83),
((SELECT id FROM states WHERE state_code = 'TX'), '029', 'Bexar County', '48029', 2009324, 3242.23),
((SELECT id FROM states WHERE state_code = 'TX'), '453', 'Travis County', '48453', 1290188, 2662.17),
-- New York counties
((SELECT id FROM states WHERE state_code = 'NY'), '061', 'New York County (Manhattan)', '36061', 1694251, 60.01),
((SELECT id FROM states WHERE state_code = 'NY'), '047', 'Kings County (Brooklyn)', '36047', 2559903, 251.00),
((SELECT id FROM states WHERE state_code = 'NY'), '081', 'Queens County', '36081', 2405464, 461.70),
((SELECT id FROM states WHERE state_code = 'NY'), '005', 'Bronx County', '36005', 1472654, 148.66),
((SELECT id FROM states WHERE state_code = 'NY'), '085', 'Richmond County (Staten Island)', '36085', 495747, 265.52)
ON CONFLICT (county_fips) DO UPDATE SET
    county_name = EXCLUDED.county_name,
    population = EXCLUDED.population,
    area_sq_km = EXCLUDED.area_sq_km;

-- Sample ZIP codes for testing
INSERT INTO zip_codes (zip_code, city, state_id, county_id) VALUES 
('94102', 'San Francisco', (SELECT id FROM states WHERE state_code = 'CA'), (SELECT id FROM counties WHERE county_fips = '06075')),
('94103', 'San Francisco', (SELECT id FROM states WHERE state_code = 'CA'), (SELECT id FROM counties WHERE county_fips = '06075')),
('94104', 'San Francisco', (SELECT id FROM states WHERE state_code = 'CA'), (SELECT id FROM counties WHERE county_fips = '06075')),
('90210', 'Beverly Hills', (SELECT id FROM states WHERE state_code = 'CA'), (SELECT id FROM counties WHERE county_fips = '06037')),
('90211', 'Beverly Hills', (SELECT id FROM states WHERE state_code = 'CA'), (SELECT id FROM counties WHERE county_fips = '06037')),
('33101', 'Miami', (SELECT id FROM states WHERE state_code = 'FL'), (SELECT id FROM counties WHERE county_fips = '12086')),
('33102', 'Miami', (SELECT id FROM states WHERE state_code = 'FL'), (SELECT id FROM counties WHERE county_fips = '12086')),
('33109', 'Miami Beach', (SELECT id FROM states WHERE state_code = 'FL'), (SELECT id FROM counties WHERE county_fips = '12086')),
('77001', 'Houston', (SELECT id FROM states WHERE state_code = 'TX'), (SELECT id FROM counties WHERE county_fips = '48201')),
('77002', 'Houston', (SELECT id FROM states WHERE state_code = 'TX'), (SELECT id FROM counties WHERE county_fips = '48201')),
('10001', 'New York', (SELECT id FROM states WHERE state_code = 'NY'), (SELECT id FROM counties WHERE county_fips = '36061')),
('10002', 'New York', (SELECT id FROM states WHERE state_code = 'NY'), (SELECT id FROM counties WHERE county_fips = '36061'))
ON CONFLICT (zip_code, city, state_id) DO NOTHING;

-- Update ZIP code centroids with sample coordinates
UPDATE zip_codes SET centroid = ST_SetSRID(ST_MakePoint(-122.4194, 37.7749), 4326) WHERE zip_code = '94102'; -- SF
UPDATE zip_codes SET centroid = ST_SetSRID(ST_MakePoint(-122.4089, 37.7749), 4326) WHERE zip_code = '94103'; -- SF
UPDATE zip_codes SET centroid = ST_SetSRID(ST_MakePoint(-122.4014, 37.7916), 4326) WHERE zip_code = '94104'; -- SF Financial
UPDATE zip_codes SET centroid = ST_SetSRID(ST_MakePoint(-118.4085, 34.0901), 4326) WHERE zip_code = '90210'; -- Beverly Hills
UPDATE zip_codes SET centroid = ST_SetSRID(ST_MakePoint(-118.4048, 34.0877), 4326) WHERE zip_code = '90211'; -- Beverly Hills
UPDATE zip_codes SET centroid = ST_SetSRID(ST_MakePoint(-80.1918, 25.7617), 4326) WHERE zip_code = '33101'; -- Miami
UPDATE zip_codes SET centroid = ST_SetSRID(ST_MakePoint(-80.1955, 25.7643), 4326) WHERE zip_code = '33102'; -- Miami
UPDATE zip_codes SET centroid = ST_SetSRID(ST_MakePoint(-80.1300, 25.7907), 4326) WHERE zip_code = '33109'; -- Miami Beach
UPDATE zip_codes SET centroid = ST_SetSRID(ST_MakePoint(-95.3698, 29.7604), 4326) WHERE zip_code = '77001'; -- Houston
UPDATE zip_codes SET centroid = ST_SetSRID(ST_MakePoint(-95.3633, 29.7589), 4326) WHERE zip_code = '77002'; -- Houston
UPDATE zip_codes SET centroid = ST_SetSRID(ST_MakePoint(-73.9969, 40.7506), 4326) WHERE zip_code = '10001'; -- NYC Chelsea
UPDATE zip_codes SET centroid = ST_SetSRID(ST_MakePoint(-73.9857, 40.7154), 4326) WHERE zip_code = '10002'; -- NYC Lower East Side

-- =====================================================
-- SAMPLE PROPERTIES WITH REALISTIC DATA
-- =====================================================

-- Function to generate sample properties
CREATE OR REPLACE FUNCTION generate_sample_properties(num_properties INTEGER DEFAULT 1000)
RETURNS VOID AS $$
DECLARE
    i INTEGER;
    sample_addresses TEXT[] := ARRAY[
        '123 Main Street',
        '456 Oak Avenue',
        '789 Pine Road',
        '321 Elm Street',
        '654 Maple Drive',
        '987 Cedar Lane',
        '147 Birch Court',
        '258 Willow Way',
        '369 Cherry Boulevard',
        '159 Magnolia Street',
        '753 Sycamore Drive',
        '846 Hickory Lane',
        '951 Poplar Avenue',
        '357 Walnut Street',
        '268 Chestnut Road'
    ];
    sample_cities TEXT[] := ARRAY[
        'San Francisco',
        'Los Angeles', 
        'Miami',
        'Miami Beach',
        'Houston',
        'New York',
        'Beverly Hills'
    ];
    sample_states TEXT[] := ARRAY['CA', 'FL', 'TX', 'NY'];
    sample_types TEXT[] := ARRAY['residential', 'commercial', 'industrial'];
    
    rand_address TEXT;
    rand_city TEXT;
    rand_state TEXT;
    rand_zip TEXT;
    rand_lat DECIMAL(10, 8);
    rand_lng DECIMAL(11, 8);
    state_rec RECORD;
    county_rec RECORD;
    zip_rec RECORD;
BEGIN
    FOR i IN 1..num_properties LOOP
        -- Random address components
        rand_address := sample_addresses[floor(random() * array_length(sample_addresses, 1)) + 1] || ', Apt ' || floor(random() * 100 + 1);
        rand_city := sample_cities[floor(random() * array_length(sample_cities, 1)) + 1];
        rand_state := sample_states[floor(random() * array_length(sample_states, 1)) + 1];
        
        -- Get state record
        SELECT * INTO state_rec FROM states WHERE state_code = rand_state;
        
        -- Generate coordinates based on state
        CASE rand_state
            WHEN 'CA' THEN
                CASE rand_city
                    WHEN 'San Francisco' THEN
                        rand_lat := 37.7749 + (random() - 0.5) * 0.1; -- ±0.05 degrees
                        rand_lng := -122.4194 + (random() - 0.5) * 0.1;
                    WHEN 'Los Angeles' THEN
                        rand_lat := 34.0522 + (random() - 0.5) * 0.2;
                        rand_lng := -118.2437 + (random() - 0.5) * 0.2;
                    WHEN 'Beverly Hills' THEN
                        rand_lat := 34.0736 + (random() - 0.5) * 0.05;
                        rand_lng := -118.4004 + (random() - 0.5) * 0.05;
                    ELSE
                        rand_lat := 36.7783 + (random() - 0.5) * 4.0; -- Anywhere in CA
                        rand_lng := -119.4179 + (random() - 0.5) * 4.0;
                END CASE;
            WHEN 'FL' THEN
                CASE rand_city
                    WHEN 'Miami' THEN
                        rand_lat := 25.7617 + (random() - 0.5) * 0.1;
                        rand_lng := -80.1918 + (random() - 0.5) * 0.1;
                    WHEN 'Miami Beach' THEN
                        rand_lat := 25.7907 + (random() - 0.5) * 0.05;
                        rand_lng := -80.1300 + (random() - 0.5) * 0.05;
                    ELSE
                        rand_lat := 27.7663 + (random() - 0.5) * 4.0; -- Anywhere in FL
                        rand_lng := -81.6868 + (random() - 0.5) * 4.0;
                END CASE;
            WHEN 'TX' THEN
                rand_lat := 29.7604 + (random() - 0.5) * 0.2; -- Houston area
                rand_lng := -95.3698 + (random() - 0.5) * 0.2;
            WHEN 'NY' THEN
                rand_lat := 40.7128 + (random() - 0.5) * 0.2; -- NYC area
                rand_lng := -74.0060 + (random() - 0.5) * 0.1;
        END CASE;
        
        -- Find matching county and zip
        SELECT * INTO county_rec 
        FROM counties c 
        WHERE c.state_id = state_rec.id 
        ORDER BY random() 
        LIMIT 1;
        
        SELECT * INTO zip_rec 
        FROM zip_codes z 
        WHERE z.state_id = state_rec.id 
        AND z.city = rand_city
        ORDER BY random() 
        LIMIT 1;
        
        -- Generate a reasonable ZIP code if none found
        IF zip_rec IS NULL THEN
            CASE rand_state
                WHEN 'CA' THEN rand_zip := '9' || lpad(floor(random() * 10000)::TEXT, 4, '0');
                WHEN 'FL' THEN rand_zip := '3' || lpad(floor(random() * 10000)::TEXT, 4, '0');
                WHEN 'TX' THEN rand_zip := '7' || lpad(floor(random() * 10000)::TEXT, 4, '0');
                WHEN 'NY' THEN rand_zip := '1' || lpad(floor(random() * 1000)::TEXT, 4, '0');
            END CASE;
        ELSE
            rand_zip := zip_rec.zip_code;
        END IF;
        
        -- Insert property
        INSERT INTO properties (
            raw_address,
            normalized_address,
            house_number,
            street_name,
            city,
            state_id,
            county_id,
            census_tract_id,
            zip_code_id,
            latitude,
            longitude,
            geocoding_confidence,
            geocoding_source,
            property_type,
            year_built,
            square_feet,
            stories,
            basement
        ) VALUES (
            rand_address || ', ' || rand_city || ', ' || rand_state || ' ' || rand_zip,
            upper(rand_address || ', ' || rand_city || ', ' || rand_state || ' ' || rand_zip),
            split_part(rand_address, ' ', 1),
            substr(rand_address, position(' ' in rand_address) + 1, position(',' in rand_address) - position(' ' in rand_address) - 1),
            rand_city,
            state_rec.id,
            county_rec.id,
            NULL, -- census_tract_id to be populated later
            zip_rec.id,
            rand_lat,
            rand_lng,
            0.85 + random() * 0.14, -- confidence between 0.85 and 0.99
            CASE floor(random() * 3)
                WHEN 0 THEN 'mapbox'
                WHEN 1 THEN 'google'
                ELSE 'census'
            END,
            sample_types[floor(random() * array_length(sample_types, 1)) + 1],
            1950 + floor(random() * 74), -- year built between 1950-2024
            800 + floor(random() * 4200), -- square feet between 800-5000
            1 + floor(random() * 3), -- 1-3 stories
            random() < 0.3 -- 30% have basements
        )
        ON CONFLICT (address_hash) DO NOTHING;
        
        -- Show progress every 100 properties
        IF i % 100 = 0 THEN
            RAISE NOTICE 'Generated % sample properties', i;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Completed generating % sample properties', num_properties;
END;
$$ LANGUAGE plpgsql;

-- Generate sample properties
SELECT generate_sample_properties(2000);

-- =====================================================
-- SAMPLE RISK ASSESSMENTS
-- =====================================================

-- Function to generate realistic risk assessments for properties
CREATE OR REPLACE FUNCTION generate_sample_risk_assessments()
RETURNS VOID AS $$
DECLARE
    prop_record RECORD;
    flood_base INTEGER;
    wildfire_base INTEGER;
    heat_base INTEGER;
BEGIN
    FOR prop_record IN SELECT id, latitude, longitude, state_id FROM properties LIMIT 1000 LOOP
        -- Base risk scores influenced by geography
        -- California: higher wildfire, lower flood (except coast)
        -- Florida: higher flood and heat, lower wildfire  
        -- Texas: moderate all risks, higher heat
        -- New York: lower wildfire and heat, moderate flood
        
        CASE (SELECT state_code FROM states WHERE id = prop_record.state_id)
            WHEN 'CA' THEN
                wildfire_base := 60 + floor(random() * 30); -- 60-89
                flood_base := CASE WHEN prop_record.longitude > -122.0 THEN 70 + floor(random() * 25) ELSE 30 + floor(random() * 25) END; -- higher near coast
                heat_base := 50 + floor(random() * 25); -- 50-74
            WHEN 'FL' THEN
                flood_base := 75 + floor(random() * 20); -- 75-94
                wildfire_base := 20 + floor(random() * 20); -- 20-39
                heat_base := 80 + floor(random() * 15); -- 80-94
            WHEN 'TX' THEN
                flood_base := 40 + floor(random() * 30); -- 40-69
                wildfire_base := 45 + floor(random() * 25); -- 45-69
                heat_base := 75 + floor(random() * 20); -- 75-94
            WHEN 'NY' THEN
                flood_base := 35 + floor(random() * 30); -- 35-64
                wildfire_base := 15 + floor(random() * 15); -- 15-29
                heat_base := 25 + floor(random() * 20); -- 25-44
            ELSE
                flood_base := 40 + floor(random() * 30);
                wildfire_base := 40 + floor(random() * 30);
                heat_base := 40 + floor(random() * 30);
        END CASE;
        
        -- Insert risk assessment
        INSERT INTO risk_assessments (
            property_id,
            data_sources,
            cache_expires_at,
            confidence_level,
            overall_risk_score,
            flood_risk_score,
            wildfire_risk_score,
            heat_risk_score,
            tornado_risk_score,
            hurricane_risk_score,
            social_vulnerability_score,
            community_resilience_score
        ) VALUES (
            prop_record.id,
            ARRAY['fema', 'first_street'],
            NOW() + INTERVAL '24 hours',
            0.75 + random() * 0.20, -- confidence 0.75-0.95
            (flood_base + wildfire_base + heat_base) / 3, -- overall average
            flood_base + floor(random() * 10 - 5), -- slight variation
            wildfire_base + floor(random() * 10 - 5),
            heat_base + floor(random() * 10 - 5),
            CASE (SELECT state_code FROM states WHERE id = prop_record.state_id)
                WHEN 'TX' THEN 50 + floor(random() * 35) -- Texas has higher tornado risk
                ELSE 15 + floor(random() * 25)
            END,
            CASE (SELECT state_code FROM states WHERE id = prop_record.state_id)
                WHEN 'FL' THEN 70 + floor(random() * 25) -- Florida has higher hurricane risk
                ELSE 20 + floor(random() * 20)
            END,
            random() * 0.8 + 0.1, -- social vulnerability 0.1-0.9
            random() * 0.8 + 0.1  -- community resilience 0.1-0.9
        );
        
        -- Insert corresponding risk data source records
        INSERT INTO risk_data_sources (
            risk_assessment_id,
            source_name,
            source_version,
            raw_response,
            parsed_scores,
            data_quality_score,
            completeness_percentage,
            api_cost_cents
        ) VALUES 
        (
            (SELECT id FROM risk_assessments WHERE property_id = prop_record.id ORDER BY assessment_date DESC LIMIT 1),
            'fema_nri',
            '2024.1',
            jsonb_build_object(
                'status', 'success',
                'data', jsonb_build_object(
                    'county_fips', '06075',
                    'nri_score', flood_base,
                    'social_vulnerability', random(),
                    'community_resilience', random()
                )
            ),
            jsonb_build_object(
                'flood', flood_base,
                'wildfire', wildfire_base,
                'heat', heat_base
            ),
            0.85 + random() * 0.10,
            95 + floor(random() * 5),
            0 -- FEMA is free
        ),
        (
            (SELECT id FROM risk_assessments WHERE property_id = prop_record.id ORDER BY assessment_date DESC LIMIT 1),
            'first_street',
            '2024.2',
            jsonb_build_object(
                'status', 'success',
                'property_id', 'fs_' || prop_record.id,
                'flood_risk', flood_base + floor(random() * 10 - 5),
                'wildfire_risk', wildfire_base + floor(random() * 10 - 5),
                'projections', jsonb_build_object(
                    '2030', flood_base + floor(random() * 15),
                    '2050', flood_base + floor(random() * 25)
                )
            ),
            jsonb_build_object(
                'flood', flood_base,
                'wildfire', wildfire_base,
                'projections', true
            ),
            0.90 + random() * 0.08,
            98 + floor(random() * 2),
            15 -- First Street costs ~$0.15 per request
        );
    END LOOP;
    
    RAISE NOTICE 'Generated risk assessments for 1000 properties';
END;
$$ LANGUAGE plpgsql;

-- Generate sample risk assessments
SELECT generate_sample_risk_assessments();

-- =====================================================
-- SAMPLE USER DATA
-- =====================================================

-- Function to generate sample users
CREATE OR REPLACE FUNCTION generate_sample_users(num_users INTEGER DEFAULT 500)
RETURNS VOID AS $$
DECLARE
    i INTEGER;
    sample_first_names TEXT[] := ARRAY['John', 'Jane', 'Michael', 'Sarah', 'David', 'Lisa', 'Robert', 'Emily', 'James', 'Amanda', 'William', 'Jessica', 'Richard', 'Ashley', 'Thomas'];
    sample_last_names TEXT[] := ARRAY['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson'];
    sample_domains TEXT[] := ARRAY['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com', 'aol.com'];
    user_types TEXT[] := ARRAY['individual', 'professional', 'enterprise'];
    first_name TEXT;
    last_name TEXT;
    email TEXT;
    user_type TEXT;
    user_id UUID;
    tier_name TEXT;
BEGIN
    FOR i IN 1..num_users LOOP
        first_name := sample_first_names[floor(random() * array_length(sample_first_names, 1)) + 1];
        last_name := sample_last_names[floor(random() * array_length(sample_last_names, 1)) + 1];
        email := lower(first_name || '.' || last_name || '+' || i || '@' || sample_domains[floor(random() * array_length(sample_domains, 1)) + 1]);
        user_type := user_types[floor(random() * array_length(user_types, 1)) + 1];
        
        -- Insert user
        INSERT INTO users (
            email,
            first_name,
            last_name,
            user_type,
            email_verified,
            last_login,
            login_count,
            preferences,
            notification_settings
        ) VALUES (
            email,
            first_name,
            last_name,
            user_type,
            random() < 0.8, -- 80% have verified emails
            NOW() - (random() * INTERVAL '30 days'), -- last login within 30 days
            floor(random() * 50 + 1), -- 1-50 logins
            jsonb_build_object(
                'theme', CASE WHEN random() < 0.7 THEN 'light' ELSE 'dark' END,
                'units', CASE WHEN random() < 0.9 THEN 'imperial' ELSE 'metric' END,
                'default_map_layer', CASE floor(random() * 3)
                    WHEN 0 THEN 'satellite'
                    WHEN 1 THEN 'street'
                    ELSE 'terrain'
                END
            ),
            jsonb_build_object(
                'email', random() < 0.9,
                'marketing', random() < 0.3,
                'weekly_summary', random() < 0.6
            )
        ) RETURNING id INTO user_id;
        
        -- 70% of users have subscriptions
        IF random() < 0.7 THEN
            -- Distribute subscription tiers realistically
            tier_name := CASE 
                WHEN random() < 0.6 THEN 'free'
                WHEN random() < 0.85 THEN 'premium'
                WHEN random() < 0.95 THEN 'professional'
                ELSE 'enterprise'
            END;
            
            INSERT INTO user_subscriptions (
                user_id,
                tier_id,
                status,
                billing_cycle,
                current_period_start,
                current_period_end,
                stripe_customer_id,
                searches_used_this_period,
                api_calls_used_this_period
            ) VALUES (
                user_id,
                (SELECT id FROM subscription_tiers WHERE tier_name = tier_name),
                CASE 
                    WHEN random() < 0.9 THEN 'active'
                    WHEN random() < 0.95 THEN 'past_due'
                    ELSE 'canceled'
                END,
                CASE WHEN random() < 0.7 THEN 'monthly' ELSE 'annual' END,
                date_trunc('month', CURRENT_DATE) - INTERVAL '15 days',
                date_trunc('month', CURRENT_DATE) + INTERVAL '15 days',
                'cus_' || substr(md5(random()::text), 1, 14),
                floor(random() * CASE 
                    WHEN tier_name = 'free' THEN 10
                    WHEN tier_name = 'premium' THEN 500
                    WHEN tier_name = 'professional' THEN 5000
                    ELSE 10000
                END),
                floor(random() * CASE 
                    WHEN tier_name IN ('professional', 'enterprise') THEN 1000
                    ELSE 0
                END)
            );
        END IF;
        
        IF i % 100 = 0 THEN
            RAISE NOTICE 'Generated % sample users', i;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Completed generating % sample users', num_users;
END;
$$ LANGUAGE plpgsql;

-- Generate sample users
SELECT generate_sample_users(500);

-- =====================================================
-- SAMPLE PROFESSIONAL DIRECTORY
-- =====================================================

-- Sample professionals
INSERT INTO professionals (
    first_name,
    last_name,
    company_name,
    title,
    email,
    phone,
    professional_type,
    license_number,
    license_state_id,
    climate_certifications,
    specialization_areas,
    years_experience,
    service_radius_km,
    business_address,
    business_location,
    average_rating,
    total_reviews,
    verified,
    accepts_new_clients
) VALUES 
(
    'Sarah',
    'Johnson',
    'Climate Smart Realty',
    'Senior Climate Risk Advisor',
    'sarah.johnson@climatesmart.com',
    '(415) 555-0123',
    'real_estate_agent',
    'DRE-02098765',
    (SELECT id FROM states WHERE state_code = 'CA'),
    ARRAY['FEMA Climate Risk Certified', 'Green Building Professional'],
    ARRAY['flood', 'wildfire', 'seismic'],
    12,
    50,
    '123 Market Street, San Francisco, CA 94102',
    ST_SetSRID(ST_MakePoint(-122.4194, 37.7749), 4326),
    4.8,
    47,
    true,
    true
),
(
    'Michael',
    'Rodriguez',
    'Coastal Risk Inspections',
    'Lead Climate Inspector',
    'mrodriguez@coastalrisk.com',
    '(305) 555-0456',
    'home_inspector',
    'HI-9876543',
    (SELECT id FROM states WHERE state_code = 'FL'),
    ARRAY['FEMA Flood Damage Assessment', 'Hurricane Preparedness Specialist'],
    ARRAY['flood', 'hurricane', 'wind'],
    8,
    75,
    '456 Ocean Drive, Miami Beach, FL 33139',
    ST_SetSRID(ST_MakePoint(-80.1300, 25.7907), 4326),
    4.6,
    83,
    true,
    true
),
(
    'David',
    'Chen',
    'Wildfire Defense Insurance',
    'Senior Climate Underwriter',
    'dchen@wildfiredefense.com',
    '(213) 555-0789',
    'insurance_agent',
    'LIC-CA-445566',
    (SELECT id FROM states WHERE state_code = 'CA'),
    ARRAY['Wildfire Risk Assessment Professional', 'CPCU'],
    ARRAY['wildfire', 'drought', 'heat'],
    15,
    100,
    '789 Wilshire Boulevard, Los Angeles, CA 90017',
    ST_SetSRID(ST_MakePoint(-118.2437, 34.0522), 4326),
    4.9,
    152,
    true,
    true
),
(
    'Lisa',
    'Thompson',
    'Storm Ready Contractors',
    'Climate Resilience Specialist',
    'lthompson@stormready.com',
    '(713) 555-0321',
    'contractor',
    'TX-987654321',
    (SELECT id FROM states WHERE state_code = 'TX'),
    ARRAY['FORTIFIED Home Specialist', 'IBHS Contractor'],
    ARRAY['hurricane', 'tornado', 'flood'],
    10,
    60,
    '321 Main Street, Houston, TX 77002',
    ST_SetSRID(ST_MakePoint(-95.3633, 29.7589), 4326),
    4.7,
    29,
    true,
    true
),
(
    'Robert',
    'Williams',
    'Northeast Climate Consulting',
    'Climate Risk Consultant',
    'rwilliams@necclimate.com',
    '(212) 555-0654',
    'consultant',
    'NY-CON-12345',
    (SELECT id FROM states WHERE state_code = 'NY'),
    ARRAY['Climate Change Adaptation Professional', 'LEED AP'],
    ARRAY['flood', 'heat', 'coastal'],
    18,
    80,
    '654 Broadway, New York, NY 10012',
    ST_SetSRID(ST_MakePoint(-73.9969, 40.7506), 4326),
    4.5,
    76,
    true,
    false -- not accepting new clients
);

-- =====================================================
-- SAMPLE SEARCH HISTORY AND USAGE DATA
-- =====================================================

-- Function to generate realistic search history
CREATE OR REPLACE FUNCTION generate_sample_search_history()
RETURNS VOID AS $$
DECLARE
    user_record RECORD;
    property_record RECORD;
    i INTEGER;
    search_queries TEXT[] := ARRAY[
        '123 Main Street',
        '456 Oak Avenue',
        'Miami Beach, FL',
        'San Francisco, CA 94102',
        'Houston flood risk',
        'Beverly Hills wildfire',
        '90210',
        '33139',
        'climate risk assessment'
    ];
    search_types TEXT[] := ARRAY['address', 'coordinates', 'area'];
BEGIN
    -- Generate searches for each user
    FOR user_record IN SELECT id FROM users LIMIT 200 LOOP
        -- Each user has 1-10 searches
        FOR i IN 1..(1 + floor(random() * 9)) LOOP
            SELECT * INTO property_record FROM properties ORDER BY random() LIMIT 1;
            
            INSERT INTO search_history (
                user_id,
                search_query,
                search_type,
                property_id,
                results_count,
                user_location,
                response_time_ms,
                cache_hit,
                created_at
            ) VALUES (
                user_record.id,
                search_queries[floor(random() * array_length(search_queries, 1)) + 1],
                search_types[floor(random() * array_length(search_types, 1)) + 1],
                property_record.id,
                1 + floor(random() * 5), -- 1-5 results
                ST_SetSRID(ST_MakePoint(-122 + random() * 44, 25 + random() * 22), 4326), -- somewhere in US
                200 + floor(random() * 1800), -- 200-2000ms response time
                random() < 0.6, -- 60% cache hit rate
                NOW() - (random() * INTERVAL '90 days') -- searches within last 90 days
            );
            
            -- Generate corresponding usage log entry
            INSERT INTO usage_logs (
                user_id,
                action_type,
                resource_type,
                resource_id,
                billable,
                cost_cents,
                subscription_id,
                processing_time_ms,
                user_location,
                search_location,
                created_at
            ) VALUES (
                user_record.id,
                'search',
                'property_risk',
                property_record.id,
                true,
                CASE 
                    WHEN EXISTS(SELECT 1 FROM user_subscriptions WHERE user_id = user_record.id AND tier_id = (SELECT id FROM subscription_tiers WHERE tier_name = 'free')) THEN 0
                    ELSE 5 -- 5 cents per premium search
                END,
                (SELECT id FROM user_subscriptions WHERE user_id = user_record.id AND status = 'active' LIMIT 1),
                200 + floor(random() * 1800),
                ST_SetSRID(ST_MakePoint(-122 + random() * 44, 25 + random() * 22), 4326),
                property_record.location,
                NOW() - (random() * INTERVAL '90 days')
            );
        END LOOP;
    END LOOP;
    
    RAISE NOTICE 'Generated sample search history and usage logs';
END;
$$ LANGUAGE plpgsql;

-- Generate sample search history
SELECT generate_sample_search_history();

-- =====================================================
-- PERFORMANCE TESTING QUERIES
-- =====================================================

-- Create a view for testing common queries
CREATE VIEW performance_test_queries AS
WITH test_cases AS (
    SELECT 
        'property_lookup_by_address' as test_name,
        'SELECT * FROM property_details WHERE normalized_address ILIKE ''%MAIN STREET%''' as query_sql
    UNION ALL
    SELECT 
        'nearby_properties',
        'SELECT * FROM properties WHERE ST_DWithin(location, ST_SetSRID(ST_MakePoint(-122.4194, 37.7749), 4326), 1000) LIMIT 10'
    UNION ALL
    SELECT
        'risk_assessment_lookup',
        'SELECT * FROM risk_assessments WHERE overall_risk_score > 70 ORDER BY assessment_date DESC LIMIT 20'
    UNION ALL
    SELECT
        'professional_search',
        'SELECT * FROM professional_directory WHERE professional_type = ''real_estate_agent'' AND verified = true ORDER BY average_rating DESC LIMIT 10'
    UNION ALL
    SELECT
        'user_search_history',
        'SELECT COUNT(*) FROM search_history WHERE created_at > NOW() - INTERVAL ''7 days'' GROUP BY DATE(created_at)'
)
SELECT * FROM test_cases;

-- Function to run performance tests
CREATE OR REPLACE FUNCTION run_performance_tests()
RETURNS TABLE(
    test_name TEXT,
    execution_time_ms NUMERIC,
    rows_returned BIGINT
) AS $$
DECLARE
    test_record RECORD;
    start_time TIMESTAMP;
    end_time TIMESTAMP;
    row_count BIGINT;
BEGIN
    FOR test_record IN SELECT * FROM performance_test_queries LOOP
        start_time := clock_timestamp();
        
        EXECUTE 'SELECT COUNT(*) FROM (' || test_record.query_sql || ') subquery' INTO row_count;
        
        end_time := clock_timestamp();
        
        RETURN QUERY SELECT 
            test_record.test_name,
            EXTRACT(EPOCH FROM (end_time - start_time)) * 1000,
            row_count;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- DATA QUALITY AND VALIDATION CHECKS
-- =====================================================

-- Function to validate sample data quality
CREATE OR REPLACE FUNCTION validate_sample_data()
RETURNS TABLE(
    check_name TEXT,
    status TEXT,
    details TEXT
) AS $$
BEGIN
    -- Check property coordinates are valid
    RETURN QUERY
    SELECT 
        'property_coordinates'::TEXT,
        CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END,
        'Invalid coordinates: ' || COUNT(*)::TEXT
    FROM properties 
    WHERE latitude < -90 OR latitude > 90 OR longitude < -180 OR longitude > 180;
    
    -- Check risk scores are within valid range
    RETURN QUERY
    SELECT 
        'risk_score_range'::TEXT,
        CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END,
        'Invalid risk scores: ' || COUNT(*)::TEXT
    FROM risk_assessments 
    WHERE overall_risk_score < 0 OR overall_risk_score > 100;
    
    -- Check user emails are unique and valid
    RETURN QUERY
    SELECT 
        'user_emails'::TEXT,
        CASE WHEN COUNT(*) = (SELECT COUNT(DISTINCT email) FROM users) THEN 'PASS' ELSE 'FAIL' END,
        'Total users: ' || COUNT(*)::TEXT || ', Unique emails: ' || (SELECT COUNT(DISTINCT email) FROM users)::TEXT
    FROM users;
    
    -- Check professional ratings are valid
    RETURN QUERY
    SELECT 
        'professional_ratings'::TEXT,
        CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END,
        'Invalid ratings: ' || COUNT(*)::TEXT
    FROM professionals 
    WHERE average_rating < 0 OR average_rating > 5;
    
    -- Check foreign key integrity
    RETURN QUERY
    SELECT 
        'foreign_key_integrity'::TEXT,
        CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END,
        'Properties without states: ' || COUNT(*)::TEXT
    FROM properties 
    WHERE state_id NOT IN (SELECT id FROM states);
    
    -- Check index usage
    RETURN QUERY
    SELECT 
        'index_count'::TEXT,
        'INFO',
        'Total indexes: ' || COUNT(*)::TEXT
    FROM pg_indexes 
    WHERE schemaname = 'public';
END;
$$ LANGUAGE plpgsql;

-- Run validation
SELECT * FROM validate_sample_data();

-- =====================================================
-- SAMPLE ANALYTICS DATA
-- =====================================================

-- Populate daily analytics for the last 30 days
DO $$
DECLARE
    target_date DATE;
BEGIN
    FOR target_date IN SELECT generate_series(CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE, '1 day')::DATE LOOP
        PERFORM update_daily_analytics(target_date);
    END LOOP;
END $$;

-- Update popular searches based on search history
INSERT INTO popular_searches (
    normalized_query,
    query_type,
    search_count,
    unique_user_count,
    centroid,
    first_searched,
    last_searched,
    avg_response_time_ms
)
SELECT 
    upper(trim(search_query)) as normalized_query,
    search_type as query_type,
    COUNT(*) as search_count,
    COUNT(DISTINCT user_id) as unique_user_count,
    ST_SetSRID(ST_MakePoint(AVG(ST_X(user_location)), AVG(ST_Y(user_location))), 4326) as centroid,
    MIN(created_at) as first_searched,
    MAX(created_at) as last_searched,
    AVG(response_time_ms)::INTEGER as avg_response_time_ms
FROM search_history 
WHERE user_location IS NOT NULL
GROUP BY upper(trim(search_query)), search_type
HAVING COUNT(*) >= 3 -- only queries searched at least 3 times
ON CONFLICT (normalized_query, query_type) DO UPDATE SET
    search_count = EXCLUDED.search_count,
    unique_user_count = EXCLUDED.unique_user_count,
    last_searched = EXCLUDED.last_searched,
    avg_response_time_ms = EXCLUDED.avg_response_time_ms,
    updated_at = NOW();

-- =====================================================
-- SUMMARY STATISTICS
-- =====================================================

-- Display sample data summary
DO $$
DECLARE
    property_count INTEGER;
    user_count INTEGER;
    assessment_count INTEGER;
    professional_count INTEGER;
    search_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO property_count FROM properties;
    SELECT COUNT(*) INTO user_count FROM users;
    SELECT COUNT(*) INTO assessment_count FROM risk_assessments;
    SELECT COUNT(*) INTO professional_count FROM professionals;
    SELECT COUNT(*) INTO search_count FROM search_history;
    
    RAISE NOTICE '=== SAMPLE DATA GENERATION COMPLETE ===';
    RAISE NOTICE 'Properties: %', property_count;
    RAISE NOTICE 'Users: %', user_count;
    RAISE NOTICE 'Risk Assessments: %', assessment_count;
    RAISE NOTICE 'Professionals: %', professional_count;
    RAISE NOTICE 'Search History: %', search_count;
    RAISE NOTICE '==========================================';
END $$;