// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { createTestDb } from "../helpers/test-db";
import { createJob } from "@/lib/jobs/jobs";
import {
  addInvoiceLineItem,
  createInvoice,
  getInvoice,
  markInvoiceSent,
} from "@/lib/invoices/invoices";
import {
  getInvoiceBalance,
  listPaymentsForInvoice,
  listPaymentsForJob,
  recordPayment,
  updatePaymentDetails,
  voidPayment,
} from "@/lib/payments/payments";
import { activities, sequences, users } from "@/lib/db/schema";

async function seedSequences(db: Awaited<ReturnType<typeof createTestDb>>["db"]) {
  await db.insert(sequences).values([
    { name: "job", prefix: "JOB-", nextNumber: 1, minDigits: 4 },
    { name: "invoice", prefix: "INV-", nextNumber: 1, minDigits: 4 },
  ]);
}

async function seedUser(db: Awaited<ReturnType<typeof createTestDb>>["db"]) {
  const [user] = await db
    .insert(users)
    .values({
      email: "owner@example.com",
      passwordHash: "not-a-real-hash",
      name: "Test Owner",
      role: "owner",
    })
    .returning();
  return user.id;
}

/** Creates a job + sent invoice with the given total, ready to accept payments. */
async function createSentInvoice(
  db: Awaited<ReturnType<typeof createTestDb>>["db"],
  totalCents: number,
) {
  const job = await createJob(db, {}, null);
  const invoice = await createInvoice(db, { jobId: job.id }, null);
  await addInvoiceLineItem(
    db,
    invoice.id,
    { description: "Work", unitPriceCents: totalCents },
    null,
  );
  await markInvoiceSent(db, invoice.id, null);
  return { job, invoiceId: invoice.id };
}

describe("recordPayment", () => {
  let ctx: Awaited<ReturnType<typeof createTestDb>>;
  let actorUserId: string;

  beforeEach(async () => {
    ctx = await createTestDb();
    await seedSequences(ctx.db);
    actorUserId = await seedUser(ctx.db);
  });

  afterEach(async () => {
    await ctx.client.close();
  });

  it("records a job-only payment with no invoice allocation", async () => {
    const job = await createJob(ctx.db, {}, null);
    const result = await recordPayment(
      ctx.db,
      { jobId: job.id, amountCents: 5000, paidAt: new Date(), method: "cash" },
      actorUserId,
    );
    expect(result.ok).toBe(true);

    const payments = await listPaymentsForJob(ctx.db, job.id);
    expect(payments).toHaveLength(1);
    expect(payments[0].invoiceId).toBeNull();
  });

  it("a full payment moves the invoice's status to paid", async () => {
    const { job, invoiceId } = await createSentInvoice(ctx.db, 10000);
    await recordPayment(
      ctx.db,
      { jobId: job.id, invoiceId, amountCents: 10000, paidAt: new Date(), method: "e_transfer" },
      actorUserId,
    );

    const invoice = await getInvoice(ctx.db, invoiceId);
    expect(invoice?.status).toBe("paid");
  });

  it("a partial payment moves the invoice's status to partially_paid", async () => {
    const { job, invoiceId } = await createSentInvoice(ctx.db, 10000);
    await recordPayment(
      ctx.db,
      { jobId: job.id, invoiceId, amountCents: 4000, paidAt: new Date(), method: "e_transfer" },
      actorUserId,
    );

    const invoice = await getInvoice(ctx.db, invoiceId);
    expect(invoice?.status).toBe("partially_paid");
  });

  it("two payments accumulating to the full total move status to paid", async () => {
    const { job, invoiceId } = await createSentInvoice(ctx.db, 10000);
    await recordPayment(
      ctx.db,
      { jobId: job.id, invoiceId, amountCents: 4000, paidAt: new Date(), method: "cash" },
      actorUserId,
    );
    await recordPayment(
      ctx.db,
      { jobId: job.id, invoiceId, amountCents: 6000, paidAt: new Date(), method: "e_transfer" },
      actorUserId,
    );

    const invoice = await getInvoice(ctx.db, invoiceId);
    expect(invoice?.status).toBe("paid");
  });

  it("overpayment is allowed and still resolves to paid", async () => {
    const { job, invoiceId } = await createSentInvoice(ctx.db, 10000);
    const result = await recordPayment(
      ctx.db,
      { jobId: job.id, invoiceId, amountCents: 15000, paidAt: new Date(), method: "cash" },
      actorUserId,
    );
    expect(result.ok).toBe(true);

    const invoice = await getInvoice(ctx.db, invoiceId);
    expect(invoice?.status).toBe("paid");
    const balance = await getInvoiceBalance(ctx.db, invoiceId);
    expect(balance?.balanceCents).toBe(-5000);
  });

  it("rejects allocating a payment to a Draft invoice", async () => {
    const job = await createJob(ctx.db, {}, null);
    const invoice = await createInvoice(ctx.db, { jobId: job.id }, null);

    const result = await recordPayment(
      ctx.db,
      {
        jobId: job.id,
        invoiceId: invoice.id,
        amountCents: 1000,
        paidAt: new Date(),
        method: "cash",
      },
      actorUserId,
    );
    expect(result).toEqual({ ok: false, error: "invoice_not_allocatable" });
  });

  it("rejects allocating a payment to a Void invoice", async () => {
    const job = await createJob(ctx.db, {}, null);
    const invoice = await createInvoice(ctx.db, { jobId: job.id }, null);
    const { voidInvoice } = await import("@/lib/invoices/invoices");
    await voidInvoice(ctx.db, invoice.id, "cancelled", null);

    const result = await recordPayment(
      ctx.db,
      {
        jobId: job.id,
        invoiceId: invoice.id,
        amountCents: 1000,
        paidAt: new Date(),
        method: "cash",
      },
      actorUserId,
    );
    expect(result).toEqual({ ok: false, error: "invoice_not_allocatable" });
  });

  it("a refund is recorded as its own negative-amount payment row", async () => {
    const { job, invoiceId } = await createSentInvoice(ctx.db, 10000);
    await recordPayment(
      ctx.db,
      { jobId: job.id, invoiceId, amountCents: 10000, paidAt: new Date(), method: "e_transfer" },
      actorUserId,
    );
    await recordPayment(
      ctx.db,
      { jobId: job.id, invoiceId, amountCents: -3000, paidAt: new Date(), method: "e_transfer" },
      actorUserId,
    );

    const payments = await listPaymentsForInvoice(ctx.db, invoiceId);
    expect(payments).toHaveLength(2);
    const balance = await getInvoiceBalance(ctx.db, invoiceId);
    expect(balance?.balanceCents).toBe(3000);

    const invoice = await getInvoice(ctx.db, invoiceId);
    expect(invoice?.status).toBe("partially_paid");
  });

  it("records payment_recorded and a conditional invoice_status_changed in one transaction", async () => {
    const { job, invoiceId } = await createSentInvoice(ctx.db, 10000);
    await recordPayment(
      ctx.db,
      { jobId: job.id, invoiceId, amountCents: 10000, paidAt: new Date(), method: "cash" },
      actorUserId,
    );

    const jobActivity = await ctx.db
      .select()
      .from(activities)
      .where(and(eq(activities.entityType, "job"), eq(activities.entityId, job.id)));
    expect(jobActivity.map((r) => r.action)).toContain("payment_recorded");

    const invoiceActivity = await ctx.db
      .select()
      .from(activities)
      .where(and(eq(activities.entityType, "invoice"), eq(activities.entityId, invoiceId)));
    expect(invoiceActivity.map((r) => r.action)).toContain("invoice_status_changed");
  });
});

describe("voidPayment", () => {
  let ctx: Awaited<ReturnType<typeof createTestDb>>;
  let actorUserId: string;

  beforeEach(async () => {
    ctx = await createTestDb();
    await seedSequences(ctx.db);
    actorUserId = await seedUser(ctx.db);
  });

  afterEach(async () => {
    await ctx.client.close();
  });

  it("voiding the only payment reverts the invoice status back to sent", async () => {
    const { job, invoiceId } = await createSentInvoice(ctx.db, 10000);
    const result = await recordPayment(
      ctx.db,
      { jobId: job.id, invoiceId, amountCents: 10000, paidAt: new Date(), method: "cash" },
      actorUserId,
    );
    if (!result.ok) throw new Error("expected ok");
    expect((await getInvoice(ctx.db, invoiceId))?.status).toBe("paid");

    await voidPayment(ctx.db, result.paymentId, "Bounced e-transfer", actorUserId);

    expect((await getInvoice(ctx.db, invoiceId))?.status).toBe("sent");
  });

  it("voiding one of two payments reverts paid to partially_paid", async () => {
    const { job, invoiceId } = await createSentInvoice(ctx.db, 10000);
    const first = await recordPayment(
      ctx.db,
      { jobId: job.id, invoiceId, amountCents: 4000, paidAt: new Date(), method: "cash" },
      actorUserId,
    );
    await recordPayment(
      ctx.db,
      { jobId: job.id, invoiceId, amountCents: 6000, paidAt: new Date(), method: "e_transfer" },
      actorUserId,
    );
    expect((await getInvoice(ctx.db, invoiceId))?.status).toBe("paid");
    if (!first.ok) throw new Error("expected ok");

    await voidPayment(ctx.db, first.paymentId, "Correction", actorUserId);

    expect((await getInvoice(ctx.db, invoiceId))?.status).toBe("partially_paid");
  });

  it("a voided payment is excluded from the balance but stays visible in history", async () => {
    const { job, invoiceId } = await createSentInvoice(ctx.db, 10000);
    const result = await recordPayment(
      ctx.db,
      { jobId: job.id, invoiceId, amountCents: 5000, paidAt: new Date(), method: "cash" },
      actorUserId,
    );
    if (!result.ok) throw new Error("expected ok");

    await voidPayment(ctx.db, result.paymentId, "Mistake", actorUserId);

    const balance = await getInvoiceBalance(ctx.db, invoiceId);
    expect(balance?.paidCents).toBe(0);

    const payments = await listPaymentsForInvoice(ctx.db, invoiceId);
    expect(payments).toHaveLength(1);
    expect(payments[0].voidedAt).not.toBeNull();
  });

  it("rejects voiding an already-voided payment", async () => {
    const job = await createJob(ctx.db, {}, null);
    const result = await recordPayment(
      ctx.db,
      { jobId: job.id, amountCents: 1000, paidAt: new Date(), method: "cash" },
      actorUserId,
    );
    if (!result.ok) throw new Error("expected ok");
    await voidPayment(ctx.db, result.paymentId, "First", actorUserId);

    const secondVoid = await voidPayment(ctx.db, result.paymentId, "Second", actorUserId);
    expect(secondVoid).toEqual({ ok: false, error: "already_void" });
  });

  it("never hard-deletes — the row always remains queryable", async () => {
    const job = await createJob(ctx.db, {}, null);
    const result = await recordPayment(
      ctx.db,
      { jobId: job.id, amountCents: 1000, paidAt: new Date(), method: "cash" },
      actorUserId,
    );
    if (!result.ok) throw new Error("expected ok");
    await voidPayment(ctx.db, result.paymentId, "Mistake", actorUserId);

    const payments = await listPaymentsForJob(ctx.db, job.id);
    expect(payments.map((p) => p.id)).toContain(result.paymentId);
  });
});

describe("updatePaymentDetails", () => {
  let ctx: Awaited<ReturnType<typeof createTestDb>>;
  let actorUserId: string;

  beforeEach(async () => {
    ctx = await createTestDb();
    await seedSequences(ctx.db);
    actorUserId = await seedUser(ctx.db);
  });

  afterEach(async () => {
    await ctx.client.close();
  });

  it("updates method and reference note in place", async () => {
    const job = await createJob(ctx.db, {}, null);
    const result = await recordPayment(
      ctx.db,
      { jobId: job.id, amountCents: 1000, paidAt: new Date(), method: "cash" },
      actorUserId,
    );
    if (!result.ok) throw new Error("expected ok");

    const updateResult = await updatePaymentDetails(
      ctx.db,
      result.paymentId,
      { method: "e_transfer", referenceNote: "corrected" },
      actorUserId,
    );
    expect(updateResult.ok).toBe(true);

    const payments = await listPaymentsForJob(ctx.db, job.id);
    expect(payments[0].method).toBe("e_transfer");
    expect(payments[0].referenceNote).toBe("corrected");
    // Amount is never touched by this function.
    expect(payments[0].amountCents).toBe(1000);
  });

  it("rejects editing a voided payment", async () => {
    const job = await createJob(ctx.db, {}, null);
    const result = await recordPayment(
      ctx.db,
      { jobId: job.id, amountCents: 1000, paidAt: new Date(), method: "cash" },
      actorUserId,
    );
    if (!result.ok) throw new Error("expected ok");
    await voidPayment(ctx.db, result.paymentId, "Mistake", actorUserId);

    const updateResult = await updatePaymentDetails(
      ctx.db,
      result.paymentId,
      { method: "cheque" },
      actorUserId,
    );
    expect(updateResult).toEqual({ ok: false, error: "voided" });
  });
});

describe("getInvoiceBalance", () => {
  let ctx: Awaited<ReturnType<typeof createTestDb>>;
  let actorUserId: string;

  beforeEach(async () => {
    ctx = await createTestDb();
    await seedSequences(ctx.db);
    actorUserId = await seedUser(ctx.db);
  });

  afterEach(async () => {
    await ctx.client.close();
  });

  it("reconciles exactly against a manual sum of non-voided payments", async () => {
    const { job, invoiceId } = await createSentInvoice(ctx.db, 20000);
    await recordPayment(
      ctx.db,
      { jobId: job.id, invoiceId, amountCents: 5000, paidAt: new Date(), method: "cash" },
      actorUserId,
    );
    await recordPayment(
      ctx.db,
      { jobId: job.id, invoiceId, amountCents: 7000, paidAt: new Date(), method: "e_transfer" },
      actorUserId,
    );
    const voided = await recordPayment(
      ctx.db,
      { jobId: job.id, invoiceId, amountCents: 100000, paidAt: new Date(), method: "other" },
      actorUserId,
    );
    if (!voided.ok) throw new Error("expected ok");
    await voidPayment(ctx.db, voided.paymentId, "Typo'd amount", actorUserId);

    const balance = await getInvoiceBalance(ctx.db, invoiceId);
    expect(balance?.paidCents).toBe(12000); // 5000 + 7000, voided payment excluded
    expect(balance?.totalCents).toBe(20000);
    expect(balance?.balanceCents).toBe(8000);
  });

  it("returns null for a nonexistent invoice", async () => {
    const fakeId = "00000000-0000-0000-0000-000000000000";
    expect(await getInvoiceBalance(ctx.db, fakeId)).toBeNull();
  });
});
