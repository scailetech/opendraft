-- Create Business Contexts Table
-- Stores user's business context: ICP, countries, products, keywords
-- Part of GTM Engine transformation

CREATE TABLE IF NOT EXISTS business_contexts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Onboarding inputs
  icp TEXT, -- Ideal Customer Profile description
  countries TEXT[],
  products TEXT[],
  
  -- Generated/learned data
  target_keywords TEXT[],
  competitor_keywords TEXT[],
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_business_contexts_user ON business_contexts(user_id);

-- RLS Policies
ALTER TABLE business_contexts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own business context"
  ON business_contexts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own business context"
  ON business_contexts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own business context"
  ON business_contexts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own business context"
  ON business_contexts FOR DELETE
  USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_business_contexts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_business_contexts_updated_at ON business_contexts;
CREATE TRIGGER update_business_contexts_updated_at
  BEFORE UPDATE ON business_contexts
  FOR EACH ROW
  EXECUTE FUNCTION update_business_contexts_updated_at();

-- Column comments for documentation
COMMENT ON TABLE business_contexts IS 'User business context: ICP, target countries, products, and keywords';
COMMENT ON COLUMN business_contexts.icp IS 'Ideal Customer Profile description';
COMMENT ON COLUMN business_contexts.countries IS 'Target countries array';
COMMENT ON COLUMN business_contexts.products IS 'Product names array';
COMMENT ON COLUMN business_contexts.target_keywords IS 'Target keywords for SEO/content';
COMMENT ON COLUMN business_contexts.competitor_keywords IS 'Competitor keywords to track';


