CREATE TABLE IF NOT EXISTS "project_debt_service" (
  "id" serial PRIMARY KEY,
  "project_id" integer NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "bank" varchar(128) NOT NULL,
  "balance" numeric(14, 2) NOT NULL DEFAULT '0',
  "payment" numeric(14, 2) NOT NULL DEFAULT '0',
  "interest_rate" numeric(6, 3) NOT NULL DEFAULT '0',
  "rate_type" varchar(16) NOT NULL DEFAULT 'fixed',
  "rate_adjust_date" date,
  "maturity_date" date,
  "note" text,
  "created_at" timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "project_debt_service_project_id_idx" ON "project_debt_service" ("project_id");
