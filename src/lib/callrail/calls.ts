import { and, desc, eq, isNull, sql } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import {
  calls,
  contactPhones,
  contacts,
  jobs,
  messages,
  serviceAreas,
  webhookLog,
} from "@/lib/db/schema";
import { recordActivity } from "@/lib/audit/activity";
import { createContact } from "@/lib/crm/contacts";
import { createLead } from "@/lib/crm/leads";
import { normalizePhone, formatPhoneForDisplay } from "@/lib/phone";
import { notifyActiveUsers } from "@/lib/notifications/notifications";
import { parseCallWebhookPayload, parseMessageWebhookPayload } from "./webhook";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db<TQueryResult extends PgQueryResultHKT> = PgDatabase<TQueryResult, any, any>;

const CALLRAIL_PROVIDER = "callrail";

/**
 * Idempotency gate shared by both webhook processors — insert into
 * webhook_log first, keyed on CallRail's own event ID with a unique
 * constraint; ON CONFLICT DO NOTHING means a redelivered webhook inserts 0
 * rows and processing stops there, satisfying "duplicate webhooks are
 * safely ignored" (docs/ROADMAP.md Phase 13) independent of anything below
 * it. Mirrors the exact pattern docs/ARCHITECTURE.md §15 and the
 * webhook_log schema comment already describe.
 */
async function claimWebhookEvent<TQueryResult extends PgQueryResultHKT>(
  tx: Db<TQueryResult>,
  externalEventId: string,
  payload: Record<string, unknown>,
): Promise<boolean> {
  const inserted = await tx
    .insert(webhookLog)
    .values({ provider: CALLRAIL_PROVIDER, externalEventId, payload })
    .onConflictDoNothing()
    .returning({ id: webhookLog.id });
  return inserted.length > 0;
}

export type ProcessWebhookResult =
  | { ok: true; duplicate: false; callId: string }
  | { ok: true; duplicate: true }
  | { ok: false; error: "unparseable_payload" };

/**
 * Unknown callers never automatically become contacts (docs/CLAUDE.md §6,
 * docs/PROJECT_SPEC.md §16.2) — this only ever matches against existing
 * contact_phones, never creates one.
 */
export async function processCallWebhook<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  payload: Record<string, unknown>,
): Promise<ProcessWebhookResult> {
  const parsed = parseCallWebhookPayload(payload);
  if (!parsed) return { ok: false, error: "unparseable_payload" };

  return db.transaction(async (tx) => {
    const claimed = await claimWebhookEvent(tx, parsed.callrailCallId, payload);
    if (!claimed) return { ok: true, duplicate: true };

    const normalized = normalizePhone(parsed.callerNumber);
    let contactId: string | null = null;
    if (normalized) {
      const [match] = await tx
        .select({ contactId: contactPhones.contactId })
        .from(contactPhones)
        .where(eq(contactPhones.phoneNormalized, normalized.normalized));
      contactId = match?.contactId ?? null;
    }

    const [serviceArea] = await tx
      .select({ id: serviceAreas.id })
      .from(serviceAreas)
      .where(eq(serviceAreas.callrailTrackingNumber, parsed.trackingNumber));

    const [call] = await tx
      .insert(calls)
      .values({
        callrailCallId: parsed.callrailCallId,
        callerNumber: parsed.callerNumber,
        callerNumberNormalized: normalized?.normalized ?? parsed.callerNumber.replace(/\D/g, ""),
        trackingNumber: parsed.trackingNumber,
        serviceAreaId: serviceArea?.id ?? null,
        contactId,
        matched: contactId !== null,
        answered: parsed.answered,
        durationSeconds: parsed.durationSeconds,
        occurredAt: parsed.occurredAt,
        sourceMetadata: payload,
      })
      .returning();

    await recordActivity(tx, {
      entityType: "call",
      entityId: call.id,
      action: "call_received",
      newValue: { matched: call.matched, answered: call.answered },
    });

    await notifyActiveUsers(tx, {
      type: "callrail_call",
      title: `${call.answered ? "Call" : "Missed call"} from ${normalized ? formatPhoneForDisplay(normalized.e164) : call.callerNumber}`,
      entityType: "call",
      entityId: call.id,
    });

    return { ok: true, duplicate: false, callId: call.id };
  });
}

export async function processMessageWebhook<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  payload: Record<string, unknown>,
): Promise<ProcessWebhookResult> {
  const parsed = parseMessageWebhookPayload(payload);
  if (!parsed) return { ok: false, error: "unparseable_payload" };

  return db.transaction(async (tx) => {
    const claimed = await claimWebhookEvent(tx, parsed.callrailMessageId, payload);
    if (!claimed) return { ok: true, duplicate: true };

    const normalized = normalizePhone(parsed.phoneNumber);
    let contactId: string | null = null;
    if (normalized) {
      const [match] = await tx
        .select({ contactId: contactPhones.contactId })
        .from(contactPhones)
        .where(eq(contactPhones.phoneNormalized, normalized.normalized));
      contactId = match?.contactId ?? null;
    }

    const [message] = await tx
      .insert(messages)
      .values({
        callrailMessageId: parsed.callrailMessageId,
        phoneNumber: parsed.phoneNumber,
        phoneNumberNormalized: normalized?.normalized ?? parsed.phoneNumber.replace(/\D/g, ""),
        contactId,
        trackingNumber: parsed.trackingNumber,
        body: parsed.body,
        mediaUrls: parsed.mediaUrls,
        occurredAt: parsed.occurredAt,
      })
      .returning();

    await recordActivity(tx, {
      entityType: "message",
      entityId: message.id,
      action: "message_received",
      newValue: { matched: contactId !== null },
    });

    await notifyActiveUsers(tx, {
      type: "incoming_text",
      title: `New text from ${normalized ? formatPhoneForDisplay(normalized.e164) : message.phoneNumber}`,
      body: message.body,
      entityType: "message",
      entityId: message.id,
    });

    return { ok: true, duplicate: false, callId: message.id };
  });
}

export interface ListCallsFilters {
  status?: "unmatched" | "matched" | "ignored" | "all";
  page?: number;
  pageSize?: number;
}

export async function listCalls<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  filters: ListCallsFilters = {},
) {
  const page = filters.page && filters.page > 0 ? filters.page : 1;
  const pageSize = filters.pageSize && filters.pageSize > 0 ? filters.pageSize : 25;

  const conditions = [];
  switch (filters.status) {
    case "unmatched":
      conditions.push(and(eq(calls.matched, false), eq(calls.ignored, false)));
      break;
    case "matched":
      conditions.push(eq(calls.matched, true));
      break;
    case "ignored":
      conditions.push(eq(calls.ignored, true));
      break;
    default:
      break;
  }
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const rows = await db
    .select({
      id: calls.id,
      callerNumber: calls.callerNumber,
      trackingNumber: calls.trackingNumber,
      answered: calls.answered,
      durationSeconds: calls.durationSeconds,
      occurredAt: calls.occurredAt,
      matched: calls.matched,
      ignored: calls.ignored,
      contactName: contacts.displayName,
      serviceAreaName: serviceAreas.name,
    })
    .from(calls)
    .leftJoin(contacts, eq(calls.contactId, contacts.id))
    .leftJoin(serviceAreas, eq(calls.serviceAreaId, serviceAreas.id))
    .where(where)
    .orderBy(desc(calls.occurredAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(calls)
    .where(where);

  return { rows, total: count, page, pageSize };
}

export async function getCall<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  id: string,
) {
  const [row] = await db
    .select({
      call: calls,
      contactName: contacts.displayName,
      serviceAreaName: serviceAreas.name,
    })
    .from(calls)
    .leftJoin(contacts, eq(calls.contactId, contacts.id))
    .leftJoin(serviceAreas, eq(calls.serviceAreaId, serviceAreas.id))
    .where(eq(calls.id, id));
  if (!row) return null;
  return { ...row.call, contactName: row.contactName, serviceAreaName: row.serviceAreaName };
}

/** Previous jobs for a matched caller's contact — docs/PROJECT_SPEC.md §16.3. */
export async function listJobsForContact<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  contactId: string,
) {
  return db
    .select({ id: jobs.id, jobNumber: jobs.jobNumber, status: jobs.status })
    .from(jobs)
    .where(eq(jobs.contactId, contactId))
    .orderBy(desc(jobs.createdAt));
}

export type IgnoreCallResult = { ok: true } | { ok: false; error: "not_found" };

export async function ignoreCall<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  callId: string,
  actorUserId: string | null,
): Promise<IgnoreCallResult> {
  return db.transaction(async (tx) => {
    const [call] = await tx.select().from(calls).where(eq(calls.id, callId));
    if (!call) return { ok: false, error: "not_found" };

    await tx.update(calls).set({ ignored: true }).where(eq(calls.id, callId));
    await recordActivity(tx, {
      actorUserId,
      entityType: "call",
      entityId: callId,
      action: "call_ignored",
    });
    return { ok: true };
  });
}

/** Associates every unmatched historical call/message from this number with the contact — docs/PROJECT_SPEC.md §16.2. */
async function matchHistoricalRecords<TQueryResult extends PgQueryResultHKT>(
  tx: Db<TQueryResult>,
  phoneNormalized: string,
  contactId: string,
) {
  await tx
    .update(calls)
    .set({ contactId, matched: true })
    .where(and(eq(calls.callerNumberNormalized, phoneNormalized), isNull(calls.contactId)));
  await tx
    .update(messages)
    .set({ contactId })
    .where(and(eq(messages.phoneNumberNormalized, phoneNormalized), isNull(messages.contactId)));
}

export interface CreateContactFromCallInput {
  displayName: string;
}

export type CreateContactFromCallResult =
  { ok: true; contactId: string } | { ok: false; error: "not_found" | "unparseable_phone" };

export async function createContactFromCall<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  callId: string,
  input: CreateContactFromCallInput,
  actorUserId: string | null,
): Promise<CreateContactFromCallResult> {
  return db.transaction(async (tx) => {
    const [call] = await tx.select().from(calls).where(eq(calls.id, callId));
    if (!call) return { ok: false, error: "not_found" };

    const phone = normalizePhone(call.callerNumber);
    if (!phone) return { ok: false, error: "unparseable_phone" };

    const contact = await createContact(
      tx,
      { displayName: input.displayName, phone, source: "CallRail call" },
      actorUserId,
    );

    await matchHistoricalRecords(tx, phone.normalized, contact.id);

    return { ok: true, contactId: contact.id };
  });
}

export interface CreateLeadFromCallInput {
  displayName: string;
  issueDescription?: string | null;
  emergency?: boolean;
}

export type CreateLeadFromCallResult =
  | { ok: true; leadId: string; contactId: string }
  | { ok: false; error: "not_found" | "unparseable_phone" };

/** Creates a minimal contact (matching the caller's number) plus a lead linked to it — same "inline contact creation" pattern already used elsewhere in this app. */
export async function createLeadFromCall<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  callId: string,
  input: CreateLeadFromCallInput,
  actorUserId: string | null,
): Promise<CreateLeadFromCallResult> {
  return db.transaction(async (tx) => {
    const [call] = await tx.select().from(calls).where(eq(calls.id, callId));
    if (!call) return { ok: false, error: "not_found" };

    const phone = normalizePhone(call.callerNumber);
    if (!phone) return { ok: false, error: "unparseable_phone" };

    const contact = await createContact(
      tx,
      { displayName: input.displayName, phone, source: "CallRail call" },
      actorUserId,
    );
    await matchHistoricalRecords(tx, phone.normalized, contact.id);

    const lead = await createLead(
      tx,
      {
        contactId: contact.id,
        issueDescription: input.issueDescription,
        emergency: input.emergency,
        source: "CallRail call",
      },
      actorUserId,
    );

    return { ok: true, leadId: lead.id, contactId: contact.id };
  });
}

export interface ListMessagesFilters {
  page?: number;
  pageSize?: number;
}

export async function listMessages<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  filters: ListMessagesFilters = {},
) {
  const page = filters.page && filters.page > 0 ? filters.page : 1;
  const pageSize = filters.pageSize && filters.pageSize > 0 ? filters.pageSize : 25;

  const rows = await db
    .select({
      id: messages.id,
      phoneNumber: messages.phoneNumber,
      body: messages.body,
      occurredAt: messages.occurredAt,
      contactName: contacts.displayName,
    })
    .from(messages)
    .leftJoin(contacts, eq(messages.contactId, contacts.id))
    .orderBy(desc(messages.occurredAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(messages);

  return { rows, total: count, page, pageSize };
}
