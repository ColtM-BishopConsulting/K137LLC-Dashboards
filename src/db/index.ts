import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const connectionString =
  process.env.DATABASE_URL ??
  process.env.POSTGRES_URL ??
  process.env.POSTGRES_PRISMA_URL ??
  "";

if (!connectionString) {
  throw new Error("Missing DATABASE_URL/POSTGRES_URL for database connection.");
}

const pool = new Pool({ connectionString });

export const db = drizzle(pool, { schema });
export * from "./schema";
