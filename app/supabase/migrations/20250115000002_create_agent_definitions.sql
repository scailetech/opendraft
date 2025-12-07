-- Create Agent Definitions Table
-- Stores agent definitions that can be executed by users
-- Part of GTM Engine transformation

CREATE TABLE IF NOT EXISTS agent_definitions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  category TEXT CHECK (category IN ('data', 'content', 'analytics', 'automation')),
  modal_endpoint TEXT NOT NULL,
  input_type TEXT CHECK (input_type IN ('csv', 'leads', 'keywords', 'campaign', 'none')),
  output_type TEXT CHECK (output_type IN ('leads', 'keywords', 'content', 'analytics', 'campaign')),
  can_schedule BOOLEAN DEFAULT false,
  default_schedule TEXT,
  config_schema JSONB,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_definitions_category ON agent_definitions(category);
CREATE INDEX IF NOT EXISTS idx_agent_definitions_can_schedule ON agent_definitions(can_schedule);

-- No RLS needed - public read-only table
-- Users can read all agent definitions, but only system can insert/update

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_agent_definitions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_agent_definitions_updated_at ON agent_definitions;
CREATE TRIGGER update_agent_definitions_updated_at
  BEFORE UPDATE ON agent_definitions
  FOR EACH ROW
  EXECUTE FUNCTION update_agent_definitions_updated_at();

-- Seed agent definitions (use ON CONFLICT to avoid duplicates)
INSERT INTO agent_definitions (id, name, description, icon, category, modal_endpoint, input_type, output_type, can_schedule, enabled) VALUES
('bulk', 'Bulk Agent', 'Process CSV files with AI', '📄', 'data', 'modal://bulk_agent', 'csv', 'content', false, true),
('lead_crawler', 'Lead Crawler', 'Find leads from web sources', '🕷️', 'data', 'modal://lead_crawler', 'none', 'leads', true, true),
('lead_enricher', 'Lead Enricher', 'Enrich lead data with additional info', '✨', 'data', 'modal://lead_enricher', 'leads', 'leads', true, true),
('aeo_analytics', 'AEO Analytics', 'Analyze keywords and AEO metrics for Answer Engine Optimization', '📊', 'analytics', 'gtm://aeo_analytics', 'keywords', 'analytics', true, true),
('seo_content_writer', 'SEO Content Writer', 'Generate SEO-optimized content', '✍️', 'content', 'modal://seo_content_writer', 'keywords', 'content', false, true),
('outbound_copywriter', 'Outbound Copywriter', 'Create personalized outbound emails', '📧', 'content', 'modal://outbound_copywriter', 'leads', 'content', false, true),
('campaign_setup', 'Campaign Setup', 'Set up email or ad campaigns', '🚀', 'automation', 'modal://campaign_setup', 'leads', 'campaign', false, true),
('campaign_analytics', 'Campaign Analytics', 'Track campaign performance', '📈', 'analytics', 'modal://campaign_analytics', 'campaign', 'analytics', true, true),
('market_analytics', 'Market Analytics', 'Monitor Reddit, Google News mentions', '🌐', 'analytics', 'modal://market_analytics', 'keywords', 'analytics', true, true)
ON CONFLICT (id) DO NOTHING;

-- Column comments for documentation
COMMENT ON TABLE agent_definitions IS 'Agent definitions that users can execute. Public read-only table.';
COMMENT ON COLUMN agent_definitions.id IS 'Unique agent identifier (e.g., bulk, lead_crawler)';
COMMENT ON COLUMN agent_definitions.modal_endpoint IS 'Modal backend endpoint for agent execution';
COMMENT ON COLUMN agent_definitions.input_type IS 'Type of input required: csv, leads, keywords, campaign, or none';
COMMENT ON COLUMN agent_definitions.output_type IS 'Type of output produced: leads, keywords, content, analytics, or campaign';
COMMENT ON COLUMN agent_definitions.can_schedule IS 'Whether this agent can be scheduled';
COMMENT ON COLUMN agent_definitions.config_schema IS 'JSON schema for agent-specific configuration';
