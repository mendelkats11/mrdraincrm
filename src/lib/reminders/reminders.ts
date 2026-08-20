import { and, asc, eq, gte, isNull, lt, or, sql } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import {
  contacts,
  jobs,
  notifications,
  organizations,
  properties,
  reminders,
} from "@/lib/db/schema";
import { recordActivity } from "@/lib/audit/activity";
import { computeNextOccurrence } from "./recurrence";
import {
  addBusinessDays,
  BUSINESS_TIMEZONE,
  businessDateString,
  startOfBusinessDay,
} from "./timezone";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db<TQueryResult extends PgQueryResultHKT> = PgDatabase<TQueryResult, any, any>;

export type ReminderPriority = "low" | "medium" | "high";
export type ReminderRecurrence = "one_time" | "daily" | "weekly" | "monthly" | "yearly" | "custom";

export interface CreateReminderInput {
  title: string;
  description?: string | null;
  dueAt: Date;
  priority?: ReminderPriority;
  contactId?: string | null;
  organizationId?: string | null;
  propertyId?: string | null;
  jobId?: string | null;
  recurrence?: ReminderRecurrence;
}

/**
 * Reminders may be created without any relationship at all — same
 * optional-everywhere philosophy as jobs (docs/CLAUDE.md §6) — and match
 * docs/PROJECT_SPEC.md §17's exact relationship list: contact/organization/
 * property/job only, no lead/invoice/quote/contractor (Phase 10 decision 1).
 */
export async function createReminder<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  input: CreateReminderInput,
  actorUserId: string | null,
) {
  return db.transaction(async (tx) => {
    const [reminder] = await tx
      .insert(reminders)
      .values({
        title: input.title,
        description: input.description || null,
        dueAt: input.dueAt,
        priority: input.priority ?? "medium",
        contactId: input.contactId || null,
        organizationId: input.organizationId || null,
        propertyId: input.propertyId || null,
        jobId: input.jobId || null,
        recurrence: input.recurrence ?? "one_time",
      })
      .returning();

    await recordActivity(tx, {
      actorUserId,
      entityType: "reminder",
      entityId: reminder.id,
      action: "reminder_created",
      newValue: { title: reminder.title, dueAt: reminder.dueAt.toISOString() },
    });

    return reminder;
  });
}

export async function getReminder<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  id: string,
) {
  const [row] = await db
    .select({
      reminder: reminders,
      contactName: contacts.displayName,
      organizationName: organizations.name,
      propertyAddressLine1: properties.addressLine1,
      propertyCity: properties.city,
      jobNumber: jobs.jobNumber,
    })
    .from(reminders)
    .leftJoin(contacts, eq(reminders.contactId, contacts.id))
    .leftJoin(organizations, eq(reminders.organizationId, organizations.id))
    .leftJoin(properties, eq(reminders.propertyId, properties.id))
    .leftJoin(jobs, eq(reminders.jobId, jobs.id))
    .where(eq(reminders.id, id));
  if (!row) return null;

  return {
    ...row.reminder,
    contactName: row.contactName,
    organizationName: row.organizationName,
    propertyAddressLine1: row.propertyAddressLine1,
    propertyCity: row.propertyCity,
    jobNumber: row.jobNumber,
  };
}

export type ReminderStatusFilter =
  "active" | "overdue" | "due_today" | "upcoming" | "completed" | "cancelled" | "all";

export interface ListRemindersFilters {
  status?: ReminderStatusFilter;
  recurrence?: ReminderRecurrence | "all";
  page?: number;
  pageSize?: number;
}

function statusCondition(status: ReminderStatusFilter | undefined, now: Date) {
  const today = businessDateString(now, BUSINESS_TIMEZONE);
  const startOfToday = startOfBusinessDay(today, BUSINESS_TIMEZONE);
  const startOfTomorrow = startOfBusinessDay(addBusinessDays(today, 1), BUSINESS_TIMEZONE);

  const active = and(isNull(reminders.completedAt), isNull(reminders.cancelledAt));

  switch (status) {
    case "overdue":
      return and(active, lt(reminders.dueAt, startOfToday));
    case "due_today":
      return and(active, gte(reminders.dueAt, startOfToday), lt(reminders.dueAt, startOfTomorrow));
    case "upcoming":
      return and(active, gte(reminders.dueAt, startOfTomorrow));
    case "completed":
      return sql`${reminders.completedAt} is not null`;
    case "cancelled":
      return sql`${reminders.cancelledAt} is not null`;
    case "all":
      return undefined;
    case "active":
    default:
      return active;
  }
}

export async function listReminders<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  filters: ListRemindersFilters = {},
  now: Date = new Date(),
) {
  const page = filters.page && filters.page > 0 ? filters.page : 1;
  const pageSize = filters.pageSize && filters.pageSize > 0 ? filters.pageSize : 25;

  const conditions = [];
  const status = statusCondition(filters.status, now);
  if (status) conditions.push(status);
  if (filters.recurrence && filters.recurrence !== "all") {
    conditions.push(eq(reminders.recurrence, filters.recurrence));
  }
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const rows = await db
    .select({
      id: reminders.id,
      title: reminders.title,
      description: reminders.description,
      dueAt: reminders.dueAt,
      priority: reminders.priority,
      recurrence: reminders.recurrence,
      completedAt: reminders.completedAt,
      cancelledAt: reminders.cancelledAt,
      contactName: contacts.displayName,
      organizationName: organizations.name,
      propertyAddressLine1: properties.addressLine1,
      jobNumber: jobs.jobNumber,
    })
    .from(reminders)
    .leftJoin(contacts, eq(reminders.contactId, contacts.id))
    .leftJoin(organizations, eq(reminders.organizationId, organizations.id))
    .leftJoin(properties, eq(reminders.propertyId, properties.id))
    .leftJoin(jobs, eq(reminders.jobId, jobs.id))
    .where(where)
    .orderBy(asc(reminders.dueAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(reminders)
    .where(where);

  return { rows, total: count, page, pageSize };
}

/** Active reminders tied to a specific contact/organization/property/job — for the small "Reminders" card on those detail pages. */
export async function listRemindersForEntity<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  entity: { contactId?: string; organizationId?: string; propertyId?: string; jobId?: string },
) {
  const conditions = [];
  if (entity.contactId) conditions.push(eq(reminders.contactId, entity.contactId));
  if (entity.organizationId) conditions.push(eq(reminders.organizationId, entity.organizationId));
  if (entity.propertyId) conditions.push(eq(reminders.propertyId, entity.propertyId));
  if (entity.jobId) conditions.push(eq(reminders.jobId, entity.jobId));
  if (conditions.length === 0) return [];

  return db
    .select()
    .from(reminders)
    .where(and(or(...conditions), isNull(reminders.completedAt), isNull(reminders.cancelledAt)))
    .orderBy(asc(reminders.dueAt));
}

export interface UpdateReminderInput {
  title?: string;
  description?: string | null;
  dueAt?: Date;
  priority?: ReminderPriority;
  contactId?: string | null;
  organizationId?: string | null;
  propertyId?: string | null;
  jobId?: string | null;
  recurrence?: ReminderRecurrence;
}

export type ReminderMutationResult = { ok: true } | { ok: false; error: "not_found" };

/**
 * Reminders aren't customer-facing documents that get "locked" once sent
 * (unlike invoices/quotes) — there's no reason a completed reminder's title
 * typo can't be fixed, so editing isn't gated on active/completed state.
 */
export async function updateReminder<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  id: string,
  input: UpdateReminderInput,
  actorUserId: string | null,
): Promise<ReminderMutationResult> {
  return db.transaction(async (tx) => {
    const [before] = await tx.select().from(reminders).where(eq(reminders.id, id));
    if (!before) return { ok: false, error: "not_found" };

    await tx
      .update(reminders)
      .set({
        title: input.title ?? undefined,
        description: input.description !== undefined ? input.description || null : undefined,
        dueAt: input.dueAt ?? undefined,
        priority: input.priority ?? undefined,
        contactId: input.contactId !== undefined ? input.contactId || null : undefined,
        organizationId:
          input.organizationId !== undefined ? input.organizationId || null : undefined,
        propertyId: input.propertyId !== undefined ? input.propertyId || null : undefined,
        jobId: input.jobId !== undefined ? input.jobId || null : undefined,
        recurrence: input.recurrence ?? undefined,
      })
      .where(eq(reminders.id, id));

    await recordActivity(tx, {
      actorUserId,
      entityType: "reminder",
      entityId: id,
      action: "reminder_updated",
      oldValue: { title: before.title, dueAt: before.dueAt.toISOString() },
      newValue: {
        title: input.title ?? before.title,
        dueAt: (input.dueAt ?? before.dueAt).toISOString(),
      },
    });

    return { ok: true };
  });
}

export type CompleteReminderResult =
  | { ok: true; nextReminderId: string | null }
  | { ok: false; error: "not_found" | "already_completed" | "already_cancelled" };

/**
 * Atomically guarded on completedAt/cancelledAt both being null — a
 * double-submit (double click, retry) affects 0 rows the second time and
 * does nothing further, matching the sequence-allocation/invoice-status
 * concurrency-safety pattern used throughout this codebase.
 *
 * "custom" recurrence has no defined interval (Phase 10 decision 2) and is
 * treated the same as one_time here — completing it never fabricates a
 * next occurrence.
 */
export async function completeReminder<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  id: string,
  actorUserId: string | null,
): Promise<CompleteReminderResult> {
  return db.transaction(async (tx) => {
    const [updated] = await tx
      .update(reminders)
      .set({ completedAt: new Date() })
      .where(
        and(eq(reminders.id, id), isNull(reminders.completedAt), isNull(reminders.cancelledAt)),
      )
      .returning();

    if (!updated) {
      const [existing] = await tx.select().from(reminders).where(eq(reminders.id, id));
      if (!existing) return { ok: false, error: "not_found" };
      return { ok: false, error: existing.completedAt ? "already_completed" : "already_cancelled" };
    }

    await tx
      .update(notifications)
      .set({ readAt: new Date() })
      .where(
        and(
          eq(notifications.entityType, "reminder"),
          eq(notifications.entityId, id),
          isNull(notifications.readAt),
        ),
      );

    await recordActivity(tx, {
      actorUserId,
      entityType: "reminder",
      entityId: id,
      action: "reminder_completed",
    });

    let nextReminderId: string | null = null;
    const nextDueAt = computeNextOccurrence(updated.dueAt, updated.recurrence);
    if (nextDueAt) {
      const [next] = await tx
        .insert(reminders)
        .values({
          title: updated.title,
          description: updated.description,
          dueAt: nextDueAt,
          priority: updated.priority,
          contactId: updated.contactId,
          organizationId: updated.organizationId,
          propertyId: updated.propertyId,
          jobId: updated.jobId,
          recurrence: updated.recurrence,
        })
        .returning();
      nextReminderId = next.id;

      await recordActivity(tx, {
        actorUserId,
        entityType: "reminder",
        entityId: next.id,
        action: "reminder_occurrence_created",
        newValue: { title: next.title, dueAt: next.dueAt.toISOString() },
        metadata: { previousReminderId: id },
      });
    }

    return { ok: true, nextReminderId };
  });
}

export type CancelReminderResult =
  { ok: true } | { ok: false; error: "not_found" | "already_completed" | "already_cancelled" };

/** "Don't show again" — Phase 10 decision. Preserved in history, never hard-deleted. */
export async function cancelReminder<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  id: string,
  actorUserId: string | null,
): Promise<CancelReminderResult> {
  return db.transaction(async (tx) => {
    const [updated] = await tx
      .update(reminders)
      .set({ cancelledAt: new Date() })
      .where(
        and(eq(reminders.id, id), isNull(reminders.completedAt), isNull(reminders.cancelledAt)),
      )
      .returning();

    if (!updated) {
      const [existing] = await tx.select().from(reminders).where(eq(reminders.id, id));
      if (!existing) return { ok: false, error: "not_found" };
      return { ok: false, error: existing.completedAt ? "already_completed" : "already_cancelled" };
    }

    await tx
      .update(notifications)
      .set({ readAt: new Date() })
      .where(
        and(
          eq(notifications.entityType, "reminder"),
          eq(notifications.entityId, id),
          isNull(notifications.readAt),
        ),
      );

    await recordActivity(tx, {
      actorUserId,
      entityType: "reminder",
      entityId: id,
      action: "reminder_cancelled",
    });

    return { ok: true };
  });
}

export type ReopenReminderResult = { ok: true } | { ok: false; error: "not_found" | "not_closed" };

/** Undoes a Complete or a "Don't show again" — the record was never deleted, so this is a plain state revert. */
export async function reopenReminder<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  id: string,
  actorUserId: string | null,
): Promise<ReopenReminderResult> {
  return db.transaction(async (tx) => {
    const [reminder] = await tx.select().from(reminders).where(eq(reminders.id, id));
    if (!reminder) return { ok: false, error: "not_found" };
    if (!reminder.completedAt && !reminder.cancelledAt) return { ok: false, error: "not_closed" };

    await tx
      .update(reminders)
      .set({ completedAt: null, cancelledAt: null })
      .where(eq(reminders.id, id));

    await recordActivity(tx, {
      actorUserId,
      entityType: "reminder",
      entityId: id,
      action: "reminder_reopened",
    });

    return { ok: true };
  });
}

/**
 * "Dismiss" clears *today's* notification only (Phase 10 decision) — the
 * reminder itself is untouched, and if it's still active and overdue
 * tomorrow the scheduled function creates a fresh notification then. Scoped
 * to the acting user's own notification, not every recipient's.
 */
export async function dismissReminderToday<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  reminderId: string,
  actorUserId: string,
  now: Date = new Date(),
): Promise<{ dismissed: boolean }> {
  const today = businessDateString(now, BUSINESS_TIMEZONE);
  const result = await db
    .update(notifications)
    .set({ readAt: now })
    .where(
      and(
        eq(notifications.entityType, "reminder"),
        eq(notifications.entityId, reminderId),
        eq(notifications.recipientUserId, actorUserId),
        eq(notifications.notificationDate, today),
        isNull(notifications.readAt),
      ),
    )
    .returning({ id: notifications.id });

  return { dismissed: result.length > 0 };
}
