-- 003_completions_project_fk.sql
-- Ensure completions table exists and add project_id FK + soft delete for milestone tracking

CREATE TABLE IF NOT EXISTS completions (
  id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  completion_value INTEGER,
  completion_comment TEXT,
  completion_create_date INTEGER NOT NULL,
  completion_update_date INTEGER,
  user_id INTEGER REFERENCES users(id)
);

ALTER TABLE completions ADD COLUMN project_id INTEGER REFERENCES projects(id);
ALTER TABLE completions ADD COLUMN completion_is_deleted INTEGER DEFAULT 0;
