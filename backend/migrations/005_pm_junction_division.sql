-- 005_pm_junction_division.sql
-- Add division_id to the project-PM junction so each PM is associated with a division per project

ALTER TABLE projects_to_projectmanagers ADD COLUMN division_id INTEGER REFERENCES divisions(id);
