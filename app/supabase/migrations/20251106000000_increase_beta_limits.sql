-- Migration: Increase beta plan limits for testing
-- Changes: Beta plan 5→50 batches/day, 5000→50000 rows/day

-- Update the check_usage_limits function with increased beta limits
CREATE OR REPLACE FUNCTION check_usage_limits(p_user_id UUID)
RETURNS TABLE(
  can_process BOOLEAN,
  batches_today INT,
  rows_today INT,
  daily_batch_limit INT,
  daily_row_limit INT,
  reason TEXT
) AS $$
DECLARE
  v_batches_today INT;
  v_rows_today INT;
  v_plan_type TEXT;
  v_daily_batch_limit INT;
  v_daily_row_limit INT;
BEGIN
  -- Get current usage
  SELECT
    COALESCE(batches_created_today, 0),
    COALESCE(rows_processed_today, 0),
    COALESCE(plan_type, 'beta')
  INTO v_batches_today, v_rows_today, v_plan_type
  FROM user_usage
  WHERE user_id = p_user_id;

  -- If no record exists, create one
  IF NOT FOUND THEN
    INSERT INTO user_usage (user_id, plan_type)
    VALUES (p_user_id, 'beta');
    v_batches_today := 0;
    v_rows_today := 0;
    v_plan_type := 'beta';
  END IF;

  -- Set limits based on plan (BETA INCREASED TO 50/50000)
  CASE v_plan_type
    WHEN 'beta' THEN
      v_daily_batch_limit := 50;
      v_daily_row_limit := 50000;
    WHEN 'free' THEN
      v_daily_batch_limit := 5;
      v_daily_row_limit := 5000;
    WHEN 'starter' THEN
      v_daily_batch_limit := 50;
      v_daily_row_limit := 50000;
    WHEN 'pro' THEN
      v_daily_batch_limit := 500;
      v_daily_row_limit := 500000;
    ELSE
      v_daily_batch_limit := 9999;
      v_daily_row_limit := 9999999;
  END CASE;

  -- Check limits and return result
  IF v_batches_today >= v_daily_batch_limit THEN
    RETURN QUERY SELECT
      FALSE,
      v_batches_today,
      v_rows_today,
      v_daily_batch_limit,
      v_daily_row_limit,
      'Daily batch limit reached. You have processed ' || v_batches_today || ' batches today (limit: ' || v_daily_batch_limit || ').'::TEXT;
  ELSIF v_rows_today >= v_daily_row_limit THEN
    RETURN QUERY SELECT
      FALSE,
      v_batches_today,
      v_rows_today,
      v_daily_batch_limit,
      v_daily_row_limit,
      'Daily row limit reached. You have processed ' || v_rows_today || ' rows today (limit: ' || v_daily_row_limit || ').'::TEXT;
  ELSE
    RETURN QUERY SELECT
      TRUE,
      v_batches_today,
      v_rows_today,
      v_daily_batch_limit,
      v_daily_row_limit,
      NULL::TEXT;
  END IF;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION check_usage_limits(UUID) IS 'Checks if user has exceeded daily/monthly limits based on their plan (Beta: 50 batches/50k rows per day)';
