-- ============================================================================
-- HOU INC · Let developer-role accounts view the client portal too
--
-- The client portal (portal_clients) and the staff role system (app_user_roles)
-- are two separate identity realms — a developer/admin has no portal_clients
-- row by default, so logging into /portal correctly (if unhelpfully) returns
-- "No portal account found for this email address." The user asked for
-- developer to reach "any dashboard or part of the platform," which includes
-- the portal. This auto-provisions a portal_clients profile (status: approved,
-- skipping the pending-approval gate) the first time a developer signs into
-- the portal, rather than requiring them to separately self-register.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.ensure_developer_portal_profile()
RETURNS SETOF public.portal_clients
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_developer() THEN
    RAISE EXCEPTION 'Not authorized.';
  END IF;

  -- email has its own UNIQUE constraint independent of user_id — an older
  -- unlinked test/lead row can already occupy this developer's email, so
  -- link+approve that row rather than trying to insert a duplicate.
  INSERT INTO public.portal_clients (user_id, name, email, status)
  SELECT u.id,
         COALESCE(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name', 'Developer'),
         u.email,
         'approved'
  FROM auth.users u
  WHERE u.id = auth.uid()
  ON CONFLICT (email) DO UPDATE
    SET user_id = EXCLUDED.user_id, name = EXCLUDED.name, status = 'approved'
    WHERE public.portal_clients.user_id IS NULL OR public.portal_clients.user_id = EXCLUDED.user_id;

  RETURN QUERY SELECT * FROM public.portal_clients WHERE user_id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION public.ensure_developer_portal_profile() TO authenticated;
