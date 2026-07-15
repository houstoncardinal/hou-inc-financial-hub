-- ============================================================================
-- HOU INC · Finance Logging Repair
--
-- The advanced income/expense forms rely on these transaction fields. Some
-- environments had the construction-finance core migration applied without the
-- earlier missing-column migration, so this makes the live transactions table
-- match the app's logging requirements.
-- ============================================================================

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS check_reference TEXT,
  ADD COLUMN IF NOT EXISTS retainage_percent NUMERIC(7,4),
  ADD COLUMN IF NOT EXISTS retainage_amount NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cost_phase TEXT;

CREATE INDEX IF NOT EXISTS idx_transactions_invoice_id
  ON public.transactions(invoice_id)
  WHERE invoice_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_check_reference
  ON public.transactions(check_reference)
  WHERE check_reference IS NOT NULL;

COMMENT ON COLUMN public.transactions.check_reference IS
  'Check number, ACH trace, wire confirmation, or other reconciliation reference captured by finance forms.';

COMMENT ON COLUMN public.transactions.retainage_percent IS
  'Retainage/holdback percentage captured on income payments.';

COMMENT ON COLUMN public.transactions.retainage_amount IS
  'Retainage/holdback dollar amount captured on income payments.';

COMMENT ON COLUMN public.transactions.invoice_id IS
  'Optional invoice linked to an income payment.';

COMMENT ON COLUMN public.transactions.cost_phase IS
  'Human-readable construction phase captured by legacy and guided forms.';

NOTIFY pgrst, 'reload schema';
