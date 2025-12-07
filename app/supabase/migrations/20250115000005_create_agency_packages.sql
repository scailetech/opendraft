-- Create Agency Packages Table
-- Stores pre-configured agent runs (not restrictions)
-- Part of GTM Engine transformation

CREATE TABLE IF NOT EXISTS agency_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,
  description TEXT,
  
  -- Pre-configured agent runs (not restrictions!)
  agent_configs JSONB NOT NULL, -- Array of {agent_id, config, schedule?}
  
  -- Package pricing
  monthly_cost DECIMAL(10, 2) NOT NULL, -- Monthly package price (e.g., 1500.00)
  -- Included self-service credits = monthly_cost * 0.10 (calculated, not stored)
  
  -- Package metadata
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agency_packages_agency ON agency_packages(agency_user_id);

-- RLS Policies
ALTER TABLE agency_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agencies can manage own packages"
  ON agency_packages FOR ALL
  USING (auth.uid() = agency_user_id);

-- Note: "Clients can view assigned packages" policy will be added in migration 6
-- after client_package_assignments table is created

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_agency_packages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_agency_packages_updated_at ON agency_packages;
CREATE TRIGGER update_agency_packages_updated_at
  BEFORE UPDATE ON agency_packages
  FOR EACH ROW
  EXECUTE FUNCTION update_agency_packages_updated_at();

-- Column comments for documentation
COMMENT ON TABLE agency_packages IS 'Pre-configured agent run packages created by agencies for clients';
COMMENT ON COLUMN agency_packages.agent_configs IS 'Array of pre-configured agent runs: [{agent_id, config, schedule?}]';
COMMENT ON COLUMN agency_packages.monthly_cost IS 'Monthly package price. Clients get 10% as self-service credits.';
COMMENT ON COLUMN agency_packages.is_active IS 'Whether this package is currently active';

