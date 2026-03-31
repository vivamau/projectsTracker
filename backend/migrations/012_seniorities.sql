-- 012_seniorities.sql
-- Create seniorities table for role rate seniority levels

CREATE TABLE IF NOT EXISTS seniorities (
  id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  seniority_description TEXT NOT NULL,
  seniority_create_date INTEGER NOT NULL,
  seniority_update_date INTEGER,
  seniority_is_deleted INTEGER DEFAULT 0
);
