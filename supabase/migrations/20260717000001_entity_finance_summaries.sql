-- ============================================================================
-- HOU INC · Entity Finance Summaries (server-side aggregates for HGP/Holdings)
--
-- The HGP Generator Ops and Holdings HQ dashboards previously computed their
-- headline numbers by pulling entire transaction/check tables to the client.
-- These RPCs move the aggregation server-side so both dashboards stay fast at
-- thousands of ledger rows and share one source of truth with the database.
--
--   · get_holdings_entity_performance() — per-entity income / expense /
--     cleared-check outflow for the consolidated portfolio view. Runs as the
--     INVOKER (no SECURITY DEFINER): RLS on transactions/checks already
--     scopes rows to the signed-in owner, which is exactly the intent.
--
--   · get_hgp_finance_summary() — Houston Generator Pros revenue splits
--     (total, service/maintenance, emergency — matching the category tagging
--     used by the hgp_visit income sync in 20260716000016) plus inventory
--     value, deposits held, and active-agreement recurring value.
--
-- Run AFTER 20260716000015 + 20260716000016 (uses their tables).
-- Safe to re-run. Run in the Supabase SQL editor.
-- ============================================================================


-- ─── 1. Holdings · per-entity performance rollup ────────────────────────────
CREATE OR REPLACE FUNCTION public.get_holdings_entity_performance()
RETURNS TABLE (
  entity_id TEXT,
  income NUMERIC,
  expense NUMERIC,
  cleared_checks NUMERIC
)
LANGUAGE sql
STABLE
AS $$
  WITH txn AS (
    SELECT
      t.entity_id,
      sum(CASE WHEN t.type = 'income'  AND COALESCE(t.status, '') <> 'voided' THEN COALESCE(t.total_amount, t.amount, 0) ELSE 0 END) AS income,
      sum(CASE WHEN t.type = 'expense' AND COALESCE(t.status, '') <> 'voided' THEN COALESCE(t.total_amount, t.amount, 0) ELSE 0 END) AS expense
    FROM public.transactions t
    WHERE t.deleted_at IS NULL
    GROUP BY t.entity_id
  ),
  chk AS (
    SELECT
      c.entity_id,
      sum(CASE WHEN c.status = 'cleared' THEN COALESCE(c.amount, 0) ELSE 0 END) AS cleared_checks
    FROM public.checks c
    WHERE c.deleted_at IS NULL
    GROUP BY c.entity_id
  )
  SELECT
    COALESCE(txn.entity_id, chk.entity_id) AS entity_id,
    COALESCE(txn.income, 0) AS income,
    COALESCE(txn.expense, 0) AS expense,
    COALESCE(chk.cleared_checks, 0) AS cleared_checks
  FROM txn
  FULL OUTER JOIN chk ON chk.entity_id = txn.entity_id;
$$;


-- ─── 2. HGP · generator-operations finance summary ──────────────────────────
CREATE OR REPLACE FUNCTION public.get_hgp_finance_summary()
RETURNS TABLE (
  total_income NUMERIC,
  total_expense NUMERIC,
  service_revenue NUMERIC,
  emergency_revenue NUMERIC,
  inventory_value NUMERIC,
  deposits_held NUMERIC,
  recurring_annual_value NUMERIC
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    (SELECT COALESCE(sum(COALESCE(t.total_amount, t.amount, 0)), 0)
     FROM public.transactions t
     WHERE t.entity_id = 'houston-generator-pros' AND t.deleted_at IS NULL
       AND t.type = 'income' AND COALESCE(t.status, '') <> 'voided') AS total_income,
    (SELECT COALESCE(sum(COALESCE(t.total_amount, t.amount, 0)), 0)
     FROM public.transactions t
     WHERE t.entity_id = 'houston-generator-pros' AND t.deleted_at IS NULL
       AND t.type = 'expense' AND COALESCE(t.status, '') <> 'voided') AS total_expense,
    (SELECT COALESCE(sum(COALESCE(t.total_amount, t.amount, 0)), 0)
     FROM public.transactions t
     WHERE t.entity_id = 'houston-generator-pros' AND t.deleted_at IS NULL
       AND t.type = 'income' AND COALESCE(t.status, '') <> 'voided'
       AND t.category ~* '(service|maintenance|plan)') AS service_revenue,
    (SELECT COALESCE(sum(COALESCE(t.total_amount, t.amount, 0)), 0)
     FROM public.transactions t
     WHERE t.entity_id = 'houston-generator-pros' AND t.deleted_at IS NULL
       AND t.type = 'income' AND COALESCE(t.status, '') <> 'voided'
       AND (COALESCE(t.category, '') || ' ' || COALESCE(t.description, '')) ~* '(emergency|after.?hours)') AS emergency_revenue,
    (SELECT COALESCE(sum(u.unit_cost), 0)
     FROM public.hgp_equipment_units u
     WHERE u.deleted_at IS NULL AND u.status IN ('in_stock', 'reserved')) AS inventory_value,
    (SELECT COALESCE(sum(u.deposit_amount), 0)
     FROM public.hgp_equipment_units u
     WHERE u.deleted_at IS NULL AND u.status IN ('in_stock', 'reserved')) AS deposits_held,
    (SELECT COALESCE(sum(a.annual_value), 0)
     FROM public.hgp_service_agreements a
     WHERE a.deleted_at IS NULL AND a.status = 'active') AS recurring_annual_value;
$$;


-- ─── 3. Verification ────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.verify_entity_finance_summaries()
RETURNS TABLE (check_name TEXT, ok BOOLEAN, details TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY VALUES
    ('holdings_entity_performance_rpc',
      EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_holdings_entity_performance'),
      'server-side per-entity income/expense/check rollup'),
    ('hgp_finance_summary_rpc',
      EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_hgp_finance_summary'),
      'server-side HGP revenue splits, inventory value, deposits, recurring value');
END;
$$;

NOTIFY pgrst, 'reload schema';
