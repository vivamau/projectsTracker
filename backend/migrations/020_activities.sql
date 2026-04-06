-- Migration 020: activities table
-- Tracks sprint/iteration ticket metrics per project and time period

CREATE TABLE IF NOT EXISTS activities (
  id                          INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL UNIQUE,
  project_id                  INTEGER NOT NULL REFERENCES projects (id),
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

CREATE INDEX IF NOT EXISTS idx_activities_project_id ON activities (project_id);
CREATE INDEX IF NOT EXISTS idx_activities_from ON activities (activity_from);
