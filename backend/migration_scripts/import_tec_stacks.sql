-- ============================================================
-- Import technology stacks and project links
--
-- Maps:
--   tec_stack            → tec_stacks
--   project_to_tec_stack → projects_to_tec_stacks
--
-- tec_stack_type values: fe, be, db, mob, none
-- tec_stack_support values: Yes, No
--
-- Only project links whose project_id exists in the target
-- projects table are imported.
--
-- Prereq: migrate_from_frankeeno.sql has been run
--         migration 021_tec_stacks.sql has been applied
--
-- Run with:
--   sqlite3 backend/data/database.sqlite \
--     < backend/migration_scripts/import_tec_stacks.sql
-- ============================================================

ATTACH DATABASE '/Users/vivamau/projects/frankeeno-be/db/projects.db' AS src;

DELETE FROM projects_to_tec_stacks;
DELETE FROM tec_stacks;
DELETE FROM sqlite_sequence WHERE name IN ('tec_stacks', 'projects_to_tec_stacks');

-- Import technology stacks
INSERT INTO tec_stacks (
  id, tec_stack_name, tec_stack_description,
  tec_stack_type, tec_stack_support,
  tec_stack_create_date, tec_stack_is_deleted
)
SELECT
  id,
  tec_stack_name,
  tec_stack_description,
  tec_stack_type,
  tec_stack_support,
  tec_stack_create_date,
  0
FROM src.tec_stack;

-- Import project links (only for projects that exist in the target)
INSERT INTO projects_to_tec_stacks (project_id, tec_stack_id)
SELECT pt.project_id, pt.tec_stack_id
FROM src.project_to_tec_stack pt
INNER JOIN projects p ON p.id = pt.project_id;

SELECT 'tec_stacks imported:         ' || COUNT(*) AS result FROM tec_stacks;
SELECT 'project-tec_stack links:     ' || COUNT(*) AS result FROM projects_to_tec_stacks;
SELECT 'projects with a tec stack:   ' || COUNT(DISTINCT project_id) AS result FROM projects_to_tec_stacks;
