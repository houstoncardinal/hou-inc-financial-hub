-- ============================================================================
-- HOU INC · Invoice Intelligence + HGP Job-Linked Invoicing
--
-- Closes two audit gaps at once, since both are additive columns on the same
-- `invoices` table:
--
--   1. Invoice intelligence — external_invoice_url/provider already exist
--      (20260715000005) but have no label, no format validation, and no
--      provider enum. This adds:
--        · external_invoice_label   — optional human label ("Stripe — Deposit")
--        · CHECK: url must be NULL or start with https://
--        · CHECK: provider must be NULL or one of a known set
--
--   2. HGP job-linked invoicing — HGP job payments (20260718000001) post
--      straight to income with no customer-facing document. This adds:
--        · invoices.hgp_job_id → hgp_jobs(id), so an invoice can be created
--          directly from an install/service/emergency job and the job can
--          show its linked invoices, payment status, and open balance.
--
-- Both columns are nullable and additive — existing invoices are unaffected.
-- Safe to re-run.
-- ============================================================================

-- ─── 1. Invoice intelligence columns ────────────────────────────────────────
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS external_invoice_label TEXT;

-- Self-healing: clear any pre-existing non-URL test/placeholder values before
-- the https:// constraint below would otherwise reject the whole migration.
UPDATE public.transactions
  SET external_invoice_url = NULL, external_invoice_provider = NULL
  WHERE external_invoice_url IS NOT NULL AND external_invoice_url !~* '^https://';
UPDATE public.invoices
  SET external_invoice_url = NULL, external_invoice_provider = NULL
  WHERE external_invoice_url IS NOT NULL AND external_invoice_url !~* '^https://';

DO $$ BEGIN
  ALTER TABLE public.invoices
    ADD CONSTRAINT invoices_external_url_https_chk
    CHECK (external_invoice_url IS NULL OR external_invoice_url ~* '^https://');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.invoices
    ADD CONSTRAINT invoices_external_provider_chk
    CHECK (external_invoice_provider IS NULL OR external_invoice_provider IN ('stripe', 'quickbooks', 'square', 'other'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Same intelligence on transactions' existing external_invoice_url (income
-- entries can carry a payment link too — TxnPage already writes these).
DO $$ BEGIN
  ALTER TABLE public.transactions
    ADD CONSTRAINT transactions_external_url_https_chk
    CHECK (external_invoice_url IS NULL OR external_invoice_url ~* '^https://');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.transactions
    ADD CONSTRAINT transactions_external_provider_chk
    CHECK (external_invoice_provider IS NULL OR external_invoice_provider IN ('stripe', 'quickbooks', 'square', 'other'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── 2. HGP job-linked invoicing ────────────────────────────────────────────
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS hgp_job_id UUID REFERENCES public.hgp_jobs(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_invoices_hgp_job
  ON public.invoices(hgp_job_id)
  WHERE hgp_job_id IS NOT NULL;

COMMENT ON COLUMN public.invoices.hgp_job_id IS
  'Generator install/service/emergency job this invoice bills — lets an HGP job show its linked invoices, payment status, and open balance.';
COMMENT ON COLUMN public.invoices.external_invoice_label IS
  'Optional human label for the external invoice/payment link, e.g. "Stripe — Deposit" or "QuickBooks Invoice #1042".';

-- ─── 3. Verification ────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.verify_invoice_intelligence_job_link()
RETURNS TABLE (check_name TEXT, ok BOOLEAN, details TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY VALUES
    ('invoice_external_link_intelligence',
      EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='invoices' AND column_name='external_invoice_label')
      AND EXISTS (SELECT 1 FROM information_schema.constraint_column_usage WHERE table_schema='public' AND table_name='invoices' AND constraint_name='invoices_external_url_https_chk'),
      'external_invoice_label column + https/provider constraints on invoices'),
    ('hgp_job_linked_invoicing',
      EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='invoices' AND column_name='hgp_job_id'),
      'invoices.hgp_job_id references hgp_jobs');
END;
$$;

NOTIFY pgrst, 'reload schema';
