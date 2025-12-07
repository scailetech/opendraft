-- Add selected_input_columns column to batches table
-- Stores array of input column names that were selected for batch processing
-- This ensures exports only include selected columns, not all CSV columns

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                WHERE table_name='batches' AND column_name='selected_input_columns') THEN
    ALTER TABLE batches ADD COLUMN selected_input_columns JSONB;
  END IF;
END $$;

-- Add column comment for documentation
COMMENT ON COLUMN batches.selected_input_columns IS 'Array of input column names selected for this batch (e.g., ["name", "email"]). Used to filter exports to only include selected columns.';

