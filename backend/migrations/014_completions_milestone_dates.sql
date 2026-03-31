-- 014_completions_milestone_dates.sql
-- Add milestone start and end dates to completions table for tracking milestones

ALTER TABLE completions ADD COLUMN completion_start_date INTEGER;
ALTER TABLE completions ADD COLUMN completion_end_date INTEGER;
