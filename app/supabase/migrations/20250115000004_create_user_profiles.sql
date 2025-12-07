-- Create User Profiles Table (Agency/Client Management)
-- Stores user types and agency/client relationships
-- Part of GTM Engine transformation

CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- User type: everyone has self-service access, clients get packages ON TOP
  user_type TEXT NOT NULL DEFAULT 'self_service' CHECK (user_type IN ('self_service', 'client', 'agency')),
  
  -- For clients: which agency manages them
  agency_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- For clients: onboarding link used to assign them
  onboarding_link TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_type ON user_profiles(user_type);
CREATE INDEX IF NOT EXISTS idx_user_profiles_agency ON user_profiles(agency_id);

-- RLS Policies
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Agencies can view client profiles"
  ON user_profiles FOR SELECT
  USING (
    auth.uid() = agency_id OR 
    auth.uid() = user_id
  );

CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_user_profiles_updated_at();

-- Column comments for documentation
COMMENT ON TABLE user_profiles IS 'User profiles with type (self_service/client/agency) and agency relationships';
COMMENT ON COLUMN user_profiles.user_type IS 'User type: self_service (default), client (has agency), or agency (manages clients)';
COMMENT ON COLUMN user_profiles.agency_id IS 'For clients: reference to agency user_id that manages them';
COMMENT ON COLUMN user_profiles.onboarding_link IS 'For clients: onboarding link used to assign them to agency';

