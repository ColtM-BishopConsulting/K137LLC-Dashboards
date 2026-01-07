CREATE TABLE IF NOT EXISTS "project_utilities" (
  "id" serial PRIMARY KEY,
  "project_id" integer NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "date" date NOT NULL,
  "service" varchar(128) NOT NULL,
  "provider" varchar(128) DEFAULT '',
  "amount" numeric(14, 2) NOT NULL,
  "note" text,
  "created_at" timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "project_utilities_project_id_idx" ON "project_utilities" ("project_id");
CREATE INDEX IF NOT EXISTS "project_utilities_date_idx" ON "project_utilities" ("date");
