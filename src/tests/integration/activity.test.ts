// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createTestDb } from "../helpers/test-db";
import { recordActivity } from "@/lib/audit/activity";
import { activities, jobs, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

describe("recordActivity", () => {
  let ctx: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    ctx = await createTestDb();
  });

  afterEach(async () => {
    await ctx.client.close();
  });

  it("appends a row with actor, entity, and before/after values", async () => {
    const [user] = await ctx.db
      .insert(users)
      .values({ email: "owner@example.com", passwordHash: "x", name: "Owner" })
      .returning();
    const [job] = await ctx.db
      .insert(jobs)
      .values({ jobNumber: "JOB-0001", taxInclusionMode: "excluded" })
      .returning();

    await recordActivity(ctx.db, {
      actorUserId: user.id,
      entityType: "job",
      entityId: job.id,
      action: "job_amount_changed",
      oldValue: { jobAmountCents: 0 },
      newValue: { jobAmountCents: 50000 },
    });

    const rows = await ctx.db.select().from(activities).where(eq(activities.entityId, job.id));
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      actorUserId: user.id,
      entityType: "job",
      action: "job_amount_changed",
      oldValue: { jobAmountCents: 0 },
      newValue: { jobAmountCents: 50000 },
    });
  });

  it("allows a null actor for system-generated events", async () => {
    const [job] = await ctx.db
      .insert(jobs)
      .values({ jobNumber: "JOB-0002", taxInclusionMode: "excluded" })
      .returning();

    await recordActivity(ctx.db, {
      entityType: "job",
      entityId: job.id,
      action: "created_from_callrail_webhook",
    });

    const [row] = await ctx.db.select().from(activities).where(eq(activities.entityId, job.id));
    expect(row.actorUserId).toBeNull();
  });

  it("is append-only: rows are never updated by the writer itself", async () => {
    const [job] = await ctx.db
      .insert(jobs)
      .values({ jobNumber: "JOB-0003", taxInclusionMode: "excluded" })
      .returning();

    await recordActivity(ctx.db, { entityType: "job", entityId: job.id, action: "created" });
    await recordActivity(ctx.db, { entityType: "job", entityId: job.id, action: "status_changed" });

    const rows = await ctx.db.select().from(activities).where(eq(activities.entityId, job.id));
    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.action).sort()).toEqual(["created", "status_changed"]);
  });
});
