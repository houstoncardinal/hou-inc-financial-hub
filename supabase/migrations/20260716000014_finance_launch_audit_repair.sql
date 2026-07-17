-- ============================================================================
-- HOU INC · Finance Launch Audit Repair
--
-- Fixes two defects found in a deep audit of the launch migrations:
--
-- 1. RLS INFINITE RECURSION (critical, breaks queries at runtime).
--    The app_user_roles policies in 20260716000012 check admin rights with an
--    EXISTS subquery on app_user_roles itself. Postgres rejects a policy whose
--    qual scans its own table with "infinite recursion detected in policy for
--    relation app_user_roles" (42P17) — and the same error propagates to every
--    OTHER table whose policy subqueries app_user_roles (finance_commitments,
--    finance_reconciliation_audit, system_health_events), because scanning
--    app_user_roles from those policies re-enters its recursive policy.
--    Net effect: role resolution in useAuth silently falls back to JWT
--    metadata, and the Finance Controls screen (roles, commitments, audit
--    history) errors on every load.
--    Fix: a SECURITY DEFINER helper that reads app_user_roles with RLS
--    bypassed, used by every policy instead of inline subqueries.
--
-- 2. FUNDED-DRAW DOUBLE COUNT in finance_project_control_summary (critical
--    for financial accuracy). 20260716000011 mirrors every funded draw into
--    an income transaction (external_reference 'draw_schedule:<id>'), and the
--    view then computes earned_revenue = income_received + funded_draws —
--    counting the same draw twice in earned revenue, gross margin, margin %,
--    and over/under billing. Fix: exclude draw-linked income transactions
--    from the transaction side; funded draws are counted once, from
--    draw_schedules (which also keeps pre-trigger historical draws counted).
--
-- Also in this file:
--    · % complete now uses the cost-to-complete (EAC) basis when
--      projects.estimated_cost_to_complete is maintained — actual ÷
--      (actual + estimated-to-complete) — which is the professionally
--      correct percentage-of-completion input; it falls back to
--      actual ÷ revised contract when no cost estimate exists.
--    · security_invoker on the control-summary view so direct PostgREST
--      reads of the view respect the underlying tables' RLS (the
--      get_finance_control_summary RPC is unaffected).
--
-- Safe to re-run. Run in the Supabase SQL editor.
-- ============================================================================


-- ─── 1. Role-check helper (RLS-bypassing, recursion-free) ───────────────────
CREATE OR REPLACE FUNCTION public.user_has_entity_role(p_entity_id TEXT, p_roles TEXT[])
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(auth.jwt()->'user_metadata'->>'role', '') = 'admin'
      OR EXISTS (
        SELECT 1 FROM public.app_user_roles r
        WHERE r.user_id = auth.uid()
          AND (p_entity_id IS NULL OR r.entity_id = p_entity_id)
          AND r.is_active
          AND r.role = ANY(p_roles)
      );
$$;

-- Role administration needs a bootstrap path: before any admin row exists for
-- an entity, the signed-in operator must be able to create the first one
-- (otherwise a JWT without user_metadata.role = 'admin' is locked out of the
-- role system forever). Once an active admin row exists, only admins manage
-- roles.
CREATE OR REPLACE FUNCTION public.can_manage_entity_roles(p_entity_id TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.user_has_entity_role(p_entity_id, ARRAY['admin'])
      OR NOT EXISTS (
        SELECT 1 FROM public.app_user_roles r
        WHERE r.entity_id = p_entity_id
          AND r.is_active
          AND r.role = 'admin'
      );
$$;


-- ─── 2. Recreate the recursive policies via the helper ──────────────────────
DROP POLICY IF EXISTS app_user_roles_self_select ON public.app_user_roles;
CREATE POLICY app_user_roles_self_select
  ON public.app_user_roles FOR SELECT
  USING (auth.uid() = user_id OR public.user_has_entity_role(entity_id, ARRAY['admin']));

DROP POLICY IF EXISTS app_user_roles_admin_all ON public.app_user_roles;
CREATE POLICY app_user_roles_admin_all
  ON public.app_user_roles FOR ALL
  USING (public.can_manage_entity_roles(entity_id))
  WITH CHECK (public.can_manage_entity_roles(entity_id));

DROP POLICY IF EXISTS finance_recon_audit_select ON public.finance_reconciliation_audit;
CREATE POLICY finance_recon_audit_select
  ON public.finance_reconciliation_audit FOR SELECT
  USING (auth.uid() = user_id
    OR public.user_has_entity_role(entity_id, ARRAY['admin', 'finance_manager', 'finance', 'read_only_auditor']));

DROP POLICY IF EXISTS system_health_events_admin_select ON public.system_health_events;
CREATE POLICY system_health_events_admin_select
  ON public.system_health_events FOR SELECT
  USING (auth.uid() = user_id
    OR public.user_has_entity_role(NULL, ARRAY['admin', 'finance_manager', 'read_only_auditor']));

DROP POLICY IF EXISTS finance_commitments_entity ON public.finance_commitments;
CREATE POLICY finance_commitments_entity
  ON public.finance_commitments FOR ALL
  USING (
    auth.uid() = user_id
    OR public.user_has_entity_role(entity_id, ARRAY['admin', 'finance_manager', 'finance', 'project_manager', 'read_only_auditor'])
  )
  WITH CHECK (
    auth.uid() = user_id
    OR public.user_has_entity_role(entity_id, ARRAY['admin', 'finance_manager', 'finance', 'project_manager'])
  );


-- ─── 3. Control-summary view: single-count funded draws + EAC % complete ────
CREATE OR REPLACE VIEW public.finance_project_control_summary AS
WITH txn AS (
  SELECT
    project_id,
    entity_id,
    -- Funded draws are mirrored into income transactions with
    -- external_reference 'draw_schedule:<id>' (20260716000011). Exclude them
    -- here — the draw CTE below is the single source for draw revenue, which
    -- also covers draws funded before that trigger existed.
    sum(CASE WHEN type = 'income'
              AND COALESCE(status, '') <> 'voided'
              AND COALESCE(external_reference, '') NOT LIKE 'draw_schedule:%'
         THEN COALESCE(total_amount, amount, 0) ELSE 0 END) AS income_received,
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
),
base AS (
  SELECT
    p.id,
    p.entity_id,
    p.name,
    p.status,
    COALESCE(p.budget, 0) AS budget,
    COALESCE(co.approved_change_orders, 0) AS approved_change_orders,
    COALESCE(co.pending_change_orders, 0) AS pending_change_orders,
    COALESCE(co.rejected_change_orders, 0) AS rejected_change_orders,
    COALESCE(p.budget, 0) + COALESCE(co.approved_change_orders, 0) AS revised_contract_value,
    COALESCE(txn.income_received, 0) + COALESCE(draw.funded_draws, 0) AS earned_revenue,
    COALESCE(txn.expense_spend, 0) + COALESCE(chk.cleared_checks, 0) AS actual_cost,
    COALESCE(p.estimated_cost_to_complete, 0) AS estimated_cost_to_complete,
    COALESCE(commitments.committed_cost, 0) AS committed_cost,
    COALESCE(commitments.remaining_commitment, 0) AS remaining_commitment,
    COALESCE(inv.ar_open, 0) AS ar_open,
    COALESCE(inv.ar_overdue, 0) AS ar_overdue,
    COALESCE(txn.ar_retainage_held, 0) + COALESCE(inv.invoice_retainage_held, 0) AS ar_retainage_held,
    COALESCE(txn.ap_retainage_held, 0) + COALESCE(chk.check_retainage_held, 0) + COALESCE(commitments.commitment_retainage_held, 0) AS ap_retainage_held,
    COALESCE(draw.open_draws, 0) AS open_draw_requests
  FROM public.projects p
  LEFT JOIN txn ON txn.project_id = p.id
  LEFT JOIN chk ON chk.project_id = p.id
  LEFT JOIN inv ON inv.project_id = p.id
  LEFT JOIN co ON co.project_id = p.id
  LEFT JOIN draw ON draw.project_id = p.id
  LEFT JOIN commitments ON commitments.project_id = p.id
  WHERE p.deleted_at IS NULL
),
pct AS (
  SELECT
    base.*,
    -- Percentage of completion: cost-to-date ÷ estimated total cost at
    -- completion when an estimate-to-complete is maintained (the standard
    -- POC input); otherwise cost-to-date ÷ revised contract as before.
    CASE
      WHEN base.estimated_cost_to_complete > 0
        THEN LEAST(100, ROUND((base.actual_cost / NULLIF(base.actual_cost + base.estimated_cost_to_complete, 0)) * 100, 2))
      WHEN base.revised_contract_value <= 0 THEN 0
      ELSE LEAST(100, ROUND((base.actual_cost / NULLIF(base.revised_contract_value, 0)) * 100, 2))
    END AS percent_complete_cost
  FROM base
)
SELECT
  pct.id AS project_id,
  pct.entity_id,
  pct.name AS project_name,
  pct.status AS project_status,
  pct.budget,
  pct.approved_change_orders,
  pct.pending_change_orders,
  pct.rejected_change_orders,
  pct.revised_contract_value,
  pct.earned_revenue,
  pct.actual_cost,
  pct.committed_cost,
  pct.remaining_commitment,
  pct.ar_open,
  pct.ar_overdue,
  pct.ar_retainage_held,
  pct.ap_retainage_held,
  pct.open_draw_requests,
  COALESCE(pct.percent_complete_cost, 0) AS percent_complete_cost,
  CASE
    WHEN pct.earned_revenue = 0 THEN 0
    WHEN pct.revised_contract_value <= 0 THEN 0
    ELSE ROUND(pct.earned_revenue - (pct.revised_contract_value * COALESCE(pct.percent_complete_cost, 0) / 100), 2)
  END AS over_under_billed,
  pct.earned_revenue - pct.actual_cost AS gross_margin,
  CASE
    WHEN pct.earned_revenue <= 0 THEN 0
    ELSE ROUND(((pct.earned_revenue - pct.actual_cost) / NULLIF(pct.earned_revenue, 0)) * 100, 2)
  END AS gross_margin_pct
FROM pct;

-- Direct reads of the view (PostgREST exposes it) must respect the underlying
-- tables' RLS rather than running as the view owner. The SECURITY DEFINER
-- RPC get_finance_control_summary still sees all entity rows.
ALTER VIEW public.finance_project_control_summary SET (security_invoker = on);


-- ─── 4. Extend the launch verification helper with these repairs ────────────
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
      'commitments, controls summary, and bank match acceptance'),
    ('rls_recursion_repair',
      EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'user_has_entity_role')
      AND EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'can_manage_entity_roles'),
      'role policies rebuilt on SECURITY DEFINER helpers (no self-referencing quals)'),
    ('draw_double_count_repair',
      EXISTS (
        SELECT 1 FROM pg_views
        WHERE schemaname = 'public'
          AND viewname = 'finance_project_control_summary'
          AND definition LIKE '%draw_schedule:%'
      ),
      'control summary excludes draw-linked income transactions from earned revenue');
END;
$$;

NOTIFY pgrst, 'reload schema';
