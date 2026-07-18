-- ============================================================================
-- HOU INC · HGP Inventory Management System
--
-- Serialized generators already live in hgp_equipment_units. This migration
-- adds the rest of a real generator-company inventory system:
--
--   · hgp_parts — quantity-tracked parts & materials (batteries, filters,
--     transfer switches, wiring, pads…) with SKU, bin location, unit cost,
--     reorder point/quantity, and preferred supplier.
--
--   · hgp_inventory_movements — the auditable stock ledger. Every receive /
--     consume / adjust / return / reserve / install is a row, linked to the
--     part or serialized unit it moved, and optionally the job, service
--     visit, and vendor involved. Corrections are soft-deletes that reverse
--     their effect — history is never silently rewritten.
--
--   Integration triggers:
--   · apply_hgp_part_movement — movements maintain hgp_parts.qty_on_hand
--     (received/returned add, consumed subtracts, adjusted applies a signed
--     delta). Quantities may go negative deliberately: a negative count is a
--     miscount signal the UI flags, not a state to hide. When a consumption
--     names a job, the movement's total cost flows into hgp_jobs.materials_cost
--     — parts pulled for an install price themselves into that job's margin
--     automatically. Soft-deleting a movement reverses both effects.
--   · log_hgp_unit_movement — serialized units write their own lifecycle
--     into the same ledger (received on insert, then reserved / installed /
--     service_only / returned on status change), including transitions made
--     by the job-completion automation, so one ledger tells the whole story.
--
--   · get_hgp_inventory_position() — invoker-rights rollup: units on hand +
--     value, part SKUs + value, low-stock count, 30-day consumption value.
--   · verify_hgp_inventory() — launch verification.
--
-- Owner-scoped RLS, indexed, realtime-registered. Safe to re-run.
-- Run in the Supabase SQL editor after 20260717000007.
-- ============================================================================


-- ─── 1. Parts & materials ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.hgp_parts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_id     TEXT NOT NULL DEFAULT 'houston-generator-pros',
  sku           TEXT,
  name          TEXT NOT NULL,
  category      TEXT NOT NULL DEFAULT 'parts'
    CHECK (category IN ('parts', 'batteries', 'transfer_switches', 'electrical', 'fuel_system', 'pads_enclosures', 'consumables', 'other')),
  unit_cost     NUMERIC(14,2) NOT NULL DEFAULT 0,
  qty_on_hand   NUMERIC(12,2) NOT NULL DEFAULT 0,
  reorder_point NUMERIC(12,2) NOT NULL DEFAULT 0,
  reorder_qty   NUMERIC(12,2),
  vendor_id     UUID REFERENCES public.vendors(id) ON DELETE SET NULL,
  location      TEXT,
  notes         TEXT,
  metadata      JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at    TIMESTAMPTZ
);

ALTER TABLE public.hgp_parts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS hgp_parts_owner ON public.hgp_parts;
CREATE POLICY hgp_parts_owner ON public.hgp_parts FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE UNIQUE INDEX IF NOT EXISTS ux_hgp_parts_sku
  ON public.hgp_parts(user_id, sku) WHERE sku IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_hgp_parts_category
  ON public.hgp_parts(entity_id, category) WHERE deleted_at IS NULL;


-- ─── 2. Inventory movement ledger ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.hgp_inventory_movements (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_id         TEXT NOT NULL DEFAULT 'houston-generator-pros',
  part_id           UUID REFERENCES public.hgp_parts(id) ON DELETE SET NULL,
  equipment_unit_id UUID REFERENCES public.hgp_equipment_units(id) ON DELETE SET NULL,
  job_id            UUID REFERENCES public.hgp_jobs(id) ON DELETE SET NULL,
  visit_id          UUID REFERENCES public.hgp_service_visits(id) ON DELETE SET NULL,
  vendor_id         UUID REFERENCES public.vendors(id) ON DELETE SET NULL,
  movement_type     TEXT NOT NULL
    CHECK (movement_type IN ('received', 'consumed', 'adjusted', 'returned', 'reserved', 'released', 'installed', 'service_only')),
  quantity          NUMERIC(12,2) NOT NULL DEFAULT 1,
  unit_cost         NUMERIC(14,2),
  total_cost        NUMERIC(14,2),
  memo              TEXT,
  metadata          JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at        TIMESTAMPTZ
);

ALTER TABLE public.hgp_inventory_movements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS hgp_inventory_movements_owner ON public.hgp_inventory_movements;
CREATE POLICY hgp_inventory_movements_owner ON public.hgp_inventory_movements FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_hgp_movements_part
  ON public.hgp_inventory_movements(part_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_hgp_movements_job
  ON public.hgp_inventory_movements(job_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_hgp_movements_type_time
  ON public.hgp_inventory_movements(movement_type, created_at DESC) WHERE deleted_at IS NULL;


-- ─── 3. Movements maintain part quantities + job materials cost ─────────────
CREATE OR REPLACE FUNCTION public.apply_hgp_part_movement()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.hgp_inventory_movements%ROWTYPE;
  v_delta NUMERIC(12,2);
  v_cost NUMERIC(14,2);
  v_reverse BOOLEAN := false;
BEGIN
  v_row := NEW;
  -- Soft-delete = reversal; ignore other updates (ledger rows are immutable
  -- in spirit — corrections happen by voiding, never editing amounts).
  IF TG_OP = 'UPDATE' THEN
    IF NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN
      v_reverse := true;
    ELSE
      RETURN NEW;
    END IF;
  END IF;

  -- Quantity effect on parts.
  IF v_row.part_id IS NOT NULL THEN
    v_delta := CASE v_row.movement_type
      WHEN 'received'  THEN v_row.quantity
      WHEN 'returned'  THEN v_row.quantity
      WHEN 'consumed'  THEN -v_row.quantity
      WHEN 'adjusted'  THEN v_row.quantity        -- signed delta as entered
      ELSE 0
    END;
    IF v_reverse THEN v_delta := -v_delta; END IF;
    IF v_delta <> 0 THEN
      UPDATE public.hgp_parts
      SET qty_on_hand = qty_on_hand + v_delta,
          -- Receiving at a new cost updates the carrying cost (last-cost basis).
          unit_cost = CASE
            WHEN NOT v_reverse AND v_row.movement_type = 'received' AND COALESCE(v_row.unit_cost, 0) > 0
            THEN v_row.unit_cost ELSE unit_cost END
      WHERE id = v_row.part_id;
    END IF;
  END IF;

  -- Consumption named to a job prices itself into that job's materials cost.
  IF v_row.job_id IS NOT NULL AND v_row.movement_type = 'consumed' THEN
    v_cost := COALESCE(v_row.total_cost, v_row.quantity * COALESCE(v_row.unit_cost, 0), 0);
    IF v_cost <> 0 THEN
      UPDATE public.hgp_jobs
      SET materials_cost = GREATEST(0, materials_cost + CASE WHEN v_reverse THEN -v_cost ELSE v_cost END)
      WHERE id = v_row.job_id AND deleted_at IS NULL;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_apply_hgp_part_movement ON public.hgp_inventory_movements;
CREATE TRIGGER trg_apply_hgp_part_movement
  AFTER INSERT OR UPDATE OF deleted_at ON public.hgp_inventory_movements
  FOR EACH ROW EXECUTE FUNCTION public.apply_hgp_part_movement();


-- ─── 4. Serialized units write their lifecycle into the same ledger ─────────
CREATE OR REPLACE FUNCTION public.log_hgp_unit_movement()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_type TEXT;
BEGIN
  IF NEW.deleted_at IS NOT NULL THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' THEN
    v_type := 'received';
  ELSE
    IF OLD.status = NEW.status THEN RETURN NEW; END IF;
    v_type := CASE NEW.status
      WHEN 'installed'    THEN 'installed'
      WHEN 'reserved'     THEN 'reserved'
      WHEN 'returned'     THEN 'returned'
      WHEN 'in_stock'     THEN 'released'
      WHEN 'service_only' THEN 'service_only'
    END;
    IF v_type IS NULL THEN RETURN NEW; END IF;
  END IF;

  INSERT INTO public.hgp_inventory_movements (
    user_id, entity_id, equipment_unit_id, vendor_id, movement_type,
    quantity, unit_cost, total_cost, memo, metadata
  ) VALUES (
    NEW.user_id, NEW.entity_id, NEW.id, NEW.vendor_id, v_type,
    1, NEW.unit_cost, NEW.unit_cost,
    NEW.model || COALESCE(' · SN ' || NEW.serial_number, ''),
    jsonb_build_object('source', 'unit_lifecycle', 'status', NEW.status)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_hgp_unit_movement ON public.hgp_equipment_units;
CREATE TRIGGER trg_log_hgp_unit_movement
  AFTER INSERT OR UPDATE OF status ON public.hgp_equipment_units
  FOR EACH ROW EXECUTE FUNCTION public.log_hgp_unit_movement();


-- ─── 5. Inventory position rollup (invoker rights — RLS scopes rows) ────────
CREATE OR REPLACE FUNCTION public.get_hgp_inventory_position()
RETURNS TABLE (
  units_on_hand INT,
  units_value NUMERIC,
  part_skus INT,
  parts_value NUMERIC,
  low_stock_count INT,
  consumed_30d NUMERIC
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    (SELECT count(*)::int FROM public.hgp_equipment_units
     WHERE deleted_at IS NULL AND status IN ('in_stock', 'reserved')),
    (SELECT COALESCE(sum(unit_cost), 0) FROM public.hgp_equipment_units
     WHERE deleted_at IS NULL AND status IN ('in_stock', 'reserved')),
    (SELECT count(*)::int FROM public.hgp_parts WHERE deleted_at IS NULL),
    (SELECT COALESCE(sum(qty_on_hand * unit_cost), 0) FROM public.hgp_parts
     WHERE deleted_at IS NULL AND qty_on_hand > 0),
    (SELECT count(*)::int FROM public.hgp_parts
     WHERE deleted_at IS NULL AND qty_on_hand <= reorder_point),
    (SELECT COALESCE(sum(COALESCE(total_cost, quantity * COALESCE(unit_cost, 0))), 0)
     FROM public.hgp_inventory_movements
     WHERE deleted_at IS NULL AND movement_type = 'consumed'
       AND created_at >= now() - interval '30 days');
$$;


-- ─── 6. updated_at + realtime ───────────────────────────────────────────────
DO $$ DECLARE t TEXT; BEGIN
  FOREACH t IN ARRAY ARRAY['hgp_parts', 'hgp_inventory_movements'] LOOP
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


-- ─── 7. Verification ────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.verify_hgp_inventory()
RETURNS TABLE (check_name TEXT, ok BOOLEAN, details TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY VALUES
    ('hgp_parts_register',
      EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='hgp_parts'),
      'quantity-tracked parts with SKU, reorder points, supplier, bin location'),
    ('hgp_movement_ledger',
      EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='hgp_inventory_movements')
      AND EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'apply_hgp_part_movement')
      AND EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'log_hgp_unit_movement'),
      'auditable movement ledger maintaining part quantities, job materials cost, and unit lifecycle'),
    ('hgp_inventory_position_rpc',
      EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_hgp_inventory_position'),
      'units/parts valuation, low stock, and 30-day consumption rollup');
END;
$$;

NOTIFY pgrst, 'reload schema';
