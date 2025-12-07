-- Migration: Add GTM Playbook and Product Type fields to business_contexts
-- Date: 2025-01-16
-- Description: Adds GTM classification fields with AI tracking and override support

-- Add GTM playbook field
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'business_contexts' AND column_name = 'gtm_playbook'
  ) THEN
    ALTER TABLE business_contexts 
    ADD COLUMN gtm_playbook TEXT CHECK (gtm_playbook IN (
      'sales_led', 
      'plg', 
      'hybrid', 
      'channel_led', 
      'enterprise_infra'
    ));
  END IF;
END $$;

-- Add product type field (free text for flexibility, but we'll validate in app)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'business_contexts' AND column_name = 'product_type'
  ) THEN
    ALTER TABLE business_contexts 
    ADD COLUMN product_type TEXT;
  END IF;
END $$;

-- Add AI suggestion tracking fields
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'business_contexts' AND column_name = 'gtm_playbook_ai_suggested'
  ) THEN
    ALTER TABLE business_contexts 
    ADD COLUMN gtm_playbook_ai_suggested BOOLEAN DEFAULT false;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'business_contexts' AND column_name = 'product_type_ai_suggested'
  ) THEN
    ALTER TABLE business_contexts 
    ADD COLUMN product_type_ai_suggested BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Add confidence scores (0.00 to 1.00)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'business_contexts' AND column_name = 'gtm_playbook_confidence'
  ) THEN
    ALTER TABLE business_contexts 
    ADD COLUMN gtm_playbook_confidence DECIMAL(3,2) CHECK (
      gtm_playbook_confidence >= 0 AND gtm_playbook_confidence <= 1
    );
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'business_contexts' AND column_name = 'product_type_confidence'
  ) THEN
    ALTER TABLE business_contexts 
    ADD COLUMN product_type_confidence DECIMAL(3,2) CHECK (
      product_type_confidence >= 0 AND product_type_confidence <= 1
    );
  END IF;
END $$;

-- Add manual override tracking
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'business_contexts' AND column_name = 'gtm_playbook_manually_overridden'
  ) THEN
    ALTER TABLE business_contexts 
    ADD COLUMN gtm_playbook_manually_overridden BOOLEAN DEFAULT false;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'business_contexts' AND column_name = 'product_type_manually_overridden'
  ) THEN
    ALTER TABLE business_contexts 
    ADD COLUMN product_type_manually_overridden BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Add AI suggestion storage (what AI suggested vs what user selected)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'business_contexts' AND column_name = 'gtm_playbook_ai_suggestion'
  ) THEN
    ALTER TABLE business_contexts 
    ADD COLUMN gtm_playbook_ai_suggestion TEXT CHECK (gtm_playbook_ai_suggestion IN (
      'sales_led', 
      'plg', 
      'hybrid', 
      'channel_led', 
      'enterprise_infra'
    ));
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'business_contexts' AND column_name = 'product_type_ai_suggestion'
  ) THEN
    ALTER TABLE business_contexts 
    ADD COLUMN product_type_ai_suggestion TEXT;
  END IF;
END $$;

-- Add migration banner tracking (for existing users)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'business_contexts' AND column_name = 'migration_banner_shown'
  ) THEN
    ALTER TABLE business_contexts 
    ADD COLUMN migration_banner_shown BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Create index for filtering by playbook
CREATE INDEX IF NOT EXISTS idx_business_contexts_playbook 
ON business_contexts(gtm_playbook) 
WHERE gtm_playbook IS NOT NULL;

-- Create index for filtering by product type
CREATE INDEX IF NOT EXISTS idx_business_contexts_product_type 
ON business_contexts(product_type) 
WHERE product_type IS NOT NULL;

-- Add column comments for documentation
COMMENT ON COLUMN business_contexts.gtm_playbook IS 'GTM playbook type: sales_led, plg, hybrid, channel_led, or enterprise_infra';
COMMENT ON COLUMN business_contexts.product_type IS 'Product type category (e.g., devtools, fintech, hr, etc.)';
COMMENT ON COLUMN business_contexts.gtm_playbook_ai_suggested IS 'Whether the GTM playbook was suggested by AI';
COMMENT ON COLUMN business_contexts.product_type_ai_suggested IS 'Whether the product type was suggested by AI';
COMMENT ON COLUMN business_contexts.gtm_playbook_confidence IS 'AI confidence score for GTM playbook (0.00 to 1.00)';
COMMENT ON COLUMN business_contexts.product_type_confidence IS 'AI confidence score for product type (0.00 to 1.00)';
COMMENT ON COLUMN business_contexts.gtm_playbook_manually_overridden IS 'Whether user manually overrode AI suggestion for GTM playbook';
COMMENT ON COLUMN business_contexts.product_type_manually_overridden IS 'Whether user manually overrode AI suggestion for product type';
COMMENT ON COLUMN business_contexts.gtm_playbook_ai_suggestion IS 'What AI suggested for GTM playbook (stored even if overridden)';
COMMENT ON COLUMN business_contexts.product_type_ai_suggestion IS 'What AI suggested for product type (stored even if overridden)';
COMMENT ON COLUMN business_contexts.migration_banner_shown IS 'Whether migration banner has been shown to user';


