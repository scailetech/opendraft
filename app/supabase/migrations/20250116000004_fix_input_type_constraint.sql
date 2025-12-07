-- Fix input_type constraint to include 'campaign'
-- Allows campaign_analytics agent to use 'campaign' as input_type

-- Drop existing constraint
ALTER TABLE agent_definitions DROP CONSTRAINT IF EXISTS agent_definitions_input_type_check;

-- Add updated constraint with 'campaign' included
ALTER TABLE agent_definitions ADD CONSTRAINT agent_definitions_input_type_check 
  CHECK (input_type IN ('csv', 'leads', 'keywords', 'campaign', 'none'));

-- Update comment
COMMENT ON COLUMN agent_definitions.input_type IS 'Type of input required: csv, leads, keywords, campaign, or none';

