import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";

// HTTP-based Neon driver — no persistent TCP connection, which is what
// makes this safe to call from short-lived Netlify Functions. See
// docs/IMPLEMENTATION_PLAN.md §5 for why Neon direct (not Netlify's own DB
// product) and why this driver over node-postgres.
function createDb() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env.local and fill it in " +
        "(see docs/IMPLEMENTATION_PLAN.md §5 for how to get a free Neon connection string).",
    );
  }
  const sql = neon(url);
  return drizzle(sql, { schema });
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
