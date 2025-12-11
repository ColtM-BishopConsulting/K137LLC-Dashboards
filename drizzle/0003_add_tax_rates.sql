CREATE TABLE IF NOT EXISTS "tax_rates" (
  "id" serial PRIMARY KEY,
  "county" varchar(255) NOT NULL,
  "state" varchar(64),
  "rate" numeric(6,3) NOT NULL,
  "note" text,
  "created_at" timestamptz DEFAULT now(),
  "updated_at" timestamptz DEFAULT now()
);
