-- ═══════════════════════════════════════════════════════════════════════════
-- HOU INC · Documents & File Storage Migration
-- Safe to re-run: IF NOT EXISTS / IF EXISTS / OR REPLACE throughout
--
-- Run AFTER entity-separation.sql in Supabase → SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Documents metadata table ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.documents (
  id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_id             TEXT          NOT NULL DEFAULT 'houston-enterprise'
                                      CHECK (entity_id IN (
                                        'houston-enterprise',
                                        'houston-generator-pros',
                                        'houston-enterprise-holdings'
                                      )),

  -- File metadata
  file_name             TEXT          NOT NULL,
  file_path             TEXT          NOT NULL,          -- Supabase Storage object path
  file_size             BIGINT,                          -- bytes
  file_type             TEXT,                            -- MIME type

  -- Classification
  doc_type              TEXT          NOT NULL DEFAULT 'other'
                                      CHECK (doc_type IN (
                                        'receipt',
                                        'invoice',
                                        'contract',
                                        'permit',
                                        'check_image',
                                        'tax',
                                        'bank_statement',
                                        'insurance',
                                        'photo',
                                        'other'
                                      )),
  title                 TEXT,
  tags                  TEXT[]        NOT NULL DEFAULT '{}',

  -- AI / OCR output
  extracted_data        JSONB         NOT NULL DEFAULT '{}',
  ocr_status            TEXT          NOT NULL DEFAULT 'pending'
                                      CHECK (ocr_status IN ('pending','processing','complete','failed','skipped')),
  ocr_error             TEXT,

  -- Soft-link to financial records (optional)
  linked_transaction_id UUID          REFERENCES public.transactions(id) ON DELETE SET NULL,
  linked_check_id       UUID          REFERENCES public.checks(id) ON DELETE SET NULL,
  linked_invoice_id     UUID          REFERENCES public.invoices(id) ON DELETE SET NULL,

  -- Tombstone
  deleted_at            TIMESTAMPTZ,

  -- Timestamps
  created_at            TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- ── 2. Row Level Security ─────────────────────────────────────────────────
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own_select_documents" ON public.documents;
DROP POLICY IF EXISTS "own_insert_documents" ON public.documents;
DROP POLICY IF EXISTS "own_update_documents" ON public.documents;
DROP POLICY IF EXISTS "own_delete_documents" ON public.documents;

CREATE POLICY "own_select_documents" ON public.documents
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "own_insert_documents" ON public.documents
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "own_update_documents" ON public.documents
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "own_delete_documents" ON public.documents
  FOR DELETE USING (auth.uid() = user_id);

-- ── 3. updated_at trigger ─────────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_documents_updated ON public.documents;
CREATE TRIGGER trg_documents_updated
  BEFORE UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── 4. Indexes ────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_documents_user_entity
  ON public.documents(user_id, entity_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_documents_doc_type
  ON public.documents(user_id, entity_id, doc_type)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_documents_created
  ON public.documents(user_id, entity_id, created_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_documents_ocr_status
  ON public.documents(ocr_status)
  WHERE ocr_status IN ('pending', 'processing');

-- ── 5. Storage bucket (run once — idempotent via policy drop/create) ──────
-- NOTE: Supabase Storage buckets must be created in the Dashboard UI
-- or via the Management API. The SQL below only sets bucket policies.
-- Bucket name: 'documents'
-- Go to: Storage → New bucket → Name: documents → Private (not public)

-- Storage RLS policies (run after bucket exists):
-- These grant each user access only to their own folder.

-- ── 6. Helper function: mark document OCR complete ────────────────────────
CREATE OR REPLACE FUNCTION public.complete_document_ocr(
  p_doc_id       UUID,
  p_extracted    JSONB,
  p_status       TEXT DEFAULT 'complete'
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.documents
  SET
    extracted_data = p_extracted,
    ocr_status     = p_status,
    updated_at     = now()
  WHERE id = p_doc_id AND auth.uid() = user_id;
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- ✓ DOCUMENTS MIGRATION COMPLETE
--   Next steps:
--   1. Create a Storage bucket named 'documents' (private) in Supabase Dashboard
--   2. Add Storage policy: authenticated users can read/write their own objects
--      Path prefix pattern: {user_id}/**
-- ═══════════════════════════════════════════════════════════════════════════
