-- Drop every existing policy on project_milestones (there are conflicting ones
-- from migration 001 that only cover authenticated, not anon).
-- Then replace with a single permissive policy so the admin (anon key + PIN)
-- and the portal (authenticated JWT) both work without restriction.

DO $$
DECLARE
  pol text;
BEGIN
  FOR pol IN (
    SELECT policyname
    FROM   pg_policies
    WHERE  schemaname = 'public'
    AND    tablename  = 'project_milestones'
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON project_milestones', pol);
  END LOOP;
END $$;

-- Single permissive policy — applies to every role (anon + authenticated + service_role)
CREATE POLICY "milestones_open_access"
  ON project_milestones
  FOR ALL
  USING (true)
  WITH CHECK (true);
