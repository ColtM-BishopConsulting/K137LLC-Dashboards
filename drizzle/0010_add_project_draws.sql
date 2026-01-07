CREATE TABLE IF NOT EXISTS "project_draws" (
  "id" serial PRIMARY KEY,
  "project_id" integer NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "date" date NOT NULL,
  "description" varchar(255) NOT NULL,
  "amount" numeric(14, 2) NOT NULL,
  "note" text,
  "created_at" timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "project_draws_project_id_idx" ON "project_draws" ("project_id");
CREATE INDEX IF NOT EXISTS "project_draws_date_idx" ON "project_draws" ("date");
