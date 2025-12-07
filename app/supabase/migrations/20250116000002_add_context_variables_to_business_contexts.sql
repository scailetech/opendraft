-- Migration: Add Business Context Variables to business_contexts
-- Date: 2025-01-16
-- Description: Adds business context variable fields for prompt templating (migrated from localStorage)

-- Add context variable fields
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'business_contexts' AND column_name = 'tone'
  ) THEN
    ALTER TABLE business_contexts 
    ADD COLUMN tone TEXT;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'business_contexts' AND column_name = 'target_countries'
  ) THEN
    ALTER TABLE business_contexts 
    ADD COLUMN target_countries TEXT;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'business_contexts' AND column_name = 'product_description'
  ) THEN
    ALTER TABLE business_contexts 
    ADD COLUMN product_description TEXT;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'business_contexts' AND column_name = 'competitors'
  ) THEN
    ALTER TABLE business_contexts 
    ADD COLUMN competitors TEXT;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'business_contexts' AND column_name = 'target_industries'
  ) THEN
    ALTER TABLE business_contexts 
    ADD COLUMN target_industries TEXT;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'business_contexts' AND column_name = 'compliance_flags'
  ) THEN
    ALTER TABLE business_contexts 
    ADD COLUMN compliance_flags TEXT;
  END IF;
END $$;

-- Add column comments
COMMENT ON COLUMN business_contexts.tone IS 'Writing style and voice for AI-generated content (business context variable)';
COMMENT ON COLUMN business_contexts.target_countries IS 'Geographic markets for content (comma-separated, business context variable)';
COMMENT ON COLUMN business_contexts.product_description IS 'Brief description of product or service (business context variable)';
COMMENT ON COLUMN business_contexts.competitors IS 'Main competitors to reference in content (comma-separated, business context variable)';
COMMENT ON COLUMN business_contexts.target_industries IS 'Target industries for content (comma-separated, business context variable)';
COMMENT ON COLUMN business_contexts.compliance_flags IS 'Compliance standards to mention (comma-separated, business context variable)';

