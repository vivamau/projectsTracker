-- Rename project_id to project_code in activities and remove the FK.
-- project_code stores the GlassID (matches projects.project_code), not projects.id.
-- SQLite requires table recreation to drop a FK constraint.

CREATE TABLE IF NOT EXISTS activities_new (
  id                          INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL UNIQUE,
  project_code                INTEGER NOT NULL,
  activity_from               INTEGER NOT NULL,
  activity_to                 INTEGER NOT NULL,
  activity_planned_tickets    INTEGER DEFAULT 0,
  activity_closed_tickets     INTEGER DEFAULT 0,
  activity_bug_tickets        INTEGER DEFAULT 0,
  activity_bug_closed_tickets INTEGER DEFAULT 0,
  activity_import_id          INTEGER,
  activity_create_date        INTEGER NOT NULL,
  activity_update_date        INTEGER,
  activity_is_deleted         INTEGER DEFAULT 0
);

INSERT INTO activities_new
  SELECT id, project_id, activity_from, activity_to,
         activity_planned_tickets, activity_closed_tickets,
         activity_bug_tickets, activity_bug_closed_tickets,
         activity_import_id, activity_create_date,
         activity_update_date, activity_is_deleted
  FROM activities;

DROP TABLE activities;
ALTER TABLE activities_new RENAME TO activities;

CREATE INDEX IF NOT EXISTS idx_activities_project_code ON activities (project_code);
CREATE INDEX IF NOT EXISTS idx_activities_from ON activities (activity_from);
