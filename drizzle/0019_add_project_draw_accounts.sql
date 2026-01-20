ALTER TABLE IF EXISTS "project_draws"
  ADD COLUMN IF NOT EXISTS "account_id" integer,
  ADD COLUMN IF NOT EXISTS "account_name" varchar(128);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'project_draws'
      AND constraint_name = 'project_draws_account_id_fkey'
  ) THEN
    ALTER TABLE "project_draws"
      ADD CONSTRAINT "project_draws_account_id_fkey"
      FOREIGN KEY ("account_id") REFERENCES "ledger_accounts"("id") ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "project_draws_account_id_idx" ON "project_draws" ("account_id");
