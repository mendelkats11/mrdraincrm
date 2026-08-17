// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createTestDb } from "../helpers/test-db";
import {
  addContactEmail,
  addContactPhone,
  archiveContact,
  createContact,
  getContact,
  listContacts,
  listDistinctContactSources,
  removeContactEmail,
  removeContactPhone,
  unarchiveContact,
  updateContact,
} from "@/lib/crm/contacts";
import { activities } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { normalizePhone } from "@/lib/phone";

describe("contacts service", () => {
  let ctx: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    ctx = await createTestDb();
  });

  afterEach(async () => {
    await ctx.client.close();
  });

  it("creates a contact with no job/property/organization — fully standalone", async () => {
    const contact = await createContact(ctx.db, { displayName: "Jane Smith" }, null);
    expect(contact.displayName).toBe("Jane Smith");
    expect(contact.archivedAt).toBeNull();
  });

  it("creates a contact with a phone and email, storing normalized phone forms", async () => {
    const phone = normalizePhone("(306) 555-1234")!;
    const contact = await createContact(
      ctx.db,
      { displayName: "Jane Smith", phone, email: "jane@example.com" },
      null,
    );
    const full = await getContact(ctx.db, contact.id);
    expect(full?.phones).toHaveLength(1);
    expect(full?.phones[0].phoneE164).toBe("+13065551234");
    expect(full?.phones[0].isPrimary).toBe(true);
    expect(full?.emails).toHaveLength(1);
    expect(full?.emails[0].email).toBe("jane@example.com");
  });

  it("records a contact_created activity", async () => {
    const contact = await createContact(ctx.db, { displayName: "Jane Smith" }, null);
    const rows = await ctx.db
      .select()
      .from(activities)
      .where(and(eq(activities.entityType, "contact"), eq(activities.entityId, contact.id)));
    expect(rows.some((r) => r.action === "contact_created")).toBe(true);
  });

  it("updates fields and records before/after values", async () => {
    const contact = await createContact(ctx.db, { displayName: "Jane Smith" }, null);
    await updateContact(ctx.db, contact.id, { notes: "Prefers morning appointments" }, null);

    const updated = await getContact(ctx.db, contact.id);
    expect(updated?.notes).toBe("Prefers morning appointments");

    const rows = await ctx.db
      .select()
      .from(activities)
      .where(
        and(
          eq(activities.entityType, "contact"),
          eq(activities.entityId, contact.id),
          eq(activities.action, "contact_updated"),
        ),
      );
    expect(rows).toHaveLength(1);
    expect(rows[0].newValue).toMatchObject({ notes: "Prefers morning appointments" });
  });

  it("archives and unarchives, excluding archived from default listing", async () => {
    const a = await createContact(ctx.db, { displayName: "Active Contact" }, null);
    const b = await createContact(ctx.db, { displayName: "Archived Contact" }, null);
    await archiveContact(ctx.db, b.id, null);

    const activeList = await listContacts(ctx.db, {});
    expect(activeList.rows.map((c) => c.id)).toContain(a.id);
    expect(activeList.rows.map((c) => c.id)).not.toContain(b.id);

    const archivedList = await listContacts(ctx.db, { status: "archived" });
    expect(archivedList.rows.map((c) => c.id)).toContain(b.id);

    await unarchiveContact(ctx.db, b.id, null);
    const afterRestore = await listContacts(ctx.db, {});
    expect(afterRestore.rows.map((c) => c.id)).toContain(b.id);
  });

  it("search matches by name, phone, and email", async () => {
    const phone = normalizePhone("306-555-9999")!;
    await createContact(
      ctx.db,
      { displayName: "Searchable Person", phone, email: "findme@example.com" },
      null,
    );
    await createContact(ctx.db, { displayName: "Someone Else" }, null);

    expect((await listContacts(ctx.db, { search: "Searchable" })).total).toBe(1);
    expect((await listContacts(ctx.db, { search: "5559999" })).total).toBe(1);
    expect((await listContacts(ctx.db, { search: "findme" })).total).toBe(1);
    expect((await listContacts(ctx.db, { search: "nonexistent" })).total).toBe(0);
  });

  it("filters by source", async () => {
    await createContact(ctx.db, { displayName: "Website Lead", source: "website" }, null);
    await createContact(ctx.db, { displayName: "Phone Lead", source: "phone" }, null);

    const websiteOnly = await listContacts(ctx.db, { source: "website" });
    expect(websiteOnly.total).toBe(1);
    expect(websiteOnly.rows[0].displayName).toBe("Website Lead");
  });

  it("paginates", async () => {
    for (let i = 0; i < 5; i++) {
      await createContact(ctx.db, { displayName: `Contact ${i}` }, null);
    }
    const page1 = await listContacts(ctx.db, { pageSize: 2, page: 1 });
    const page2 = await listContacts(ctx.db, { pageSize: 2, page: 2 });
    expect(page1.rows).toHaveLength(2);
    expect(page2.rows).toHaveLength(2);
    expect(page1.total).toBe(5);
    expect(page1.rows[0].id).not.toBe(page2.rows[0].id);
  });

  it("lists distinct sources for filter options", async () => {
    await createContact(ctx.db, { displayName: "A", source: "website" }, null);
    await createContact(ctx.db, { displayName: "B", source: "website" }, null);
    await createContact(ctx.db, { displayName: "C", source: "referral" }, null);
    await createContact(ctx.db, { displayName: "D" }, null);

    const sources = await listDistinctContactSources(ctx.db);
    expect(sources.sort()).toEqual(["referral", "website"]);
  });

  it("adds a second phone as non-primary, keeping the first primary", async () => {
    const phone1 = normalizePhone("306-555-0001")!;
    const phone2 = normalizePhone("306-555-0002")!;
    const contact = await createContact(ctx.db, { displayName: "Jane Smith", phone: phone1 }, null);
    await addContactPhone(ctx.db, contact.id, phone2, "Cell", null);

    const full = await getContact(ctx.db, contact.id);
    expect(full?.phones).toHaveLength(2);
    const primary = full?.phones.filter((p) => p.isPrimary);
    expect(primary).toHaveLength(1);
    expect(primary?.[0].phoneE164).toBe(phone1.e164);
  });

  it("removes a phone and an email", async () => {
    const phone = normalizePhone("306-555-0003")!;
    const contact = await createContact(
      ctx.db,
      { displayName: "Jane Smith", phone, email: "jane@example.com" },
      null,
    );
    const before = await getContact(ctx.db, contact.id);
    await removeContactPhone(ctx.db, contact.id, before!.phones[0].id, null);
    await removeContactEmail(ctx.db, contact.id, before!.emails[0].id, null);

    const after = await getContact(ctx.db, contact.id);
    expect(after?.phones).toHaveLength(0);
    expect(after?.emails).toHaveLength(0);
  });

  it("adding an email when none exists yet makes it primary", async () => {
    const contact = await createContact(ctx.db, { displayName: "Jane Smith" }, null);
    await addContactEmail(ctx.db, contact.id, "new@example.com", null, null);
    const full = await getContact(ctx.db, contact.id);
    expect(full?.emails[0].isPrimary).toBe(true);
  });
});
