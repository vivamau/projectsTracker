-- 013_vendor_role_rates_update.sql
-- Add seniority_id and description to vendorrolerates

ALTER TABLE vendorrolerates ADD COLUMN seniority_id INTEGER REFERENCES seniorities(id);
ALTER TABLE vendorrolerates ADD COLUMN vendorrolerate_description TEXT;
