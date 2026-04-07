CREATE TABLE IF NOT EXISTS healthstatus_types (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL UNIQUE,
  healthstatus_name TEXT NOT NULL,
  healthstatus_description TEXT,
  healthstatus_is_deleted INTEGER DEFAULT 0,
  healthstatus_create_date INTEGER
);
