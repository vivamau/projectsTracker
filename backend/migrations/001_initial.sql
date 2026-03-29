-- 001_initial.sql
-- Captures existing schema + adds missing columns for auth and logical deletion

CREATE TABLE IF NOT EXISTS initiatives (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS userroles (
  id INTEGER PRIMARY KEY AUTOINCREMENT UNIQUE NOT NULL,
  userrole_name TEXT UNIQUE NOT NULL,
  userrole_description TEXT,
  userrole_create_date INTEGER
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT UNIQUE NOT NULL,
  user_email TEXT UNIQUE NOT NULL,
  user_name TEXT,
  user_lastname TEXT,
  user_middlename TEXT,
  user_create_date INTEGER NOT NULL,
  user_update_date INTEGER,
  user_lastlogin_date INTEGER,
  userrole_id INTEGER REFERENCES userroles (id)
);

CREATE TABLE IF NOT EXISTS divisions (
  id INTEGER PRIMARY KEY AUTOINCREMENT UNIQUE NOT NULL,
  division_name TEXT,
  division_create_date INTEGER NOT NULL,
  division_update_date INTEGER
);

CREATE TABLE IF NOT EXISTS deliverypaths (
  id INTEGER PRIMARY KEY AUTOINCREMENT UNIQUE NOT NULL,
  deliverypath_name TEXT UNIQUE NOT NULL,
  deilverypath_description TEXT,
  deliverypath_create_date INTEGER NOT NULL,
  deliverypath_update_date INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT UNIQUE NOT NULL,
  project_name TEXT NOT NULL,
  project_create_date INTEGER,
  project_update_date INTEGER,
  project_description TEXT,
  project_plan_date INTEGER,
  project_start_date INTEGER,
  project_end_date INTEGER,
  initiative_id INTEGER REFERENCES initiatives (id),
  division_id INTEGER REFERENCES divisions (id),
  deliverypath_id INTEGER REFERENCES deliverypaths (id),
  user_id INTEGER REFERENCES users (id)
);

CREATE TABLE IF NOT EXISTS focalpoints (
  id INTEGER PRIMARY KEY AUTOINCREMENT UNIQUE NOT NULL,
  division_id INTEGER REFERENCES divisions (id),
  user_id INTEGER REFERENCES users (id)
);

CREATE TABLE IF NOT EXISTS healthstatuses (
  id INTEGER PRIMARY KEY AUTOINCREMENT UNIQUE NOT NULL,
  healthstatus_value INTEGER NOT NULL,
  healthstatus_create_date INTEGER NOT NULL,
  healthstatus_update_date INTEGER,
  project_id INTEGER REFERENCES projects (id)
);

CREATE TABLE IF NOT EXISTS projectmanagers (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL UNIQUE,
  user_id INTEGER REFERENCES users (id)
);

CREATE TABLE IF NOT EXISTS projects_to_projectmanagers (
  id INTEGER PRIMARY KEY AUTOINCREMENT UNIQUE NOT NULL,
  project_id INTEGER REFERENCES projects (id),
  projectmanager_id INTEGER REFERENCES projectmanagers (id),
  project_to_projectmanager_create_date INTEGER,
  project_to_projectmanager_start_date INTEGER NOT NULL,
  project_to_projectmanager_end_date INTEGER,
  project_to_projectmanager_update_date INTEGER
);

CREATE TABLE IF NOT EXISTS currencies (
  id INTEGER PRIMARY KEY AUTOINCREMENT UNIQUE NOT NULL,
  currency_name TEXT,
  currency_create_date INTEGER
);

CREATE TABLE IF NOT EXISTS budgets (
  id INTEGER PRIMARY KEY AUTOINCREMENT UNIQUE NOT NULL,
  budget_create_date INTEGER NOT NULL,
  budget_approve_date INTEGER,
  budget_update_date INTEGER,
  budget_amount NUMERIC,
  currency_id INTEGER REFERENCES currencies (id),
  budget_start_date INTEGER,
  budget_end_date INTEGER
);

CREATE TABLE IF NOT EXISTS projects_to_budgets (
  id INTEGER PRIMARY KEY AUTOINCREMENT UNIQUE NOT NULL,
  project_id INTEGER REFERENCES projects (id),
  budget_id INTEGER REFERENCES budgets (id)
);

CREATE TABLE IF NOT EXISTS countries (
  ISO2 TEXT,
  ISO3 TEXT,
  short_name TEXT,
  official_name TEXT,
  UN_country_code INTEGER PRIMARY KEY,
  UNDP_country_code TEXT
);

CREATE TABLE IF NOT EXISTS projects_to_countries (
  id INTEGER PRIMARY KEY AUTOINCREMENT UNIQUE NOT NULL,
  UN_country_code INTEGER REFERENCES countries (UN_country_code),
  project_id INTEGER REFERENCES projects (id)
);

-- Track applied migrations
CREATE TABLE IF NOT EXISTS _migrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  applied_at INTEGER NOT NULL
);
