-- ═══════════════════════════════════════════════════════════════════════════
-- HOU INC · Project Add-Ons
--
-- Adds project_add_ons — ad-hoc extra-work line items distinct from formal
-- Change Orders (door locks, AC units, flooring credits, etc.), matching the
-- "Add Ons" section of the Houston Enterprise Reconciliation spreadsheet.
-- Optionally priced by unit cost × quantity, with a custom_fields JSONB
-- column for anything project-specific that doesn't fit a fixed column
-- (same pattern as admin_projects.custom_fields).
--
-- Also extends get_project_financial_summary() so APPROVED add-ons flow into
-- current_contract_value exactly like approved Change Orders already do —
-- this is what makes them move AR, unbilled contract amount, and margin.
--
-- Run in the Supabase SQL editor (after 20260715000001_upgrade_construction_finance_system.sql).
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.project_add_ons (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id            UUID        NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  entity_id             TEXT        NOT NULL DEFAULT 'houston-enterprise',
  user_id               UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  line_item             TEXT        NOT NULL,
  kind                  TEXT        NOT NULL DEFAULT 'addition'
                          CHECK (kind IN ('addition','credit')),
  unit_cost             NUMERIC(14,2),
  unit_quantity         NUMERIC(14,2),
  unit_label            TEXT,
  amount                NUMERIC(14,2) NOT NULL DEFAULT 0,
  status                TEXT        NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending','approved','rejected')),
  approval_method       TEXT,
  requested_date        DATE,
  approved_date         DATE,
  client_visible        BOOLEAN     NOT NULL DEFAULT true,
  client_visible_notes  TEXT,
  internal_notes        TEXT,
  custom_fields         JSONB       NOT NULL DEFAULT '{}',
  sort_order            INT         NOT NULL DEFAULT 0,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_pao_updated ON public.project_add_ons;
CREATE TRIGGER trg_pao_updated
  BEFORE UPDATE ON public.project_add_ons
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_pao_project ON public.project_add_ons(project_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_pao_custom_fields ON public.project_add_ons USING gin(custom_fields);

ALTER TABLE public.project_add_ons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pao_all" ON public.project_add_ons;
CREATE POLICY "pao_all" ON public.project_add_ons
  FOR ALL USING (auth.uid() = user_id);

-- ── Fold approved add-ons into current_contract_value ───────────────────────
CREATE OR REPLACE FUNCTION public.get_project_financial_summary(p_project_id UUID)
RETURNS TABLE (
  project_id UUID,
  original_contract_value NUMERIC,
  approved_change_orders NUMERIC,
  current_contract_value NUMERIC,
  total_invoiced NUMERIC,
  total_collected NUMERIC,
  retainage_withheld NUMERIC,
  retainage_released NUMERIC,
  accounts_receivable NUMERIC,
  unbilled_contract_amount NUMERIC,
  committed_project_costs NUMERIC,
  actual_project_costs NUMERIC,
  paid_costs NUMERIC,
  unpaid_costs NUMERIC,
  outstanding_checks NUMERIC,
  remaining_budget NUMERIC,
  estimated_cost_to_complete NUMERIC,
  estimated_final_cost NUMERIC,
  estimated_gross_profit NUMERIC,
  estimated_gross_margin NUMERIC,
  actual_gross_profit NUMERIC,
  actual_gross_margin NUMERIC,
  percentage_billed NUMERIC,
  percentage_collected NUMERIC,
  cash_position NUMERIC,
  projects_over_budget BOOLEAN
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH p AS (
    SELECT * FROM public.projects WHERE id = p_project_id
  ),
  co AS (
    SELECT COALESCE(sum(CASE WHEN status = 'approved' THEN amount ELSE 0 END), 0) AS approved
    FROM public.project_change_orders WHERE project_id = p_project_id
  ),
  ao AS (
    SELECT COALESCE(sum(CASE
      WHEN status = 'approved' AND kind = 'addition' THEN amount
      WHEN status = 'approved' AND kind = 'credit'   THEN -amount
      ELSE 0
    END), 0) AS approved
    FROM public.project_add_ons WHERE project_id = p_project_id
  ),
  inv AS (
    SELECT
      COALESCE(sum(public.finance_invoice_total(line_items::jsonb, tax_rate)), 0) AS invoiced,
      COALESCE(sum(amount_paid), 0) AS paid,
      COALESCE(sum(retainage_withheld), 0) AS ret_w,
      COALESCE(sum(retainage_released), 0) AS ret_r
    FROM public.invoices
    WHERE project_id = p_project_id
      AND status NOT IN ('draft','voided','rejected')
  ),
  inc AS (
    SELECT
      COALESCE(sum(CASE WHEN COALESCE(status,'posted') NOT IN ('draft','rejected','voided','archived') THEN COALESCE(total_amount, amount) ELSE 0 END), 0) AS collected
    FROM public.transactions
    WHERE project_id = p_project_id AND type = 'income' AND deleted_at IS NULL
  ),
  exp AS (
    SELECT
      COALESCE(sum(CASE WHEN COALESCE(status,'posted') NOT IN ('draft','rejected','voided','archived') THEN COALESCE(total_amount, amount) ELSE 0 END), 0) AS actual
    FROM public.transactions
    WHERE project_id = p_project_id AND type = 'expense' AND deleted_at IS NULL
  ),
  chk AS (
    SELECT
      COALESCE(sum(CASE WHEN status = 'cleared' THEN amount ELSE 0 END), 0) AS cleared,
      COALESCE(sum(CASE WHEN status NOT IN ('cleared','voided') THEN amount ELSE 0 END), 0) AS outstanding
    FROM public.checks
    WHERE project_id = p_project_id AND deleted_at IS NULL
  ),
  alloc_exp AS (
    SELECT COALESCE(sum(allocated_amount), 0) AS committed
    FROM public.finance_transaction_allocations
    WHERE project_id = p_project_id
  ),
  base AS (
    SELECT
      p.id AS project_id,
      COALESCE(NULLIF(p.original_contract_value, 0), p.budget, 0) AS original_contract_value,
      co.approved AS approved_change_orders,
      COALESCE(NULLIF(p.current_contract_value, 0), COALESCE(NULLIF(p.original_contract_value, 0), p.budget, 0) + co.approved + ao.approved) AS current_contract_value,
      inv.invoiced AS total_invoiced,
      GREATEST(inv.paid, inc.collected) AS total_collected,
      inv.ret_w AS retainage_withheld,
      inv.ret_r AS retainage_released,
      GREATEST(inv.invoiced - GREATEST(inv.paid, inc.collected), 0) AS accounts_receivable,
      GREATEST(COALESCE(NULLIF(p.current_contract_value, 0), COALESCE(NULLIF(p.original_contract_value, 0), p.budget, 0) + co.approved + ao.approved) - inv.invoiced, 0) AS unbilled_contract_amount,
      alloc_exp.committed AS committed_project_costs,
      exp.actual + chk.cleared AS actual_project_costs,
      chk.cleared AS paid_costs,
      GREATEST(exp.actual - chk.cleared, 0) AS unpaid_costs,
      chk.outstanding AS outstanding_checks,
      GREATEST(COALESCE(p.budget, 0) - exp.actual - chk.cleared - chk.outstanding, 0) AS remaining_budget,
      COALESCE(p.estimated_cost_to_complete, 0) AS estimated_cost_to_complete
    FROM p, co, ao, inv, inc, exp, chk, alloc_exp
  )
  SELECT
    base.project_id,
    base.original_contract_value,
    base.approved_change_orders,
    base.current_contract_value,
    base.total_invoiced,
    base.total_collected,
    base.retainage_withheld,
    base.retainage_released,
    base.accounts_receivable,
    base.unbilled_contract_amount,
    base.committed_project_costs,
    base.actual_project_costs,
    base.paid_costs,
    base.unpaid_costs,
    base.outstanding_checks,
    base.remaining_budget,
    base.estimated_cost_to_complete,
    base.actual_project_costs + base.estimated_cost_to_complete AS estimated_final_cost,
    base.current_contract_value - (base.actual_project_costs + base.estimated_cost_to_complete) AS estimated_gross_profit,
    CASE WHEN base.current_contract_value > 0 THEN ((base.current_contract_value - (base.actual_project_costs + base.estimated_cost_to_complete)) / base.current_contract_value) * 100 ELSE 0 END AS estimated_gross_margin,
    base.total_collected - base.actual_project_costs AS actual_gross_profit,
    CASE WHEN base.total_collected > 0 THEN ((base.total_collected - base.actual_project_costs) / base.total_collected) * 100 ELSE 0 END AS actual_gross_margin,
    CASE WHEN base.current_contract_value > 0 THEN (base.total_invoiced / base.current_contract_value) * 100 ELSE 0 END AS percentage_billed,
    CASE WHEN base.total_invoiced > 0 THEN (base.total_collected / base.total_invoiced) * 100 ELSE 0 END AS percentage_collected,
    base.total_collected - base.actual_project_costs - base.outstanding_checks AS cash_position,
    base.actual_project_costs + base.outstanding_checks > base.current_contract_value AS projects_over_budget
  FROM base;
$$;

-- ── Done ─────────────────────────────────────────────────────────────────────
NOTIFY pgrst, 'reload schema';
