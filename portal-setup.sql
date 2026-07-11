-- ============================================================
-- HOU INC Client Portal — Supabase Setup  (v2)
-- Run this in: Supabase Dashboard → SQL Editor → New Query → Run
-- Safe to re-run (idempotent).
-- ============================================================

-- 1. Extensions ─────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Tables ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.portal_clients (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT         NOT NULL,
  email            TEXT         NOT NULL UNIQUE,
  phone            TEXT         NOT NULL DEFAULT '',
  password_hash    TEXT,
  project_type     TEXT         NOT NULL DEFAULT '',
  project_interest TEXT,
  status           TEXT         NOT NULL DEFAULT 'pending_approval'
                                CHECK (status IN ('pending_approval','approved','rejected')),
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ  NOT NULL DEFAULT now()
);
ALTER TABLE public.portal_clients ADD COLUMN IF NOT EXISTS password_hash TEXT;

CREATE TABLE IF NOT EXISTS public.portal_briefs (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id    UUID         NOT NULL UNIQUE REFERENCES public.portal_clients(id) ON DELETE CASCADE,
  type         TEXT,
  location     TEXT,
  sqft         TEXT,
  bedrooms     TEXT,
  bathrooms    TEXT,
  floors       TEXT,
  style        TEXT[]       DEFAULT '{}',
  budget       TEXT,
  timeline     TEXT,
  description  TEXT,
  status       TEXT         NOT NULL DEFAULT 'draft',
  submitted_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT now()
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
  client_id    UUID         NOT NULL REFERENCES public.portal_clients(id) ON DELETE CASCADE,
  name         TEXT         NOT NULL,
  file_type    TEXT         NOT NULL DEFAULT '',
  file_size    TEXT,
  category     TEXT         NOT NULL DEFAULT 'uploaded',
  status       TEXT         NOT NULL DEFAULT 'pending',
  requested_by TEXT,
  description  TEXT,
  uploaded_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.portal_meetings (
  id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id  UUID         NOT NULL REFERENCES public.portal_clients(id) ON DELETE CASCADE,
  type       TEXT         NOT NULL,
  date       TEXT         NOT NULL,
  time       TEXT         NOT NULL,
  format     TEXT         NOT NULL DEFAULT 'Video Call',
  notes      TEXT,
  status     TEXT         NOT NULL DEFAULT 'requested',
  created_at TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- 3. Row-Level Security ──────────────────────────────────────

ALTER TABLE public.portal_clients   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_briefs    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_messages  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_meetings  ENABLE ROW LEVEL SECURITY;

-- portal_clients: anon can read all (needed for login lookup) and insert (registration)
DROP POLICY IF EXISTS "portal_clients_select" ON public.portal_clients;
DROP POLICY IF EXISTS "portal_clients_insert" ON public.portal_clients;
DROP POLICY IF EXISTS "portal_clients_update" ON public.portal_clients;

CREATE POLICY "portal_clients_select" ON public.portal_clients
  FOR SELECT USING (true);

CREATE POLICY "portal_clients_insert" ON public.portal_clients
  FOR INSERT WITH CHECK (true);

CREATE POLICY "portal_clients_update" ON public.portal_clients
  FOR UPDATE USING (true) WITH CHECK (true);

-- portal_briefs: anon full access
DROP POLICY IF EXISTS "portal_briefs_all" ON public.portal_briefs;
CREATE POLICY "portal_briefs_all" ON public.portal_briefs
  FOR ALL USING (true) WITH CHECK (true);

-- portal_messages: anon full access
DROP POLICY IF EXISTS "portal_messages_all" ON public.portal_messages;
CREATE POLICY "portal_messages_all" ON public.portal_messages
  FOR ALL USING (true) WITH CHECK (true);

-- portal_documents: anon full access
DROP POLICY IF EXISTS "portal_documents_all" ON public.portal_documents;
CREATE POLICY "portal_documents_all" ON public.portal_documents
  FOR ALL USING (true) WITH CHECK (true);

-- portal_meetings: anon full access
DROP POLICY IF EXISTS "portal_meetings_all" ON public.portal_meetings;
CREATE POLICY "portal_meetings_all" ON public.portal_meetings
  FOR ALL USING (true) WITH CHECK (true);

-- 4. RPC Functions (SECURITY DEFINER bypasses RLS for auth ops) ─

-- Register a new client with bcrypt-hashed password
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
SET search_path = public
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

-- Verify email + password, return client row if valid
CREATE OR REPLACE FUNCTION public.verify_portal_password(
  p_email    TEXT,
  p_password TEXT
)
RETURNS SETOF public.portal_clients
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM   public.portal_clients
  WHERE  email         = lower(p_email)
    AND  password_hash = crypt(p_password, password_hash);
END;
$$;

-- Load client by ID (safe session restore)
CREATE OR REPLACE FUNCTION public.get_portal_client_by_id(p_id UUID)
RETURNS SETOF public.portal_clients
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY SELECT * FROM public.portal_clients WHERE id = p_id;
END;
$$;

-- Update a client's password
CREATE OR REPLACE FUNCTION public.set_portal_password(
  p_id       UUID,
  p_password TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.portal_clients
  SET    password_hash = crypt(p_password, gen_salt('bf')),
         updated_at    = now()
  WHERE  id = p_id;
END;
$$;

-- Admin: set a client to approved status
CREATE OR REPLACE FUNCTION public.approve_portal_client(p_email TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.portal_clients
  SET    status     = 'approved',
         updated_at = now()
  WHERE  email = lower(p_email);
END;
$$;

-- 5. Seed approved client ────────────────────────────────────

INSERT INTO public.portal_clients (name, email, password_hash, phone, project_type, project_interest, status)
VALUES (
  'Hunain Cardinal',
  'cardinal.hunain@gmail.com',
  crypt('Samurai14@', gen_salt('bf')),
  '',
  'Custom Residential',
  'Luxury custom home build in the Houston area.',
  'approved'
)
ON CONFLICT (email) DO UPDATE SET
  password_hash = crypt('Samurai14@', gen_salt('bf')),
  status        = 'approved',
  updated_at    = now();

-- 6. Extra columns (admin tracking + file storage) ─────────────

ALTER TABLE public.portal_documents ADD COLUMN IF NOT EXISTS storage_path TEXT;
ALTER TABLE public.portal_documents ADD COLUMN IF NOT EXISTS file_url     TEXT;
ALTER TABLE public.portal_documents ADD COLUMN IF NOT EXISTS reviewed_at  TIMESTAMPTZ;
ALTER TABLE public.portal_documents ADD COLUMN IF NOT EXISTS reviewed_by  TEXT;
ALTER TABLE public.portal_clients   ADD COLUMN IF NOT EXISTS approved_at  TIMESTAMPTZ;
ALTER TABLE public.portal_clients   ADD COLUMN IF NOT EXISTS rejected_at  TIMESTAMPTZ;

-- 7. Supabase Storage — portal-documents bucket ──────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'portal-documents',
  'portal-documents',
  true,
  52428800,  -- 50 MB per file
  ARRAY[
    'image/jpeg','image/jpg','image/png','image/heic','image/webp',
    'application/pdf','application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Allow anon & authenticated to upload
DROP POLICY IF EXISTS "portal_docs_insert" ON storage.objects;
CREATE POLICY "portal_docs_insert" ON storage.objects
  FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'portal-documents');

-- Allow anyone to read (files are linked directly in the portal)
DROP POLICY IF EXISTS "portal_docs_select" ON storage.objects;
CREATE POLICY "portal_docs_select" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'portal-documents');

-- Allow delete (client removes their own upload, admin can also delete)
DROP POLICY IF EXISTS "portal_docs_delete" ON storage.objects;
CREATE POLICY "portal_docs_delete" ON storage.objects
  FOR DELETE TO anon, authenticated
  USING (bucket_id = 'portal-documents');

-- 8. Lookup by email bypass function ─────────────────────────

-- Allows looking up an approved client by email without password (used for demo bypass)
CREATE OR REPLACE FUNCTION public.get_portal_client_by_email(p_email TEXT)
RETURNS SETOF public.portal_clients
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY SELECT * FROM public.portal_clients WHERE email = lower(p_email);
END;
$$;

-- Done! ✓
-- Tables, RLS, RPCs, storage bucket, and seed account are all set.
-- Account: cardinal.hunain@gmail.com / Samurai14@  (status: approved)
