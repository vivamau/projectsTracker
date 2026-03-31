-- 010_purchaseorderitems_soft_delete.sql
-- Add soft delete column to purchaseorderitems

ALTER TABLE purchaseorderitems ADD COLUMN purchaseorderitem_is_deleted INTEGER DEFAULT 0;
