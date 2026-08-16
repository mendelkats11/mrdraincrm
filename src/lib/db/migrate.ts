import { drizzle } from "drizzle-orm/neon-http";
import { migrate } from "drizzle-orm/neon-http/migrator";
import { neon } from "@neondatabase/serverless";

// Applies the SQL files in drizzle/ to whatever DATABASE_URL points at.
// Run with: npm run db:migrate
// Requires a real Postgres connection (e.g. Neon) — see .env.example.
async function main() {
  try {
    process.loadEnvFile(".env.local");
  } catch {
    // No .env.local present — fall through to the missing-DATABASE_URL
    // error below, which is a clearer message than a raw ENOENT.
  }

  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set. Copy .env.example to .env.local first.");
  }
  const db = drizzle(neon(url));
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("Migrations applied successfully.");
}

main().catch((error: unknown) => {
  console.error("Migration failed:", error);
  process.exit(1);
});
