-- Add enabled column to agent_definitions if it doesn't exist
-- Migration 2 was updated but may have been run before the update

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'agent_definitions' AND column_name = 'enabled'
  ) THEN
    ALTER TABLE agent_definitions ADD COLUMN enabled BOOLEAN DEFAULT true;
    
    -- Update any existing rows to be enabled
    UPDATE agent_definitions SET enabled = true WHERE enabled IS NULL;
    
    -- Add comment
    COMMENT ON COLUMN agent_definitions.enabled IS 'Whether this agent is currently available for use';
  END IF;
END $$;

