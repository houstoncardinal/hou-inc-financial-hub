-- Add project-level document linking and portal-client bridge to projects

-- 1. Link documents directly to a project (joins the existing linked_transaction/check/invoice pattern)
ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS linked_project_id uuid REFERENCES projects(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS documents_linked_project_id_idx ON documents(linked_project_id);

-- 2. Link finance projects to the portal client they serve
--    (Houston Enterprise projects that originated from a portal brief already have portal_brief_id;
--     this adds the client link so the project detail page can surface portal data)
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS portal_client_id uuid REFERENCES portal_clients(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS projects_portal_client_id_idx ON projects(portal_client_id);
