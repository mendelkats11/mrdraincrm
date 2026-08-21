import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { emailEvents } from "@/lib/db/schema";
import { getEmailProvider } from "./index";
import type { SendEmailInput } from "./provider";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db<TQueryResult extends PgQueryResultHKT> = PgDatabase<TQueryResult, any, any>;

export interface TrackedEmailInput extends SendEmailInput {
  /** Identifies which template/kind of email this is (e.g. "invoice",
   *  "quote", "job_confirmation", "lead_notification") — recorded on the
   *  email_events row, not the subject/body itself. */
  template: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
}

export type SendTrackedEmailResult = { ok: true } | { ok: false; error: unknown };

/**
 * The single choke point every email send in the app should go through —
 * every send is recorded to `email_events` (to, template, related entity,
 * sent/failed), regardless of outcome, so there's one place to see
 * everything the app has ever emailed. Mirrors the try/log-then-record
 * pattern already established for reminder-due emails
 * (src/lib/reminders/scheduler.ts), generalized so every other email type
 * doesn't duplicate it. Only to/template/status/entity are stored — never
 * the subject or body (docs/ARCHITECTURE.md §13's "without storing
 * unnecessary sensitive content").
 */
export async function sendTrackedEmail<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  input: TrackedEmailInput,
): Promise<SendTrackedEmailResult> {
  const toEmail = Array.isArray(input.to) ? input.to.join(", ") : input.to;

  try {
    await getEmailProvider().send(input);
    await db.insert(emailEvents).values({
      toEmail,
      template: input.template,
      relatedEntityType: input.relatedEntityType ?? null,
      relatedEntityId: input.relatedEntityId ?? null,
      status: "sent",
    });
    return { ok: true };
  } catch (error) {
    console.error(`Email send failed (template=${input.template}, to=${toEmail}):`, error);
    await db.insert(emailEvents).values({
      toEmail,
      template: input.template,
      relatedEntityType: input.relatedEntityType ?? null,
      relatedEntityId: input.relatedEntityId ?? null,
      status: "failed",
    });
    return { ok: false, error };
  }
}
