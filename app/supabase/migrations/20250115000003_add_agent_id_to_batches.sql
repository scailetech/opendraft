-- Add agent_id and agent_config columns to batches table
-- Links batches to agent definitions and stores agent-specific configuration
-- Part of GTM Engine transformation

DO $$
BEGIN
  -- Add agent_id column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                WHERE table_name='batches' AND column_name='agent_id') THEN
    ALTER TABLE batches ADD COLUMN agent_id TEXT;
  END IF;

  -- Add agent_config column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                WHERE table_name='batches' AND column_name='agent_config') THEN
    ALTER TABLE batches ADD COLUMN agent_config JSONB;
  END IF;
END $$;

-- Add index on agent_id for performance
CREATE INDEX IF NOT EXISTS idx_batches_agent_id ON batches(agent_id);

-- Add column comments for documentation
COMMENT ON COLUMN batches.agent_id IS 'Reference to agent_definition.id that created this batch';
COMMENT ON COLUMN batches.agent_config IS 'Agent-specific configuration used for this batch (e.g., selected tools, input columns, etc.)';


