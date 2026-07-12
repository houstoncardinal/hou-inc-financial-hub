-- ─────────────────────────────────────────────────────────────────────────────
-- MILESTONE SYSTEM FIX
-- Adds the three columns that every mutation handler references but that were
-- never created, so every save silently returned HTTP 400 from PostgREST.
-- Also wires up the updated_at trigger and enables Realtime on the table.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE project_milestones
  ADD COLUMN IF NOT EXISTS is_active          boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS phase_name         text,
  ADD COLUMN IF NOT EXISTS phase_description  text,
  ADD COLUMN IF NOT EXISTS admin_notes        text;

-- ── updated_at auto-maintenance ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_milestones_updated ON project_milestones;
CREATE TRIGGER trg_milestones_updated
  BEFORE UPDATE ON project_milestones
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── Only one phase per client can be active at a time ────────────────────────
-- (enforced in application logic; partial unique index makes it DB-safe)
CREATE UNIQUE INDEX IF NOT EXISTS project_milestones_one_active
  ON project_milestones (client_id)
  WHERE is_active = true;

-- ── RLS ──────────────────────────────────────────────────────────────────────
-- Keep existing policies (SELECT: public read, ALL: authenticated)
-- Ensure anon can also read (needed for portal JWT flow)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'project_milestones'
    AND policyname  = 'Public read project milestones'
  ) THEN
    CREATE POLICY "Public read project milestones"
      ON project_milestones FOR SELECT
      TO anon
      USING (true);
  END IF;
END $$;

-- ── Enable Realtime ───────────────────────────────────────────────────────────
-- Allows supabase.channel().on('postgres_changes') to fire on this table
ALTER PUBLICATION supabase_realtime ADD TABLE project_milestones;
