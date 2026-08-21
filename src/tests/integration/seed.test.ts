// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createTestDb } from "../helpers/test-db";
import { seedDatabase, slugify } from "@/lib/db/seed";
import { appSettings, homepageSections, sequences, serviceAreas, services } from "@/lib/db/schema";

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

  it("seeds one settings row, 3 sequences, 6 service areas, 20 services, and 7 homepage sections", async () => {
    const summary = await seedDatabase(ctx.db);
    expect(summary).toEqual({
      appSettings: 1,
      sequences: 3,
      serviceAreas: 6,
      services: 20,
      homepageSections: 7,
    });

    expect(await ctx.db.select().from(appSettings)).toHaveLength(1);
    expect(await ctx.db.select().from(sequences)).toHaveLength(3);
    expect(await ctx.db.select().from(serviceAreas)).toHaveLength(6);
    expect(await ctx.db.select().from(services)).toHaveLength(20);
    expect(await ctx.db.select().from(homepageSections)).toHaveLength(7);
  });

  it("gives every service area unique, non-templated copy", async () => {
    await seedDatabase(ctx.db);
    const rows = await ctx.db.select().from(serviceAreas);
    const copyTexts = rows.map((r) => r.copy);
    expect(new Set(copyTexts).size).toBe(copyTexts.length);
    for (const copy of copyTexts) {
      expect(copy).toBeTruthy();
    }
  });

  it("is idempotent — running twice does not duplicate or error", async () => {
    await seedDatabase(ctx.db);
    await expect(seedDatabase(ctx.db)).resolves.toBeDefined();

    expect(await ctx.db.select().from(appSettings)).toHaveLength(1);
    expect(await ctx.db.select().from(sequences)).toHaveLength(3);
    expect(await ctx.db.select().from(serviceAreas)).toHaveLength(6);
    expect(await ctx.db.select().from(services)).toHaveLength(20);
    expect(await ctx.db.select().from(homepageSections)).toHaveLength(7);
  });

  it("seeds sequences with the expected prefixes starting at 1", async () => {
    await seedDatabase(ctx.db);
    const rows = await ctx.db.select().from(sequences);
    const byName = Object.fromEntries(rows.map((r) => [r.name, r]));
    expect(byName.job).toMatchObject({ prefix: "JOB-", nextNumber: 1, minDigits: 4 });
    expect(byName.invoice).toMatchObject({ prefix: "INV-", nextNumber: 1, minDigits: 4 });
    expect(byName.quote).toMatchObject({ prefix: "QUO-", nextNumber: 1, minDigits: 4 });
  });

  it("seeds all 7 structured homepage section types exactly once", async () => {
    await seedDatabase(ctx.db);
    const rows = await ctx.db.select().from(homepageSections);
    const types = rows.map((r) => r.sectionType).sort();
    expect(types).toEqual(
      ["cta", "gallery", "hero", "reviews", "service_areas", "services", "why_mr_drain"].sort(),
    );
  });
});
