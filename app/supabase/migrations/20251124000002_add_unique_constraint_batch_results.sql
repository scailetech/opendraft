-- Add unique constraint to prevent duplicate batch results
-- Each (batch_id, row_index) combination should be unique

-- First, check if constraint already exists
DO $$
BEGIN
  -- Try to add the constraint
  ALTER TABLE batch_results
  ADD CONSTRAINT unique_batch_row_index UNIQUE (batch_id, row_index);
EXCEPTION WHEN duplicate_object THEN
  -- Constraint already exists, continue
  NULL;
WHEN OTHERS THEN
  RAISE NOTICE 'Could not add unique constraint: %', SQLERRM;
END $$;

-- Create index for the unique constraint (if not using constraint)
CREATE UNIQUE INDEX IF NOT EXISTS idx_batch_results_batch_row_unique
ON batch_results(batch_id, row_index);
