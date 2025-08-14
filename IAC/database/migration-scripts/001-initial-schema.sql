-- Migration 001: Initial Schema Creation
-- Created: 2024-01-01
-- Description: Creates the initial database schema for Seawater platform

BEGIN;

-- Create migration tracking table if it doesn't exist
CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(20) PRIMARY KEY,
    description TEXT,
    applied_at TIMESTAMP DEFAULT NOW(),
    checksum VARCHAR(64)
);

-- Record this migration
INSERT INTO schema_migrations (version, description) 
VALUES ('001', 'Initial schema creation')
ON CONFLICT (version) DO NOTHING;

-- The actual schema creation is in init-postgis.sql
-- This migration ensures the schema exists and is properly versioned

COMMIT;