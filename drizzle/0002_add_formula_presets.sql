CREATE TABLE IF NOT EXISTS "formula_presets" (
  "id" serial PRIMARY KEY,
  "name" varchar(255) NOT NULL,
  "formula" text NOT NULL,
  "description" text,
  "result_type" varchar(32) DEFAULT 'currency' NOT NULL,
  "created_at" timestamptz DEFAULT now(),
  "updated_at" timestamptz DEFAULT now()
);
