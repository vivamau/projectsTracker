-- 006_vendors.sql
-- Creation of the vendors, vendorfocalpoints, vendorcontracts, vendorcontractroles, vendorrolerates, projects_to_vendors, vendorresources tables

CREATE TABLE IF NOT EXISTS vendors (
  id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  vendor_name TEXT NOT NULL,
  vendor_address TEXT,
  vendor_phone TEXT,
  vendor_email TEXT,
  vendor_website TEXT,
  vendor_create_date INTEGER NOT NULL,
  vendor_update_date INTEGER,
  user_id INTEGER REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS vendorfocalpoints (
  id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  focalpoint_name TEXT NOT NULL,
  focalpoint_position TEXT,
  focalpoint_phone TEXT,
  focalpoint_email TEXT,
  focalpoint_create_date INTEGER NOT NULL,
  focalpoint_update_date INTEGER,
  vendor_id INTEGER REFERENCES vendors(id)
);

CREATE TABLE IF NOT EXISTS vendorcontracts (
  id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  contract_name TEXT NOT NULL,
  contract_document_path TEXT,
  contract_start_date INTEGER NOT NULL,
  contract_end_date INTEGER,
  contract_create_date INTEGER NOT NULL,
  contract_update_date INTEGER,
  vendor_id INTEGER REFERENCES vendors(id)
);

CREATE TABLE IF NOT EXISTS vendorcontractroles (
  id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  vendorcontractrole_name TEXT NOT NULL,
  vendorcontractrole_description TEXT,
  vendorcontractrole_create_date INTEGER NOT NULL,
  vendorcontractrole_update_date INTEGER,
  vendorcontract_id INTEGER REFERENCES vendorcontracts(id)
);

CREATE TABLE IF NOT EXISTS vendorrolerates (
  id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  vendorrolerate_rate NUMERIC NOT NULL,
  vendorrolerate_create_date INTEGER NOT NULL,
  vendorrolerate_update_date INTEGER,
  vendorcontractrole_id INTEGER REFERENCES vendorcontractroles(id),
  currency_id INTEGER REFERENCES currencies(id)
);

CREATE TABLE IF NOT EXISTS vendorresources (
  id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  vendorresource_name TEXT NOT NULL,
  vendorresource_lastname TEXT NOT NULL,
  vendorresource_middlename TEXT,
  vendorresource_email TEXT,
  vendorresource_phone TEXT,
  vendorresource_create_date INTEGER NOT NULL,
  vendorresource_update_date INTEGER,
  vendor_id INTEGER REFERENCES vendors(id)
);

  