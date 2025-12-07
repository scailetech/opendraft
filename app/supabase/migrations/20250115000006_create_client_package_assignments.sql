-- Create Client Package Assignments Table
-- Links clients to packages with credit tracking
-- Part of GTM Engine transformation

CREATE TABLE IF NOT EXISTS client_package_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  package_id UUID NOT NULL REFERENCES agency_packages(id) ON DELETE CASCADE,
  
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused')),
  
  -- Self-service credits included with package (10% of monthly_cost)
  included_self_service_credits DECIMAL(10, 2) NOT NULL, -- Calculated: monthly_cost * 0.10, locked at billing period start
  used_self_service_credits DECIMAL(10, 2) DEFAULT 0, -- Track usage against credits (real-time updates)
  rolled_over_credits DECIMAL(10, 2) DEFAULT 0, -- Credits from previous month (rollover)
  billing_period_start TIMESTAMPTZ NOT NULL DEFAULT DATE_TRUNC('month', NOW()), -- Monthly billing period (resets monthly)
  
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(client_user_id, package_id) -- One package per client account
);

CREATE INDEX IF NOT EXISTS idx_client_assignments_client ON client_package_assignments(client_user_id);
CREATE INDEX IF NOT EXISTS idx_client_assignments_package ON client_package_assignments(package_id);

-- RLS Policies
ALTER TABLE client_package_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients can view own assignments"
  ON client_package_assignments FOR SELECT
  USING (auth.uid() = client_user_id);

CREATE POLICY "Agencies can manage client assignments"
  ON client_package_assignments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN agency_packages ap ON ap.agency_user_id = up.user_id
      WHERE up.user_id = auth.uid()
      AND ap.id = client_package_assignments.package_id
    )
  );

-- Add the missing RLS policy for clients to view assigned packages
CREATE POLICY "Clients can view assigned packages"
  ON agency_packages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM client_package_assignments cpa
      JOIN user_profiles up ON up.user_id = cpa.client_user_id
      WHERE cpa.package_id = agency_packages.id
      AND up.user_id = auth.uid()
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_client_package_assignments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_client_package_assignments_updated_at ON client_package_assignments;
CREATE TRIGGER update_client_package_assignments_updated_at
  BEFORE UPDATE ON client_package_assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_client_package_assignments_updated_at();

-- Column comments for documentation
COMMENT ON TABLE client_package_assignments IS 'Links clients to agency packages with credit tracking';
COMMENT ON COLUMN client_package_assignments.included_self_service_credits IS '10% of package monthly_cost, locked at billing period start';
COMMENT ON COLUMN client_package_assignments.used_self_service_credits IS 'Real-time tracking of credit usage';
COMMENT ON COLUMN client_package_assignments.rolled_over_credits IS 'Unused credits from previous month (rollover)';
COMMENT ON COLUMN client_package_assignments.billing_period_start IS 'Monthly billing period start (resets monthly)';

