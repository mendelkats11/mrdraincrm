// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createTestDb } from "../helpers/test-db";
import { contacts, reviews, jobs, sequences } from "@/lib/db/schema";

describe("schema migrations", () => {
  let ctx: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    ctx = await createTestDb();
  });

  afterEach(async () => {
    await ctx.client.close();
  });

  it("applies all migrations cleanly against a fresh database", async () => {
    // If migrations failed to apply, createTestDb() itself would have
    // thrown. A trivial query against a real table confirms the schema
    // actually exists and is queryable.
    const rows = await ctx.db.select().from(contacts);
    expect(rows).toEqual([]);
  });

  it("enforces the reviews rating CHECK constraint (1-5)", async () => {
    await expect(
      ctx.db.insert(reviews).values({
        customerName: "Test Customer",
        rating: 6,
      }),
    ).rejects.toThrow();

    await expect(
      ctx.db.insert(reviews).values({
        customerName: "Test Customer",
        rating: 0,
      }),
    ).rejects.toThrow();

    // A valid rating succeeds.
    await ctx.db.insert(reviews).values({ customerName: "Test Customer", rating: 5 });
    const rows = await ctx.db.select().from(reviews);
    expect(rows).toHaveLength(1);
  });

  it("enforces uniqueness on jobs.job_number", async () => {
    await ctx.db.insert(jobs).values({
      jobNumber: "JOB-0001",
      taxInclusionMode: "excluded",
    });

    await expect(
      ctx.db.insert(jobs).values({
        jobNumber: "JOB-0001",
        taxInclusionMode: "excluded",
      }),
    ).rejects.toThrow();
  });

  it("enforces the app_settings singleton constraint", async () => {
    const { appSettings } = await import("@/lib/db/schema");
    await ctx.db.insert(appSettings).values({});
    await expect(ctx.db.insert(appSettings).values({})).rejects.toThrow();
  });

  it("seeds no sequences by default (seed script owns that)", async () => {
    const rows = await ctx.db.select().from(sequences);
    expect(rows).toEqual([]);
  });
});
