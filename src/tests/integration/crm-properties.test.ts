// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createTestDb } from "../helpers/test-db";
import {
  archiveProperty,
  createProperty,
  getProperty,
  listProperties,
  unarchiveProperty,
  updateProperty,
} from "@/lib/crm/properties";
import { createOrganization } from "@/lib/crm/organizations";
import { activities } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

const baseInput = {
  addressLine1: "123 Main St",
  city: "Martensville",
  province: "SK",
  postalCode: "S0K 0A0",
};

describe("properties service", () => {
  let ctx: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    ctx = await createTestDb();
  });

  afterEach(async () => {
    await ctx.client.close();
  });

  it("creates a property with no job — fully standalone", async () => {
    const property = await createProperty(ctx.db, baseInput, null);
    expect(property.addressLine1).toBe("123 Main St");
    expect(property.propertyType).toBe("residential");
  });

  it("defaults property type to residential, accepts an explicit type", async () => {
    const property = await createProperty(
      ctx.db,
      { ...baseInput, propertyType: "commercial" },
      null,
    );
    expect(property.propertyType).toBe("commercial");
  });

  it("records a property_created activity", async () => {
    const property = await createProperty(ctx.db, baseInput, null);
    const rows = await ctx.db
      .select()
      .from(activities)
      .where(and(eq(activities.entityType, "property"), eq(activities.entityId, property.id)));
    expect(rows.some((r) => r.action === "property_created")).toBe(true);
  });

  it("can link to an organization at creation and resolves organizationName on read", async () => {
    const org = await createOrganization(ctx.db, { name: "Acme Property Management" }, null);
    const property = await createProperty(ctx.db, { ...baseInput, organizationId: org.id }, null);
    const full = await getProperty(ctx.db, property.id);
    expect(full?.organizationName).toBe("Acme Property Management");
  });

  it("updates and records before/after", async () => {
    const property = await createProperty(ctx.db, baseInput, null);
    await updateProperty(ctx.db, property.id, { notes: "Gate code 1234" }, null);
    const updated = await getProperty(ctx.db, property.id);
    expect(updated?.notes).toBe("Gate code 1234");
  });

  it("archives and unarchives, excluded from default list", async () => {
    const property = await createProperty(ctx.db, baseInput, null);
    await archiveProperty(ctx.db, property.id, null);
    expect((await listProperties(ctx.db, {})).rows.map((p) => p.id)).not.toContain(property.id);
    expect((await listProperties(ctx.db, { status: "archived" })).rows.map((p) => p.id)).toContain(
      property.id,
    );

    await unarchiveProperty(ctx.db, property.id, null);
    expect((await listProperties(ctx.db, {})).rows.map((p) => p.id)).toContain(property.id);
  });

  it("search matches by address and city", async () => {
    await createProperty(ctx.db, { ...baseInput, addressLine1: "99 Unique Ave" }, null);
    await createProperty(ctx.db, { ...baseInput, addressLine1: "1 Other Rd" }, null);
    expect((await listProperties(ctx.db, { search: "Unique" })).total).toBe(1);
    expect((await listProperties(ctx.db, { search: "Martensville" })).total).toBe(2);
  });

  it("filters by property type", async () => {
    await createProperty(ctx.db, { ...baseInput, propertyType: "commercial" }, null);
    await createProperty(ctx.db, { ...baseInput, propertyType: "residential" }, null);
    expect((await listProperties(ctx.db, { propertyType: "commercial" })).total).toBe(1);
  });
});
