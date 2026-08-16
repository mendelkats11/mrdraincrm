// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createTestDb } from "../helpers/test-db";
import { allocateSequenceNumber, formatSequenceNumber } from "@/lib/sequences/allocate";
import { sequences } from "@/lib/db/schema";

describe("formatSequenceNumber", () => {
  it("pads to the configured minimum digits", () => {
    expect(formatSequenceNumber("JOB-", 1, 4)).toBe("JOB-0001");
    expect(formatSequenceNumber("INV-", 42, 4)).toBe("INV-0042");
  });

  it("does not truncate numbers wider than the minimum", () => {
    expect(formatSequenceNumber("JOB-", 123456, 4)).toBe("JOB-123456");
  });
});

describe("allocateSequenceNumber", () => {
  let ctx: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    ctx = await createTestDb();
    await ctx.db
      .insert(sequences)
      .values({ name: "job", prefix: "JOB-", nextNumber: 1, minDigits: 4 });
  });

  afterEach(async () => {
    await ctx.client.close();
  });

  it("allocates sequential numbers starting from the configured start", async () => {
    expect(await allocateSequenceNumber(ctx.db, "job")).toBe("JOB-0001");
    expect(await allocateSequenceNumber(ctx.db, "job")).toBe("JOB-0002");
    expect(await allocateSequenceNumber(ctx.db, "job")).toBe("JOB-0003");
  });

  it("throws for an unseeded sequence name", async () => {
    await expect(allocateSequenceNumber(ctx.db, "invoice")).rejects.toThrow(/Unknown sequence/);
  });

  it("never allocates a duplicate number under concurrent callers", async () => {
    // Fire many allocations "simultaneously." The atomic UPDATE...RETURNING
    // pattern (docs/IMPLEMENTATION_PLAN.md §6.4/§7) guarantees correctness
    // under real concurrent connections on Postgres via row-level locking.
    // PGlite processes queries against a single embedded instance, so this
    // exercises the *logical* correctness of the allocation function (no
    // duplicates, no gaps across N calls) rather than true multi-connection
    // lock contention — that needs a real multi-connection Postgres and is
    // out of scope for this in-process test harness.
    const concurrency = 25;
    const results = await Promise.all(
      Array.from({ length: concurrency }, () => allocateSequenceNumber(ctx.db, "job")),
    );

    const unique = new Set(results);
    expect(unique.size).toBe(concurrency);

    const numbers = results.map((r) => Number(r.replace("JOB-", ""))).sort((a, b) => a - b);
    expect(numbers).toEqual(Array.from({ length: concurrency }, (_, i) => i + 1));
  });

  it("respects a non-default prefix and digit width", async () => {
    await ctx.db
      .insert(sequences)
      .values({ name: "invoice", prefix: "INV-", nextNumber: 100, minDigits: 6 });
    expect(await allocateSequenceNumber(ctx.db, "invoice")).toBe("INV-000100");
  });
});
