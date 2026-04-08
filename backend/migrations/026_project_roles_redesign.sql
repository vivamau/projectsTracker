-- 026_project_roles_redesign.sql
-- Replace projectmanagers/solutionarchitects table pairs with a generic
-- project_roles lookup table and a single project_assignments junction table.

-- 1. Role definitions (managed by superadmin)
CREATE TABLE IF NOT EXISTS project_roles (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL UNIQUE,
  role_name TEXT NOT NULL,
  role_description TEXT,
  role_create_date INTEGER NOT NULL,
  role_is_deleted INTEGER DEFAULT 0
);

-- Seed existing roles (INSERT OR IGNORE keeps idempotent on re-run)
INSERT OR IGNORE INTO project_roles (id, role_name, role_create_date)
  VALUES (1, 'Project Manager', 0);
INSERT OR IGNORE INTO project_roles (id, role_name, role_create_date)
  VALUES (2, 'Solution Architect', 0);

-- 2. Generic assignment junction table
CREATE TABLE IF NOT EXISTS project_assignments (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL UNIQUE,
  project_id INTEGER REFERENCES projects(id),
  user_id INTEGER REFERENCES users(id),
  project_role_id INTEGER REFERENCES project_roles(id),
  division_id INTEGER REFERENCES divisions(id),
  assignment_create_date INTEGER NOT NULL,
  assignment_start_date INTEGER,
  assignment_end_date INTEGER,
  assignment_update_date INTEGER,
  assignment_percentage INTEGER
);

-- 3. Migrate existing PM assignments (only if old tables still exist)
INSERT INTO project_assignments (
  project_id, user_id, project_role_id, division_id,
  assignment_create_date, assignment_start_date, assignment_end_date,
  assignment_update_date, assignment_percentage
)
SELECT
  ppm.project_id,
  pm.user_id,
  1,
  ppm.division_id,
  COALESCE(ppm.project_to_projectmanager_create_date, 0),
  ppm.project_to_projectmanager_start_date,
  ppm.project_to_projectmanager_end_date,
  ppm.project_to_projectmanager_update_date,
  ppm.project_to_projectmanager_percentage
FROM projects_to_projectmanagers ppm
JOIN projectmanagers pm ON pm.id = ppm.projectmanager_id
WHERE EXISTS (SELECT 1 FROM sqlite_master WHERE type='table' AND name='projects_to_projectmanagers')
  AND NOT EXISTS (
    SELECT 1 FROM project_assignments pa
    WHERE pa.project_id = ppm.project_id
      AND pa.user_id = pm.user_id
      AND pa.project_role_id = 1
  );

-- 4. Migrate existing SA assignments
INSERT INTO project_assignments (
  project_id, user_id, project_role_id, division_id,
  assignment_create_date, assignment_start_date, assignment_end_date,
  assignment_update_date, assignment_percentage
)
SELECT
  psa.project_id,
  sa.user_id,
  2,
  psa.division_id,
  COALESCE(psa.project_to_solutionarchitect_create_date, 0),
  psa.project_to_solutionarchitect_start_date,
  psa.project_to_solutionarchitect_end_date,
  psa.project_to_solutionarchitect_update_date,
  psa.project_to_solutionarchitect_percentage
FROM projects_to_solutionarchitects psa
JOIN solutionarchitects sa ON sa.id = psa.solutionarchitect_id
WHERE EXISTS (SELECT 1 FROM sqlite_master WHERE type='table' AND name='projects_to_solutionarchitects')
  AND NOT EXISTS (
    SELECT 1 FROM project_assignments pa
    WHERE pa.project_id = psa.project_id
      AND pa.user_id = sa.user_id
      AND pa.project_role_id = 2
  );

-- 5. Drop old tables
DROP TABLE IF EXISTS projects_to_projectmanagers;
DROP TABLE IF EXISTS projects_to_solutionarchitects;
DROP TABLE IF EXISTS projectmanagers;
DROP TABLE IF EXISTS solutionarchitects;
