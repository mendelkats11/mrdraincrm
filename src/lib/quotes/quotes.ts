import { and, asc, desc, eq, ilike, or, sql } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import {
  appSettings,
  contacts,
  jobs,
  organizations,
  properties,
  quoteCustomCharges,
  quoteLineItems,
  quotes,
} from "@/lib/db/schema";
import { recordActivity } from "@/lib/audit/activity";
import { allocateSequenceNumber } from "@/lib/sequences/allocate";
import { calculateLineTotalCents } from "@/lib/money";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db<TQueryResult extends PgQueryResultHKT> = PgDatabase<TQueryResult, any, any>;

export type QuoteStatus = "draft" | "sent" | "accepted" | "declined" | "expired" | "cancelled";

export interface CreateQuoteInput {
  contactId?: string | null;
  propertyId?: string | null;
  organizationId?: string | null;
  description?: string | null;
  notes?: string | null;
  expiresAt?: Date | null;
  taxCents?: number;
}

/**
 * Unlike invoices, quotes have no jobId and no snapshotted business/customer
 * text fields — docs/PROJECT_SPEC.md §14 ties a quote to contact/property/
 * organization via live FKs only. A quote may be created without any of
 * them, same as jobs (docs/CLAUDE.md §6's "may be created without a
 * contact" philosophy extended by analogy — nothing here requires one).
 */
export async function createQuote<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  input: CreateQuoteInput,
  actorUserId: string | null,
) {
  return db.transaction(async (tx) => {
    const quoteNumber = await allocateSequenceNumber(tx, "quote");
    const taxCents = input.taxCents ?? 0;

    const [quote] = await tx
      .insert(quotes)
      .values({
        quoteNumber,
        contactId: input.contactId || null,
        propertyId: input.propertyId || null,
        organizationId: input.organizationId || null,
        status: "draft",
        description: input.description || null,
        subtotalCents: 0,
        taxCents,
        notes: input.notes || null,
        expiresAt: input.expiresAt ?? null,
      })
      .returning();

    await recordActivity(tx, {
      actorUserId,
      entityType: "quote",
      entityId: quote.id,
      action: "quote_created",
      newValue: { quoteNumber: quote.quoteNumber },
    });

    return quote;
  });
}

export interface QuoteLineItemRow {
  id: string;
  description: string;
  quantity: string;
  unitPriceCents: number;
  lineTotalCents: number;
  sortOrder: number;
}

export interface QuoteCustomChargeRow {
  id: string;
  description: string;
  amountCents: number;
  createdAt: Date;
}

/**
 * Business/customer display info is resolved live via joins (contact name,
 * organization name, property address) rather than read from a stored
 * snapshot — quotes have no snapshot columns, unlike invoices. This means a
 * later correction to a contact's name is reflected on an existing quote;
 * that's an accepted consequence of the existing schema, not something this
 * function works around.
 */
export async function getQuote<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  quoteId: string,
) {
  const [row] = await db
    .select({
      quote: quotes,
      contactName: contacts.displayName,
      organizationName: organizations.name,
      propertyAddressLine1: properties.addressLine1,
      propertyCity: properties.city,
      convertedJobNumber: jobs.jobNumber,
    })
    .from(quotes)
    .leftJoin(contacts, eq(quotes.contactId, contacts.id))
    .leftJoin(organizations, eq(quotes.organizationId, organizations.id))
    .leftJoin(properties, eq(quotes.propertyId, properties.id))
    .leftJoin(jobs, eq(quotes.convertedJobId, jobs.id))
    .where(eq(quotes.id, quoteId));
  if (!row) return null;

  const lineItems: QuoteLineItemRow[] = await db
    .select()
    .from(quoteLineItems)
    .where(eq(quoteLineItems.quoteId, quoteId))
    .orderBy(asc(quoteLineItems.sortOrder));

  const customCharges: QuoteCustomChargeRow[] = await db
    .select()
    .from(quoteCustomCharges)
    .where(eq(quoteCustomCharges.quoteId, quoteId))
    .orderBy(asc(quoteCustomCharges.createdAt));

  return {
    ...row.quote,
    contactName: row.contactName,
    organizationName: row.organizationName,
    propertyAddressLine1: row.propertyAddressLine1,
    propertyCity: row.propertyCity,
    convertedJobNumber: row.convertedJobNumber,
    lineItems,
    customCharges,
  };
}

export interface ListQuotesFilters {
  search?: string;
  status?: QuoteStatus | "all";
  page?: number;
  pageSize?: number;
}

export async function listQuotes<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  filters: ListQuotesFilters = {},
) {
  const page = filters.page && filters.page > 0 ? filters.page : 1;
  const pageSize = filters.pageSize && filters.pageSize > 0 ? filters.pageSize : 25;

  const conditions = [];
  if (filters.status && filters.status !== "all") {
    conditions.push(eq(quotes.status, filters.status));
  }
  if (filters.search) {
    const term = `%${filters.search}%`;
    conditions.push(
      or(
        ilike(quotes.quoteNumber, term),
        sql`exists (select 1 from ${contacts} where ${contacts.id} = ${quotes.contactId} and ${contacts.displayName} ilike ${term})`,
        sql`exists (select 1 from ${organizations} where ${organizations.id} = ${quotes.organizationId} and ${organizations.name} ilike ${term})`,
        sql`exists (select 1 from ${jobs} where ${jobs.id} = ${quotes.convertedJobId} and ${jobs.jobNumber} ilike ${term})`,
      ),
    );
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const rows = await db
    .select({
      id: quotes.id,
      quoteNumber: quotes.quoteNumber,
      status: quotes.status,
      totalCents: sql<number>`${quotes.subtotalCents} + ${quotes.taxCents}`,
      createdAt: quotes.createdAt,
      expiresAt: quotes.expiresAt,
      contactName: contacts.displayName,
      organizationName: organizations.name,
      propertyAddressLine1: properties.addressLine1,
      convertedJobId: quotes.convertedJobId,
      convertedJobNumber: jobs.jobNumber,
    })
    .from(quotes)
    .leftJoin(contacts, eq(quotes.contactId, contacts.id))
    .leftJoin(organizations, eq(quotes.organizationId, organizations.id))
    .leftJoin(properties, eq(quotes.propertyId, properties.id))
    .leftJoin(jobs, eq(quotes.convertedJobId, jobs.id))
    .where(where)
    .orderBy(desc(quotes.createdAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(quotes)
    .where(where);

  return { rows, total: count, page, pageSize };
}

/** Quotes that converted into this job — there is no reverse jobs.quoteId
 *  column, matched via quotes.convertedJobId instead. */
export async function listQuotesForJob<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  jobId: string,
) {
  return db.select().from(quotes).where(eq(quotes.convertedJobId, jobId));
}

/** Best-effort: quotes have no leadId column (Phase 9 decision 1), so a
 *  lead's quotes are matched via the shared contact instead. */
export async function listQuotesForContact<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  contactId: string,
) {
  return db
    .select()
    .from(quotes)
    .where(eq(quotes.contactId, contactId))
    .orderBy(desc(quotes.createdAt));
}

export type QuoteMutationResult = { ok: true } | { ok: false; error: "not_editable" | "not_found" };

/** Only Draft quotes are editable — same rule as invoices. */
async function assertQuoteEditable<TQueryResult extends PgQueryResultHKT>(
  tx: Db<TQueryResult>,
  quoteId: string,
): Promise<
  | { ok: true; quote: typeof quotes.$inferSelect }
  | { ok: false; error: "not_editable" | "not_found" }
> {
  const [quote] = await tx.select().from(quotes).where(eq(quotes.id, quoteId));
  if (!quote) return { ok: false, error: "not_found" };
  if (quote.status !== "draft") return { ok: false, error: "not_editable" };
  return { ok: true, quote };
}

/** Subtotal is line items + custom charges, unlike invoices (line items
 *  only) — quotes have a real quote_custom_charges table. */
async function recomputeQuoteTotals<TQueryResult extends PgQueryResultHKT>(
  tx: Db<TQueryResult>,
  quoteId: string,
) {
  const [{ lineItemTotal }] = await tx
    .select({ lineItemTotal: sql<number>`coalesce(sum(${quoteLineItems.lineTotalCents}), 0)::int` })
    .from(quoteLineItems)
    .where(eq(quoteLineItems.quoteId, quoteId));

  const [{ customChargeTotal }] = await tx
    .select({
      customChargeTotal: sql<number>`coalesce(sum(${quoteCustomCharges.amountCents}), 0)::int`,
    })
    .from(quoteCustomCharges)
    .where(eq(quoteCustomCharges.quoteId, quoteId));

  const [quote] = await tx
    .select({ taxCents: quotes.taxCents })
    .from(quotes)
    .where(eq(quotes.id, quoteId));

  const subtotal = lineItemTotal + customChargeTotal;
  await tx
    .update(quotes)
    .set({ subtotalCents: subtotal, taxCents: quote?.taxCents ?? 0 })
    .where(eq(quotes.id, quoteId));
}

export interface AddQuoteLineItemInput {
  description: string;
  quantity?: string;
  unitPriceCents: number;
}

export type AddQuoteLineItemResult =
  { ok: true; lineItemId: string } | { ok: false; error: "not_editable" | "not_found" };

export async function addQuoteLineItem<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  quoteId: string,
  input: AddQuoteLineItemInput,
  actorUserId: string | null,
): Promise<AddQuoteLineItemResult> {
  return db.transaction(async (tx) => {
    const check = await assertQuoteEditable(tx, quoteId);
    if (!check.ok) return check;

    const quantity = input.quantity ?? "1";
    const lineTotalCents = calculateLineTotalCents(quantity, input.unitPriceCents);

    const [{ maxSort }] = await tx
      .select({ maxSort: sql<number>`coalesce(max(${quoteLineItems.sortOrder}), -1)` })
      .from(quoteLineItems)
      .where(eq(quoteLineItems.quoteId, quoteId));

    const [lineItem] = await tx
      .insert(quoteLineItems)
      .values({
        quoteId,
        description: input.description,
        quantity,
        unitPriceCents: input.unitPriceCents,
        lineTotalCents,
        sortOrder: maxSort + 1,
      })
      .returning();

    await recomputeQuoteTotals(tx, quoteId);

    await recordActivity(tx, {
      actorUserId,
      entityType: "quote",
      entityId: quoteId,
      action: "quote_updated",
      newValue: { lineItemAdded: input.description, amountCents: lineTotalCents },
    });

    return { ok: true, lineItemId: lineItem.id };
  });
}

export interface UpdateQuoteLineItemInput {
  description?: string;
  quantity?: string;
  unitPriceCents?: number;
}

export async function updateQuoteLineItem<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  quoteId: string,
  lineItemId: string,
  input: UpdateQuoteLineItemInput,
  actorUserId: string | null,
): Promise<QuoteMutationResult> {
  return db.transaction(async (tx) => {
    const check = await assertQuoteEditable(tx, quoteId);
    if (!check.ok) return check;

    const [before] = await tx
      .select()
      .from(quoteLineItems)
      .where(and(eq(quoteLineItems.id, lineItemId), eq(quoteLineItems.quoteId, quoteId)));
    if (!before) return { ok: false, error: "not_found" };

    const quantity = input.quantity ?? before.quantity;
    const unitPriceCents = input.unitPriceCents ?? before.unitPriceCents;
    const lineTotalCents = calculateLineTotalCents(quantity, unitPriceCents);
    const description = input.description ?? before.description;

    await tx
      .update(quoteLineItems)
      .set({ description, quantity, unitPriceCents, lineTotalCents })
      .where(eq(quoteLineItems.id, lineItemId));

    await recomputeQuoteTotals(tx, quoteId);

    await recordActivity(tx, {
      actorUserId,
      entityType: "quote",
      entityId: quoteId,
      action: "quote_updated",
      oldValue: {
        description: before.description,
        unitPriceCents: before.unitPriceCents,
        lineTotalCents: before.lineTotalCents,
      },
      newValue: { description, unitPriceCents, lineTotalCents },
    });

    return { ok: true };
  });
}

export async function removeQuoteLineItem<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  quoteId: string,
  lineItemId: string,
  actorUserId: string | null,
): Promise<QuoteMutationResult> {
  return db.transaction(async (tx) => {
    const check = await assertQuoteEditable(tx, quoteId);
    if (!check.ok) return check;

    const [removed] = await tx
      .delete(quoteLineItems)
      .where(and(eq(quoteLineItems.id, lineItemId), eq(quoteLineItems.quoteId, quoteId)))
      .returning();

    await recomputeQuoteTotals(tx, quoteId);

    await recordActivity(tx, {
      actorUserId,
      entityType: "quote",
      entityId: quoteId,
      action: "quote_updated",
      oldValue: removed
        ? { lineItemRemoved: removed.description, amountCents: removed.lineTotalCents }
        : null,
    });

    return { ok: true };
  });
}

/** Positive or negative (negative = discount/credit) — same convention as
 *  job_custom_charges and invoice line items. */
export async function addQuoteCustomCharge<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  quoteId: string,
  description: string,
  amountCents: number,
  actorUserId: string | null,
): Promise<{ ok: true; chargeId: string } | { ok: false; error: "not_editable" | "not_found" }> {
  return db.transaction(async (tx) => {
    const check = await assertQuoteEditable(tx, quoteId);
    if (!check.ok) return check;

    const [charge] = await tx
      .insert(quoteCustomCharges)
      .values({ quoteId, description, amountCents })
      .returning();

    await recomputeQuoteTotals(tx, quoteId);

    await recordActivity(tx, {
      actorUserId,
      entityType: "quote",
      entityId: quoteId,
      action: "quote_custom_charge_added",
      newValue: { description, amountCents },
    });

    return { ok: true, chargeId: charge.id };
  });
}

export async function removeQuoteCustomCharge<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  quoteId: string,
  chargeId: string,
  actorUserId: string | null,
): Promise<QuoteMutationResult> {
  return db.transaction(async (tx) => {
    const check = await assertQuoteEditable(tx, quoteId);
    if (!check.ok) return check;

    const [removed] = await tx
      .delete(quoteCustomCharges)
      .where(and(eq(quoteCustomCharges.id, chargeId), eq(quoteCustomCharges.quoteId, quoteId)))
      .returning();

    await recomputeQuoteTotals(tx, quoteId);

    await recordActivity(tx, {
      actorUserId,
      entityType: "quote",
      entityId: quoteId,
      action: "quote_custom_charge_removed",
      oldValue: removed
        ? { description: removed.description, amountCents: removed.amountCents }
        : null,
    });

    return { ok: true };
  });
}

export interface UpdateQuoteDetailsInput {
  contactId?: string | null;
  propertyId?: string | null;
  organizationId?: string | null;
  description?: string | null;
  notes?: string | null;
  expiresAt?: Date | null;
  taxCents?: number;
}

export async function updateQuoteDetails<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  quoteId: string,
  input: UpdateQuoteDetailsInput,
  actorUserId: string | null,
): Promise<QuoteMutationResult> {
  return db.transaction(async (tx) => {
    const check = await assertQuoteEditable(tx, quoteId);
    if (!check.ok) return check;
    const before = check.quote;

    const taxCents = input.taxCents ?? before.taxCents;

    await tx
      .update(quotes)
      .set({
        contactId: input.contactId !== undefined ? input.contactId || null : undefined,
        propertyId: input.propertyId !== undefined ? input.propertyId || null : undefined,
        organizationId:
          input.organizationId !== undefined ? input.organizationId || null : undefined,
        description: input.description !== undefined ? input.description || null : undefined,
        notes: input.notes !== undefined ? input.notes || null : undefined,
        expiresAt: input.expiresAt !== undefined ? input.expiresAt : undefined,
        taxCents,
      })
      .where(eq(quotes.id, quoteId));

    await recordActivity(tx, {
      actorUserId,
      entityType: "quote",
      entityId: quoteId,
      action: "quote_updated",
      oldValue: { taxCents: before.taxCents },
      newValue: { taxCents },
    });

    return { ok: true };
  });
}

export type QuoteStatusTransitionResult =
  { ok: true } | { ok: false; error: "not_found" | "invalid_transition" };

async function transitionQuoteStatus<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  quoteId: string,
  allowedFrom: QuoteStatus[],
  to: QuoteStatus,
  action: string,
  actorUserId: string | null,
): Promise<QuoteStatusTransitionResult> {
  return db.transaction(async (tx) => {
    const [quote] = await tx.select().from(quotes).where(eq(quotes.id, quoteId));
    if (!quote) return { ok: false, error: "not_found" };
    if (!allowedFrom.includes(quote.status)) return { ok: false, error: "invalid_transition" };

    await tx.update(quotes).set({ status: to }).where(eq(quotes.id, quoteId));

    await recordActivity(tx, {
      actorUserId,
      entityType: "quote",
      entityId: quoteId,
      action,
      oldValue: { status: quote.status },
      newValue: { status: to },
    });

    return { ok: true };
  });
}

/** A manual, explicit action — downloading/previewing the PDF never marks a
 *  quote Sent, same rule as invoices (Phase 8 decision 6). */
export function markQuoteSent<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  quoteId: string,
  actorUserId: string | null,
) {
  return transitionQuoteStatus(db, quoteId, ["draft"], "sent", "quote_status_changed", actorUserId);
}

export function markQuoteAccepted<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  quoteId: string,
  actorUserId: string | null,
) {
  return transitionQuoteStatus(
    db,
    quoteId,
    ["sent"],
    "accepted",
    "quote_status_changed",
    actorUserId,
  );
}

export function markQuoteDeclined<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  quoteId: string,
  actorUserId: string | null,
) {
  return transitionQuoteStatus(
    db,
    quoteId,
    ["sent", "accepted"],
    "declined",
    "quote_status_changed",
    actorUserId,
  );
}

/** The void/archive equivalent required by docs/PROJECT_SPEC.md §27 — Phase
 *  9 decision 2. Available from any non-terminal status; no reason field
 *  (unlike invoice void), matching the "smallest useful version" scope. */
export function cancelQuote<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  quoteId: string,
  actorUserId: string | null,
) {
  return transitionQuoteStatus(
    db,
    quoteId,
    ["draft", "sent", "accepted"],
    "cancelled",
    "quote_status_changed",
    actorUserId,
  );
}

export type ConvertQuoteToJobResult =
  | { ok: true; jobId: string; jobNumber: string }
  | { ok: false; error: "not_found" | "already_converted" | "invalid_status" };

/**
 * Modeled directly on convertLeadToJob (src/lib/crm/leads.ts) — Phase 9
 * decision 4 restricts this to Accepted quotes only, mirroring how
 * conversion generally follows an explicit customer-facing commitment step.
 * The job's own internal financials are never populated from the quote
 * total (docs/CLAUDE.md §6) — those stay manually entered afterward.
 */
export async function convertQuoteToJob<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  quoteId: string,
  actorUserId: string | null,
): Promise<ConvertQuoteToJobResult> {
  return db.transaction(async (tx) => {
    const [quote] = await tx.select().from(quotes).where(eq(quotes.id, quoteId));
    if (!quote) return { ok: false, error: "not_found" };
    if (quote.convertedJobId) return { ok: false, error: "already_converted" };
    if (quote.status !== "accepted") return { ok: false, error: "invalid_status" };

    const [settings] = await tx.select().from(appSettings).limit(1);
    const taxInclusionMode = settings?.taxInclusionDefault ?? "excluded";

    const jobNumber = await allocateSequenceNumber(tx, "job");

    const [job] = await tx
      .insert(jobs)
      .values({
        jobNumber,
        contactId: quote.contactId,
        propertyId: quote.propertyId,
        organizationId: quote.organizationId,
        issueDescription: quote.description,
        taxInclusionMode,
      })
      .returning();

    await tx.update(quotes).set({ convertedJobId: job.id }).where(eq(quotes.id, quoteId));

    await recordActivity(tx, {
      actorUserId,
      entityType: "quote",
      entityId: quoteId,
      action: "quote_converted",
      newValue: { jobNumber: job.jobNumber },
      metadata: { jobId: job.id },
    });
    await recordActivity(tx, {
      actorUserId,
      entityType: "job",
      entityId: job.id,
      action: "job_created_from_quote",
      newValue: { jobNumber: job.jobNumber, status: job.status, taxInclusionMode },
      metadata: { quoteId: quote.id },
    });

    return { ok: true, jobId: job.id, jobNumber: job.jobNumber };
  });
}
