CREATE TABLE IF NOT EXISTS "users" (
  "id" serial PRIMARY KEY,
  "email" varchar(255) NOT NULL UNIQUE,
  "name" varchar(255) NOT NULL,
  "role" varchar(32) NOT NULL DEFAULT 'viewer',
  "password_hash" text NOT NULL,
  "created_at" timestamptz DEFAULT now()
);
