CREATE TABLE IF NOT EXISTS "formulas" (
  "id" serial PRIMARY KEY,
  "project_id" integer NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "name" varchar(255) NOT NULL,
  "formula" text NOT NULL,
  "description" text,
  "result_type" varchar(32) DEFAULT 'currency' NOT NULL,
  "created_at" timestamptz DEFAULT now(),
  "updated_at" timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "formulas_project_id_idx" ON "formulas" ("project_id");
