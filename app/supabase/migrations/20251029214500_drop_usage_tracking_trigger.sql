-- Drop usage tracking trigger and function to fix batch creation
-- This is a temporary fix until the full API keys migration can be properly applied

-- Drop the trigger first
DROP TRIGGER IF EXISTS track_batch_usage ON batches;

-- Drop the function
DROP FUNCTION IF EXISTS increment_usage();

-- Comment explaining why
COMMENT ON TABLE batches IS 'Batch processing jobs. Note: usage tracking trigger temporarily disabled until full migration is applied.';
