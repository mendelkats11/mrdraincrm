// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createTestDb } from "../helpers/test-db";
import { createJob } from "@/lib/jobs/jobs";
import { getFinancialWidgetExtras } from "@/lib/dashboard/financial-widgets";
import { resolveDateRange } from "@/lib/reports/date-ranges";
import { invoices, payments, sequences, users } from "@/lib/db/schema";

async function seedJobSequence(db: Awaited<ReturnType<typeof createTestDb>>["db"]) {
  await db.insert(sequences).values({ name: "job", prefix: "JOB-", nextNumber: 1, minDigits: 4 });
}

const dateRange = resolveDateRange("custom", { start: "2026-06-01", end: "2026-06-30" });

describe("getFinancialWidgetExtras", () => {
  let ctx: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    ctx = await createTestDb();
    await seedJobSequence(ctx.db);
  });

  afterEach(async () => {
    await ctx.client.close();
  });

  it("sums materials and contractor payouts across active jobs created in range", async () => {
    await createJob(
      ctx.db,
      { status: "completed", materialsCents: 1_000, contractorPayoutCents: 2_000 },
      null,
    );
    await createJob(
      ctx.db,
      { status: "open", materialsCents: 500, contractorPayoutCents: 1_500 },
      null,
    );
    // Draft jobs are excluded, same as the Financial report's default.
    await createJob(
      ctx.db,
      { status: "draft", materialsCents: 9_999, contractorPayoutCents: 9_999 },
      null,
    );

    const result = await getFinancialWidgetExtras(ctx.db, {
      start: new Date(0),
      end: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365),
    });
    expect(result.materialsCents).toBe(1_500);
    expect(result.contractorPayoutCents).toBe(3_500);
  });

  it("returns zero outstanding when there are no jobs in range", async () => {
    const result = await getFinancialWidgetExtras(ctx.db, dateRange);
    expect(result).toEqual({ materialsCents: 0, contractorPayoutCents: 0, outstandingCents: 0 });
  });

  it("sums outstanding invoice balances only for jobs created within the date range", async () => {
    const [user] = await ctx.db
      .insert(users)
      .values({ email: "owner@example.com", passwordHash: "x", name: "Owner" })
      .returning();
    const job = await createJob(ctx.db, { status: "completed" }, null);

    const [invoice] = await ctx.db
      .insert(invoices)
      .values({ invoiceNumber: "INV-0001", jobId: job.id, status: "sent", totalCents: 10_000 })
      .returning();
    await ctx.db.insert(payments).values({
      jobId: job.id,
      invoiceId: invoice.id,
      amountCents: 3_000,
      paidAt: new Date(),
      method: "cash",
      createdBy: user.id,
    });

    const result = await getFinancialWidgetExtras(ctx.db, {
      start: new Date(0),
      end: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365),
    });
    expect(result.outstandingCents).toBe(7_000);
  });
});
