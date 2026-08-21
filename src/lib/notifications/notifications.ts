import { and, desc, eq, isNull, sql } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { notifications, users } from "@/lib/db/schema";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db<TQueryResult extends PgQueryResultHKT> = PgDatabase<TQueryResult, any, any>;

export interface NewNotificationInput {
  type: string;
  title: string;
  body?: string | null;
  entityType?: string | null;
  entityId?: string | null;
}

/**
 * Fans a dashboard notification out to every active (non-disabled) user —
 * same "every active user" recipient set the reminders scheduler already
 * uses (src/lib/reminders/scheduler.ts). Used for the event types
 * docs/PROJECT_SPEC.md §24 lists that aren't reminder-driven: new quote
 * request, CallRail call, incoming text, emergency request. Unlike
 * reminders, these have no per-day dedup key — each is a one-off event
 * that only ever fires once (a webhook fires once per call/text; a lead
 * is only ever created once), so there's no risk of duplicate spam the
 * way a recurring overdue reminder has.
 */
export async function notifyActiveUsers<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  input: NewNotificationInput,
): Promise<void> {
  const activeUsers = await db.select({ id: users.id }).from(users).where(isNull(users.disabledAt));
  if (activeUsers.length === 0) return;

  await db.insert(notifications).values(
    activeUsers.map((user) => ({
      recipientUserId: user.id,
      type: input.type,
      title: input.title,
      body: input.body ?? null,
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null,
    })),
  );
}

export async function listNotificationsForUser<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  recipientUserId: string,
  limit = 20,
) {
  return db
    .select()
    .from(notifications)
    .where(eq(notifications.recipientUserId, recipientUserId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
}

export async function getUnreadNotificationCount<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  recipientUserId: string,
) {
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(notifications)
    .where(and(eq(notifications.recipientUserId, recipientUserId), isNull(notifications.readAt)));
  return count;
}

/** Scoped to the acting user — one recipient can never mark another recipient's notification read. */
export async function markNotificationRead<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  notificationId: string,
  recipientUserId: string,
) {
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(notifications.id, notificationId),
        eq(notifications.recipientUserId, recipientUserId),
        isNull(notifications.readAt),
      ),
    );
}

export async function markAllNotificationsRead<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  recipientUserId: string,
) {
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.recipientUserId, recipientUserId), isNull(notifications.readAt)));
}
