-- Create Invoices Table (Billing)
-- Invoice management for both self-service (Stripe) and agency (manual)
-- Part of GTM Engine transformation

CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Invoice details
  invoice_number TEXT NOT NULL UNIQUE,
  billing_type TEXT NOT NULL CHECK (billing_type IN ('self_service', 'agency')),
  
  -- Billing period
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  
  -- Amounts
  subtotal DECIMAL(10, 2) NOT NULL DEFAULT 0,
  tax DECIMAL(10, 2) NOT NULL DEFAULT 0,
  total DECIMAL(10, 2) NOT NULL DEFAULT 0,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'paid', 'overdue', 'cancelled')),
  
  -- Stripe integration (for self-service)
  stripe_invoice_id TEXT,
  stripe_payment_intent_id TEXT,
  
  -- Payment tracking
  due_date TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoices_user ON invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_period ON invoices(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_invoices_stripe ON invoices(stripe_invoice_id) WHERE stripe_invoice_id IS NOT NULL;

-- RLS Policies
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own invoices"
  ON invoices FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Agencies can view client invoices"
  ON invoices FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.user_id = auth.uid()
      AND up.user_type = 'agency'
      AND EXISTS (
        SELECT 1 FROM user_profiles client_up
        WHERE client_up.agency_id = up.user_id
        AND client_up.user_id = invoices.user_id
      )
    )
  );

CREATE POLICY "Users can insert own invoices"
  ON invoices FOR INSERT
  WITH CHECK (auth.uid() = user_id OR auth.role() = 'service_role');

CREATE POLICY "Service role can update invoices"
  ON invoices FOR UPDATE
  USING (auth.role() = 'service_role');

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_invoices_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_invoices_updated_at ON invoices;
CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_invoices_updated_at();

-- Column comments for documentation
COMMENT ON TABLE invoices IS 'Invoices for self-service (Stripe) and agency (manual) billing';
COMMENT ON COLUMN invoices.billing_type IS 'self_service (Stripe) or agency (manual invoicing)';
COMMENT ON COLUMN invoices.stripe_invoice_id IS 'Stripe invoice ID for self-service billing';
COMMENT ON COLUMN invoices.status IS 'Invoice status: draft, pending, paid, overdue, cancelled';

