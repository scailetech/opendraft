-- Migration: Create scheduled_runs table for agent scheduling
-- Enables users to schedule recurring test/run actions using cron expressions

-- Enable pg_cron extension (if available)
-- Note: pg_cron may require superuser privileges, so this might need to be run manually
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create scheduled_runs table
CREATE TABLE IF NOT EXISTS scheduled_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Agent/Batch Configuration
  agent_type TEXT NOT NULL DEFAULT 'bulk_agent',
  name TEXT NOT NULL,
  description TEXT,
  
  -- Schedule Configuration
  cron_expression TEXT NOT NULL,
  timezone TEXT DEFAULT 'UTC',
  action TEXT NOT NULL CHECK (action IN ('test', 'run')),
  
  -- Configuration Snapshot (stored as JSONB)
  -- Contains: prompt, output_fields, selected_tools, selected_input_columns, etc.
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- CSV/Data Source
  csv_data JSONB, -- Store CSV data directly (for small CSVs)
  csv_file_path TEXT, -- Reference to context file (for large files)
  csv_url TEXT, -- Google Sheets URL (if applicable)
  csv_filename TEXT, -- Original filename for reference
  
  -- Status & Execution Tracking
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'deleted')),
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  
  -- Execution History
  last_run_at TIMESTAMPTZ,
  last_run_status TEXT CHECK (last_run_status IN ('success', 'failed', 'running')),
  last_run_batch_id TEXT REFERENCES batches(id),
  next_run_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  run_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  last_error_message TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_cron_format CHECK (
    cron_expression ~ '^[0-9\*\-\,\/]+ [0-9\*\-\,\/]+ [0-9\*\-\,\/]+ [0-9\*\-\,\/]+ [0-9\*\-\,\/]+$'
  )
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_scheduled_runs_user_id ON scheduled_runs(user_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_runs_status ON scheduled_runs(status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_scheduled_runs_next_run ON scheduled_runs(next_run_at) WHERE is_enabled = true AND status = 'active';
CREATE INDEX IF NOT EXISTS idx_scheduled_runs_agent_type ON scheduled_runs(agent_type);
CREATE INDEX IF NOT EXISTS idx_scheduled_runs_enabled ON scheduled_runs(is_enabled, status, next_run_at) WHERE is_enabled = true AND status = 'active';

-- Create scheduled_run_executions table for detailed execution history
CREATE TABLE IF NOT EXISTS scheduled_run_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scheduled_run_id UUID NOT NULL REFERENCES scheduled_runs(id) ON DELETE CASCADE,
  batch_id TEXT REFERENCES batches(id),
  status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'success', 'failed')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  input_tokens INTEGER,
  output_tokens INTEGER,
  rows_processed INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for executions table
CREATE INDEX IF NOT EXISTS idx_executions_scheduled_run ON scheduled_run_executions(scheduled_run_id);
CREATE INDEX IF NOT EXISTS idx_executions_batch ON scheduled_run_executions(batch_id);
CREATE INDEX IF NOT EXISTS idx_executions_status ON scheduled_run_executions(status);
CREATE INDEX IF NOT EXISTS idx_executions_started_at ON scheduled_run_executions(started_at DESC);

-- Enable RLS
ALTER TABLE scheduled_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_run_executions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for scheduled_runs
CREATE POLICY "Users can view own schedules"
  ON scheduled_runs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own schedules"
  ON scheduled_runs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own schedules"
  ON scheduled_runs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own schedules"
  ON scheduled_runs FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for scheduled_run_executions
CREATE POLICY "Users can view own executions"
  ON scheduled_run_executions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM scheduled_runs
      WHERE scheduled_runs.id = scheduled_run_executions.scheduled_run_id
      AND scheduled_runs.user_id = auth.uid()
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_scheduled_runs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_scheduled_runs_updated_at
  BEFORE UPDATE ON scheduled_runs
  FOR EACH ROW
  EXECUTE FUNCTION update_scheduled_runs_updated_at();

-- Function to calculate next_run_at from cron expression
-- This is a placeholder - actual calculation will be done in application code
-- using cron-parser library for accuracy
CREATE OR REPLACE FUNCTION calculate_next_run_at(cron_expr TEXT, timezone_name TEXT DEFAULT 'UTC')
RETURNS TIMESTAMPTZ AS $$
BEGIN
  -- This function will be called from application code
  -- For now, return current time + 1 hour as placeholder
  -- Actual implementation uses cron-parser in Node.js
  RETURN NOW() + INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql;

-- Comment on tables
COMMENT ON TABLE scheduled_runs IS 'Stores scheduled agent runs with cron expressions';
COMMENT ON TABLE scheduled_run_executions IS 'Tracks execution history for scheduled runs';
COMMENT ON COLUMN scheduled_runs.config IS 'JSONB snapshot of agent configuration (prompt, output_fields, tools, etc.)';
COMMENT ON COLUMN scheduled_runs.csv_data IS 'CSV data stored directly (for small files)';
COMMENT ON COLUMN scheduled_runs.csv_file_path IS 'Reference to context file path (for large files)';
COMMENT ON COLUMN scheduled_runs.csv_url IS 'Google Sheets URL (if using Google Sheets as source)';

