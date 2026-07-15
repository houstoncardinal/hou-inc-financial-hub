-- ============================================================================
-- HOU INC · Scope Items column repair
--
-- 20260714000013_breakdown_v2.sql added description, approved_credit_amount,
-- total_billed, payment_status, work_status, milestone_id,
-- client_visible_notes, and internal_notes to project_scope_items, but that
-- migration was never applied to this project (all prior migrations show as
-- unapplied in `supabase migration list`, meaning schema changes here have
-- been run by hand in the SQL editor rather than through the CLI). The New
-- Scope Item form writes all of these columns, so saving fails with
-- PGRST204 "Could not find the '<column>' column" until they exist.
--
-- Safe to run any number of times — every column add is guarded.
-- ============================================================================

ALTER TABLE public.project_scope_items
  ADD COLUMN IF NOT EXISTS description           TEXT,
  ADD COLUMN IF NOT EXISTS approved_credit_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_billed          NUMERIC(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_status        TEXT NOT NULL DEFAULT 'not_billed',
  ADD COLUMN IF NOT EXISTS work_status           TEXT NOT NULL DEFAULT 'not_started',
  ADD COLUMN IF NOT EXISTS milestone_id          UUID,
  ADD COLUMN IF NOT EXISTS client_visible_notes  TEXT,
  ADD COLUMN IF NOT EXISTS internal_notes        TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'project_scope_items_payment_status_check'
  ) THEN
    ALTER TABLE public.project_scope_items
      ADD CONSTRAINT project_scope_items_payment_status_check
      CHECK (payment_status IN (
        'not_billed','billed','unpaid','partially_paid','paid',
        'overpaid','past_due','disputed','credited'
      ));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'project_scope_items_work_status_check'
  ) THEN
    ALTER TABLE public.project_scope_items
      ADD CONSTRAINT project_scope_items_work_status_check
      CHECK (work_status IN (
        'not_started','scheduled','in_progress','completed','on_hold'
      ));
  END IF;
END $$;

-- ── Reload PostgREST schema cache ───────────────────────────────────────────
NOTIFY pgrst, 'reload schema';
