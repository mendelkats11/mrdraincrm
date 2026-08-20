// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { createTestDb } from "../helpers/test-db";
import { createContractor, getContractor, searchContractors } from "@/lib/contractors/contractors";
import { activities } from "@/lib/db/schema";
import { normalizePhone } from "@/lib/phone";

describe("createContractor", () => {
  let ctx: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    ctx = await createTestDb();
  });

  afterEach(async () => {
    await ctx.client.close();
  });

  it("creates a contractor with just a name", async () => {
    const contractor = await createContractor(ctx.db, { name: "Bob Builder" }, null);
    expect(contractor.name).toBe("Bob Builder");
    expect(contractor.phone).toBeNull();
    expect(contractor.email).toBeNull();
    expect(contractor.active).toBe(true);
  });

  it("creates a contractor with phone and email", async () => {
    const phone = normalizePhone("306-555-1234")!;
    const contractor = await createContractor(
      ctx.db,
      { name: "Bob Builder", phone, email: "bob@example.com" },
      null,
    );
    expect(contractor.phone).toBe(phone.e164);
    expect(contractor.email).toBe("bob@example.com");
  });

  it("is active by default, with no payout arrangement — a normal record Phase 7 can manage later", async () => {
    const contractor = await createContractor(ctx.db, { name: "Bob Builder" }, null);
    expect(contractor.active).toBe(true);
    expect(contractor.defaultPayoutArrangement).toBeNull();
  });

  it("records a contractor_created activity", async () => {
    const contractor = await createContractor(ctx.db, { name: "Bob Builder" }, null);
    const rows = await ctx.db
      .select()
      .from(activities)
      .where(and(eq(activities.entityType, "contractor"), eq(activities.entityId, contractor.id)));
    expect(rows.map((r) => r.action)).toContain("contractor_created");
  });
});

describe("searchContractors", () => {
  let ctx: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    ctx = await createTestDb();
  });

  afterEach(async () => {
    await ctx.client.close();
  });

  it("returns nothing for an empty query", async () => {
    expect(await searchContractors(ctx.db, "")).toEqual([]);
  });

  it("finds a contractor by partial name match", async () => {
    const contractor = await createContractor(ctx.db, { name: "Bob Builder" }, null);
    const results = await searchContractors(ctx.db, "bob");
    expect(results.map((r) => r.id)).toContain(contractor.id);
  });
});

describe("getContractor", () => {
  let ctx: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    ctx = await createTestDb();
  });

  afterEach(async () => {
    await ctx.client.close();
  });

  it("returns null for a nonexistent contractor", async () => {
    const fakeId = "00000000-0000-0000-0000-000000000000";
    expect(await getContractor(ctx.db, fakeId)).toBeNull();
  });

  it("returns the full contractor record", async () => {
    const created = await createContractor(ctx.db, { name: "Bob Builder" }, null);
    const fetched = await getContractor(ctx.db, created.id);
    expect(fetched?.name).toBe("Bob Builder");
  });
});
