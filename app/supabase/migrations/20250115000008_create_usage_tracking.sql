-- Create Usage Tracking Table (Billing)
-- Tracks AI API token usage per batch/agent run
-- Part of GTM Engine transformation

CREATE TABLE IF NOT EXISTS usage_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  batch_id TEXT REFERENCES batches(id) ON DELETE SET NULL,
  agent_id TEXT, -- References agent_definitions(id) - FK constraint added conditionally below
  
  -- Usage type: package run or self-service
  usage_type TEXT NOT NULL CHECK (usage_type IN ('package', 'self_service')) DEFAULT 'self_service',
  package_id UUID REFERENCES agency_packages(id), -- If usage_type='package', link to package
  
  -- Token usage
  model TEXT NOT NULL, -- e.g., 'gpt-4', 'gpt-3.5-turbo', 'claude-3-opus'
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER NOT NULL DEFAULT 0,
  
  -- Cost tracking
  api_cost DECIMAL(10, 6) NOT NULL, -- Actual API cost from provider
  billing_amount DECIMAL(10, 2) NOT NULL, -- Amount to bill (10x for self-service, 0 if covered by credits)
  covered_by_credits BOOLEAN DEFAULT false, -- If self-service usage covered by included credits
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add foreign key constraint if agent_definitions table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'agent_definitions') THEN
    -- Add FK constraint if table exists
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'usage_tracking_agent_id_fkey'
    ) THEN
      ALTER TABLE usage_tracking 
      ADD CONSTRAINT usage_tracking_agent_id_fkey 
      FOREIGN KEY (agent_id) REFERENCES agent_definitions(id);
    END IF;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_usage_tracking_user ON usage_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_batch ON usage_tracking(batch_id);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_created ON usage_tracking(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_type ON usage_tracking(usage_type);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_package ON usage_tracking(package_id) WHERE package_id IS NOT NULL;

-- RLS Policies
ALTER TABLE usage_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own usage"
  ON usage_tracking FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Agencies can view client usage"
  ON usage_tracking FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.user_id = auth.uid()
      AND up.user_type = 'agency'
      AND EXISTS (
        SELECT 1 FROM user_profiles client_up
        WHERE client_up.agency_id = up.user_id
        AND client_up.user_id = usage_tracking.user_id
      )
    )
  );

CREATE POLICY "Service role can insert usage"
  ON usage_tracking FOR INSERT
  WITH CHECK (auth.role() = 'service_role' OR auth.uid() = user_id);

-- Column comments for documentation
COMMENT ON TABLE usage_tracking IS 'Tracks AI API token usage for billing calculation';
COMMENT ON COLUMN usage_tracking.usage_type IS 'package (covered by subscription) or self_service (uses credits or billed)';
COMMENT ON COLUMN usage_tracking.api_cost IS 'Actual cost from API provider';
COMMENT ON COLUMN usage_tracking.billing_amount IS 'Amount to bill: 10x for self-service, 0 if covered by credits';
COMMENT ON COLUMN usage_tracking.covered_by_credits IS 'Whether self-service usage was covered by included credits';

