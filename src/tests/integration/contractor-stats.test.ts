// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createTestDb } from "../helpers/test-db";
import { createContractor, setContractorActive } from "@/lib/contractors/contractors";
import {
  assignContractor,
  getContractorStats,
  listJobsForContractor,
  updateAssignmentStatus,
} from "@/lib/contractors/assignments";
import { addJobCustomCharge, createJob } from "@/lib/jobs/jobs";
import { appSettings, sequences } from "@/lib/db/schema";

async function seedJobSequence(db: Awaited<ReturnType<typeof createTestDb>>["db"]) {
  await db.insert(sequences).values({ name: "job", prefix: "JOB-", nextNumber: 1, minDigits: 4 });
}

describe("getContractorStats", () => {
  let ctx: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    ctx = await createTestDb();
    await seedJobSequence(ctx.db);
  });

  afterEach(async () => {
    await ctx.client.close();
  });

  it("returns all zeros for a contractor with no jobs", async () => {
    const contractor = await createContractor(ctx.db, { name: "Bob" }, null);
    const stats = await getContractorStats(ctx.db, contractor.id);
    expect(stats).toEqual({
      jobsCompleted: 0,
      totalJobValueCents: 0,
      totalPayoutCents: 0,
      totalPaidCents: 0,
      outstandingPayoutCents: 0,
    });
  });

  it("reconciles totalPayoutCents against a manual sum over fixture jobs", async () => {
    const contractor = await createContractor(ctx.db, { name: "Bob" }, null);
    const jobA = await createJob(ctx.db, { contractorPayoutCents: 10_000 }, null);
    const jobB = await createJob(ctx.db, { contractorPayoutCents: 25_000 }, null);
    await assignContractor(ctx.db, jobA.id, contractor.id, null);
    await assignContractor(ctx.db, jobB.id, contractor.id, null);

    const stats = await getContractorStats(ctx.db, contractor.id);
    expect(stats.totalPayoutCents).toBe(10_000 + 25_000);
  });

  it("counts jobsCompleted using the assignment's own status, independent of job status", async () => {
    const contractor = await createContractor(ctx.db, { name: "Bob" }, null);
    const stillOpenJob = await createJob(ctx.db, { status: "open" }, null);
    const completedStageJob = await createJob(ctx.db, { status: "open" }, null); // job itself never marked "completed"
    await assignContractor(ctx.db, stillOpenJob.id, contractor.id, null);
    await assignContractor(ctx.db, completedStageJob.id, contractor.id, null);
    await updateAssignmentStatus(ctx.db, completedStageJob.id, "completed", null);

    const stats = await getContractorStats(ctx.db, contractor.id);
    // Only the one whose ASSIGNMENT reached "completed" counts, regardless
    // of the job's own status field.
    expect(stats.jobsCompleted).toBe(1);
  });

  it("totalPaidCents only counts assignments marked 'paid'", async () => {
    const contractor = await createContractor(ctx.db, { name: "Bob" }, null);
    const paidJob = await createJob(ctx.db, { contractorPayoutCents: 15_000 }, null);
    const pendingJob = await createJob(ctx.db, { contractorPayoutCents: 20_000 }, null);
    await assignContractor(ctx.db, paidJob.id, contractor.id, null);
    await assignContractor(ctx.db, pendingJob.id, contractor.id, null);
    await updateAssignmentStatus(ctx.db, paidJob.id, "paid", null);
    await updateAssignmentStatus(ctx.db, pendingJob.id, "payout_pending", null);

    const stats = await getContractorStats(ctx.db, contractor.id);
    expect(stats.totalPaidCents).toBe(15_000);
    expect(stats.totalPayoutCents).toBe(15_000 + 20_000);
    expect(stats.outstandingPayoutCents).toBe(20_000);
  });

  it("a job reassigned away from this contractor no longer counts in their totals", async () => {
    const bob = await createContractor(ctx.db, { name: "Bob" }, null);
    const jane = await createContractor(ctx.db, { name: "Jane" }, null);
    const job = await createJob(ctx.db, { contractorPayoutCents: 10_000 }, null);

    await assignContractor(ctx.db, job.id, bob.id, null);
    let bobStats = await getContractorStats(ctx.db, bob.id);
    expect(bobStats.totalPayoutCents).toBe(10_000);

    // Reassign to Jane — the job's payout must move with it, not be
    // double-counted on both contractors.
    await assignContractor(ctx.db, job.id, jane.id, null);

    bobStats = await getContractorStats(ctx.db, bob.id);
    const janeStats = await getContractorStats(ctx.db, jane.id);
    expect(bobStats.totalPayoutCents).toBe(0);
    expect(janeStats.totalPayoutCents).toBe(10_000);
  });

  it("totalJobValueCents includes custom charges", async () => {
    const contractor = await createContractor(ctx.db, { name: "Bob" }, null);
    const job = await createJob(ctx.db, { jobAmountCents: 50_000 }, null);
    await addJobCustomCharge(ctx.db, job.id, "Extra part", 5_000, null);
    await addJobCustomCharge(ctx.db, job.id, "Discount", -1_000, null);
    await assignContractor(ctx.db, job.id, contractor.id, null);

    const stats = await getContractorStats(ctx.db, contractor.id);
    expect(stats.totalJobValueCents).toBe(50_000 + 5_000 - 1_000);
  });

  it("totalJobValueCents includes tax only when the job's own taxInclusionMode snapshot is 'included'", async () => {
    const contractor = await createContractor(ctx.db, { name: "Bob" }, null);

    // Default settings row -> taxInclusionMode "excluded".
    const excludedJob = await createJob(
      ctx.db,
      { jobAmountCents: 10_000, taxAmountCents: 1_300 },
      null,
    );
    await assignContractor(ctx.db, excludedJob.id, contractor.id, null);

    let stats = await getContractorStats(ctx.db, contractor.id);
    expect(stats.totalJobValueCents).toBe(10_000);

    // A second job created after flipping the default to "included" should
    // add its tax to the total.
    await ctx.db.insert(appSettings).values({ taxInclusionDefault: "included" });
    const includedJob = await createJob(
      ctx.db,
      { jobAmountCents: 20_000, taxAmountCents: 2_600 },
      null,
    );
    await assignContractor(ctx.db, includedJob.id, contractor.id, null);

    stats = await getContractorStats(ctx.db, contractor.id);
    expect(stats.totalJobValueCents).toBe(10_000 + (20_000 + 2_600));
  });

  it("still computes correctly for a deactivated contractor", async () => {
    const contractor = await createContractor(ctx.db, { name: "Bob" }, null);
    const job = await createJob(ctx.db, { contractorPayoutCents: 10_000 }, null);
    await assignContractor(ctx.db, job.id, contractor.id, null);
    await setContractorActive(ctx.db, contractor.id, false, null);

    const stats = await getContractorStats(ctx.db, contractor.id);
    expect(stats.totalPayoutCents).toBe(10_000);
  });
});

describe("listJobsForContractor", () => {
  let ctx: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    ctx = await createTestDb();
    await seedJobSequence(ctx.db);
  });

  afterEach(async () => {
    await ctx.client.close();
  });

  it("returns an empty array for a contractor with no jobs", async () => {
    const contractor = await createContractor(ctx.db, { name: "Bob" }, null);
    expect(await listJobsForContractor(ctx.db, contractor.id)).toEqual([]);
  });

  it("lists current-assignment jobs with status and payout", async () => {
    const contractor = await createContractor(ctx.db, { name: "Bob" }, null);
    const job = await createJob(ctx.db, { contractorPayoutCents: 12_000 }, null);
    await assignContractor(ctx.db, job.id, contractor.id, null);
    await updateAssignmentStatus(ctx.db, job.id, "payout_pending", null);

    const rows = await listJobsForContractor(ctx.db, contractor.id);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      jobId: job.id,
      jobNumber: job.jobNumber,
      assignmentStatus: "payout_pending",
      contractorPayoutCents: 12_000,
      paidAt: null,
    });
  });

  it("excludes a job the contractor has been unassigned from", async () => {
    const contractor = await createContractor(ctx.db, { name: "Bob" }, null);
    const job = await createJob(ctx.db, {}, null);
    await assignContractor(ctx.db, job.id, contractor.id, null);

    const { unassignContractor } = await import("@/lib/contractors/assignments");
    await unassignContractor(ctx.db, job.id, null);

    expect(await listJobsForContractor(ctx.db, contractor.id)).toEqual([]);
  });

  it("excludes a job reassigned to a different contractor", async () => {
    const bob = await createContractor(ctx.db, { name: "Bob" }, null);
    const jane = await createContractor(ctx.db, { name: "Jane" }, null);
    const job = await createJob(ctx.db, {}, null);
    await assignContractor(ctx.db, job.id, bob.id, null);
    await assignContractor(ctx.db, job.id, jane.id, null);

    expect(await listJobsForContractor(ctx.db, bob.id)).toEqual([]);
    const janeRows = await listJobsForContractor(ctx.db, jane.id);
    expect(janeRows.map((r) => r.jobId)).toEqual([job.id]);
  });
});
