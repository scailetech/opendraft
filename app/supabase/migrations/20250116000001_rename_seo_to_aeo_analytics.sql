-- Rename seo_analytics to aeo_analytics
-- Updates agent definition to use AEO terminology (hotter term for 2025)
-- Safe to run even if table doesn't exist yet (will be created by earlier migration)

DO $$
BEGIN
  -- Only rename if table exists and seo_analytics exists
  -- Note: Can't UPDATE primary key, so we DELETE and INSERT instead
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'agent_definitions'
  ) AND EXISTS (
    SELECT 1 FROM agent_definitions WHERE id = 'seo_analytics'
  ) AND NOT EXISTS (
    SELECT 1 FROM agent_definitions WHERE id = 'aeo_analytics'
  ) THEN
    -- Insert new aeo_analytics record with updated values
    INSERT INTO agent_definitions (
      id, name, description, icon, category, modal_endpoint, 
      input_type, output_type, can_schedule, enabled, created_at, updated_at
    )
    SELECT 
      'aeo_analytics',
      'AEO Analytics',
      'Analyze keywords and AEO metrics for Answer Engine Optimization',
      icon,
      category,
      'gtm://aeo_analytics',
      input_type,
      output_type,
      can_schedule,
      enabled,
      created_at,
      NOW()
    FROM agent_definitions
    WHERE id = 'seo_analytics';
    
    -- Delete old seo_analytics record
    DELETE FROM agent_definitions WHERE id = 'seo_analytics';
  END IF;
END $$;

-- Update any existing batches that reference seo_analytics (safe if table doesn't exist)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'batches') THEN
    UPDATE batches
    SET agent_id = 'aeo_analytics'
    WHERE agent_id = 'seo_analytics';
  END IF;
END $$;

-- Update any existing scheduled_runs that reference seo_analytics (safe if table doesn't exist)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'scheduled_runs') THEN
    UPDATE scheduled_runs
    SET agent_type = 'aeo_analytics'
    WHERE agent_type = 'seo_analytics';
  END IF;
END $$;

-- Update any existing usage_tracking that references seo_analytics (safe if table doesn't exist)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'usage_tracking') THEN
    UPDATE usage_tracking
    SET agent_id = 'aeo_analytics'
    WHERE agent_id = 'seo_analytics';
  END IF;
END $$;

-- Verify the update (optional - will show result if table exists)
-- Note: This SELECT will fail silently if table doesn't exist yet (that's OK)
-- The migration is safe to run even if verification fails

