-- 016_poitem_consumption.sql
-- Track monthly consumption (days used) per purchase order item

CREATE TABLE IF NOT EXISTS poitem_consumptions (
  id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  purchaseorderitem_id INTEGER NOT NULL REFERENCES purchaseorderitems(id),
  consumption_month INTEGER NOT NULL,
  consumption_days NUMERIC NOT NULL,
  consumption_comment TEXT,
  user_id INTEGER REFERENCES users(id),
  consumption_create_date INTEGER NOT NULL,
  consumption_update_date INTEGER,
  consumption_is_deleted INTEGER DEFAULT 0,
  UNIQUE(purchaseorderitem_id, consumption_month)
);
