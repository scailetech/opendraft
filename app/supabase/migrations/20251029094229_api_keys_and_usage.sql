-- Migration 003: API Keys and Usage Tracking
-- Enables power users to generate API keys and tracks usage for rate limiting

-- API Keys table
CREATE TABLE IF NOT EXISTS user_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  key_prefix TEXT NOT NULL,
  last_used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  revoked_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT valid_name_length CHECK (length(name) > 0 AND length(name) <= 100)
);

-- Usage tracking table
CREATE TABLE IF NOT EXISTS user_usage (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Current period (resets daily/monthly)
  period_start DATE NOT NULL DEFAULT CURRENT_DATE,
  rows_processed_today INT DEFAULT 0,
  batches_created_today INT DEFAULT 0,
  rows_processed_this_month INT DEFAULT 0,
  batches_created_this_month INT DEFAULT 0,

  -- All-time totals
  total_rows_processed INT DEFAULT 0,
  total_batches INT DEFAULT 0,

  -- Plan info (for future billing)
  plan_type TEXT DEFAULT 'beta' CHECK (plan_type IN ('beta', 'free', 'starter', 'pro', 'enterprise')),

  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add missing columns to user_usage if table already existed
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='user_usage' AND column_name='plan_type') THEN
    ALTER TABLE user_usage ADD COLUMN plan_type TEXT DEFAULT 'beta' CHECK (plan_type IN ('beta', 'free', 'starter', 'pro', 'enterprise'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='user_usage' AND column_name='period_start') THEN
    ALTER TABLE user_usage ADD COLUMN period_start DATE NOT NULL DEFAULT CURRENT_DATE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='user_usage' AND column_name='rows_processed_this_month') THEN
    ALTER TABLE user_usage ADD COLUMN rows_processed_this_month INT DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='user_usage' AND column_name='batches_created_this_month') THEN
    ALTER TABLE user_usage ADD COLUMN batches_created_this_month INT DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='user_usage' AND column_name='updated_at') THEN
    ALTER TABLE user_usage ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;
END $$;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON user_api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON user_api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_prefix ON user_api_keys(key_prefix);

-- Only create plan_type index if column exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='user_usage' AND column_name='plan_type') THEN
    CREATE INDEX IF NOT EXISTS idx_user_usage_plan ON user_usage(plan_type);
  END IF;
END $$;

-- Trigger to automatically increment usage when a batch is created
CREATE OR REPLACE FUNCTION increment_usage()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert or update user usage stats
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
    NEW.total_rows,
    1,
    NEW.total_rows,
    1,
    NEW.total_rows,
    1
  )
  ON CONFLICT (user_id) DO UPDATE SET
    -- Reset daily stats if new day
    period_start = CASE
      WHEN user_usage.period_start < CURRENT_DATE THEN CURRENT_DATE
      ELSE user_usage.period_start
    END,
    rows_processed_today = CASE
      WHEN user_usage.period_start < CURRENT_DATE THEN NEW.total_rows
      ELSE user_usage.rows_processed_today + NEW.total_rows
    END,
    batches_created_today = CASE
      WHEN user_usage.period_start < CURRENT_DATE THEN 1
      ELSE user_usage.batches_created_today + 1
    END,
    -- Reset monthly stats if new month
    rows_processed_this_month = CASE
      WHEN DATE_TRUNC('month', user_usage.period_start) < DATE_TRUNC('month', CURRENT_DATE) THEN NEW.total_rows
      ELSE user_usage.rows_processed_this_month + NEW.total_rows
    END,
    batches_created_this_month = CASE
      WHEN DATE_TRUNC('month', user_usage.period_start) < DATE_TRUNC('month', CURRENT_DATE) THEN 1
      ELSE user_usage.batches_created_this_month + 1
    END,
    -- Always increment totals
    total_rows_processed = user_usage.total_rows_processed + NEW.total_rows,
    total_batches = user_usage.total_batches + 1,
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate (only if batches table exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'batches') THEN
    DROP TRIGGER IF EXISTS track_batch_usage ON batches;
    CREATE TRIGGER track_batch_usage
      AFTER INSERT ON batches
      FOR EACH ROW
      EXECUTE FUNCTION increment_usage();
  END IF;
END $$;

-- Function to check if user has exceeded limits
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

  -- Set limits based on plan
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

-- Comments for documentation
COMMENT ON TABLE user_api_keys IS 'Stores API keys for programmatic access (curl, n8n, Zapier)';
COMMENT ON TABLE user_usage IS 'Tracks usage statistics and enforces rate limits per user';
COMMENT ON FUNCTION increment_usage() IS 'Auto-increments usage counters when a new batch is created';
COMMENT ON FUNCTION check_usage_limits(UUID) IS 'Checks if user has exceeded daily/monthly limits based on their plan';
