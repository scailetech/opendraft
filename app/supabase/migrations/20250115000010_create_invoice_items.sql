-- Create Invoice Items Table (Billing)
-- Line items for invoices, links to usage tracking
-- Part of GTM Engine transformation

CREATE TABLE IF NOT EXISTS invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  
  -- Item details
  description TEXT NOT NULL,
  quantity DECIMAL(10, 2) NOT NULL DEFAULT 1,
  unit_price DECIMAL(10, 2) NOT NULL,
  total DECIMAL(10, 2) NOT NULL,
  
  -- Link to usage tracking
  usage_tracking_ids UUID[] DEFAULT ARRAY[]::UUID[],
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON invoice_items(invoice_id);

-- RLS Policies
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own invoice items"
  ON invoice_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = invoice_items.invoice_id
      AND invoices.user_id = auth.uid()
    )
  );

CREATE POLICY "Agencies can view client invoice items"
  ON invoice_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM invoices
      JOIN user_profiles up ON up.user_id = invoices.user_id
      WHERE invoices.id = invoice_items.invoice_id
      AND up.user_type = 'agency'
      AND EXISTS (
        SELECT 1 FROM user_profiles client_up
        WHERE client_up.agency_id = up.user_id
        AND client_up.user_id = invoices.user_id
      )
    )
  );

CREATE POLICY "Service role can insert invoice items"
  ON invoice_items FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- Column comments for documentation
COMMENT ON TABLE invoice_items IS 'Line items for invoices, links usage tracking to invoice line items';
COMMENT ON COLUMN invoice_items.usage_tracking_ids IS 'Array of usage_tracking IDs included in this line item';

