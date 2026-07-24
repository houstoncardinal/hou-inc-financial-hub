-- ============================================================================
-- HOU INC · Admin access requests
--
-- Lets a newly self-registered staff account (signed up via /auth, no real
-- app_user_roles row yet — resolves client-side to the 'pending' role) ask
-- for admin access to a specific entity. Only the developer role can act on
-- these requests — approving one is the ONLY way a request results in a real
-- app_user_roles row, done atomically inside a SECURITY DEFINER function that
-- re-checks is_developer() itself (never trusts the caller's client-side
-- role), so this can't be bypassed by calling the RPC directly with a
-- forged/stale session either. No user_metadata is trusted anywhere here —
-- same lesson as the 20260722000006 privilege-escalation fix.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.admin_access_requests (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_id     TEXT NOT NULL,
  reason        TEXT,
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied')),
  reviewed_by   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at   TIMESTAMPTZ,
  review_notes  TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One pending request per user per entity — resubmitting after a decision is fine.
CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_access_requests_one_pending
  ON public.admin_access_requests(user_id, entity_id)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_admin_access_requests_status
  ON public.admin_access_requests(status, created_at DESC);

ALTER TABLE public.admin_access_requests ENABLE ROW LEVEL SECURITY;

-- Anyone can submit a request for themselves.
DROP POLICY IF EXISTS admin_access_requests_insert_own ON public.admin_access_requests;
CREATE POLICY admin_access_requests_insert_own
  ON public.admin_access_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- A user can see their own requests; the developer can see every request.
DROP POLICY IF EXISTS admin_access_requests_select ON public.admin_access_requests;
CREATE POLICY admin_access_requests_select
  ON public.admin_access_requests FOR SELECT
  USING (auth.uid() = user_id OR public.is_developer());

-- A user can withdraw their own still-pending request. No general UPDATE
-- policy exists at all — approving/denying only happens through the two
-- functions below, which re-check is_developer() themselves.
DROP POLICY IF EXISTS admin_access_requests_delete_own_pending ON public.admin_access_requests;
CREATE POLICY admin_access_requests_delete_own_pending
  ON public.admin_access_requests FOR DELETE
  USING (auth.uid() = user_id AND status = 'pending');

-- ── Approve: grants the real app_user_roles row and closes the request out,
--    atomically, only for the developer. ────────────────────────────────────
CREATE OR REPLACE FUNCTION public.approve_admin_access_request(p_request_id UUID)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_entity_id TEXT;
BEGIN
  IF NOT public.is_developer() THEN
    RAISE EXCEPTION 'Only the developer role can approve admin access requests';
  END IF;

  SELECT user_id, entity_id INTO v_user_id, v_entity_id
  FROM public.admin_access_requests
  WHERE id = p_request_id AND status = 'pending'
  FOR UPDATE;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Request not found or already reviewed';
  END IF;

  INSERT INTO public.app_user_roles (user_id, entity_id, role, is_active, assigned_by, notes)
  VALUES (v_user_id, v_entity_id, 'admin', true, auth.uid(), 'Approved via admin access request ' || p_request_id)
  ON CONFLICT (user_id, entity_id, role) DO UPDATE SET is_active = true, assigned_by = excluded.assigned_by;

  UPDATE public.admin_access_requests
  SET status = 'approved', reviewed_by = auth.uid(), reviewed_at = now()
  WHERE id = p_request_id;
END;
$$;

-- ── Deny: marks the request closed, grants nothing. ─────────────────────────
CREATE OR REPLACE FUNCTION public.deny_admin_access_request(p_request_id UUID, p_notes TEXT DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_developer() THEN
    RAISE EXCEPTION 'Only the developer role can deny admin access requests';
  END IF;

  UPDATE public.admin_access_requests
  SET status = 'denied', reviewed_by = auth.uid(), reviewed_at = now(), review_notes = p_notes
  WHERE id = p_request_id AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found or already reviewed';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_admin_access_request(UUID)      TO authenticated;
GRANT EXECUTE ON FUNCTION public.deny_admin_access_request(UUID, TEXT)   TO authenticated;
