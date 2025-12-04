-- Academic Thesis AI Waitlist Database Schema
-- Run this in Supabase SQL Editor after creating your project
-- Supports: Viral referrals, queue management, file delivery, spam prevention

-- ============================================================================
-- MAIN TABLES
-- ============================================================================

-- Waitlist entries with queue position tracking and viral referrals
CREATE TABLE waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- User information
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  thesis_topic TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'en',
  academic_level TEXT NOT NULL, -- 'bachelor', 'master', 'phd'

  -- Queue management
  position INTEGER NOT NULL,
  original_position INTEGER NOT NULL,
  referral_code TEXT UNIQUE NOT NULL,
  referred_by_code TEXT REFERENCES waitlist(referral_code) ON DELETE SET NULL,

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'processing', 'completed', 'failed')),
  processing_started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- File URLs (Supabase Storage signed URLs)
  pdf_url TEXT,
  docx_url TEXT,

  -- Email verification
  email_verified BOOLEAN DEFAULT FALSE NOT NULL,
  verification_token TEXT UNIQUE,
  verification_token_expires_at TIMESTAMPTZ,
  verified_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Anti-spam tracking
  ip_address TEXT,
  user_agent TEXT
);

-- Referral tracking for viral loop (3 verified referrals = skip 100 positions)
CREATE TABLE referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_code TEXT NOT NULL REFERENCES waitlist(referral_code) ON DELETE CASCADE,
  referee_email TEXT NOT NULL REFERENCES waitlist(email) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  rewarded BOOLEAN DEFAULT FALSE NOT NULL, -- True when skip was applied

  UNIQUE(referrer_code, referee_email)
);

-- Daily processing statistics
CREATE TABLE daily_processing_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL UNIQUE,
  processed_count INTEGER DEFAULT 0 NOT NULL,
  failed_count INTEGER DEFAULT 0 NOT NULL,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Fast queue position lookups (only waiting users)
CREATE INDEX idx_waitlist_position ON waitlist(position) WHERE status = 'waiting';

-- Fast status filtering
CREATE INDEX idx_waitlist_status ON waitlist(status);

-- Fast email lookups for verification
CREATE INDEX idx_waitlist_email ON waitlist(email);

-- Fast referral code lookups
CREATE INDEX idx_waitlist_referral_code ON waitlist(referral_code);

-- Fast referral tracking
CREATE INDEX idx_referrals_code ON referrals(referrer_code);
CREATE INDEX idx_referrals_email ON referrals(referee_email);

-- Fast date filtering for logs
CREATE INDEX idx_daily_log_date ON daily_processing_log(date);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_waitlist_updated_at
  BEFORE UPDATE ON waitlist
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_processing_log ENABLE ROW LEVEL SECURITY;

-- Users can only view their own waitlist entry
CREATE POLICY "Users can view their own waitlist entry"
  ON waitlist
  FOR SELECT
  USING (auth.jwt() ->> 'email' = email);

-- Service role can do everything (for Modal backend)
CREATE POLICY "Service role has full access to waitlist"
  ON waitlist
  FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to referrals"
  ON referrals
  FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to logs"
  ON daily_processing_log
  FOR ALL
  USING (auth.role() = 'service_role');

-- Anonymous users can insert (for signup)
CREATE POLICY "Anyone can insert to waitlist"
  ON waitlist
  FOR INSERT
  WITH CHECK (true);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to update queue position (for referral rewards)
CREATE OR REPLACE FUNCTION update_position(
  p_referral_code TEXT,
  p_position_change INTEGER
)
RETURNS VOID AS $$
BEGIN
  UPDATE waitlist
  SET position = GREATEST(1, position + p_position_change)
  WHERE referral_code = p_referral_code
    AND status = 'waiting';
END;
$$ LANGUAGE plpgsql;

-- Function to rebuild queue positions (run nightly to fix any gaps)
CREATE OR REPLACE FUNCTION rebuild_queue_positions()
RETURNS VOID AS $$
BEGIN
  WITH ranked_users AS (
    SELECT
      id,
      ROW_NUMBER() OVER (ORDER BY created_at) -
      COALESCE((
        SELECT COUNT(*) * 100 / 3
        FROM referrals
        WHERE referrer_code = waitlist.referral_code
          AND rewarded = true
      ), 0) AS new_position
    FROM waitlist
    WHERE status = 'waiting'
      AND email_verified = true
  )
  UPDATE waitlist
  SET position = GREATEST(1, ranked_users.new_position)
  FROM ranked_users
  WHERE waitlist.id = ranked_users.id;
END;
$$ LANGUAGE plpgsql;

-- Function to get verified referral count
CREATE OR REPLACE FUNCTION get_verified_referral_count(p_referral_code TEXT)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO v_count
  FROM referrals r
  JOIN waitlist w ON r.referee_email = w.email
  WHERE r.referrer_code = p_referral_code
    AND w.email_verified = true;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STORAGE BUCKETS
-- ============================================================================

-- Create 'thesis-files' bucket for PDF/DOCX storage
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'thesis-files',
  'thesis-files',
  false, -- Private bucket (use signed URLs)
  10485760, -- 10MB limit
  ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies
-- Note: Service role bypasses RLS, so these are for anon/authenticated users only

-- Users can download their own thesis files (via signed URLs)
CREATE POLICY "Users can download their own thesis files"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'thesis-files' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Service role can manage all files (this policy is redundant but explicit)
CREATE POLICY "Service role can manage thesis files"
  ON storage.objects
  FOR ALL
  USING (bucket_id = 'thesis-files' AND auth.role() = 'service_role');

-- ============================================================================
-- SAMPLE DATA (Optional - for testing)
-- ============================================================================

-- Insert a test user
-- INSERT INTO waitlist (
--   email,
--   full_name,
--   thesis_topic,
--   language,
--   academic_level,
--   position,
--   original_position,
--   referral_code,
--   email_verified
-- ) VALUES (
--   'test@example.com',
--   'Test User',
--   'Machine Learning for Climate Prediction',
--   'en',
--   'master',
--   1,
--   1,
--   'ABC123XYZ',
--   true
-- );

-- ============================================================================
-- NOTES FOR DEPLOYMENT
-- ============================================================================

-- 1. Create Supabase project: https://supabase.com/dashboard/projects
-- 2. Run this entire schema in: Dashboard → SQL Editor → New Query
-- 3. Create storage bucket: Dashboard → Storage → New Bucket → 'thesis-files'
-- 4. Set up auto-deletion (7 days): Storage → thesis-files → Settings → Lifecycle
-- 5. Get credentials for .env.local:
--    - NEXT_PUBLIC_SUPABASE_URL: Dashboard → Settings → API → Project URL
--    - NEXT_PUBLIC_SUPABASE_ANON_KEY: Dashboard → Settings → API → anon public
--    - SUPABASE_SERVICE_ROLE_KEY: Dashboard → Settings → API → service_role (secret!)
-- 6. For Modal backend, add service_role key to Modal secrets:
--    modal secret create supabase-credentials SUPABASE_URL=... SUPABASE_SERVICE_KEY=...
