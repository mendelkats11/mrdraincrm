// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createTestDb } from "../helpers/test-db";
import {
  createServiceArea,
  getServiceAreaBySlug,
  listDistinctServiceAreaRegions,
  listPublishedServiceAreas,
  listServiceAreasForAdmin,
  updateServiceArea,
} from "@/lib/website/service-areas";

describe("website service areas", () => {
  let ctx: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    ctx = await createTestDb();
  });

  afterEach(async () => {
    await ctx.client.close();
  });

  it("creates an area with a generated slug and empty images by default", async () => {
    const area = await createServiceArea(ctx.db, { name: "Stonebridge" }, null);
    expect(area.slug).toBe("stonebridge");
    expect(area.images).toEqual([]);
    expect(area.active).toBe(true);
  });

  it("stores an optional CallRail tracking number", async () => {
    const area = await createServiceArea(
      ctx.db,
      { name: "Warman", callrailTrackingNumber: "+13065551234" },
      null,
    );
    expect(area.callrailTrackingNumber).toBe("+13065551234");
  });

  it("listPublishedServiceAreas excludes inactive areas", async () => {
    const active = await createServiceArea(ctx.db, { name: "Rosewood" }, null);
    const hidden = await createServiceArea(ctx.db, { name: "Brighton" }, null);
    await updateServiceArea(ctx.db, hidden.id, { active: false }, null);

    const rows = await listPublishedServiceAreas(ctx.db);
    expect(rows.map((r) => r.id)).toEqual([active.id]);
  });

  it("updateServiceArea can append to the images array", async () => {
    const area = await createServiceArea(ctx.db, { name: "College Park" }, null);
    await updateServiceArea(
      ctx.db,
      area.id,
      { images: ["public-assets/service-areas/a.jpg", "public-assets/service-areas/b.jpg"] },
      null,
    );

    const updated = await getServiceAreaBySlug(ctx.db, area.slug);
    expect(updated?.images).toEqual([
      "public-assets/service-areas/a.jpg",
      "public-assets/service-areas/b.jpg",
    ]);
  });

  it("getServiceAreaBySlug only returns active areas", async () => {
    const area = await createServiceArea(ctx.db, { name: "Martensville" }, null);
    expect((await getServiceAreaBySlug(ctx.db, area.slug))?.id).toBe(area.id);

    await updateServiceArea(ctx.db, area.id, { active: false }, null);
    expect(await getServiceAreaBySlug(ctx.db, area.slug)).toBeNull();
  });

  it("a hidden area (active: false) can still be created and stores a region — CRM-only attribution without a public page", async () => {
    const area = await createServiceArea(
      ctx.db,
      { name: "White Rock", region: "BC", callrailTrackingNumber: "+16043300939" },
      null,
    );
    await updateServiceArea(ctx.db, area.id, { active: false }, null);

    expect(await getServiceAreaBySlug(ctx.db, area.slug)).toBeNull();
    const [row] = await listServiceAreasForAdmin(ctx.db);
    expect(row).toMatchObject({ name: "White Rock", region: "BC", active: false });
  });

  it("listServiceAreasForAdmin filters by region", async () => {
    await createServiceArea(ctx.db, { name: "Rosewood", region: "SK" }, null);
    await createServiceArea(ctx.db, { name: "Warman", region: "SK" }, null);
    await createServiceArea(ctx.db, { name: "Coquitlam", region: "BC" }, null);

    const skOnly = await listServiceAreasForAdmin(ctx.db, { region: "SK" });
    expect(skOnly.map((a) => a.name).sort()).toEqual(["Rosewood", "Warman"]);

    const all = await listServiceAreasForAdmin(ctx.db);
    expect(all).toHaveLength(3);
  });

  it("listDistinctServiceAreaRegions returns each configured region once, skipping unset ones", async () => {
    await createServiceArea(ctx.db, { name: "Rosewood", region: "SK" }, null);
    await createServiceArea(ctx.db, { name: "Warman", region: "SK" }, null);
    await createServiceArea(ctx.db, { name: "Coquitlam", region: "BC" }, null);
    await createServiceArea(ctx.db, { name: "No Region Set" }, null);

    expect((await listDistinctServiceAreaRegions(ctx.db)).sort()).toEqual(["BC", "SK"]);
  });
});
