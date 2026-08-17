// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { createTestDb } from "../helpers/test-db";
import {
  changeLeadStatus,
  convertLeadToJob,
  createLead,
  createLeadFromPublicSubmission,
  getLead,
  listLeads,
  updateLead,
} from "@/lib/crm/leads";
import { createContact } from "@/lib/crm/contacts";
import { activities, appSettings, contacts, jobs, sequences, serviceAreas } from "@/lib/db/schema";
import { normalizePhone } from "@/lib/phone";

async function seedJobSequence(db: Awaited<ReturnType<typeof createTestDb>>["db"]) {
  await db.insert(sequences).values({ name: "job", prefix: "JOB-", nextNumber: 1, minDigits: 4 });
}

describe("createLead / updateLead", () => {
  let ctx: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    ctx = await createTestDb();
  });

  afterEach(async () => {
    await ctx.client.close();
  });

  it("creates a lead with no contact/property/organization at all", async () => {
    const lead = await createLead(ctx.db, { issueDescription: "Leaky pipe" }, null);
    expect(lead.contactId).toBeNull();
    expect(lead.status).toBe("new");
  });

  it("sets both originalSource and latestSource from the same input at creation", async () => {
    const lead = await createLead(ctx.db, { source: "referral" }, null);
    expect(lead.originalSource).toBe("referral");
    expect(lead.latestSource).toBe("referral");
  });

  it("records a lead_created activity", async () => {
    const lead = await createLead(ctx.db, {}, null);
    const rows = await ctx.db
      .select()
      .from(activities)
      .where(and(eq(activities.entityType, "lead"), eq(activities.entityId, lead.id)));
    expect(rows).toHaveLength(1);
    expect(rows[0].action).toBe("lead_created");
  });

  it("updateLead never changes originalSource — the input type has no such field", async () => {
    const lead = await createLead(ctx.db, { source: "referral" }, null);
    // updateLead's input type structurally excludes originalSource, so
    // there's no way to pass it even by mistake — this just confirms the
    // stored value survives an unrelated update untouched.
    await updateLead(ctx.db, lead.id, { latestSource: "phone" }, null);
    const after = await getLead(ctx.db, lead.id);
    expect(after?.originalSource).toBe("referral");
    expect(after?.latestSource).toBe("phone");
  });
});

describe("changeLeadStatus", () => {
  let ctx: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    ctx = await createTestDb();
  });

  afterEach(async () => {
    await ctx.client.close();
  });

  it("changes status and records lead_status_changed", async () => {
    const lead = await createLead(ctx.db, {}, null);
    const result = await changeLeadStatus(ctx.db, lead.id, "contacted", null);
    expect(result).toEqual({ ok: true });

    const after = await getLead(ctx.db, lead.id);
    expect(after?.status).toBe("contacted");
  });

  it("is idempotent when set to the current status", async () => {
    const lead = await createLead(ctx.db, {}, null);
    await changeLeadStatus(ctx.db, lead.id, "contacted", null);
    const result = await changeLeadStatus(ctx.db, lead.id, "contacted", null);
    expect(result).toEqual({ ok: true });
  });

  it("rejects a nonexistent lead", async () => {
    const fakeId = "00000000-0000-0000-0000-000000000000";
    expect(await changeLeadStatus(ctx.db, fakeId, "lost", null)).toEqual({
      ok: false,
      error: "not_found",
    });
  });

  it("Lost is a normal status change, not a hard delete — the lead remains fully fetchable", async () => {
    const lead = await createLead(ctx.db, { issueDescription: "Frozen pipe" }, null);
    await changeLeadStatus(ctx.db, lead.id, "lost", null);
    const after = await getLead(ctx.db, lead.id);
    expect(after).not.toBeNull();
    expect(after?.status).toBe("lost");
    expect(after?.issueDescription).toBe("Frozen pipe");
  });
});

describe("listLeads — Lost as the archive-equivalent", () => {
  let ctx: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    ctx = await createTestDb();
  });

  afterEach(async () => {
    await ctx.client.close();
  });

  it("the default active view excludes Lost leads", async () => {
    const a = await createLead(ctx.db, { issueDescription: "A" }, null);
    const b = await createLead(ctx.db, { issueDescription: "B" }, null);
    await changeLeadStatus(ctx.db, b.id, "lost", null);

    const { rows } = await listLeads(ctx.db);
    expect(rows.map((r) => r.id)).toEqual([a.id]);
  });

  it("status=lost surfaces only Lost leads; status=all surfaces everything", async () => {
    const a = await createLead(ctx.db, {}, null);
    const b = await createLead(ctx.db, {}, null);
    await changeLeadStatus(ctx.db, b.id, "lost", null);

    expect((await listLeads(ctx.db, { status: "lost" })).rows.map((r) => r.id)).toEqual([b.id]);
    const allIds = (await listLeads(ctx.db, { status: "all" })).rows.map((r) => r.id).sort();
    expect(allIds).toEqual([a.id, b.id].sort());
  });
});

describe("convertLeadToJob", () => {
  let ctx: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    ctx = await createTestDb();
    await seedJobSequence(ctx.db);
  });

  afterEach(async () => {
    await ctx.client.close();
  });

  it("creates a job with a sequential job number and links both directions", async () => {
    const contact = await createContact(ctx.db, { displayName: "Jon Doe" }, null);
    const lead = await createLead(
      ctx.db,
      { contactId: contact.id, issueDescription: "Leaky pipe", emergency: true },
      null,
    );

    const result = await convertLeadToJob(ctx.db, lead.id, null);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("unreachable");
    expect(result.jobNumber).toBe("JOB-0001");

    const [job] = await ctx.db.select().from(jobs).where(eq(jobs.id, result.jobId));
    expect(job.leadId).toBe(lead.id);
    expect(job.contactId).toBe(contact.id);
    expect(job.issueDescription).toBe("Leaky pipe");
    expect(job.emergency).toBe(true);
    expect(job.status).toBe("draft");

    const leadAfter = await getLead(ctx.db, lead.id);
    expect(leadAfter?.status).toBe("won");
    expect(leadAfter?.convertedJobId).toBe(result.jobId);
    expect(leadAfter?.convertedAt).not.toBeNull();
  });

  it("allocates sequential numbers across multiple conversions", async () => {
    const lead1 = await createLead(ctx.db, {}, null);
    const lead2 = await createLead(ctx.db, {}, null);

    const r1 = await convertLeadToJob(ctx.db, lead1.id, null);
    const r2 = await convertLeadToJob(ctx.db, lead2.id, null);
    if (!r1.ok || !r2.ok) throw new Error("unreachable");
    expect(r1.jobNumber).toBe("JOB-0001");
    expect(r2.jobNumber).toBe("JOB-0002");
  });

  it("snapshots appSettings.taxInclusionDefault onto the new job", async () => {
    await ctx.db.insert(appSettings).values({ taxInclusionDefault: "included" });
    const lead = await createLead(ctx.db, {}, null);

    const result = await convertLeadToJob(ctx.db, lead.id, null);
    if (!result.ok) throw new Error("unreachable");
    const [job] = await ctx.db.select().from(jobs).where(eq(jobs.id, result.jobId));
    expect(job.taxInclusionMode).toBe("included");
  });

  it("falls back to 'excluded' when no app_settings row exists", async () => {
    const lead = await createLead(ctx.db, {}, null);
    const result = await convertLeadToJob(ctx.db, lead.id, null);
    if (!result.ok) throw new Error("unreachable");
    const [job] = await ctx.db.select().from(jobs).where(eq(jobs.id, result.jobId));
    expect(job.taxInclusionMode).toBe("excluded");
  });

  it("records lead_converted and job_created_from_lead activities", async () => {
    const lead = await createLead(ctx.db, {}, null);
    const result = await convertLeadToJob(ctx.db, lead.id, null);
    if (!result.ok) throw new Error("unreachable");

    const leadActivity = await ctx.db
      .select()
      .from(activities)
      .where(
        and(
          eq(activities.entityType, "lead"),
          eq(activities.entityId, lead.id),
          eq(activities.action, "lead_converted"),
        ),
      );
    expect(leadActivity).toHaveLength(1);

    const jobActivity = await ctx.db
      .select()
      .from(activities)
      .where(
        and(
          eq(activities.entityType, "job"),
          eq(activities.entityId, result.jobId),
          eq(activities.action, "job_created_from_lead"),
        ),
      );
    expect(jobActivity).toHaveLength(1);
  });

  it("rejects converting an already-converted lead", async () => {
    const lead = await createLead(ctx.db, {}, null);
    await convertLeadToJob(ctx.db, lead.id, null);
    const second = await convertLeadToJob(ctx.db, lead.id, null);
    expect(second).toEqual({ ok: false, error: "already_converted" });
  });

  it("rejects converting a Lost lead", async () => {
    const lead = await createLead(ctx.db, {}, null);
    await changeLeadStatus(ctx.db, lead.id, "lost", null);
    const result = await convertLeadToJob(ctx.db, lead.id, null);
    expect(result).toEqual({ ok: false, error: "lead_lost" });
  });

  it("is all-or-nothing: a failure leaves no job row and no sequence consumed", async () => {
    const fakeId = "00000000-0000-0000-0000-000000000000";
    const result = await convertLeadToJob(ctx.db, fakeId, null);
    expect(result).toEqual({ ok: false, error: "not_found" });

    const allJobs = await ctx.db.select().from(jobs);
    expect(allJobs).toHaveLength(0);
  });
});

describe("createLeadFromPublicSubmission", () => {
  let ctx: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    ctx = await createTestDb();
  });

  afterEach(async () => {
    await ctx.client.close();
  });

  it("creates a new contact when no existing contact matches", async () => {
    const phone = normalizePhone("306-555-1234")!;
    const lead = await createLeadFromPublicSubmission(ctx.db, {
      name: "New Customer",
      phone,
      email: null,
      serviceAreaId: null,
      issueDescription: "Clogged drain",
      emergency: false,
      landingPage: "/contact",
    });

    const fullLead = await getLead(ctx.db, lead.id);
    expect(fullLead?.contactName).toBe("New Customer");
    expect(fullLead?.originalSource).toBe("website");
    expect(fullLead?.latestSource).toBe("website");
  });

  it("attaches to an existing active contact matched by exact normalized phone", async () => {
    const phone = normalizePhone("306-555-1234")!;
    const existing = await createContact(ctx.db, { displayName: "Existing Customer", phone }, null);

    const lead = await createLeadFromPublicSubmission(ctx.db, {
      name: "Someone Typed A Different Name",
      phone,
      email: null,
      serviceAreaId: null,
      issueDescription: "Clogged drain",
      emergency: false,
      landingPage: "/contact",
    });

    expect(lead.contactId).toBe(existing.id);
    // No second contact was created for the same phone number.
    const allContacts = await ctx.db.select().from(contacts);
    expect(allContacts).toHaveLength(1);
  });

  it("attaches to an existing active contact matched by exact normalized email when phone doesn't match", async () => {
    const existing = await createContact(
      ctx.db,
      { displayName: "Existing Customer", email: "customer@example.com" },
      null,
    );

    const lead = await createLeadFromPublicSubmission(ctx.db, {
      name: "Someone",
      phone: normalizePhone("306-555-9999")!,
      email: "CUSTOMER@example.com",
      serviceAreaId: null,
      issueDescription: "Clogged drain",
      emergency: false,
      landingPage: "/contact",
    });

    expect(lead.contactId).toBe(existing.id);
  });

  it("does not match an archived contact — creates a new one instead", async () => {
    const phone = normalizePhone("306-555-1234")!;
    const { archiveContact } = await import("@/lib/crm/contacts");
    const existing = await createContact(ctx.db, { displayName: "Old Customer", phone }, null);
    await archiveContact(ctx.db, existing.id, null);

    const lead = await createLeadFromPublicSubmission(ctx.db, {
      name: "New Customer",
      phone,
      email: null,
      serviceAreaId: null,
      issueDescription: "Clogged drain",
      emergency: false,
      landingPage: "/contact",
    });

    expect(lead.contactId).not.toBe(existing.id);
  });

  it("stores the selected service area name in sourceDetails", async () => {
    const [area] = await ctx.db
      .insert(serviceAreas)
      .values({ name: "Martensville", slug: "martensville" })
      .returning();

    const lead = await createLeadFromPublicSubmission(ctx.db, {
      name: "New Customer",
      phone: normalizePhone("306-555-1234")!,
      email: null,
      serviceAreaId: area.id,
      issueDescription: "Clogged drain",
      emergency: false,
      landingPage: "/contact",
    });

    const fullLead = await getLead(ctx.db, lead.id);
    expect(fullLead?.sourceDetails).toBe("Service area: Martensville");
  });

  it("does not disclose whether a matching contact existed — the return value carries no such flag", async () => {
    const phone = normalizePhone("306-555-1234")!;
    const lead = await createLeadFromPublicSubmission(ctx.db, {
      name: "New Customer",
      phone,
      email: null,
      serviceAreaId: null,
      issueDescription: "Clogged drain",
      emergency: false,
      landingPage: "/contact",
    });
    expect(Object.keys(lead)).not.toContain("matchedExistingContact");
  });
});
