-- ============================================================
-- Migration: frankeeno-be → projectsTracker
-- Run with:
--   sqlite3 backend/data/database.sqlite < backend/scripts/migrate_from_frankeeno.sql
--
-- Source tables imported:
--   vendor             → vendors
--   vendor_lta         → vendorcontracts
--   vendor_service     → vendorcontractroles + vendorrolerates
--   external_resource  → vendorresources
--   project            → projects
--   project_to_countries → projects_to_countries
--   budget             → budgets + projects_to_budgets
--   purchase_order     → purchaseorders + purchaseorderitems
--   purchase_order_consumption → poitem_consumptions
--   country            → countries (extras only, INSERT OR IGNORE)
--
-- Currency mapping: USD=1, EUR=2, GBP=3
-- Seniority mapping: L1=1 (Entry), L2=2 (Junior), L3=3 (Mid), L4=4 (Senior)
-- ============================================================

PRAGMA foreign_keys = OFF;
ATTACH DATABASE '/Users/vivamau/projects/frankeeno-be/db/projects.db' AS src;

-- ============================================================
-- 1. CLEAR EXISTING DATA (reverse FK order)
-- ============================================================
DELETE FROM poitem_consumptions;
DELETE FROM purchaseorderitems;
DELETE FROM purchaseorders;
DELETE FROM projects_to_budgets;
DELETE FROM budgets;
DELETE FROM projects_to_countries;
DELETE FROM projects_to_solutionarchitects;
DELETE FROM projects_to_projectmanagers;
DELETE FROM projects_to_divisions;
DELETE FROM completions;
DELETE FROM healthstatuses;
DELETE FROM projects;
DELETE FROM vendorrolerates;
DELETE FROM vendorcontractroles;
DELETE FROM vendorcontracts;
DELETE FROM vendorresources;
DELETE FROM vendorfocalpoints;
DELETE FROM vendors;

DELETE FROM sqlite_sequence WHERE name IN (
  'vendors', 'projects', 'budgets', 'purchaseorders', 'purchaseorderitems',
  'poitem_consumptions', 'projects_to_countries', 'projects_to_budgets',
  'vendorresources', 'vendorcontracts', 'vendorcontractroles', 'vendorrolerates',
  'vendorfocalpoints', 'completions', 'healthstatuses', 'projects_to_solutionarchitects',
  'projects_to_projectmanagers', 'projects_to_divisions'
);

SELECT 'Cleared existing data' AS step;

-- ============================================================
-- 2. COUNTRIES — insert extras from source (275 vs 196 in target)
-- ============================================================
INSERT OR IGNORE INTO countries (ISO2, ISO3, short_name, official_name, UN_country_code, UNDP_country_code)
SELECT ISO2, ISO3, short_name, official_name, UN_country_code, UNDP_country_code
FROM src.country;

SELECT 'Countries imported: ' || COUNT(*) AS step FROM countries;

-- ============================================================
-- 3. VENDORS
-- ============================================================
INSERT INTO vendors (id, vendor_name, vendor_create_date, vendor_is_deleted)
SELECT
  id,
  vendor_name,
  CAST(strftime('%s', 'now') AS INTEGER) * 1000,
  0
FROM src.vendor;

SELECT 'Vendors imported: ' || COUNT(*) AS step FROM vendors;

-- ============================================================
-- 4. VENDOR LTAs → VENDOR CONTRACTS
--    vendor_id is derived from the first vendor_service referencing the LTA
-- ============================================================
INSERT INTO vendorcontracts (
  id, contract_name, contract_start_date, contract_end_date,
  contract_create_date, contract_update_date, vendor_id, vendorcontract_is_deleted
)
SELECT
  vl.id,
  vl.vendor_lta_code,
  vl.vendor_lta_startdate,
  vl.vendor_lta_enddate,
  COALESCE(vl.vendor_lta_createdate, CAST(strftime('%s', 'now') AS INTEGER) * 1000),
  vl.vendor_lta_updatedate,
  (SELECT vs.vendor_id FROM src.vendor_service vs
   WHERE vs.vendor_service_lta_id = vl.id LIMIT 1),
  0
FROM src.vendor_lta vl;

SELECT 'Vendor contracts imported: ' || COUNT(*) AS step FROM vendorcontracts;

-- ============================================================
-- 5. VENDOR SERVICES → VENDOR CONTRACT ROLES
-- ============================================================
INSERT INTO vendorcontractroles (
  id, vendorcontractrole_name, vendorcontractrole_create_date,
  vendorcontractrole_update_date, vendorcontract_id, vendorcontractrole_is_deleted
)
SELECT
  vs.id,
  COALESCE(r.role_type_name, 'Unknown'),
  COALESCE(vs.vendor_service_createdate, CAST(strftime('%s', 'now') AS INTEGER) * 1000),
  vs.vendor_service_updatedate,
  vs.vendor_service_lta_id,
  0
FROM src.vendor_service vs
LEFT JOIN src.role r ON r.id = vs.role_id;

SELECT 'Vendor contract roles imported: ' || COUNT(*) AS step FROM vendorcontractroles;

-- ============================================================
-- 6. VENDOR SERVICE RATES (L1–L4) → VENDOR ROLE RATES
--    L1 = Entry Level (seniority 1)
--    L2 = Junior      (seniority 2)
--    L3 = Mid-Level   (seniority 3)
--    L4 = Senior      (seniority 4)
--    Currency: USD=1, EUR=2, GBP=3 (default EUR for unknown)
--    Only insert levels where rate > 0
-- ============================================================
INSERT INTO vendorrolerates (
  vendorrolerate_rate, vendorrolerate_create_date,
  vendorcontractrole_id, currency_id, seniority_id, vendorrolerate_is_deleted
)
SELECT rate, CAST(strftime('%s', 'now') AS INTEGER) * 1000, vcr_id, cur_id, sen_id, 0
FROM (
  SELECT vs.id AS vcr_id, vs.vendor_service_rate_L1 AS rate,
    CASE v.vendor_currency WHEN 'USD' THEN 1 WHEN 'EUR' THEN 2 WHEN 'GBP' THEN 3 ELSE 2 END AS cur_id,
    1 AS sen_id
  FROM src.vendor_service vs JOIN src.vendor v ON v.id = vs.vendor_id
  WHERE vs.vendor_service_rate_L1 > 0

  UNION ALL

  SELECT vs.id, vs.vendor_service_rate_L2,
    CASE v.vendor_currency WHEN 'USD' THEN 1 WHEN 'EUR' THEN 2 WHEN 'GBP' THEN 3 ELSE 2 END, 2
  FROM src.vendor_service vs JOIN src.vendor v ON v.id = vs.vendor_id
  WHERE vs.vendor_service_rate_L2 > 0

  UNION ALL

  SELECT vs.id, vs.vendor_service_rate_L3,
    CASE v.vendor_currency WHEN 'USD' THEN 1 WHEN 'EUR' THEN 2 WHEN 'GBP' THEN 3 ELSE 2 END, 3
  FROM src.vendor_service vs JOIN src.vendor v ON v.id = vs.vendor_id
  WHERE vs.vendor_service_rate_L3 > 0

  UNION ALL

  SELECT vs.id, vs.vendor_service_rate_L4,
    CASE v.vendor_currency WHEN 'USD' THEN 1 WHEN 'EUR' THEN 2 WHEN 'GBP' THEN 3 ELSE 2 END, 4
  FROM src.vendor_service vs JOIN src.vendor v ON v.id = vs.vendor_id
  WHERE vs.vendor_service_rate_L4 > 0
);

SELECT 'Vendor role rates imported: ' || COUNT(*) AS step FROM vendorrolerates;

-- ============================================================
-- 7. EXTERNAL RESOURCES → VENDOR RESOURCES
--    Source "name" is a full name — split on first space
--    Rows with null/empty name are skipped
-- ============================================================
INSERT INTO vendorresources (
  id, vendorresource_name, vendorresource_lastname,
  vendorresource_email, vendorresource_create_date, vendor_id
)
SELECT
  id,
  CASE WHEN instr(name, ' ') > 0
       THEN trim(substr(name, 1, instr(name, ' ') - 1))
       ELSE name END,
  CASE WHEN instr(name, ' ') > 0
       THEN trim(substr(name, instr(name, ' ') + 1))
       ELSE '-' END,
  email,
  CAST(strftime('%s', 'now') AS INTEGER) * 1000,
  vendor_id
FROM src.external_resource
WHERE name IS NOT NULL AND trim(name) != '';

SELECT 'Vendor resources imported: ' || COUNT(*) AS step FROM vendorresources;

-- ============================================================
-- 8. PROJECTS
-- ============================================================
INSERT INTO projects (
  id, project_name, project_description,
  project_start_date, project_end_date,
  project_create_date, project_update_date, project_is_deleted
)
SELECT
  id,
  project_name,
  project_description,
  project_start_date,
  project_end_date,
  COALESCE(project_create_date, CAST(strftime('%s', 'now') AS INTEGER) * 1000),
  COALESCE(project_update_date, CAST(strftime('%s', 'now') AS INTEGER) * 1000),
  0
FROM src.project;

SELECT 'Projects imported: ' || COUNT(*) AS step FROM projects;

-- ============================================================
-- 9. PROJECT → COUNTRIES
-- ============================================================
INSERT INTO projects_to_countries (UN_country_code, project_id)
SELECT UN_country_code, project_id
FROM src.project_to_countries;

SELECT 'Project-country links imported: ' || COUNT(*) AS step FROM projects_to_countries;

-- ============================================================
-- 10. BUDGETS + PROJECT LINKS
-- ============================================================
INSERT INTO budgets (id, budget_amount, budget_create_date, budget_is_deleted)
SELECT
  id,
  Budget_amount,
  CAST(strftime('%s', 'now') AS INTEGER) * 1000,
  0
FROM src.budget;

INSERT INTO projects_to_budgets (project_id, budget_id)
SELECT project_id, id FROM src.budget;

SELECT 'Budgets imported: ' || COUNT(*) AS step FROM budgets;

-- ============================================================
-- 11. PURCHASE ORDERS
--     Each source purchase_order becomes one purchaseorder row
-- ============================================================
INSERT INTO purchaseorders (
  id, purchaseorder_description, purchaseorder_start_date,
  purchaseorder_end_date, purchaseorder_create_date,
  vendor_id, purchaseorder_is_deleted
)
SELECT
  id,
  COALESCE(purchase_order_description, purchase_order_number),
  COALESCE(purchase_order_start_date, purchase_order_effective_start_date,
           CAST(strftime('%s', 'now') AS INTEGER) * 1000),
  purchase_order_end_date,
  COALESCE(purchase_order_log_create_date, CAST(strftime('%s', 'now') AS INTEGER) * 1000),
  vendor_id,
  0
FROM src.purchase_order;

SELECT 'Purchase orders imported: ' || COUNT(*) AS step FROM purchaseorders;

-- ============================================================
-- 12. PURCHASE ORDER ITEMS (one item per source PO)
--     id mirrors the PO id for a clean 1-to-1 relationship
-- ============================================================
INSERT INTO purchaseorderitems (
  id, purchaseorderitem_description,
  purchaseorderitem_start_date, purchaseorderitem_end_date,
  purchaseorderitems_discounted_rate, purchaseorderitems_days,
  purchaseorder_id, currency_id,
  purchaseorderitem_create_date, purchaseorderitem_is_deleted
)
SELECT
  id,
  COALESCE(purchase_order_workplan_reference, purchase_order_description, purchase_order_number),
  COALESCE(purchase_order_effective_start_date, purchase_order_start_date,
           CAST(strftime('%s', 'now') AS INTEGER) * 1000),
  COALESCE(purchase_order_end_date, CAST(strftime('%s', 'now') AS INTEGER) * 1000),
  purchase_order_daily_rate,
  purchase_order_days,
  id,   -- purchaseorder_id = same id (1-to-1)
  CASE purchase_order_currency
    WHEN 'USD' THEN 1
    WHEN 'EUR' THEN 2
    WHEN 'GBP' THEN 3
    ELSE 2
  END,
  COALESCE(purchase_order_log_create_date, CAST(strftime('%s', 'now') AS INTEGER) * 1000),
  0
FROM src.purchase_order;

SELECT 'Purchase order items imported: ' || COUNT(*) AS step FROM purchaseorderitems;

-- ============================================================
-- 13. PURCHASE ORDER CONSUMPTIONS → PO ITEM CONSUMPTIONS
--     - purchaseorderitem_id = purchase_order_id (1-to-1 mapping above)
--     - consumption_month = first day of the source date's month, as epoch ms
--     - Duplicate PO+month rows are aggregated (days summed, comments joined)
--     - 9 rows with null date are skipped
-- ============================================================
INSERT INTO poitem_consumptions (
  purchaseorderitem_id, consumption_month, consumption_days,
  consumption_comment, consumption_create_date, consumption_is_deleted
)
SELECT
  purchase_order_id,
  CAST(strftime('%s',
    strftime('%Y-%m', purchase_order_consumption_date / 1000, 'unixepoch') || '-01'
  ) AS INTEGER) * 1000,
  SUM(purchase_order_consumption_days),
  NULLIF(GROUP_CONCAT(
    CASE WHEN purchase_order_consumption_comments IS NOT NULL
              AND trim(purchase_order_consumption_comments) != ''
         THEN purchase_order_consumption_comments END,
    '; '
  ), ''),
  CAST(strftime('%s', 'now') AS INTEGER) * 1000,
  0
FROM src.purchase_order_consumption
WHERE purchase_order_consumption_date IS NOT NULL
GROUP BY
  purchase_order_id,
  strftime('%Y-%m', purchase_order_consumption_date / 1000, 'unixepoch');

SELECT 'PO item consumptions imported: ' || COUNT(*) AS step FROM poitem_consumptions;

-- ============================================================
-- DONE
-- ============================================================
PRAGMA foreign_keys = ON;

SELECT '' AS '';
SELECT '=== Migration summary ===' AS '';
SELECT 'countries'            AS "table", COUNT(*) AS rows FROM countries
UNION ALL SELECT 'vendors',              COUNT(*) FROM vendors
UNION ALL SELECT 'vendorcontracts',      COUNT(*) FROM vendorcontracts
UNION ALL SELECT 'vendorcontractroles',  COUNT(*) FROM vendorcontractroles
UNION ALL SELECT 'vendorrolerates',      COUNT(*) FROM vendorrolerates
UNION ALL SELECT 'vendorresources',      COUNT(*) FROM vendorresources
UNION ALL SELECT 'projects',             COUNT(*) FROM projects
UNION ALL SELECT 'projects_to_countries',COUNT(*) FROM projects_to_countries
UNION ALL SELECT 'budgets',              COUNT(*) FROM budgets
UNION ALL SELECT 'purchaseorders',       COUNT(*) FROM purchaseorders
UNION ALL SELECT 'purchaseorderitems',   COUNT(*) FROM purchaseorderitems
UNION ALL SELECT 'poitem_consumptions',  COUNT(*) FROM poitem_consumptions;
