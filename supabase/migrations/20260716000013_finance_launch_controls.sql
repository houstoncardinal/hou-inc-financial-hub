-- ============================================================================
-- HOU INC · Finance Launch Controls
--
-- Adds construction-finance launch controls for:
--   1. WIP / percentage-of-completion reporting
--   2. retainage AR/AP fields
--   3. AR/AP aging foundations
--   4. change-order exposure summary
--   5. committed-cost tracking
--   6. bank-match acceptance workflow
--   7. migration verification helper
-- ============================================================================

-- ── Transaction / check / invoice fields used by finance controls ───────────
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS retainage_percent NUMERIC,
  ADD COLUMN IF NOT EXISTS retainage_amount NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS commitment_ref TEXT,
  ADD COLUMN IF NOT EXISTS subcontractor_retainage_withheld NUMERIC(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS subcontractor_retainage_released NUMERIC(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS due_date DATE,
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

ALTER TABLE public.checks
  ADD COLUMN IF NOT EXISTS retainage_pct NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS retainage_held NUMERIC(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS due_date DATE,
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS due_date DATE,
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS retainage_percent NUMERIC,
  ADD COLUMN IF NOT EXISTS retainage_amount NUMERIC(14,2) NOT NULL DEFAULT 0;

-- ── Committed costs / subcontract commitments ───────────────────────────────
CREATE TABLE IF NOT EXISTS public.finance_commitments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_id TEXT NOT NULL DEFAULT 'houston-enterprise',
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  vendor_id UUID REFERENCES public.vendors(id) ON DELETE SET NULL,
  commitment_number TEXT,
  title TEXT NOT NULL,
  cost_code TEXT,
  cost_phase TEXT,
  commitment_type TEXT NOT NULL DEFAULT 'subcontract'
    CHECK (commitment_type IN ('subcontract', 'purchase_order', 'allowance', 'rental', 'professional_service', 'other')),
  original_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  approved_change_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  revised_amount NUMERIC(14,2) GENERATED ALWAYS AS (original_amount + approved_change_amount) STORED,
  invoiced_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  paid_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  retainage_percent NUMERIC NOT NULL DEFAULT 0,
  retainage_held NUMERIC(14,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('draft', 'active', 'pending_approval', 'closed', 'cancelled')),
  start_date DATE,
  end_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

ALTER TABLE public.finance_commitments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS finance_commitments_entity ON public.finance_commitments;
CREATE POLICY finance_commitments_entity
  ON public.finance_commitments FOR ALL
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.app_user_roles r
      WHERE r.user_id = auth.uid()
        AND r.entity_id = finance_commitments.entity_id
        AND r.is_active
        AND r.role IN ('admin', 'finance_manager', 'finance', 'project_manager', 'read_only_auditor')
    )
  )
  WITH CHECK (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.app_user_roles r
      WHERE r.user_id = auth.uid()
        AND r.entity_id = finance_commitments.entity_id
        AND r.is_active
        AND r.role IN ('admin', 'finance_manager', 'finance', 'project_manager')
    )
  );

CREATE INDEX IF NOT EXISTS idx_finance_commitments_entity_project
  ON public.finance_commitments(entity_id, project_id, status)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_finance_commitments_vendor
  ON public.finance_commitments(vendor_id, status)
  WHERE deleted_at IS NULL;

-- ── Construction finance summary view ───────────────────────────────────────
CREATE OR REPLACE VIEW public.finance_project_control_summary AS
WITH txn AS (
  SELECT
    project_id,
    entity_id,
    sum(CASE WHEN type = 'income' AND COALESCE(status, '') <> 'voided' THEN COALESCE(total_amount, amount, 0) ELSE 0 END) AS income_received,
    sum(CASE WHEN type = 'expense' AND COALESCE(status, '') <> 'voided' THEN COALESCE(total_amount, amount, 0) ELSE 0 END) AS expense_spend,
    sum(CASE WHEN type = 'income' THEN COALESCE(retainage_amount, 0) ELSE 0 END) AS ar_retainage_held,
    sum(CASE WHEN type = 'expense' THEN COALESCE(subcontractor_retainage_withheld, 0) - COALESCE(subcontractor_retainage_released, 0) ELSE 0 END) AS ap_retainage_held
  FROM public.transactions
  WHERE deleted_at IS NULL
  GROUP BY project_id, entity_id
),
chk AS (
  SELECT
    project_id,
    entity_id,
    sum(CASE WHEN status = 'cleared' THEN COALESCE(amount, 0) ELSE 0 END) AS cleared_checks,
    sum(CASE WHEN status <> 'voided' THEN COALESCE(retainage_held, 0) ELSE 0 END) AS check_retainage_held
  FROM public.checks
  WHERE deleted_at IS NULL
  GROUP BY project_id, entity_id
),
inv AS (
  SELECT
    project_id,
    entity_id,
    sum(CASE WHEN status IN ('sent', 'overdue') THEN GREATEST(public.invoice_total_amount(line_items, tax_rate) - COALESCE(amount_paid, 0), 0) ELSE 0 END) AS ar_open,
    sum(CASE WHEN status = 'overdue' THEN GREATEST(public.invoice_total_amount(line_items, tax_rate) - COALESCE(amount_paid, 0), 0) ELSE 0 END) AS ar_overdue,
    sum(COALESCE(retainage_amount, 0)) AS invoice_retainage_held
  FROM public.invoices
  GROUP BY project_id, entity_id
),
co AS (
  SELECT
    project_id,
    sum(CASE WHEN status IN ('approved', 'executed') THEN COALESCE(amount, 0) ELSE 0 END) AS approved_change_orders,
    sum(CASE WHEN status IN ('pending', 'submitted', 'under_review') THEN COALESCE(amount, 0) ELSE 0 END) AS pending_change_orders,
    sum(CASE WHEN status IN ('rejected', 'voided') THEN COALESCE(amount, 0) ELSE 0 END) AS rejected_change_orders
  FROM public.project_change_orders
  GROUP BY project_id
),
draw AS (
  SELECT
    project_id,
    sum(CASE WHEN status = 'funded' THEN COALESCE(draw_amount, 0) ELSE 0 END) AS funded_draws,
    sum(CASE WHEN status IN ('pending', 'requested', 'approved') THEN COALESCE(draw_amount, 0) ELSE 0 END) AS open_draws
  FROM public.draw_schedules
  GROUP BY project_id
),
commitments AS (
  SELECT
    project_id,
    entity_id,
    sum(CASE WHEN status IN ('active', 'pending_approval') THEN revised_amount ELSE 0 END) AS committed_cost,
    sum(CASE WHEN status IN ('active', 'pending_approval') THEN GREATEST(revised_amount - paid_amount, 0) ELSE 0 END) AS remaining_commitment,
    sum(CASE WHEN status IN ('active', 'pending_approval') THEN retainage_held ELSE 0 END) AS commitment_retainage_held
  FROM public.finance_commitments
  WHERE deleted_at IS NULL
  GROUP BY project_id, entity_id
)
SELECT
  p.id AS project_id,
  p.entity_id,
  p.name AS project_name,
  p.status AS project_status,
  COALESCE(p.budget, 0) AS budget,
  COALESCE(co.approved_change_orders, 0) AS approved_change_orders,
  COALESCE(co.pending_change_orders, 0) AS pending_change_orders,
  COALESCE(co.rejected_change_orders, 0) AS rejected_change_orders,
  COALESCE(p.budget, 0) + COALESCE(co.approved_change_orders, 0) AS revised_contract_value,
  COALESCE(txn.income_received, 0) + COALESCE(draw.funded_draws, 0) AS earned_revenue,
  COALESCE(txn.expense_spend, 0) + COALESCE(chk.cleared_checks, 0) AS actual_cost,
  COALESCE(commitments.committed_cost, 0) AS committed_cost,
  COALESCE(commitments.remaining_commitment, 0) AS remaining_commitment,
  COALESCE(inv.ar_open, 0) AS ar_open,
  COALESCE(inv.ar_overdue, 0) AS ar_overdue,
  COALESCE(txn.ar_retainage_held, 0) + COALESCE(inv.invoice_retainage_held, 0) AS ar_retainage_held,
  COALESCE(txn.ap_retainage_held, 0) + COALESCE(chk.check_retainage_held, 0) + COALESCE(commitments.commitment_retainage_held, 0) AS ap_retainage_held,
  COALESCE(draw.open_draws, 0) AS open_draw_requests,
  CASE
    WHEN COALESCE(p.budget, 0) + COALESCE(co.approved_change_orders, 0) <= 0 THEN 0
    ELSE LEAST(100, ROUND(((COALESCE(txn.expense_spend, 0) + COALESCE(chk.cleared_checks, 0)) / NULLIF(COALESCE(p.budget, 0) + COALESCE(co.approved_change_orders, 0), 0)) * 100, 2))
  END AS percent_complete_cost,
  CASE
    WHEN COALESCE(txn.income_received, 0) + COALESCE(draw.funded_draws, 0) = 0 THEN 0
    WHEN COALESCE(p.budget, 0) + COALESCE(co.approved_change_orders, 0) <= 0 THEN 0
    ELSE ROUND((COALESCE(txn.income_received, 0) + COALESCE(draw.funded_draws, 0)) - ((COALESCE(p.budget, 0) + COALESCE(co.approved_change_orders, 0)) * LEAST(1, (COALESCE(txn.expense_spend, 0) + COALESCE(chk.cleared_checks, 0)) / NULLIF(COALESCE(p.budget, 0) + COALESCE(co.approved_change_orders, 0), 0))), 2)
  END AS over_under_billed,
  COALESCE(txn.income_received, 0) + COALESCE(draw.funded_draws, 0) - COALESCE(txn.expense_spend, 0) - COALESCE(chk.cleared_checks, 0) AS gross_margin,
  CASE
    WHEN COALESCE(txn.income_received, 0) + COALESCE(draw.funded_draws, 0) <= 0 THEN 0
    ELSE ROUND(((COALESCE(txn.income_received, 0) + COALESCE(draw.funded_draws, 0) - COALESCE(txn.expense_spend, 0) - COALESCE(chk.cleared_checks, 0)) / NULLIF(COALESCE(txn.income_received, 0) + COALESCE(draw.funded_draws, 0), 0)) * 100, 2)
  END AS gross_margin_pct
FROM public.projects p
LEFT JOIN txn ON txn.project_id = p.id
LEFT JOIN chk ON chk.project_id = p.id
LEFT JOIN inv ON inv.project_id = p.id
LEFT JOIN co ON co.project_id = p.id
LEFT JOIN draw ON draw.project_id = p.id
LEFT JOIN commitments ON commitments.project_id = p.id
WHERE p.deleted_at IS NULL;

CREATE OR REPLACE FUNCTION public.get_finance_control_summary(p_entity_id TEXT DEFAULT 'houston-enterprise')
RETURNS SETOF public.finance_project_control_summary
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM public.finance_project_control_summary
  WHERE entity_id = p_entity_id
  ORDER BY
    CASE WHEN project_status = 'active' THEN 0 ELSE 1 END,
    ar_overdue DESC,
    pending_change_orders DESC,
    project_name ASC;
$$;

-- ── AR/AP aging rollups ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_finance_aging_summary(p_entity_id TEXT DEFAULT 'houston-enterprise')
RETURNS TABLE (
  aging_type TEXT,
  bucket TEXT,
  open_amount NUMERIC
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH ar AS (
    SELECT
      CASE
        WHEN COALESCE(due_date, issue_date, created_at::date) >= CURRENT_DATE THEN 'current'
        WHEN CURRENT_DATE - COALESCE(due_date, issue_date, created_at::date) <= 30 THEN '1-30'
        WHEN CURRENT_DATE - COALESCE(due_date, issue_date, created_at::date) <= 60 THEN '31-60'
        WHEN CURRENT_DATE - COALESCE(due_date, issue_date, created_at::date) <= 90 THEN '61-90'
        ELSE '90+'
      END AS bucket,
      GREATEST(public.invoice_total_amount(line_items, tax_rate) - COALESCE(amount_paid, 0), 0) AS amount
    FROM public.invoices
    WHERE entity_id = p_entity_id
      AND status IN ('sent', 'overdue')
  ),
  ap AS (
    SELECT
      CASE
        WHEN COALESCE(due_date, transaction_date, created_at::date) >= CURRENT_DATE THEN 'current'
        WHEN CURRENT_DATE - COALESCE(due_date, transaction_date, created_at::date) <= 30 THEN '1-30'
        WHEN CURRENT_DATE - COALESCE(due_date, transaction_date, created_at::date) <= 60 THEN '31-60'
        WHEN CURRENT_DATE - COALESCE(due_date, transaction_date, created_at::date) <= 90 THEN '61-90'
        ELSE '90+'
      END AS bucket,
      COALESCE(total_amount, amount, 0) AS amount
    FROM public.transactions
    WHERE entity_id = p_entity_id
      AND type = 'expense'
      AND deleted_at IS NULL
      AND COALESCE(payment_status, status, '') NOT IN ('paid', 'voided')
  )
  SELECT 'ar'::text, bucket, sum(amount) FROM ar GROUP BY bucket
  UNION ALL
  SELECT 'ap'::text, bucket, sum(amount) FROM ap GROUP BY bucket;
$$;

-- ── Accept bank match suggestions directly from the UI ──────────────────────
CREATE OR REPLACE FUNCTION public.accept_bank_match_suggestion(p_suggestion_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s public.finance_bank_match_suggestions%ROWTYPE;
  a public.finance_bank_activity%ROWTYPE;
BEGIN
  SELECT * INTO s FROM public.finance_bank_match_suggestions WHERE id = p_suggestion_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Bank match suggestion not found';
  END IF;

  SELECT * INTO a FROM public.finance_bank_activity WHERE id = s.bank_activity_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Bank activity not found';
  END IF;

  UPDATE public.finance_bank_match_suggestions
  SET status = CASE WHEN id = p_suggestion_id THEN 'accepted' ELSE 'rejected' END
  WHERE bank_activity_id = s.bank_activity_id
    AND status = 'suggested';

  UPDATE public.finance_bank_activity
  SET
    match_status = 'matched',
    matched_source_table = s.source_table,
    matched_source_id = s.source_record_id,
    metadata = metadata || jsonb_build_object('matched_at', now(), 'accepted_suggestion_id', p_suggestion_id)
  WHERE id = s.bank_activity_id;

  IF s.source_table = 'transactions' THEN
    UPDATE public.transactions
    SET
      reconciled = true,
      reconciled_at = now(),
      reconciliation_status = 'reconciled',
      cleared_date = COALESCE(cleared_date, a.activity_date),
      external_reference = COALESCE(NULLIF(external_reference, ''), a.reference)
    WHERE id = s.source_record_id;
  ELSE
    UPDATE public.checks
    SET
      reconciled = true,
      reconciled_at = now(),
      reconciliation_status = 'reconciled',
      cleared_date = COALESCE(cleared_date, a.activity_date),
      external_reference = COALESCE(NULLIF(external_reference, ''), a.reference)
    WHERE id = s.source_record_id;
  END IF;
END;
$$;

-- ── Migration verification helper ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.verify_finance_launch_migrations()
RETURNS TABLE (
  check_name TEXT,
  ok BOOLEAN,
  details TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY VALUES
    ('admin_finance_link_columns',
      EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='admin_projects' AND column_name='finance_project_id')
      AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='projects' AND column_name='admin_project_id'),
      'admin_projects.finance_project_id and projects.admin_project_id'),
    ('funded_draw_income_sync',
      EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'sync_funded_draw_to_income'),
      'sync_funded_draw_to_income trigger function'),
    ('finance_launch_hardening',
      EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='finance_reconciliation_audit')
      AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='finance_bank_activity')
      AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='app_user_roles'),
      'audit, bank activity, and role override tables'),
    ('finance_launch_controls',
      EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='finance_commitments')
      AND EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_finance_control_summary')
      AND EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'accept_bank_match_suggestion'),
      'commitments, controls summary, and bank match acceptance');
END;
$$;

DO $$ BEGIN
  BEGIN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.finance_commitments';
  EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_object THEN NULL; END;
END $$;

NOTIFY pgrst, 'reload schema';
