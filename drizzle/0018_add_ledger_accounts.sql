CREATE TABLE IF NOT EXISTS "ledger_accounts" (
  "id" serial PRIMARY KEY,
  "name" varchar(128) NOT NULL,
  "type" varchar(32) NOT NULL DEFAULT 'bank',
  "institution" varchar(128),
  "last4" varchar(8),
  "created_at" timestamp with time zone DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "ledger_accounts_name_idx" ON "ledger_accounts" ("name");

ALTER TABLE IF EXISTS "ledger_transactions"
  ADD COLUMN IF NOT EXISTS "account_id" integer,
  ADD COLUMN IF NOT EXISTS "account_name" varchar(128);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'ledger_transactions'
      AND constraint_name = 'ledger_transactions_account_id_fkey'
  ) THEN
    ALTER TABLE "ledger_transactions"
      ADD CONSTRAINT "ledger_transactions_account_id_fkey"
      FOREIGN KEY ("account_id") REFERENCES "ledger_accounts"("id") ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "ledger_transactions_account_id_idx" ON "ledger_transactions" ("account_id");
