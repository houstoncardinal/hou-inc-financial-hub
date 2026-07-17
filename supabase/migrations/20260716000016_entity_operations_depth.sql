-- ============================================================================
-- HOU INC · Entity Operations Depth (HGP service engine + Holdings debt engine)
--
-- Deepens 20260716000015 with the financial workflows that actually move money:
--
--   Houston Generator Pros
--     · hgp_equipment_units gains deposit_amount / deposit_received_date /
--       install_labor_cost / inspection_status — deposits and true job margin
--       (equipment COGS + install labor, not equipment alone)
--     · hgp_service_visits — scheduled/emergency/repair/warranty/inspection
--       calls with technician, hours, cost, and revenue. A trigger mirrors
--       visit revenue into the income ledger (idempotency key
--       'hgp_visit:<id>', category 'Emergency Service' or 'Service
--       Maintenance' so the Generator Ops revenue split picks it up), and
--       stamps the parent agreement's last_visit_date.
--
--   Houston Enterprise Holdings
--     · holdings_note_payments — payments against notes with principal /
--       interest split. Triggers:
--         1. recompute the parent note's outstanding_balance from logged
--            principal portions (only when payments exist — notes without
--            logged payments keep their manually-entered balance), flipping
--            status active ↔ paid_off at zero;
--         2. mirror the INTEREST portion into the ledger (income 'Interest
--            Income' on receivable notes, expense 'Interest Expense' on
--            payable notes — principal movement is a balance-sheet event,
--            not P&L, and is deliberately NOT booked as income/expense).
--            Idempotency key 'note_payment:<id>'.
--
-- Follows the proven external_reference mirror pattern from the funded-draw
-- (20260716000011) and paid-invoice (20260716000012) syncs, protected by the
-- existing ux_transactions_live_external_reference unique index.
-- Safe to re-run. Run in the Supabase SQL editor after 20260716000015.
-- ============================================================================


-- ─── 1. HGP · deposits, labor, inspection on equipment units ────────────────
ALTER TABLE public.hgp_equipment_units
  ADD COLUMN IF NOT EXISTS deposit_amount        NUMERIC(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deposit_received_date DATE,
  ADD COLUMN IF NOT EXISTS install_labor_cost    NUMERIC(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS inspection_status     TEXT;


-- ─── 2. HGP · service visits / calls ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.hgp_service_visits (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_id         TEXT NOT NULL DEFAULT 'houston-generator-pros',
  agreement_id      UUID REFERENCES public.hgp_service_agreements(id) ON DELETE SET NULL,
  equipment_unit_id UUID REFERENCES public.hgp_equipment_units(id) ON DELETE SET NULL,
  customer_name     TEXT NOT NULL,
  visit_date        DATE NOT NULL DEFAULT CURRENT_DATE,
  visit_type        TEXT NOT NULL DEFAULT 'scheduled'
    CHECK (visit_type IN ('scheduled', 'emergency', 'repair', 'warranty', 'inspection')),
  technician        TEXT,
  labor_hours       NUMERIC(7,2) NOT NULL DEFAULT 0,
  revenue           NUMERIC(14,2) NOT NULL DEFAULT 0,
  cost              NUMERIC(14,2) NOT NULL DEFAULT 0,
  summary           TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at        TIMESTAMPTZ
);

ALTER TABLE public.hgp_service_visits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS hgp_service_visits_owner ON public.hgp_service_visits;
CREATE POLICY hgp_service_visits_owner ON public.hgp_service_visits FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_hgp_visits_entity_date
  ON public.hgp_service_visits(entity_id, visit_date DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_hgp_visits_agreement
  ON public.hgp_service_visits(agreement_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_hgp_visit_reference
  ON public.transactions (external_reference)
  WHERE external_reference LIKE 'hgp_visit:%';

-- Visit revenue → income ledger (and last_visit_date stamp on the agreement)
CREATE OR REPLACE FUNCTION public.sync_hgp_visit_income()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ref TEXT;
  v_existing_id UUID;
  v_row public.hgp_service_visits%ROWTYPE;
  v_category TEXT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_row := OLD;
  ELSE
    v_row := NEW;
  END IF;
  v_ref := 'hgp_visit:' || v_row.id::text;

  SELECT id INTO v_existing_id
  FROM public.transactions
  WHERE external_reference = v_ref AND deleted_at IS NULL
  ORDER BY created_at ASC
  LIMIT 1;

  -- Void the mirrored income when the visit is removed or has no revenue.
  IF TG_OP = 'DELETE' OR v_row.deleted_at IS NOT NULL OR COALESCE(v_row.revenue, 0) <= 0 THEN
    IF v_existing_id IS NOT NULL THEN
      UPDATE public.transactions
      SET status = 'voided',
          payment_status = 'voided',
          notes = 'Linked service visit removed or zeroed; income voided to prevent revenue overstatement.',
          updated_at = now()
      WHERE id = v_existing_id AND COALESCE(status, '') <> 'voided';
    END IF;
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
  END IF;

  v_category := CASE WHEN v_row.visit_type = 'emergency' THEN 'Emergency Service' ELSE 'Service Maintenance' END;

  IF v_existing_id IS NOT NULL THEN
    UPDATE public.transactions
    SET user_id = v_row.user_id,
        entity_id = v_row.entity_id,
        type = 'income',
        amount = v_row.revenue,
        amount_before_tax = v_row.revenue,
        tax_amount = 0,
        total_amount = v_row.revenue,
        net_amount = v_row.revenue,
        transaction_date = v_row.visit_date,
        posting_date = v_row.visit_date,
        source_name = v_row.customer_name,
        category = v_category,
        description = initcap(v_row.visit_type) || ' service visit: ' || v_row.customer_name,
        notes = COALESCE(v_row.summary, 'Auto-created from generator service visit.'),
        payment_method = COALESCE(payment_method, 'service_visit'),
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
      category, description, notes, payment_method, status,
      approval_status, payment_status, reconciliation_status,
      external_reference, created_by, updated_by
    ) VALUES (
      v_row.user_id, v_row.entity_id, 'income', v_row.revenue, v_row.revenue, 0,
      v_row.revenue, v_row.revenue, v_row.visit_date, v_row.visit_date, v_row.customer_name,
      v_category, initcap(v_row.visit_type) || ' service visit: ' || v_row.customer_name,
      COALESCE(v_row.summary, 'Auto-created from generator service visit.'),
      'service_visit', 'posted', 'approved', 'paid', 'unreconciled',
      v_ref, v_row.user_id, v_row.user_id
    );
  END IF;

  -- Stamp the maintenance plan's last completed visit.
  IF v_row.agreement_id IS NOT NULL THEN
    UPDATE public.hgp_service_agreements
    SET last_visit_date = GREATEST(COALESCE(last_visit_date, v_row.visit_date), v_row.visit_date)
    WHERE id = v_row.agreement_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_hgp_visit_income ON public.hgp_service_visits;
CREATE TRIGGER trg_sync_hgp_visit_income
  AFTER INSERT OR UPDATE ON public.hgp_service_visits
  FOR EACH ROW EXECUTE FUNCTION public.sync_hgp_visit_income();

DROP TRIGGER IF EXISTS trg_void_hgp_visit_income ON public.hgp_service_visits;
CREATE TRIGGER trg_void_hgp_visit_income
  AFTER DELETE ON public.hgp_service_visits
  FOR EACH ROW EXECUTE FUNCTION public.sync_hgp_visit_income();


-- ─── 3. Holdings · note payments ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.holdings_note_payments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_id         TEXT NOT NULL DEFAULT 'houston-enterprise-holdings',
  note_id           UUID NOT NULL REFERENCES public.holdings_notes(id) ON DELETE CASCADE,
  payment_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  amount            NUMERIC(14,2) NOT NULL,
  principal_portion NUMERIC(14,2) NOT NULL DEFAULT 0,
  interest_portion  NUMERIC(14,2) NOT NULL DEFAULT 0,
  memo              TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at        TIMESTAMPTZ
);

ALTER TABLE public.holdings_note_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS holdings_note_payments_owner ON public.holdings_note_payments;
CREATE POLICY holdings_note_payments_owner ON public.holdings_note_payments FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_holdings_note_payments_note
  ON public.holdings_note_payments(note_id, payment_date DESC) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_note_payment_reference
  ON public.transactions (external_reference)
  WHERE external_reference LIKE 'note_payment:%';

-- Recompute the parent note's balance from logged principal portions. Notes
-- with NO logged payments keep their manually-entered outstanding_balance.
CREATE OR REPLACE FUNCTION public.apply_holdings_note_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_note_id UUID;
  v_principal NUMERIC(14,2);
  v_paid_principal NUMERIC(14,2);
  v_live_payments INT;
  v_new_balance NUMERIC(14,2);
BEGIN
  v_note_id := COALESCE(NEW.note_id, OLD.note_id);

  SELECT principal INTO v_principal FROM public.holdings_notes WHERE id = v_note_id;
  IF NOT FOUND THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
  END IF;

  SELECT COALESCE(sum(principal_portion), 0), count(*)
  INTO v_paid_principal, v_live_payments
  FROM public.holdings_note_payments
  WHERE note_id = v_note_id AND deleted_at IS NULL;

  IF v_live_payments > 0 THEN
    v_new_balance := GREATEST(v_principal - v_paid_principal, 0);
    UPDATE public.holdings_notes
    SET outstanding_balance = v_new_balance,
        status = CASE
          WHEN v_new_balance = 0 AND status = 'active' THEN 'paid_off'
          WHEN v_new_balance > 0 AND status = 'paid_off' THEN 'active'
          ELSE status
        END
    WHERE id = v_note_id;
  END IF;

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_apply_holdings_note_payment ON public.holdings_note_payments;
CREATE TRIGGER trg_apply_holdings_note_payment
  AFTER INSERT OR UPDATE OR DELETE ON public.holdings_note_payments
  FOR EACH ROW EXECUTE FUNCTION public.apply_holdings_note_payment();

-- Mirror the INTEREST portion into the ledger. Principal repayment is a
-- balance-sheet movement, not P&L, and is deliberately not booked here.
CREATE OR REPLACE FUNCTION public.sync_note_payment_txn()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.holdings_note_payments%ROWTYPE;
  v_ref TEXT;
  v_existing_id UUID;
  v_note public.holdings_notes%ROWTYPE;
  v_type TEXT;
  v_category TEXT;
BEGIN
  IF TG_OP = 'DELETE' THEN v_row := OLD; ELSE v_row := NEW; END IF;
  v_ref := 'note_payment:' || v_row.id::text;

  SELECT id INTO v_existing_id
  FROM public.transactions
  WHERE external_reference = v_ref AND deleted_at IS NULL
  ORDER BY created_at ASC
  LIMIT 1;

  IF TG_OP = 'DELETE' OR v_row.deleted_at IS NOT NULL OR COALESCE(v_row.interest_portion, 0) <= 0 THEN
    IF v_existing_id IS NOT NULL THEN
      UPDATE public.transactions
      SET status = 'voided',
          payment_status = 'voided',
          notes = 'Linked note payment removed or has no interest portion; entry voided.',
          updated_at = now()
      WHERE id = v_existing_id AND COALESCE(status, '') <> 'voided';
    END IF;
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
  END IF;

  SELECT * INTO v_note FROM public.holdings_notes WHERE id = v_row.note_id;
  IF NOT FOUND THEN RETURN NEW; END IF;

  IF v_note.direction = 'receivable' THEN
    v_type := 'income';  v_category := 'Interest Income';
  ELSE
    v_type := 'expense'; v_category := 'Interest Expense';
  END IF;

  IF v_existing_id IS NOT NULL THEN
    UPDATE public.transactions
    SET user_id = v_row.user_id,
        entity_id = v_row.entity_id,
        type = v_type::txn_type,
        amount = v_row.interest_portion,
        amount_before_tax = v_row.interest_portion,
        tax_amount = 0,
        total_amount = v_row.interest_portion,
        net_amount = v_row.interest_portion,
        transaction_date = v_row.payment_date,
        posting_date = v_row.payment_date,
        source_name = v_note.counterparty_name,
        category = v_category,
        description = 'Note ' || v_note.direction || ' interest — ' || v_note.counterparty_name,
        notes = COALESCE(v_row.memo, 'Auto-created from note payment.'),
        payment_method = COALESCE(payment_method, 'note_payment'),
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
      category, description, notes, payment_method, status,
      approval_status, payment_status, reconciliation_status,
      external_reference, created_by, updated_by
    ) VALUES (
      v_row.user_id, v_row.entity_id, v_type::txn_type,
      v_row.interest_portion, v_row.interest_portion, 0,
      v_row.interest_portion, v_row.interest_portion,
      v_row.payment_date, v_row.payment_date, v_note.counterparty_name,
      v_category, 'Note ' || v_note.direction || ' interest — ' || v_note.counterparty_name,
      COALESCE(v_row.memo, 'Auto-created from note payment.'),
      'note_payment', 'posted', 'approved', 'paid', 'unreconciled',
      v_ref, v_row.user_id, v_row.user_id
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_note_payment_txn ON public.holdings_note_payments;
CREATE TRIGGER trg_sync_note_payment_txn
  AFTER INSERT OR UPDATE ON public.holdings_note_payments
  FOR EACH ROW EXECUTE FUNCTION public.sync_note_payment_txn();

DROP TRIGGER IF EXISTS trg_void_note_payment_txn ON public.holdings_note_payments;
CREATE TRIGGER trg_void_note_payment_txn
  AFTER DELETE ON public.holdings_note_payments
  FOR EACH ROW EXECUTE FUNCTION public.sync_note_payment_txn();


-- ─── 4. updated_at + realtime for the new tables ────────────────────────────
DO $$ DECLARE t TEXT; BEGIN
  FOREACH t IN ARRAY ARRAY['hgp_service_visits', 'holdings_note_payments'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%s_updated ON public.%I', t, t);
    EXECUTE format('CREATE TRIGGER trg_%s_updated BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()', t, t);
    BEGIN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    EXCEPTION
      WHEN duplicate_object THEN NULL;
      WHEN undefined_object THEN NULL;
    END;
  END LOOP;
END $$;


-- ─── 5. Verification ────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.verify_entity_operations_depth()
RETURNS TABLE (check_name TEXT, ok BOOLEAN, details TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY VALUES
    ('hgp_service_engine',
      EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='hgp_service_visits')
      AND EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'sync_hgp_visit_income')
      AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='hgp_equipment_units' AND column_name='install_labor_cost'),
      'service visits table, visit→income sync, deposits/labor columns'),
    ('holdings_debt_engine',
      EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='holdings_note_payments')
      AND EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'apply_holdings_note_payment')
      AND EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'sync_note_payment_txn'),
      'note payments table, balance recompute, interest→ledger sync');
END;
$$;

NOTIFY pgrst, 'reload schema';
