-- Milestone Management Migration
-- Run in Supabase SQL Editor

-- Create project_milestones table (full schema including new columns)
CREATE TABLE IF NOT EXISTS project_milestones (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id         TEXT        NOT NULL,
  phase_index       INTEGER     NOT NULL,
  is_active         BOOLEAN     DEFAULT FALSE,
  target_date       DATE,
  completed_date    DATE,
  phase_name        TEXT,
  phase_description TEXT,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT project_milestones_client_phase_unique UNIQUE (client_id, phase_index)
);

-- If the table already existed without the new columns, add them safely
ALTER TABLE project_milestones
  ADD COLUMN IF NOT EXISTS is_active         BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS phase_name        TEXT,
  ADD COLUMN IF NOT EXISTS phase_description TEXT;

-- Add unique constraint if it doesn't already exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'project_milestones_client_phase_unique'
  ) THEN
    ALTER TABLE project_milestones
      ADD CONSTRAINT project_milestones_client_phase_unique
      UNIQUE (client_id, phase_index);
  END IF;
END $$;

SELECT 'Migration complete.' AS status;
