-- ============================================================================
-- HOU INC · Entity Operations (HGP generator ops + Holdings capital ops)
--
-- Backing tables for the entity-aware finance dashboards:
--
--   Houston Generator Pros
--     · hgp_equipment_units      — generator inventory: model/serial/kW/fuel,
--                                  unit cost (COGS) vs sale price, install &
--                                  warranty lifecycle, permit tracking, and an
--                                  optional link to a projects row (install job)
--     · hgp_service_agreements   — maintenance plans & service contracts:
--                                  recurring value, visit cadence, next-visit
--                                  scheduling, emergency coverage
--
--   Houston Enterprise Holdings
--     · holdings_notes           — intercompany loans + external debt, both
--                                  directions (receivable/payable), principal,
--                                  outstanding balance, rate, payment schedule
--     · holdings_capital_activity— contributions, distributions, dividends,
--                                  management fees, tax reserves, intercompany
--                                  transfers, tagged to the related entity
--
-- RLS: owner-scoped (auth.uid() = user_id), matching the finance tables'
-- existing single-operator convention. Realtime registered for all four.
-- Safe to re-run. Run in the Supabase SQL editor.
-- ============================================================================


-- ─── 1. HGP · Equipment inventory ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.hgp_equipment_units (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_id     TEXT NOT NULL DEFAULT 'houston-generator-pros',
  model         TEXT NOT NULL,
  serial_number TEXT,
  kw_rating     NUMERIC(8,2),
  fuel_type     TEXT NOT NULL DEFAULT 'natural_gas'
    CHECK (fuel_type IN ('natural_gas', 'propane', 'diesel', 'bi_fuel')),
  status        TEXT NOT NULL DEFAULT 'in_stock'
    CHECK (status IN ('in_stock', 'reserved', 'installed', 'service_only', 'returned')),
  unit_cost     NUMERIC(14,2) NOT NULL DEFAULT 0,
  sale_price    NUMERIC(14,2),
  customer_name  TEXT,
  customer_email TEXT,
  project_id    UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  vendor_id     UUID REFERENCES public.vendors(id) ON DELETE SET NULL,
  purchase_date DATE,
  install_date  DATE,
  warranty_end  DATE,
  permit_number TEXT,
  permit_status TEXT,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at    TIMESTAMPTZ
);

ALTER TABLE public.hgp_equipment_units ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS hgp_equipment_units_owner ON public.hgp_equipment_units;
CREATE POLICY hgp_equipment_units_owner ON public.hgp_equipment_units FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_hgp_units_entity_status
  ON public.hgp_equipment_units(entity_id, status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_hgp_units_model
  ON public.hgp_equipment_units(model) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_hgp_units_warranty
  ON public.hgp_equipment_units(warranty_end) WHERE deleted_at IS NULL;


-- ─── 2. HGP · Service agreements / maintenance plans ────────────────────────
CREATE TABLE IF NOT EXISTS public.hgp_service_agreements (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_id         TEXT NOT NULL DEFAULT 'houston-generator-pros',
  equipment_unit_id UUID REFERENCES public.hgp_equipment_units(id) ON DELETE SET NULL,
  customer_name     TEXT NOT NULL,
  customer_email    TEXT,
  customer_phone    TEXT,
  plan              TEXT NOT NULL DEFAULT 'annual'
    CHECK (plan IN ('annual', 'semi_annual', 'quarterly', 'monthly', 'custom')),
  status            TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'paused', 'cancelled', 'expired')),
  annual_value      NUMERIC(14,2) NOT NULL DEFAULT 0,
  visits_per_year   INT NOT NULL DEFAULT 2,
  emergency_coverage BOOLEAN NOT NULL DEFAULT false,
  start_date        DATE,
  end_date          DATE,
  last_visit_date   DATE,
  next_visit_date   DATE,
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at        TIMESTAMPTZ
);

ALTER TABLE public.hgp_service_agreements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS hgp_service_agreements_owner ON public.hgp_service_agreements;
CREATE POLICY hgp_service_agreements_owner ON public.hgp_service_agreements FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_hgp_agreements_entity_status
  ON public.hgp_service_agreements(entity_id, status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_hgp_agreements_next_visit
  ON public.hgp_service_agreements(next_visit_date) WHERE deleted_at IS NULL;


-- ─── 3. Holdings · Notes (intercompany loans + external debt) ───────────────
CREATE TABLE IF NOT EXISTS public.holdings_notes (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_id              TEXT NOT NULL DEFAULT 'houston-enterprise-holdings',
  direction              TEXT NOT NULL CHECK (direction IN ('receivable', 'payable')),
  note_type              TEXT NOT NULL DEFAULT 'intercompany_loan'
    CHECK (note_type IN ('intercompany_loan', 'bank_loan', 'line_of_credit', 'mortgage', 'other')),
  counterparty_name      TEXT NOT NULL,
  counterparty_entity_id TEXT,
  principal              NUMERIC(14,2) NOT NULL DEFAULT 0,
  outstanding_balance    NUMERIC(14,2) NOT NULL DEFAULT 0,
  interest_rate          NUMERIC(7,4) NOT NULL DEFAULT 0,
  payment_amount         NUMERIC(14,2),
  payment_frequency      TEXT NOT NULL DEFAULT 'monthly'
    CHECK (payment_frequency IN ('monthly', 'quarterly', 'annual', 'interest_only', 'balloon')),
  status                 TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'paid_off', 'defaulted', 'pending')),
  origination_date       DATE,
  maturity_date          DATE,
  collateral             TEXT,
  notes                  TEXT,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at             TIMESTAMPTZ
);

ALTER TABLE public.holdings_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS holdings_notes_owner ON public.holdings_notes;
CREATE POLICY holdings_notes_owner ON public.holdings_notes FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_holdings_notes_entity_status
  ON public.holdings_notes(entity_id, status, direction) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_holdings_notes_maturity
  ON public.holdings_notes(maturity_date) WHERE deleted_at IS NULL;


-- ─── 4. Holdings · Capital activity log ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.holdings_capital_activity (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_id         TEXT NOT NULL DEFAULT 'houston-enterprise-holdings',
  activity_type     TEXT NOT NULL
    CHECK (activity_type IN ('capital_contribution', 'distribution', 'dividend',
                             'management_fee', 'tax_reserve', 'intercompany_transfer')),
  related_entity_id TEXT,
  amount            NUMERIC(14,2) NOT NULL,
  activity_date     DATE NOT NULL DEFAULT CURRENT_DATE,
  memo              TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at        TIMESTAMPTZ
);

ALTER TABLE public.holdings_capital_activity ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS holdings_capital_activity_owner ON public.holdings_capital_activity;
CREATE POLICY holdings_capital_activity_owner ON public.holdings_capital_activity FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_holdings_capital_entity_date
  ON public.holdings_capital_activity(entity_id, activity_date DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_holdings_capital_related
  ON public.holdings_capital_activity(related_entity_id, activity_type) WHERE deleted_at IS NULL;


-- ─── 5. updated_at triggers (reuses the shared set_updated_at helper) ───────
DO $$ DECLARE t TEXT; BEGIN
  FOREACH t IN ARRAY ARRAY[
    'hgp_equipment_units', 'hgp_service_agreements',
    'holdings_notes', 'holdings_capital_activity'
  ] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%s_updated ON public.%I', t, t);
    EXECUTE format('CREATE TRIGGER trg_%s_updated BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()', t, t);
  END LOOP;
END $$;


-- ─── 6. Realtime registration ───────────────────────────────────────────────
DO $$ DECLARE t TEXT; BEGIN
  FOREACH t IN ARRAY ARRAY[
    'hgp_equipment_units', 'hgp_service_agreements',
    'holdings_notes', 'holdings_capital_activity'
  ] LOOP
    BEGIN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    EXCEPTION
      WHEN duplicate_object THEN NULL;
      WHEN undefined_object THEN NULL;
    END;
  END LOOP;
END $$;


-- ─── 7. Extend launch verification with entity-operations check ─────────────
CREATE OR REPLACE FUNCTION public.verify_finance_launch_migrations()
RETURNS TABLE (
  check_name TEXT,
  ok BOOLEAN,
  details TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY VALUES
    ('admin_finance_link_columns',
      EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='admin_projects' AND column_name='finance_project_id')
      AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='projects' AND column_name='admin_project_id'),
      'admin_projects.finance_project_id and projects.admin_project_id'),
    ('funded_draw_income_sync',
      EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'sync_funded_draw_to_income'),
      'sync_funded_draw_to_income trigger function'),
    ('finance_launch_hardening',
      EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='finance_reconciliation_audit')
      AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='finance_bank_activity')
      AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='app_user_roles'),
      'audit, bank activity, and role override tables'),
    ('finance_launch_controls',
      EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='finance_commitments')
      AND EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_finance_control_summary')
      AND EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'accept_bank_match_suggestion'),
      'commitments, controls summary, and bank match acceptance'),
    ('rls_recursion_repair',
      EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'user_has_entity_role')
      AND EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'can_manage_entity_roles'),
      'role policies rebuilt on SECURITY DEFINER helpers (no self-referencing quals)'),
    ('draw_double_count_repair',
      EXISTS (
        SELECT 1 FROM pg_views
        WHERE schemaname = 'public'
          AND viewname = 'finance_project_control_summary'
          AND definition LIKE '%draw_schedule:%'
      ),
      'control summary excludes draw-linked income transactions from earned revenue'),
    ('entity_operations',
      EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='hgp_equipment_units')
      AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='hgp_service_agreements')
      AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='holdings_notes')
      AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='holdings_capital_activity'),
      'HGP equipment/service tables and Holdings notes/capital tables');
END;
$$;

NOTIFY pgrst, 'reload schema';
