// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { and, eq } from "drizzle-orm";
import { createTestDb } from "../helpers/test-db";
import { createReminder, getReminder } from "@/lib/reminders/reminders";
import { processReminders } from "@/lib/reminders/scheduler";
import { appSettings, emailEvents, notifications, users } from "@/lib/db/schema";
import * as emailModule from "@/lib/email";

async function seedUser(
  db: Awaited<ReturnType<typeof createTestDb>>["db"],
  overrides: { email?: string; disabledAt?: Date | null } = {},
) {
  const [user] = await db
    .insert(users)
    .values({
      email: overrides.email ?? "owner@example.com",
      passwordHash: "not-a-real-hash",
      name: "Test Owner",
      disabledAt: overrides.disabledAt ?? null,
    })
    .returning();
  return user.id;
}

describe("processReminders", () => {
  let ctx: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    ctx = await createTestDb();
  });
  afterEach(async () => {
    await ctx.client.close();
    vi.restoreAllMocks();
  });

  it("creates a notification for a due, active reminder", async () => {
    const userId = await seedUser(ctx.db);
    const reminder = await createReminder(
      ctx.db,
      { title: "Call customer", dueAt: new Date("2026-06-15T14:00:00Z") },
      null,
    );

    const result = await processReminders(ctx.db, new Date("2026-06-15T15:00:00Z"));
    expect(result.dueReminderCount).toBe(1);
    expect(result.notificationsCreated).toBe(1);

    const rows = await ctx.db
      .select()
      .from(notifications)
      .where(
        and(eq(notifications.recipientUserId, userId), eq(notifications.entityId, reminder.id)),
      );
    expect(rows).toHaveLength(1);
    expect(rows[0].type).toBe("reminder_due");
  });

  it("does not notify for a reminder that isn't due yet", async () => {
    await createReminder(
      ctx.db,
      { title: "Future", dueAt: new Date("2026-06-20T14:00:00Z") },
      null,
    );
    const result = await processReminders(ctx.db, new Date("2026-06-15T15:00:00Z"));
    expect(result.dueReminderCount).toBe(0);
    expect(result.notificationsCreated).toBe(0);
  });

  it("does not notify for a completed or cancelled reminder even if overdue", async () => {
    const { completeReminder, cancelReminder } = await import("@/lib/reminders/reminders");
    const completed = await createReminder(
      ctx.db,
      { title: "Done already", dueAt: new Date("2026-06-14T14:00:00Z") },
      null,
    );
    await completeReminder(ctx.db, completed.id, null);
    const cancelled = await createReminder(
      ctx.db,
      { title: "Hidden already", dueAt: new Date("2026-06-14T14:00:00Z") },
      null,
    );
    await cancelReminder(ctx.db, cancelled.id, null);

    const result = await processReminders(ctx.db, new Date("2026-06-15T15:00:00Z"));
    expect(result.dueReminderCount).toBe(0);
  });

  it("running it twice back-to-back creates exactly one notification, not two — the core idempotency guarantee", async () => {
    await seedUser(ctx.db);
    const reminder = await createReminder(
      ctx.db,
      { title: "Idempotency check", dueAt: new Date("2026-06-15T14:00:00Z") },
      null,
    );
    const now = new Date("2026-06-15T15:00:00Z");

    const first = await processReminders(ctx.db, now);
    const second = await processReminders(ctx.db, now);

    expect(first.notificationsCreated).toBe(1);
    expect(second.notificationsCreated).toBe(0); // ON CONFLICT DO NOTHING

    const rows = await ctx.db
      .select()
      .from(notifications)
      .where(eq(notifications.entityId, reminder.id));
    expect(rows).toHaveLength(1);
  });

  it("an overdue reminder still uncompleted the next day gets a fresh notification (daily renotification)", async () => {
    await seedUser(ctx.db);
    const reminder = await createReminder(
      ctx.db,
      { title: "Nagging one", dueAt: new Date("2026-06-14T14:00:00Z") },
      null,
    );

    await processReminders(ctx.db, new Date("2026-06-15T15:00:00Z"));
    const nextDay = await processReminders(ctx.db, new Date("2026-06-16T15:00:00Z"));
    expect(nextDay.notificationsCreated).toBe(1); // a new day, a new dedupe key

    const rows = await ctx.db
      .select()
      .from(notifications)
      .where(eq(notifications.entityId, reminder.id));
    expect(rows).toHaveLength(2);
    expect(new Set(rows.map((r) => r.notificationDate))).toEqual(
      new Set(["2026-06-15", "2026-06-16"]),
    );
  });

  it("only notifies active (non-disabled) users", async () => {
    const activeUserId = await seedUser(ctx.db, { email: "active@example.com" });
    await seedUser(ctx.db, { email: "disabled@example.com", disabledAt: new Date() });
    const reminder = await createReminder(
      ctx.db,
      { title: "Broadcast", dueAt: new Date("2026-06-15T14:00:00Z") },
      null,
    );

    await processReminders(ctx.db, new Date("2026-06-15T15:00:00Z"));

    const rows = await ctx.db
      .select()
      .from(notifications)
      .where(eq(notifications.entityId, reminder.id));
    expect(rows.map((r) => r.recipientUserId)).toEqual([activeUserId]);
  });

  it("sends an email and logs a sent emailEvents row when enabled and a notification address is set", async () => {
    await seedUser(ctx.db);
    await ctx.db
      .insert(appSettings)
      .values({ reminderEmailNotificationsEnabled: true, notificationEmail: "office@example.com" });
    const reminder = await createReminder(
      ctx.db,
      { title: "Email me", dueAt: new Date("2026-06-15T14:00:00Z") },
      null,
    );

    const sendSpy = vi.spyOn(emailModule.getEmailProvider(), "send").mockResolvedValue(undefined);
    const result = await processReminders(ctx.db, new Date("2026-06-15T15:00:00Z"));

    expect(sendSpy).toHaveBeenCalledTimes(1);
    expect(result.emailsSent).toBe(1);

    const events = await ctx.db
      .select()
      .from(emailEvents)
      .where(eq(emailEvents.relatedEntityId, reminder.id));
    expect(events).toHaveLength(1);
    expect(events[0].status).toBe("sent");
  });

  it("does not send an email when reminderEmailNotificationsEnabled is false", async () => {
    await seedUser(ctx.db);
    await ctx.db.insert(appSettings).values({
      reminderEmailNotificationsEnabled: false,
      notificationEmail: "office@example.com",
    });
    await createReminder(
      ctx.db,
      { title: "No email", dueAt: new Date("2026-06-15T14:00:00Z") },
      null,
    );

    const sendSpy = vi.spyOn(emailModule.getEmailProvider(), "send").mockResolvedValue(undefined);
    const result = await processReminders(ctx.db, new Date("2026-06-15T15:00:00Z"));

    expect(sendSpy).not.toHaveBeenCalled();
    expect(result.emailsSent).toBe(0);
  });

  it("does not send an email a second run — only the run that actually creates the notification sends", async () => {
    await seedUser(ctx.db);
    await ctx.db
      .insert(appSettings)
      .values({ reminderEmailNotificationsEnabled: true, notificationEmail: "office@example.com" });
    await createReminder(ctx.db, { title: "Once", dueAt: new Date("2026-06-15T14:00:00Z") }, null);

    const sendSpy = vi.spyOn(emailModule.getEmailProvider(), "send").mockResolvedValue(undefined);
    const now = new Date("2026-06-15T15:00:00Z");
    await processReminders(ctx.db, now);
    await processReminders(ctx.db, now);

    expect(sendSpy).toHaveBeenCalledTimes(1);
  });

  it("a failing email provider logs a failed emailEvents row but doesn't stop other reminders from processing", async () => {
    const userId = await seedUser(ctx.db);
    await ctx.db
      .insert(appSettings)
      .values({ reminderEmailNotificationsEnabled: true, notificationEmail: "office@example.com" });
    const failing = await createReminder(
      ctx.db,
      { title: "Fails", dueAt: new Date("2026-06-15T14:00:00Z") },
      null,
    );
    const succeeding = await createReminder(
      ctx.db,
      { title: "Succeeds", dueAt: new Date("2026-06-15T14:00:00Z") },
      null,
    );

    const sendSpy = vi
      .spyOn(emailModule.getEmailProvider(), "send")
      .mockImplementationOnce(() => Promise.reject(new Error("provider down")))
      .mockImplementationOnce(() => Promise.resolve());

    const result = await processReminders(ctx.db, new Date("2026-06-15T15:00:00Z"));

    expect(result.emailsSent).toBe(1);
    expect(result.emailsFailed).toBe(1);
    expect(sendSpy).toHaveBeenCalledTimes(2);

    // Both reminders still got their in-app notification regardless of the
    // email outcome — a failed email must never roll back the notification.
    const failingNotif = await ctx.db
      .select()
      .from(notifications)
      .where(
        and(eq(notifications.entityId, failing.id), eq(notifications.recipientUserId, userId)),
      );
    expect(failingNotif).toHaveLength(1);
    const succeedingNotif = await ctx.db
      .select()
      .from(notifications)
      .where(
        and(eq(notifications.entityId, succeeding.id), eq(notifications.recipientUserId, userId)),
      );
    expect(succeedingNotif).toHaveLength(1);

    const events = await ctx.db.select().from(emailEvents);
    const statuses = events.map((e) => e.status).sort();
    expect(statuses).toEqual(["failed", "sent"]);
  });

  it("does not send an email when no notification email is configured", async () => {
    await seedUser(ctx.db);
    await ctx.db.insert(appSettings).values({ reminderEmailNotificationsEnabled: true });
    await createReminder(
      ctx.db,
      { title: "No address", dueAt: new Date("2026-06-15T14:00:00Z") },
      null,
    );

    const sendSpy = vi.spyOn(emailModule.getEmailProvider(), "send").mockResolvedValue(undefined);
    await processReminders(ctx.db, new Date("2026-06-15T15:00:00Z"));

    expect(sendSpy).not.toHaveBeenCalled();
  });
});

describe("processReminders — recurrence is untouched by the scheduler", () => {
  let ctx: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    ctx = await createTestDb();
  });
  afterEach(async () => {
    await ctx.client.close();
  });

  it("never auto-generates a next occurrence — that only happens via completeReminder", async () => {
    await seedUser(ctx.db);
    const reminder = await createReminder(
      ctx.db,
      { title: "Daily", dueAt: new Date("2026-06-14T14:00:00Z"), recurrence: "daily" },
      null,
    );

    await processReminders(ctx.db, new Date("2026-06-15T15:00:00Z"));
    await processReminders(ctx.db, new Date("2026-06-16T15:00:00Z"));

    const stillOnlyOne = await getReminder(ctx.db, reminder.id);
    expect(stillOnlyOne).not.toBeNull();
    // No second reminders row was ever inserted by the scheduler.
    const { rows } = await import("@/lib/reminders/reminders").then((m) =>
      m.listReminders(ctx.db, { status: "all" }),
    );
    expect(rows).toHaveLength(1);
  });
});
