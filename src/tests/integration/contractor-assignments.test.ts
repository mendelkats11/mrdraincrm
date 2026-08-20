// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { createTestDb } from "../helpers/test-db";
import { createContractor } from "@/lib/contractors/contractors";
import {
  assignContractor,
  checkContractorConflict,
  getCurrentAssignment,
  getCurrentAssignmentsForJobs,
  listAssignmentHistory,
  unassignContractor,
} from "@/lib/contractors/assignments";
import { createJob, updateJobSchedule } from "@/lib/jobs/jobs";
import { activities, jobs, sequences } from "@/lib/db/schema";

async function seedJobSequence(db: Awaited<ReturnType<typeof createTestDb>>["db"]) {
  await db.insert(sequences).values({ name: "job", prefix: "JOB-", nextNumber: 1, minDigits: 4 });
}

describe("assignContractor", () => {
  let ctx: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    ctx = await createTestDb();
    await seedJobSequence(ctx.db);
  });

  afterEach(async () => {
    await ctx.client.close();
  });

  it("assigns a contractor to an unassigned job and records contractor_assigned", async () => {
    const job = await createJob(ctx.db, {}, null);
    const contractor = await createContractor(ctx.db, { name: "Bob" }, null);

    await assignContractor(ctx.db, job.id, contractor.id, null);

    const current = await getCurrentAssignment(ctx.db, job.id);
    expect(current?.contractorId).toBe(contractor.id);
    expect(current?.contractorName).toBe("Bob");

    const rows = await ctx.db
      .select()
      .from(activities)
      .where(
        and(
          eq(activities.entityType, "job"),
          eq(activities.entityId, job.id),
          eq(activities.action, "contractor_assigned"),
        ),
      );
    expect(rows).toHaveLength(1);
  });

  it("re-selecting the same contractor is a no-op — no duplicate history row", async () => {
    const job = await createJob(ctx.db, {}, null);
    const contractor = await createContractor(ctx.db, { name: "Bob" }, null);
    await assignContractor(ctx.db, job.id, contractor.id, null);
    await assignContractor(ctx.db, job.id, contractor.id, null);

    const history = await listAssignmentHistory(ctx.db, job.id);
    expect(history).toHaveLength(1);
  });

  it("reassigning to a different contractor creates a NEW row and leaves the old one untouched", async () => {
    const job = await createJob(ctx.db, {}, null);
    const bob = await createContractor(ctx.db, { name: "Bob" }, null);
    const jane = await createContractor(ctx.db, { name: "Jane" }, null);

    await assignContractor(ctx.db, job.id, bob.id, null);
    const historyAfterFirst = await listAssignmentHistory(ctx.db, job.id);
    const bobRow = historyAfterFirst[0];

    await assignContractor(ctx.db, job.id, jane.id, null);

    const historyAfterSecond = await listAssignmentHistory(ctx.db, job.id);
    expect(historyAfterSecond).toHaveLength(2);
    // The original row for Bob is exactly as it was — never mutated.
    const preservedBobRow = historyAfterSecond.find((r) => r.id === bobRow.id);
    expect(preservedBobRow).toEqual(bobRow);

    const current = await getCurrentAssignment(ctx.db, job.id);
    expect(current?.contractorId).toBe(jane.id);
  });

  it("records contractor_reassigned (not contractor_assigned) when replacing an existing assignment", async () => {
    const job = await createJob(ctx.db, {}, null);
    const bob = await createContractor(ctx.db, { name: "Bob" }, null);
    const jane = await createContractor(ctx.db, { name: "Jane" }, null);
    await assignContractor(ctx.db, job.id, bob.id, null);
    await assignContractor(ctx.db, job.id, jane.id, null);

    const rows = await ctx.db
      .select()
      .from(activities)
      .where(and(eq(activities.entityType, "job"), eq(activities.entityId, job.id)));
    // createJob itself already logs job_created — only the two
    // contractor-related entries matter for this assertion.
    expect(rows.map((r) => r.action).filter((a) => a.startsWith("contractor_"))).toEqual([
      "contractor_assigned",
      "contractor_reassigned",
    ]);
  });
});

describe("unassignContractor", () => {
  let ctx: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    ctx = await createTestDb();
    await seedJobSequence(ctx.db);
  });

  afterEach(async () => {
    await ctx.client.close();
  });

  it("unassigns the current contractor and records contractor_unassigned", async () => {
    const job = await createJob(ctx.db, {}, null);
    const contractor = await createContractor(ctx.db, { name: "Bob" }, null);
    await assignContractor(ctx.db, job.id, contractor.id, null);

    await unassignContractor(ctx.db, job.id, null);

    expect(await getCurrentAssignment(ctx.db, job.id)).toBeNull();

    const rows = await ctx.db
      .select()
      .from(activities)
      .where(
        and(
          eq(activities.entityType, "job"),
          eq(activities.entityId, job.id),
          eq(activities.action, "contractor_unassigned"),
        ),
      );
    expect(rows).toHaveLength(1);
  });

  it("preserves the assigned row in history after unassigning", async () => {
    const job = await createJob(ctx.db, {}, null);
    const contractor = await createContractor(ctx.db, { name: "Bob" }, null);
    await assignContractor(ctx.db, job.id, contractor.id, null);
    await unassignContractor(ctx.db, job.id, null);

    const history = await listAssignmentHistory(ctx.db, job.id);
    expect(history.map((h) => h.status).sort()).toEqual(["assigned", "unassigned"]);
  });

  it("is a no-op when nobody is currently assigned", async () => {
    const job = await createJob(ctx.db, {}, null);
    const result = await unassignContractor(ctx.db, job.id, null);
    expect(result).toBeNull();

    const rows = await ctx.db
      .select()
      .from(activities)
      .where(and(eq(activities.entityType, "job"), eq(activities.entityId, job.id)));
    // Only createJob's own job_created row exists — no contractor_* activity
    // was added for this no-op.
    expect(rows.map((r) => r.action)).toEqual(["job_created"]);
  });
});

describe("getCurrentAssignmentsForJobs (batched)", () => {
  let ctx: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    ctx = await createTestDb();
    await seedJobSequence(ctx.db);
  });

  afterEach(async () => {
    await ctx.client.close();
  });

  it("returns the current contractor for each job, omitting unassigned ones", async () => {
    const jobA = await createJob(ctx.db, {}, null);
    const jobB = await createJob(ctx.db, {}, null);
    const jobC = await createJob(ctx.db, {}, null);
    const bob = await createContractor(ctx.db, { name: "Bob" }, null);

    await assignContractor(ctx.db, jobA.id, bob.id, null);
    await assignContractor(ctx.db, jobB.id, bob.id, null);
    await unassignContractor(ctx.db, jobB.id, null);
    // jobC never assigned at all.

    const map = await getCurrentAssignmentsForJobs(ctx.db, [jobA.id, jobB.id, jobC.id]);
    expect(map.get(jobA.id)).toEqual({ contractorId: bob.id, contractorName: "Bob" });
    expect(map.has(jobB.id)).toBe(false);
    expect(map.has(jobC.id)).toBe(false);
  });

  it("returns an empty map for an empty input", async () => {
    expect((await getCurrentAssignmentsForJobs(ctx.db, [])).size).toBe(0);
  });
});

describe("checkContractorConflict", () => {
  let ctx: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    ctx = await createTestDb();
    await seedJobSequence(ctx.db);
  });

  afterEach(async () => {
    await ctx.client.close();
  });

  it("flags a conflict when the contractor has an overlapping active assignment", async () => {
    const existingJob = await createJob(ctx.db, {}, null);
    await updateJobSchedule(
      ctx.db,
      existingJob.id,
      { scheduledStart: new Date(2026, 7, 19, 10, 0), scheduledEnd: new Date(2026, 7, 19, 12, 0) },
      null,
    );
    const contractor = await createContractor(ctx.db, { name: "Bob" }, null);
    await assignContractor(ctx.db, existingJob.id, contractor.id, null);

    const newJob = await createJob(ctx.db, {}, null);
    const conflict = await checkContractorConflict(
      ctx.db,
      contractor.id,
      {
        scheduledStart: new Date(2026, 7, 19, 11, 0),
        scheduledEnd: new Date(2026, 7, 19, 13, 0),
        timeTbd: false,
      },
      newJob.id,
    );
    expect(conflict?.jobId).toBe(existingJob.id);
    expect(conflict?.jobNumber).toBe(existingJob.jobNumber);
  });

  it("does not flag non-overlapping schedules", async () => {
    const existingJob = await createJob(ctx.db, {}, null);
    await updateJobSchedule(
      ctx.db,
      existingJob.id,
      { scheduledStart: new Date(2026, 7, 19, 8, 0), scheduledEnd: new Date(2026, 7, 19, 9, 0) },
      null,
    );
    const contractor = await createContractor(ctx.db, { name: "Bob" }, null);
    await assignContractor(ctx.db, existingJob.id, contractor.id, null);

    const newJob = await createJob(ctx.db, {}, null);
    const conflict = await checkContractorConflict(
      ctx.db,
      contractor.id,
      {
        scheduledStart: new Date(2026, 7, 19, 11, 0),
        scheduledEnd: new Date(2026, 7, 19, 13, 0),
        timeTbd: false,
      },
      newJob.id,
    );
    expect(conflict).toBeNull();
  });

  it("does not flag jobs on different days", async () => {
    const existingJob = await createJob(ctx.db, {}, null);
    await updateJobSchedule(
      ctx.db,
      existingJob.id,
      { scheduledStart: new Date(2026, 7, 19, 10, 0), scheduledEnd: new Date(2026, 7, 19, 12, 0) },
      null,
    );
    const contractor = await createContractor(ctx.db, { name: "Bob" }, null);
    await assignContractor(ctx.db, existingJob.id, contractor.id, null);

    const newJob = await createJob(ctx.db, {}, null);
    const conflict = await checkContractorConflict(
      ctx.db,
      contractor.id,
      {
        scheduledStart: new Date(2026, 7, 20, 10, 0),
        scheduledEnd: new Date(2026, 7, 20, 12, 0),
        timeTbd: false,
      },
      newJob.id,
    );
    expect(conflict).toBeNull();
  });

  it("applies the 2-hour heuristic to an existing open-ended job", async () => {
    const existingJob = await createJob(ctx.db, {}, null);
    await updateJobSchedule(
      ctx.db,
      existingJob.id,
      { scheduledStart: new Date(2026, 7, 19, 10, 0) },
      null,
    ); // heuristic: 10-12, no end saved
    const contractor = await createContractor(ctx.db, { name: "Bob" }, null);
    await assignContractor(ctx.db, existingJob.id, contractor.id, null);

    const [storedJob] = await ctx.db.select().from(jobs).where(eq(jobs.id, existingJob.id));
    expect(storedJob.scheduledEnd).toBeNull();

    const newJob = await createJob(ctx.db, {}, null);
    const conflict = await checkContractorConflict(
      ctx.db,
      contractor.id,
      {
        scheduledStart: new Date(2026, 7, 19, 11, 0),
        scheduledEnd: new Date(2026, 7, 19, 11, 30),
        timeTbd: false,
      },
      newJob.id,
    );
    expect(conflict?.jobId).toBe(existingJob.id);
  });

  it("never flags a Time TBD target job", async () => {
    const existingJob = await createJob(ctx.db, {}, null);
    await updateJobSchedule(
      ctx.db,
      existingJob.id,
      { scheduledStart: new Date(2026, 7, 19, 10, 0), scheduledEnd: new Date(2026, 7, 19, 12, 0) },
      null,
    );
    const contractor = await createContractor(ctx.db, { name: "Bob" }, null);
    await assignContractor(ctx.db, existingJob.id, contractor.id, null);

    const newJob = await createJob(ctx.db, {}, null);
    const conflict = await checkContractorConflict(
      ctx.db,
      contractor.id,
      {
        scheduledStart: new Date(2026, 7, 19, 11, 0),
        scheduledEnd: new Date(2026, 7, 19, 13, 0),
        timeTbd: true,
      },
      newJob.id,
    );
    expect(conflict).toBeNull();
  });

  it("does not conflict against a job with no schedule at all", async () => {
    const noScheduleJob = await createJob(ctx.db, {}, null);
    const contractor = await createContractor(ctx.db, { name: "Bob" }, null);
    await assignContractor(ctx.db, noScheduleJob.id, contractor.id, null);

    const newJob = await createJob(ctx.db, {}, null);
    const conflict = await checkContractorConflict(
      ctx.db,
      contractor.id,
      {
        scheduledStart: new Date(2026, 7, 19, 11, 0),
        scheduledEnd: new Date(2026, 7, 19, 13, 0),
        timeTbd: false,
      },
      newJob.id,
    );
    expect(conflict).toBeNull();
  });

  it("ignores the target job itself when checking (no self-conflict)", async () => {
    const job = await createJob(ctx.db, {}, null);
    await updateJobSchedule(
      ctx.db,
      job.id,
      { scheduledStart: new Date(2026, 7, 19, 10, 0), scheduledEnd: new Date(2026, 7, 19, 12, 0) },
      null,
    );
    const contractor = await createContractor(ctx.db, { name: "Bob" }, null);
    await assignContractor(ctx.db, job.id, contractor.id, null);

    const conflict = await checkContractorConflict(
      ctx.db,
      contractor.id,
      {
        scheduledStart: new Date(2026, 7, 19, 10, 0),
        scheduledEnd: new Date(2026, 7, 19, 12, 0),
        timeTbd: false,
      },
      job.id,
    );
    expect(conflict).toBeNull();
  });

  it("ignores unassigned (former) assignments when checking for conflicts", async () => {
    const formerJob = await createJob(ctx.db, {}, null);
    await updateJobSchedule(
      ctx.db,
      formerJob.id,
      { scheduledStart: new Date(2026, 7, 19, 10, 0), scheduledEnd: new Date(2026, 7, 19, 12, 0) },
      null,
    );
    const contractor = await createContractor(ctx.db, { name: "Bob" }, null);
    await assignContractor(ctx.db, formerJob.id, contractor.id, null);
    await unassignContractor(ctx.db, formerJob.id, null);

    const newJob = await createJob(ctx.db, {}, null);
    const conflict = await checkContractorConflict(
      ctx.db,
      contractor.id,
      {
        scheduledStart: new Date(2026, 7, 19, 11, 0),
        scheduledEnd: new Date(2026, 7, 19, 13, 0),
        timeTbd: false,
      },
      newJob.id,
    );
    expect(conflict).toBeNull();
  });

  it("never blocks — it only reports; the caller decides whether to proceed", async () => {
    const existingJob = await createJob(ctx.db, {}, null);
    await updateJobSchedule(
      ctx.db,
      existingJob.id,
      { scheduledStart: new Date(2026, 7, 19, 10, 0), scheduledEnd: new Date(2026, 7, 19, 12, 0) },
      null,
    );
    const contractor = await createContractor(ctx.db, { name: "Bob" }, null);
    await assignContractor(ctx.db, existingJob.id, contractor.id, null);

    const newJob = await createJob(ctx.db, {}, null);
    await updateJobSchedule(
      ctx.db,
      newJob.id,
      { scheduledStart: new Date(2026, 7, 19, 11, 0), scheduledEnd: new Date(2026, 7, 19, 13, 0) },
      null,
    );

    // Assigning despite a conflict succeeds unconditionally — the service
    // layer has no "force" flag because it never refuses in the first place.
    const assignment = await assignContractor(ctx.db, newJob.id, contractor.id, null);
    expect(assignment.contractorId).toBe(contractor.id);
  });
});
