-- Migration 021: technology stacks and project links

CREATE TABLE IF NOT EXISTS tec_stacks (
  id                   INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL UNIQUE,
  tec_stack_name       TEXT NOT NULL,
  tec_stack_description TEXT,
  tec_stack_type       TEXT,
  tec_stack_support    TEXT,
  tec_stack_create_date INTEGER,
  tec_stack_is_deleted INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS projects_to_tec_stacks (
  id           INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL UNIQUE,
  project_id   INTEGER NOT NULL REFERENCES projects (id),
  tec_stack_id INTEGER NOT NULL REFERENCES tec_stacks (id)
);

CREATE INDEX IF NOT EXISTS idx_projects_to_tec_stacks_project ON projects_to_tec_stacks (project_id);
