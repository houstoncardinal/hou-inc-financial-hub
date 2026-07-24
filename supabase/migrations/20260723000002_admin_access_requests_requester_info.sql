-- ============================================================================
-- HOU INC · Admin access requests — capture requester email/name
--
-- auth.users isn't directly queryable from the client, so the developer's
-- review UI would otherwise only have a bare user_id to show for each
-- request. Denormalizing email/full_name onto the row at submission time
-- (populated server-side via a trigger reading auth.users, not trusted from
-- client input) gives the review screen something readable without ever
-- exposing auth.users itself.
-- ============================================================================

ALTER TABLE public.admin_access_requests
  ADD COLUMN IF NOT EXISTS requester_email TEXT,
  ADD COLUMN IF NOT EXISTS requester_name  TEXT;

CREATE OR REPLACE FUNCTION public.set_admin_access_request_requester_info()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  SELECT email, COALESCE(raw_user_meta_data->>'full_name', email)
  INTO NEW.requester_email, NEW.requester_name
  FROM auth.users WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_admin_access_requests_requester_info ON public.admin_access_requests;
CREATE TRIGGER trg_admin_access_requests_requester_info
  BEFORE INSERT ON public.admin_access_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_admin_access_request_requester_info();

-- Backfill (no-op today since the table is brand new, safe if re-run later)
UPDATE public.admin_access_requests r
SET requester_email = u.email,
    requester_name  = COALESCE(u.raw_user_meta_data->>'full_name', u.email)
FROM auth.users u
WHERE u.id = r.user_id AND r.requester_email IS NULL;
