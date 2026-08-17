import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool } from "@neondatabase/serverless";
import * as schema from "./schema";

// WebSocket-based Neon driver, not neon-http. Phase 3's service layer
// relies on db.transaction() to keep a mutation and its audit-log row
// atomic (docs/ARCHITECTURE.md §16 — "the log can never drift out of sync
// with the record"); neon-http is a stateless single-query HTTP interface
// and does not support transactions at all ("No transactions support in
// neon-http driver"), discovered via the Phase 3 E2E run. neon-serverless's
// Pool still suits short-lived serverless functions per Neon's own
// guidance — it's WebSocket-based, not a traditional long-lived pool.
function createDb() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env.local and fill it in " +
        "(see docs/IMPLEMENTATION_PLAN.md §5 for how to get a free Neon connection string).",
    );
  }
  const pool = new Pool({ connectionString: url });
  return drizzle(pool, { schema });
}

let cached: ReturnType<typeof createDb> | undefined;

// Lazy singleton: importing this module must not throw just because
// DATABASE_URL isn't set yet (e.g. during a build or in tests that use a
// different driver) — the error only surfaces when a query actually runs.
export function getDb() {
  if (!cached) {
    cached = createDb();
  }
  return cached;
}

export type Database = ReturnType<typeof createDb>;
