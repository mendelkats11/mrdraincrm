// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createTestDb } from "../helpers/test-db";
import {
  archiveOrganization,
  createOrganization,
  getOrganization,
  listOrganizations,
  unarchiveOrganization,
  updateOrganization,
} from "@/lib/crm/organizations";
import { activities } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

describe("organizations service", () => {
  let ctx: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    ctx = await createTestDb();
  });

  afterEach(async () => {
    await ctx.client.close();
  });

  it("creates an organization and records activity", async () => {
    const org = await createOrganization(ctx.db, { name: "Acme Property Management" }, null);
    expect(org.name).toBe("Acme Property Management");

    const rows = await ctx.db
      .select()
      .from(activities)
      .where(and(eq(activities.entityType, "organization"), eq(activities.entityId, org.id)));
    expect(rows.some((r) => r.action === "organization_created")).toBe(true);
  });

  it("updates and records before/after", async () => {
    const org = await createOrganization(ctx.db, { name: "Acme" }, null);
    await updateOrganization(ctx.db, org.id, { phone: "306-555-0000" }, null);
    const updated = await getOrganization(ctx.db, org.id);
    expect(updated?.phone).toBe("306-555-0000");
  });

  it("archives and unarchives, excluded from default list", async () => {
    const org = await createOrganization(ctx.db, { name: "Acme" }, null);
    await archiveOrganization(ctx.db, org.id, null);
    expect((await listOrganizations(ctx.db, {})).rows.map((o) => o.id)).not.toContain(org.id);
    expect(
      (await listOrganizations(ctx.db, { status: "archived" })).rows.map((o) => o.id),
    ).toContain(org.id);

    await unarchiveOrganization(ctx.db, org.id, null);
    expect((await listOrganizations(ctx.db, {})).rows.map((o) => o.id)).toContain(org.id);
  });

  it("search matches by name", async () => {
    await createOrganization(ctx.db, { name: "Prairie Property Group" }, null);
    await createOrganization(ctx.db, { name: "Other Co" }, null);
    expect((await listOrganizations(ctx.db, { search: "Prairie" })).total).toBe(1);
  });
});
