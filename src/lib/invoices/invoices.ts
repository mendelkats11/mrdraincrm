import { and, asc, desc, eq, ilike, or, sql } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import {
  appSettings,
  contacts,
  invoiceLineItems,
  invoices,
  jobs,
  organizations,
  properties,
} from "@/lib/db/schema";
import { recordActivity } from "@/lib/audit/activity";
import { allocateSequenceNumber } from "@/lib/sequences/allocate";
import { calculateLineTotalCents } from "@/lib/money";
import type { InvoicePaidStatus } from "./status";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db<TQueryResult extends PgQueryResultHKT> = PgDatabase<TQueryResult, any, any>;

export type InvoiceStatus = "draft" | "sent" | "partially_paid" | "paid" | "void";

export interface InvoiceDefaults {
  businessName: string | null;
  businessAddress: string | null;
  logoUrl: string | null;
  customerName: string | null;
  customerAddress: string | null;
}

/**
 * Suggested prefill values for the "new invoice" form — read-only, never
 * written anywhere until createInvoice is actually called (and even then
 * the caller may have edited them). Business info comes from appSettings;
 * customer info is resolved from the job's linked organization/property/
 * contact — organization name/address preferred (the billing entity for
 * commercial work), falling back to the individual contact/property.
 */
export async function resolveInvoiceDefaults<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  jobId: string,
): Promise<InvoiceDefaults> {
  const [job] = await db.select().from(jobs).where(eq(jobs.id, jobId));
  if (!job) throw new Error(`Job ${jobId} not found`);

  const [settings] = await db.select().from(appSettings).limit(1);

  let customerName: string | null = null;
  let customerAddress: string | null = null;

  if (job.organizationId) {
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, job.organizationId));
    if (org) {
      customerName = org.name;
      customerAddress = org.address;
    }
  }
  if (!customerName && job.contactId) {
    const [contact] = await db.select().from(contacts).where(eq(contacts.id, job.contactId));
    if (contact) customerName = contact.displayName;
  }
  if (!customerAddress && job.propertyId) {
    const [property] = await db.select().from(properties).where(eq(properties.id, job.propertyId));
    if (property) {
      customerAddress = [
        property.addressLine1,
        property.addressLine2,
        `${property.city}, ${property.province} ${property.postalCode}`,
      ]
        .filter(Boolean)
        .join("\n");
    }
  }

  return {
    businessName: settings?.businessName ?? null,
    businessAddress: settings?.businessAddress ?? null,
    logoUrl: settings?.logoUrl ?? null,
    customerName,
    customerAddress,
  };
}

export interface CreateInvoiceInput {
  jobId: string;
  businessName?: string | null;
  businessAddress?: string | null;
  logoUrl?: string | null;
  customerName?: string | null;
  customerAddress?: string | null;
  notes?: string | null;
  paymentInstructions?: string | null;
  footer?: string | null;
  taxCents?: number;
}

/**
 * Always created as a Draft with an immediately-allocated number (same
 * timing as jobs — no special-casing). Business/customer info is whatever
 * the caller passes (typically resolveInvoiceDefaults' output, possibly
 * edited by the owner on the new-invoice form) — this function does no
 * resolution of its own, it only stores what it's given.
 */
export async function createInvoice<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  input: CreateInvoiceInput,
  actorUserId: string | null,
) {
  return db.transaction(async (tx) => {
    const invoiceNumber = await allocateSequenceNumber(tx, "invoice");
    const taxCents = input.taxCents ?? 0;

    const [invoice] = await tx
      .insert(invoices)
      .values({
        invoiceNumber,
        jobId: input.jobId,
        status: "draft",
        businessName: input.businessName || null,
        businessAddress: input.businessAddress || null,
        logoUrl: input.logoUrl || null,
        customerName: input.customerName || null,
        customerAddress: input.customerAddress || null,
        subtotalCents: 0,
        taxCents,
        totalCents: taxCents,
        notes: input.notes || null,
        paymentInstructions: input.paymentInstructions || null,
        footer: input.footer || null,
      })
      .returning();

    await recordActivity(tx, {
      actorUserId,
      entityType: "invoice",
      entityId: invoice.id,
      action: "invoice_created",
      newValue: { invoiceNumber: invoice.invoiceNumber, jobId: invoice.jobId },
    });

    return invoice;
  });
}

export interface InvoiceLineItemRow {
  id: string;
  description: string;
  quantity: string;
  unitPriceCents: number;
  lineTotalCents: number;
  sortOrder: number;
}

export async function getInvoice<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  invoiceId: string,
) {
  const [row] = await db
    .select({ invoice: invoices, jobNumber: jobs.jobNumber })
    .from(invoices)
    .innerJoin(jobs, eq(invoices.jobId, jobs.id))
    .where(eq(invoices.id, invoiceId));
  if (!row) return null;

  const lineItems: InvoiceLineItemRow[] = await db
    .select()
    .from(invoiceLineItems)
    .where(eq(invoiceLineItems.invoiceId, invoiceId))
    .orderBy(asc(invoiceLineItems.sortOrder));

  return { ...row.invoice, jobNumber: row.jobNumber, lineItems };
}

export interface ListInvoicesFilters {
  search?: string;
  status?: InvoiceStatus | "all";
  page?: number;
  pageSize?: number;
}

export async function listInvoices<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  filters: ListInvoicesFilters = {},
) {
  const page = filters.page && filters.page > 0 ? filters.page : 1;
  const pageSize = filters.pageSize && filters.pageSize > 0 ? filters.pageSize : 25;

  const conditions = [];
  if (filters.status && filters.status !== "all") {
    conditions.push(eq(invoices.status, filters.status));
  }
  if (filters.search) {
    const term = `%${filters.search}%`;
    conditions.push(
      or(
        ilike(invoices.invoiceNumber, term),
        ilike(invoices.customerName, term),
        sql`exists (select 1 from ${jobs} where ${jobs.id} = ${invoices.jobId} and ${jobs.jobNumber} ilike ${term})`,
      ),
    );
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const rows = await db
    .select({
      id: invoices.id,
      invoiceNumber: invoices.invoiceNumber,
      status: invoices.status,
      customerName: invoices.customerName,
      totalCents: invoices.totalCents,
      createdAt: invoices.createdAt,
      jobId: invoices.jobId,
      jobNumber: jobs.jobNumber,
    })
    .from(invoices)
    .innerJoin(jobs, eq(invoices.jobId, jobs.id))
    .where(where)
    .orderBy(desc(invoices.createdAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(invoices)
    .where(where);

  return { rows, total: count, page, pageSize };
}

export async function listInvoicesForJob<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  jobId: string,
) {
  return db
    .select()
    .from(invoices)
    .where(eq(invoices.jobId, jobId))
    .orderBy(desc(invoices.createdAt));
}

export type InvoiceMutationResult =
  { ok: true } | { ok: false; error: "not_editable" | "not_found" };

/**
 * Phase 8 decision 2: an invoice's financial content is locked once it's
 * no longer Draft — corrections happen via void + a new invoice, not by
 * editing a document that may already be in the customer's hands.
 */
async function assertInvoiceEditable<TQueryResult extends PgQueryResultHKT>(
  tx: Db<TQueryResult>,
  invoiceId: string,
): Promise<
  | { ok: true; invoice: typeof invoices.$inferSelect }
  | { ok: false; error: "not_editable" | "not_found" }
> {
  const [invoice] = await tx.select().from(invoices).where(eq(invoices.id, invoiceId));
  if (!invoice) return { ok: false, error: "not_found" };
  if (invoice.status !== "draft") return { ok: false, error: "not_editable" };
  return { ok: true, invoice };
}

async function recomputeInvoiceTotals<TQueryResult extends PgQueryResultHKT>(
  tx: Db<TQueryResult>,
  invoiceId: string,
) {
  const [{ subtotal }] = await tx
    .select({ subtotal: sql<number>`coalesce(sum(${invoiceLineItems.lineTotalCents}), 0)::int` })
    .from(invoiceLineItems)
    .where(eq(invoiceLineItems.invoiceId, invoiceId));

  const [invoice] = await tx
    .select({ taxCents: invoices.taxCents })
    .from(invoices)
    .where(eq(invoices.id, invoiceId));

  await tx
    .update(invoices)
    .set({ subtotalCents: subtotal, totalCents: subtotal + (invoice?.taxCents ?? 0) })
    .where(eq(invoices.id, invoiceId));
}

export interface AddLineItemInput {
  description: string;
  quantity?: string;
  unitPriceCents: number;
}

export type AddLineItemResult =
  { ok: true; lineItemId: string } | { ok: false; error: "not_editable" | "not_found" };

/** Negative unitPriceCents/lineTotalCents represent a discount line — same
 *  positive-or-negative convention already used by jobCustomCharges. */
export async function addInvoiceLineItem<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  invoiceId: string,
  input: AddLineItemInput,
  actorUserId: string | null,
): Promise<AddLineItemResult> {
  return db.transaction(async (tx) => {
    const check = await assertInvoiceEditable(tx, invoiceId);
    if (!check.ok) return check;

    const quantity = input.quantity ?? "1";
    const lineTotalCents = calculateLineTotalCents(quantity, input.unitPriceCents);

    const [{ maxSort }] = await tx
      .select({ maxSort: sql<number>`coalesce(max(${invoiceLineItems.sortOrder}), -1)` })
      .from(invoiceLineItems)
      .where(eq(invoiceLineItems.invoiceId, invoiceId));

    const [lineItem] = await tx
      .insert(invoiceLineItems)
      .values({
        invoiceId,
        description: input.description,
        quantity,
        unitPriceCents: input.unitPriceCents,
        lineTotalCents,
        sortOrder: maxSort + 1,
      })
      .returning();

    await recomputeInvoiceTotals(tx, invoiceId);

    await recordActivity(tx, {
      actorUserId,
      entityType: "invoice",
      entityId: invoiceId,
      action: "invoice_updated",
      newValue: { lineItemAdded: input.description, amountCents: lineTotalCents },
    });

    return { ok: true, lineItemId: lineItem.id };
  });
}

export interface UpdateLineItemInput {
  description?: string;
  quantity?: string;
  unitPriceCents?: number;
}

export async function updateInvoiceLineItem<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  invoiceId: string,
  lineItemId: string,
  input: UpdateLineItemInput,
  actorUserId: string | null,
): Promise<InvoiceMutationResult> {
  return db.transaction(async (tx) => {
    const check = await assertInvoiceEditable(tx, invoiceId);
    if (!check.ok) return check;

    const [before] = await tx
      .select()
      .from(invoiceLineItems)
      .where(and(eq(invoiceLineItems.id, lineItemId), eq(invoiceLineItems.invoiceId, invoiceId)));
    if (!before) return { ok: false, error: "not_found" };

    const quantity = input.quantity ?? before.quantity;
    const unitPriceCents = input.unitPriceCents ?? before.unitPriceCents;
    const lineTotalCents = calculateLineTotalCents(quantity, unitPriceCents);
    const description = input.description ?? before.description;

    await tx
      .update(invoiceLineItems)
      .set({ description, quantity, unitPriceCents, lineTotalCents })
      .where(eq(invoiceLineItems.id, lineItemId));

    await recomputeInvoiceTotals(tx, invoiceId);

    await recordActivity(tx, {
      actorUserId,
      entityType: "invoice",
      entityId: invoiceId,
      action: "invoice_updated",
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

export async function removeInvoiceLineItem<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  invoiceId: string,
  lineItemId: string,
  actorUserId: string | null,
): Promise<InvoiceMutationResult> {
  return db.transaction(async (tx) => {
    const check = await assertInvoiceEditable(tx, invoiceId);
    if (!check.ok) return check;

    const [removed] = await tx
      .delete(invoiceLineItems)
      .where(and(eq(invoiceLineItems.id, lineItemId), eq(invoiceLineItems.invoiceId, invoiceId)))
      .returning();

    await recomputeInvoiceTotals(tx, invoiceId);

    await recordActivity(tx, {
      actorUserId,
      entityType: "invoice",
      entityId: invoiceId,
      action: "invoice_updated",
      oldValue: removed
        ? { lineItemRemoved: removed.description, amountCents: removed.lineTotalCents }
        : null,
    });

    return { ok: true };
  });
}

export interface UpdateInvoiceDetailsInput {
  businessName?: string | null;
  businessAddress?: string | null;
  logoUrl?: string | null;
  customerName?: string | null;
  customerAddress?: string | null;
  notes?: string | null;
  paymentInstructions?: string | null;
  footer?: string | null;
  taxCents?: number;
}

export async function updateInvoiceDetails<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  invoiceId: string,
  input: UpdateInvoiceDetailsInput,
  actorUserId: string | null,
): Promise<InvoiceMutationResult> {
  return db.transaction(async (tx) => {
    const check = await assertInvoiceEditable(tx, invoiceId);
    if (!check.ok) return check;
    const before = check.invoice;

    const taxCents = input.taxCents ?? before.taxCents;

    await tx
      .update(invoices)
      .set({
        businessName: input.businessName !== undefined ? input.businessName || null : undefined,
        businessAddress:
          input.businessAddress !== undefined ? input.businessAddress || null : undefined,
        logoUrl: input.logoUrl !== undefined ? input.logoUrl || null : undefined,
        customerName: input.customerName !== undefined ? input.customerName || null : undefined,
        customerAddress:
          input.customerAddress !== undefined ? input.customerAddress || null : undefined,
        notes: input.notes !== undefined ? input.notes || null : undefined,
        paymentInstructions:
          input.paymentInstructions !== undefined ? input.paymentInstructions || null : undefined,
        footer: input.footer !== undefined ? input.footer || null : undefined,
        taxCents,
        totalCents: before.subtotalCents + taxCents,
      })
      .where(eq(invoices.id, invoiceId));

    await recordActivity(tx, {
      actorUserId,
      entityType: "invoice",
      entityId: invoiceId,
      action: "invoice_updated",
      oldValue: { taxCents: before.taxCents },
      newValue: { taxCents },
    });

    return { ok: true };
  });
}

export type MarkSentResult =
  { ok: true } | { ok: false; error: "not_found" | "invalid_transition" };

/** A manual, explicit action — never triggered by a PDF download (Phase 8
 *  decision 6). Only valid from Draft. */
export async function markInvoiceSent<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  invoiceId: string,
  actorUserId: string | null,
): Promise<MarkSentResult> {
  return db.transaction(async (tx) => {
    const [invoice] = await tx.select().from(invoices).where(eq(invoices.id, invoiceId));
    if (!invoice) return { ok: false, error: "not_found" };
    if (invoice.status !== "draft") return { ok: false, error: "invalid_transition" };

    await tx
      .update(invoices)
      .set({ status: "sent", sentAt: new Date() })
      .where(eq(invoices.id, invoiceId));

    await recordActivity(tx, {
      actorUserId,
      entityType: "invoice",
      entityId: invoiceId,
      action: "invoice_status_changed",
      oldValue: { status: "draft" },
      newValue: { status: "sent" },
    });

    return { ok: true };
  });
}

export type VoidInvoiceResult = { ok: true } | { ok: false; error: "not_found" | "already_void" };

/** Available from any non-void status, including paid — voiding never
 *  alters or hides the underlying payments, which keep their own
 *  independent history (docs/PROJECT_SPEC.md §27). */
export async function voidInvoice<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  invoiceId: string,
  reason: string,
  actorUserId: string | null,
): Promise<VoidInvoiceResult> {
  return db.transaction(async (tx) => {
    const [invoice] = await tx.select().from(invoices).where(eq(invoices.id, invoiceId));
    if (!invoice) return { ok: false, error: "not_found" };
    if (invoice.status === "void") return { ok: false, error: "already_void" };

    await tx
      .update(invoices)
      .set({ status: "void", voidedAt: new Date(), voidReason: reason })
      .where(eq(invoices.id, invoiceId));

    await recordActivity(tx, {
      actorUserId,
      entityType: "invoice",
      entityId: invoiceId,
      action: "invoice_status_changed",
      oldValue: { status: invoice.status },
      newValue: { status: "void", voidReason: reason },
    });

    return { ok: true };
  });
}

/**
 * Used exclusively by the payments module to persist a recomputed
 * partially_paid/paid/sent status after a payment is recorded or voided —
 * never called for the draft/void transitions above, which stay
 * exclusively manual (Phase 8 decision 1).
 */
export async function setInvoicePaidStatus<TQueryResult extends PgQueryResultHKT>(
  tx: Db<TQueryResult>,
  invoiceId: string,
  status: InvoicePaidStatus,
): Promise<{ changed: boolean; oldStatus: InvoiceStatus }> {
  const [invoice] = await tx
    .select({ status: invoices.status })
    .from(invoices)
    .where(eq(invoices.id, invoiceId));
  if (!invoice) throw new Error(`Invoice ${invoiceId} not found`);
  if (invoice.status === "draft" || invoice.status === "void") {
    throw new Error(
      `Cannot set a paid-status on invoice ${invoiceId} — it is ${invoice.status}, not sent`,
    );
  }
  if (invoice.status === status) return { changed: false, oldStatus: invoice.status };

  await tx.update(invoices).set({ status }).where(eq(invoices.id, invoiceId));
  return { changed: true, oldStatus: invoice.status };
}
