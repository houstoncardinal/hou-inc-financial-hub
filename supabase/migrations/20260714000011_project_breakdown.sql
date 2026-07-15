-- ═══════════════════════════════════════════════════════════════════════════
-- HOU INC · Project Financial Breakdown
--
-- Adds two tables that power the Project Breakdown tab inside
-- Finance → Projects → [Project] → Breakdown:
--
--   project_scope_items   — Schedule-of-Values / cost-code budget rows
--   project_change_orders — Contract additions, deductions, credits
--
-- Existing transactions, checks, income, expenses remain in their own tables.
-- The breakdown feature links to them via project_id (already present) rather
-- than duplicating any financial records.
--
-- Run in the Supabase SQL editor.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── set_updated_at helper (safe to re-run) ──────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- ── 1. Schedule-of-Values / scope items ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.project_scope_items (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id          UUID        NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  entity_id           TEXT        NOT NULL DEFAULT 'houston-enterprise',
  user_id             UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name                TEXT        NOT NULL,
  cost_code           TEXT,
  category            TEXT,
  -- Contract value columns
  contract_amount     NUMERIC(14,2) NOT NULL DEFAULT 0,
  change_order_amount NUMERIC(14,2) NOT NULL DEFAULT 0,   -- net approved COs on this line
  -- Completion tracking
  percent_complete    NUMERIC(5,2)  NOT NULL DEFAULT 0
                        CHECK (percent_complete BETWEEN 0 AND 100),
  -- Display order
  sort_order          INT         NOT NULL DEFAULT 0,
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_psi_updated ON public.project_scope_items;
CREATE TRIGGER trg_psi_updated
  BEFORE UPDATE ON public.project_scope_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_psi_project ON public.project_scope_items(project_id, sort_order);

ALTER TABLE public.project_scope_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "psi_all" ON public.project_scope_items;
CREATE POLICY "psi_all" ON public.project_scope_items
  FOR ALL USING (auth.uid() = user_id);


-- ── 2. Change orders ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.project_change_orders (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID        NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  entity_id       TEXT        NOT NULL DEFAULT 'houston-enterprise',
  user_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  co_number       TEXT,
  title           TEXT        NOT NULL,
  description     TEXT,
  type            TEXT        NOT NULL DEFAULT 'addition'
                    CHECK (type IN ('addition','deduction','credit','allowance')),
  amount          NUMERIC(14,2) NOT NULL DEFAULT 0,
  status          TEXT        NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','approved','rejected')),
  requested_date  DATE,
  approved_date   DATE,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_pco_updated ON public.project_change_orders;
CREATE TRIGGER trg_pco_updated
  BEFORE UPDATE ON public.project_change_orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_pco_project ON public.project_change_orders(project_id, created_at DESC);

ALTER TABLE public.project_change_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pco_all" ON public.project_change_orders;
CREATE POLICY "pco_all" ON public.project_change_orders
  FOR ALL USING (auth.uid() = user_id);


-- ── Done ─────────────────────────────────────────────────────────────────────
NOTIFY pgrst, 'reload schema';
