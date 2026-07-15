-- ═══════════════════════════════════════════════════════════════════════════
-- HOU INC · Portal briefs constraint repair
--
-- 20260716000002_portal_briefs_multi.sql dropped the one-brief-per-client
-- constraint by its expected default name, portal_briefs_client_id_key.
-- Given project_photos just turned out to have drifted from its own
-- migration file's assumed shape, don't assume that name is right here
-- either — this looks up whatever UNIQUE constraint actually exists on
-- portal_briefs(client_id) by its real columns, not a guessed name, and
-- drops it. If 20260716000002 already succeeded, this is a no-op.
--
-- Safe to run any number of times.
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  con RECORD;
BEGIN
  FOR con IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    WHERE t.relname = 'portal_briefs'
      AND c.contype = 'u'
      AND (
        SELECT array_agg(a.attname::text ORDER BY a.attname)
        FROM unnest(c.conkey) AS k(attnum)
        JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = k.attnum
      ) = ARRAY['client_id']
  LOOP
    EXECUTE format('ALTER TABLE public.portal_briefs DROP CONSTRAINT %I', con.conname);
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';
