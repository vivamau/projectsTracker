-- 036_user_expire_date.sql
-- Add optional expiry date to users (only meaningful for users with a password)

ALTER TABLE users ADD COLUMN user_expire_date INTEGER;
