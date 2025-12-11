CREATE TABLE IF NOT EXISTS "commits" (
  "id" serial PRIMARY KEY,
  "serial" varchar(64) NOT NULL UNIQUE,
  "description" text,
  "tags" text[],
  "status" varchar(32) NOT NULL DEFAULT 'pending',
  "author_id" integer REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" timestamptz DEFAULT now(),
  "updated_at" timestamptz DEFAULT now(),
  "applied_at" timestamptz
);

CREATE TABLE IF NOT EXISTS "commit_changes" (
  "id" serial PRIMARY KEY,
  "commit_id" integer NOT NULL REFERENCES "commits"("id") ON DELETE CASCADE,
  "entity" varchar(64) NOT NULL,
  "entity_id" integer,
  "operation" varchar(32) NOT NULL,
  "before" jsonb,
  "after" jsonb,
  "impact" text
);
