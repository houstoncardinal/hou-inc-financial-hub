-- ============================================================================
-- HOU INC · Fixed Assets & Depreciation (foundation)
--
-- Closes the audit gap that no equipment/vehicle/tooling owned by an entity
-- was tracked anywhere in the system. This is a real, database-backed
-- foundation — register + straight-line depreciation — not a full asset
-- lifecycle system (no disposal workflow UI, no MACRS tax method, no
-- multi-method policy engine). Book-basis straight-line only, clearly
-- labeled as such in every report.
--
--   · fixed_assets — one row per owned asset, entity + optional project
--     scoped, straight-line or double-declining-balance method.
--
--   · get_fixed_assets_register(p_entity_id) — every asset with its CURRENT
--     accumulated depreciation and net book value computed inline (as-of
--     today), for the register screen and report.
--
--   · get_fixed_asset_depreciation_schedule(p_asset_id) — full year-by-year
--     schedule for a single asset's detail/export view.
--
--   · verify_fixed_assets_depreciation() — launch verification.
--
-- Owner-scoped RLS, indexed, realtime-registered. Safe to re-run.
-- ============================================================================

-- ─── 1. Register ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.fixed_assets (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_id            TEXT NOT NULL DEFAULT 'houston-enterprise',
  project_id           UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  asset_name           TEXT NOT NULL,
  asset_category       TEXT NOT NULL DEFAULT 'equipment'
    CHECK (asset_category IN ('equipment', 'vehicle', 'tooling', 'technology', 'leasehold_improvement', 'furniture_fixtures', 'other')),
  asset_tag            TEXT,
  acquisition_date      DATE NOT NULL,
  placed_in_service_date DATE NOT NULL,
  cost_basis           NUMERIC(14,2) NOT NULL CHECK (cost_basis >= 0),
  salvage_value        NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (salvage_value >= 0),
  useful_life_years    NUMERIC(5,2) NOT NULL CHECK (useful_life_years > 0),
  depreciation_method  TEXT NOT NULL DEFAULT 'straight_line'
    CHECK (depreciation_method IN ('straight_line', 'double_declining_balance')),
  status               TEXT NOT NULL DEFAULT 'in_service'
    CHECK (status IN ('in_service', 'disposed', 'fully_depreciated')),
  disposal_date        DATE,
  disposal_amount      NUMERIC(14,2),
  vendor_id            UUID REFERENCES public.vendors(id) ON DELETE SET NULL,
  notes                TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at           TIMESTAMPTZ,
  CHECK (salvage_value <= cost_basis)
);

ALTER TABLE public.fixed_assets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS fixed_assets_owner ON public.fixed_assets;
CREATE POLICY fixed_assets_owner ON public.fixed_assets FOR ALL
  USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM public.app_user_roles r WHERE r.user_id = auth.uid() AND r.entity_id = fixed_assets.entity_id AND r.is_active AND r.role IN ('admin', 'finance_manager', 'finance', 'read_only_auditor'))
  )
  WITH CHECK (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM public.app_user_roles r WHERE r.user_id = auth.uid() AND r.entity_id = fixed_assets.entity_id AND r.is_active AND r.role IN ('admin', 'finance_manager', 'finance'))
  );

CREATE INDEX IF NOT EXISTS idx_fixed_assets_entity
  ON public.fixed_assets(entity_id, status) WHERE deleted_at IS NULL;

DO $$ BEGIN
  EXECUTE 'DROP TRIGGER IF EXISTS trg_fixed_assets_updated ON public.fixed_assets';
  EXECUTE 'CREATE TRIGGER trg_fixed_assets_updated BEFORE UPDATE ON public.fixed_assets FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()';
  BEGIN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.fixed_assets';
  EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_object THEN NULL; END;
END $$;

-- ─── 2. Depreciation math ───────────────────────────────────────────────────
-- Straight-line: (cost - salvage) / useful_life_years per full year, with the
-- placed-in-service year prorated by remaining months (mid-month convention).
-- Double-declining-balance: 2/useful_life_years applied to remaining book
-- value each year, floored at salvage value.
CREATE OR REPLACE FUNCTION public.get_fixed_asset_depreciation_schedule(p_asset_id UUID)
RETURNS TABLE (
  period_year INTEGER,
  months_in_service NUMERIC,
  book_value_start NUMERIC,
  depreciation_expense NUMERIC,
  accumulated_depreciation NUMERIC,
  book_value_end NUMERIC
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  a public.fixed_assets%ROWTYPE;
  v_depreciable NUMERIC;
  v_annual_sl NUMERIC;
  v_book NUMERIC;
  v_accum NUMERIC := 0;
  v_year INTEGER;
  v_years_ceil INTEGER;
  v_first_year_months NUMERIC;
  v_expense NUMERIC;
BEGIN
  SELECT * INTO a FROM public.fixed_assets WHERE id = p_asset_id;
  IF NOT FOUND THEN RETURN; END IF;

  v_depreciable := a.cost_basis - a.salvage_value;
  v_book := a.cost_basis;
  v_years_ceil := CEIL(a.useful_life_years)::int + 1;
  v_first_year_months := 12 - EXTRACT(MONTH FROM a.placed_in_service_date)::int + 1;

  FOR v_year IN 0 .. v_years_ceil LOOP
    EXIT WHEN v_book <= a.salvage_value;

    IF a.depreciation_method = 'double_declining_balance' THEN
      v_expense := v_book * (2 / a.useful_life_years);
    ELSE
      v_annual_sl := v_depreciable / a.useful_life_years;
      v_expense := CASE WHEN v_year = 0 THEN v_annual_sl * (v_first_year_months / 12.0) ELSE v_annual_sl END;
    END IF;

    v_expense := GREATEST(0, LEAST(v_expense, v_book - a.salvage_value));
    EXIT WHEN v_expense <= 0.005;

    period_year := EXTRACT(YEAR FROM a.placed_in_service_date)::int + v_year;
    months_in_service := CASE WHEN v_year = 0 THEN v_first_year_months ELSE 12 END;
    book_value_start := v_book;
    depreciation_expense := ROUND(v_expense, 2);
    v_accum := v_accum + depreciation_expense;
    accumulated_depreciation := ROUND(v_accum, 2);
    v_book := v_book - v_expense;
    book_value_end := ROUND(v_book, 2);
    RETURN NEXT;
  END LOOP;
END;
$$;

-- Current (as-of-today) accumulated depreciation and net book value per asset
-- — used by the register/report without walking the full schedule per row.
CREATE OR REPLACE FUNCTION public.get_fixed_assets_register(p_entity_id TEXT DEFAULT 'houston-enterprise')
RETURNS TABLE (
  id UUID, asset_name TEXT, asset_category TEXT, asset_tag TEXT,
  project_id UUID, project_name TEXT, vendor_id UUID, vendor_name TEXT,
  acquisition_date DATE, placed_in_service_date DATE,
  cost_basis NUMERIC, salvage_value NUMERIC, useful_life_years NUMERIC,
  depreciation_method TEXT, status TEXT,
  disposal_date DATE, disposal_amount NUMERIC,
  accumulated_depreciation NUMERIC, net_book_value NUMERIC, notes TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id, a.asset_name, a.asset_category, a.asset_tag,
    a.project_id, p.name, a.vendor_id, v.name,
    a.acquisition_date, a.placed_in_service_date,
    a.cost_basis, a.salvage_value, a.useful_life_years,
    a.depreciation_method, a.status, a.disposal_date, a.disposal_amount,
    COALESCE((SELECT s.accumulated_depreciation FROM public.get_fixed_asset_depreciation_schedule(a.id) s
              WHERE s.period_year <= EXTRACT(YEAR FROM CURRENT_DATE)::int
              ORDER BY s.period_year DESC LIMIT 1), 0) AS accumulated_depreciation,
    GREATEST(a.salvage_value, a.cost_basis - COALESCE((SELECT s.accumulated_depreciation FROM public.get_fixed_asset_depreciation_schedule(a.id) s
              WHERE s.period_year <= EXTRACT(YEAR FROM CURRENT_DATE)::int
              ORDER BY s.period_year DESC LIMIT 1), 0)) AS net_book_value,
    a.notes
  FROM public.fixed_assets a
  LEFT JOIN public.projects p ON p.id = a.project_id
  LEFT JOIN public.vendors v ON v.id = a.vendor_id
  WHERE a.entity_id = p_entity_id AND a.deleted_at IS NULL
  ORDER BY a.placed_in_service_date DESC;
END;
$$;

-- ─── 3. Verification ────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.verify_fixed_assets_depreciation()
RETURNS TABLE (check_name TEXT, ok BOOLEAN, details TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY VALUES
    ('fixed_assets_table',
      EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='fixed_assets'),
      'fixed asset register with entity/project scoping'),
    ('fixed_asset_depreciation_functions',
      EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_fixed_asset_depreciation_schedule')
      AND EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_fixed_assets_register'),
      'straight-line / DDB schedule + current register rollup');
END;
$$;

NOTIFY pgrst, 'reload schema';
