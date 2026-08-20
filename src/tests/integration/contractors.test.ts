// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { createTestDb } from "../helpers/test-db";
import {
  createContractor,
  getContractor,
  listContractors,
  searchContractors,
  setContractorActive,
  updateContractor,
} from "@/lib/contractors/contractors";
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

  it("is active by default, with no notes or payout arrangement unless provided", async () => {
    const contractor = await createContractor(ctx.db, { name: "Bob Builder" }, null);
    expect(contractor.active).toBe(true);
    expect(contractor.notes).toBeNull();
    expect(contractor.defaultPayoutArrangement).toBeNull();
  });

  it("accepts notes and a default payout arrangement", async () => {
    const contractor = await createContractor(
      ctx.db,
      { name: "Bob Builder", notes: "Reliable, does weekends", defaultPayoutArrangement: "60/40" },
      null,
    );
    expect(contractor.notes).toBe("Reliable, does weekends");
    expect(contractor.defaultPayoutArrangement).toBe("60/40");
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

describe("updateContractor", () => {
  let ctx: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    ctx = await createTestDb();
  });

  afterEach(async () => {
    await ctx.client.close();
  });

  it("updates name/phone/email/notes/defaultPayoutArrangement", async () => {
    const contractor = await createContractor(ctx.db, { name: "Bob Builder" }, null);
    const phone = normalizePhone("306-555-1234")!;

    const updated = await updateContractor(
      ctx.db,
      contractor.id,
      {
        name: "Bob B. Builder",
        phone,
        email: "bob@example.com",
        notes: "Great with tricky jobs",
        defaultPayoutArrangement: "60/40",
      },
      null,
    );

    expect(updated.name).toBe("Bob B. Builder");
    expect(updated.phone).toBe(phone.e164);
    expect(updated.email).toBe("bob@example.com");
    expect(updated.notes).toBe("Great with tricky jobs");
    expect(updated.defaultPayoutArrangement).toBe("60/40");
  });

  it("records contractor_updated with before/after values", async () => {
    const contractor = await createContractor(ctx.db, { name: "Bob Builder" }, null);
    await updateContractor(ctx.db, contractor.id, { name: "Robert Builder" }, null);

    const rows = await ctx.db
      .select()
      .from(activities)
      .where(
        and(
          eq(activities.entityType, "contractor"),
          eq(activities.entityId, contractor.id),
          eq(activities.action, "contractor_updated"),
        ),
      );
    expect(rows).toHaveLength(1);
    expect(rows[0].oldValue).toMatchObject({ name: "Bob Builder" });
    expect(rows[0].newValue).toMatchObject({ name: "Robert Builder" });
  });

  it("throws for a nonexistent contractor", async () => {
    const fakeId = "00000000-0000-0000-0000-000000000000";
    await expect(updateContractor(ctx.db, fakeId, { name: "Nobody" }, null)).rejects.toThrow();
  });
});

describe("setContractorActive", () => {
  let ctx: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    ctx = await createTestDb();
  });

  afterEach(async () => {
    await ctx.client.close();
  });

  it("deactivates a contractor and records contractor_deactivated", async () => {
    const contractor = await createContractor(ctx.db, { name: "Bob Builder" }, null);
    const updated = await setContractorActive(ctx.db, contractor.id, false, null);
    expect(updated.active).toBe(false);

    const rows = await ctx.db
      .select()
      .from(activities)
      .where(and(eq(activities.entityType, "contractor"), eq(activities.entityId, contractor.id)));
    expect(rows.map((r) => r.action)).toContain("contractor_deactivated");
  });

  it("reactivates a contractor and records contractor_activated", async () => {
    const contractor = await createContractor(ctx.db, { name: "Bob Builder" }, null);
    await setContractorActive(ctx.db, contractor.id, false, null);
    const updated = await setContractorActive(ctx.db, contractor.id, true, null);
    expect(updated.active).toBe(true);

    const rows = await ctx.db
      .select()
      .from(activities)
      .where(and(eq(activities.entityType, "contractor"), eq(activities.entityId, contractor.id)));
    expect(rows.map((r) => r.action)).toContain("contractor_activated");
  });

  it("a deactivated contractor no longer appears in searchContractors", async () => {
    const contractor = await createContractor(ctx.db, { name: "Bob Builder" }, null);
    await setContractorActive(ctx.db, contractor.id, false, null);
    const results = await searchContractors(ctx.db, "bob");
    expect(results.map((r) => r.id)).not.toContain(contractor.id);
  });
});

describe("listContractors", () => {
  let ctx: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    ctx = await createTestDb();
  });

  afterEach(async () => {
    await ctx.client.close();
  });

  it("defaults to active contractors only", async () => {
    const active = await createContractor(ctx.db, { name: "Active Bob" }, null);
    const inactive = await createContractor(ctx.db, { name: "Inactive Jane" }, null);
    await setContractorActive(ctx.db, inactive.id, false, null);

    const { rows } = await listContractors(ctx.db);
    const ids = rows.map((r) => r.id);
    expect(ids).toContain(active.id);
    expect(ids).not.toContain(inactive.id);
  });

  it("status: 'inactive' returns only inactive contractors", async () => {
    const active = await createContractor(ctx.db, { name: "Active Bob" }, null);
    const inactive = await createContractor(ctx.db, { name: "Inactive Jane" }, null);
    await setContractorActive(ctx.db, inactive.id, false, null);

    const { rows } = await listContractors(ctx.db, { status: "inactive" });
    const ids = rows.map((r) => r.id);
    expect(ids).toContain(inactive.id);
    expect(ids).not.toContain(active.id);
  });

  it("status: 'all' returns both", async () => {
    const active = await createContractor(ctx.db, { name: "Active Bob" }, null);
    const inactive = await createContractor(ctx.db, { name: "Inactive Jane" }, null);
    await setContractorActive(ctx.db, inactive.id, false, null);

    const { rows } = await listContractors(ctx.db, { status: "all" });
    const ids = rows.map((r) => r.id);
    expect(ids).toContain(active.id);
    expect(ids).toContain(inactive.id);
  });

  it("search matches by name", async () => {
    await createContractor(ctx.db, { name: "Bob Builder" }, null);
    await createContractor(ctx.db, { name: "Jane Plumber" }, null);

    const { rows } = await listContractors(ctx.db, { search: "bob" });
    expect(rows.map((r) => r.name)).toEqual(["Bob Builder"]);
  });
});
