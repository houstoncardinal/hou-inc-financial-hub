-- ═══════════════════════════════════════════════════════════════════════════
-- HOU INC · Project Financial Breakdown v2 — Revenue-focused rebuild
--
-- Extends existing tables and adds project_milestones.
-- Removes nothing — purely additive.
-- Run in the Supabase SQL editor (after 000011 and 000012).
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Extend project_scope_items ──────────────────────────────────────────────

ALTER TABLE public.project_scope_items
  ADD COLUMN IF NOT EXISTS description           TEXT,
  ADD COLUMN IF NOT EXISTS approved_credit_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_billed          NUMERIC(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_status        TEXT NOT NULL DEFAULT 'not_billed'
    CHECK (payment_status IN (
      'not_billed','billed','unpaid','partially_paid','paid',
      'overpaid','past_due','disputed','credited'
    )),
  ADD COLUMN IF NOT EXISTS work_status           TEXT NOT NULL DEFAULT 'not_started'
    CHECK (work_status IN (
      'not_started','scheduled','in_progress','completed','on_hold'
    )),
  ADD COLUMN IF NOT EXISTS milestone_id          UUID,
  ADD COLUMN IF NOT EXISTS client_visible_notes  TEXT,
  ADD COLUMN IF NOT EXISTS internal_notes        TEXT;

-- ── Extend project_change_orders ────────────────────────────────────────────

ALTER TABLE public.project_change_orders
  ADD COLUMN IF NOT EXISTS approval_method       TEXT,
  ADD COLUMN IF NOT EXISTS amount_billed         NUMERIC(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS amount_paid           NUMERIC(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS client_visible_notes  TEXT,
  ADD COLUMN IF NOT EXISTS internal_notes        TEXT;

-- ── Extend draw_schedules ───────────────────────────────────────────────────

ALTER TABLE public.draw_schedules
  ADD COLUMN IF NOT EXISTS invoice_number       TEXT,
  ADD COLUMN IF NOT EXISTS billing_period_start DATE,
  ADD COLUMN IF NOT EXISTS billing_period_end   DATE;

-- ── Project milestones ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.project_milestones (
  id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id              UUID        NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  entity_id               TEXT        NOT NULL DEFAULT 'houston-enterprise',
  user_id                 UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title                   TEXT        NOT NULL,
  description             TEXT,
  planned_start_date      DATE,
  planned_completion_date DATE,
  actual_completion_date  DATE,
  percent_complete        NUMERIC(5,2) NOT NULL DEFAULT 0
                            CHECK (percent_complete BETWEEN 0 AND 100),
  status                  TEXT        NOT NULL DEFAULT 'not_started'
                            CHECK (status IN (
                              'not_started','scheduled','in_progress',
                              'awaiting_approval','completed','delayed','on_hold'
                            )),
  billing_eligible        BOOLEAN     NOT NULL DEFAULT false,
  billing_amount          NUMERIC(14,2) NOT NULL DEFAULT 0,
  client_visible          BOOLEAN     NOT NULL DEFAULT true,
  client_visible_notes    TEXT,
  internal_notes          TEXT,
  sort_order              INT         NOT NULL DEFAULT 0,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_pm_updated ON public.project_milestones;
CREATE TRIGGER trg_pm_updated
  BEFORE UPDATE ON public.project_milestones
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_pm_project
  ON public.project_milestones(project_id, sort_order);

ALTER TABLE public.project_milestones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pm_all" ON public.project_milestones;
CREATE POLICY "pm_all" ON public.project_milestones
  FOR ALL USING (auth.uid() = user_id);

-- ── Reload PostgREST schema cache ───────────────────────────────────────────
NOTIFY pgrst, 'reload schema';
