CREATE TABLE IF NOT EXISTS "breakdown_presets" (
  "id" serial PRIMARY KEY,
  "name" varchar(128) NOT NULL,
  "description" text,
  "is_default" boolean NOT NULL DEFAULT false,
  "created_at" timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "breakdown_preset_items" (
  "id" serial PRIMARY KEY,
  "preset_id" integer NOT NULL REFERENCES "breakdown_presets"("id") ON DELETE CASCADE,
  "category_id" integer NOT NULL REFERENCES "cost_categories"("id") ON DELETE CASCADE,
  "sort_order" integer NOT NULL DEFAULT 0,
  "include" boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS "project_breakdown_prefs" (
  "id" serial PRIMARY KEY,
  "project_id" integer NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "preset_id" integer NOT NULL REFERENCES "breakdown_presets"("id") ON DELETE CASCADE,
  "created_at" timestamp with time zone DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "project_breakdown_prefs_unique" ON "project_breakdown_prefs" ("project_id");
CREATE INDEX IF NOT EXISTS "breakdown_preset_items_preset_id_idx" ON "breakdown_preset_items" ("preset_id");

CREATE TABLE IF NOT EXISTS "kpi_presets" (
  "id" serial PRIMARY KEY,
  "name" varchar(128) NOT NULL,
  "description" text,
  "is_default" boolean NOT NULL DEFAULT false,
  "created_at" timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "kpi_preset_items" (
  "id" serial PRIMARY KEY,
  "preset_id" integer NOT NULL REFERENCES "kpi_presets"("id") ON DELETE CASCADE,
  "name" varchar(128) NOT NULL,
  "formula" text NOT NULL,
  "result_type" varchar(32) NOT NULL DEFAULT 'currency',
  "sort_order" integer NOT NULL DEFAULT 0,
  "enabled" boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS "project_kpi_prefs" (
  "id" serial PRIMARY KEY,
  "project_id" integer NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "preset_id" integer NOT NULL REFERENCES "kpi_presets"("id") ON DELETE CASCADE,
  "created_at" timestamp with time zone DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "project_kpi_prefs_unique" ON "project_kpi_prefs" ("project_id");
CREATE INDEX IF NOT EXISTS "kpi_preset_items_preset_id_idx" ON "kpi_preset_items" ("preset_id");

CREATE TABLE IF NOT EXISTS "project_kpi_overrides" (
  "id" serial PRIMARY KEY,
  "project_id" integer NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "item_id" integer NOT NULL REFERENCES "kpi_preset_items"("id") ON DELETE CASCADE,
  "override_value" numeric(14, 2) NOT NULL DEFAULT '0',
  "note" text,
  "created_at" timestamp with time zone DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "project_kpi_overrides_unique" ON "project_kpi_overrides" ("project_id", "item_id");
CREATE INDEX IF NOT EXISTS "project_kpi_overrides_project_id_idx" ON "project_kpi_overrides" ("project_id");
