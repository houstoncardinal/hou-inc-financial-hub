-- ============================================================================
-- HOU INC · Client Portal — migrate to real Supabase Auth
--
-- Today the client portal checks a password against portal_clients.password_hash
-- via custom RPCs, then just writes the client's id into localStorage. There is
-- no signed JWT, so auth.uid() is always null for portal requests — which is why
-- every portal table below has ended up with a wide-open USING (true) policy
-- (see portal-setup.sql, the untracked script these tables originally came
-- from). Since the anon key ships publicly in the browser bundle, that means
-- anyone can currently read every client's messages/documents/photos/milestones
-- directly, bypassing the app UI entirely.
--
-- This migration:
--   1. Folds the portal_clients/portal_briefs/portal_messages/portal_meetings/
--      portal_documents table definitions (previously only in portal-setup.sql)
--      into the tracked migration history.
--   2. Links portal_clients to a real auth.users row (user_id) and drops the
--      custom password_hash column — Supabase Auth now owns the credential.
--   3. Replaces every wide-open policy with one that checks auth.uid() via two
--      small helper functions, mirroring the pattern already used for
--      finance_client_accounts_entity (20260718000008) and
--      app_user_roles_self_select (20260716000012).
--   4. Retires the old password RPCs and adds new SECURITY DEFINER ones that
--      derive identity from auth.uid() instead of trusting caller-supplied ids.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ─────────────────────────────────────────────────────────────────────────
-- 1. Table definitions (idempotent — already live via portal-setup.sql;
--    this makes a fresh `supabase db reset` reproduce them too)
-- ─────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.portal_clients (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT         NOT NULL,
  email            TEXT         NOT NULL UNIQUE,
  phone            TEXT         NOT NULL DEFAULT '',
  project_type     TEXT         NOT NULL DEFAULT '',
  project_interest TEXT,
  status           TEXT         NOT NULL DEFAULT 'pending_approval'
                                CHECK (status IN ('pending_approval','approved','rejected')),
  approved_at      TIMESTAMPTZ,
  rejected_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.portal_briefs (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id    UUID         NOT NULL REFERENCES public.portal_clients(id) ON DELETE CASCADE,
  type TEXT, location TEXT, sqft TEXT, bedrooms TEXT, bathrooms TEXT, floors TEXT,
  style TEXT[] DEFAULT '{}', budget TEXT, timeline TEXT, description TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.portal_messages (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   UUID         NOT NULL REFERENCES public.portal_clients(id) ON DELETE CASCADE,
  sender      TEXT         NOT NULL CHECK (sender IN ('client','builder')),
  sender_name TEXT         NOT NULL,
  body        TEXT         NOT NULL,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.portal_documents (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id    UUID         REFERENCES public.portal_clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL, file_type TEXT NOT NULL DEFAULT '', file_size TEXT,
  category TEXT NOT NULL DEFAULT 'uploaded', status TEXT NOT NULL DEFAULT 'pending',
  requested_by TEXT, description TEXT, uploaded_at TIMESTAMPTZ,
  storage_path TEXT, file_url TEXT, reviewed_at TIMESTAMPTZ, reviewed_by TEXT,
  project_id UUID REFERENCES public.admin_projects(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.portal_meetings (
  id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id  UUID         NOT NULL REFERENCES public.portal_clients(id) ON DELETE CASCADE,
  type TEXT NOT NULL, date TEXT NOT NULL, time TEXT NOT NULL,
  format TEXT NOT NULL DEFAULT 'Video Call', notes TEXT,
  status TEXT NOT NULL DEFAULT 'requested',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────
-- 2. Link portal_clients to real Supabase Auth; drop the custom credential
-- ─────────────────────────────────────────────────────────────────────────

ALTER TABLE public.portal_clients
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'portal_clients_user_id_key'
  ) THEN
    ALTER TABLE public.portal_clients ADD CONSTRAINT portal_clients_user_id_key UNIQUE (user_id);
  END IF;
END $$;

ALTER TABLE public.portal_clients DROP COLUMN IF EXISTS password_hash;

-- ─────────────────────────────────────────────────────────────────────────
-- 3. Helper functions — reused across every policy below
-- ─────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.is_portal_staff()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    COALESCE(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'admin'
    OR EXISTS (
      SELECT 1 FROM public.app_user_roles r
      WHERE r.user_id = auth.uid()
        AND r.is_active
        AND r.role IN ('admin', 'finance_manager', 'finance', 'project_manager')
    );
$$;

-- Takes text (not uuid) because project_milestones.client_id is TEXT while
-- every other portal table's client_id is uuid — comparing as text on both
-- sides works for either column type without risking a failed uuid cast.
CREATE OR REPLACE FUNCTION public.is_owning_portal_client(p_client_id text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.portal_clients pc
    WHERE pc.id::text = p_client_id AND pc.user_id = auth.uid()
  );
$$;

-- ─────────────────────────────────────────────────────────────────────────
-- 4. New auth-flow RPCs (SECURITY DEFINER, identity always from auth.uid())
-- ─────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.complete_portal_registration()
RETURNS SETOF public.portal_clients
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_email text;
  v_meta   jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'No authenticated session.';
  END IF;

  SELECT email, raw_user_meta_data INTO v_email, v_meta FROM auth.users WHERE id = auth.uid();

  INSERT INTO public.portal_clients (user_id, name, email, phone, project_type, project_interest, status)
  VALUES (
    auth.uid(),
    COALESCE(v_meta ->> 'name', ''),
    lower(v_email),
    COALESCE(v_meta ->> 'phone', ''),
    COALESCE(v_meta ->> 'project_type', ''),
    v_meta ->> 'project_interest',
    'pending_approval'
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN QUERY SELECT * FROM public.portal_clients WHERE user_id = auth.uid();
END;
$$;

CREATE OR REPLACE FUNCTION public.get_my_portal_client()
RETURNS SETOF public.portal_clients
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT * FROM public.portal_clients WHERE user_id = auth.uid();
$$;

-- Retire the old password-based RPCs — Supabase Auth owns credentials now.
DROP FUNCTION IF EXISTS public.create_portal_client(text, text, text, text, text, text);
DROP FUNCTION IF EXISTS public.verify_portal_password(text, text);
DROP FUNCTION IF EXISTS public.get_portal_client_by_id(uuid);
DROP FUNCTION IF EXISTS public.set_portal_password(uuid, text);
DROP FUNCTION IF EXISTS public.update_portal_password(uuid, text);

-- Rewrite get_portal_invoices (added minutes ago in 20260722000003) to derive
-- identity from auth.uid() via portal_clients instead of trusting a
-- caller-supplied portal_client_id / email.
DROP FUNCTION IF EXISTS public.get_portal_invoices(uuid, text);
CREATE OR REPLACE FUNCTION public.get_portal_invoices()
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
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE
AS $$
  SELECT
    i.id, i.invoice_number, i.external_invoice_number, i.external_invoice_url,
    i.external_invoice_provider, i.stripe_payment_link, i.due_date, i.issue_date,
    i.status, i.line_items, i.tax_rate, i.paid_at, i.public_memo
  FROM public.invoices i
  JOIN public.portal_clients pc
    ON (pc.id = i.portal_client_id OR lower(pc.email) = lower(i.client_email))
  WHERE i.client_visible = true
    AND pc.user_id = auth.uid()
  ORDER BY i.due_date ASC;
$$;

GRANT EXECUTE ON FUNCTION public.complete_portal_registration() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_portal_client()          TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_portal_invoices()           TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_portal_staff()               TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_owning_portal_client(text)   TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- 5. RLS rewrite — every portal table now checks auth.uid(), not `true`
-- ─────────────────────────────────────────────────────────────────────────

ALTER TABLE public.portal_clients  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_briefs   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_meetings ENABLE ROW LEVEL SECURITY;

-- portal_clients — identity root, no client_id column to key off
DROP POLICY IF EXISTS "portal_clients_select"       ON public.portal_clients;
DROP POLICY IF EXISTS "portal_clients_insert"       ON public.portal_clients;
DROP POLICY IF EXISTS "portal_clients_update"       ON public.portal_clients;
DROP POLICY IF EXISTS "portal_clients: anon select" ON public.portal_clients;
DROP POLICY IF EXISTS "portal_clients: anon insert" ON public.portal_clients;
DROP POLICY IF EXISTS "portal_clients: anon update" ON public.portal_clients;

CREATE POLICY "portal_clients_scoped_select" ON public.portal_clients
  FOR SELECT USING (user_id = auth.uid() OR is_portal_staff());
CREATE POLICY "portal_clients_scoped_update" ON public.portal_clients
  FOR UPDATE USING (user_id = auth.uid() OR is_portal_staff())
             WITH CHECK (user_id = auth.uid() OR is_portal_staff());
-- No direct INSERT policy: rows are created only via complete_portal_registration()
-- (SECURITY DEFINER, bypasses RLS) or by staff through the admin UI.
CREATE POLICY "portal_clients_staff_insert" ON public.portal_clients
  FOR INSERT WITH CHECK (is_portal_staff());

-- portal_briefs / portal_messages / portal_meetings — same client_id-keyed shape
DROP POLICY IF EXISTS "portal_briefs_all" ON public.portal_briefs;
CREATE POLICY "portal_briefs_scoped" ON public.portal_briefs
  FOR ALL USING (is_owning_portal_client(client_id::text) OR is_portal_staff())
          WITH CHECK (is_owning_portal_client(client_id::text) OR is_portal_staff());

DROP POLICY IF EXISTS "portal_messages_all" ON public.portal_messages;
CREATE POLICY "portal_messages_scoped" ON public.portal_messages
  FOR ALL USING (is_owning_portal_client(client_id::text) OR is_portal_staff())
          WITH CHECK (is_owning_portal_client(client_id::text) OR is_portal_staff());

DROP POLICY IF EXISTS "portal_meetings_all" ON public.portal_meetings;
CREATE POLICY "portal_meetings_scoped" ON public.portal_meetings
  FOR ALL USING (is_owning_portal_client(client_id::text) OR is_portal_staff())
          WITH CHECK (is_owning_portal_client(client_id::text) OR is_portal_staff());

-- portal_documents — client_id is nullable (admin can upload docs pre-client);
-- treat a null client_id as staff-only.
DROP POLICY IF EXISTS "portal_documents_all"    ON public.portal_documents;
DROP POLICY IF EXISTS "portal_documents_delete" ON public.portal_documents;
DROP POLICY IF EXISTS "portal_documents: anon select" ON public.portal_documents;
DROP POLICY IF EXISTS "portal_documents: anon insert" ON public.portal_documents;
DROP POLICY IF EXISTS "portal_documents: anon update" ON public.portal_documents;
DROP POLICY IF EXISTS "portal_documents: anon delete" ON public.portal_documents;
CREATE POLICY "portal_documents_scoped" ON public.portal_documents
  FOR ALL
  USING ((client_id IS NOT NULL AND is_owning_portal_client(client_id::text)) OR is_portal_staff())
  WITH CHECK ((client_id IS NOT NULL AND is_owning_portal_client(client_id::text)) OR is_portal_staff());

-- project_photos — drop both existing open policies (the "authenticated" one
-- would otherwise grant every logged-in portal client blanket access to every
-- other client's photos now that clients ARE real `authenticated` users)
DROP POLICY IF EXISTS "Clients see their own photos"      ON public.project_photos;
DROP POLICY IF EXISTS "Authenticated users manage photos" ON public.project_photos;
CREATE POLICY "project_photos_scoped" ON public.project_photos
  FOR ALL
  USING ((client_id IS NOT NULL AND is_owning_portal_client(client_id::text)) OR is_portal_staff())
  WITH CHECK ((client_id IS NOT NULL AND is_owning_portal_client(client_id::text)) OR is_portal_staff());

-- change_orders — same reasoning as project_photos
DROP POLICY IF EXISTS "Clients see their own change orders"    ON public.change_orders;
DROP POLICY IF EXISTS "Authenticated users manage change orders" ON public.change_orders;
CREATE POLICY "change_orders_scoped" ON public.change_orders
  FOR ALL
  USING ((client_id IS NOT NULL AND is_owning_portal_client(client_id::text)) OR is_portal_staff())
  WITH CHECK ((client_id IS NOT NULL AND is_owning_portal_client(client_id::text)) OR is_portal_staff());

-- project_milestones — drop the zombie wide-open policy (added in
-- 20260712000008, never dropped since, and because Postgres ORs permissive
-- policies together it alone has kept this table fully open regardless of the
-- newer auth.uid()-scoped policy layered on top in 20260715000004). Replace
-- with a version that also covers the portal-client read path.
DROP POLICY IF EXISTS "milestones_open_access" ON public.project_milestones;
DROP POLICY IF EXISTS "project_milestones_project_owner_all" ON public.project_milestones;
CREATE POLICY "project_milestones_scoped" ON public.project_milestones
  FOR ALL
  USING (
    auth.uid() = user_id
    OR (client_id IS NOT NULL AND is_owning_portal_client(client_id::text))
    OR is_portal_staff()
    OR EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_milestones.project_id AND p.user_id = auth.uid())
  )
  WITH CHECK (
    auth.uid() = user_id
    OR (client_id IS NOT NULL AND is_owning_portal_client(client_id::text))
    OR is_portal_staff()
    OR EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_milestones.project_id AND p.user_id = auth.uid())
  );
