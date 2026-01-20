ALTER TABLE IF EXISTS "project_loans"
  ADD COLUMN IF NOT EXISTS "origination_date" date;
