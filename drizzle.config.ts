import { defineConfig } from "drizzle-kit";

export default defineConfig({
  driver: "pg",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    connectionString: process.env.DATABASE_URL!,
  },
});
