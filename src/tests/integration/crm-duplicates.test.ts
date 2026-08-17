// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createTestDb } from "../helpers/test-db";
import { createContact, archiveContact } from "@/lib/crm/contacts";
import { findDuplicateContacts } from "@/lib/crm/duplicates";
import { normalizePhone } from "@/lib/phone";

describe("findDuplicateContacts", () => {
  let ctx: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    ctx = await createTestDb();
  });

  afterEach(async () => {
    await ctx.client.close();
  });

  it("flags an exact phone match", async () => {
    const phone = normalizePhone("306-555-1111")!;
    const a = await createContact(ctx.db, { displayName: "Jon Doe", phone }, null);
    const b = await createContact(
      ctx.db,
      { displayName: "Completely Different Name", phone },
      null,
    );

    const results = await findDuplicateContacts(ctx.db, a.id);
    expect(results).toHaveLength(1);
    expect(results[0].contactId).toBe(b.id);
    expect(results[0].matchReasons).toContain("phone");
  });

  it("flags an exact email match", async () => {
    const a = await createContact(
      ctx.db,
      { displayName: "Jon Doe", email: "shared@example.com" },
      null,
    );
    const b = await createContact(
      ctx.db,
      { displayName: "Someone Else", email: "shared@example.com" },
      null,
    );

    const results = await findDuplicateContacts(ctx.db, a.id);
    expect(results.map((r) => r.contactId)).toContain(b.id);
    expect(results.find((r) => r.contactId === b.id)?.matchReasons).toContain("email");
  });

  it("flags a similar (near-typo) name", async () => {
    const a = await createContact(ctx.db, { displayName: "Jonathan Robertson" }, null);
    const b = await createContact(ctx.db, { displayName: "Jonathon Robertson" }, null);

    const results = await findDuplicateContacts(ctx.db, a.id);
    expect(results.map((r) => r.contactId)).toContain(b.id);
    expect(results.find((r) => r.contactId === b.id)?.matchReasons).toContain("similar_name");
  });

  it("does not flag an unrelated contact", async () => {
    const a = await createContact(
      ctx.db,
      { displayName: "Jon Doe", email: "jon@example.com" },
      null,
    );
    await createContact(
      ctx.db,
      { displayName: "Totally Unrelated Person", email: "other@example.com" },
      null,
    );

    expect(await findDuplicateContacts(ctx.db, a.id)).toHaveLength(0);
  });

  it("excludes archived contacts from results", async () => {
    const a = await createContact(
      ctx.db,
      { displayName: "Jon Doe", email: "shared@example.com" },
      null,
    );
    const b = await createContact(
      ctx.db,
      { displayName: "Someone Else", email: "shared@example.com" },
      null,
    );
    await archiveContact(ctx.db, b.id, null);

    expect(await findDuplicateContacts(ctx.db, a.id)).toHaveLength(0);
  });

  it("combines multiple match reasons for the same candidate", async () => {
    const phone = normalizePhone("306-555-2222")!;
    const a = await createContact(
      ctx.db,
      { displayName: "Jonathan Lee", phone, email: "jlee@example.com" },
      null,
    );
    const b = await createContact(
      ctx.db,
      { displayName: "Jonathon Lee", phone, email: "jlee@example.com" },
      null,
    );

    const results = await findDuplicateContacts(ctx.db, a.id);
    const match = results.find((r) => r.contactId === b.id);
    expect(match?.matchReasons.sort()).toEqual(["email", "phone", "similar_name"]);
  });

  it("returns an empty list for a contact with no phone/email/similar names", async () => {
    const a = await createContact(ctx.db, { displayName: "Zzyzx Q. Uniquename" }, null);
    expect(await findDuplicateContacts(ctx.db, a.id)).toHaveLength(0);
  });

  it("never merges anything — purely a read-side suggestion", async () => {
    const phone = normalizePhone("306-555-3333")!;
    const a = await createContact(ctx.db, { displayName: "Jon Doe", phone }, null);
    await createContact(ctx.db, { displayName: "Jon Doe Duplicate", phone }, null);

    const results = await findDuplicateContacts(ctx.db, a.id);
    expect(results.length).toBeGreaterThan(0);
    // Both contacts still independently exist and are unarchived.
    const { listContacts } = await import("@/lib/crm/contacts");
    const all = await listContacts(ctx.db, {});
    expect(all.total).toBe(2);
  });
});
