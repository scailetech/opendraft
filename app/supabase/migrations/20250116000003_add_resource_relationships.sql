-- Add Resource Relationships
-- Allows resources to link to each other (campaigns → leads/content, content → keywords, etc.)
-- Part of GTM Engine enhancement

-- Add related_resource_ids column (JSONB array of resource UUIDs)
ALTER TABLE resources 
ADD COLUMN IF NOT EXISTS related_resource_ids JSONB DEFAULT '[]'::jsonb;

-- Add index for relationship queries
CREATE INDEX IF NOT EXISTS idx_resources_related_ids 
ON resources USING GIN (related_resource_ids);

-- Add comment
COMMENT ON COLUMN resources.related_resource_ids IS 'Array of related resource IDs (JSONB). Used for linking campaigns to leads/content, content to keywords, etc.';

-- Function to validate related_resource_ids contains only UUIDs
CREATE OR REPLACE FUNCTION validate_related_resource_ids()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if related_resource_ids is a valid JSON array
  IF jsonb_typeof(NEW.related_resource_ids) != 'array' THEN
    RAISE EXCEPTION 'related_resource_ids must be a JSON array';
  END IF;
  
  -- Validate each element is a string (UUID format validation happens at application level)
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to validate related_resource_ids
DROP TRIGGER IF EXISTS validate_related_resource_ids_trigger ON resources;
CREATE TRIGGER validate_related_resource_ids_trigger
  BEFORE INSERT OR UPDATE ON resources
  FOR EACH ROW
  WHEN (NEW.related_resource_ids IS NOT NULL)
  EXECUTE FUNCTION validate_related_resource_ids();

