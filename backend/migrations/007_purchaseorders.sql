-- 007_purchaseorders.sql
-- Creation of the purchaseorders, purchaseorderitems tables

CREATE TABLE IF NOT EXISTS purchaseorders (
  id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  purchaseorder_description TEXT,
  purchaseorder_create_date INTEGER NOT NULL,
  purchaseorder_update_date INTEGER,
  purchaseorder_start_date INTEGER NOT NULL,
  purchaseorder_end_date INTEGER,
  vendor_id INTEGER REFERENCES vendors(id),
  budget_id INTEGER REFERENCES budgets(id),
  purchaseorderitem_status_id INTEGER REFERENCES purchaseorderstatuses(id),
  user_id INTEGER REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS purchaseorderitems (
  id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  purchaseorderitem_description TEXT,
  purchaseorderitem_create_date INTEGER NOT NULL,
  purchaseorderitem_update_date INTEGER,
  purchaseorderitem_start_date INTEGER NOT NULL,
  purchaseorderitem_end_date INTEGER,
  purchaseorderitems_discounted_rate NUMERIC,
  purchaseorderitems_days NUMERIC
  purchaseorder_id INTEGER REFERENCES purchaseorders(id),
  currency_id INTEGER REFERENCES currencies(id),
  vendorcontractrole_id INTEGER REFERENCES vendorcontractroles(id),
  vendorrolerate_id INTEGER REFERENCES vendorrolerates(id),
  vendorresource_id INTEGER REFERENCES vendorresources(id)
); 
  



  