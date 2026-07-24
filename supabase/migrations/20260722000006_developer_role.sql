-- ============================================================================
-- HOU INC · Add a `developer` role and close a live privilege-escalation hole
--
-- Two existing SQL helpers — user_has_entity_role() and is_portal_staff()
-- (the latter added earlier today) — granted admin access to anyone whose
-- JWT had user_metadata->>'role' = 'admin'. user_metadata is client-mutable
-- (supabase.auth.updateUser({data:{role:'admin'}})), so any signed-in user,
-- including a self-registered portal client, could grant themselves this.
-- Worse, app_user_roles is empty today, and can_manage_entity_roles()'s
-- bootstrap clause (`OR NOT EXISTS (any admin row for this entity)`) is wide
-- open with no rows — anyone could INSERT themselves a permanent admin row
-- right now. This migration removes the user_metadata trust entirely,
-- replaces it with a real is_developer() check backed only by app_user_roles,
-- and seeds real rows so the bootstrap loophole closes immediately.
-- ============================================================================

-- 1. Allow the new role value
ALTER TABLE public.app_user_roles DROP CONSTRAINT app_user_roles_role_check;
ALTER TABLE public.app_user_roles ADD CONSTRAINT app_user_roles_role_check
  CHECK (role = ANY (ARRAY[
    'admin'::text, 'developer'::text, 'finance_manager'::text, 'finance'::text,
    'project_manager'::text, 'client'::text, 'read_only_auditor'::text, 'viewer'::text
  ]));

-- 2. Real, DB-only developer check — no user_metadata anywhere in this design
CREATE OR REPLACE FUNCTION public.is_developer()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.app_user_roles r
    WHERE r.user_id = auth.uid() AND r.role = 'developer' AND r.is_active
  );
$$;

-- 3. Remove the user_metadata bypass from both existing helpers
CREATE OR REPLACE FUNCTION public.user_has_entity_role(p_entity_id text, p_roles text[])
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.is_developer()
      OR EXISTS (
        SELECT 1 FROM public.app_user_roles r
        WHERE r.user_id = auth.uid()
          AND (p_entity_id IS NULL OR r.entity_id = p_entity_id)
          AND r.is_active
          AND r.role = ANY(p_roles)
      );
$$;

CREATE OR REPLACE FUNCTION public.is_portal_staff()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.is_developer()
      OR EXISTS (
        SELECT 1 FROM public.app_user_roles r
        WHERE r.user_id = auth.uid() AND r.is_active
          AND r.role IN ('admin', 'developer', 'finance_manager', 'finance', 'project_manager')
      );
$$;

-- 4. Let the developer always manage roles too (bootstrap clause kept for genuinely new entities)
CREATE OR REPLACE FUNCTION public.can_manage_entity_roles(p_entity_id text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.is_developer()
      OR public.user_has_entity_role(p_entity_id, ARRAY['admin'])
      OR NOT EXISTS (
        SELECT 1 FROM public.app_user_roles r
        WHERE r.entity_id = p_entity_id AND r.is_active AND r.role = 'admin'
      );
$$;

-- 5. Seed real rows for the developer (hunainm.qureshi@gmail.com) — closes the
-- bootstrap loophole on all three entities immediately, and gives the 17
-- entity-scoped finance tables (which check literal role = ANY(ARRAY[...]),
-- not these helpers) working 'admin' access via the real table.
DO $$
DECLARE
  v_user_id uuid;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'hunainm.qureshi@gmail.com';
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'hunainm.qureshi@gmail.com not found in auth.users';
  END IF;

  INSERT INTO public.app_user_roles (user_id, entity_id, role, is_active, notes)
  VALUES
    (v_user_id, 'houston-enterprise',         'admin',     true, 'Seeded 2026-07-22 — platform owner'),
    (v_user_id, 'houston-generator-pros',     'admin',     true, 'Seeded 2026-07-22 — platform owner'),
    (v_user_id, 'houston-enterprise-holdings','admin',     true, 'Seeded 2026-07-22 — platform owner'),
    (v_user_id, 'houston-enterprise',         'developer', true, 'Seeded 2026-07-22 — super-admin, entity_id ignored by is_developer()')
  ON CONFLICT (user_id, entity_id, role) DO UPDATE SET is_active = true;
END $$;
