// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { createTestDb } from "../helpers/test-db";
import { createContractor } from "@/lib/contractors/contractors";
import {
  assignContractor,
  getCurrentAssignment,
  listAssignmentHistory,
  updateAssignmentStatus,
} from "@/lib/contractors/assignments";
import { createJob } from "@/lib/jobs/jobs";
import { activities, jobContractorAssignments, jobs, sequences } from "@/lib/db/schema";

async function seedJobSequence(db: Awaited<ReturnType<typeof createTestDb>>["db"]) {
  await db.insert(sequences).values({ name: "job", prefix: "JOB-", nextNumber: 1, minDigits: 4 });
}

describe("updateAssignmentStatus", () => {
  let ctx: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    ctx = await createTestDb();
    await seedJobSequence(ctx.db);
  });

  afterEach(async () => {
    await ctx.client.close();
  });

  it("advances the current assignment's status in place, not via a new row", async () => {
    const job = await createJob(ctx.db, {}, null);
    const contractor = await createContractor(ctx.db, { name: "Bob" }, null);
    await assignContractor(ctx.db, job.id, contractor.id, null);

    const result = await updateAssignmentStatus(ctx.db, job.id, "completed", null);
    expect(result.ok).toBe(true);

    const current = await getCurrentAssignment(ctx.db, job.id);
    expect(current?.status).toBe("completed");

    // Still exactly one row — status was updated in place, not appended.
    const history = await listAssignmentHistory(ctx.db, job.id);
    expect(history).toHaveLength(1);
  });

  it("supports free transitions in either direction — no state machine", async () => {
    const job = await createJob(ctx.db, {}, null);
    const contractor = await createContractor(ctx.db, { name: "Bob" }, null);
    await assignContractor(ctx.db, job.id, contractor.id, null);

    await updateAssignmentStatus(ctx.db, job.id, "paid", null);
    expect((await getCurrentAssignment(ctx.db, job.id))?.status).toBe("paid");

    // Moving backward (e.g. correcting a mistake) is allowed.
    await updateAssignmentStatus(ctx.db, job.id, "payout_pending", null);
    expect((await getCurrentAssignment(ctx.db, job.id))?.status).toBe("payout_pending");
  });

  it("sets paidAt when entering 'paid' and clears it when leaving", async () => {
    const job = await createJob(ctx.db, {}, null);
    const contractor = await createContractor(ctx.db, { name: "Bob" }, null);
    await assignContractor(ctx.db, job.id, contractor.id, null);

    await updateAssignmentStatus(ctx.db, job.id, "paid", null);
    const [paidRow] = await ctx.db
      .select()
      .from(jobContractorAssignments)
      .where(eq(jobContractorAssignments.jobId, job.id));
    expect(paidRow.paidAt).not.toBeNull();

    await updateAssignmentStatus(ctx.db, job.id, "completed", null);
    const [revertedRow] = await ctx.db
      .select()
      .from(jobContractorAssignments)
      .where(eq(jobContractorAssignments.jobId, job.id));
    expect(revertedRow.paidAt).toBeNull();
  });

  it("records contractor_status_changed with old/new status", async () => {
    const job = await createJob(ctx.db, {}, null);
    const contractor = await createContractor(ctx.db, { name: "Bob" }, null);
    await assignContractor(ctx.db, job.id, contractor.id, null);

    await updateAssignmentStatus(ctx.db, job.id, "completed", null);

    const rows = await ctx.db
      .select()
      .from(activities)
      .where(
        and(
          eq(activities.entityType, "job"),
          eq(activities.entityId, job.id),
          eq(activities.action, "contractor_status_changed"),
        ),
      );
    expect(rows).toHaveLength(1);
    expect(rows[0].oldValue).toEqual({ status: "assigned" });
    expect(rows[0].newValue).toEqual({ status: "completed" });
  });

  it("is a no-op (typed failure) when nobody is currently assigned", async () => {
    const job = await createJob(ctx.db, {}, null);
    const result = await updateAssignmentStatus(ctx.db, job.id, "completed", null);
    expect(result).toEqual({ ok: false, error: "no_current_assignment" });
  });

  it("never changes contractorId or the job's own status", async () => {
    const job = await createJob(ctx.db, { status: "open" }, null);
    const contractor = await createContractor(ctx.db, { name: "Bob" }, null);
    await assignContractor(ctx.db, job.id, contractor.id, null);

    await updateAssignmentStatus(ctx.db, job.id, "paid", null);

    const current = await getCurrentAssignment(ctx.db, job.id);
    expect(current?.contractorId).toBe(contractor.id);

    const [storedJob] = await ctx.db.select().from(jobs).where(eq(jobs.id, job.id));
    expect(storedJob.status).toBe("open");
  });

  it("re-setting the same status is a no-op that does not record a duplicate activity", async () => {
    const job = await createJob(ctx.db, {}, null);
    const contractor = await createContractor(ctx.db, { name: "Bob" }, null);
    await assignContractor(ctx.db, job.id, contractor.id, null);

    await updateAssignmentStatus(ctx.db, job.id, "completed", null);
    await updateAssignmentStatus(ctx.db, job.id, "completed", null);

    const rows = await ctx.db
      .select()
      .from(activities)
      .where(
        and(
          eq(activities.entityType, "job"),
          eq(activities.entityId, job.id),
          eq(activities.action, "contractor_status_changed"),
        ),
      );
    expect(rows).toHaveLength(1);
  });
});
