import { PGlite } from "@electric-sql/pglite";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import * as schema from "@/lib/db/schema";

/**
 * Spins up a fresh, in-process, real-Postgres-semantics database (PGlite)
 * and applies the exact same SQL migration files used for production
 * (Neon). This is what lets Phase 1 verify migrations/constraints/sequence
 * allocation without needing live Neon credentials — see
 * docs/IMPLEMENTATION_PLAN.md Phase 1 checklist. Every call returns an
 * isolated instance; callers should create one per test (or per test file)
 * and close it afterwards.
 */
export async function createTestDb() {
  const client = new PGlite({ extensions: { pg_trgm } });
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: "./drizzle" });
  return { db, client };
}
