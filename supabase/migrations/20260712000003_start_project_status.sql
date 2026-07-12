-- Add status column to start_project_submissions for admin management
ALTER TABLE start_project_submissions ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'new'
  CHECK (status IN ('new', 'reviewing', 'contacted', 'qualified', 'converted', 'archived'));

-- Add notes column for admin internal notes
ALTER TABLE start_project_submissions ADD COLUMN IF NOT EXISTS admin_notes text;

-- Add assigned_to column for team assignment
ALTER TABLE start_project_submissions ADD COLUMN IF NOT EXISTS assigned_to text;

-- Add updated_at for tracking modifications
ALTER TABLE start_project_submissions ADD COLUMN IF NOT EXISTS updated_at timestamptz;

-- Index for status filtering
CREATE INDEX IF NOT EXISTS idx_start_project_status ON start_project_submissions (status);