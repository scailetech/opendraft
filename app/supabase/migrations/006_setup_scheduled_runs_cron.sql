-- Migration: Set up pg_cron for scheduled runs execution
-- Note: pg_cron extension must be enabled by a superuser
-- Run this manually in Supabase SQL Editor if pg_cron is available

-- Enable pg_cron extension (requires superuser)
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Grant necessary permissions
-- GRANT USAGE ON SCHEMA cron TO postgres;

-- Function to check and execute scheduled runs
-- This function will be called by pg_cron every minute
CREATE OR REPLACE FUNCTION execute_scheduled_runs()
RETURNS void AS $$
DECLARE
  scheduled_run RECORD;
  api_url TEXT;
  service_role_key TEXT;
BEGIN
  -- Get API URL and service role key from environment
  -- These should be set as Supabase secrets or config
  api_url := current_setting('app.api_url', true);
  service_role_key := current_setting('app.service_role_key', true);
  
  -- If not set, use defaults (should be configured in Supabase dashboard)
  IF api_url IS NULL OR api_url = '' THEN
    -- Default to Vercel URL or set via environment variable
    api_url := COALESCE(
      current_setting('app.vercel_url', true),
      'https://bulk-gpt-app.vercel.app'
    );
  END IF;
  
  -- Find all active schedules that need to run now
  FOR scheduled_run IN
    SELECT *
    FROM scheduled_runs
    WHERE status = 'active'
      AND is_enabled = true
      AND next_run_at <= NOW()
      AND next_run_at >= NOW() - INTERVAL '2 minutes' -- 2-minute window to prevent duplicate runs
    ORDER BY next_run_at ASC
    LIMIT 10 -- Process max 10 schedules per minute to avoid overload
  LOOP
    BEGIN
      -- Call Next.js API endpoint to execute the schedule
      -- Using pg_net extension if available, otherwise we'll use HTTP extension
      -- Note: This requires pg_net or http extension to be enabled
      
      -- Update status to prevent duplicate execution
      UPDATE scheduled_runs
      SET 
        last_run_status = 'running',
        last_run_at = NOW(),
        next_run_at = next_run_at + INTERVAL '1 minute' -- Temporary update to prevent duplicate
      WHERE id = scheduled_run.id;
      
      -- The actual HTTP call will be made by a separate process
      -- For now, we'll use a webhook/edge function approach
      -- Or use Supabase Edge Functions to call the API
      
      -- Log the execution attempt
      INSERT INTO scheduled_run_executions (
        scheduled_run_id,
        status,
        started_at
      ) VALUES (
        scheduled_run.id,
        'pending',
        NOW()
      );
      
    EXCEPTION WHEN OTHERS THEN
      -- Log error but continue with other schedules
      UPDATE scheduled_runs
      SET 
        last_run_status = 'failed',
        error_count = COALESCE(error_count, 0) + 1,
        last_error_message = SQLERRM
      WHERE id = scheduled_run.id;
    END;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Alternative: Use Supabase Edge Function approach
-- Create a simpler function that just marks schedules for execution
-- The Edge Function will poll this and call the API
CREATE OR REPLACE FUNCTION get_due_schedules()
RETURNS TABLE (
  id UUID,
  user_id UUID,
  cron_expression TEXT,
  timezone TEXT,
  config JSONB,
  csv_data JSONB,
  csv_file_path TEXT,
  csv_url TEXT,
  csv_filename TEXT,
  action TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sr.id,
    sr.user_id,
    sr.cron_expression,
    sr.timezone,
    sr.config,
    sr.csv_data,
    sr.csv_file_path,
    sr.csv_url,
    sr.csv_filename,
    sr.action
  FROM scheduled_runs sr
  WHERE sr.status = 'active'
    AND sr.is_enabled = true
    AND sr.next_run_at <= NOW()
    AND sr.next_run_at >= NOW() - INTERVAL '2 minutes'
  ORDER BY sr.next_run_at ASC
  LIMIT 10;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION execute_scheduled_runs() TO authenticated;
GRANT EXECUTE ON FUNCTION get_due_schedules() TO authenticated;

-- Comment on functions
COMMENT ON FUNCTION execute_scheduled_runs() IS 'Checks for due scheduled runs and triggers execution (called by pg_cron)';
COMMENT ON FUNCTION get_due_schedules() IS 'Returns schedules that are due for execution (called by Edge Function or external cron)';

-- Note: To set up pg_cron job, run this manually in Supabase SQL Editor:
-- SELECT cron.schedule(
--   'execute-scheduled-runs',
--   '* * * * *', -- Every minute
--   $$SELECT execute_scheduled_runs()$$
-- );

-- Alternative: Use Vercel Cron Jobs (recommended for simplicity)
-- Create vercel.json with:
-- {
--   "crons": [{
--     "path": "/api/cron/execute-schedules",
--     "schedule": "* * * * *"
--   }]
-- }

