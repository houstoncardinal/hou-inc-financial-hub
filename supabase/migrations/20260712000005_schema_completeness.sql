-- Schema completeness migration
-- Adds all columns used in application code that were not tracked in prior migrations.
-- All statements are safe to re-run (IF NOT EXISTS / ADD COLUMN IF NOT EXISTS).

-- ── entity_id on all finance tables (multi-entity routing) ──────────────────
ALTER TABLE public.vendors      ADD COLUMN IF NOT EXISTS entity_id TEXT NOT NULL DEFAULT 'houston-enterprise';
ALTER TABLE public.projects     ADD COLUMN IF NOT EXISTS entity_id TEXT NOT NULL DEFAULT 'houston-enterprise';
ALTER TABLE public.checks       ADD COLUMN IF NOT EXISTS entity_id TEXT NOT NULL DEFAULT 'houston-enterprise';
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS entity_id TEXT NOT NULL DEFAULT 'houston-enterprise';

-- ── soft-delete on vendors ──────────────────────────────────────────────────
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- ── retainage on checks ─────────────────────────────────────────────────────
ALTER TABLE public.checks ADD COLUMN IF NOT EXISTS retainage_pct  NUMERIC(5,2)  NOT NULL DEFAULT 0;
ALTER TABLE public.checks ADD COLUMN IF NOT EXISTS retainage_held NUMERIC(14,2) NOT NULL DEFAULT 0;

-- ── vendor 1099 / compliance fields ────────────────────────────────────────
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS ein                  TEXT;
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS w9_on_file           BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS requires_1099        BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS lien_waiver_required BOOLEAN NOT NULL DEFAULT false;

-- ── invoices table (core finance — portal_client_id link already exists via 20260711000001) ──
CREATE TABLE IF NOT EXISTS public.invoices (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_id           TEXT NOT NULL DEFAULT 'houston-enterprise',
  invoice_number      TEXT NOT NULL,
  status              TEXT NOT NULL DEFAULT 'draft',
  client_name         TEXT NOT NULL DEFAULT '',
  client_email        TEXT NOT NULL DEFAULT '',
  client_company      TEXT NOT NULL DEFAULT '',
  client_address      TEXT NOT NULL DEFAULT '',
  issue_date          DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date            DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '30 days'),
  line_items          JSONB NOT NULL DEFAULT '[]',
  tax_rate            NUMERIC(5,2) NOT NULL DEFAULT 0,
  notes               TEXT NOT NULL DEFAULT '',
  terms               TEXT NOT NULL DEFAULT '',
  stripe_payment_link TEXT,
  portal_client_id    UUID REFERENCES public.portal_clients(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "own_invoices" ON public.invoices FOR ALL
    USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_invoices_user   ON public.invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_entity ON public.invoices(entity_id);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_invoices_updated') THEN
    CREATE TRIGGER trg_invoices_updated
      BEFORE UPDATE ON public.invoices
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

-- ── documents table (finance receipts, contracts, etc.) ─────────────────────
CREATE TABLE IF NOT EXISTS public.documents (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_id             TEXT NOT NULL DEFAULT 'houston-enterprise',
  file_name             TEXT NOT NULL,
  file_path             TEXT NOT NULL,
  file_size             BIGINT,
  file_type             TEXT,
  doc_type              TEXT NOT NULL DEFAULT 'other',
  title                 TEXT,
  tags                  TEXT[] NOT NULL DEFAULT '{}',
  extracted_data        JSONB NOT NULL DEFAULT '{}',
  ocr_status            TEXT NOT NULL DEFAULT 'pending',
  ocr_error             TEXT,
  linked_transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
  linked_check_id       UUID REFERENCES public.checks(id) ON DELETE SET NULL,
  linked_invoice_id     UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
  deleted_at            TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "own_documents" ON public.documents FOR ALL
    USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_documents_user   ON public.documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_entity ON public.documents(entity_id);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_documents_updated') THEN
    CREATE TRIGGER trg_documents_updated
      BEFORE UPDATE ON public.documents
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

-- ── documents storage bucket (if not already created) ───────────────────────
INSERT INTO storage.buckets (id, name, public)
  VALUES ('documents', 'documents', false)
  ON CONFLICT (id) DO NOTHING;

-- Storage RLS for the documents bucket
DO $$ BEGIN
  CREATE POLICY "docs_insert" ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'documents' AND auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "docs_select" ON storage.objects FOR SELECT
    USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "docs_delete" ON storage.objects FOR DELETE
    USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
