CREATE TABLE IF NOT EXISTS "tenants" (
  "id" serial PRIMARY KEY,
  "rent_unit_id" integer REFERENCES "rent_units"("id") ON DELETE SET NULL,
  "name" varchar(255) NOT NULL,
  "email" varchar(255) NOT NULL,
  "password_hash" varchar(255) NOT NULL,
  "email_reminders" boolean NOT NULL DEFAULT false,
  "created_at" timestamp with time zone DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "tenants_email_idx" ON "tenants" ("email");
CREATE INDEX IF NOT EXISTS "tenants_rent_unit_id_idx" ON "tenants" ("rent_unit_id");

CREATE TABLE IF NOT EXISTS "tenant_reminder_logs" (
  "id" serial PRIMARY KEY,
  "tenant_id" integer NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "rent_unit_id" integer NOT NULL REFERENCES "rent_units"("id") ON DELETE CASCADE,
  "reminder_type" varchar(32) NOT NULL,
  "due_date" date NOT NULL,
  "reminder_date" date NOT NULL,
  "late_fee" numeric(12, 2) NOT NULL DEFAULT '0',
  "created_at" timestamp with time zone DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "tenant_reminder_unique"
  ON "tenant_reminder_logs" ("tenant_id", "reminder_type", "due_date", "reminder_date");
CREATE INDEX IF NOT EXISTS "tenant_reminder_tenant_id_idx" ON "tenant_reminder_logs" ("tenant_id");
CREATE INDEX IF NOT EXISTS "tenant_reminder_rent_unit_id_idx" ON "tenant_reminder_logs" ("rent_unit_id");
