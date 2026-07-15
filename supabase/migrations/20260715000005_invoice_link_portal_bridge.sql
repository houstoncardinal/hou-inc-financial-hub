-- ============================================================================
-- HOU INC · Invoice Link Portal Bridge
--
-- Additive metadata for attaching Stripe, QuickBooks, or external invoice links
-- to income records and client-visible invoices without disrupting existing data.
-- ============================================================================

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS external_invoice_url TEXT,
  ADD COLUMN IF NOT EXISTS external_invoice_provider TEXT,
  ADD COLUMN IF NOT EXISTS external_invoice_number TEXT;

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS portal_client_id UUID REFERENCES public.portal_clients(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS external_invoice_url TEXT,
  ADD COLUMN IF NOT EXISTS external_invoice_provider TEXT,
  ADD COLUMN IF NOT EXISTS external_invoice_number TEXT,
  ADD COLUMN IF NOT EXISTS client_visible BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_transactions_external_invoice_url
  ON public.transactions(external_invoice_url)
  WHERE external_invoice_url IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_invoices_client_visible
  ON public.invoices(portal_client_id, client_visible)
  WHERE portal_client_id IS NOT NULL;

COMMENT ON COLUMN public.transactions.external_invoice_url IS
  'Client-payable invoice URL attached while logging income, such as Stripe, QuickBooks, or another payment link.';

COMMENT ON COLUMN public.invoices.external_invoice_url IS
  'Client-payable invoice URL exposed in the portal when client_visible is true.';

NOTIFY pgrst, 'reload schema';
