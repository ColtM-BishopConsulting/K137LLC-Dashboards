CREATE TABLE IF NOT EXISTS "project_acquisitions" (
  "id" serial PRIMARY KEY,
  "project_id" integer NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "purchase_price" numeric(14, 2) DEFAULT '0',
  "acquisition_draw" numeric(14, 2) DEFAULT '0',
  "earnest_money" numeric(14, 2) DEFAULT '0',
  "close_date" date,
  "note" text,
  "created_at" timestamp with time zone DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "project_acquisitions_project_id_idx" ON "project_acquisitions" ("project_id");

CREATE TABLE IF NOT EXISTS "project_closing_costs" (
  "id" serial PRIMARY KEY,
  "project_id" integer NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "side" varchar(16) NOT NULL,
  "code" varchar(64),
  "label" varchar(128) NOT NULL,
  "amount" numeric(14, 2) NOT NULL DEFAULT '0',
  "paid" boolean NOT NULL DEFAULT false,
  "paid_date" date,
  "note" text,
  "created_at" timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "project_closing_costs_project_id_idx" ON "project_closing_costs" ("project_id");
CREATE INDEX IF NOT EXISTS "project_closing_costs_side_idx" ON "project_closing_costs" ("side");
