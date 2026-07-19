-- ============================================================================
-- HOU INC · admin_changelog RLS repair
--
-- The original SELECT policy (20260714000010_admin_changelog.sql) checked
-- `EXISTS (SELECT 1 FROM auth.users WHERE auth.users.id = auth.uid())` —
-- querying auth.users directly requires a grant Supabase doesn't provide by
-- default, so every SELECT against admin_changelog failed with
-- 42501 "permission denied for table users". Inserts (which use
-- `auth.uid() IS NOT NULL`, no auth.users query) worked fine, so rows were
-- silently accumulating while the Changelog/Audit Trail UI always showed
-- zero entries. Fixed by matching the INSERT policy's own working pattern —
-- auth.uid() IS NOT NULL is sufficient since this is an internal,
-- all-authenticated-users-can-read audit trail (same as INSERT's grant).
-- Safe to re-run. Run in the Supabase SQL editor.
-- ============================================================================

DROP POLICY IF EXISTS "admin_read_changelog" ON public.admin_changelog;

CREATE POLICY "admin_read_changelog"
  ON public.admin_changelog FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- ─── Verification ───────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.verify_changelog_rls_repair()
RETURNS TABLE (check_name TEXT, ok BOOLEAN, details TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY VALUES
    ('changelog_select_no_auth_users_query',
      NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'admin_changelog'
          AND policyname = 'admin_read_changelog'
          AND qual ILIKE '%auth.users%'
      ),
      'admin_read_changelog SELECT policy no longer queries auth.users directly');
END;
$$;

NOTIFY pgrst, 'reload schema';
