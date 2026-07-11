-- ═══════════════════════════════════════════════════════════════════════════
-- HOU INC · Master Migration
-- Combines: entity-separation + invoices + documents + storage policies
--
-- Safe to re-run: IF NOT EXISTS / OR REPLACE / ON CONFLICT DO NOTHING
-- Run this ONCE in Supabase → SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════


-- ════════════════════════════════════════════════════════════════
-- PART 1 — ENTITY SEPARATION
-- Adds entity_id to all financial tables, creates invoices table
-- ════════════════════════════════════════════════════════════════

-- Ensure deleted_at exists on vendors / projects
ALTER TABLE public.vendors  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Add entity_id to every financial table (defaults existing rows to houston-enterprise)
ALTER TABLE public.vendors       ADD COLUMN IF NOT EXISTS entity_id TEXT NOT NULL DEFAULT 'houston-enterprise';
ALTER TABLE public.projects      ADD COLUMN IF NOT EXISTS entity_id TEXT NOT NULL DEFAULT 'houston-enterprise';
ALTER TABLE public.checks        ADD COLUMN IF NOT EXISTS entity_id TEXT NOT NULL DEFAULT 'houston-enterprise';
ALTER TABLE public.transactions  ADD COLUMN IF NOT EXISTS entity_id TEXT NOT NULL DEFAULT 'houston-enterprise';

-- Validate entity IDs via check constraints (idempotent via exception handling)
DO $$ BEGIN
  ALTER TABLE public.vendors ADD CONSTRAINT chk_vendors_entity
    CHECK (entity_id IN ('houston-enterprise','houston-generator-pros','houston-enterprise-holdings'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.projects ADD CONSTRAINT chk_projects_entity
    CHECK (entity_id IN ('houston-enterprise','houston-generator-pros','houston-enterprise-holdings'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.checks ADD CONSTRAINT chk_checks_entity
    CHECK (entity_id IN ('houston-enterprise','houston-generator-pros','houston-enterprise-holdings'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.transactions ADD CONSTRAINT chk_transactions_entity
    CHECK (entity_id IN ('houston-enterprise','houston-generator-pros','houston-enterprise-holdings'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Composite indexes for fast entity-scoped queries
CREATE INDEX IF NOT EXISTS idx_vendors_user_entity      ON public.vendors(user_id, entity_id)      WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_projects_user_entity     ON public.projects(user_id, entity_id)     WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_checks_user_entity       ON public.checks(user_id, entity_id)       WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_user_entity ON public.transactions(user_id, entity_id) WHERE deleted_at IS NULL;

-- ── Invoices table ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.invoices (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_id        TEXT         NOT NULL DEFAULT 'houston-enterprise'
                                CHECK (entity_id IN ('houston-enterprise','houston-generator-pros','houston-enterprise-holdings')),
  invoice_number   TEXT         NOT NULL,
  status           TEXT         NOT NULL DEFAULT 'draft'
                                CHECK (status IN ('draft','sent','paid','overdue')),
  client_name      TEXT         NOT NULL DEFAULT '',
  client_email     TEXT         NOT NULL DEFAULT '',
  client_company   TEXT         NOT NULL DEFAULT '',
  client_address   TEXT         NOT NULL DEFAULT '',
  issue_date       DATE         NOT NULL DEFAULT CURRENT_DATE,
  due_date         DATE         NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '30 days'),
  line_items       JSONB        NOT NULL DEFAULT '[]',
  tax_rate         NUMERIC(5,2) NOT NULL DEFAULT 0,
  notes            TEXT         NOT NULL DEFAULT '',
  terms            TEXT         NOT NULL DEFAULT '',
  stripe_payment_link TEXT,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ  NOT NULL DEFAULT now()
);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own_select_invoices" ON public.invoices;
DROP POLICY IF EXISTS "own_insert_invoices" ON public.invoices;
DROP POLICY IF EXISTS "own_update_invoices" ON public.invoices;
DROP POLICY IF EXISTS "own_delete_invoices"  ON public.invoices;

CREATE POLICY "own_select_invoices" ON public.invoices FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own_insert_invoices" ON public.invoices FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_update_invoices" ON public.invoices FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own_delete_invoices"  ON public.invoices FOR DELETE USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS trg_invoices_updated ON public.invoices;
CREATE TRIGGER trg_invoices_updated
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_invoices_user_entity ON public.invoices(user_id, entity_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status       ON public.invoices(user_id, entity_id, status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date     ON public.invoices(due_date) WHERE status IN ('sent','overdue');


-- ════════════════════════════════════════════════════════════════
-- PART 2 — FINANCE DOCUMENTS TABLE
-- Internal finance document storage (receipts, contracts, etc.)
-- Separate from portal-documents (client-facing portal uploads)
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.documents (
  id                    UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_id             TEXT         NOT NULL DEFAULT 'houston-enterprise'
                                     CHECK (entity_id IN (
                                       'houston-enterprise',
                                       'houston-generator-pros',
                                       'houston-enterprise-holdings'
                                     )),
  -- File metadata
  file_name             TEXT         NOT NULL,
  file_path             TEXT         NOT NULL,
  file_size             BIGINT,
  file_type             TEXT,
  -- Classification
  doc_type              TEXT         NOT NULL DEFAULT 'other'
                                     CHECK (doc_type IN (
                                       'receipt','invoice','contract','permit',
                                       'check_image','tax','bank_statement',
                                       'insurance','photo','other'
                                     )),
  title                 TEXT,
  tags                  TEXT[]       NOT NULL DEFAULT '{}',
  -- AI / OCR output
  extracted_data        JSONB        NOT NULL DEFAULT '{}',
  ocr_status            TEXT         NOT NULL DEFAULT 'pending'
                                     CHECK (ocr_status IN ('pending','processing','complete','failed','skipped')),
  ocr_error             TEXT,
  -- Optional links to financial records
  linked_transaction_id UUID         REFERENCES public.transactions(id) ON DELETE SET NULL,
  linked_check_id       UUID         REFERENCES public.checks(id) ON DELETE SET NULL,
  linked_invoice_id     UUID         REFERENCES public.invoices(id) ON DELETE SET NULL,
  -- Soft-delete
  deleted_at            TIMESTAMPTZ,
  -- Timestamps
  created_at            TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ  NOT NULL DEFAULT now()
);

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own_select_documents" ON public.documents;
DROP POLICY IF EXISTS "own_insert_documents" ON public.documents;
DROP POLICY IF EXISTS "own_update_documents" ON public.documents;
DROP POLICY IF EXISTS "own_delete_documents"  ON public.documents;

CREATE POLICY "own_select_documents" ON public.documents FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own_insert_documents" ON public.documents FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_update_documents" ON public.documents FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own_delete_documents"  ON public.documents FOR DELETE USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS trg_documents_updated ON public.documents;
CREATE TRIGGER trg_documents_updated
  BEFORE UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_documents_user_entity ON public.documents(user_id, entity_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_documents_doc_type    ON public.documents(user_id, entity_id, doc_type) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_documents_created     ON public.documents(user_id, entity_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_documents_ocr_pending ON public.documents(ocr_status) WHERE ocr_status IN ('pending','processing');

-- Helper: mark OCR complete (called from server-side if needed)
CREATE OR REPLACE FUNCTION public.complete_document_ocr(
  p_doc_id    UUID,
  p_extracted JSONB,
  p_status    TEXT DEFAULT 'complete'
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.documents
  SET extracted_data = p_extracted, ocr_status = p_status, updated_at = now()
  WHERE id = p_doc_id AND auth.uid() = user_id;
END;
$$;


-- ════════════════════════════════════════════════════════════════
-- PART 3 — STORAGE BUCKETS & POLICIES
--
-- portal-documents  →  client portal uploads (already exists)
-- documents         →  finance dashboard internal documents (NEW)
--
-- Both are PRIVATE buckets. Users can only access their own files.
-- File paths use: {user_id}/{entity_id}/{timestamp}-{filename}
-- ════════════════════════════════════════════════════════════════

-- Create the 'documents' bucket if it doesn't already exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('documents', 'documents', false, null, null)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies before recreating (idempotent)
DROP POLICY IF EXISTS "documents_select" ON storage.objects;
DROP POLICY IF EXISTS "documents_insert" ON storage.objects;
DROP POLICY IF EXISTS "documents_update" ON storage.objects;
DROP POLICY IF EXISTS "documents_delete" ON storage.objects;

-- Users can only access files in their own folder within the 'documents' bucket
CREATE POLICY "documents_select" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "documents_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "documents_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "documents_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);


-- ═══════════════════════════════════════════════════════════════════════════
-- ✓ MASTER MIGRATION COMPLETE
--
-- What was created / updated:
--   • entity_id column on: vendors, projects, checks, transactions
--   • invoices table with entity_id, RLS, trigger, indexes
--   • documents table (finance), RLS, trigger, indexes, OCR helper fn
--   • Storage bucket 'documents' (private) with per-user RLS policies
--
-- portal-documents bucket: already exists, no changes needed
-- ═══════════════════════════════════════════════════════════════════════════
