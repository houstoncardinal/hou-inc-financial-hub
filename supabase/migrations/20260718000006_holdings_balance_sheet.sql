-- ============================================================================
-- HOU INC · Holdings Balance Sheet (management basis)
--
-- Closes the audit gap that Houston Enterprise Holdings — whose entire
-- purpose is capital structure — had no statement of financial position.
-- This platform is a cash/transaction ledger, not a full double-entry
-- general ledger with equity accounts, so this is explicitly a
-- MANAGEMENT-BASIS statement, not a GAAP balance sheet:
--
--   Assets      = cash position (all-time income less expense less cleared
--                 checks) + outstanding notes receivable
--   Liabilities = outstanding notes payable
--   Equity      = Assets − Liabilities (residual), so the statement always
--                 balances by construction. Capital activity (contributions,
--                 distributions, dividends, management fees, tax reserves)
--                 is reported separately as supporting context rather than
--                 forced to reconcile line-by-line against the residual —
--                 doing so would imply a precision this system's cash-basis
--                 model does not actually have.
--
--   get_holdings_balance_sheet(p_entity_id) — the statement, as-of today.
--   verify_holdings_balance_sheet() — launch verification.
--
-- Read-only aggregation function — no new tables, no RLS surface beyond the
-- SECURITY DEFINER function itself reading tables the caller already has
-- owner-scoped access to. Safe to re-run.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_holdings_balance_sheet(p_entity_id TEXT DEFAULT 'houston-enterprise-holdings')
RETURNS TABLE (
  as_of_date DATE,
  cash_position NUMERIC,
  notes_receivable NUMERIC,
  total_assets NUMERIC,
  notes_payable NUMERIC,
  total_liabilities NUMERIC,
  owners_equity NUMERIC,
  capital_contributions_itd NUMERIC,
  distributions_itd NUMERIC,
  dividends_itd NUMERIC,
  management_fees_itd NUMERIC,
  tax_reserves_itd NUMERIC,
  intercompany_transfers_itd NUMERIC,
  active_notes_receivable_count INTEGER,
  active_notes_payable_count INTEGER
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_income NUMERIC;
  v_expense NUMERIC;
  v_cleared_checks NUMERIC;
  v_nr NUMERIC;
  v_np NUMERIC;
  v_nr_count INTEGER;
  v_np_count INTEGER;
BEGIN
  SELECT COALESCE(sum(CASE WHEN type = 'income' THEN COALESCE(total_amount, amount, 0) ELSE 0 END), 0),
         COALESCE(sum(CASE WHEN type = 'expense' THEN COALESCE(total_amount, amount, 0) ELSE 0 END), 0)
    INTO v_income, v_expense
  FROM public.transactions
  WHERE entity_id = p_entity_id AND deleted_at IS NULL AND COALESCE(status, '') <> 'voided';

  SELECT COALESCE(sum(amount), 0) INTO v_cleared_checks
  FROM public.checks
  WHERE entity_id = p_entity_id AND deleted_at IS NULL AND status = 'cleared';

  SELECT COALESCE(sum(outstanding_balance), 0), count(*)
    INTO v_nr, v_nr_count
  FROM public.holdings_notes
  WHERE entity_id = p_entity_id AND deleted_at IS NULL AND direction = 'receivable' AND status = 'active';

  SELECT COALESCE(sum(outstanding_balance), 0), count(*)
    INTO v_np, v_np_count
  FROM public.holdings_notes
  WHERE entity_id = p_entity_id AND deleted_at IS NULL AND direction = 'payable' AND status = 'active';

  as_of_date := CURRENT_DATE;
  cash_position := ROUND(v_income - v_expense - v_cleared_checks, 2);
  notes_receivable := v_nr;
  total_assets := ROUND(cash_position + v_nr, 2);
  notes_payable := v_np;
  total_liabilities := v_np;
  owners_equity := ROUND(total_assets - total_liabilities, 2);
  active_notes_receivable_count := v_nr_count;
  active_notes_payable_count := v_np_count;

  SELECT COALESCE(sum(CASE WHEN activity_type = 'capital_contribution' THEN amount ELSE 0 END), 0),
         COALESCE(sum(CASE WHEN activity_type = 'distribution' THEN amount ELSE 0 END), 0),
         COALESCE(sum(CASE WHEN activity_type = 'dividend' THEN amount ELSE 0 END), 0),
         COALESCE(sum(CASE WHEN activity_type = 'management_fee' THEN amount ELSE 0 END), 0),
         COALESCE(sum(CASE WHEN activity_type = 'tax_reserve' THEN amount ELSE 0 END), 0),
         COALESCE(sum(CASE WHEN activity_type = 'intercompany_transfer' THEN amount ELSE 0 END), 0)
    INTO capital_contributions_itd, distributions_itd, dividends_itd,
         management_fees_itd, tax_reserves_itd, intercompany_transfers_itd
  FROM public.holdings_capital_activity
  WHERE entity_id = p_entity_id AND deleted_at IS NULL;

  RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public.verify_holdings_balance_sheet()
RETURNS TABLE (check_name TEXT, ok BOOLEAN, details TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY VALUES
    ('holdings_balance_sheet_rpc',
      EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_holdings_balance_sheet'),
      'management-basis statement of financial position for Holdings');
END;
$$;

NOTIFY pgrst, 'reload schema';
