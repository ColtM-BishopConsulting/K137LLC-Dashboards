ALTER TABLE IF EXISTS "project_utilities"
  ADD COLUMN IF NOT EXISTS "account_id" integer,
  ADD COLUMN IF NOT EXISTS "account_name" varchar(128);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'project_utilities'
      AND constraint_name = 'project_utilities_account_id_fkey'
  ) THEN
    ALTER TABLE "project_utilities"
      ADD CONSTRAINT "project_utilities_account_id_fkey"
      FOREIGN KEY ("account_id") REFERENCES "ledger_accounts"("id") ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "project_utilities_account_id_idx" ON "project_utilities" ("account_id");

ALTER TABLE IF EXISTS "project_loans"
  ADD COLUMN IF NOT EXISTS "account_id" integer,
  ADD COLUMN IF NOT EXISTS "account_name" varchar(128);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'project_loans'
      AND constraint_name = 'project_loans_account_id_fkey'
  ) THEN
    ALTER TABLE "project_loans"
      ADD CONSTRAINT "project_loans_account_id_fkey"
      FOREIGN KEY ("account_id") REFERENCES "ledger_accounts"("id") ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "project_loans_account_id_idx" ON "project_loans" ("account_id");
