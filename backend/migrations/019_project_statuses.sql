-- Migration 019: add project_statuses lookup table and FK on projects

CREATE TABLE IF NOT EXISTS project_statuses (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL UNIQUE,
  project_status_name TEXT NOT NULL,
  project_status_description TEXT,
  project_status_create_date INTEGER,
  project_status_deprecate_date INTEGER,
  project_status_is_deleted INTEGER DEFAULT 0
);

ALTER TABLE projects ADD COLUMN project_status_id INTEGER REFERENCES project_statuses (id);
