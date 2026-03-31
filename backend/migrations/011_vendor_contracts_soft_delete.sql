-- 011_vendor_contracts_soft_delete.sql
-- Add soft delete columns to vendor contract related tables

ALTER TABLE vendorcontracts ADD COLUMN vendorcontract_is_deleted INTEGER DEFAULT 0;
ALTER TABLE vendorcontractroles ADD COLUMN vendorcontractrole_is_deleted INTEGER DEFAULT 0;
ALTER TABLE vendorrolerates ADD COLUMN vendorrolerate_is_deleted INTEGER DEFAULT 0;
