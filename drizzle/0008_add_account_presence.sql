ALTER TABLE IF EXISTS "users"
  ADD COLUMN IF NOT EXISTS "avatar_url" text;

CREATE TABLE IF NOT EXISTS "dashboard_presence" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "session_id" varchar(64) NOT NULL,
  "last_seen" timestamptz DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "dashboard_presence_user_session_idx"
  ON "dashboard_presence" ("user_id", "session_id");

CREATE INDEX IF NOT EXISTS "dashboard_presence_last_seen_idx"
  ON "dashboard_presence" ("last_seen");
