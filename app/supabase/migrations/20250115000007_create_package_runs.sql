-- Create Package Runs Table
-- Tracks pre-configured agent runs from packages
-- Part of GTM Engine transformation

CREATE TABLE IF NOT EXISTS package_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  package_id UUID NOT NULL REFERENCES agency_packages(id) ON DELETE CASCADE,
  agent_id TEXT NOT NULL, -- References agent_definitions(id) - FK constraint added conditionally below
  batch_id TEXT REFERENCES batches(id) ON DELETE SET NULL,
  
  config JSONB NOT NULL, -- Pre-configured agent config from package
  
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add foreign key constraint if agent_definitions table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'agent_definitions') THEN
    -- Add FK constraint if table exists
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'package_runs_agent_id_fkey'
    ) THEN
      ALTER TABLE package_runs 
      ADD CONSTRAINT package_runs_agent_id_fkey 
      FOREIGN KEY (agent_id) REFERENCES agent_definitions(id);
    END IF;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_package_runs_client ON package_runs(client_user_id);
CREATE INDEX IF NOT EXISTS idx_package_runs_package ON package_runs(package_id);
CREATE INDEX IF NOT EXISTS idx_package_runs_batch ON package_runs(batch_id);
CREATE INDEX IF NOT EXISTS idx_package_runs_agent ON package_runs(agent_id);

-- RLS Policies
ALTER TABLE package_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients can view own package runs"
  ON package_runs FOR SELECT
  USING (auth.uid() = client_user_id);

CREATE POLICY "Agencies can view client package runs"
  ON package_runs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN agency_packages ap ON ap.agency_user_id = up.user_id
      WHERE up.user_id = auth.uid()
      AND ap.id = package_runs.package_id
    )
  );

CREATE POLICY "Clients can insert own package runs"
  ON package_runs FOR INSERT
  WITH CHECK (auth.uid() = client_user_id);

CREATE POLICY "Service role can update package runs"
  ON package_runs FOR UPDATE
  USING (auth.role() = 'service_role');

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_package_runs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_package_runs_updated_at ON package_runs;
CREATE TRIGGER update_package_runs_updated_at
  BEFORE UPDATE ON package_runs
  FOR EACH ROW
  EXECUTE FUNCTION update_package_runs_updated_at();

-- Column comments for documentation
COMMENT ON TABLE package_runs IS 'Tracks execution of pre-configured agent runs from packages';
COMMENT ON COLUMN package_runs.config IS 'Pre-configured agent configuration from package';
COMMENT ON COLUMN package_runs.batch_id IS 'Reference to batch execution (TEXT to match batches.id type)';

