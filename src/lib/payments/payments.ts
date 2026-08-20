import { and, desc, eq, isNull, sql } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { invoices, payments } from "@/lib/db/schema";
import { recordActivity } from "@/lib/audit/activity";
import { setInvoicePaidStatus } from "@/lib/invoices/invoices";
import { deriveInvoicePaidStatus } from "@/lib/invoices/status";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db<TQueryResult extends PgQueryResultHKT> = PgDatabase<TQueryResult, any, any>;

export type PaymentMethod = "e_transfer" | "cash" | "cheque" | "other";

/**
 * Recomputes the invoice's partially_paid/paid/sent status from the actual
 * sum of its non-voided payments and persists it if it changed — the one
 * place this ever happens, called from both recordPayment and voidPayment
 * so the two can never drift apart (Phase 8 decision 1).
 */
async function recomputeAndPersistInvoiceStatus<TQueryResult extends PgQueryResultHKT>(
  tx: Db<TQueryResult>,
  invoiceId: string,
  actorUserId: string,
) {
  const [invoice] = await tx
    .select({ totalCents: invoices.totalCents })
    .from(invoices)
    .where(eq(invoices.id, invoiceId));
  if (!invoice) return;

  const [{ paidCents }] = await tx
    .select({ paidCents: sql<number>`coalesce(sum(${payments.amountCents}), 0)::int` })
    .from(payments)
    .where(and(eq(payments.invoiceId, invoiceId), isNull(payments.voidedAt)));

  const newStatus = deriveInvoicePaidStatus(invoice.totalCents, paidCents);
  const result = await setInvoicePaidStatus(tx, invoiceId, newStatus);

  if (result.changed) {
    await recordActivity(tx, {
      actorUserId,
      entityType: "invoice",
      entityId: invoiceId,
      action: "invoice_status_changed",
      oldValue: { status: result.oldStatus },
      newValue: { status: newStatus },
    });
  }
}

export interface RecordPaymentInput {
  jobId: string;
  /** Optional allocation to one specific invoice — a payment always
   *  belongs to a job regardless (docs/IMPLEMENTATION_PLAN.md §2.1.D). */
  invoiceId?: string | null;
  /** Negative = a refund, recorded as its own row rather than mutating an
   *  existing payment (docs/IMPLEMENTATION_PLAN.md §2.1.F). */
  amountCents: number;
  paidAt: Date;
  method: PaymentMethod;
  referenceNote?: string | null;
}

export type RecordPaymentResult =
  { ok: true; paymentId: string } | { ok: false; error: "invoice_not_allocatable" };

/** Overpayment is allowed (Phase 8 decision 4) — no validation against the
 *  outstanding balance here; the caller can display the resulting
 *  negative balance as a credit. */
export async function recordPayment<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  input: RecordPaymentInput,
  actorUserId: string,
): Promise<RecordPaymentResult> {
  return db.transaction(async (tx) => {
    if (input.invoiceId) {
      const [invoice] = await tx.select().from(invoices).where(eq(invoices.id, input.invoiceId));
      if (!invoice || invoice.status === "draft" || invoice.status === "void") {
        return { ok: false, error: "invoice_not_allocatable" };
      }
    }

    const [payment] = await tx
      .insert(payments)
      .values({
        jobId: input.jobId,
        invoiceId: input.invoiceId || null,
        amountCents: input.amountCents,
        paidAt: input.paidAt,
        method: input.method,
        referenceNote: input.referenceNote || null,
        createdBy: actorUserId,
      })
      .returning();

    await recordActivity(tx, {
      actorUserId,
      entityType: "job",
      entityId: input.jobId,
      action: "payment_recorded",
      newValue: {
        amountCents: input.amountCents,
        method: input.method,
        invoiceId: input.invoiceId ?? null,
      },
    });

    if (input.invoiceId) {
      await recomputeAndPersistInvoiceStatus(tx, input.invoiceId, actorUserId);
    }

    return { ok: true, paymentId: payment.id };
  });
}

export type VoidPaymentResult = { ok: true } | { ok: false; error: "not_found" | "already_void" };

/** Never hard-deleted (docs/PROJECT_SPEC.md §12/§27) — voiding excludes a
 *  payment from balance/status calculations but keeps it permanently
 *  visible in history. */
export async function voidPayment<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  paymentId: string,
  reason: string,
  actorUserId: string,
): Promise<VoidPaymentResult> {
  return db.transaction(async (tx) => {
    const [payment] = await tx.select().from(payments).where(eq(payments.id, paymentId));
    if (!payment) return { ok: false, error: "not_found" };
    if (payment.voidedAt) return { ok: false, error: "already_void" };

    await tx
      .update(payments)
      .set({ voidedAt: new Date(), voidReason: reason })
      .where(eq(payments.id, paymentId));

    await recordActivity(tx, {
      actorUserId,
      entityType: "job",
      entityId: payment.jobId,
      action: "payment_voided",
      oldValue: { amountCents: payment.amountCents },
    });

    if (payment.invoiceId) {
      await recomputeAndPersistInvoiceStatus(tx, payment.invoiceId, actorUserId);
    }

    return { ok: true };
  });
}

export interface UpdatePaymentDetailsInput {
  paidAt?: Date;
  method?: PaymentMethod;
  referenceNote?: string | null;
}

export type UpdatePaymentResult = { ok: true } | { ok: false; error: "not_found" | "voided" };

/**
 * Phase 8 decision 5: only non-financial fields are editable in place — a
 * wrong amount must go through voidPayment + a new correct payment, so the
 * one field that determines balance integrity is never silently mutated.
 */
export async function updatePaymentDetails<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  paymentId: string,
  input: UpdatePaymentDetailsInput,
  actorUserId: string,
): Promise<UpdatePaymentResult> {
  return db.transaction(async (tx) => {
    const [before] = await tx.select().from(payments).where(eq(payments.id, paymentId));
    if (!before) return { ok: false, error: "not_found" };
    if (before.voidedAt) return { ok: false, error: "voided" };

    const paidAt = input.paidAt ?? before.paidAt;
    const method = input.method ?? before.method;
    const referenceNote =
      input.referenceNote !== undefined ? input.referenceNote || null : before.referenceNote;

    await tx
      .update(payments)
      .set({ paidAt, method, referenceNote })
      .where(eq(payments.id, paymentId));

    await recordActivity(tx, {
      actorUserId,
      entityType: "job",
      entityId: before.jobId,
      action: "payment_updated",
      oldValue: {
        paidAt: before.paidAt,
        method: before.method,
        referenceNote: before.referenceNote,
      },
      newValue: { paidAt, method, referenceNote },
    });

    return { ok: true };
  });
}

export interface InvoiceBalance {
  totalCents: number;
  paidCents: number;
  balanceCents: number;
}

export async function getInvoiceBalance<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  invoiceId: string,
): Promise<InvoiceBalance | null> {
  const [invoice] = await db
    .select({ totalCents: invoices.totalCents })
    .from(invoices)
    .where(eq(invoices.id, invoiceId));
  if (!invoice) return null;

  const [{ paidCents }] = await db
    .select({ paidCents: sql<number>`coalesce(sum(${payments.amountCents}), 0)::int` })
    .from(payments)
    .where(and(eq(payments.invoiceId, invoiceId), isNull(payments.voidedAt)));

  return {
    totalCents: invoice.totalCents,
    paidCents,
    balanceCents: invoice.totalCents - paidCents,
  };
}

export async function listPaymentsForInvoice<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  invoiceId: string,
) {
  return db
    .select()
    .from(payments)
    .where(eq(payments.invoiceId, invoiceId))
    .orderBy(desc(payments.paidAt));
}

export async function listPaymentsForJob<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  jobId: string,
) {
  return db.select().from(payments).where(eq(payments.jobId, jobId)).orderBy(desc(payments.paidAt));
}
