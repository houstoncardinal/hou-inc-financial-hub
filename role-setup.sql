-- ═══════════════════════════════════════════════════════════════════════════
-- HOU INC · Role Assignment
-- Run in Supabase → SQL Editor → New Query
--
-- Roles:
--   admin   — Full access: finance dashboard, admin panel, ops center
--   finance — Finance tools only (no /admin, no /ops)
--   viewer  — Read-only access to finance dashboard and reports
--   client  — Client portal ONLY (/portal/*), blocked from all internal tools
-- ═══════════════════════════════════════════════════════════════════════════

-- ── View all users and their current roles ───────────────────────────────
SELECT
  id,
  email,
  raw_user_meta_data->>'role'      AS current_role,
  raw_user_meta_data->>'full_name' AS full_name,
  created_at
FROM auth.users
ORDER BY created_at DESC;


-- ── Set hunainm.qureshi@gmail.com as admin (platform owner) ─────────────
UPDATE auth.users
SET raw_user_meta_data = raw_user_meta_data || '{"role": "admin"}'::jsonb
WHERE email = 'hunainm.qureshi@gmail.com';


-- ── Set cardinal.hunain@gmail.com as client (portal access only) ─────────
UPDATE auth.users
SET raw_user_meta_data = raw_user_meta_data || '{"role": "client"}'::jsonb
WHERE email = 'cardinal.hunain@gmail.com';


-- ── Assign other users (edit emails and roles as needed) ─────────────────

-- Finance team (bookkeeper, accountant — full finance, no admin panel)
-- UPDATE auth.users
-- SET raw_user_meta_data = raw_user_meta_data || '{"role": "finance"}'::jsonb
-- WHERE email IN ('bookkeeper@example.com', 'accountant@example.com');

-- Read-only stakeholder (sees reports, can't edit anything)
-- UPDATE auth.users
-- SET raw_user_meta_data = raw_user_meta_data || '{"role": "viewer"}'::jsonb
-- WHERE email = 'investor@example.com';

-- Add another client
-- UPDATE auth.users
-- SET raw_user_meta_data = raw_user_meta_data || '{"role": "client"}'::jsonb
-- WHERE email = 'client@example.com';


-- ── Verify changes ───────────────────────────────────────────────────────
SELECT
  email,
  raw_user_meta_data->>'role' AS role,
  raw_user_meta_data->>'full_name' AS name
FROM auth.users
ORDER BY email;
