-- 008_purchaseorder_soft_delete.sql
-- Add soft delete column to purchaseorders

ALTER TABLE purchaseorders ADD COLUMN purchaseorder_is_deleted INTEGER DEFAULT 0;
