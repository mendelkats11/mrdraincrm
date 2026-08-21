// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createTestDb } from "../helpers/test-db";
import { seedDatabase } from "@/lib/db/seed";
import {
  listActiveHomepageSections,
  listHomepageSections,
  updateHomepageSection,
} from "@/lib/website/homepage";

describe("website homepage sections", () => {
  let ctx: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    ctx = await createTestDb();
    await seedDatabase(ctx.db);
  });

  afterEach(async () => {
    await ctx.client.close();
  });

  it("listActiveHomepageSections excludes a deactivated section", async () => {
    const [hero] = await listHomepageSections(ctx.db);
    await updateHomepageSection(ctx.db, hero.id, { active: false }, null);

    const active = await listActiveHomepageSections(ctx.db);
    expect(active.map((s) => s.id)).not.toContain(hero.id);
  });

  it("updateHomepageSection stores an arbitrary config object", async () => {
    const sections = await listHomepageSections(ctx.db);
    const cta = sections.find((s) => s.sectionType === "cta")!;

    await updateHomepageSection(
      ctx.db,
      cta.id,
      { config: { heading: "Custom heading", body: "Custom body" } },
      null,
    );

    const [updated] = await listHomepageSections(ctx.db).then((rows) =>
      rows.filter((r) => r.id === cta.id),
    );
    expect(updated.config).toEqual({ heading: "Custom heading", body: "Custom body" });
  });

  it("updateHomepageSection can reorder a section", async () => {
    const sections = await listHomepageSections(ctx.db);
    const last = sections[sections.length - 1];

    await updateHomepageSection(ctx.db, last.id, { sortOrder: -1 }, null);

    const reordered = await listHomepageSections(ctx.db);
    expect(reordered[0].id).toBe(last.id);
  });
});
