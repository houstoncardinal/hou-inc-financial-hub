-- ============================================================================
-- HOU INC · Change Order / Draw Schedule column repair
--
-- 20260714000013_breakdown_v2.sql added approval_method, amount_billed,
-- amount_paid, client_visible_notes, and internal_notes to
-- project_change_orders, plus invoice_number, billing_period_start, and
-- billing_period_end to draw_schedules — but (same root cause already seen
-- in 20260715000006_scope_items_column_repair.sql) that migration was never
-- applied to this project. The Change Order and Draw Request forms write
-- these columns, so saving fails with PGRST204 "Could not find the
-- '<column>' column" until they exist.
--
-- Safe to run any number of times — every column add is guarded.
-- ============================================================================

ALTER TABLE public.project_change_orders
  ADD COLUMN IF NOT EXISTS approval_method       TEXT,
  ADD COLUMN IF NOT EXISTS amount_billed         NUMERIC(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS amount_paid           NUMERIC(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS client_visible_notes  TEXT,
  ADD COLUMN IF NOT EXISTS internal_notes        TEXT;

ALTER TABLE public.draw_schedules
  ADD COLUMN IF NOT EXISTS invoice_number       TEXT,
  ADD COLUMN IF NOT EXISTS billing_period_start DATE,
  ADD COLUMN IF NOT EXISTS billing_period_end   DATE;

-- ── Reload PostgREST schema cache ───────────────────────────────────────────
NOTIFY pgrst, 'reload schema';
