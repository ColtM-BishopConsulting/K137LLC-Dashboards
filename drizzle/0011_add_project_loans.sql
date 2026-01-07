CREATE TABLE IF NOT EXISTS "project_loans" (
  "id" serial PRIMARY KEY,
  "project_id" integer NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "date" date NOT NULL,
  "payment" numeric(14, 2) NOT NULL,
  "interest" numeric(14, 2) DEFAULT '0',
  "principal" numeric(14, 2) DEFAULT '0',
  "balance" numeric(14, 2),
  "note" text,
  "created_at" timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "project_loans_project_id_idx" ON "project_loans" ("project_id");
CREATE INDEX IF NOT EXISTS "project_loans_date_idx" ON "project_loans" ("date");
