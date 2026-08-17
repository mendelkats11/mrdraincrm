import { and, desc, eq } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { activities, users } from "@/lib/db/schema";

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

export interface TimelineEntry {
  id: string;
  actorUserId: string | null;
  actorName: string | null;
  entityType: string;
  entityId: string;
  action: string;
  oldValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null | undefined;
  createdAt: Date;
}

/**
 * Reads one entity's activity history, most recent first, with the actor's
 * name resolved (null actor = system-generated, or — as of Phase 2's
 * account cleanup — an actor whose user row no longer exists).
 */
export async function getEntityTimeline<TQueryResult extends PgQueryResultHKT>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: PgDatabase<TQueryResult, any, any>,
  entityType: string,
  entityId: string,
  limit = 50,
): Promise<TimelineEntry[]> {
  const rows = await db
    .select({
      id: activities.id,
      actorUserId: activities.actorUserId,
      actorName: users.name,
      entityType: activities.entityType,
      entityId: activities.entityId,
      action: activities.action,
      oldValue: activities.oldValue,
      newValue: activities.newValue,
      metadata: activities.metadata,
      createdAt: activities.createdAt,
    })
    .from(activities)
    .leftJoin(users, eq(activities.actorUserId, users.id))
    .where(and(eq(activities.entityType, entityType), eq(activities.entityId, entityId)))
    .orderBy(desc(activities.createdAt))
    .limit(limit);

  return rows;
}
