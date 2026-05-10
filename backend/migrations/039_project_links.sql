CREATE TABLE IF NOT EXISTS project_links (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL UNIQUE,
  project_id INTEGER NOT NULL REFERENCES projects(id),
  projectlink_label TEXT NOT NULL,
  projectlink_URL TEXT NOT NULL,
  projectlink_createdate INTEGER NOT NULL,
  projectlink_updatedate INTEGER,
  projectlink_is_deleted INTEGER DEFAULT 0
);
