// @vitest-environment node
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createTestDb } from "../helpers/test-db";
import { createJob, addJobCustomCharge } from "@/lib/jobs/jobs";
import { createContractor } from "@/lib/contractors/contractors";
import { assignContractor } from "@/lib/contractors/assignments";
import { getFinancialReport } from "@/lib/reports/financial-report";
import { setIncludeTaxInRevenue } from "@/lib/reports/reporting-settings";
import { resolveDateRange } from "@/lib/reports/date-ranges";
import { appSettings, jobs, sequences, services } from "@/lib/db/schema";

async function seedJobSequence(db: Awaited<ReturnType<typeof createTestDb>>["db"]) {
  await db.insert(sequences).values({ name: "job", prefix: "JOB-", nextNumber: 1, minDigits: 4 });
}

async function setJobCreatedAt(
  db: Awaited<ReturnType<typeof createTestDb>>["db"],
  jobId: string,
  createdAt: Date,
) {
  await db.update(jobs).set({ createdAt }).where(eq(jobs.id, jobId));
}

const IN_RANGE = new Date("2026-06-15T18:00:00Z");
const OUT_OF_RANGE = new Date("2026-05-01T18:00:00Z");
const dateRange = resolveDateRange("custom", { start: "2026-06-01", end: "2026-06-30" });

describe("getFinancialReport", () => {
  let ctx: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    ctx = await createTestDb();
    await seedJobSequence(ctx.db);
  });

  afterEach(async () => {
    await ctx.client.close();
  });

  it("only includes jobs whose createdAt falls within the date range", async () => {
    const inRange = await createJob(ctx.db, { status: "completed", jobAmountCents: 10_000 }, null);
    await setJobCreatedAt(ctx.db, inRange.id, IN_RANGE);
    const outOfRange = await createJob(
      ctx.db,
      { status: "completed", jobAmountCents: 99_999 },
      null,
    );
    await setJobCreatedAt(ctx.db, outOfRange.id, OUT_OF_RANGE);

    const report = await getFinancialReport(ctx.db, { dateRange });
    expect(report.rows.map((r) => r.jobId)).toEqual([inRange.id]);
    expect(report.totals.customerTotalCents).toBe(10_000);
  });

  it("excludes draft and cancelled jobs by default", async () => {
    const draft = await createJob(ctx.db, { status: "draft", jobAmountCents: 5_000 }, null);
    await setJobCreatedAt(ctx.db, draft.id, IN_RANGE);
    const cancelled = await createJob(ctx.db, { status: "cancelled", jobAmountCents: 5_000 }, null);
    await setJobCreatedAt(ctx.db, cancelled.id, IN_RANGE);
    const open = await createJob(ctx.db, { status: "open", jobAmountCents: 5_000 }, null);
    await setJobCreatedAt(ctx.db, open.id, IN_RANGE);

    const report = await getFinancialReport(ctx.db, { dateRange });
    expect(report.rows.map((r) => r.jobId)).toEqual([open.id]);
  });

  it("an explicit statuses filter can opt back into draft/cancelled", async () => {
    const cancelled = await createJob(ctx.db, { status: "cancelled", jobAmountCents: 5_000 }, null);
    await setJobCreatedAt(ctx.db, cancelled.id, IN_RANGE);

    const report = await getFinancialReport(ctx.db, { dateRange, statuses: ["cancelled"] });
    expect(report.rows.map((r) => r.jobId)).toEqual([cancelled.id]);
  });

  it("customer total = job amount + tax + custom charges; profit = revenue - materials - payout", async () => {
    const job = await createJob(
      ctx.db,
      {
        status: "completed",
        jobAmountCents: 10_000,
        taxAmountCents: 500,
        materialsCents: 1_000,
        contractorPayoutCents: 2_000,
      },
      null,
    );
    await setJobCreatedAt(ctx.db, job.id, IN_RANGE);
    await addJobCustomCharge(ctx.db, job.id, "Extra fitting", 1_500, null);

    const report = await getFinancialReport(ctx.db, { dateRange });
    expect(report.rows).toHaveLength(1);
    const financials = report.rows[0].financials;
    expect(financials.customerTotalCents).toBe(10_000 + 500 + 1_500);
    expect(financials.revenueCents).toBe(12_000);
    expect(financials.totalCostsCents).toBe(3_000);
    expect(financials.profitCents).toBe(9_000);
  });

  it("excludes tax from revenue/profit when includeTaxInRevenue is set to false", async () => {
    const job = await createJob(
      ctx.db,
      { status: "completed", jobAmountCents: 10_000, taxAmountCents: 1_000 },
      null,
    );
    await setJobCreatedAt(ctx.db, job.id, IN_RANGE);

    let report = await getFinancialReport(ctx.db, { dateRange });
    expect(report.rows[0].financials.revenueCents).toBe(11_000); // default: tax included

    await setIncludeTaxInRevenue(ctx.db, false, null);
    report = await getFinancialReport(ctx.db, { dateRange });
    expect(report.includeTaxInRevenue).toBe(false);
    expect(report.rows[0].financials.revenueCents).toBe(10_000);
    // Customer total is unaffected by the setting either way.
    expect(report.rows[0].financials.customerTotalCents).toBe(11_000);
  });

  it("filters by service", async () => {
    const [service] = await ctx.db
      .insert(services)
      .values({ name: "Drain Cleaning", slug: "drain-cleaning" })
      .returning();
    const matching = await createJob(
      ctx.db,
      { status: "completed", serviceId: service.id, jobAmountCents: 1_000 },
      null,
    );
    await setJobCreatedAt(ctx.db, matching.id, IN_RANGE);
    const other = await createJob(ctx.db, { status: "completed", jobAmountCents: 1_000 }, null);
    await setJobCreatedAt(ctx.db, other.id, IN_RANGE);

    const report = await getFinancialReport(ctx.db, { dateRange, serviceId: service.id });
    expect(report.rows.map((r) => r.jobId)).toEqual([matching.id]);
    expect(report.byService).toEqual([
      { label: "Drain Cleaning", financials: report.totals, jobCount: 1 },
    ]);
  });

  it("filters by the job's current contractor assignment", async () => {
    const bob = await createContractor(ctx.db, { name: "Bob" }, null);
    const jane = await createContractor(ctx.db, { name: "Jane" }, null);
    const bobsJob = await createJob(ctx.db, { status: "completed", jobAmountCents: 1_000 }, null);
    await setJobCreatedAt(ctx.db, bobsJob.id, IN_RANGE);
    await assignContractor(ctx.db, bobsJob.id, bob.id, null);
    const janesJob = await createJob(ctx.db, { status: "completed", jobAmountCents: 1_000 }, null);
    await setJobCreatedAt(ctx.db, janesJob.id, IN_RANGE);
    await assignContractor(ctx.db, janesJob.id, jane.id, null);

    const report = await getFinancialReport(ctx.db, { dateRange, contractorId: bob.id });
    expect(report.rows.map((r) => r.jobId)).toEqual([bobsJob.id]);
    expect(report.rows[0].contractorName).toBe("Bob");
  });

  it("totals reconcile with a manual sum across multiple jobs", async () => {
    const a = await createJob(ctx.db, { status: "completed", jobAmountCents: 10_000 }, null);
    await setJobCreatedAt(ctx.db, a.id, IN_RANGE);
    const b = await createJob(ctx.db, { status: "completed", jobAmountCents: 25_000 }, null);
    await setJobCreatedAt(ctx.db, b.id, IN_RANGE);

    const report = await getFinancialReport(ctx.db, { dateRange });
    expect(report.totals.customerTotalCents).toBe(35_000);
    expect(report.jobCount).toBe(2);
  });

  it("returns an empty report with null margin when no jobs match", async () => {
    const report = await getFinancialReport(ctx.db, { dateRange });
    expect(report.rows).toEqual([]);
    expect(report.totals.profitMarginBasisPoints).toBeNull();
    expect(report.byService).toEqual([]);
    expect(report.byMonth).toEqual([]);
  });

  it("defaults includeTaxInRevenue to true when no settings row exists", async () => {
    expect(await ctx.db.select().from(appSettings)).toHaveLength(0);
    const job = await createJob(
      ctx.db,
      { status: "completed", jobAmountCents: 10_000, taxAmountCents: 1_000 },
      null,
    );
    await setJobCreatedAt(ctx.db, job.id, IN_RANGE);

    const report = await getFinancialReport(ctx.db, { dateRange });
    expect(report.includeTaxInRevenue).toBe(true);
    expect(report.rows[0].financials.revenueCents).toBe(11_000);
  });
});
