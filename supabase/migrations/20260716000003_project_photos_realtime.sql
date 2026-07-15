-- ═══════════════════════════════════════════════════════════════════════════
-- HOU INC · Progress Photos realtime
--
-- PortalGallery.tsx now subscribes to postgres_changes on project_photos so an
-- admin's upload appears on the client's screen without a manual refresh.
-- That only fires if the table is in the supabase_realtime publication, which
-- it isn't yet (it predates this project's realtime-registration convention —
-- see 20260715000001_upgrade_construction_finance_system.sql).
--
-- Run in the Supabase SQL editor.
-- ═══════════════════════════════════════════════════════════════════════════

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.project_photos;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;

NOTIFY pgrst, 'reload schema';
