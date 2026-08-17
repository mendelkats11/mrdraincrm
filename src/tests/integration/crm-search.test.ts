// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createTestDb } from "../helpers/test-db";
import { archiveContact, createContact } from "@/lib/crm/contacts";
import { changeLeadStatus, createLead } from "@/lib/crm/leads";
import { createOrganization } from "@/lib/crm/organizations";
import { createProperty } from "@/lib/crm/properties";
import { searchCrm } from "@/lib/crm/search";
import { normalizePhone } from "@/lib/phone";
import { changeJobStatus, createJob } from "@/lib/jobs/jobs";
import { sequences } from "@/lib/db/schema";

describe("searchCrm", () => {
  let ctx: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    ctx = await createTestDb();
  });

  afterEach(async () => {
    await ctx.client.close();
  });

  it("returns nothing for an empty query", async () => {
    expect(await searchCrm(ctx.db, "")).toEqual([]);
    expect(await searchCrm(ctx.db, "   ")).toEqual([]);
  });

  it("finds a contact by name, phone, and email", async () => {
    const phone = normalizePhone("306-555-7777")!;
    const contact = await createContact(
      ctx.db,
      { displayName: "Searchable Person", phone, email: "findable@example.com" },
      null,
    );

    expect((await searchCrm(ctx.db, "Searchable")).map((r) => r.id)).toContain(contact.id);
    expect((await searchCrm(ctx.db, "5557777")).map((r) => r.id)).toContain(contact.id);
    expect((await searchCrm(ctx.db, "findable")).map((r) => r.id)).toContain(contact.id);
  });

  it("finds an organization by name", async () => {
    const org = await createOrganization(ctx.db, { name: "Prairie Property Group" }, null);
    const results = await searchCrm(ctx.db, "Prairie");
    expect(results.some((r) => r.type === "organization" && r.id === org.id)).toBe(true);
  });

  it("finds a property by address and city", async () => {
    const property = await createProperty(
      ctx.db,
      {
        addressLine1: "42 Unique Ave",
        city: "Martensville",
        province: "SK",
        postalCode: "S0K 0A0",
      },
      null,
    );
    expect((await searchCrm(ctx.db, "Unique Ave")).some((r) => r.id === property.id)).toBe(true);
    expect((await searchCrm(ctx.db, "Martensville")).some((r) => r.id === property.id)).toBe(true);
  });

  it("returns results across all three entity types for a broad query", async () => {
    await createContact(ctx.db, { displayName: "Rosewood Resident" }, null);
    await createOrganization(ctx.db, { name: "Rosewood Management" }, null);
    await createProperty(
      ctx.db,
      { addressLine1: "1 Rosewood Dr", city: "Rosewood", province: "SK", postalCode: "S0K 0A0" },
      null,
    );

    const results = await searchCrm(ctx.db, "Rosewood");
    expect(new Set(results.map((r) => r.type))).toEqual(
      new Set(["contact", "organization", "property"]),
    );
  });

  it("excludes archived contacts from results", async () => {
    const contact = await createContact(ctx.db, { displayName: "Archived Person" }, null);
    await archiveContact(ctx.db, contact.id, null);
    expect(await searchCrm(ctx.db, "Archived Person")).toHaveLength(0);
  });

  it("each result links to the correct detail route", async () => {
    const contact = await createContact(ctx.db, { displayName: "Link Test" }, null);
    const results = await searchCrm(ctx.db, "Link Test");
    expect(results[0].href).toBe(`/contacts/${contact.id}`);
  });

  it("finds a lead via its linked contact's name", async () => {
    const contact = await createContact(ctx.db, { displayName: "Lead Contact Findable" }, null);
    const lead = await createLead(ctx.db, { contactId: contact.id }, null);
    const results = await searchCrm(ctx.db, "Lead Contact Findable");
    expect(results.some((r) => r.type === "lead" && r.id === lead.id)).toBe(true);
  });

  it("excludes Lost leads from search, matching the default active-leads view", async () => {
    const contact = await createContact(ctx.db, { displayName: "Lost Lead Contact" }, null);
    const lead = await createLead(ctx.db, { contactId: contact.id }, null);
    await changeLeadStatus(ctx.db, lead.id, "lost", null);
    const results = await searchCrm(ctx.db, "Lost Lead Contact");
    expect(results.some((r) => r.type === "lead")).toBe(false);
  });

  it("finds a job by its job number", async () => {
    await ctx.db
      .insert(sequences)
      .values({ name: "job", prefix: "JOB-", nextNumber: 1, minDigits: 4 });
    const job = await createJob(ctx.db, {}, null);
    const results = await searchCrm(ctx.db, job.jobNumber);
    expect(results.some((r) => r.type === "job" && r.id === job.id)).toBe(true);
  });

  it("finds a job via its linked contact's name", async () => {
    await ctx.db
      .insert(sequences)
      .values({ name: "job", prefix: "JOB-", nextNumber: 1, minDigits: 4 });
    const contact = await createContact(ctx.db, { displayName: "Job Contact Findable" }, null);
    const job = await createJob(ctx.db, { contactId: contact.id }, null);
    const results = await searchCrm(ctx.db, "Job Contact Findable");
    expect(results.some((r) => r.type === "job" && r.id === job.id)).toBe(true);
  });

  it("excludes Cancelled jobs from search, matching the default active-jobs view", async () => {
    await ctx.db
      .insert(sequences)
      .values({ name: "job", prefix: "JOB-", nextNumber: 1, minDigits: 4 });
    const job = await createJob(ctx.db, {}, null);
    await changeJobStatus(ctx.db, job.id, "cancelled", null);
    const results = await searchCrm(ctx.db, job.jobNumber);
    expect(results.some((r) => r.type === "job")).toBe(false);
  });
});
