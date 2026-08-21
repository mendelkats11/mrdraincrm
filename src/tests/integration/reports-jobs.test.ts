// @vitest-environment node
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createTestDb } from "../helpers/test-db";
import { createJob } from "@/lib/jobs/jobs";
import { createContractor } from "@/lib/contractors/contractors";
import { assignContractor } from "@/lib/contractors/assignments";
import { getJobsReport } from "@/lib/reports/jobs-report";
import { resolveDateRange } from "@/lib/reports/date-ranges";
import { jobs, sequences, services } from "@/lib/db/schema";

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

describe("getJobsReport", () => {
  let ctx: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    ctx = await createTestDb();
    await seedJobSequence(ctx.db);
  });

  afterEach(async () => {
    await ctx.client.close();
  });

  it("only includes jobs created within the date range, including draft/cancelled by default", async () => {
    const inRange = await createJob(ctx.db, { status: "draft" }, null);
    await setJobCreatedAt(ctx.db, inRange.id, IN_RANGE);
    const outOfRange = await createJob(ctx.db, { status: "open" }, null);
    await setJobCreatedAt(ctx.db, outOfRange.id, OUT_OF_RANGE);

    const report = await getJobsReport(ctx.db, { dateRange });
    expect(report.rows.map((r) => r.jobId)).toEqual([inRange.id]);
    expect(report.totalCount).toBe(1);
  });

  it("breaks down by status and by service, and counts emergencies", async () => {
    const [service] = await ctx.db
      .insert(services)
      .values({ name: "Drain Cleaning", slug: "drain-cleaning" })
      .returning();
    const a = await createJob(
      ctx.db,
      { status: "open", serviceId: service.id, emergency: true },
      null,
    );
    await setJobCreatedAt(ctx.db, a.id, IN_RANGE);
    const b = await createJob(ctx.db, { status: "completed" }, null);
    await setJobCreatedAt(ctx.db, b.id, IN_RANGE);

    const report = await getJobsReport(ctx.db, { dateRange });
    expect(report.byStatus).toContainEqual({ status: "open", count: 1 });
    expect(report.byStatus).toContainEqual({ status: "completed", count: 1 });
    expect(report.byService).toContainEqual({ serviceName: "Drain Cleaning", count: 1 });
    expect(report.byService).toContainEqual({ serviceName: "No service selected", count: 1 });
    expect(report.emergencyCount).toBe(1);
  });

  it("filters by status, service, and current contractor", async () => {
    const bob = await createContractor(ctx.db, { name: "Bob" }, null);
    const job = await createJob(ctx.db, { status: "completed" }, null);
    await setJobCreatedAt(ctx.db, job.id, IN_RANGE);
    await assignContractor(ctx.db, job.id, bob.id, null);
    const other = await createJob(ctx.db, { status: "open" }, null);
    await setJobCreatedAt(ctx.db, other.id, IN_RANGE);

    const byStatus = await getJobsReport(ctx.db, { dateRange, status: "completed" });
    expect(byStatus.rows.map((r) => r.jobId)).toEqual([job.id]);

    const byContractor = await getJobsReport(ctx.db, { dateRange, contractorId: bob.id });
    expect(byContractor.rows.map((r) => r.jobId)).toEqual([job.id]);
  });
});
