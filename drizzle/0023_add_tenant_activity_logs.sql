CREATE TABLE IF NOT EXISTS "tenant_activity_logs" (
  "id" serial PRIMARY KEY,
  "tenant_id" integer NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "rent_unit_id" integer NOT NULL REFERENCES "rent_units"("id") ON DELETE CASCADE,
  "statement_id" varchar(128),
  "event_type" varchar(32) NOT NULL,
  "metadata" jsonb,
  "created_at" timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "tenant_activity_logs_tenant_id_idx" ON "tenant_activity_logs" ("tenant_id");
CREATE INDEX IF NOT EXISTS "tenant_activity_logs_rent_unit_id_idx" ON "tenant_activity_logs" ("rent_unit_id");
CREATE INDEX IF NOT EXISTS "tenant_activity_logs_statement_id_idx" ON "tenant_activity_logs" ("statement_id");
