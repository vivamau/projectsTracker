-- 018_app_settings.sql
-- Application settings key-value store

CREATE TABLE IF NOT EXISTS app_settings (
  id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  updated_by TEXT
);
