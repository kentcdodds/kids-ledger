-- Migration: 0001_initial_schema
-- Description: Create schema_versions table for tracking migrations

CREATE TABLE IF NOT EXISTS schema_versions (
	version INTEGER PRIMARY KEY,
	name TEXT NOT NULL,
	applied_at INTEGER DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);