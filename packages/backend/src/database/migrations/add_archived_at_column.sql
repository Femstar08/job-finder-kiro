-- Migration: Add archived_at column to job_matches table for data retention
-- This allows us to mark job matches as archived before deletion

ALTER TABLE job_matches 
ADD COLUMN archived_at TIMESTAMP NULL;

-- Add index for archived_at column for performance
CREATE INDEX idx_job_matches_archived_at ON job_matches(archived_at);

-- Add index for data retention queries
CREATE INDEX idx_job_matches_retention ON job_matches(found_at, archived_at);

-- Update the existing init.sql comment
COMMENT ON COLUMN job_matches.archived_at IS 'Timestamp when the job match was archived for data retention';