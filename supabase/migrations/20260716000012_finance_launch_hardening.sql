-- ============================================================================
-- HOU INC · Finance Launch Hardening
--
-- Adds launch-grade infrastructure for:
--   1. reconciliation audit history
--   2. bank feed imports + intelligent match suggestions
--   3. role overrides beyond auth metadata
--   4. unique protection for linked financial source rows
--   5. realtime / write / schema health events
--
-- Safe to re-run except the unique external_reference index can fail if live
-- duplicate external references already exist. If it fails, resolve duplicates:
--   SELECT external_reference, count(*)
--   FROM public.transactions
--   WHERE external_reference IS NOT NULL AND COALESCE(external_reference,'') <> ''
--     AND deleted_at IS NULL
--   GROUP BY external_reference HAVING count(*) > 1;
-- ============================================================================

-- ── Expanded role model ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.app_user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_id TEXT NOT NULL DEFAULT 'houston-enterprise',
  role TEXT NOT NULL CHECK (role IN (
    'admin',
    'finance_manager',
    'finance',
    'project_manager',
    'client',
    'read_only_auditor',
    'viewer'
  )),
  is_active BOOLEAN NOT NULL DEFAULT true,
  assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT,
  UNIQUE (user_id, entity_id, role)
);

ALTER TABLE public.app_user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS app_user_roles_self_select ON public.app_user_roles;
CREATE POLICY app_user_roles_self_select
  ON public.app_user_roles FOR SELECT
  USING (auth.uid() = user_id
    OR COALESCE(auth.jwt()->'user_metadata'->>'role', '') = 'admin'
    OR EXISTS (
    SELECT 1 FROM public.app_user_roles r
    WHERE r.user_id = auth.uid()
      AND r.entity_id = app_user_roles.entity_id
      AND r.is_active
      AND r.role = 'admin'
  ));

DROP POLICY IF EXISTS app_user_roles_admin_all ON public.app_user_roles;
CREATE POLICY app_user_roles_admin_all
  ON public.app_user_roles FOR ALL
  USING (COALESCE(auth.jwt()->'user_metadata'->>'role', '') = 'admin' OR EXISTS (
    SELECT 1 FROM public.app_user_roles r
    WHERE r.user_id = auth.uid()
      AND r.entity_id = app_user_roles.entity_id
      AND r.is_active
      AND r.role = 'admin'
  ))
  WITH CHECK (COALESCE(auth.jwt()->'user_metadata'->>'role', '') = 'admin' OR EXISTS (
    SELECT 1 FROM public.app_user_roles r
    WHERE r.user_id = auth.uid()
      AND r.entity_id = app_user_roles.entity_id
      AND r.is_active
      AND r.role = 'admin'
  ));

CREATE INDEX IF NOT EXISTS idx_app_user_roles_user_entity
  ON public.app_user_roles(user_id, entity_id, is_active);

-- ── Reconciliation audit history ────────────────────────────────────────────
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS cleared_date DATE,
  ADD COLUMN IF NOT EXISTS reconciliation_status TEXT,
  ADD COLUMN IF NOT EXISTS external_reference TEXT,
  ADD COLUMN IF NOT EXISTS transaction_number TEXT,
  ADD COLUMN IF NOT EXISTS check_reference TEXT,
  ADD COLUMN IF NOT EXISTS invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS external_invoice_number TEXT,
  ADD COLUMN IF NOT EXISTS amount_before_tax NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_amount NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS net_amount NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS posting_date DATE,
  ADD COLUMN IF NOT EXISTS payment_status TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT,
  ADD COLUMN IF NOT EXISTS approval_status TEXT,
  ADD COLUMN IF NOT EXISTS payment_method TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE public.checks
  ADD COLUMN IF NOT EXISTS cleared_date DATE,
  ADD COLUMN IF NOT EXISTS reconciliation_status TEXT,
  ADD COLUMN IF NOT EXISTS external_reference TEXT,
  ADD COLUMN IF NOT EXISTS delivery_status TEXT,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS entity_id TEXT NOT NULL DEFAULT 'houston-enterprise',
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS amount_paid NUMERIC(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS line_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS tax_rate NUMERIC(7,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE TABLE IF NOT EXISTS public.finance_reconciliation_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  entity_id TEXT NOT NULL DEFAULT 'houston-enterprise',
  source_table TEXT NOT NULL CHECK (source_table IN ('transactions', 'checks')),
  source_record_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('reconciled', 'reopened', 'bulk_reconciled', 'bulk_reopened')),
  previous_reconciled BOOLEAN,
  new_reconciled BOOLEAN,
  previous_status TEXT,
  new_status TEXT,
  previous_cleared_date DATE,
  new_cleared_date DATE,
  amount NUMERIC(14,2),
  reference TEXT,
  counterparty TEXT,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  signature TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.finance_reconciliation_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS finance_recon_audit_select ON public.finance_reconciliation_audit;
CREATE POLICY finance_recon_audit_select
  ON public.finance_reconciliation_audit FOR SELECT
  USING (auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM public.app_user_roles r
    WHERE r.user_id = auth.uid()
      AND r.entity_id = finance_reconciliation_audit.entity_id
      AND r.is_active
      AND r.role IN ('admin', 'finance_manager', 'finance', 'read_only_auditor')
  ));

DROP POLICY IF EXISTS finance_recon_audit_insert ON public.finance_reconciliation_audit;
CREATE POLICY finance_recon_audit_insert
  ON public.finance_reconciliation_audit FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_finance_recon_audit_entity_created
  ON public.finance_reconciliation_audit(entity_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_finance_recon_audit_source
  ON public.finance_reconciliation_audit(source_table, source_record_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.audit_reconciliation_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_table TEXT := TG_TABLE_NAME;
  v_prev BOOLEAN;
  v_next BOOLEAN;
  v_prev_status TEXT;
  v_next_status TEXT;
  v_prev_cleared DATE;
  v_next_cleared DATE;
  v_reference TEXT;
  v_counterparty TEXT;
  v_date DATE;
BEGIN
  v_prev := COALESCE(OLD.reconciled, false);
  v_next := COALESCE(NEW.reconciled, false);
  v_prev_status := COALESCE(OLD.reconciliation_status, CASE WHEN v_prev THEN 'reconciled' ELSE 'unreconciled' END);
  v_next_status := COALESCE(NEW.reconciliation_status, CASE WHEN v_next THEN 'reconciled' ELSE 'unreconciled' END);
  v_prev_cleared := OLD.cleared_date;
  v_next_cleared := NEW.cleared_date;

  IF v_prev IS NOT DISTINCT FROM v_next
     AND v_prev_status IS NOT DISTINCT FROM v_next_status
     AND v_prev_cleared IS NOT DISTINCT FROM v_next_cleared THEN
    RETURN NEW;
  END IF;

  IF v_table = 'checks' THEN
    v_reference := COALESCE(NEW.check_number, NEW.external_reference, NEW.id::text);
    v_counterparty := NEW.payee_name;
    v_date := NEW.issue_date;
  ELSE
    v_reference := COALESCE(NEW.check_reference, NEW.external_reference, NEW.transaction_number, NEW.id::text);
    v_counterparty := COALESCE(NEW.source_name, NEW.description);
    v_date := NEW.transaction_date;
  END IF;

  INSERT INTO public.finance_reconciliation_audit (
    user_id, entity_id, source_table, source_record_id, action,
    previous_reconciled, new_reconciled, previous_status, new_status,
    previous_cleared_date, new_cleared_date, amount, reference,
    counterparty, project_id, signature, metadata
  ) VALUES (
    auth.uid(), COALESCE(NEW.entity_id, 'houston-enterprise'), v_table, NEW.id,
    CASE WHEN v_next THEN 'reconciled' ELSE 'reopened' END,
    v_prev, v_next, v_prev_status, v_next_status,
    v_prev_cleared, v_next_cleared, NEW.amount, v_reference,
    v_counterparty, NEW.project_id, 'database-trigger',
    jsonb_build_object('source_date', v_date, 'trigger', TG_NAME)
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_transaction_reconciliation ON public.transactions;
CREATE TRIGGER trg_audit_transaction_reconciliation
  AFTER UPDATE OF reconciled, reconciliation_status, cleared_date ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_reconciliation_change();

DROP TRIGGER IF EXISTS trg_audit_check_reconciliation ON public.checks;
CREATE TRIGGER trg_audit_check_reconciliation
  AFTER UPDATE OF reconciled, reconciliation_status, cleared_date ON public.checks
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_reconciliation_change();

-- ── Bank feed imports + match suggestions ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.finance_bank_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_id TEXT NOT NULL DEFAULT 'houston-enterprise',
  bank_account_id UUID REFERENCES public.finance_bank_accounts(id) ON DELETE SET NULL,
  file_name TEXT,
  source TEXT NOT NULL DEFAULT 'manual',
  imported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'imported' CHECK (status IN ('imported', 'matched', 'needs_review', 'archived')),
  row_count INT NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS public.finance_bank_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_id UUID REFERENCES public.finance_bank_imports(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_id TEXT NOT NULL DEFAULT 'houston-enterprise',
  bank_account_id UUID REFERENCES public.finance_bank_accounts(id) ON DELETE SET NULL,
  activity_date DATE NOT NULL,
  posted_date DATE,
  amount NUMERIC(14,2) NOT NULL,
  description TEXT,
  reference TEXT,
  counterparty TEXT,
  normalized_reference TEXT GENERATED ALWAYS AS (lower(regexp_replace(COALESCE(reference, ''), '\s+', '', 'g'))) STORED,
  match_status TEXT NOT NULL DEFAULT 'unmatched' CHECK (match_status IN ('unmatched', 'suggested', 'matched', 'ignored')),
  matched_source_table TEXT CHECK (matched_source_table IS NULL OR matched_source_table IN ('transactions', 'checks')),
  matched_source_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.finance_bank_match_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_id TEXT NOT NULL DEFAULT 'houston-enterprise',
  bank_activity_id UUID NOT NULL REFERENCES public.finance_bank_activity(id) ON DELETE CASCADE,
  source_table TEXT NOT NULL CHECK (source_table IN ('transactions', 'checks')),
  source_record_id UUID NOT NULL,
  confidence NUMERIC(5,2) NOT NULL CHECK (confidence BETWEEN 0 AND 100),
  amount_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  date_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  reference_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  counterparty_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'suggested' CHECK (status IN ('suggested', 'accepted', 'rejected', 'stale')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (bank_activity_id, source_table, source_record_id)
);

ALTER TABLE public.finance_bank_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_bank_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_bank_match_suggestions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS finance_bank_imports_entity ON public.finance_bank_imports;
CREATE POLICY finance_bank_imports_entity ON public.finance_bank_imports FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS finance_bank_activity_entity ON public.finance_bank_activity;
CREATE POLICY finance_bank_activity_entity ON public.finance_bank_activity FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS finance_bank_match_suggestions_entity ON public.finance_bank_match_suggestions;
CREATE POLICY finance_bank_match_suggestions_entity ON public.finance_bank_match_suggestions FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_finance_bank_activity_entity_status
  ON public.finance_bank_activity(entity_id, match_status, activity_date DESC);

CREATE INDEX IF NOT EXISTS idx_finance_bank_activity_reference
  ON public.finance_bank_activity(entity_id, normalized_reference)
  WHERE normalized_reference <> '';

CREATE INDEX IF NOT EXISTS idx_finance_bank_match_suggestions_queue
  ON public.finance_bank_match_suggestions(entity_id, status, confidence DESC, created_at DESC);

CREATE OR REPLACE FUNCTION public.generate_bank_match_suggestions(p_bank_activity_id UUID)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  a public.finance_bank_activity%ROWTYPE;
  inserted_count INT := 0;
BEGIN
  SELECT * INTO a FROM public.finance_bank_activity WHERE id = p_bank_activity_id;
  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  INSERT INTO public.finance_bank_match_suggestions (
    user_id, entity_id, bank_activity_id, source_table, source_record_id,
    confidence, amount_score, date_score, reference_score, counterparty_score, metadata
  )
  SELECT
    a.user_id,
    a.entity_id,
    a.id,
    candidate.source_table,
    candidate.source_record_id,
    LEAST(100, candidate.amount_score + candidate.date_score + candidate.reference_score + candidate.counterparty_score),
    candidate.amount_score,
    candidate.date_score,
    candidate.reference_score,
    candidate.counterparty_score,
    candidate.metadata
  FROM (
    SELECT
      'transactions'::text AS source_table,
      t.id AS source_record_id,
      CASE WHEN abs(abs(t.amount) - abs(a.amount)) < 0.01 THEN 45 ELSE 0 END AS amount_score,
      GREATEST(0, 25 - (abs(t.transaction_date - a.activity_date) * 5))::numeric AS date_score,
      CASE
        WHEN lower(regexp_replace(COALESCE(t.check_reference, t.external_reference, t.transaction_number, ''), '\s+', '', 'g')) = a.normalized_reference AND a.normalized_reference <> '' THEN 20
        ELSE 0
      END AS reference_score,
      CASE
        WHEN lower(COALESCE(t.source_name, t.description, '')) LIKE '%' || lower(COALESCE(a.counterparty, a.description, '')) || '%' AND COALESCE(a.counterparty, a.description, '') <> '' THEN 10
        ELSE 0
      END AS counterparty_score,
      jsonb_build_object('date', t.transaction_date, 'amount', t.amount, 'reference', COALESCE(t.check_reference, t.external_reference, t.transaction_number)) AS metadata
    FROM public.transactions t
    WHERE t.entity_id = a.entity_id
      AND t.deleted_at IS NULL
      AND COALESCE(t.reconciled, false) = false
      AND abs(abs(t.amount) - abs(a.amount)) <= GREATEST(1, abs(a.amount) * 0.02)
      AND abs(t.transaction_date - a.activity_date) <= 5

    UNION ALL

    SELECT
      'checks'::text AS source_table,
      c.id AS source_record_id,
      CASE WHEN abs(abs(c.amount) - abs(a.amount)) < 0.01 THEN 45 ELSE 0 END AS amount_score,
      GREATEST(0, 25 - (abs(c.issue_date - a.activity_date) * 5))::numeric AS date_score,
      CASE
        WHEN lower(regexp_replace(COALESCE(c.check_number, c.external_reference, ''), '\s+', '', 'g')) = a.normalized_reference AND a.normalized_reference <> '' THEN 20
        ELSE 0
      END AS reference_score,
      CASE
        WHEN lower(COALESCE(c.payee_name, c.memo, '')) LIKE '%' || lower(COALESCE(a.counterparty, a.description, '')) || '%' AND COALESCE(a.counterparty, a.description, '') <> '' THEN 10
        ELSE 0
      END AS counterparty_score,
      jsonb_build_object('date', c.issue_date, 'amount', c.amount, 'reference', COALESCE(c.check_number, c.external_reference)) AS metadata
    FROM public.checks c
    WHERE c.entity_id = a.entity_id
      AND c.deleted_at IS NULL
      AND COALESCE(c.reconciled, false) = false
      AND abs(abs(c.amount) - abs(a.amount)) <= GREATEST(1, abs(a.amount) * 0.02)
      AND abs(c.issue_date - a.activity_date) <= 5
  ) candidate
  WHERE LEAST(100, candidate.amount_score + candidate.date_score + candidate.reference_score + candidate.counterparty_score) >= 60
  ON CONFLICT (bank_activity_id, source_table, source_record_id) DO UPDATE
  SET
    confidence = EXCLUDED.confidence,
    amount_score = EXCLUDED.amount_score,
    date_score = EXCLUDED.date_score,
    reference_score = EXCLUDED.reference_score,
    counterparty_score = EXCLUDED.counterparty_score,
    status = 'suggested',
    metadata = EXCLUDED.metadata;

  GET DIAGNOSTICS inserted_count = ROW_COUNT;

  UPDATE public.finance_bank_activity
  SET match_status = CASE WHEN inserted_count > 0 THEN 'suggested' ELSE match_status END
  WHERE id = a.id;

  RETURN inserted_count;
END;
$$;

-- ── Unique protection for linked source records ─────────────────────────────
CREATE UNIQUE INDEX IF NOT EXISTS ux_transactions_live_external_reference
  ON public.transactions (external_reference)
  WHERE external_reference IS NOT NULL
    AND external_reference <> ''
    AND deleted_at IS NULL;

-- ── Paid invoice → income ledger sync ───────────────────────────────────────
CREATE OR REPLACE FUNCTION public.invoice_total_amount(p_line_items JSONB, p_tax_rate NUMERIC DEFAULT 0)
RETURNS NUMERIC
LANGUAGE sql
IMMUTABLE
AS $$
  WITH lines AS (
    SELECT
      COALESCE((item->>'qty')::numeric, 0) AS qty,
      COALESCE((item->>'rate')::numeric, 0) AS rate
    FROM jsonb_array_elements(COALESCE(p_line_items, '[]'::jsonb)) item
  ),
  subtotal AS (
    SELECT COALESCE(sum(qty * rate), 0) AS amount FROM lines
  )
  SELECT round((amount + (amount * COALESCE(p_tax_rate, 0) / 100))::numeric, 2)
  FROM subtotal;
$$;

CREATE OR REPLACE FUNCTION public.sync_paid_invoice_to_income()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing_id UUID;
  v_ref TEXT;
  v_total NUMERIC(14,2);
  v_txn_date DATE;
BEGIN
  IF NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_ref := 'invoice:' || NEW.id::text;
  v_total := COALESCE(NULLIF(NEW.amount_paid, 0), public.invoice_total_amount(NEW.line_items, NEW.tax_rate));
  v_txn_date := COALESCE(NEW.updated_at::date, NEW.issue_date, CURRENT_DATE);

  SELECT id INTO v_existing_id
  FROM public.transactions
  WHERE (
      external_reference = v_ref
      OR (invoice_id = NEW.id AND type = 'income' AND COALESCE(status, '') <> 'voided')
    )
    AND deleted_at IS NULL
  ORDER BY created_at ASC
  LIMIT 1;

  IF NEW.status <> 'paid' THEN
    IF v_existing_id IS NOT NULL THEN
      UPDATE public.transactions
      SET
        status = 'voided',
        payment_status = 'voided',
        notes = 'Invoice is no longer marked paid; linked income voided to prevent collection overstatement.',
        updated_by = NEW.user_id,
        updated_at = now()
      WHERE id = v_existing_id;
    END IF;
    RETURN NEW;
  END IF;

  IF v_total <= 0 THEN
    RETURN NEW;
  END IF;

  IF v_existing_id IS NOT NULL THEN
    UPDATE public.transactions
    SET
      user_id = NEW.user_id,
      entity_id = NEW.entity_id,
      type = 'income',
      amount = v_total,
      amount_before_tax = v_total,
      tax_amount = 0,
      total_amount = v_total,
      net_amount = v_total,
      transaction_date = v_txn_date,
      posting_date = v_txn_date,
      source_name = COALESCE(NULLIF(NEW.client_name, ''), NULLIF(NEW.client_company, ''), 'Invoice payment'),
      project_id = NEW.project_id,
      category = 'Invoice Payment',
      description = 'Paid invoice: ' || NEW.invoice_number,
      notes = COALESCE(NULLIF(NEW.notes, ''), 'Auto-created from paid invoice status.'),
      payment_method = COALESCE(payment_method, 'invoice_payment'),
      status = 'posted',
      approval_status = 'approved',
      payment_status = 'paid',
      reconciliation_status = COALESCE(reconciliation_status, 'unreconciled'),
      invoice_id = NEW.id,
      external_reference = v_ref,
      external_invoice_number = NEW.invoice_number,
      updated_by = NEW.user_id,
      updated_at = now()
    WHERE id = v_existing_id;
  ELSE
    INSERT INTO public.transactions (
      user_id, entity_id, type, amount, amount_before_tax, tax_amount,
      total_amount, net_amount, transaction_date, posting_date, source_name,
      project_id, category, description, notes, payment_method, status,
      approval_status, payment_status, reconciliation_status, invoice_id,
      external_reference, external_invoice_number, created_by, updated_by
    ) VALUES (
      NEW.user_id, NEW.entity_id, 'income', v_total, v_total, 0,
      v_total, v_total, v_txn_date, v_txn_date,
      COALESCE(NULLIF(NEW.client_name, ''), NULLIF(NEW.client_company, ''), 'Invoice payment'),
      NEW.project_id, 'Invoice Payment', 'Paid invoice: ' || NEW.invoice_number,
      COALESCE(NULLIF(NEW.notes, ''), 'Auto-created from paid invoice status.'),
      'invoice_payment', 'posted', 'approved', 'paid', 'unreconciled',
      NEW.id, v_ref, NEW.invoice_number, NEW.user_id, NEW.user_id
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_paid_invoice_to_income ON public.invoices;
CREATE TRIGGER trg_sync_paid_invoice_to_income
  AFTER INSERT OR UPDATE OF status, amount_paid, line_items, tax_rate, project_id ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_paid_invoice_to_income();

-- ── Server-side ledger pagination/filtering foundation ──────────────────────
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
      t.cleared_date
    FROM public.transactions t
    LEFT JOIN public.projects p ON p.id = t.project_id
    LEFT JOIN public.vendors v ON v.id = t.vendor_id
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
      c.cleared_date
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
        COALESCE(u.project_name, '') ILIKE '%' || p_search || '%'
      )
  )
  SELECT f.*, count(*) OVER() AS total_count
  FROM filtered f
  ORDER BY f.ledger_date DESC NULLS LAST, f.source_id DESC
  LIMIT LEAST(GREATEST(p_limit, 1), 500)
  OFFSET GREATEST(p_offset, 0);
$$;

-- ── Health events for realtime / writes / schema cache issues ───────────────
CREATE TABLE IF NOT EXISTS public.system_health_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  entity_id TEXT,
  area TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'error', 'critical')),
  message TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.system_health_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS system_health_events_insert ON public.system_health_events;
CREATE POLICY system_health_events_insert
  ON public.system_health_events FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS system_health_events_admin_select ON public.system_health_events;
CREATE POLICY system_health_events_admin_select
  ON public.system_health_events FOR SELECT
  USING (auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM public.app_user_roles r
    WHERE r.user_id = auth.uid()
      AND r.is_active
      AND r.role IN ('admin', 'finance_manager', 'read_only_auditor')
  ));

CREATE INDEX IF NOT EXISTS idx_system_health_events_created
  ON public.system_health_events(severity, created_at DESC);

-- ── Realtime registration ───────────────────────────────────────────────────
DO $$ BEGIN
  BEGIN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.finance_reconciliation_audit';
  EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_object THEN NULL; END;
  BEGIN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.finance_bank_activity';
  EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_object THEN NULL; END;
  BEGIN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.finance_bank_match_suggestions';
  EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_object THEN NULL; END;
  BEGIN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.system_health_events';
  EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_object THEN NULL; END;
END $$;

NOTIFY pgrst, 'reload schema';
