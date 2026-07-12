-- Finance Dashboard schema additions for audit findings #17, #19, #20, #21

-- #17: Lien waiver tracking on checks
ALTER TABLE checks
  ADD COLUMN IF NOT EXISTS lien_waiver_status text NOT NULL DEFAULT 'not_required';
-- Values: not_required | pending | received

-- #20: Cost type classification on transactions (labor/material split)
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS cost_type text;
-- Values: labor | material | subcontract | permit | overhead | equipment

-- #21: Reconciliation flags on transactions and checks
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS reconciled     boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reconciled_at  timestamptz;

ALTER TABLE checks
  ADD COLUMN IF NOT EXISTS reconciled     boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reconciled_at  timestamptz;

-- #19: Draw schedule table (milestone-linked disbursements)
CREATE TABLE IF NOT EXISTS draw_schedules (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id     uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  milestone_name text NOT NULL,
  draw_amount    numeric(12,2) NOT NULL DEFAULT 0,
  scheduled_date date,
  status         text NOT NULL DEFAULT 'pending',  -- pending | requested | funded
  notes          text,
  created_at     timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE draw_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "draws_auth_only" ON draw_schedules FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_draw_schedules_project_id ON draw_schedules (project_id);
