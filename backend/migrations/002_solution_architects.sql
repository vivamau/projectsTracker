-- Solution Architects (mirrors projectmanagers pattern)

CREATE TABLE IF NOT EXISTS solutionarchitects (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL UNIQUE,
  user_id INTEGER REFERENCES users (id)
);

CREATE TABLE IF NOT EXISTS projects_to_solutionarchitects (
  id INTEGER PRIMARY KEY AUTOINCREMENT UNIQUE NOT NULL,
  project_id INTEGER REFERENCES projects (id),
  solutionarchitect_id INTEGER REFERENCES solutionarchitects (id),
  division_id INTEGER REFERENCES divisions (id),
  project_to_solutionarchitect_create_date INTEGER,
  project_to_solutionarchitect_start_date INTEGER NOT NULL,
  project_to_solutionarchitect_end_date INTEGER,
  project_to_solutionarchitect_update_date INTEGER
);
