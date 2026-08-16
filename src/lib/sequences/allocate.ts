import { eq, sql } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { sequences } from "@/lib/db/schema";

export type SequenceName = "job" | "invoice" | "quote";

/**
 * Atomically allocates the next number for a sequence and returns it
 * formatted (e.g. "JOB-0001"). A single UPDATE...RETURNING statement is
 * inherently safe under concurrent callers — Postgres's row-level locking
 * serializes concurrent updates to the same row, so no explicit
 * transaction or SELECT...FOR UPDATE is needed here. See
 * docs/IMPLEMENTATION_PLAN.md §6.4 and §7.
 *
 * Callers that need the allocation to roll back together with a related
 * insert (e.g. creating the job itself) should call this from within their
 * own `db.transaction(...)` block, passing the transaction object in place
 * of `db`.
 *
 * Typed against the driver-agnostic `PgDatabase` base (not the concrete
 * Neon HTTP client type) so the same function works against the
 * production Neon database and the PGlite instance used in tests — their
 * query-result generics differ, but both extend `PgDatabase`.
 */
export async function allocateSequenceNumber<TQueryResult extends PgQueryResultHKT>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: PgDatabase<TQueryResult, any, any>,
  name: SequenceName,
): Promise<string> {
  const [row] = await db
    .update(sequences)
    .set({
      nextNumber: sql`${sequences.nextNumber} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(sequences.name, name))
    .returning({
      // RETURNING reflects the post-increment row; the number allocated to
      // this caller is one less than that.
      allocatedNumber: sql<number>`${sequences.nextNumber} - 1`,
      prefix: sequences.prefix,
      minDigits: sequences.minDigits,
    });

  if (!row) {
    throw new Error(`Unknown sequence "${name}" — has it been seeded?`);
  }

  return formatSequenceNumber(row.prefix, row.allocatedNumber, row.minDigits);
}

export function formatSequenceNumber(prefix: string, n: number, minDigits: number): string {
  return `${prefix}${String(n).padStart(minDigits, "0")}`;
}
