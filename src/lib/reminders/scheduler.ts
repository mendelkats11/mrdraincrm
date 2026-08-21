import { and, isNull, lte } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { appSettings, notifications, reminders, users } from "@/lib/db/schema";
import { sendTrackedEmail } from "@/lib/email/send-tracked-email";
import { businessDateString } from "./timezone";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db<TQueryResult extends PgQueryResultHKT> = PgDatabase<TQueryResult, any, any>;

export interface ProcessRemindersResult {
  dueReminderCount: number;
  notificationsCreated: number;
  emailsSent: number;
  emailsFailed: number;
}

/**
 * The core logic behind the scheduled function (netlify/functions/
 * process-reminders.mts) — kept as a plain function, not tied to the
 * Netlify Functions runtime, so it can be called directly from integration
 * tests against PGlite and, if ever needed, from an authenticated manual
 * "run now" trigger.
 *
 * Idempotency (Phase 10's core requirement) comes entirely from the
 * database: each (recipient, reminder, "reminder_due", today) combination
 * is protected by a partial unique index on `notifications`
 * (notifications_reminder_dedupe_idx). A concurrent or retried run's
 * INSERT ... ON CONFLICT DO NOTHING simply inserts 0 rows for anything
 * already processed today — there is no separate "already processed" flag
 * to get out of sync with reality.
 *
 * Deliberately NOT wrapped in one big transaction: each reminder's
 * notification-then-email step is independent, so a slow/failing email
 * provider on one reminder can't block or roll back processing of the
 * others (see the "failure scenarios" testing requirement).
 */
export async function processReminders<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  now: Date = new Date(),
): Promise<ProcessRemindersResult> {
  const today = businessDateString(now);

  const [settings] = await db.select().from(appSettings).limit(1);
  const activeUsers = await db.select({ id: users.id }).from(users).where(isNull(users.disabledAt));

  const dueReminders = await db
    .select()
    .from(reminders)
    .where(
      and(isNull(reminders.completedAt), isNull(reminders.cancelledAt), lte(reminders.dueAt, now)),
    );

  let notificationsCreated = 0;
  let emailsSent = 0;
  let emailsFailed = 0;

  for (const reminder of dueReminders) {
    let anyNewForThisReminder = false;

    for (const user of activeUsers) {
      const inserted = await db
        .insert(notifications)
        .values({
          recipientUserId: user.id,
          type: "reminder_due",
          title: `Reminder due: ${reminder.title}`,
          body: reminder.description,
          entityType: "reminder",
          entityId: reminder.id,
          notificationDate: today,
        })
        .onConflictDoNothing()
        .returning({ id: notifications.id });

      if (inserted.length > 0) {
        notificationsCreated += 1;
        anyNewForThisReminder = true;
      }
    }

    // Only send an email the run that actually created a new notification —
    // a duplicate run that inserted 0 rows above correctly sends nothing.
    if (
      anyNewForThisReminder &&
      settings?.reminderEmailNotificationsEnabled &&
      settings?.notificationEmail
    ) {
      const result = await sendTrackedEmail(db, {
        to: settings.notificationEmail,
        subject: `Reminder due: ${reminder.title}`,
        text: reminder.description
          ? `${reminder.title}\n\n${reminder.description}`
          : reminder.title,
        template: "reminder_due",
        relatedEntityType: "reminder",
        relatedEntityId: reminder.id,
      });
      if (result.ok) {
        emailsSent += 1;
      } else {
        emailsFailed += 1;
      }
    }
  }

  return {
    dueReminderCount: dueReminders.length,
    notificationsCreated,
    emailsSent,
    emailsFailed,
  };
}
