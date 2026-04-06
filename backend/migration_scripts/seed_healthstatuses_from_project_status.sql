-- ============================================================
-- Seed healthstatuses from frankeeno-be project_status
--
-- Maps each project's lifecycle status to a health value:
--   development, improvement, maintenance, support → 3 (On Track)
--   discovery, queued                              → 2 (Needs Attention)
--   discontinued, ended, support ended             → 1 (At Risk)
--
-- The original status name is stored as healthstatus_comment
-- so it remains readable in the UI.
--
-- Prereq: migrate_from_frankeeno.sql has been run
--
-- Run with:
--   sqlite3 backend/data/database.sqlite \
--     < backend/migration_scripts/seed_healthstatuses_from_project_status.sql
-- ============================================================

ATTACH DATABASE '/Users/vivamau/projects/frankeeno-be/db/projects.db' AS src;

DELETE FROM healthstatuses;
DELETE FROM sqlite_sequence WHERE name = 'healthstatuses';

INSERT INTO healthstatuses (project_id, healthstatus_value, healthstatus_comment, healthstatus_create_date)
SELECT
  p.id,
  CASE ps.project_status_name
    WHEN 'development'    THEN 3
    WHEN 'improvement'    THEN 3
    WHEN 'maintenance'    THEN 3
    WHEN 'support'        THEN 3
    WHEN 'discovery'      THEN 2
    WHEN 'queued'         THEN 2
    WHEN 'discontinued'   THEN 1
    WHEN 'ended'          THEN 1
    WHEN 'support ended'  THEN 1
    ELSE 2
  END,
  ps.project_status_name,
  CAST(strftime('%s', 'now') AS INTEGER) * 1000
FROM src.project p
JOIN src.project_status ps ON ps.id = p.project_status_id;

SELECT healthstatus_value, healthstatus_comment AS status, COUNT(*) AS projects
FROM healthstatuses
GROUP BY healthstatus_value, healthstatus_comment
ORDER BY healthstatus_value;
