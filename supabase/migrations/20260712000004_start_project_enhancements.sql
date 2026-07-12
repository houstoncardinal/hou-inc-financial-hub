-- Add additional columns for enhanced project brief management
-- Add last_contacted_at for tracking follow-up
ALTER TABLE start_project_submissions ADD COLUMN IF NOT EXISTS last_contacted_at timestamptz;

-- Add next_follow_up_at for scheduling follow-ups
ALTER TABLE start_project_submissions ADD COLUMN IF NOT EXISTS next_follow_up_at timestamptz;

-- Add estimated_value for potential project value
ALTER TABLE start_project_submissions ADD COLUMN IF NOT EXISTS estimated_value numeric;

-- Add converted_to_client_id to track if lead became a portal client
ALTER TABLE start_project_submissions ADD COLUMN IF NOT EXISTS converted_to_client_id uuid REFERENCES portal_clients(id) ON DELETE SET NULL;

-- Add tags for categorization
ALTER TABLE start_project_submissions ADD COLUMN IF NOT EXISTS tags text[];

-- Index for follow-up scheduling
CREATE INDEX IF NOT EXISTS idx_start_project_follow_up ON start_project_submissions (next_follow_up_at);

-- Index for converted clients
CREATE INDEX IF NOT EXISTS idx_start_project_converted ON start_project_submissions (converted_to_client_id);

-- Enable UPDATE for authenticated users (admin)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'start_project_update_auth' AND tablename = 'start_project_submissions') THEN
    CREATE POLICY "start_project_update_auth"
      ON start_project_submissions FOR UPDATE
      TO authenticated
      USING (true);
  END IF;
END $$;

-- Enable DELETE for authenticated users (admin)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'start_project_delete_auth' AND tablename = 'start_project_submissions') THEN
    CREATE POLICY "start_project_delete_auth"
      ON start_project_submissions FOR DELETE
      TO authenticated
      USING (true);
  END IF;
END $$;