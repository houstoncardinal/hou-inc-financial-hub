-- Drop the unique index that blocks flexible reordering and custom-count milestones.
-- We now identify rows by their primary key (id uuid) and sort by sort_order.
DROP INDEX IF EXISTS project_milestones_client_phase_idx;
DROP INDEX IF EXISTS project_milestones_one_active;

-- Rename phase_index → sort_order for clarity, keep phase_index as alias via backfill.
-- (We keep phase_index column so existing queries don't break while we migrate code.)
ALTER TABLE project_milestones
  ADD COLUMN IF NOT EXISTS sort_order int;

-- Backfill sort_order from phase_index for existing rows
UPDATE project_milestones
  SET sort_order = phase_index
  WHERE sort_order IS NULL;

-- Index for fast per-client ordered queries
CREATE INDEX IF NOT EXISTS idx_milestones_client_sort
  ON project_milestones (client_id, sort_order);
