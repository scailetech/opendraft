-- Migration: Unified Business Contexts Schema
-- Date: 2025-01-16
-- Description: Creates/updates business_contexts table with all fields:
--   - Base business context (ICP, countries, products, keywords)
--   - Context variables (tone, product description, etc.)
--   - GTM classification (playbook, product type, AI tracking)
-- This migration is idempotent and consolidates all previous migrations

-- Create table if it doesn't exist
CREATE TABLE IF NOT EXISTS business_contexts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Base Business Context Fields
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'business_contexts' AND column_name = 'icp'
  ) THEN
    ALTER TABLE business_contexts ADD COLUMN icp TEXT;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'business_contexts' AND column_name = 'countries'
  ) THEN
    ALTER TABLE business_contexts ADD COLUMN countries TEXT[];
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'business_contexts' AND column_name = 'products'
  ) THEN
    ALTER TABLE business_contexts ADD COLUMN products TEXT[];
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'business_contexts' AND column_name = 'target_keywords'
  ) THEN
    ALTER TABLE business_contexts ADD COLUMN target_keywords TEXT[];
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'business_contexts' AND column_name = 'competitor_keywords'
  ) THEN
    ALTER TABLE business_contexts ADD COLUMN competitor_keywords TEXT[];
  END IF;
END $$;

-- Context Variables Fields
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'business_contexts' AND column_name = 'tone'
  ) THEN
    ALTER TABLE business_contexts ADD COLUMN tone TEXT;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'business_contexts' AND column_name = 'target_countries'
  ) THEN
    ALTER TABLE business_contexts ADD COLUMN target_countries TEXT;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'business_contexts' AND column_name = 'product_description'
  ) THEN
    ALTER TABLE business_contexts ADD COLUMN product_description TEXT;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'business_contexts' AND column_name = 'competitors'
  ) THEN
    ALTER TABLE business_contexts ADD COLUMN competitors TEXT;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'business_contexts' AND column_name = 'target_industries'
  ) THEN
    ALTER TABLE business_contexts ADD COLUMN target_industries TEXT;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'business_contexts' AND column_name = 'compliance_flags'
  ) THEN
    ALTER TABLE business_contexts ADD COLUMN compliance_flags TEXT;
  END IF;
END $$;

-- GTM Classification Fields
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'business_contexts' AND column_name = 'gtm_playbook'
  ) THEN
    ALTER TABLE business_contexts ADD COLUMN gtm_playbook TEXT CHECK (gtm_playbook IN (
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
    WHERE table_name = 'business_contexts' AND column_name = 'product_type'
  ) THEN
    ALTER TABLE business_contexts ADD COLUMN product_type TEXT;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'business_contexts' AND column_name = 'gtm_playbook_ai_suggested'
  ) THEN
    ALTER TABLE business_contexts ADD COLUMN gtm_playbook_ai_suggested BOOLEAN DEFAULT false;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'business_contexts' AND column_name = 'product_type_ai_suggested'
  ) THEN
    ALTER TABLE business_contexts ADD COLUMN product_type_ai_suggested BOOLEAN DEFAULT false;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'business_contexts' AND column_name = 'gtm_playbook_confidence'
  ) THEN
    ALTER TABLE business_contexts ADD COLUMN gtm_playbook_confidence DECIMAL(3,2) CHECK (
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
    ALTER TABLE business_contexts ADD COLUMN product_type_confidence DECIMAL(3,2) CHECK (
      product_type_confidence >= 0 AND product_type_confidence <= 1
    );
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'business_contexts' AND column_name = 'gtm_playbook_manually_overridden'
  ) THEN
    ALTER TABLE business_contexts ADD COLUMN gtm_playbook_manually_overridden BOOLEAN DEFAULT false;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'business_contexts' AND column_name = 'product_type_manually_overridden'
  ) THEN
    ALTER TABLE business_contexts ADD COLUMN product_type_manually_overridden BOOLEAN DEFAULT false;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'business_contexts' AND column_name = 'gtm_playbook_ai_suggestion'
  ) THEN
    ALTER TABLE business_contexts ADD COLUMN gtm_playbook_ai_suggestion TEXT CHECK (gtm_playbook_ai_suggestion IN (
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
    ALTER TABLE business_contexts ADD COLUMN product_type_ai_suggestion TEXT;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'business_contexts' AND column_name = 'migration_banner_shown'
  ) THEN
    ALTER TABLE business_contexts ADD COLUMN migration_banner_shown BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_business_contexts_user ON business_contexts(user_id);
CREATE INDEX IF NOT EXISTS idx_business_contexts_playbook 
ON business_contexts(gtm_playbook) 
WHERE gtm_playbook IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_business_contexts_product_type 
ON business_contexts(product_type) 
WHERE product_type IS NOT NULL;

-- RLS Policies (idempotent)
ALTER TABLE business_contexts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own business context" ON business_contexts;
CREATE POLICY "Users can view own business context"
  ON business_contexts FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own business context" ON business_contexts;
CREATE POLICY "Users can insert own business context"
  ON business_contexts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own business context" ON business_contexts;
CREATE POLICY "Users can update own business context"
  ON business_contexts FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own business context" ON business_contexts;
CREATE POLICY "Users can delete own business context"
  ON business_contexts FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_business_contexts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_business_contexts_updated_at ON business_contexts;
CREATE TRIGGER update_business_contexts_updated_at
  BEFORE UPDATE ON business_contexts
  FOR EACH ROW
  EXECUTE FUNCTION update_business_contexts_updated_at();

-- Column comments
COMMENT ON TABLE business_contexts IS 'Unified business context: ICP, countries, products, keywords, business context variables, and GTM classification';
COMMENT ON COLUMN business_contexts.icp IS 'Ideal Customer Profile description';
COMMENT ON COLUMN business_contexts.countries IS 'Target countries array';
COMMENT ON COLUMN business_contexts.products IS 'Product names array';
COMMENT ON COLUMN business_contexts.target_keywords IS 'Target keywords for SEO/content';
COMMENT ON COLUMN business_contexts.competitor_keywords IS 'Competitor keywords to track';
COMMENT ON COLUMN business_contexts.tone IS 'Writing style and voice for AI-generated content';
COMMENT ON COLUMN business_contexts.target_countries IS 'Geographic markets for content (comma-separated, legacy field)';
COMMENT ON COLUMN business_contexts.product_description IS 'Brief description of product or service';
COMMENT ON COLUMN business_contexts.competitors IS 'Main competitors to reference in content (comma-separated)';
COMMENT ON COLUMN business_contexts.target_industries IS 'Target industries for content (comma-separated)';
COMMENT ON COLUMN business_contexts.compliance_flags IS 'Compliance standards to mention (comma-separated)';
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

