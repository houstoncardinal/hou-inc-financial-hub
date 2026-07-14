-- Add all columns the app expects on the transactions table.
-- All use IF NOT EXISTS so this is safe to re-run at any time.

-- Core missing columns (caused the schema cache error)
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS payment_method   TEXT    DEFAULT NULL;

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS cost_type        TEXT    DEFAULT NULL;

-- Check / wire / ACH reference number for bank reconciliation
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS check_reference  TEXT    DEFAULT NULL;

-- Retainage / holdback tracking (income)
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS retainage_percent NUMERIC DEFAULT NULL;

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS retainage_amount  NUMERIC DEFAULT NULL;

-- Invoice link — marks the invoice paid/partial when income is logged
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS invoice_id UUID
    REFERENCES public.invoices(id) ON DELETE SET NULL DEFAULT NULL;

-- Construction phase / cost code (e.g. "Phase 2: Rough-Ins")
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS cost_phase TEXT DEFAULT NULL;

-- Reload PostgREST schema cache immediately
NOTIFY pgrst, 'reload schema';
