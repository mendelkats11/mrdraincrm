// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createTestDb } from "../helpers/test-db";
import { seedDatabase, slugify } from "@/lib/db/seed";
import { appSettings, sequences, serviceAreas, services } from "@/lib/db/schema";

describe("slugify", () => {
  it("lowercases and hyphenates", () => {
    expect(slugify("College Park")).toBe("college-park");
    expect(slugify("Hot Water Tank Replacement")).toBe("hot-water-tank-replacement");
  });
});

describe("seedDatabase", () => {
  let ctx: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    ctx = await createTestDb();
  });

  afterEach(async () => {
    await ctx.client.close();
  });

  it("seeds one settings row, 3 sequences, 6 service areas, and 8 services", async () => {
    const summary = await seedDatabase(ctx.db);
    expect(summary).toEqual({ appSettings: 1, sequences: 3, serviceAreas: 6, services: 8 });

    expect(await ctx.db.select().from(appSettings)).toHaveLength(1);
    expect(await ctx.db.select().from(sequences)).toHaveLength(3);
    expect(await ctx.db.select().from(serviceAreas)).toHaveLength(6);
    expect(await ctx.db.select().from(services)).toHaveLength(8);
  });

  it("does not seed the deferred 12 miscellaneous services", async () => {
    await seedDatabase(ctx.db);
    const rows = await ctx.db.select().from(services);
    // Exactly the 8 named core services from docs/PROJECT_SPEC.md §5 — the
    // remaining 12 are an explicit deferred decision (docs/IMPLEMENTATION_PLAN.md §16).
    expect(rows).toHaveLength(8);
  });

  it("is idempotent — running twice does not duplicate or error", async () => {
    await seedDatabase(ctx.db);
    await expect(seedDatabase(ctx.db)).resolves.toBeDefined();

    expect(await ctx.db.select().from(appSettings)).toHaveLength(1);
    expect(await ctx.db.select().from(sequences)).toHaveLength(3);
    expect(await ctx.db.select().from(serviceAreas)).toHaveLength(6);
    expect(await ctx.db.select().from(services)).toHaveLength(8);
  });

  it("seeds sequences with the expected prefixes starting at 1", async () => {
    await seedDatabase(ctx.db);
    const rows = await ctx.db.select().from(sequences);
    const byName = Object.fromEntries(rows.map((r) => [r.name, r]));
    expect(byName.job).toMatchObject({ prefix: "JOB-", nextNumber: 1, minDigits: 4 });
    expect(byName.invoice).toMatchObject({ prefix: "INV-", nextNumber: 1, minDigits: 4 });
    expect(byName.quote).toMatchObject({ prefix: "QUO-", nextNumber: 1, minDigits: 4 });
  });
});
