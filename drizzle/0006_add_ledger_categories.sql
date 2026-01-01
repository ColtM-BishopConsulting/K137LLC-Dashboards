CREATE TABLE IF NOT EXISTS "ledger_categories" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" varchar(128) NOT NULL,
  "created_at" timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "ledger_categories_name_idx"
  ON "ledger_categories" ("name");

ALTER TABLE IF EXISTS "ledger_transactions"
  ADD COLUMN IF NOT EXISTS "category_id" integer;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'ledger_transactions'
  ) THEN
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.table_constraints
      WHERE table_schema = 'public'
        AND table_name = 'ledger_transactions'
        AND constraint_name = 'ledger_transactions_category_id_fkey'
    ) THEN
      ALTER TABLE "ledger_transactions"
        ADD CONSTRAINT "ledger_transactions_category_id_fkey"
        FOREIGN KEY ("category_id") REFERENCES "ledger_categories"("id") ON DELETE SET NULL;
    END IF;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'ledger_transactions'
  ) THEN
    INSERT INTO "ledger_categories" ("name")
    SELECT DISTINCT "category"
    FROM "ledger_transactions"
    WHERE "category" IS NOT NULL AND "category" <> ''
    ON CONFLICT ("name") DO NOTHING;

    UPDATE "ledger_transactions" t
    SET "category_id" = c."id"
    FROM "ledger_categories" c
    WHERE t."category_id" IS NULL
      AND t."category" = c."name";
  END IF;
END $$;
