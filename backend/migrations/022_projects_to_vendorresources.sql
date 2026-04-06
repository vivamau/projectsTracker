CREATE TABLE IF NOT EXISTS projects_to_vendorresources (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL UNIQUE,
  project_id INTEGER NOT NULL REFERENCES projects (id),
  vendorresource_id INTEGER NOT NULL REFERENCES vendorresources (id),
  pvr_percentage INTEGER DEFAULT 100,
  pvr_active TEXT DEFAULT 'Yes',
  pvr_import_id INTEGER,
  pvr_create_date INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  pvr_is_deleted INTEGER DEFAULT 0,
  UNIQUE(project_id, vendorresource_id)
);

CREATE INDEX IF NOT EXISTS idx_pvr_project_id ON projects_to_vendorresources (project_id);
CREATE INDEX IF NOT EXISTS idx_pvr_vendorresource_id ON projects_to_vendorresources (vendorresource_id);
