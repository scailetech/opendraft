-- ABOUTME: Migration to add unsubscribe columns to waitlist table
-- ABOUTME: Run this in Supabase SQL editor before deploying unsubscribe feature

-- Add unsubscribed column (defaults to false)
ALTER TABLE waitlist
ADD COLUMN IF NOT EXISTS unsubscribed BOOLEAN DEFAULT FALSE;

-- Add timestamp for when user unsubscribed
ALTER TABLE waitlist
ADD COLUMN IF NOT EXISTS unsubscribed_at TIMESTAMPTZ;

-- Create index for filtering unsubscribed users
CREATE INDEX IF NOT EXISTS idx_waitlist_unsubscribed ON waitlist(unsubscribed);

-- Comment for documentation
COMMENT ON COLUMN waitlist.unsubscribed IS 'True if user has opted out of marketing emails';
COMMENT ON COLUMN waitlist.unsubscribed_at IS 'Timestamp when user unsubscribed';
