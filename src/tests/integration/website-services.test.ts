// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { createTestDb } from "../helpers/test-db";
import {
  createService,
  getService,
  getServiceBySlug,
  listPublishedServices,
  listServicesForAdmin,
  updateService,
} from "@/lib/website/services";
import { activities } from "@/lib/db/schema";

describe("website services", () => {
  let ctx: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    ctx = await createTestDb();
  });

  afterEach(async () => {
    await ctx.client.close();
  });

  it("creates a service with a generated slug and next sortOrder", async () => {
    const a = await createService(ctx.db, { name: "Drain Cleaning" }, null);
    const b = await createService(ctx.db, { name: "Leak Detection" }, null);
    expect(a.slug).toBe("drain-cleaning");
    expect(b.sortOrder).toBe(a.sortOrder + 1);
    expect(a.active).toBe(true);
  });

  it("de-duplicates a slug collision", async () => {
    const a = await createService(ctx.db, { name: "Drain Cleaning" }, null);
    const b = await createService(ctx.db, { name: "Drain Cleaning" }, null);
    expect(a.slug).toBe("drain-cleaning");
    expect(b.slug).toBe("drain-cleaning-2");
  });

  it("records a service_created activity", async () => {
    const service = await createService(ctx.db, { name: "Repiping" }, null);
    const rows = await ctx.db
      .select()
      .from(activities)
      .where(and(eq(activities.entityType, "service"), eq(activities.entityId, service.id)));
    expect(rows.map((r) => r.action)).toContain("service_created");
  });

  it("listPublishedServices excludes inactive services", async () => {
    const active = await createService(ctx.db, { name: "Active Service" }, null);
    const hidden = await createService(ctx.db, { name: "Hidden Service" }, null);
    await updateService(ctx.db, hidden.id, { active: false }, null);

    const rows = await listPublishedServices(ctx.db);
    expect(rows.map((r) => r.id)).toEqual([active.id]);
  });

  it("listServicesForAdmin includes inactive services", async () => {
    const active = await createService(ctx.db, { name: "Active Service" }, null);
    const hidden = await createService(ctx.db, { name: "Hidden Service" }, null);
    await updateService(ctx.db, hidden.id, { active: false }, null);

    const rows = await listServicesForAdmin(ctx.db);
    expect(rows.map((r) => r.id).sort()).toEqual([active.id, hidden.id].sort());
  });

  it("getServiceBySlug only returns active services", async () => {
    const service = await createService(ctx.db, { name: "Sump Pump" }, null);
    expect((await getServiceBySlug(ctx.db, service.slug))?.id).toBe(service.id);

    await updateService(ctx.db, service.id, { active: false }, null);
    expect(await getServiceBySlug(ctx.db, service.slug)).toBeNull();
  });

  it("updateService updates name/description and records old/new values", async () => {
    const service = await createService(ctx.db, { name: "Old Name" }, null);
    await updateService(ctx.db, service.id, { name: "New Name", description: "New desc" }, null);

    const after = await getService(ctx.db, service.id);
    expect(after?.name).toBe("New Name");
    expect(after?.description).toBe("New desc");

    const rows = await ctx.db
      .select()
      .from(activities)
      .where(
        and(
          eq(activities.entityType, "service"),
          eq(activities.entityId, service.id),
          eq(activities.action, "service_updated"),
        ),
      );
    expect(rows[0].oldValue).toMatchObject({ name: "Old Name" });
    expect(rows[0].newValue).toMatchObject({ name: "New Name" });
  });
});
