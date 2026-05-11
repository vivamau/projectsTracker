CREATE UNIQUE INDEX IF NOT EXISTS idx_projects_project_code_unique
  ON projects (project_code)
  WHERE project_code IS NOT NULL;
