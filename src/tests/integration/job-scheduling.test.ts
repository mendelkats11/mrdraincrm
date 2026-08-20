// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { createTestDb } from "../helpers/test-db";
import {
  clearJobSchedule,
  createJob,
  getJob,
  listScheduledJobs,
  updateJobSchedule,
} from "@/lib/jobs/jobs";
import { activities, sequences } from "@/lib/db/schema";

async function seedJobSequence(db: Awaited<ReturnType<typeof createTestDb>>["db"]) {
  await db.insert(sequences).values({ name: "job", prefix: "JOB-", nextNumber: 1, minDigits: 4 });
}

describe("updateJobSchedule", () => {
  let ctx: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    ctx = await createTestDb();
    await seedJobSequence(ctx.db);
  });

  afterEach(async () => {
    await ctx.client.close();
  });

  it("schedules an unscheduled job and records job_scheduled", async () => {
    const job = await createJob(ctx.db, {}, null);
    const start = new Date(2026, 7, 19, 10, 30);
    const end = new Date(2026, 7, 19, 12, 0);

    await updateJobSchedule(ctx.db, job.id, { scheduledStart: start, scheduledEnd: end }, null);

    const after = await getJob(ctx.db, job.id);
    expect(after?.scheduledStart).toEqual(start);
    expect(after?.scheduledEnd).toEqual(end);
    expect(after?.timeTbd).toBe(false);
    // Scheduling never touches status.
    expect(after?.status).toBe("draft");

    const rows = await ctx.db
      .select()
      .from(activities)
      .where(and(eq(activities.entityType, "job"), eq(activities.entityId, job.id)));
    expect(rows.map((r) => r.action)).toContain("job_scheduled");
  });

  it("reschedules an already-scheduled job and records job_rescheduled", async () => {
    const job = await createJob(ctx.db, {}, null);
    const firstStart = new Date(2026, 7, 19, 10, 0);
    await updateJobSchedule(ctx.db, job.id, { scheduledStart: firstStart }, null);

    const secondStart = new Date(2026, 7, 20, 14, 0);
    await updateJobSchedule(ctx.db, job.id, { scheduledStart: secondStart }, null);

    const after = await getJob(ctx.db, job.id);
    expect(after?.scheduledStart).toEqual(secondStart);

    const rows = await ctx.db
      .select()
      .from(activities)
      .where(and(eq(activities.entityType, "job"), eq(activities.entityId, job.id)));
    expect(rows.map((r) => r.action)).toContain("job_rescheduled");
  });

  it("toggling Time TBD is visible in the job_scheduled/rescheduled before/after diff", async () => {
    const job = await createJob(ctx.db, {}, null);
    const start = new Date(2026, 7, 19, 10, 0);
    await updateJobSchedule(ctx.db, job.id, { scheduledStart: start, timeTbd: false }, null);
    await updateJobSchedule(ctx.db, job.id, { scheduledStart: start, timeTbd: true }, null);

    const after = await getJob(ctx.db, job.id);
    expect(after?.timeTbd).toBe(true);

    const rows = await ctx.db
      .select()
      .from(activities)
      .where(
        and(
          eq(activities.entityType, "job"),
          eq(activities.entityId, job.id),
          eq(activities.action, "job_rescheduled"),
        ),
      );
    expect(rows[0].oldValue).toMatchObject({ timeTbd: false });
    expect(rows[0].newValue).toMatchObject({ timeTbd: true });
  });

  it("never changes job status", async () => {
    const job = await createJob(ctx.db, { status: "open" }, null);
    await updateJobSchedule(ctx.db, job.id, { scheduledStart: new Date(2026, 7, 19, 10, 0) }, null);
    const after = await getJob(ctx.db, job.id);
    expect(after?.status).toBe("open");
  });
});

describe("clearJobSchedule", () => {
  let ctx: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    ctx = await createTestDb();
    await seedJobSequence(ctx.db);
  });

  afterEach(async () => {
    await ctx.client.close();
  });

  it("clears an existing schedule and records job_schedule_cleared", async () => {
    const job = await createJob(ctx.db, {}, null);
    await updateJobSchedule(
      ctx.db,
      job.id,
      { scheduledStart: new Date(2026, 7, 19, 10, 0), timeTbd: true },
      null,
    );

    await clearJobSchedule(ctx.db, job.id, null);

    const after = await getJob(ctx.db, job.id);
    expect(after?.scheduledStart).toBeNull();
    expect(after?.scheduledEnd).toBeNull();
    expect(after?.timeTbd).toBe(false);

    const rows = await ctx.db
      .select()
      .from(activities)
      .where(
        and(
          eq(activities.entityType, "job"),
          eq(activities.entityId, job.id),
          eq(activities.action, "job_schedule_cleared"),
        ),
      );
    expect(rows).toHaveLength(1);
  });

  it("never changes job status", async () => {
    const job = await createJob(ctx.db, { status: "scheduled" }, null);
    await updateJobSchedule(ctx.db, job.id, { scheduledStart: new Date(2026, 7, 19, 10, 0) }, null);
    await clearJobSchedule(ctx.db, job.id, null);
    const after = await getJob(ctx.db, job.id);
    expect(after?.status).toBe("scheduled");
  });
});

describe("listScheduledJobs", () => {
  let ctx: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    ctx = await createTestDb();
    await seedJobSequence(ctx.db);
  });

  afterEach(async () => {
    await ctx.client.close();
  });

  it("excludes unscheduled jobs entirely", async () => {
    await createJob(ctx.db, {}, null); // never scheduled
    const scheduled = await createJob(ctx.db, {}, null);
    await updateJobSchedule(
      ctx.db,
      scheduled.id,
      { scheduledStart: new Date(2026, 7, 19, 10, 0) },
      null,
    );

    const rows = await listScheduledJobs(ctx.db, {
      start: new Date(2026, 7, 1),
      end: new Date(2026, 8, 1),
    });
    expect(rows.map((r) => r.id)).toEqual([scheduled.id]);
  });

  it("only returns jobs within the given range", async () => {
    const inRange = await createJob(ctx.db, {}, null);
    await updateJobSchedule(
      ctx.db,
      inRange.id,
      { scheduledStart: new Date(2026, 7, 15, 9, 0) },
      null,
    );

    const outOfRange = await createJob(ctx.db, {}, null);
    await updateJobSchedule(
      ctx.db,
      outOfRange.id,
      { scheduledStart: new Date(2026, 8, 15, 9, 0) },
      null,
    );

    const rows = await listScheduledJobs(ctx.db, {
      start: new Date(2026, 7, 1),
      end: new Date(2026, 8, 1),
    });
    expect(rows.map((r) => r.id)).toEqual([inRange.id]);
  });

  it("sorts chronologically by scheduledStart", async () => {
    const later = await createJob(ctx.db, {}, null);
    await updateJobSchedule(
      ctx.db,
      later.id,
      { scheduledStart: new Date(2026, 7, 20, 14, 0) },
      null,
    );
    const earlier = await createJob(ctx.db, {}, null);
    await updateJobSchedule(
      ctx.db,
      earlier.id,
      { scheduledStart: new Date(2026, 7, 15, 9, 0) },
      null,
    );

    const rows = await listScheduledJobs(ctx.db, {
      start: new Date(2026, 7, 1),
      end: new Date(2026, 8, 1),
    });
    expect(rows.map((r) => r.id)).toEqual([earlier.id, later.id]);
  });

  it("includes Time TBD jobs, still scheduled for a real date", async () => {
    const job = await createJob(ctx.db, {}, null);
    await updateJobSchedule(
      ctx.db,
      job.id,
      { scheduledStart: new Date(2026, 7, 19, 0, 0), timeTbd: true },
      null,
    );

    const rows = await listScheduledJobs(ctx.db, {
      start: new Date(2026, 7, 1),
      end: new Date(2026, 8, 1),
    });
    expect(rows.map((r) => r.id)).toContain(job.id);
    expect(rows[0].timeTbd).toBe(true);
  });
});
