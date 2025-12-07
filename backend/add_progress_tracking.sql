-- Add progress tracking fields to waitlist table
-- Run this in Supabase SQL Editor

ALTER TABLE waitlist
ADD COLUMN IF NOT EXISTS current_phase TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS progress_percent INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS sources_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS chapters_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS progress_details JSONB DEFAULT '{}'::jsonb;

-- Add comment
COMMENT ON COLUMN waitlist.current_phase IS 'Current phase: research, writing, formatting, exporting, completed';
COMMENT ON COLUMN waitlist.progress_percent IS 'Progress percentage (0-100)';
COMMENT ON COLUMN waitlist.sources_count IS 'Number of sources/citations found';
COMMENT ON COLUMN waitlist.chapters_count IS 'Number of chapters generated';
COMMENT ON COLUMN waitlist.progress_details IS 'Detailed progress info (JSON)';

