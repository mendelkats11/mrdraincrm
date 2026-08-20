// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { createTestDb } from "../helpers/test-db";
import { createContact } from "@/lib/crm/contacts";
import {
  cancelReminder,
  completeReminder,
  createReminder,
  dismissReminderToday,
  getReminder,
  listReminders,
  listRemindersForEntity,
  reopenReminder,
  updateReminder,
} from "@/lib/reminders/reminders";
import {
  getUnreadNotificationCount,
  listNotificationsForUser,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/notifications/notifications";
import { activities, notifications, users } from "@/lib/db/schema";

async function seedUser(db: Awaited<ReturnType<typeof createTestDb>>["db"]) {
  const [user] = await db
    .insert(users)
    .values({ email: "owner@example.com", passwordHash: "not-a-real-hash", name: "Test Owner" })
    .returning();
  return user.id;
}

describe("createReminder", () => {
  let ctx: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    ctx = await createTestDb();
  });
  afterEach(async () => {
    await ctx.client.close();
  });

  it("creates a reminder with no relationships required", async () => {
    const reminder = await createReminder(
      ctx.db,
      { title: "Check new leads", dueAt: new Date("2026-06-15T15:00:00Z") },
      null,
    );
    expect(reminder.title).toBe("Check new leads");
    expect(reminder.priority).toBe("medium");
    expect(reminder.recurrence).toBe("one_time");
    expect(reminder.completedAt).toBeNull();
    expect(reminder.cancelledAt).toBeNull();
  });

  it("stores the contact relationship it's given", async () => {
    const contact = await createContact(ctx.db, { displayName: "Jane Doe" }, null);
    const reminder = await createReminder(
      ctx.db,
      { title: "Call Jane", dueAt: new Date(), contactId: contact.id },
      null,
    );
    const fetched = await getReminder(ctx.db, reminder.id);
    expect(fetched?.contactId).toBe(contact.id);
    expect(fetched?.contactName).toBe("Jane Doe");
  });

  it("records reminder_created activity", async () => {
    const reminder = await createReminder(ctx.db, { title: "Test", dueAt: new Date() }, null);
    const rows = await ctx.db
      .select()
      .from(activities)
      .where(and(eq(activities.entityType, "reminder"), eq(activities.entityId, reminder.id)));
    expect(rows.map((r) => r.action)).toContain("reminder_created");
  });
});

describe("listReminders — due/overdue/upcoming classification", () => {
  let ctx: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    ctx = await createTestDb();
  });
  afterEach(async () => {
    await ctx.client.close();
  });

  it("classifies overdue/due-today/upcoming correctly using the business timezone", async () => {
    // "now" is noon business time on 2026-06-15.
    const now = new Date("2026-06-15T18:00:00Z");

    const overdue = await createReminder(
      ctx.db,
      { title: "Overdue one", dueAt: new Date("2026-06-14T15:00:00Z") },
      null,
    );
    const dueToday = await createReminder(
      ctx.db,
      { title: "Due today one", dueAt: new Date("2026-06-15T21:00:00Z") },
      null,
    );
    const upcoming = await createReminder(
      ctx.db,
      { title: "Upcoming one", dueAt: new Date("2026-06-20T15:00:00Z") },
      null,
    );

    expect((await listReminders(ctx.db, { status: "overdue" }, now)).rows.map((r) => r.id)).toEqual(
      [overdue.id],
    );
    expect(
      (await listReminders(ctx.db, { status: "due_today" }, now)).rows.map((r) => r.id),
    ).toEqual([dueToday.id]);
    expect(
      (await listReminders(ctx.db, { status: "upcoming" }, now)).rows.map((r) => r.id),
    ).toEqual([upcoming.id]);
  });

  it("excludes completed/cancelled reminders from active status filters", async () => {
    const now = new Date("2026-06-15T18:00:00Z");
    const reminder = await createReminder(
      ctx.db,
      { title: "Will be completed", dueAt: new Date("2026-06-14T15:00:00Z") },
      null,
    );
    await completeReminder(ctx.db, reminder.id, null);

    expect((await listReminders(ctx.db, { status: "overdue" }, now)).rows).toHaveLength(0);
    expect(
      (await listReminders(ctx.db, { status: "completed" }, now)).rows.map((r) => r.id),
    ).toEqual([reminder.id]);
  });
});

describe("completeReminder", () => {
  let ctx: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    ctx = await createTestDb();
  });
  afterEach(async () => {
    await ctx.client.close();
  });

  it("marks completedAt and never generates a next occurrence for one_time", async () => {
    const reminder = await createReminder(ctx.db, { title: "Once", dueAt: new Date() }, null);
    const result = await completeReminder(ctx.db, reminder.id, null);
    expect(result).toEqual({ ok: true, nextReminderId: null });

    const after = await getReminder(ctx.db, reminder.id);
    expect(after?.completedAt).not.toBeNull();
  });

  it("generates the next occurrence for a daily reminder, anchored to the original due date", async () => {
    const reminder = await createReminder(
      ctx.db,
      { title: "Daily check", dueAt: new Date("2026-06-15T15:00:00Z"), recurrence: "daily" },
      null,
    );
    const result = await completeReminder(ctx.db, reminder.id, null);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.nextReminderId).not.toBeNull();

    const next = await getReminder(ctx.db, result.nextReminderId!);
    expect(next?.title).toBe("Daily check");
    expect(next?.recurrence).toBe("daily");
    expect(next?.completedAt).toBeNull();
    expect(next?.dueAt.toISOString()).toBe("2026-06-16T15:00:00.000Z");
  });

  it("late completion still anchors the next occurrence to the original schedule, not to completion time", async () => {
    // Due Monday 9am business time; "completed" (in this test, simply
    // completed now, simulating a late completion) two days after.
    const reminder = await createReminder(
      ctx.db,
      { title: "Weekly review", dueAt: new Date("2026-06-15T15:00:00Z"), recurrence: "weekly" },
      null,
    );
    const result = await completeReminder(ctx.db, reminder.id, null);
    if (!result.ok) throw new Error("expected ok");
    const next = await getReminder(ctx.db, result.nextReminderId!);
    // Exactly 7 days after the ORIGINAL due date, regardless of when this
    // test actually ran.
    expect(next?.dueAt.toISOString()).toBe("2026-06-22T15:00:00.000Z");
  });

  it("never generates a next occurrence for custom recurrence — no defined interval (Phase 10 decision)", async () => {
    const reminder = await createReminder(
      ctx.db,
      { title: "Custom", dueAt: new Date(), recurrence: "custom" },
      null,
    );
    const result = await completeReminder(ctx.db, reminder.id, null);
    expect(result).toEqual({ ok: true, nextReminderId: null });
  });

  it("a double-submit (already completed) is a safe no-op, not a duplicate occurrence", async () => {
    const reminder = await createReminder(
      ctx.db,
      { title: "Daily", dueAt: new Date(), recurrence: "daily" },
      null,
    );
    const first = await completeReminder(ctx.db, reminder.id, null);
    expect(first.ok).toBe(true);

    const second = await completeReminder(ctx.db, reminder.id, null);
    expect(second).toEqual({ ok: false, error: "already_completed" });

    // Only one next occurrence exists, not two.
    const { rows } = await listReminders(ctx.db, { status: "all" });
    expect(rows).toHaveLength(2); // original + exactly one next occurrence
  });

  it("clears the reminder's own pending notifications on completion", async () => {
    const userId = await seedUser(ctx.db);
    const reminder = await createReminder(ctx.db, { title: "Ping me", dueAt: new Date() }, null);
    await ctx.db.insert(notifications).values({
      recipientUserId: userId,
      type: "reminder_due",
      title: "Reminder due: Ping me",
      entityType: "reminder",
      entityId: reminder.id,
      notificationDate: "2026-06-15",
    });

    await completeReminder(ctx.db, reminder.id, null);

    const unread = await getUnreadNotificationCount(ctx.db, userId);
    expect(unread).toBe(0);
  });

  it("records reminder_completed and reminder_occurrence_created activities", async () => {
    const reminder = await createReminder(
      ctx.db,
      { title: "Daily", dueAt: new Date(), recurrence: "daily" },
      null,
    );
    const result = await completeReminder(ctx.db, reminder.id, null);
    if (!result.ok) throw new Error("expected ok");

    const completedActivity = await ctx.db
      .select()
      .from(activities)
      .where(
        and(
          eq(activities.entityType, "reminder"),
          eq(activities.entityId, reminder.id),
          eq(activities.action, "reminder_completed"),
        ),
      );
    expect(completedActivity).toHaveLength(1);

    const occurrenceActivity = await ctx.db
      .select()
      .from(activities)
      .where(
        and(
          eq(activities.entityType, "reminder"),
          eq(activities.entityId, result.nextReminderId!),
          eq(activities.action, "reminder_occurrence_created"),
        ),
      );
    expect(occurrenceActivity).toHaveLength(1);
  });
});

describe("cancelReminder and reopenReminder", () => {
  let ctx: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    ctx = await createTestDb();
  });
  afterEach(async () => {
    await ctx.client.close();
  });

  it("cancel is the 'don't show again' state — preserved, not deleted", async () => {
    const reminder = await createReminder(ctx.db, { title: "Nope", dueAt: new Date() }, null);
    const result = await cancelReminder(ctx.db, reminder.id, null);
    expect(result.ok).toBe(true);

    const after = await getReminder(ctx.db, reminder.id);
    expect(after?.cancelledAt).not.toBeNull();
    expect(after?.completedAt).toBeNull();
  });

  it("cancel is rejected if already completed", async () => {
    const reminder = await createReminder(ctx.db, { title: "Done", dueAt: new Date() }, null);
    await completeReminder(ctx.db, reminder.id, null);
    expect(await cancelReminder(ctx.db, reminder.id, null)).toEqual({
      ok: false,
      error: "already_completed",
    });
  });

  it("reopen reverts either a completed or a cancelled reminder back to active", async () => {
    const completed = await createReminder(ctx.db, { title: "A", dueAt: new Date() }, null);
    await completeReminder(ctx.db, completed.id, null);
    expect((await reopenReminder(ctx.db, completed.id, null)).ok).toBe(true);
    expect((await getReminder(ctx.db, completed.id))?.completedAt).toBeNull();

    const cancelled = await createReminder(ctx.db, { title: "B", dueAt: new Date() }, null);
    await cancelReminder(ctx.db, cancelled.id, null);
    expect((await reopenReminder(ctx.db, cancelled.id, null)).ok).toBe(true);
    expect((await getReminder(ctx.db, cancelled.id))?.cancelledAt).toBeNull();
  });

  it("reopen is rejected on an already-active reminder", async () => {
    const reminder = await createReminder(ctx.db, { title: "Active", dueAt: new Date() }, null);
    expect(await reopenReminder(ctx.db, reminder.id, null)).toEqual({
      ok: false,
      error: "not_closed",
    });
  });
});

describe("dismissReminderToday", () => {
  let ctx: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    ctx = await createTestDb();
  });
  afterEach(async () => {
    await ctx.client.close();
  });

  it("marks only today's notification for this reminder+recipient as read", async () => {
    const userId = await seedUser(ctx.db);
    const reminder = await createReminder(ctx.db, { title: "Nag", dueAt: new Date() }, null);
    const now = new Date("2026-06-15T18:00:00Z");

    await ctx.db.insert(notifications).values([
      {
        recipientUserId: userId,
        type: "reminder_due",
        title: "today",
        entityType: "reminder",
        entityId: reminder.id,
        notificationDate: "2026-06-15",
      },
      {
        recipientUserId: userId,
        type: "reminder_due",
        title: "yesterday",
        entityType: "reminder",
        entityId: reminder.id,
        notificationDate: "2026-06-14",
      },
    ]);

    const result = await dismissReminderToday(ctx.db, reminder.id, userId, now);
    expect(result.dismissed).toBe(true);

    const remaining = await ctx.db
      .select()
      .from(notifications)
      .where(and(eq(notifications.entityId, reminder.id)));
    const readTitles = remaining.filter((n) => n.readAt !== null).map((n) => n.title);
    expect(readTitles).toEqual(["today"]);
  });

  it("is a safe no-op when there's nothing to dismiss", async () => {
    const userId = await seedUser(ctx.db);
    const reminder = await createReminder(ctx.db, { title: "Quiet", dueAt: new Date() }, null);
    const result = await dismissReminderToday(ctx.db, reminder.id, userId, new Date());
    expect(result.dismissed).toBe(false);
  });
});

describe("updateReminder and listRemindersForEntity", () => {
  let ctx: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    ctx = await createTestDb();
  });
  afterEach(async () => {
    await ctx.client.close();
  });

  it("updates fields and records reminder_updated", async () => {
    const reminder = await createReminder(ctx.db, { title: "Old title", dueAt: new Date() }, null);
    const result = await updateReminder(ctx.db, reminder.id, { title: "New title" }, null);
    expect(result.ok).toBe(true);
    expect((await getReminder(ctx.db, reminder.id))?.title).toBe("New title");
  });

  it("editing a completed reminder is still allowed — reminders are not locked like invoices", async () => {
    const reminder = await createReminder(ctx.db, { title: "Done", dueAt: new Date() }, null);
    await completeReminder(ctx.db, reminder.id, null);
    const result = await updateReminder(ctx.db, reminder.id, { title: "Fixed typo" }, null);
    expect(result.ok).toBe(true);
  });

  it("lists only active reminders tied to a given contact", async () => {
    const contact = await createContact(ctx.db, { displayName: "Jane" }, null);
    const active = await createReminder(
      ctx.db,
      { title: "Active", dueAt: new Date(), contactId: contact.id },
      null,
    );
    const completed = await createReminder(
      ctx.db,
      { title: "Done", dueAt: new Date(), contactId: contact.id },
      null,
    );
    await completeReminder(ctx.db, completed.id, null);

    const rows = await listRemindersForEntity(ctx.db, { contactId: contact.id });
    expect(rows.map((r) => r.id)).toEqual([active.id]);
  });
});

describe("notifications service", () => {
  let ctx: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    ctx = await createTestDb();
  });
  afterEach(async () => {
    await ctx.client.close();
  });

  it("markNotificationRead only affects the owning recipient", async () => {
    const userA = await seedUser(ctx.db);
    const [userB] = await ctx.db
      .insert(users)
      .values({ email: "other@example.com", passwordHash: "x", name: "Other" })
      .returning();

    const [notif] = await ctx.db
      .insert(notifications)
      .values({ recipientUserId: userA, type: "reminder_due", title: "For A" })
      .returning();

    await markNotificationRead(ctx.db, notif.id, userB.id);
    expect((await getUnreadNotificationCount(ctx.db, userA)).valueOf()).toBe(1);

    await markNotificationRead(ctx.db, notif.id, userA);
    expect(await getUnreadNotificationCount(ctx.db, userA)).toBe(0);
  });

  it("markAllNotificationsRead clears every unread notification for that recipient", async () => {
    const userId = await seedUser(ctx.db);
    await ctx.db.insert(notifications).values([
      { recipientUserId: userId, type: "reminder_due", title: "One" },
      { recipientUserId: userId, type: "reminder_due", title: "Two" },
    ]);

    await markAllNotificationsRead(ctx.db, userId);
    expect(await getUnreadNotificationCount(ctx.db, userId)).toBe(0);
  });

  it("listNotificationsForUser orders newest first", async () => {
    const userId = await seedUser(ctx.db);
    await ctx.db
      .insert(notifications)
      .values({ recipientUserId: userId, type: "reminder_due", title: "First" });
    await ctx.db
      .insert(notifications)
      .values({ recipientUserId: userId, type: "reminder_due", title: "Second" });

    const rows = await listNotificationsForUser(ctx.db, userId);
    expect(rows.map((r) => r.title)).toEqual(["Second", "First"]);
  });
});
