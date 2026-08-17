// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { createTestDb } from "../helpers/test-db";
import {
  addJobCustomCharge,
  changeJobStatus,
  createJob,
  getJob,
  listJobs,
  removeJobCustomCharge,
  updateJob,
  updateJobFinancials,
} from "@/lib/jobs/jobs";
import { createContact } from "@/lib/crm/contacts";
import { createProperty } from "@/lib/crm/properties";
import { activities, appSettings, contacts, jobs, sequences } from "@/lib/db/schema";
import { normalizePhone } from "@/lib/phone";

async function seedJobSequence(db: Awaited<ReturnType<typeof createTestDb>>["db"]) {
  await db.insert(sequences).values({ name: "job", prefix: "JOB-", nextNumber: 1, minDigits: 4 });
}

describe("createJob", () => {
  let ctx: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    ctx = await createTestDb();
    await seedJobSequence(ctx.db);
  });

  afterEach(async () => {
    await ctx.client.close();
  });

  it("creates a job with no contact/property/organization/lead at all", async () => {
    const job = await createJob(ctx.db, {}, null);
    expect(job.contactId).toBeNull();
    expect(job.propertyId).toBeNull();
    expect(job.organizationId).toBeNull();
    expect(job.leadId).toBeNull();
    expect(job.status).toBe("draft");
  });

  it("allocates a sequential job number", async () => {
    const a = await createJob(ctx.db, {}, null);
    const b = await createJob(ctx.db, {}, null);
    expect(a.jobNumber).toBe("JOB-0001");
    expect(b.jobNumber).toBe("JOB-0002");
  });

  it("creates a job with an existing contact", async () => {
    const contact = await createContact(ctx.db, { displayName: "Jon Doe" }, null);
    const job = await createJob(ctx.db, { contactId: contact.id }, null);
    expect(job.contactId).toBe(contact.id);
  });

  it("creates a job with an existing property", async () => {
    const property = await createProperty(
      ctx.db,
      { addressLine1: "1 Main St", city: "Warman", province: "SK", postalCode: "S0K 0A0" },
      null,
    );
    const job = await createJob(ctx.db, { propertyId: property.id }, null);
    expect(job.propertyId).toBe(property.id);
  });

  it("creates a new contact inline and links it to the job", async () => {
    const phone = normalizePhone("306-555-1234")!;
    const job = await createJob(
      ctx.db,
      { newContact: { displayName: "New Inline Contact", phone } },
      null,
    );
    expect(job.contactId).not.toBeNull();

    const [contact] = await ctx.db.select().from(contacts).where(eq(contacts.id, job.contactId!));
    expect(contact.displayName).toBe("New Inline Contact");

    // The inline contact creation itself is recorded (reuses createContact,
    // which records its own contact_created activity).
    const contactActivity = await ctx.db
      .select()
      .from(activities)
      .where(and(eq(activities.entityType, "contact"), eq(activities.entityId, job.contactId!)));
    expect(contactActivity.map((a) => a.action)).toContain("contact_created");
  });

  it("snapshots appSettings.taxInclusionDefault onto the job", async () => {
    await ctx.db.insert(appSettings).values({ taxInclusionDefault: "included" });
    const job = await createJob(ctx.db, {}, null);
    expect(job.taxInclusionMode).toBe("included");
  });

  it("falls back to 'excluded' when no app_settings row exists", async () => {
    const job = await createJob(ctx.db, {}, null);
    expect(job.taxInclusionMode).toBe("excluded");
  });

  it("stores manual financial inputs as raw cents, never computing a total", async () => {
    const job = await createJob(
      ctx.db,
      {
        jobAmountCents: 15000,
        taxAmountCents: 750,
        materialsCents: 2000,
        contractorPayoutCents: 6000,
      },
      null,
    );
    expect(job.jobAmountCents).toBe(15000);
    expect(job.taxAmountCents).toBe(750);
    expect(job.materialsCents).toBe(2000);
    expect(job.contractorPayoutCents).toBe(6000);
  });

  it("defaults financial inputs to zero when omitted", async () => {
    const job = await createJob(ctx.db, {}, null);
    expect(job.jobAmountCents).toBe(0);
    expect(job.taxAmountCents).toBe(0);
    expect(job.materialsCents).toBe(0);
    expect(job.contractorPayoutCents).toBe(0);
  });

  it("records a job_created activity", async () => {
    const job = await createJob(ctx.db, {}, null);
    const rows = await ctx.db
      .select()
      .from(activities)
      .where(and(eq(activities.entityType, "job"), eq(activities.entityId, job.id)));
    expect(rows.map((r) => r.action)).toContain("job_created");
  });

  it("respects an explicit initial status", async () => {
    const job = await createJob(ctx.db, { status: "open" }, null);
    expect(job.status).toBe("open");
  });
});

describe("updateJob / updateJobFinancials", () => {
  let ctx: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    ctx = await createTestDb();
    await seedJobSequence(ctx.db);
  });

  afterEach(async () => {
    await ctx.client.close();
  });

  it("updates relationship/service/notes fields and records job_updated", async () => {
    const job = await createJob(ctx.db, {}, null);
    const property = await createProperty(
      ctx.db,
      { addressLine1: "1 Main St", city: "Warman", province: "SK", postalCode: "S0K 0A0" },
      null,
    );

    await updateJob(
      ctx.db,
      job.id,
      { propertyId: property.id, internalNotes: "Bring a ladder" },
      null,
    );

    const after = await getJob(ctx.db, job.id);
    expect(after?.propertyId).toBe(property.id);
    expect(after?.internalNotes).toBe("Bring a ladder");

    const rows = await ctx.db
      .select()
      .from(activities)
      .where(
        and(
          eq(activities.entityType, "job"),
          eq(activities.entityId, job.id),
          eq(activities.action, "job_updated"),
        ),
      );
    expect(rows).toHaveLength(1);
  });

  it("updateJobFinancials records a distinct job_financials_changed activity with before/after", async () => {
    const job = await createJob(ctx.db, { jobAmountCents: 10000 }, null);
    await updateJobFinancials(ctx.db, job.id, { jobAmountCents: 20000 }, null);

    const after = await getJob(ctx.db, job.id);
    expect(after?.jobAmountCents).toBe(20000);

    const rows = await ctx.db
      .select()
      .from(activities)
      .where(
        and(
          eq(activities.entityType, "job"),
          eq(activities.entityId, job.id),
          eq(activities.action, "job_financials_changed"),
        ),
      );
    expect(rows).toHaveLength(1);
    expect(rows[0].oldValue).toMatchObject({ jobAmountCents: 10000 });
    expect(rows[0].newValue).toMatchObject({ jobAmountCents: 20000 });
  });

  it("a plain job_updated call never touches financial columns", async () => {
    const job = await createJob(ctx.db, { jobAmountCents: 10000 }, null);
    await updateJob(ctx.db, job.id, { internalNotes: "note" }, null);
    const after = await getJob(ctx.db, job.id);
    expect(after?.jobAmountCents).toBe(10000);
  });
});

describe("changeJobStatus", () => {
  let ctx: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    ctx = await createTestDb();
    await seedJobSequence(ctx.db);
  });

  afterEach(async () => {
    await ctx.client.close();
  });

  it("allows free transitions between any two statuses", async () => {
    const job = await createJob(ctx.db, {}, null);
    expect(await changeJobStatus(ctx.db, job.id, "in_progress", null)).toEqual({ ok: true });
    expect((await getJob(ctx.db, job.id))?.status).toBe("in_progress");

    // "Backwards" transition — no state machine.
    expect(await changeJobStatus(ctx.db, job.id, "draft", null)).toEqual({ ok: true });
    expect((await getJob(ctx.db, job.id))?.status).toBe("draft");
  });

  it("is idempotent when set to the current status", async () => {
    const job = await createJob(ctx.db, {}, null);
    const result = await changeJobStatus(ctx.db, job.id, "draft", null);
    expect(result).toEqual({ ok: true });
  });

  it("rejects a nonexistent job", async () => {
    const fakeId = "00000000-0000-0000-0000-000000000000";
    expect(await changeJobStatus(ctx.db, fakeId, "open", null)).toEqual({
      ok: false,
      error: "not_found",
    });
  });

  it("sets cancelledAt when moving to Cancelled, and clears it when moving off", async () => {
    const job = await createJob(ctx.db, {}, null);
    await changeJobStatus(ctx.db, job.id, "cancelled", null);
    const [cancelled] = await ctx.db.select().from(jobs).where(eq(jobs.id, job.id));
    expect(cancelled.cancelledAt).not.toBeNull();

    await changeJobStatus(ctx.db, job.id, "open", null);
    const [reopened] = await ctx.db.select().from(jobs).where(eq(jobs.id, job.id));
    expect(reopened.cancelledAt).toBeNull();
  });

  it("Cancelled is reversible, never a hard delete — the job remains fully fetchable", async () => {
    const job = await createJob(ctx.db, { issueDescription: "Leaky pipe" }, null);
    await changeJobStatus(ctx.db, job.id, "cancelled", null);
    const after = await getJob(ctx.db, job.id);
    expect(after).not.toBeNull();
    expect(after?.status).toBe("cancelled");
    expect(after?.issueDescription).toBe("Leaky pipe");
  });
});

describe("listJobs — Cancelled as the archive-equivalent", () => {
  let ctx: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    ctx = await createTestDb();
    await seedJobSequence(ctx.db);
  });

  afterEach(async () => {
    await ctx.client.close();
  });

  it("the default active view excludes Cancelled jobs", async () => {
    const a = await createJob(ctx.db, {}, null);
    const b = await createJob(ctx.db, {}, null);
    await changeJobStatus(ctx.db, b.id, "cancelled", null);

    const { rows } = await listJobs(ctx.db);
    expect(rows.map((r) => r.id)).toEqual([a.id]);
  });

  it("status=cancelled surfaces only Cancelled jobs; status=all surfaces everything", async () => {
    const a = await createJob(ctx.db, {}, null);
    const b = await createJob(ctx.db, {}, null);
    await changeJobStatus(ctx.db, b.id, "cancelled", null);

    expect((await listJobs(ctx.db, { status: "cancelled" })).rows.map((r) => r.id)).toEqual([b.id]);
    const allIds = (await listJobs(ctx.db, { status: "all" })).rows.map((r) => r.id).sort();
    expect(allIds).toEqual([a.id, b.id].sort());
  });

  it("search matches by job number", async () => {
    const job = await createJob(ctx.db, {}, null);
    const { rows } = await listJobs(ctx.db, { search: job.jobNumber });
    expect(rows.map((r) => r.id)).toContain(job.id);
  });

  it("search matches by linked contact name", async () => {
    const contact = await createContact(ctx.db, { displayName: "Searchable Job Contact" }, null);
    const job = await createJob(ctx.db, { contactId: contact.id }, null);
    const { rows } = await listJobs(ctx.db, { search: "Searchable Job Contact" });
    expect(rows.map((r) => r.id)).toContain(job.id);
  });

  it("emergencyOnly filters to emergency jobs", async () => {
    await createJob(ctx.db, { emergency: false }, null);
    const emergency = await createJob(ctx.db, { emergency: true }, null);
    const { rows } = await listJobs(ctx.db, { emergencyOnly: true });
    expect(rows.map((r) => r.id)).toEqual([emergency.id]);
  });
});

describe("job custom charges", () => {
  let ctx: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    ctx = await createTestDb();
    await seedJobSequence(ctx.db);
  });

  afterEach(async () => {
    await ctx.client.close();
  });

  it("adds a positive custom charge and reflects it on getJob", async () => {
    const job = await createJob(ctx.db, {}, null);
    await addJobCustomCharge(ctx.db, job.id, "Extra fitting", 1500, null);
    const after = await getJob(ctx.db, job.id);
    expect(after?.customCharges).toHaveLength(1);
    expect(after?.customCharges[0]).toMatchObject({
      description: "Extra fitting",
      amountCents: 1500,
    });
  });

  it("supports a negative custom charge (discount/credit)", async () => {
    const job = await createJob(ctx.db, {}, null);
    await addJobCustomCharge(ctx.db, job.id, "Loyalty discount", -500, null);
    const after = await getJob(ctx.db, job.id);
    expect(after?.customCharges[0].amountCents).toBe(-500);
  });

  it("records activity when a charge is added and removed", async () => {
    const job = await createJob(ctx.db, {}, null);
    const charge = await addJobCustomCharge(ctx.db, job.id, "Extra fitting", 1500, null);
    await removeJobCustomCharge(ctx.db, job.id, charge.id, null);

    const after = await getJob(ctx.db, job.id);
    expect(after?.customCharges).toHaveLength(0);

    const rows = await ctx.db
      .select()
      .from(activities)
      .where(and(eq(activities.entityType, "job"), eq(activities.entityId, job.id)));
    expect(rows.map((r) => r.action)).toEqual(
      expect.arrayContaining(["job_custom_charge_added", "job_custom_charge_removed"]),
    );
  });
});
