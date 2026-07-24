-- The client portal (PortalPayments, PortalDashboard) reads invoices via the
-- public anon key using a custom localStorage session — there is no real
-- Supabase Auth JWT, so auth.uid() is always null for these requests. Every
-- other portal-facing table (portal_clients, portal_documents,
-- portal_messages, project_photos, project_milestones) already reflects this
-- by using a fully open `USING (true)` SELECT policy and filtering
-- client-side. `invoices` was the one exception (`auth.uid() = user_id`),
-- which meant real clients could never see their own invoices in production.
--
-- Rather than open the whole invoices table (it also carries internal_memo,
-- entity_id, transaction_id, etc. not meant for client eyes), expose a
-- narrow SECURITY DEFINER RPC scoped to client-visible columns and rows
-- matched by portal_client_id or client_email — the same identity model
-- already used by get_portal_client_by_email / set_portal_password.

CREATE OR REPLACE FUNCTION public.get_portal_invoices(
  p_portal_client_id uuid DEFAULT NULL,
  p_email text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  invoice_number text,
  external_invoice_number text,
  external_invoice_url text,
  external_invoice_provider text,
  stripe_payment_link text,
  due_date date,
  issue_date date,
  status text,
  line_items jsonb,
  tax_rate numeric,
  paid_at timestamptz,
  public_memo text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    i.id, i.invoice_number, i.external_invoice_number, i.external_invoice_url,
    i.external_invoice_provider, i.stripe_payment_link, i.due_date, i.issue_date,
    i.status, i.line_items, i.tax_rate, i.paid_at, i.public_memo
  FROM public.invoices i
  WHERE i.client_visible = true
    AND (
      (p_portal_client_id IS NOT NULL AND i.portal_client_id = p_portal_client_id)
      OR (p_email IS NOT NULL AND lower(i.client_email) = lower(p_email))
    )
  ORDER BY i.due_date ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_portal_invoices(uuid, text) TO anon, authenticated;
