-- ============================================================
-- Seed project_statuses table and link projects
--
-- Imports all rows from frankeeno-be project_status into the
-- project_statuses table (created by migration 019), then sets
-- project_status_id on each project row using the preserved IDs.
--
-- Prereq:
--   - migration 019_project_statuses.sql has been applied
--   - migrate_from_frankeeno.sql has been run
--
-- Run with:
--   sqlite3 backend/data/database.sqlite \
--     < backend/migration_scripts/seed_project_statuses.sql
-- ============================================================

ATTACH DATABASE '/Users/vivamau/projects/frankeeno-be/db/projects.db' AS src;

DELETE FROM project_statuses;
DELETE FROM sqlite_sequence WHERE name = 'project_statuses';

INSERT INTO project_statuses (
  id, project_status_name, project_status_description,
  project_status_create_date, project_status_deprecate_date, project_status_is_deleted
)
SELECT
  id,
  project_status_name,
  project_status_description,
  project_status_create_date,
  CASE WHEN project_status_deprecate_date IS NOT NULL
            AND trim(project_status_deprecate_date) != ''
       THEN CAST(project_status_deprecate_date AS INTEGER)
       ELSE NULL END,
  0
FROM src.project_status;

UPDATE projects
SET project_status_id = (
  SELECT project_status_id FROM src.project WHERE id = projects.id
);

SELECT 'project_statuses rows:    ' || COUNT(*) AS result FROM project_statuses;
SELECT 'projects with status set: ' || COUNT(*) AS result FROM projects WHERE project_status_id IS NOT NULL;
SELECT 'projects without status:  ' || COUNT(*) AS result FROM projects WHERE project_status_id IS NULL;
