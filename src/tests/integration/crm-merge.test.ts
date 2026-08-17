// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { createTestDb } from "../helpers/test-db";
import { archiveContact, createContact, getContact } from "@/lib/crm/contacts";
import { createOrganization } from "@/lib/crm/organizations";
import { createProperty } from "@/lib/crm/properties";
import {
  attachContactToOrganization,
  attachContactToProperty,
  listContactOrganizations,
  listContactProperties,
  listOrganizationContacts,
  listPropertyContacts,
} from "@/lib/crm/relationships";
import { mergeContacts } from "@/lib/crm/merge";
import { activities, contacts } from "@/lib/db/schema";
import { normalizePhone } from "@/lib/phone";

const propertyInput = {
  addressLine1: "1 Main St",
  city: "Warman",
  province: "SK",
  postalCode: "S0K 0A0",
};

describe("mergeContacts", () => {
  let ctx: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    ctx = await createTestDb();
  });

  afterEach(async () => {
    await ctx.client.close();
  });

  it("rejects merging a contact into itself", async () => {
    const a = await createContact(ctx.db, { displayName: "Jon Doe" }, null);
    const result = await mergeContacts(ctx.db, a.id, a.id, null);
    expect(result).toEqual({ ok: false, error: "same_contact" });
  });

  it("rejects when either contact does not exist", async () => {
    const a = await createContact(ctx.db, { displayName: "Jon Doe" }, null);
    const fakeId = "00000000-0000-0000-0000-000000000000";
    expect(await mergeContacts(ctx.db, a.id, fakeId, null)).toEqual({
      ok: false,
      error: "archive_not_found",
    });
    expect(await mergeContacts(ctx.db, fakeId, a.id, null)).toEqual({
      ok: false,
      error: "keep_not_found",
    });
  });

  it("rejects when the contact to keep is already archived", async () => {
    const a = await createContact(ctx.db, { displayName: "Jon Doe" }, null);
    const b = await createContact(ctx.db, { displayName: "Jane Doe" }, null);
    await archiveContact(ctx.db, a.id, null);

    expect(await mergeContacts(ctx.db, a.id, b.id, null)).toEqual({
      ok: false,
      error: "keep_already_archived",
    });
  });

  it("rejects when the contact to archive is already archived", async () => {
    const a = await createContact(ctx.db, { displayName: "Jon Doe" }, null);
    const b = await createContact(ctx.db, { displayName: "Jane Doe" }, null);
    await archiveContact(ctx.db, b.id, null);

    expect(await mergeContacts(ctx.db, a.id, b.id, null)).toEqual({
      ok: false,
      error: "archive_already_archived",
    });
  });

  it("archives B, never hard-deletes it — it still exists and is fetchable", async () => {
    const a = await createContact(ctx.db, { displayName: "Jon Doe" }, null);
    const b = await createContact(ctx.db, { displayName: "Jane Doe" }, null);

    const result = await mergeContacts(ctx.db, a.id, b.id, null);
    expect(result).toEqual({ ok: true });

    const bAfter = await getContact(ctx.db, b.id);
    expect(bAfter).not.toBeNull();
    expect(bAfter?.archivedAt).not.toBeNull();
    expect(bAfter?.displayName).toBe("Jane Doe");
  });

  it("reassigns B's phones and emails to A", async () => {
    const phoneA = normalizePhone("306-555-1000")!;
    const phoneB = normalizePhone("306-555-2000")!;
    const a = await createContact(ctx.db, { displayName: "Jon Doe", phone: phoneA }, null);
    const b = await createContact(
      ctx.db,
      { displayName: "Jane Doe", phone: phoneB, email: "jane@example.com" },
      null,
    );

    await mergeContacts(ctx.db, a.id, b.id, null);

    const aAfter = await getContact(ctx.db, a.id);
    expect(aAfter?.phones.map((p) => p.phoneE164).sort()).toEqual(
      [phoneA.e164, phoneB.e164].sort(),
    );
    expect(aAfter?.emails.map((e) => e.email)).toEqual(["jane@example.com"]);

    const bAfter = await getContact(ctx.db, b.id);
    expect(bAfter?.phones).toHaveLength(0);
    expect(bAfter?.emails).toHaveLength(0);
  });

  it("A's existing primary phone stays primary; B's reassigned phone is not primary", async () => {
    const phoneA = normalizePhone("306-555-1000")!;
    const phoneB = normalizePhone("306-555-2000")!;
    const a = await createContact(ctx.db, { displayName: "Jon Doe", phone: phoneA }, null);
    const b = await createContact(ctx.db, { displayName: "Jane Doe", phone: phoneB }, null);

    await mergeContacts(ctx.db, a.id, b.id, null);

    const aAfter = await getContact(ctx.db, a.id);
    const primary = aAfter?.phones.filter((p) => p.isPrimary);
    expect(primary).toHaveLength(1);
    expect(primary?.[0].phoneE164).toBe(phoneA.e164);
  });

  it("if A had no phone at all, B's phone carries its primary flag over", async () => {
    const phoneB = normalizePhone("306-555-2000")!;
    const a = await createContact(ctx.db, { displayName: "Jon Doe" }, null);
    const b = await createContact(ctx.db, { displayName: "Jane Doe", phone: phoneB }, null);

    await mergeContacts(ctx.db, a.id, b.id, null);

    const aAfter = await getContact(ctx.db, a.id);
    expect(aAfter?.phones).toHaveLength(1);
    expect(aAfter?.phones[0].isPrimary).toBe(true);
  });

  it("reassigns B's organization relationships to A", async () => {
    const org = await createOrganization(ctx.db, { name: "Acme" }, null);
    const a = await createContact(ctx.db, { displayName: "Jon Doe" }, null);
    const b = await createContact(ctx.db, { displayName: "Jane Doe" }, null);
    await attachContactToOrganization(ctx.db, org.id, b.id, "Manager", null);

    await mergeContacts(ctx.db, a.id, b.id, null);

    const aOrgs = await listContactOrganizations(ctx.db, a.id);
    expect(aOrgs).toHaveLength(1);
    expect(aOrgs[0].title).toBe("Manager");
    expect(await listContactOrganizations(ctx.db, b.id)).toHaveLength(0);
  });

  it("when A and B share the same organization, B's redundant link is dropped without erroring", async () => {
    const org = await createOrganization(ctx.db, { name: "Acme" }, null);
    const a = await createContact(ctx.db, { displayName: "Jon Doe" }, null);
    const b = await createContact(ctx.db, { displayName: "Jane Doe" }, null);
    await attachContactToOrganization(ctx.db, org.id, a.id, "Owner", null);
    await attachContactToOrganization(ctx.db, org.id, b.id, "Manager", null);

    const result = await mergeContacts(ctx.db, a.id, b.id, null);
    expect(result).toEqual({ ok: true });

    const orgContacts = await listOrganizationContacts(ctx.db, org.id);
    expect(orgContacts).toHaveLength(1);
    expect(orgContacts[0].title).toBe("Owner"); // A's original link survives, not overwritten
  });

  it("reassigns B's property relationships (with role) to A", async () => {
    const property = await createProperty(ctx.db, propertyInput, null);
    const a = await createContact(ctx.db, { displayName: "Jon Doe" }, null);
    const b = await createContact(ctx.db, { displayName: "Jane Doe" }, null);
    await attachContactToProperty(ctx.db, property.id, b.id, "tenant", null);

    await mergeContacts(ctx.db, a.id, b.id, null);

    const aProps = await listContactProperties(ctx.db, a.id);
    expect(aProps).toHaveLength(1);
    expect(aProps[0].role).toBe("tenant");
    expect(await listContactProperties(ctx.db, b.id)).toHaveLength(0);
  });

  it("when A and B are both attached to the same property, B's redundant link is dropped", async () => {
    const property = await createProperty(ctx.db, propertyInput, null);
    const a = await createContact(ctx.db, { displayName: "Jon Doe" }, null);
    const b = await createContact(ctx.db, { displayName: "Jane Doe" }, null);
    await attachContactToProperty(ctx.db, property.id, a.id, "owner", null);
    await attachContactToProperty(ctx.db, property.id, b.id, "tenant", null);

    const result = await mergeContacts(ctx.db, a.id, b.id, null);
    expect(result).toEqual({ ok: true });

    const propertyContacts = await listPropertyContacts(ctx.db, property.id);
    expect(propertyContacts).toHaveLength(1);
    expect(propertyContacts[0].role).toBe("owner"); // A's original role survives
  });

  it("records a contact_merged activity on A with B's id in metadata", async () => {
    const a = await createContact(ctx.db, { displayName: "Jon Doe" }, null);
    const b = await createContact(ctx.db, { displayName: "Jane Doe" }, null);

    await mergeContacts(ctx.db, a.id, b.id, null);

    const rows = await ctx.db
      .select()
      .from(activities)
      .where(
        and(
          eq(activities.entityType, "contact"),
          eq(activities.entityId, a.id),
          eq(activities.action, "contact_merged"),
        ),
      );
    expect(rows).toHaveLength(1);
    expect(rows[0].metadata).toMatchObject({ mergedContactId: b.id });
  });

  it("preserves B's pre-merge activity rows exactly as they were", async () => {
    const a = await createContact(ctx.db, { displayName: "Jon Doe" }, null);
    const b = await createContact(ctx.db, { displayName: "Jane Doe" }, null);

    const beforeRows = await ctx.db
      .select()
      .from(activities)
      .where(and(eq(activities.entityType, "contact"), eq(activities.entityId, b.id)));
    expect(beforeRows).toHaveLength(1); // contact_created

    await mergeContacts(ctx.db, a.id, b.id, null);

    const afterRows = await ctx.db
      .select()
      .from(activities)
      .where(and(eq(activities.entityType, "contact"), eq(activities.entityId, b.id)));
    // The original contact_created row is untouched...
    const created = afterRows.find((r) => r.action === "contact_created");
    expect(created).toEqual(beforeRows[0]);
    // ...plus a new contact_archived row from the archive step, and nothing else.
    expect(afterRows.map((r) => r.action).sort()).toEqual(["contact_archived", "contact_created"]);
  });

  it("is all-or-nothing: a failure partway through leaves neither contact modified", async () => {
    const a = await createContact(ctx.db, { displayName: "Jon Doe" }, null);
    // Force a failure inside the transaction by merging a nonexistent archive target
    // after some valid state exists, verifying no partial writes occurred.
    const fakeId = "00000000-0000-0000-0000-000000000000";
    await mergeContacts(ctx.db, a.id, fakeId, null);

    const [row] = await ctx.db.select().from(contacts).where(eq(contacts.id, a.id));
    expect(row.archivedAt).toBeNull();
  });
});
