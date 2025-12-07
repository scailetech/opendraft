-- Migration: Fix usage tracking when batch total_rows is updated after creation
-- Date: 2025-01-18
-- Description: Adds UPDATE trigger to recalculate usage when total_rows changes from 0 to actual value

-- Function to update usage when batch total_rows changes
CREATE OR REPLACE FUNCTION update_usage_on_batch_update()
RETURNS TRIGGER AS $$
DECLARE
  v_rows_diff INT;
  v_batch_diff INT;
BEGIN
  -- Only update usage if total_rows changed from 0 to a positive value
  -- This handles cases where batches are created with total_rows=0 and updated later
  IF OLD.total_rows = 0 AND NEW.total_rows > 0 THEN
    v_rows_diff := NEW.total_rows;
    v_batch_diff := 0; -- Batch already counted, just need to add rows
    
    -- Update user usage stats
    INSERT INTO user_usage (
      user_id,
      period_start,
      rows_processed_today,
      batches_created_today,
      rows_processed_this_month,
      batches_created_this_month,
      total_rows_processed,
      total_batches
    )
    VALUES (
      NEW.user_id,
      CURRENT_DATE,
      v_rows_diff,
      0,
      v_rows_diff,
      0,
      v_rows_diff,
      0
    )
    ON CONFLICT (user_id) DO UPDATE SET
      -- Reset daily stats if new day
      period_start = CASE
        WHEN user_usage.period_start < CURRENT_DATE THEN CURRENT_DATE
        ELSE user_usage.period_start
      END,
      rows_processed_today = CASE
        WHEN user_usage.period_start < CURRENT_DATE THEN user_usage.rows_processed_today + v_rows_diff
        ELSE user_usage.rows_processed_today + v_rows_diff
      END,
      -- Reset monthly stats if new month
      rows_processed_this_month = CASE
        WHEN DATE_TRUNC('month', user_usage.period_start) < DATE_TRUNC('month', CURRENT_DATE) THEN user_usage.rows_processed_this_month + v_rows_diff
        ELSE user_usage.rows_processed_this_month + v_rows_diff
      END,
      -- Always increment totals
      total_rows_processed = user_usage.total_rows_processed + v_rows_diff,
      updated_at = NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'batches') THEN
    DROP TRIGGER IF EXISTS update_batch_usage_on_update ON batches;
    CREATE TRIGGER update_batch_usage_on_update
      AFTER UPDATE OF total_rows ON batches
      FOR EACH ROW
      WHEN (OLD.total_rows = 0 AND NEW.total_rows > 0)
      EXECUTE FUNCTION update_usage_on_batch_update();
  END IF;
END $$;

COMMENT ON FUNCTION update_usage_on_batch_update() IS 'Updates usage stats when batch total_rows changes from 0 to actual value';

