-- ============================================================================
-- HOU INC · HGP Procurement + Visit Scheduling
--
--   1. hgp_purchase_orders — equipment purchase orders: distributor, PO
--      number, order date, total, status. sync_hgp_po_expense mirrors each
--      PO into an HGP EXPENSE transaction (idempotency key 'hgp_po:<id>',
--      category 'Generator Equipment Purchase' — exactly the HGP expense
--      catalog string, so procurement spend classifies identically to
--      manual entries across the ledger and charts). Voiding a PO voids
--      its expense. hgp_equipment_units gains po_id so one PO can cover
--      several received units.
--
--   2. hgp_service_visits gains a lifecycle: status scheduled → completed
--      (or cancelled). Existing rows are grandfathered 'completed' via the
--      column DEFAULT. sync_hgp_visit_income is rebuilt with a status
--      guard: revenue mirrors into income ONLY when a visit is completed —
--      scheduling a future visit with an expected revenue no longer books
--      money that hasn't been earned, and cancelling voids any mirror.
--      The agreement's last_visit_date stamp also moves behind the
--      completed guard.
--
--   3. verify_hgp_procurement_scheduling() — launch verification.
--
-- Owner-scoped RLS, indexed, realtime-registered. Safe to re-run.
-- Run in the Supabase SQL editor after 20260718000001.
-- ============================================================================


-- ─── 1. Purchase orders ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.hgp_purchase_orders (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_id    TEXT NOT NULL DEFAULT 'houston-generator-pros',
  vendor_id    UUID REFERENCES public.vendors(id) ON DELETE SET NULL,
  po_number    TEXT,
  order_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  total_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  status       TEXT NOT NULL DEFAULT 'received'
    CHECK (status IN ('ordered', 'received', 'cancelled')),
  memo         TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at   TIMESTAMPTZ
);

ALTER TABLE public.hgp_purchase_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS hgp_purchase_orders_owner ON public.hgp_purchase_orders;
CREATE POLICY hgp_purchase_orders_owner ON public.hgp_purchase_orders FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_hgp_po_vendor
  ON public.hgp_purchase_orders(vendor_id, order_date DESC) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_hgp_po_ref
  ON public.transactions (external_reference)
  WHERE external_reference LIKE 'hgp_po:%';

ALTER TABLE public.hgp_equipment_units
  ADD COLUMN IF NOT EXISTS po_id UUID REFERENCES public.hgp_purchase_orders(id) ON DELETE SET NULL;

-- PO → expense mirror (cancelled/voided POs void their expense).
CREATE OR REPLACE FUNCTION public.sync_hgp_po_expense()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.hgp_purchase_orders%ROWTYPE;
  v_ref TEXT;
  v_existing_id UUID;
  v_vendor_name TEXT;
BEGIN
  IF TG_OP = 'DELETE' THEN v_row := OLD; ELSE v_row := NEW; END IF;
  v_ref := 'hgp_po:' || v_row.id::text;

  SELECT id INTO v_existing_id
  FROM public.transactions
  WHERE external_reference = v_ref AND deleted_at IS NULL
  ORDER BY created_at ASC
  LIMIT 1;

  IF TG_OP = 'DELETE' OR v_row.deleted_at IS NOT NULL
     OR v_row.status = 'cancelled' OR COALESCE(v_row.total_amount, 0) <= 0 THEN
    IF v_existing_id IS NOT NULL THEN
      UPDATE public.transactions
      SET status = 'voided',
          payment_status = 'voided',
          notes = 'Linked purchase order removed or cancelled; expense voided.',
          updated_at = now()
      WHERE id = v_existing_id AND COALESCE(status, '') <> 'voided';
    END IF;
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
  END IF;

  SELECT name INTO v_vendor_name FROM public.vendors WHERE id = v_row.vendor_id;

  IF v_existing_id IS NOT NULL THEN
    UPDATE public.transactions
    SET user_id = v_row.user_id,
        entity_id = v_row.entity_id,
        type = 'expense',
        amount = v_row.total_amount,
        amount_before_tax = v_row.total_amount,
        tax_amount = 0,
        total_amount = v_row.total_amount,
        net_amount = v_row.total_amount,
        transaction_date = v_row.order_date,
        posting_date = v_row.order_date,
        source_name = COALESCE(v_vendor_name, 'Generator distributor'),
        vendor_id = v_row.vendor_id,
        category = 'Generator Equipment Purchase',
        description = 'Purchase order' || COALESCE(' ' || v_row.po_number, '')
          || COALESCE(' — ' || v_vendor_name, ''),
        notes = COALESCE(v_row.memo, 'Auto-created from equipment purchase order.'),
        check_reference = v_row.po_number,
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
      vendor_id, category, description, notes, check_reference, status,
      approval_status, payment_status, reconciliation_status,
      external_reference, created_by, updated_by
    ) VALUES (
      v_row.user_id, v_row.entity_id, 'expense', v_row.total_amount, v_row.total_amount, 0,
      v_row.total_amount, v_row.total_amount, v_row.order_date, v_row.order_date,
      COALESCE(v_vendor_name, 'Generator distributor'), v_row.vendor_id,
      'Generator Equipment Purchase',
      'Purchase order' || COALESCE(' ' || v_row.po_number, '') || COALESCE(' — ' || v_vendor_name, ''),
      COALESCE(v_row.memo, 'Auto-created from equipment purchase order.'),
      v_row.po_number, 'posted', 'approved', 'paid', 'unreconciled',
      v_ref, v_row.user_id, v_row.user_id
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_hgp_po_expense ON public.hgp_purchase_orders;
CREATE TRIGGER trg_sync_hgp_po_expense
  AFTER INSERT OR UPDATE ON public.hgp_purchase_orders
  FOR EACH ROW EXECUTE FUNCTION public.sync_hgp_po_expense();

DROP TRIGGER IF EXISTS trg_void_hgp_po_expense ON public.hgp_purchase_orders;
CREATE TRIGGER trg_void_hgp_po_expense
  AFTER DELETE ON public.hgp_purchase_orders
  FOR EACH ROW EXECUTE FUNCTION public.sync_hgp_po_expense();


-- ─── 2. Visit lifecycle: scheduled → completed / cancelled ──────────────────
ALTER TABLE public.hgp_service_visits
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'completed'
    CHECK (status IN ('scheduled', 'completed', 'cancelled'));

CREATE INDEX IF NOT EXISTS idx_hgp_visits_status_date
  ON public.hgp_service_visits(status, visit_date) WHERE deleted_at IS NULL;

-- Rebuild the income mirror with the completed-only guard.
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

  -- Income exists only for a live, COMPLETED visit with revenue. Scheduled
  -- and cancelled visits (or zeroed/removed ones) void any mirror.
  IF TG_OP = 'DELETE' OR v_row.deleted_at IS NOT NULL
     OR v_row.status <> 'completed' OR COALESCE(v_row.revenue, 0) <= 0 THEN
    IF v_existing_id IS NOT NULL THEN
      UPDATE public.transactions
      SET status = 'voided',
          payment_status = 'voided',
          notes = 'Linked service visit removed, cancelled, or not completed; income voided.',
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

  -- Completed visits stamp the maintenance plan's last-visit date.
  IF v_row.agreement_id IS NOT NULL THEN
    UPDATE public.hgp_service_agreements
    SET last_visit_date = GREATEST(COALESCE(last_visit_date, v_row.visit_date), v_row.visit_date)
    WHERE id = v_row.agreement_id;
  END IF;

  RETURN NEW;
END;
$$;
-- (Existing triggers trg_sync_hgp_visit_income / trg_void_hgp_visit_income
--  keep pointing at this function — no re-creation needed.)


-- ─── 3. Verification ────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.verify_hgp_procurement_scheduling()
RETURNS TABLE (check_name TEXT, ok BOOLEAN, details TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY VALUES
    ('hgp_purchase_orders',
      EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='hgp_purchase_orders')
      AND EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'sync_hgp_po_expense'),
      'equipment POs mirror into HGP expenses (Generator Equipment Purchase)'),
    ('hgp_visit_lifecycle',
      EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='hgp_service_visits' AND column_name='status'),
      'visits carry scheduled/completed/cancelled; income mirrors only on completion');
END;
$$;

-- Realtime + updated_at for the PO table.
DO $$ BEGIN
  EXECUTE 'DROP TRIGGER IF EXISTS trg_hgp_purchase_orders_updated ON public.hgp_purchase_orders';
  EXECUTE 'CREATE TRIGGER trg_hgp_purchase_orders_updated BEFORE UPDATE ON public.hgp_purchase_orders FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()';
  BEGIN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.hgp_purchase_orders';
  EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN undefined_object THEN NULL;
  END;
END $$;

NOTIFY pgrst, 'reload schema';
