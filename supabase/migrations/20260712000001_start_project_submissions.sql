-- ─────────────────────────────────────────────────────────────────────────────
-- start_project_submissions table
-- Stores "Start a Project" enquiries submitted from the public website.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS start_project_submissions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Contact
  name            text,
  email           text,
  phone           text,

  -- Project details
  type            text,
  scope           text,
  sqft            text,
  location        text,
  budget          text,
  start_timeline  text,
  priorities      text[],
  description     text,

  -- Meta
  submitted_at    timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ── Indexes ──
CREATE INDEX IF NOT EXISTS idx_start_project_submitted_at ON start_project_submissions (submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_start_project_email        ON start_project_submissions (email);

-- ── RLS ──
ALTER TABLE start_project_submissions ENABLE ROW LEVEL SECURITY;

-- Anyone can INSERT (anonymous website visitors)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'start_project_insert_anon' AND tablename = 'start_project_submissions') THEN
    CREATE POLICY "start_project_insert_anon"
      ON start_project_submissions FOR INSERT
      WITH CHECK (true);
  END IF;
END $$;

-- Only authenticated users (admin) can SELECT
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'start_project_select_auth' AND tablename = 'start_project_submissions') THEN
    CREATE POLICY "start_project_select_auth"
      ON start_project_submissions FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;