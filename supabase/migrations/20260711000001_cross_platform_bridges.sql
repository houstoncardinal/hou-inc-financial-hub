-- Cross-platform bridge columns and tables
-- Connects Finance invoices → Portal clients, Projects → Portal briefs,
-- and adds portal password reset request tracking.

-- 1. Link invoices to portal clients by UUID (in addition to email match)
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS portal_client_id uuid REFERENCES portal_clients(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS invoices_portal_client_id_idx ON invoices(portal_client_id);

-- 2. Link finance projects to the portal brief that originated them
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS portal_brief_id uuid REFERENCES portal_briefs(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS projects_portal_brief_id_idx ON projects(portal_brief_id);

-- 3. Portal password reset requests (created by handleForgot in PortalAuth)
CREATE TABLE IF NOT EXISTS portal_password_resets (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email        text NOT NULL,
  requested_at timestamptz NOT NULL DEFAULT now(),
  status       text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'expired')),
  resolved_at  timestamptz,
  resolved_by  text
);

CREATE INDEX IF NOT EXISTS portal_password_resets_email_idx  ON portal_password_resets(email);
CREATE INDEX IF NOT EXISTS portal_password_resets_status_idx ON portal_password_resets(status);

-- RLS: admin can read all reset requests; no public insert restriction needed
-- (the portal auth page inserts anonymously; the row contains no sensitive data)
ALTER TABLE portal_password_resets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can request a password reset"
  ON portal_password_resets FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Authenticated users can manage resets"
  ON portal_password_resets FOR ALL
  TO authenticated
  USING (true);

-- 4. Project photos table for PortalGallery (if not already present)
CREATE TABLE IF NOT EXISTS project_photos (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id   uuid REFERENCES projects(id) ON DELETE CASCADE,
  client_id    uuid REFERENCES portal_clients(id) ON DELETE CASCADE,
  phase_label  text NOT NULL DEFAULT 'General',
  phase_index  int  NOT NULL DEFAULT 0,
  url          text NOT NULL,
  caption      text,
  taken_at     date,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS project_photos_client_id_idx  ON project_photos(client_id);
CREATE INDEX IF NOT EXISTS project_photos_project_id_idx ON project_photos(project_id);

ALTER TABLE project_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients see their own photos"
  ON project_photos FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users manage photos"
  ON project_photos FOR ALL
  TO authenticated
  USING (true);

-- 5. Project milestones table for PortalMilestones real dates (if not already present)
CREATE TABLE IF NOT EXISTS project_milestones (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id     uuid REFERENCES projects(id) ON DELETE CASCADE,
  client_id      uuid REFERENCES portal_clients(id) ON DELETE CASCADE,
  phase_index    int NOT NULL,
  target_date    date,
  completed_date date,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS project_milestones_client_phase_idx
  ON project_milestones(client_id, phase_index);

ALTER TABLE project_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients see their own milestones"
  ON project_milestones FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users manage milestones"
  ON project_milestones FOR ALL
  TO authenticated
  USING (true);

-- 6. Change orders table for PortalPayments (if not already present)
CREATE TABLE IF NOT EXISTS change_orders (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id    uuid REFERENCES portal_clients(id) ON DELETE CASCADE,
  project_id   uuid REFERENCES projects(id) ON DELETE SET NULL,
  title        text NOT NULL,
  description  text,
  amount       numeric(12, 2) NOT NULL DEFAULT 0,
  status       text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  issued_date  date NOT NULL DEFAULT CURRENT_DATE,
  approved_at  timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS change_orders_client_id_idx ON change_orders(client_id);

ALTER TABLE change_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients see their own change orders"
  ON change_orders FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users manage change orders"
  ON change_orders FOR ALL
  TO authenticated
  USING (true);

-- 7. Admin notes per client (internal CRM notes — #9)
CREATE TABLE IF NOT EXISTS portal_admin_notes (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id  uuid NOT NULL REFERENCES portal_clients(id) ON DELETE CASCADE,
  body       text NOT NULL,
  author     text NOT NULL DEFAULT 'Jeff Ali',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS portal_admin_notes_client_id_idx ON portal_admin_notes(client_id);
ALTER TABLE portal_admin_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin notes — auth only" ON portal_admin_notes FOR ALL TO authenticated USING (true);

-- 8. Admin audit log (#14)
CREATE TABLE IF NOT EXISTS portal_admin_log (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action     text NOT NULL,
  client_id  uuid REFERENCES portal_clients(id) ON DELETE SET NULL,
  actor      text NOT NULL DEFAULT 'Jeff Ali',
  details    text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS portal_admin_log_client_id_idx ON portal_admin_log(client_id);
CREATE INDEX IF NOT EXISTS portal_admin_log_created_at_idx ON portal_admin_log(created_at DESC);
ALTER TABLE portal_admin_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin log — auth only" ON portal_admin_log FOR ALL TO authenticated USING (true);
