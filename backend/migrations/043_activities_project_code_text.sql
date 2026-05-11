-- Fix activities.project_code column type to TEXT (was INTEGER from the old FK)
-- and add FK reference to projects(project_code).

CREATE TABLE IF NOT EXISTS activities_v2 (
  id                          INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL UNIQUE,
  project_code                TEXT NOT NULL,
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

INSERT INTO activities_v2
  SELECT id, CAST(project_code AS TEXT), activity_from, activity_to,
         activity_planned_tickets, activity_closed_tickets,
         activity_bug_tickets, activity_bug_closed_tickets,
         activity_import_id, activity_create_date,
         activity_update_date, activity_is_deleted
  FROM activities;

DROP TABLE activities;
ALTER TABLE activities_v2 RENAME TO activities;

CREATE INDEX IF NOT EXISTS idx_activities_project_code ON activities (project_code);
CREATE INDEX IF NOT EXISTS idx_activities_from ON activities (activity_from);
