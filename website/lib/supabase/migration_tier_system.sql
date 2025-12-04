-- ============================================================================
-- MIGRATION: Tier System & Two-Sided Incentives
-- ============================================================================
-- This migration adds support for:
-- 1. Tiered referral rewards (5 tiers)
-- 2. Two-sided incentives (referee bonus)
-- 3. Anti-fraud tracking
-- 4. University email bonuses
-- ============================================================================

-- Add new columns to waitlist table for tier tracking
ALTER TABLE waitlist
ADD COLUMN IF NOT EXISTS verified_referrals INTEGER DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS current_tier INTEGER DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS is_university_email BOOLEAN DEFAULT FALSE NOT NULL,
ADD COLUMN IF NOT EXISTS position_bonus_applied INTEGER DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS manual_review_required BOOLEAN DEFAULT FALSE NOT NULL,
ADD COLUMN IF NOT EXISTS fraud_flags TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Add new columns to referrals table for two-sided incentives and fraud detection
ALTER TABLE referrals
ADD COLUMN IF NOT EXISTS referee_bonus_applied BOOLEAN DEFAULT FALSE NOT NULL,
ADD COLUMN IF NOT EXISTS referee_verification_status TEXT DEFAULT 'pending' CHECK (referee_verification_status IN ('pending', 'verified', 'expired', 'fraud')),
ADD COLUMN IF NOT EXISTS ip_address TEXT,
ADD COLUMN IF NOT EXISTS user_agent TEXT;

-- Add indexes for new columns
CREATE INDEX IF NOT EXISTS idx_waitlist_verified_referrals ON waitlist(verified_referrals);
CREATE INDEX IF NOT EXISTS idx_waitlist_current_tier ON waitlist(current_tier);
CREATE INDEX IF NOT EXISTS idx_waitlist_manual_review ON waitlist(manual_review_required) WHERE manual_review_required = true;

-- ============================================================================
-- UPDATED FUNCTION: Calculate Proportional Ranking (Tiered System)
-- ============================================================================
-- New algorithm: ORDER BY verified_referrals DESC, created_at ASC
-- This replaces fixed position skipping with proportional ranking

CREATE OR REPLACE FUNCTION rebuild_queue_positions_tiered()
RETURNS VOID AS $$
BEGIN
  WITH ranked_users AS (
    SELECT
      id,
      ROW_NUMBER() OVER (
        ORDER BY
          verified_referrals DESC,
          created_at ASC
      ) AS new_position
    FROM waitlist
    WHERE status = 'waiting'
      AND email_verified = true
  )
  UPDATE waitlist
  SET position = ranked_users.new_position
  FROM ranked_users
  WHERE waitlist.id = ranked_users.id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCTION: Update Tier and Verified Referral Count
-- ============================================================================

CREATE OR REPLACE FUNCTION update_tier_and_referrals(p_referral_code TEXT)
RETURNS VOID AS $$
DECLARE
  v_verified_count INTEGER;
  v_new_tier INTEGER;
BEGIN
  -- Count verified referrals
  SELECT COUNT(*)
  INTO v_verified_count
  FROM referrals r
  JOIN waitlist w ON r.referee_email = w.email
  WHERE r.referrer_code = p_referral_code
    AND w.email_verified = true
    AND r.referee_verification_status = 'verified';

  -- Calculate tier based on verified referrals
  CASE
    WHEN v_verified_count >= 15 THEN v_new_tier := 5;
    WHEN v_verified_count >= 10 THEN v_new_tier := 4;
    WHEN v_verified_count >= 5 THEN v_new_tier := 3;
    WHEN v_verified_count >= 3 THEN v_new_tier := 2;
    WHEN v_verified_count >= 1 THEN v_new_tier := 1;
    ELSE v_new_tier := 0;
  END CASE;

  -- Update waitlist entry
  UPDATE waitlist
  SET
    verified_referrals = v_verified_count,
    current_tier = v_new_tier,
    manual_review_required = (v_verified_count >= 15),
    updated_at = NOW()
  WHERE referral_code = p_referral_code;

  -- Rebuild queue positions after tier update
  PERFORM rebuild_queue_positions_tiered();
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCTION: Apply Two-Sided Referee Bonus
-- ============================================================================

CREATE OR REPLACE FUNCTION apply_referee_bonus(p_referee_email TEXT, p_referrer_code TEXT)
RETURNS VOID AS $$
DECLARE
  v_bonus_positions INTEGER := 20; -- REFEREE_BONUS from anti-fraud.ts
BEGIN
  -- Check if referee exists and hasn't received bonus yet
  IF EXISTS (
    SELECT 1
    FROM referrals
    WHERE referee_email = p_referee_email
      AND referrer_code = p_referrer_code
      AND referee_bonus_applied = FALSE
  ) THEN
    -- Mark bonus as applied in referrals table
    UPDATE referrals
    SET
      referee_bonus_applied = TRUE,
      referee_verification_status = 'verified'
    WHERE referee_email = p_referee_email
      AND referrer_code = p_referrer_code;

    -- This bonus is now handled by proportional ranking
    -- No direct position manipulation needed
    -- Just update referrer's tier
    PERFORM update_tier_and_referrals(p_referrer_code);
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCTION: Detect and Flag Fraud Patterns
-- ============================================================================

CREATE OR REPLACE FUNCTION detect_fraud_patterns(p_referral_code TEXT)
RETURNS TEXT[] AS $$
DECLARE
  v_flags TEXT[] := ARRAY[]::TEXT[];
  v_total_refs INTEGER;
  v_verified_refs INTEGER;
  v_verification_rate NUMERIC;
  v_refs_last_hour INTEGER;
BEGIN
  -- Get referral stats
  SELECT
    COUNT(*),
    SUM(CASE WHEN w.email_verified THEN 1 ELSE 0 END)
  INTO v_total_refs, v_verified_refs
  FROM referrals r
  JOIN waitlist w ON r.referee_email = w.email
  WHERE r.referrer_code = p_referral_code;

  -- Flag 1: Excessive referrals in last hour
  SELECT COUNT(*)
  INTO v_refs_last_hour
  FROM referrals
  WHERE referrer_code = p_referral_code
    AND created_at >= NOW() - INTERVAL '1 hour';

  IF v_refs_last_hour > 5 THEN
    v_flags := array_append(v_flags, 'excessive_referrals_per_hour');
  END IF;

  -- Flag 2: Low verification rate
  IF v_total_refs > 5 THEN
    v_verification_rate := v_verified_refs::NUMERIC / v_total_refs::NUMERIC;
    IF v_verification_rate < 0.3 THEN
      v_flags := array_append(v_flags, 'low_verification_rate');
    END IF;
  END IF;

  -- Flag 3: Abnormally high total referrals
  IF v_total_refs > 25 THEN
    v_flags := array_append(v_flags, 'abnormally_high_referral_count');
  END IF;

  -- Update fraud flags in waitlist
  IF array_length(v_flags, 1) > 0 THEN
    UPDATE waitlist
    SET
      fraud_flags = v_flags,
      manual_review_required = TRUE
    WHERE referral_code = p_referral_code;
  END IF;

  RETURN v_flags;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGER: Auto-update tier on email verification
-- ============================================================================

CREATE OR REPLACE FUNCTION on_email_verified()
RETURNS TRIGGER AS $$
BEGIN
  -- If email was just verified
  IF NEW.email_verified = TRUE AND OLD.email_verified = FALSE THEN
    -- Check if this user was referred (update referrer's tier)
    IF NEW.referred_by_code IS NOT NULL THEN
      -- Apply two-sided referee bonus
      PERFORM apply_referee_bonus(NEW.email, NEW.referred_by_code);
    END IF;

    -- Rebuild positions
    PERFORM rebuild_queue_positions_tiered();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_email_verified
  AFTER UPDATE ON waitlist
  FOR EACH ROW
  WHEN (NEW.email_verified = TRUE AND OLD.email_verified = FALSE)
  EXECUTE FUNCTION on_email_verified();

-- ============================================================================
-- INITIAL DATA MIGRATION
-- ============================================================================
-- Backfill verified_referrals and current_tier for existing users

DO $$
DECLARE
  v_user RECORD;
BEGIN
  FOR v_user IN SELECT referral_code FROM waitlist LOOP
    PERFORM update_tier_and_referrals(v_user.referral_code);
  END LOOP;
END $$;

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Ensure service role can execute all new functions
GRANT EXECUTE ON FUNCTION rebuild_queue_positions_tiered() TO service_role;
GRANT EXECUTE ON FUNCTION update_tier_and_referrals(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION apply_referee_bonus(TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION detect_fraud_patterns(TEXT) TO service_role;

-- ============================================================================
-- CLEANUP
-- ============================================================================

-- Drop old function that used fixed position skipping
DROP FUNCTION IF EXISTS rebuild_queue_positions();

COMMENT ON COLUMN waitlist.verified_referrals IS 'Number of verified referrals (email confirmed)';
COMMENT ON COLUMN waitlist.current_tier IS 'Current tier level (0-5) based on verified referrals';
COMMENT ON COLUMN waitlist.is_university_email IS 'Whether email is from .edu domain (gets +10 bonus)';
COMMENT ON COLUMN waitlist.position_bonus_applied IS 'Total position bonus applied from tiers';
COMMENT ON COLUMN waitlist.manual_review_required IS 'Flags accounts with 15+ referrals for manual review';
COMMENT ON COLUMN waitlist.fraud_flags IS 'Array of fraud detection flags';
