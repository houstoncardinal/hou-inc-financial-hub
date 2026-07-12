-- ═══════════════════════════════════════════════════════════════════════════
-- HOU INC · Entity Diagnosis & Repair
-- Run each section in Supabase → SQL Editor → New Query
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── STEP 1: Check which tables have entity_id (verify migration was run) ───

SELECT
  t.table_name,
  (c.column_name IS NOT NULL) AS has_entity_id,
  c.column_default
FROM information_schema.tables t
LEFT JOIN information_schema.columns c
  ON c.table_name  = t.table_name
 AND c.table_schema = 'public'
 AND c.column_name  = 'entity_id'
WHERE t.table_schema = 'public'
  AND t.table_name IN ('vendors','projects','checks','transactions','invoices','documents')
ORDER BY t.table_name;


-- ─── STEP 2: See how many rows exist per entity on each table ───────────────
--   Run this to find where your data actually lives.

SELECT 'transactions' AS tbl, entity_id,
       COUNT(*)          AS rows,
       SUM(CASE WHEN type = 'income'  THEN amount ELSE 0 END) AS total_income,
       SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) AS total_expense
FROM public.transactions
WHERE deleted_at IS NULL
GROUP BY entity_id

UNION ALL

SELECT 'checks', entity_id, COUNT(*), SUM(amount), 0
FROM public.checks
WHERE deleted_at IS NULL
GROUP BY entity_id

UNION ALL

SELECT 'vendors', entity_id, COUNT(*), 0, 0
FROM public.vendors
WHERE deleted_at IS NULL
GROUP BY entity_id

UNION ALL

SELECT 'projects', entity_id, COUNT(*), 0, 0
FROM public.projects
WHERE deleted_at IS NULL
GROUP BY entity_id

ORDER BY tbl, entity_id;


-- ─── STEP 3 (OPTIONAL): Move transactions to the correct entity ─────────────
--   Only run this if Step 2 shows rows under 'houston-enterprise' that you
--   intended to be under a different entity.
--
--   Replace 'houston-generator-pros' with your target entity:
--     'houston-enterprise'
--     'houston-generator-pros'
--     'houston-enterprise-holdings'
--
--   PREVIEW first (SELECT), then UNCOMMENT the UPDATE to apply.

-- Preview: show which transactions would be moved
SELECT id, type, amount, transaction_date, entity_id
FROM public.transactions
WHERE entity_id = 'houston-enterprise'
  AND deleted_at IS NULL
ORDER BY transaction_date DESC
LIMIT 50;

-- Apply: move ALL houston-enterprise transactions to another entity
-- ⚠️  ONLY run this if you are sure all of them belong to the target entity!
-- UPDATE public.transactions
--   SET entity_id = 'houston-generator-pros'   -- ← change this
-- WHERE entity_id = 'houston-enterprise'
--   AND deleted_at IS NULL;


-- ─── STEP 4 (OPTIONAL): Move specific rows by ID ────────────────────────────
--   If only some rows need moving, supply their UUIDs here.

-- UPDATE public.transactions
--   SET entity_id = 'houston-generator-pros'
-- WHERE id IN (
--   'paste-uuid-here',
--   'another-uuid-here'
-- );


-- ─── STEP 5: Confirm entity_id constraints are in place ─────────────────────

SELECT conname, conrelid::regclass, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conname LIKE 'chk_%_entity'
ORDER BY conname;
