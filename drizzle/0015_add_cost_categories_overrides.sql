CREATE TABLE IF NOT EXISTS "cost_categories" (
  "id" serial PRIMARY KEY,
  "name" varchar(128) NOT NULL,
  "code" varchar(64),
  "created_at" timestamp with time zone DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "cost_categories_name_idx" ON "cost_categories" ("name");

CREATE TABLE IF NOT EXISTS "project_cost_overrides" (
  "id" serial PRIMARY KEY,
  "project_id" integer NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "category_id" integer NOT NULL REFERENCES "cost_categories"("id") ON DELETE CASCADE,
  "amount" numeric(14, 2) NOT NULL DEFAULT '0',
  "note" text,
  "created_at" timestamp with time zone DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "project_cost_overrides_unique" ON "project_cost_overrides" ("project_id", "category_id");
CREATE INDEX IF NOT EXISTS "project_cost_overrides_project_id_idx" ON "project_cost_overrides" ("project_id");
