-- Contact form submissions from the public marketing website
CREATE TABLE IF NOT EXISTS public.contact_submissions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  company      TEXT,
  email        TEXT NOT NULL,
  phone        TEXT,
  project_type TEXT,
  budget       TEXT,
  message      TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'new',  -- new | reviewed | archived
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- No RLS auth requirement — submissions come from anonymous public visitors
ALTER TABLE public.contact_submissions ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert (public contact form)
CREATE POLICY "public_insert_contact"
  ON public.contact_submissions
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Only authenticated users (admin) can read submissions
CREATE POLICY "auth_read_contact"
  ON public.contact_submissions
  FOR SELECT
  TO authenticated
  USING (true);
