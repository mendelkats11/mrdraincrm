import { and, desc, eq, isNull, sql } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { notifications } from "@/lib/db/schema";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db<TQueryResult extends PgQueryResultHKT> = PgDatabase<TQueryResult, any, any>;

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
