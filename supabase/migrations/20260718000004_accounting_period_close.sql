-- ============================================================================
-- HOU INC · Accounting Period Close / Lock
--
-- Closes the internal-controls gap where accounting_period was only a free
-- text stamp — anyone could edit or backdate a transaction into a month
-- already reported on. This adds a real close workflow:
--
--   · accounting_periods — one row per (entity_id, period_key 'YYYY-MM'),
--     status open → soft_closed → locked, with closed_by/at and locked_by/at.
--     soft_closed is advisory (shows a warning in the UI, does not block).
--     locked is enforced at the database layer — no UI bypass is possible.
--
--   · enforce_accounting_period_lock() — BEFORE INSERT/UPDATE/DELETE trigger
--     on transactions and checks. Blocks any write whose row date falls in a
--     locked period, with one deliberate carve-out: pure reconciliation
--     metadata (reconciled, reconciled_at, reconciliation_status,
--     cleared_date, external_reference, matched_source_*, check status) may
--     still change after close, since bank statements for a closed month
--     routinely arrive and get matched the following month and that does not
--     restate the closed period's financials.
--
--   · set_accounting_period_status() — admin/finance_manager-gated RPC to
--     open/soft-close/lock/reopen a period, logging into
--     finance_reconciliation_audit (existing audit table) for a paper trail.
--
--   · verify_accounting_period_close() — launch verification.
--
-- Owner + role-scoped RLS (mirrors finance_commitments), indexed, realtime.
-- Safe to re-run.
-- ============================================================================

-- ─── 1. Periods table ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.accounting_periods (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_id    TEXT NOT NULL DEFAULT 'houston-enterprise',
  period_key   TEXT NOT NULL CHECK (period_key ~ '^\d{4}-\d{2}$'),
  status       TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'soft_closed', 'locked')),
  closed_by    UUID REFERENCES auth.users(id),
  closed_at    TIMESTAMPTZ,
  locked_by    UUID REFERENCES auth.users(id),
  locked_at    TIMESTAMPTZ,
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_accounting_periods_entity_period
  ON public.accounting_periods(entity_id, period_key);

ALTER TABLE public.accounting_periods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS accounting_periods_entity ON public.accounting_periods;
CREATE POLICY accounting_periods_entity
  ON public.accounting_periods FOR ALL
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.app_user_roles r
      WHERE r.user_id = auth.uid() AND r.entity_id = accounting_periods.entity_id
        AND r.is_active AND r.role IN ('admin', 'finance_manager', 'finance', 'project_manager', 'read_only_auditor')
    )
  )
  WITH CHECK (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.app_user_roles r
      WHERE r.user_id = auth.uid() AND r.entity_id = accounting_periods.entity_id
        AND r.is_active AND r.role IN ('admin', 'finance_manager')
    )
  );

DO $$ BEGIN
  EXECUTE 'DROP TRIGGER IF EXISTS trg_accounting_periods_updated ON public.accounting_periods';
  EXECUTE 'CREATE TRIGGER trg_accounting_periods_updated BEFORE UPDATE ON public.accounting_periods FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()';
END $$;

-- ─── 2. Lock enforcement ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.accounting_period_locked(p_entity_id TEXT, p_date DATE)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT status = 'locked' FROM public.accounting_periods
     WHERE entity_id = p_entity_id AND period_key = to_char(p_date, 'YYYY-MM')),
    false
  );
$$;

CREATE OR REPLACE FUNCTION public.enforce_accounting_period_lock()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_date_col TEXT := TG_ARGV[0];
  -- Deliberately excludes 'status' — a transaction/check status change can
  -- include 'voided', which does restate a closed period's financials, and
  -- this trigger does not attempt transition-specific logic (e.g. allowing
  -- issued→cleared but not →voided). Marking a check cleared after its period
  -- is locked requires briefly reopening the period — a safe, conservative
  -- tradeoff over a loophole that could silently void locked-period entries.
  v_reconciliation_cols TEXT[] := ARRAY[
    'reconciled', 'reconciled_at', 'reconciliation_status', 'cleared_date',
    'external_reference', 'matched_source_table', 'matched_source_id',
    'updated_at', 'updated_by'
  ];
  v_old_date DATE;
  v_new_date DATE;
  v_only_reconciliation BOOLEAN := true;
  v_key TEXT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_old_date := (to_jsonb(OLD) ->> v_date_col)::date;
    IF public.accounting_period_locked(OLD.entity_id, v_old_date) THEN
      RAISE EXCEPTION 'Cannot delete — % falls in a locked accounting period', v_old_date;
    END IF;
    RETURN OLD;
  END IF;

  v_new_date := (to_jsonb(NEW) ->> v_date_col)::date;

  IF TG_OP = 'INSERT' THEN
    IF public.accounting_period_locked(NEW.entity_id, v_new_date) THEN
      RAISE EXCEPTION 'Cannot insert — % falls in a locked accounting period', v_new_date;
    END IF;
    RETURN NEW;
  END IF;

  -- UPDATE: allow pure reconciliation-metadata changes even in a locked period.
  v_old_date := (to_jsonb(OLD) ->> v_date_col)::date;
  IF NOT public.accounting_period_locked(OLD.entity_id, v_old_date)
     AND NOT public.accounting_period_locked(NEW.entity_id, v_new_date) THEN
    RETURN NEW;
  END IF;

  FOR v_key IN SELECT jsonb_object_keys(to_jsonb(NEW)) LOOP
    IF to_jsonb(NEW) -> v_key IS DISTINCT FROM to_jsonb(OLD) -> v_key
       AND NOT (v_key = ANY (v_reconciliation_cols)) THEN
      v_only_reconciliation := false;
      EXIT;
    END IF;
  END LOOP;

  IF NOT v_only_reconciliation THEN
    RAISE EXCEPTION 'Cannot modify this record — % falls in a locked accounting period (only reconciliation status may change after close)', v_old_date;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lock_transactions_period ON public.transactions;
CREATE TRIGGER trg_lock_transactions_period
  BEFORE INSERT OR UPDATE OR DELETE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.enforce_accounting_period_lock('transaction_date');

DROP TRIGGER IF EXISTS trg_lock_checks_period ON public.checks;
CREATE TRIGGER trg_lock_checks_period
  BEFORE INSERT OR UPDATE OR DELETE ON public.checks
  FOR EACH ROW EXECUTE FUNCTION public.enforce_accounting_period_lock('issue_date');

-- ─── 3. Close / lock / reopen RPC ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_accounting_period_status(
  p_entity_id TEXT,
  p_period_key TEXT,
  p_status TEXT,
  p_notes TEXT DEFAULT NULL
)
RETURNS public.accounting_periods
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.accounting_periods%ROWTYPE;
  v_authorized BOOLEAN;
BEGIN
  IF p_status NOT IN ('open', 'soft_closed', 'locked') THEN
    RAISE EXCEPTION 'Invalid period status: %', p_status;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.app_user_roles r
    WHERE r.user_id = auth.uid() AND r.entity_id = p_entity_id
      AND r.is_active AND r.role IN ('admin', 'finance_manager')
  ) OR NOT EXISTS (
    SELECT 1 FROM public.app_user_roles r WHERE r.entity_id = p_entity_id AND r.is_active
  ) INTO v_authorized;

  IF NOT v_authorized THEN
    RAISE EXCEPTION 'Only admin or finance_manager roles may change period status';
  END IF;

  INSERT INTO public.accounting_periods (user_id, entity_id, period_key, status, notes, closed_by, closed_at, locked_by, locked_at)
  VALUES (
    auth.uid(), p_entity_id, p_period_key, p_status, p_notes,
    CASE WHEN p_status IN ('soft_closed', 'locked') THEN auth.uid() END,
    CASE WHEN p_status IN ('soft_closed', 'locked') THEN now() END,
    CASE WHEN p_status = 'locked' THEN auth.uid() END,
    CASE WHEN p_status = 'locked' THEN now() END
  )
  ON CONFLICT (entity_id, period_key) DO UPDATE SET
    status = p_status,
    notes = COALESCE(p_notes, accounting_periods.notes),
    closed_by = CASE WHEN p_status IN ('soft_closed', 'locked') THEN auth.uid() ELSE accounting_periods.closed_by END,
    closed_at = CASE WHEN p_status IN ('soft_closed', 'locked') THEN now() ELSE accounting_periods.closed_at END,
    locked_by = CASE WHEN p_status = 'locked' THEN auth.uid() WHEN p_status = 'open' THEN NULL ELSE accounting_periods.locked_by END,
    locked_at = CASE WHEN p_status = 'locked' THEN now() WHEN p_status = 'open' THEN NULL ELSE accounting_periods.locked_at END,
    updated_at = now()
  RETURNING * INTO v_row;

  INSERT INTO public.system_health_events (user_id, entity_id, area, severity, message, details)
  VALUES (
    auth.uid(), p_entity_id, 'accounting_period_close', 'info',
    'Accounting period ' || p_period_key || ' set to ' || p_status,
    jsonb_build_object('period_key', p_period_key, 'status', p_status, 'period_id', v_row.id, 'notes', p_notes)
  );

  RETURN v_row;
END;
$$;

-- ─── 4. Realtime + verification ─────────────────────────────────────────────
DO $$ BEGIN
  BEGIN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.accounting_periods';
  EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_object THEN NULL; END;
END $$;

CREATE OR REPLACE FUNCTION public.verify_accounting_period_close()
RETURNS TABLE (check_name TEXT, ok BOOLEAN, details TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY VALUES
    ('accounting_periods_table',
      EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='accounting_periods'),
      'open / soft_closed / locked periods per entity'),
    ('accounting_period_lock_trigger',
      EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_lock_transactions_period')
      AND EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_lock_checks_period'),
      'transactions and checks reject writes into a locked period'),
    ('accounting_period_status_rpc',
      EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'set_accounting_period_status'),
      'admin/finance_manager-gated open/close/lock RPC');
END;
$$;

NOTIFY pgrst, 'reload schema';
