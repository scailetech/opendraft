-- Fix database table name mismatch and add polling columns
-- This migration renames tables to match production code and enables database polling pattern

-- Step 1: Rename tables to match code expectations (bulk_jobs → batches, bulk_rows → batch_results)
DO $$
BEGIN
  -- Only rename if old tables exist and new tables don't
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bulk_jobs')
     AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'batches') THEN
    ALTER TABLE bulk_jobs RENAME TO batches;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bulk_rows')
     AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'batch_results') THEN
    ALTER TABLE bulk_rows RENAME TO batch_results;
  END IF;
END $$;

-- Step 2: Add polling columns to batches table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                WHERE table_name='batches' AND column_name='data') THEN
    ALTER TABLE batches ADD COLUMN data JSONB;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                WHERE table_name='batches' AND column_name='context') THEN
    ALTER TABLE batches ADD COLUMN context TEXT;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                WHERE table_name='batches' AND column_name='output_schema') THEN
    ALTER TABLE batches ADD COLUMN output_schema JSONB;
  END IF;
END $$;

-- Step 3: Add column comments for documentation
COMMENT ON COLUMN batches.data IS 'CSV rows as JSON array for Modal processing';
COMMENT ON COLUMN batches.context IS 'Additional context for batch processing';
COMMENT ON COLUMN batches.output_schema IS 'Expected output column schema';
