-- 002_add_auth_and_soft_delete.sql
-- Adds password hash, soft delete flags, and missing initiative columns

-- Auth: password hash for users
ALTER TABLE users ADD COLUMN user_password_hash TEXT;

-- Soft delete flags
ALTER TABLE users ADD COLUMN user_is_deleted INTEGER DEFAULT 0;
ALTER TABLE projects ADD COLUMN project_is_deleted INTEGER DEFAULT 0;
ALTER TABLE divisions ADD COLUMN division_is_deleted INTEGER DEFAULT 0;

-- Initiative metadata (table only had id)
ALTER TABLE initiatives ADD COLUMN initiative_name TEXT;
ALTER TABLE initiatives ADD COLUMN initiative_description TEXT;
ALTER TABLE initiatives ADD COLUMN initiative_create_date INTEGER;
ALTER TABLE initiatives ADD COLUMN initiative_update_date INTEGER;
ALTER TABLE initiatives ADD COLUMN initiative_is_deleted INTEGER DEFAULT 0;

-- Delivery path soft delete
ALTER TABLE deliverypaths ADD COLUMN deliverypath_is_deleted INTEGER DEFAULT 0;

-- Health status comment
ALTER TABLE healthstatuses ADD COLUMN healthstatus_comment TEXT;

-- Budget soft delete
ALTER TABLE budgets ADD COLUMN budget_is_deleted INTEGER DEFAULT 0;

-- Currency soft delete
ALTER TABLE currencies ADD COLUMN currency_is_deleted INTEGER DEFAULT 0;
