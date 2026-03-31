-- 015_supporting_divisions.sql
CREATE TABLE IF NOT EXISTS projects_to_divisions (
  id INTEGER PRIMARY KEY AUTOINCREMENT UNIQUE NOT NULL,
  project_id INTEGER REFERENCES projects (id),
  division_id INTEGER REFERENCES divisions (id)
);
