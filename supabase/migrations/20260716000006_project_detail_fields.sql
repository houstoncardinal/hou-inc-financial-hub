-- ═══════════════════════════════════════════════════════════════════════════
-- HOU INC · Project detail fields
--
-- Adds project_manager, contract_type, start_date, and end_date to projects
-- so the redesigned Project Details card (Overview + Reconciliation tabs) can
-- show real, editable data instead of omitting those rows entirely.
--
-- Safe to run any number of times.
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS project_manager TEXT,
  ADD COLUMN IF NOT EXISTS contract_type   TEXT,
  ADD COLUMN IF NOT EXISTS start_date      DATE,
  ADD COLUMN IF NOT EXISTS end_date        DATE;

NOTIFY pgrst, 'reload schema';
