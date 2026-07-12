-- ============================================================
-- HOU INC Portal — Fix: pgcrypto search_path + GRANT EXECUTE
-- Run this in: Supabase Dashboard → SQL Editor → New Query → Run
--
-- Root cause: Supabase installs pgcrypto in the 'extensions' schema.
-- Functions with SET search_path = public cannot see crypt() / gen_salt().
-- Fix: add 'extensions' to search_path in all affected functions,
-- then re-seed the password and grant execute to anon.
-- ============================================================

-- 1. Recreate all functions with correct search_path ─────────

CREATE OR REPLACE FUNCTION public.create_portal_client(
  p_name             TEXT,
  p_email            TEXT,
  p_password         TEXT,
  p_phone            TEXT,
  p_project_type     TEXT,
  p_project_interest TEXT
)
RETURNS SETOF public.portal_clients
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.portal_clients WHERE email = lower(p_email)) THEN
    RAISE EXCEPTION 'An account with this email already exists. Please sign in instead.';
  END IF;
  RETURN QUERY
  INSERT INTO public.portal_clients
    (name, email, password_hash, phone, project_type, project_interest, status)
  VALUES
    (p_name, lower(p_email), crypt(p_password, gen_salt('bf')), p_phone, p_project_type, p_project_interest, 'pending_approval')
  RETURNING *;
END;
$$;

CREATE OR REPLACE FUNCTION public.verify_portal_password(
  p_email    TEXT,
  p_password TEXT
)
RETURNS SETOF public.portal_clients
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM   public.portal_clients
  WHERE  email         = lower(p_email)
    AND  password_hash = crypt(p_password, password_hash);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_portal_client_by_id(p_id UUID)
RETURNS SETOF public.portal_clients
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  RETURN QUERY SELECT * FROM public.portal_clients WHERE id = p_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_portal_password(
  p_id       UUID,
  p_password TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  UPDATE public.portal_clients
  SET    password_hash = crypt(p_password, gen_salt('bf')),
         updated_at    = now()
  WHERE  id = p_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.approve_portal_client(p_email TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  UPDATE public.portal_clients
  SET    status     = 'approved',
         updated_at = now()
  WHERE  email = lower(p_email);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_portal_client_by_email(p_email TEXT)
RETURNS SETOF public.portal_clients
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  RETURN QUERY SELECT * FROM public.portal_clients WHERE email = lower(p_email);
END;
$$;

-- 2. Re-seed the demo account with correct password hash ─────

INSERT INTO public.portal_clients (name, email, password_hash, phone, project_type, project_interest, status)
VALUES (
  'Hunain Cardinal',
  'cardinal.hunain@gmail.com',
  extensions.crypt('Samurai14@', extensions.gen_salt('bf')),
  '',
  'Custom Residential',
  'Luxury custom home build in the Houston area.',
  'approved'
)
ON CONFLICT (email) DO UPDATE SET
  password_hash = extensions.crypt('Samurai14@', extensions.gen_salt('bf')),
  status        = 'approved',
  updated_at    = now();

-- 3. Grant execute to anon + authenticated ───────────────────

GRANT EXECUTE ON FUNCTION public.create_portal_client(text, text, text, text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_portal_password(text, text)                       TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_portal_client_by_id(uuid)                            TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_portal_password(uuid, text)                          TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.approve_portal_client(text)                              TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_portal_client_by_email(text)                         TO anon, authenticated;

-- Done! After running this, sign in with:
-- Email:    cardinal.hunain@gmail.com
-- Password: Samurai14@
