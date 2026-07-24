-- ============================================================================
-- HOU INC · Client portal — enforce approval at the RLS layer, not just the UI
--
-- is_owning_portal_client() is reused by every child-table policy (briefs,
-- messages, meetings, documents, project_photos, change_orders,
-- project_milestones) but never checked portal_clients.status — it only
-- checked ownership. That meant a self-registered client sitting in
-- 'pending_approval' could already read/write their own (mostly empty) rows
-- in every one of those tables by navigating straight to a portal URL,
-- bypassing the "an admin reviews every application before granting access"
-- guarantee entirely at the database layer. Only PortalDashboard.tsx happened
-- to redirect pending/rejected clients away client-side; every other portal
-- page only checked whether a client row existed at all, not its status, and
-- RLS itself never enforced it either.
--
-- Adding the status check once here closes the gap everywhere this helper is
-- used, with staff access (is_portal_staff(), OR'd separately in every policy)
-- entirely unaffected.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_owning_portal_client(p_client_id text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.portal_clients pc
    WHERE pc.id::text = p_client_id
      AND pc.user_id = auth.uid()
      AND pc.status = 'approved'
  );
$$;
