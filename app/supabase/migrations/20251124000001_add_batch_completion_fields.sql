-- Add batch completion and token tracking fields
-- Required for proper batch status tracking and rate limiting

DO $$
BEGIN
  -- Add completed_at column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                WHERE table_name='batches' AND column_name='completed_at') THEN
    ALTER TABLE batches ADD COLUMN completed_at TIMESTAMPTZ;
  END IF;

  -- Add total_input_tokens column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                WHERE table_name='batches' AND column_name='total_input_tokens') THEN
    ALTER TABLE batches ADD COLUMN total_input_tokens INT DEFAULT 0;
  END IF;

  -- Add total_output_tokens column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                WHERE table_name='batches' AND column_name='total_output_tokens') THEN
    ALTER TABLE batches ADD COLUMN total_output_tokens INT DEFAULT 0;
  END IF;

  -- Add successful_rows column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                WHERE table_name='batches' AND column_name='successful_rows') THEN
    ALTER TABLE batches ADD COLUMN successful_rows INT DEFAULT 0;
  END IF;

  -- Add failed_rows column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                WHERE table_name='batches' AND column_name='failed_rows') THEN
    ALTER TABLE batches ADD COLUMN failed_rows INT DEFAULT 0;
  END IF;

  -- Add error column if it doesn't exist (for storing failure reason)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                WHERE table_name='batches' AND column_name='error') THEN
    ALTER TABLE batches ADD COLUMN error TEXT;
  END IF;
END $$;

-- Add indexes for completion tracking
CREATE INDEX IF NOT EXISTS idx_batches_completed_at ON batches(completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_batches_status_completed ON batches(status, completed_at DESC);

-- Add column comments for documentation
COMMENT ON COLUMN batches.completed_at IS 'Timestamp when batch processing completed';
COMMENT ON COLUMN batches.total_input_tokens IS 'Total input tokens used in this batch (for rate limiting)';
COMMENT ON COLUMN batches.total_output_tokens IS 'Total output tokens used in this batch (for rate limiting)';
COMMENT ON COLUMN batches.successful_rows IS 'Count of rows processed successfully';
COMMENT ON COLUMN batches.failed_rows IS 'Count of rows that failed processing';
COMMENT ON COLUMN batches.error IS 'Error message if batch failed';
