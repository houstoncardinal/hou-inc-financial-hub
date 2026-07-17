-- ============================================================================
-- HOU INC · Ledger Entity Context
--
-- Extends get_ledger_page (20260716000012) with two columns that surface the
-- BUSINESS meaning of trigger-mirrored ledger rows inline:
--
--   context_kind  — 'service_visit' | 'note_payment' | 'draw' | 'invoice'
--   context_label — human line, e.g.
--        'Emergency visit · Smith Residence · Guardian 24kW'
--        'First National Bank · we owe'
--        'Draw · Foundation Complete'
--        'Invoice INV-1042'
--
-- Sources are the idempotency keys the sync triggers already write:
--   hgp_visit:<id>      → hgp_service_visits (+ equipment model)  [20260716000016]
--   note_payment:<id>   → holdings_note_payments → holdings_notes [20260716000016]
--   draw_schedule:<id>  → draw_schedules                          [20260716000011]
--   invoice:<id>        → invoices                                [20260716000012]
--
-- Search now also matches context_label, so "filter by generator customer,
-- note counterparty, or draw milestone" works from the existing search box.
--
-- CREATE OR REPLACE cannot change a function's result columns, so the old
-- signature is dropped first — callers use named parameters via PostgREST,
-- which resolves the new signature transparently.
--
-- Run AFTER 20260716000016. Safe to re-run. Run in the Supabase SQL editor.
-- ============================================================================

DROP FUNCTION IF EXISTS public.get_ledger_page(TEXT, INT, INT, TEXT, UUID, TEXT);

CREATE OR REPLACE FUNCTION public.get_ledger_page(
  p_entity_id TEXT DEFAULT 'houston-enterprise',
  p_limit INT DEFAULT 50,
  p_offset INT DEFAULT 0,
  p_search TEXT DEFAULT NULL,
  p_project_id UUID DEFAULT NULL,
  p_type TEXT DEFAULT NULL
)
RETURNS TABLE (
  row_kind TEXT,
  source_id UUID,
  entity_id TEXT,
  project_id UUID,
  project_name TEXT,
  ledger_type TEXT,
  ledger_date DATE,
  reference TEXT,
  counterparty TEXT,
  amount NUMERIC,
  status TEXT,
  reconciled BOOLEAN,
  reconciliation_status TEXT,
  cleared_date DATE,
  context_kind TEXT,
  context_label TEXT,
  total_count BIGINT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH unified AS (
    SELECT
      'transaction'::text AS row_kind,
      t.id AS source_id,
      t.entity_id,
      t.project_id,
      p.name AS project_name,
      t.type::text AS ledger_type,
      t.transaction_date AS ledger_date,
      COALESCE(t.check_reference, t.external_reference, t.transaction_number, t.id::text) AS reference,
      COALESCE(t.source_name, v.name, t.description, t.category, 'Transaction') AS counterparty,
      CASE WHEN t.type = 'expense' THEN -abs(t.amount) ELSE abs(t.amount) END AS amount,
      COALESCE(t.status, t.payment_status, 'posted') AS status,
      COALESCE(t.reconciled, false) AS reconciled,
      COALESCE(t.reconciliation_status, CASE WHEN COALESCE(t.reconciled, false) THEN 'reconciled' ELSE 'unreconciled' END) AS reconciliation_status,
      t.cleared_date,
      ctx.context_kind,
      ctx.context_label
    FROM public.transactions t
    LEFT JOIN public.projects p ON p.id = t.project_id
    LEFT JOIN public.vendors v ON v.id = t.vendor_id
    LEFT JOIN LATERAL (
      SELECT
        CASE
          WHEN t.external_reference ~ '^hgp_visit:[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'     THEN 'service_visit'
          WHEN t.external_reference ~ '^note_payment:[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'  THEN 'note_payment'
          WHEN t.external_reference ~ '^draw_schedule:[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' THEN 'draw'
          WHEN t.external_reference ~ '^invoice:[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'       THEN 'invoice'
        END AS context_kind,
        CASE
          WHEN t.external_reference ~ '^hgp_visit:[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' THEN (
            SELECT initcap(sv.visit_type) || ' visit · ' || sv.customer_name
                   || COALESCE(' · ' || eu.model, '')
                   || COALESCE(' · SN ' || eu.serial_number, '')
            FROM public.hgp_service_visits sv
            LEFT JOIN public.hgp_equipment_units eu ON eu.id = sv.equipment_unit_id
            WHERE sv.id = substring(t.external_reference FROM 11)::uuid
          )
          WHEN t.external_reference ~ '^note_payment:[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' THEN (
            SELECT hn.counterparty_name || ' · '
                   || CASE hn.direction WHEN 'receivable' THEN 'we hold' ELSE 'we owe' END
                   || CASE WHEN np.interest_portion > 0 THEN ' · interest' ELSE '' END
            FROM public.holdings_note_payments np
            JOIN public.holdings_notes hn ON hn.id = np.note_id
            WHERE np.id = substring(t.external_reference FROM 14)::uuid
          )
          WHEN t.external_reference ~ '^draw_schedule:[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' THEN (
            SELECT 'Draw · ' || ds.milestone_name
            FROM public.draw_schedules ds
            WHERE ds.id = substring(t.external_reference FROM 15)::uuid
          )
          WHEN t.external_reference ~ '^invoice:[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' THEN (
            SELECT 'Invoice ' || i.invoice_number
            FROM public.invoices i
            WHERE i.id = substring(t.external_reference FROM 9)::uuid
          )
        END AS context_label
    ) ctx ON true
    WHERE t.entity_id = p_entity_id
      AND t.deleted_at IS NULL

    UNION ALL

    SELECT
      'check'::text AS row_kind,
      c.id AS source_id,
      c.entity_id,
      c.project_id,
      p.name AS project_name,
      'check'::text AS ledger_type,
      c.issue_date AS ledger_date,
      COALESCE(c.check_number, c.external_reference, c.id::text) AS reference,
      COALESCE(c.payee_name, v.name, c.memo, 'Check') AS counterparty,
      -abs(c.amount) AS amount,
      COALESCE(c.status::text, c.delivery_status, 'pending') AS status,
      COALESCE(c.reconciled, false) AS reconciled,
      COALESCE(c.reconciliation_status, CASE WHEN COALESCE(c.reconciled, false) THEN 'reconciled' ELSE 'unreconciled' END) AS reconciliation_status,
      c.cleared_date,
      NULL::text AS context_kind,
      NULL::text AS context_label
    FROM public.checks c
    LEFT JOIN public.projects p ON p.id = c.project_id
    LEFT JOIN public.vendors v ON v.id = c.payee_vendor_id
    WHERE c.entity_id = p_entity_id
      AND c.deleted_at IS NULL
  ),
  filtered AS (
    SELECT *
    FROM unified u
    WHERE (p_project_id IS NULL OR u.project_id = p_project_id)
      AND (p_type IS NULL OR p_type = 'all' OR u.ledger_type = p_type)
      AND (
        p_search IS NULL OR trim(p_search) = '' OR
        u.reference ILIKE '%' || p_search || '%' OR
        u.counterparty ILIKE '%' || p_search || '%' OR
        COALESCE(u.project_name, '') ILIKE '%' || p_search || '%' OR
        COALESCE(u.context_label, '') ILIKE '%' || p_search || '%'
      )
  )
  SELECT f.*, count(*) OVER() AS total_count
  FROM filtered f
  ORDER BY f.ledger_date DESC NULLS LAST, f.source_id DESC
  LIMIT LEAST(GREATEST(p_limit, 1), 500)
  OFFSET GREATEST(p_offset, 0);
$$;


-- ─── Verification ───────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.verify_ledger_entity_context()
RETURNS TABLE (check_name TEXT, ok BOOLEAN, details TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY VALUES
    ('ledger_context_columns',
      EXISTS (
        SELECT 1 FROM pg_proc pr
        WHERE pr.proname = 'get_ledger_page'
          AND pg_get_function_result(pr.oid) LIKE '%context_label%'
      ),
      'get_ledger_page returns context_kind/context_label with searchable joins');
END;
$$;

NOTIFY pgrst, 'reload schema';
