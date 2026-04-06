-- ============================================================
-- Link purchase orders to year-based budgets
--
-- Prereqs:
--   1. migrate_from_frankeeno.sql has been run
--   2. seed_yearly_budgets.js has been run
--
-- Strategy:
--   Step 1 — match by project + PO start year (exact match)
--   Step 2 — for POs whose year falls outside the project's
--             budget range, link to the nearest budget year
--   Step 3 — AskMSD (project 170) has a placeholder start date
--             (year ~2040), so a 2025 budget is created for it
--             and its 4 POs are linked to it
--
-- Run with:
--   sqlite3 backend/data/database.sqlite \
--     < backend/migration_scripts/link_purchaseorders_to_budgets.sql
-- ============================================================

ATTACH DATABASE '/Users/vivamau/projects/frankeeno-be/db/projects.db' AS src;

-- Step 1: exact year match
UPDATE purchaseorders
SET budget_id = (
  SELECT b.id
  FROM src.purchase_order po
  JOIN projects_to_budgets pb ON pb.project_id = po.project_id
  JOIN budgets b ON b.id = pb.budget_id
  WHERE po.id = purchaseorders.id
    AND strftime('%Y',
          COALESCE(po.purchase_order_start_date, po.purchase_order_effective_start_date) / 1000,
          'unixepoch')
        = strftime('%Y', b.budget_start_date / 1000, 'unixepoch')
  LIMIT 1
)
WHERE budget_id IS NULL;

-- Step 2: nearest budget year for remaining unlinked POs
UPDATE purchaseorders
SET budget_id = (
  SELECT b.id
  FROM src.purchase_order po
  JOIN projects_to_budgets pb ON pb.project_id = po.project_id
  JOIN budgets b ON b.id = pb.budget_id
  WHERE po.id = purchaseorders.id
  ORDER BY ABS(
    CAST(strftime('%Y',
      COALESCE(po.purchase_order_start_date, po.purchase_order_effective_start_date) / 1000,
      'unixepoch') AS INTEGER)
    - CAST(strftime('%Y', b.budget_start_date / 1000, 'unixepoch') AS INTEGER)
  )
  LIMIT 1
)
WHERE budget_id IS NULL;

-- Step 3: AskMSD (project 170) — create a 2025 budget and link its POs
INSERT INTO budgets (
  budget_amount, budget_start_date, budget_end_date,
  budget_create_date, budget_update_date, currency_id, budget_is_deleted
)
SELECT
  0,
  CAST(strftime('%s', '2025-01-01') AS INTEGER) * 1000,
  CAST(strftime('%s', '2025-12-31') AS INTEGER) * 1000,
  CAST(strftime('%s', 'now') AS INTEGER) * 1000,
  CAST(strftime('%s', 'now') AS INTEGER) * 1000,
  2, 0
WHERE NOT EXISTS (
  SELECT 1 FROM budgets b
  JOIN projects_to_budgets pb ON pb.budget_id = b.id
  WHERE pb.project_id = 170
);

INSERT INTO projects_to_budgets (project_id, budget_id)
SELECT 170, last_insert_rowid()
WHERE NOT EXISTS (
  SELECT 1 FROM projects_to_budgets WHERE project_id = 170
);

UPDATE purchaseorders
SET budget_id = (
  SELECT b.id FROM budgets b
  JOIN projects_to_budgets pb ON pb.budget_id = b.id
  WHERE pb.project_id = 170
  LIMIT 1
)
WHERE budget_id IS NULL;

SELECT 'Linked:   ' || COUNT(*) AS result FROM purchaseorders WHERE budget_id IS NOT NULL;
SELECT 'Unlinked: ' || COUNT(*) AS result FROM purchaseorders WHERE budget_id IS NULL;
