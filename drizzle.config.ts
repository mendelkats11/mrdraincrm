import { defineConfig } from "drizzle-kit";

// `drizzle-kit generate` only diffs the schema against previous migration
// snapshots — it does not need a live database connection. `dbCredentials`
// below is only consulted by `drizzle-kit migrate`/`push`, which do need a
// real DATABASE_URL (see src/lib/db/migrate.ts for how migrations are
// applied to a live Neon database once one is connected).
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/lib/db/schema/index.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
});
