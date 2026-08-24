import { and, asc, desc, eq, isNotNull, isNull, sql } from "drizzle-orm";
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
 * Matches a call's tracking number to a configured service area by
 * normalized phone number, not a raw string comparison — the Service Area
 * settings screen accepts the CallRail tracking number as free text (e.g.
 * "(306) 555-0142"), while CallRail's own API/webhook payloads always send
 * E.164 (e.g. "+13065550142"); an exact-string eq() between the two would
 * never match even for the identical real number. Fetches every configured
 * service area rather than a single indexed lookup — a small, bounded list
 * for any real business, so normalizing in application code costs nothing
 * meaningful and avoids needing a second normalized-tracking-number column.
 */
export async function matchServiceAreaByTrackingNumber<TQueryResult extends PgQueryResultHKT>(
  tx: Db<TQueryResult>,
  trackingNumber: string,
): Promise<string | null> {
  const target = normalizePhone(trackingNumber);
  if (!target) return null;

  const areas = await tx
    .select({ id: serviceAreas.id, callrailTrackingNumber: serviceAreas.callrailTrackingNumber })
    .from(serviceAreas)
    .where(isNotNull(serviceAreas.callrailTrackingNumber));

  for (const area of areas) {
    if (!area.callrailTrackingNumber) continue;
    const candidate = normalizePhone(area.callrailTrackingNumber);
    if (candidate && candidate.normalized === target.normalized) return area.id;
  }
  return null;
}

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

    const serviceAreaId = await matchServiceAreaByTrackingNumber(tx, parsed.trackingNumber);

    const [call] = await tx
      .insert(calls)
      .values({
        callrailCallId: parsed.callrailCallId,
        callerNumber: parsed.callerNumber,
        callerNumberNormalized: normalized?.normalized ?? parsed.callerNumber.replace(/\D/g, ""),
        trackingNumber: parsed.trackingNumber,
        serviceAreaId,
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
  serviceAreaId?: string;
  answered?: "yes" | "no";
  sort?: "newest" | "oldest" | "longest" | "shortest";
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
  if (filters.serviceAreaId) {
    conditions.push(eq(calls.serviceAreaId, filters.serviceAreaId));
  }
  if (filters.answered) {
    conditions.push(eq(calls.answered, filters.answered === "yes"));
  }
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const orderBy = (() => {
    switch (filters.sort) {
      case "oldest":
        return asc(calls.occurredAt);
      case "longest":
        return desc(calls.durationSeconds);
      case "shortest":
        return asc(calls.durationSeconds);
      default:
        return desc(calls.occurredAt);
    }
  })();

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
    .orderBy(orderBy)
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

export interface ListMessageThreadsFilters {
  page?: number;
  pageSize?: number;
}

export interface MessageThreadRow {
  phoneNumber: string;
  phoneNumberNormalized: string;
  contactId: string | null;
  contactName: string | null;
  lastBody: string | null;
  lastOccurredAt: Date;
}

/**
 * Chat-app-style grouping: one row per distinct sender, most-recently-
 * active thread first — someone who texted a month ago and texts again
 * today is the same conversation, not two unrelated rows (docs: message
 * layout redesign). Uses Postgres DISTINCT ON (Drizzle's selectDistinctOn)
 * to pick each number's latest message; that forces the base query's
 * ORDER BY to start with the grouping column, so the "most recently
 * active thread first" ordering the UI actually wants is applied in an
 * outer query over that as a subquery.
 */
export async function listMessageThreads<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  filters: ListMessageThreadsFilters = {},
): Promise<{ rows: MessageThreadRow[]; total: number; page: number; pageSize: number }> {
  const page = filters.page && filters.page > 0 ? filters.page : 1;
  const pageSize = filters.pageSize && filters.pageSize > 0 ? filters.pageSize : 25;

  const latestPerThread = db
    .selectDistinctOn([messages.phoneNumberNormalized], {
      phoneNumber: messages.phoneNumber,
      phoneNumberNormalized: messages.phoneNumberNormalized,
      contactId: messages.contactId,
      body: messages.body,
      occurredAt: messages.occurredAt,
    })
    .from(messages)
    .orderBy(messages.phoneNumberNormalized, desc(messages.occurredAt))
    .as("latest_per_thread");

  const rows = await db
    .select({
      phoneNumber: latestPerThread.phoneNumber,
      phoneNumberNormalized: latestPerThread.phoneNumberNormalized,
      contactId: latestPerThread.contactId,
      contactName: contacts.displayName,
      lastBody: latestPerThread.body,
      lastOccurredAt: latestPerThread.occurredAt,
    })
    .from(latestPerThread)
    .leftJoin(contacts, eq(latestPerThread.contactId, contacts.id))
    .orderBy(desc(latestPerThread.occurredAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  const [{ count }] = await db
    .select({ count: sql<number>`count(distinct ${messages.phoneNumberNormalized})::int` })
    .from(messages);

  return { rows, total: count, page, pageSize };
}

/** Full history for one sender, oldest first (chat reading order) — the thread detail view behind listMessageThreads above. */
export async function listMessagesForThread<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  phoneNumberNormalized: string,
) {
  return db
    .select()
    .from(messages)
    .where(eq(messages.phoneNumberNormalized, phoneNumberNormalized))
    .orderBy(asc(messages.occurredAt));
}
