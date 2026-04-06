-- Import project-to-vendor-resource assignments from external_resource table
-- Source: external_resource.project_id links a resource to a project
-- Target: projects_to_vendorresources (many-to-many)
-- NOTE: vendorresources.id = external_resource.id (IDs were preserved during import)
--       projects.project_import_id = external_resource.project_id

ATTACH DATABASE '/Users/vivamau/projects/frankeeno-be/db/projects.db' AS src;

INSERT OR IGNORE INTO projects_to_vendorresources
  (project_id, vendorresource_id, pvr_percentage, pvr_active, pvr_import_id, pvr_create_date)
SELECT
  er.project_id                                 AS project_id,
  er.id                                         AS vendorresource_id,
  CAST(er.Percentage AS INTEGER)                AS pvr_percentage,
  er.active                                     AS pvr_active,
  er.id                                         AS pvr_import_id,
  strftime('%s', 'now') * 1000                  AS pvr_create_date
FROM src.external_resource er
WHERE er.project_id IS NOT NULL
  AND er.id IN (SELECT id FROM vendorresources)
  AND er.project_id IN (SELECT id FROM projects);

DETACH DATABASE src;

-- Verify
SELECT
  COUNT(*) AS total_assignments,
  SUM(CASE WHEN pvr_active = 'Yes' THEN 1 ELSE 0 END) AS active,
  SUM(CASE WHEN pvr_active = 'No' THEN 1 ELSE 0 END)  AS inactive
FROM projects_to_vendorresources;
