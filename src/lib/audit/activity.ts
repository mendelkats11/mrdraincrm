import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { activities } from "@/lib/db/schema";

export interface RecordActivityInput {
  /** Null for system-generated events (e.g. a CallRail webhook). */
  actorUserId?: string | null;
  entityType: string;
  entityId: string;
  action: string;
  oldValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
  metadata?: Record<string, unknown>;
}

/**
 * Appends one row to the audit/activity log. Callers making a meaningful
 * mutation (financial value changes, status changes, attachments, etc. —
 * see docs/PROJECT_SPEC.md §28) should call this inside the same
 * `db.transaction(...)` as the mutation itself, so the log can never drift
 * out of sync with the record it describes — docs/ARCHITECTURE.md §16.
 * Pass the transaction object in place of `db`.
 *
 * Typed against the driver-agnostic `PgDatabase` base — see the equivalent
 * note in src/lib/sequences/allocate.ts.
 */
export async function recordActivity<TQueryResult extends PgQueryResultHKT>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: PgDatabase<TQueryResult, any, any>,
  input: RecordActivityInput,
): Promise<void> {
  await db.insert(activities).values({
    actorUserId: input.actorUserId ?? null,
    entityType: input.entityType,
    entityId: input.entityId,
    action: input.action,
    oldValue: input.oldValue ?? null,
    newValue: input.newValue ?? null,
    metadata: input.metadata,
  });
}
