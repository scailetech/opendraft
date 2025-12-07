-- Create Resources Table
-- Unified data storage for leads, keywords, content, and campaigns
-- Part of GTM Engine transformation

CREATE TABLE IF NOT EXISTS resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Type discriminator
  type TEXT NOT NULL CHECK (type IN ('lead', 'keyword', 'content', 'campaign')),
  
  -- Flexible data storage (JSONB)
  data JSONB NOT NULL,
  
  -- Source tracking (answers: customer/tool/generated)
  source_type TEXT NOT NULL CHECK (source_type IN ('customer', 'tool', 'generated')),
  source_name TEXT NOT NULL, -- 'csv_upload', 'hubspot', 'lead_crawler', 'manual', etc.
  source_id TEXT, -- External ID if applicable (hubspot contact ID, etc.)
  
  -- Lineage: which batch/agent created this
  batch_id TEXT REFERENCES batches(id) ON DELETE SET NULL,
  agent_id TEXT, -- Which agent created this
  
  -- Metadata
  tags TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_resources_user_type ON resources(user_id, type);
CREATE INDEX IF NOT EXISTS idx_resources_source ON resources(user_id, source_type, source_name);
CREATE INDEX IF NOT EXISTS idx_resources_batch ON resources(batch_id);
CREATE INDEX IF NOT EXISTS idx_resources_agent ON resources(agent_id);
CREATE INDEX IF NOT EXISTS idx_resources_created ON resources(created_at DESC);

-- JSONB indexes for common queries (using B-tree for text fields)
CREATE INDEX IF NOT EXISTS idx_resources_data_email ON resources ((data->>'email'));
CREATE INDEX IF NOT EXISTS idx_resources_data_keyword ON resources ((data->>'keyword'));
CREATE INDEX IF NOT EXISTS idx_resources_data_company ON resources ((data->>'company'));

-- RLS Policies
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own resources"
  ON resources FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own resources"
  ON resources FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own resources"
  ON resources FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own resources"
  ON resources FOR DELETE
  USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_resources_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_resources_updated_at ON resources;
CREATE TRIGGER update_resources_updated_at
  BEFORE UPDATE ON resources
  FOR EACH ROW
  EXECUTE FUNCTION update_resources_updated_at();

-- Column comments for documentation
COMMENT ON TABLE resources IS 'Unified storage for all GTM resources: leads, keywords, content, and campaigns';
COMMENT ON COLUMN resources.type IS 'Resource type: lead, keyword, content, or campaign';
COMMENT ON COLUMN resources.data IS 'Flexible JSONB storage for resource-specific data';
COMMENT ON COLUMN resources.source_type IS 'Origin of resource: customer (user uploaded), tool (from integration), or generated (by agent)';
COMMENT ON COLUMN resources.source_name IS 'Specific source identifier (e.g., csv_upload, hubspot, lead_crawler)';
COMMENT ON COLUMN resources.batch_id IS 'Reference to batch that created/updated this resource (TEXT to match batches.id type)';
COMMENT ON COLUMN resources.agent_id IS 'Reference to agent definition that created this resource';


