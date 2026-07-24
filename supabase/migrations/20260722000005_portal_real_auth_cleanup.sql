-- ============================================================================
-- Follow-up to 20260722000004_portal_real_auth.sql
--
-- After applying that migration, pg_policies showed several additional
-- permissive policies still active on these tables that were not present in
-- portal-setup.sql or any tracked migration (likely added directly via the
-- Supabase Studio UI, outside migration history entirely, so no grep of the
-- repo ever found them). Since Postgres ORs all permissive policies together,
-- these left the tables just as open as before despite the new *_scoped
-- policies also being present. Dropping them now closes the gap for real.
-- ============================================================================

DROP POLICY IF EXISTS "portal_briefs: anon insert" ON public.portal_briefs;
DROP POLICY IF EXISTS "portal_briefs: anon select" ON public.portal_briefs;
DROP POLICY IF EXISTS "portal_briefs: anon update" ON public.portal_briefs;

DROP POLICY IF EXISTS "portal_meetings: anon insert" ON public.portal_meetings;
DROP POLICY IF EXISTS "portal_meetings: anon select" ON public.portal_meetings;
DROP POLICY IF EXISTS "portal_meetings: anon update" ON public.portal_meetings;

DROP POLICY IF EXISTS "portal_messages: anon insert" ON public.portal_messages;
DROP POLICY IF EXISTS "portal_messages: anon select" ON public.portal_messages;

DROP POLICY IF EXISTS "photos_auth_insert" ON public.project_photos;
DROP POLICY IF EXISTS "photos_by_client"   ON public.project_photos;

DROP POLICY IF EXISTS "co_insert_auth"     ON public.change_orders;
DROP POLICY IF EXISTS "co_select_by_client" ON public.change_orders;
