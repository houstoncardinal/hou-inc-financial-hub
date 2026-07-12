-- ============================================================
-- HOU INC Portal — Quick-fix: Grant RPC execute permissions
-- Run this in: Supabase Dashboard → SQL Editor → New Query → Run
--
-- Root cause: newer Supabase projects do NOT grant EXECUTE to
-- PUBLIC by default, so anon callers are blocked from calling
-- portal RPC functions (register, login, password reset, etc).
-- ============================================================

GRANT EXECUTE ON FUNCTION public.create_portal_client(text, text, text, text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_portal_password(text, text)                       TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_portal_client_by_id(uuid)                            TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_portal_password(uuid, text)                          TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.approve_portal_client(text)                              TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_portal_client_by_email(text)                         TO anon, authenticated;

-- Verify: after running this, test by calling supabase.rpc('verify_portal_password', ...)
-- from the browser. It should return a row (or empty) instead of a permission error.
