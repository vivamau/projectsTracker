-- Add percentage field to PM and SA junction tables
ALTER TABLE projects_to_projectmanagers
  ADD COLUMN project_to_projectmanager_percentage INTEGER;

ALTER TABLE projects_to_solutionarchitects
  ADD COLUMN project_to_solutionarchitect_percentage INTEGER;
