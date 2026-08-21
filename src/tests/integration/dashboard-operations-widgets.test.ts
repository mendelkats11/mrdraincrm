// @vitest-environment node
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createTestDb } from "../helpers/test-db";
import { createJob } from "@/lib/jobs/jobs";
import { createLead, changeLeadStatus } from "@/lib/crm/leads";
import { createContractor } from "@/lib/contractors/contractors";
import { assignContractor, updateAssignmentStatus } from "@/lib/contractors/assignments";
import { getOperationsWidgetData } from "@/lib/dashboard/operations-widgets";
import { invoices, jobs, payments, sequences, users } from "@/lib/db/schema";

async function seedJobSequence(db: Awaited<ReturnType<typeof createTestDb>>["db"]) {
  await db.insert(sequences).values({ name: "job", prefix: "JOB-", nextNumber: 1, minDigits: 4 });
}

const NOW = new Date("2026-08-20T18:00:00Z"); // ~noon local (America/Regina, fixed UTC-6)

describe("getOperationsWidgetData", () => {
  let ctx: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    ctx = await createTestDb();
    await seedJobSequence(ctx.db);
  });

  afterEach(async () => {
    await ctx.client.close();
  });

  it("counts new leads and open jobs", async () => {
    await createLead(ctx.db, {}, null);
    const contactedLead = await createLead(ctx.db, {}, null);
    await changeLeadStatus(ctx.db, contactedLead.id, "contacted", null);
    await createJob(ctx.db, { status: "open" }, null);
    await createJob(ctx.db, { status: "draft" }, null);

    const data = await getOperationsWidgetData(ctx.db, NOW);
    expect(data.newLeadsCount).toBe(1);
    expect(data.openJobsCount).toBe(1);
  });

  it("lists only today's non-cancelled scheduled jobs", async () => {
    const today = await createJob(ctx.db, { status: "scheduled" }, null);
    await ctx.db
      .update(jobs)
      .set({ scheduledStart: new Date("2026-08-20T20:00:00Z") })
      .where(eq(jobs.id, today.id));

    const tomorrow = await createJob(ctx.db, { status: "scheduled" }, null);
    await ctx.db
      .update(jobs)
      .set({ scheduledStart: new Date("2026-08-21T20:00:00Z") })
      .where(eq(jobs.id, tomorrow.id));

    const cancelledToday = await createJob(ctx.db, { status: "cancelled" }, null);
    await ctx.db
      .update(jobs)
      .set({ scheduledStart: new Date("2026-08-20T15:00:00Z") })
      .where(eq(jobs.id, cancelledToday.id));

    const data = await getOperationsWidgetData(ctx.db, NOW);
    expect(data.todaysJobs.map((j) => j.id)).toEqual([today.id]);
  });

  it("lists active emergency jobs but not completed/cancelled/draft ones", async () => {
    const activeEmergency = await createJob(ctx.db, { status: "open", emergency: true }, null);
    await createJob(ctx.db, { status: "completed", emergency: true }, null);
    await createJob(ctx.db, { status: "draft", emergency: true }, null);
    await createJob(ctx.db, { status: "open", emergency: false }, null);

    const data = await getOperationsWidgetData(ctx.db, NOW);
    expect(data.emergencyJobs.map((j) => j.id)).toEqual([activeEmergency.id]);
  });

  it("sums outstanding invoice balances, excluding paid/void/draft", async () => {
    const [user] = await ctx.db
      .insert(users)
      .values({ email: "owner@example.com", passwordHash: "x", name: "Owner" })
      .returning();
    const job = await createJob(ctx.db, {}, null);

    const [sentUnpaid] = await ctx.db
      .insert(invoices)
      .values({ invoiceNumber: "INV-0001", jobId: job.id, status: "sent", totalCents: 10_000 })
      .returning();
    const [partiallyPaid] = await ctx.db
      .insert(invoices)
      .values({
        invoiceNumber: "INV-0002",
        jobId: job.id,
        status: "partially_paid",
        totalCents: 20_000,
      })
      .returning();
    await ctx.db.insert(payments).values({
      jobId: job.id,
      invoiceId: partiallyPaid.id,
      amountCents: 5_000,
      paidAt: NOW,
      method: "cash",
      createdBy: user.id,
    });
    // Fully paid — must not count toward outstanding.
    const [paid] = await ctx.db
      .insert(invoices)
      .values({ invoiceNumber: "INV-0003", jobId: job.id, status: "paid", totalCents: 15_000 })
      .returning();
    await ctx.db.insert(payments).values({
      jobId: job.id,
      invoiceId: paid.id,
      amountCents: 15_000,
      paidAt: NOW,
      method: "cash",
      createdBy: user.id,
    });
    // Draft — never billed, must not count.
    await ctx.db
      .insert(invoices)
      .values({ invoiceNumber: "INV-0004", jobId: job.id, status: "draft", totalCents: 5_000 });

    void sentUnpaid;
    const data = await getOperationsWidgetData(ctx.db, NOW);
    expect(data.outstandingInvoices).toEqual({ count: 2, totalCents: 10_000 + 15_000 });
  });

  it("sums contractor payouts only for jobs whose current assignment is payout_pending", async () => {
    const bob = await createContractor(ctx.db, { name: "Bob" }, null);
    const pending = await createJob(ctx.db, { contractorPayoutCents: 8_000 }, null);
    await assignContractor(ctx.db, pending.id, bob.id, null);
    await updateAssignmentStatus(ctx.db, pending.id, "payout_pending", null);

    const paid = await createJob(ctx.db, { contractorPayoutCents: 5_000 }, null);
    await assignContractor(ctx.db, paid.id, bob.id, null);
    await updateAssignmentStatus(ctx.db, paid.id, "paid", null);

    // Was payout_pending, then reassigned away — must not still count.
    const jane = await createContractor(ctx.db, { name: "Jane" }, null);
    const reassigned = await createJob(ctx.db, { contractorPayoutCents: 3_000 }, null);
    await assignContractor(ctx.db, reassigned.id, bob.id, null);
    await updateAssignmentStatus(ctx.db, reassigned.id, "payout_pending", null);
    await assignContractor(ctx.db, reassigned.id, jane.id, null);

    const data = await getOperationsWidgetData(ctx.db, NOW);
    expect(data.contractorPayoutsPending).toEqual({ count: 1, totalCents: 8_000 });
  });
});
