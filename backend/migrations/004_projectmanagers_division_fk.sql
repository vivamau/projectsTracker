-- 004_projectmanagers_division_fk.sql
-- Add division_id FK to projectmanagers table

ALTER TABLE projectmanagers ADD COLUMN division_id INTEGER REFERENCES divisions(id);
