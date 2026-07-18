-- ============================================================================
-- HOU INC · HGP Job Payments (deposit / progress / final → income ledger)
--
-- Every payment collected on a generator job becomes a real row here and a
-- real income transaction in the HGP finance dashboard:
--
--   · hgp_job_payments — deposit / progress / final / financing / other
--     payments with method, date, reference, and memo, linked to the job.
--
--   · sync_hgp_job_payment_income — mirrors each payment into transactions
--     (idempotency key 'hgp_job_payment:<id>', protected by the existing
--     unique live-external-reference index). Categories match the HGP income
--     catalog exactly — 'Generator Deposit', 'Installation Payment',
--     'Final Payment', 'Financing Payment' — so manual and job-driven income
--     classify identically across the ledger, charts, and summaries.
--     Voiding a payment (soft delete) voids its income entry.
--
--   · apply_hgp_job_payment_totals — keeps hgp_jobs.deposit_amount equal to
--     the sum of the job's live payments, so Balance Due, the Collected KPI,
--     and job cards stay truthful automatically. Jobs that predate payment
--     logging keep their manually entered figure until their first payment
--     event fires.
--
--   · verify_hgp_job_payments() — launch verification.
--
-- Owner-scoped RLS, indexed, realtime-registered. Safe to re-run.
-- Run in the Supabase SQL editor after 20260717000008.
-- ============================================================================


-- ─── 1. Payments table ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.hgp_job_payments (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_id    TEXT NOT NULL DEFAULT 'houston-generator-pros',
  job_id       UUID NOT NULL REFERENCES public.hgp_jobs(id) ON DELETE CASCADE,
  payment_type TEXT NOT NULL DEFAULT 'deposit'
    CHECK (payment_type IN ('deposit', 'progress', 'final', 'financing', 'other')),
  amount       NUMERIC(14,2) NOT NULL,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  method       TEXT NOT NULL DEFAULT 'other'
    CHECK (method IN ('check', 'ach_wire', 'credit_card', 'cash', 'financing', 'other')),
  reference    TEXT,
  memo         TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at   TIMESTAMPTZ
);

ALTER TABLE public.hgp_job_payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS hgp_job_payments_owner ON public.hgp_job_payments;
CREATE POLICY hgp_job_payments_owner ON public.hgp_job_payments FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_hgp_job_payments_job
  ON public.hgp_job_payments(job_id, payment_date DESC) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_hgp_job_payment_ref
  ON public.transactions (external_reference)
  WHERE external_reference LIKE 'hgp_job_payment:%';


-- ─── 2. Payment → income mirror (proven external_reference pattern) ─────────
CREATE OR REPLACE FUNCTION public.sync_hgp_job_payment_income()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.hgp_job_payments%ROWTYPE;
  v_job public.hgp_jobs%ROWTYPE;
  v_ref TEXT;
  v_existing_id UUID;
  v_category TEXT;
  v_label TEXT;
BEGIN
  IF TG_OP = 'DELETE' THEN v_row := OLD; ELSE v_row := NEW; END IF;
  v_ref := 'hgp_job_payment:' || v_row.id::text;

  SELECT id INTO v_existing_id
  FROM public.transactions
  WHERE external_reference = v_ref AND deleted_at IS NULL
  ORDER BY created_at ASC
  LIMIT 1;

  IF TG_OP = 'DELETE' OR v_row.deleted_at IS NOT NULL OR COALESCE(v_row.amount, 0) <= 0 THEN
    IF v_existing_id IS NOT NULL THEN
      UPDATE public.transactions
      SET status = 'voided',
          payment_status = 'voided',
          notes = 'Linked job payment removed; income voided to prevent overstatement.',
          updated_at = now()
      WHERE id = v_existing_id AND COALESCE(status, '') <> 'voided';
    END IF;
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
  END IF;

  SELECT * INTO v_job FROM public.hgp_jobs WHERE id = v_row.job_id;
  IF NOT FOUND THEN RETURN NEW; END IF;

  v_category := CASE v_row.payment_type
    WHEN 'deposit'   THEN 'Generator Deposit'
    WHEN 'progress'  THEN 'Installation Payment'
    WHEN 'final'     THEN 'Final Payment'
    WHEN 'financing' THEN 'Financing Payment'
    ELSE 'Other Income'
  END;
  v_label := initcap(v_row.payment_type) || ' payment — ' || v_job.customer_name
    || COALESCE(' (' || v_job.generator_model || ')', '');

  IF v_existing_id IS NOT NULL THEN
    UPDATE public.transactions
    SET user_id = v_row.user_id,
        entity_id = v_row.entity_id,
        type = 'income',
        amount = v_row.amount,
        amount_before_tax = v_row.amount,
        tax_amount = 0,
        total_amount = v_row.amount,
        net_amount = v_row.amount,
        transaction_date = v_row.payment_date,
        posting_date = v_row.payment_date,
        source_name = v_job.customer_name,
        category = v_category,
        description = v_label,
        notes = COALESCE(v_row.memo, 'Auto-created from job payment.'),
        payment_method = v_row.method,
        check_reference = v_row.reference,
        status = 'posted',
        approval_status = 'approved',
        payment_status = 'paid',
        reconciliation_status = COALESCE(reconciliation_status, 'unreconciled'),
        updated_by = v_row.user_id,
        updated_at = now()
    WHERE id = v_existing_id;
  ELSE
    INSERT INTO public.transactions (
      user_id, entity_id, type, amount, amount_before_tax, tax_amount,
      total_amount, net_amount, transaction_date, posting_date, source_name,
      category, description, notes, payment_method, check_reference, status,
      approval_status, payment_status, reconciliation_status,
      external_reference, created_by, updated_by
    ) VALUES (
      v_row.user_id, v_row.entity_id, 'income', v_row.amount, v_row.amount, 0,
      v_row.amount, v_row.amount, v_row.payment_date, v_row.payment_date,
      v_job.customer_name, v_category, v_label,
      COALESCE(v_row.memo, 'Auto-created from job payment.'),
      v_row.method, v_row.reference, 'posted', 'approved', 'paid', 'unreconciled',
      v_ref, v_row.user_id, v_row.user_id
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_hgp_job_payment_income ON public.hgp_job_payments;
CREATE TRIGGER trg_sync_hgp_job_payment_income
  AFTER INSERT OR UPDATE ON public.hgp_job_payments
  FOR EACH ROW EXECUTE FUNCTION public.sync_hgp_job_payment_income();

DROP TRIGGER IF EXISTS trg_void_hgp_job_payment_income ON public.hgp_job_payments;
CREATE TRIGGER trg_void_hgp_job_payment_income
  AFTER DELETE ON public.hgp_job_payments
  FOR EACH ROW EXECUTE FUNCTION public.sync_hgp_job_payment_income();


-- ─── 3. Payments own the job's collected total ──────────────────────────────
CREATE OR REPLACE FUNCTION public.apply_hgp_job_payment_totals()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job_id UUID;
  v_total NUMERIC(14,2);
BEGIN
  v_job_id := COALESCE(NEW.job_id, OLD.job_id);
  SELECT COALESCE(sum(amount), 0) INTO v_total
  FROM public.hgp_job_payments
  WHERE job_id = v_job_id AND deleted_at IS NULL;

  UPDATE public.hgp_jobs
  SET deposit_amount = v_total
  WHERE id = v_job_id AND deleted_at IS NULL;

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_apply_hgp_job_payment_totals ON public.hgp_job_payments;
CREATE TRIGGER trg_apply_hgp_job_payment_totals
  AFTER INSERT OR DELETE OR UPDATE OF amount, deleted_at ON public.hgp_job_payments
  FOR EACH ROW EXECUTE FUNCTION public.apply_hgp_job_payment_totals();


-- ─── 4. updated_at + realtime ───────────────────────────────────────────────
DO $$ BEGIN
  EXECUTE 'DROP TRIGGER IF EXISTS trg_hgp_job_payments_updated ON public.hgp_job_payments';
  EXECUTE 'CREATE TRIGGER trg_hgp_job_payments_updated BEFORE UPDATE ON public.hgp_job_payments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()';
  BEGIN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.hgp_job_payments';
  EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN undefined_object THEN NULL;
  END;
END $$;


-- ─── 5. Verification ────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.verify_hgp_job_payments()
RETURNS TABLE (check_name TEXT, ok BOOLEAN, details TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY VALUES
    ('hgp_job_payments_table',
      EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='hgp_job_payments'),
      'deposit/progress/final/financing payments per job'),
    ('hgp_job_payment_income_sync',
      EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'sync_hgp_job_payment_income')
      AND EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'apply_hgp_job_payment_totals'),
      'payments mirror to HGP income and own the job collected total');
END;
$$;

NOTIFY pgrst, 'reload schema';
