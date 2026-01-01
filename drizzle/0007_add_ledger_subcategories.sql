ALTER TABLE IF EXISTS "ledger_categories"
  ADD COLUMN IF NOT EXISTS "parent_id" integer;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'ledger_categories'
      AND constraint_name = 'ledger_categories_parent_id_fkey'
  ) THEN
    ALTER TABLE "ledger_categories"
      ADD CONSTRAINT "ledger_categories_parent_id_fkey"
      FOREIGN KEY ("parent_id") REFERENCES "ledger_categories"("id") ON DELETE CASCADE;
  END IF;
END $$;

DROP INDEX IF EXISTS "ledger_categories_name_idx";

CREATE UNIQUE INDEX IF NOT EXISTS "ledger_categories_parent_name_idx"
  ON "ledger_categories" ("parent_id", "name")
  WHERE "parent_id" IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "ledger_categories_root_name_idx"
  ON "ledger_categories" ("name")
  WHERE "parent_id" IS NULL;

ALTER TABLE IF EXISTS "ledger_transactions"
  ADD COLUMN IF NOT EXISTS "sub_category_id" integer;

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
        AND constraint_name = 'ledger_transactions_sub_category_id_fkey'
    ) THEN
      ALTER TABLE "ledger_transactions"
        ADD CONSTRAINT "ledger_transactions_sub_category_id_fkey"
        FOREIGN KEY ("sub_category_id") REFERENCES "ledger_categories"("id") ON DELETE SET NULL;
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
    INSERT INTO "ledger_categories" ("name", "parent_id")
    SELECT DISTINCT t."sub_category", c."id"
    FROM "ledger_transactions" t
    JOIN "ledger_categories" c ON c."name" = t."category"
    WHERE t."sub_category" IS NOT NULL AND t."sub_category" <> ''
    ON CONFLICT DO NOTHING;

    UPDATE "ledger_transactions" t
    SET "sub_category_id" = s."id"
    FROM "ledger_categories" s
    JOIN "ledger_categories" c ON c."id" = s."parent_id"
    WHERE t."sub_category_id" IS NULL
      AND t."sub_category" = s."name"
      AND t."category" = c."name";
  END IF;
END $$;
