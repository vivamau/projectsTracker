-- 009_vendor_soft_delete.sql
-- Add soft delete column to vendors

ALTER TABLE vendors ADD COLUMN vendor_is_deleted INTEGER DEFAULT 0;
