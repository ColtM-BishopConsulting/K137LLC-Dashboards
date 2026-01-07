CREATE TABLE IF NOT EXISTS "project_property_taxes" (
  "id" serial PRIMARY KEY,
  "project_id" integer NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "tax_year" integer NOT NULL,
  "due_date" date NOT NULL,
  "amount" numeric(14, 2) NOT NULL,
  "status" varchar(32) NOT NULL DEFAULT 'due',
  "paid_date" date,
  "note" text,
  "created_at" timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "project_property_taxes_project_id_idx" ON "project_property_taxes" ("project_id");
CREATE INDEX IF NOT EXISTS "project_property_taxes_due_date_idx" ON "project_property_taxes" ("due_date");
CREATE INDEX IF NOT EXISTS "project_property_taxes_status_idx" ON "project_property_taxes" ("status");
