-- Migration: Add Marketing Strategy Fields to business_contexts
-- Date: 2025-01-16
-- Description: Adds Value Proposition and Marketing Goals fields for marketing strategy

-- Add value_proposition field
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'business_contexts' AND column_name = 'value_proposition'
  ) THEN
    ALTER TABLE business_contexts 
    ADD COLUMN value_proposition TEXT;
  END IF;
END $$;

-- Add marketing_goals field (array)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'business_contexts' AND column_name = 'marketing_goals'
  ) THEN
    ALTER TABLE business_contexts 
    ADD COLUMN marketing_goals TEXT[];
  END IF;
END $$;

-- Add column comments
COMMENT ON COLUMN business_contexts.value_proposition IS 'Value proposition statement for marketing strategy';
COMMENT ON COLUMN business_contexts.marketing_goals IS 'Array of marketing goals (e.g., Generate qualified leads, Build thought leadership)';

