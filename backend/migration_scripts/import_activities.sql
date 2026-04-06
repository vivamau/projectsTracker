-- ============================================================
-- Import activities from frankeeno-be activity table
--
-- Maps:
--   activity.project_id                → activities.project_id
--   activity.activity_from             → activities.activity_from
--   activity.activity_to               → activities.activity_to
--   activity.activity_planned_ticket_nr → activities.activity_planned_tickets
--   activity.activity_closed_ticket_nr → activities.activity_closed_tickets
--   activity.activity_bug_ticket_nr    → activities.activity_bug_tickets
--   activity.activity_bug_closed_ticket_nr → activities.activity_bug_closed_tickets
--   activity.activity_import_id        → activities.activity_import_id
--   activity.activity_log_createdate   → activities.activity_create_date
--   activity.activity_log_updatedate   → activities.activity_update_date
--
-- Only rows whose project_id exists in the target projects table
-- are imported (inner join ensures referential integrity).
--
-- Prereq: migrate_from_frankeeno.sql has been run
--         migration 020_activities.sql has been applied
--
-- Run with:
--   sqlite3 backend/data/database.sqlite \
--     < backend/migration_scripts/import_activities.sql
-- ============================================================

ATTACH DATABASE '/Users/vivamau/projects/frankeeno-be/db/projects.db' AS src;

DELETE FROM activities;
DELETE FROM sqlite_sequence WHERE name = 'activities';

INSERT INTO activities (
  id,
  project_id,
  activity_from,
  activity_to,
  activity_planned_tickets,
  activity_closed_tickets,
  activity_bug_tickets,
  activity_bug_closed_tickets,
  activity_import_id,
  activity_create_date,
  activity_update_date,
  activity_is_deleted
)
SELECT
  a.id,
  a.project_id,
  a.activity_from,
  a.activity_to,
  COALESCE(a.activity_planned_ticket_nr, 0),
  COALESCE(a.activity_closed_ticket_nr, 0),
  COALESCE(a.activity_bug_ticket_nr, 0),
  COALESCE(a.activity_bug_closed_ticket_nr, 0),
  a.activity_import_id,
  COALESCE(a.activity_log_createdate, CAST(strftime('%s', 'now') AS INTEGER) * 1000),
  a.activity_log_updatedate,
  0
FROM src.activity a
INNER JOIN projects p ON p.id = a.project_id;

SELECT 'Activities imported: ' || COUNT(*) AS result FROM activities;
SELECT 'Projects covered:    ' || COUNT(DISTINCT project_id) AS result FROM activities;
