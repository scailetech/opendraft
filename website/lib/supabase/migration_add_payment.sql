-- Migration: Add payment support for immediate thesis generation
-- Run this in Supabase SQL Editor after deploying payment feature

-- Add payment-related columns to waitlist table
ALTER TABLE waitlist
ADD COLUMN IF NOT EXISTS payment_mode TEXT DEFAULT 'waitlist' CHECK (payment_mode IN ('waitlist', 'immediate'));

ALTER TABLE waitlist
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded'));

ALTER TABLE waitlist
ADD COLUMN IF NOT EXISTS payment_amount DECIMAL(10, 2);

ALTER TABLE waitlist
ADD COLUMN IF NOT EXISTS payment_currency TEXT DEFAULT 'EUR';

ALTER TABLE waitlist
ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT UNIQUE;

ALTER TABLE waitlist
ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

-- Create index for fast payment status lookups
CREATE INDEX IF NOT EXISTS idx_waitlist_payment_status ON waitlist(payment_status) WHERE payment_status = 'paid';

CREATE INDEX IF NOT EXISTS idx_waitlist_payment_mode ON waitlist(payment_mode);

CREATE INDEX IF NOT EXISTS idx_waitlist_stripe_intent ON waitlist(stripe_payment_intent_id);

-- Comments for documentation
COMMENT ON COLUMN waitlist.payment_mode IS 'waitlist = free queue, immediate = paid 20€ for instant generation';
COMMENT ON COLUMN waitlist.payment_status IS 'pending = not paid yet, paid = payment successful, failed = payment failed, refunded = refunded';
COMMENT ON COLUMN waitlist.payment_amount IS 'Payment amount in EUR (typically 20.00)';
COMMENT ON COLUMN waitlist.stripe_payment_intent_id IS 'Stripe PaymentIntent ID for tracking payments';

