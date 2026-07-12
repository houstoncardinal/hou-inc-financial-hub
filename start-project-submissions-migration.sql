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

  -- Project details  (match the website form fields)
  type            text,                 -- e.g. 'new_construction', 'renovation'
  scope           text,                 -- e.g. 'residential', 'commercial'
  sqft            text,
  location        text,
  budget          text,
  start_timeline  text,
  priorities      text[],              -- multi-select checkboxes
  description     text,

  -- Meta
  submitted_at    timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ── Indexes ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_start_project_submitted_at ON start_project_submissions (submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_start_project_email        ON start_project_submissions (email);

-- ── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE start_project_submissions ENABLE ROW LEVEL SECURITY;

-- Anyone can INSERT (anonymous website visitors)
CREATE POLICY IF NOT EXISTS "start_project_insert_anon"
  ON start_project_submissions FOR INSERT
  WITH CHECK (true);

-- Only authenticated users (admin) can SELECT
CREATE POLICY IF NOT EXISTS "start_project_select_auth"
  ON start_project_submissions FOR SELECT
  TO authenticated
  USING (true);
