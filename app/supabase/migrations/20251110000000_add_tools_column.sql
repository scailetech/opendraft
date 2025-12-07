-- Add tools column to batches table
-- Stores array of AI tool names selected for batch processing

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                WHERE table_name='batches' AND column_name='tools') THEN
    ALTER TABLE batches ADD COLUMN tools JSONB;
  END IF;
END $$;

-- Add column comment for documentation
COMMENT ON COLUMN batches.tools IS 'Array of AI tool names enabled for this batch (e.g., ["refresh_icp", "find_prospects"])';
