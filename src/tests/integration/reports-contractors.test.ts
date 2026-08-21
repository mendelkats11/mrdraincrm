// @vitest-environment node
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createTestDb } from "../helpers/test-db";
import { createJob, addJobCustomCharge } from "@/lib/jobs/jobs";
import { createContractor } from "@/lib/contractors/contractors";
import { assignContractor, updateAssignmentStatus } from "@/lib/contractors/assignments";
import { getContractorsReport } from "@/lib/reports/contractors-report";
import { resolveDateRange } from "@/lib/reports/date-ranges";
import { jobs, sequences } from "@/lib/db/schema";

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

describe("getContractorsReport", () => {
  let ctx: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    ctx = await createTestDb();
    await seedJobSequence(ctx.db);
  });

  afterEach(async () => {
    await ctx.client.close();
  });

  it("returns nothing when no jobs fall in range", async () => {
    const report = await getContractorsReport(ctx.db, { dateRange });
    expect(report.rows).toEqual([]);
  });

  it("reconciles payout/paid/outstanding against a manual sum, scoped to the date range", async () => {
    const bob = await createContractor(ctx.db, { name: "Bob" }, null);
    const paidJob = await createJob(ctx.db, { contractorPayoutCents: 15_000 }, null);
    await setJobCreatedAt(ctx.db, paidJob.id, IN_RANGE);
    await assignContractor(ctx.db, paidJob.id, bob.id, null);
    await updateAssignmentStatus(ctx.db, paidJob.id, "paid", null);

    const pendingJob = await createJob(ctx.db, { contractorPayoutCents: 20_000 }, null);
    await setJobCreatedAt(ctx.db, pendingJob.id, IN_RANGE);
    await assignContractor(ctx.db, pendingJob.id, bob.id, null);
    await updateAssignmentStatus(ctx.db, pendingJob.id, "payout_pending", null);

    const outOfRangeJob = await createJob(ctx.db, { contractorPayoutCents: 99_999 }, null);
    await setJobCreatedAt(ctx.db, outOfRangeJob.id, OUT_OF_RANGE);
    await assignContractor(ctx.db, outOfRangeJob.id, bob.id, null);

    const report = await getContractorsReport(ctx.db, { dateRange });
    expect(report.rows).toHaveLength(1);
    expect(report.rows[0]).toMatchObject({
      contractorId: bob.id,
      contractorName: "Bob",
      jobCount: 2,
      totalPayoutCents: 35_000,
      totalPaidCents: 15_000,
      outstandingPayoutCents: 20_000,
    });
    expect(report.totals.totalPayoutCents).toBe(35_000);
  });

  it("attributes a job to only its current contractor after reassignment", async () => {
    const bob = await createContractor(ctx.db, { name: "Bob" }, null);
    const jane = await createContractor(ctx.db, { name: "Jane" }, null);
    const job = await createJob(ctx.db, { contractorPayoutCents: 10_000 }, null);
    await setJobCreatedAt(ctx.db, job.id, IN_RANGE);
    await assignContractor(ctx.db, job.id, bob.id, null);
    await assignContractor(ctx.db, job.id, jane.id, null);

    const report = await getContractorsReport(ctx.db, { dateRange });
    expect(report.rows.map((r) => r.contractorName)).toEqual(["Jane"]);
    expect(report.rows[0].totalPayoutCents).toBe(10_000);
  });

  it("totalJobValueCents includes custom charges", async () => {
    const bob = await createContractor(ctx.db, { name: "Bob" }, null);
    const job = await createJob(ctx.db, { jobAmountCents: 50_000 }, null);
    await setJobCreatedAt(ctx.db, job.id, IN_RANGE);
    await addJobCustomCharge(ctx.db, job.id, "Extra part", 5_000, null);
    await assignContractor(ctx.db, job.id, bob.id, null);

    const report = await getContractorsReport(ctx.db, { dateRange });
    expect(report.rows[0].totalJobValueCents).toBe(55_000);
  });

  it("filters to a single contractor", async () => {
    const bob = await createContractor(ctx.db, { name: "Bob" }, null);
    const jane = await createContractor(ctx.db, { name: "Jane" }, null);
    const bobsJob = await createJob(ctx.db, {}, null);
    await setJobCreatedAt(ctx.db, bobsJob.id, IN_RANGE);
    await assignContractor(ctx.db, bobsJob.id, bob.id, null);
    const janesJob = await createJob(ctx.db, {}, null);
    await setJobCreatedAt(ctx.db, janesJob.id, IN_RANGE);
    await assignContractor(ctx.db, janesJob.id, jane.id, null);

    const report = await getContractorsReport(ctx.db, { dateRange, contractorId: bob.id });
    expect(report.rows.map((r) => r.contractorName)).toEqual(["Bob"]);
  });
});
