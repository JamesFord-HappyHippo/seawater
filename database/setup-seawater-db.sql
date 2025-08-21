-- Seawater Database Setup Script
-- Run this after creating the seawater database

-- Connect to seawater database first
\c seawater;

-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create application user
CREATE USER seawater_app WITH PASSWORD 'SeawaterSecure123!';
GRANT CONNECT ON DATABASE seawater TO seawater_app;

-- Create schema
CREATE SCHEMA IF NOT EXISTS seawater_data;
GRANT USAGE ON SCHEMA seawater_data TO seawater_app;
GRANT CREATE ON SCHEMA seawater_data TO seawater_app;

-- Verify PostGIS installation
SELECT PostGIS_Version();

-- Show success message
SELECT 'Seawater database setup completed successfully!' AS status;