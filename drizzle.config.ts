const config = {
  driver: "pg",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    connectionString: process.env.DATABASE_URL!,
  },
};

export default config;
