// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { createTestDb } from "../helpers/test-db";
import { createJob } from "@/lib/jobs/jobs";
import { createContact } from "@/lib/crm/contacts";
import { createOrganization } from "@/lib/crm/organizations";
import { createProperty } from "@/lib/crm/properties";
import {
  addInvoiceLineItem,
  createInvoice,
  createInvoiceFromScratch,
  getInvoice,
  listInvoices,
  listInvoicesForJob,
  markInvoiceSent,
  removeInvoiceLineItem,
  resolveInvoiceDefaults,
  updateInvoiceDetails,
  updateInvoiceLineItem,
  voidInvoice,
} from "@/lib/invoices/invoices";
import { activities, appSettings, jobs, sequences } from "@/lib/db/schema";

async function seedSequences(db: Awaited<ReturnType<typeof createTestDb>>["db"]) {
  await db.insert(sequences).values([
    { name: "job", prefix: "JOB-", nextNumber: 1, minDigits: 4 },
    { name: "invoice", prefix: "INV-", nextNumber: 1, minDigits: 4 },
  ]);
}

describe("createInvoice", () => {
  let ctx: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    ctx = await createTestDb();
    await seedSequences(ctx.db);
  });

  afterEach(async () => {
    await ctx.client.close();
  });

  it("creates a draft invoice with an allocated sequential number", async () => {
    const job = await createJob(ctx.db, {}, null);
    const invoice = await createInvoice(ctx.db, { jobId: job.id }, null);
    expect(invoice.invoiceNumber).toBe("INV-0001");
    expect(invoice.status).toBe("draft");
    expect(invoice.subtotalCents).toBe(0);
    expect(invoice.totalCents).toBe(0);
  });

  it("allocates sequential, never-repeating numbers", async () => {
    const job = await createJob(ctx.db, {}, null);
    const invoiceA = await createInvoice(ctx.db, { jobId: job.id }, null);
    const invoiceB = await createInvoice(ctx.db, { jobId: job.id }, null);
    expect(invoiceA.invoiceNumber).toBe("INV-0001");
    expect(invoiceB.invoiceNumber).toBe("INV-0002");
  });

  it("stores manual tax and computes total from tax alone with no line items", async () => {
    const job = await createJob(ctx.db, {}, null);
    const invoice = await createInvoice(ctx.db, { jobId: job.id, taxCents: 500 }, null);
    expect(invoice.subtotalCents).toBe(0);
    expect(invoice.taxCents).toBe(500);
    expect(invoice.totalCents).toBe(500);
  });

  it("records invoice_created activity", async () => {
    const job = await createJob(ctx.db, {}, null);
    const invoice = await createInvoice(ctx.db, { jobId: job.id }, null);
    const rows = await ctx.db
      .select()
      .from(activities)
      .where(and(eq(activities.entityType, "invoice"), eq(activities.entityId, invoice.id)));
    expect(rows.map((r) => r.action)).toContain("invoice_created");
  });

  it("allows multiple invoices on the same job — no unique constraint forces one", async () => {
    const job = await createJob(ctx.db, {}, null);
    await createInvoice(ctx.db, { jobId: job.id }, null);
    await createInvoice(ctx.db, { jobId: job.id }, null);
    const rows = await listInvoicesForJob(ctx.db, job.id);
    expect(rows).toHaveLength(2);
  });

  it("stores exactly what it's given — never resolves customer/business info itself", async () => {
    const job = await createJob(ctx.db, {}, null);
    const invoice = await createInvoice(
      ctx.db,
      { jobId: job.id, customerName: "Hand-typed name" },
      null,
    );
    expect(invoice.customerName).toBe("Hand-typed name");
  });
});

describe("createInvoiceFromScratch", () => {
  let ctx: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    ctx = await createTestDb();
    await seedSequences(ctx.db);
  });

  afterEach(async () => {
    await ctx.client.close();
  });

  it("creates a minimal job and points a draft invoice at it", async () => {
    const invoice = await createInvoiceFromScratch(ctx.db, {}, null);
    expect(invoice.invoiceNumber).toBe("INV-0001");
    expect(invoice.status).toBe("draft");

    const [job] = await ctx.db.select().from(jobs).where(eq(jobs.id, invoice.jobId));
    expect(job).toBeTruthy();
    expect(job.jobNumber).toBe("JOB-0001");
  });

  it("attaches the given contact/property/organization to the created job", async () => {
    const contact = await createContact(ctx.db, { displayName: "Jane Doe" }, null);
    const property = await createProperty(
      ctx.db,
      { addressLine1: "1 Main St", city: "Saskatoon", province: "SK", postalCode: "S7K 0A1" },
      null,
    );
    const org = await createOrganization(ctx.db, { name: "Acme Co" }, null);

    const invoice = await createInvoiceFromScratch(
      ctx.db,
      { contactId: contact.id, propertyId: property.id, organizationId: org.id },
      null,
    );

    const [job] = await ctx.db.select().from(jobs).where(eq(jobs.id, invoice.jobId));
    expect(job.contactId).toBe(contact.id);
    expect(job.propertyId).toBe(property.id);
    expect(job.organizationId).toBe(org.id);
  });

  it("records job_created with the invoice-from-scratch source and invoice_created", async () => {
    const invoice = await createInvoiceFromScratch(ctx.db, {}, null);

    const jobActivity = await ctx.db
      .select()
      .from(activities)
      .where(and(eq(activities.entityType, "job"), eq(activities.entityId, invoice.jobId)));
    expect(jobActivity).toHaveLength(1);
    expect(jobActivity[0].action).toBe("job_created");
    expect(jobActivity[0].metadata).toEqual({ source: "invoice_created_from_scratch" });

    const invoiceActivity = await ctx.db
      .select()
      .from(activities)
      .where(and(eq(activities.entityType, "invoice"), eq(activities.entityId, invoice.id)));
    expect(invoiceActivity.map((a) => a.action)).toContain("invoice_created");
  });

  it("stores the given business/customer details and tax on the invoice", async () => {
    const invoice = await createInvoiceFromScratch(
      ctx.db,
      { customerName: "Jane Doe", taxCents: 500 },
      null,
    );
    expect(invoice.customerName).toBe("Jane Doe");
    expect(invoice.taxCents).toBe(500);
    expect(invoice.totalCents).toBe(500);
  });
});

describe("resolveInvoiceDefaults", () => {
  let ctx: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    ctx = await createTestDb();
    await seedSequences(ctx.db);
  });

  afterEach(async () => {
    await ctx.client.close();
  });

  it("returns nulls for a job with no contact/property/organization", async () => {
    const job = await createJob(ctx.db, {}, null);
    const defaults = await resolveInvoiceDefaults(ctx.db, job.id);
    expect(defaults.customerName).toBeNull();
    expect(defaults.customerAddress).toBeNull();
  });

  it("falls back to the contact's name when there's no organization", async () => {
    const contact = await createContact(ctx.db, { displayName: "Jane Doe" }, null);
    const job = await createJob(ctx.db, { contactId: contact.id }, null);
    const defaults = await resolveInvoiceDefaults(ctx.db, job.id);
    expect(defaults.customerName).toBe("Jane Doe");
  });

  it("falls back to the property's address when there's no organization address", async () => {
    const property = await createProperty(
      ctx.db,
      { addressLine1: "123 Main St", city: "Saskatoon", province: "SK", postalCode: "S7K 0A1" },
      null,
    );
    const job = await createJob(ctx.db, { propertyId: property.id }, null);
    const defaults = await resolveInvoiceDefaults(ctx.db, job.id);
    expect(defaults.customerAddress).toContain("123 Main St");
    expect(defaults.customerAddress).toContain("Saskatoon");
  });

  it("prefers the organization's name/address over the contact/property when both exist", async () => {
    const org = await createOrganization(
      ctx.db,
      { name: "Acme Property Management", address: "999 Business Way" },
      null,
    );
    const contact = await createContact(ctx.db, { displayName: "Jane Doe" }, null);
    const job = await createJob(ctx.db, { organizationId: org.id, contactId: contact.id }, null);
    const defaults = await resolveInvoiceDefaults(ctx.db, job.id);
    expect(defaults.customerName).toBe("Acme Property Management");
  });

  it("prefills business info from appSettings", async () => {
    await ctx.db
      .insert(appSettings)
      .values({ businessName: "Mr. Drain Plumbing", businessAddress: "1 Main St" });
    const job = await createJob(ctx.db, {}, null);
    const defaults = await resolveInvoiceDefaults(ctx.db, job.id);
    expect(defaults.businessName).toBe("Mr. Drain Plumbing");
    expect(defaults.businessAddress).toBe("1 Main St");
  });

  it("with no jobId, returns business-wide defaults and no customer prefill", async () => {
    await ctx.db.insert(appSettings).values({ businessName: "Mr. Drain Plumbing" });
    const defaults = await resolveInvoiceDefaults(ctx.db);
    expect(defaults.businessName).toBe("Mr. Drain Plumbing");
    expect(defaults.customerName).toBeNull();
    expect(defaults.customerAddress).toBeNull();
    expect(defaults.accentColor).toBe("#1e3a5f");
    expect(defaults.fontFamily).toBe("Helvetica");
  });
});

describe("invoice line items", () => {
  let ctx: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    ctx = await createTestDb();
    await seedSequences(ctx.db);
  });

  afterEach(async () => {
    await ctx.client.close();
  });

  it("adding a line item recomputes subtotal and total", async () => {
    const job = await createJob(ctx.db, {}, null);
    const invoice = await createInvoice(ctx.db, { jobId: job.id, taxCents: 1000 }, null);

    const result = await addInvoiceLineItem(
      ctx.db,
      invoice.id,
      { description: "Toilet replacement", unitPriceCents: 25000 },
      null,
    );
    expect(result.ok).toBe(true);

    const after = await getInvoice(ctx.db, invoice.id);
    expect(after?.subtotalCents).toBe(25000);
    expect(after?.totalCents).toBe(26000);
    expect(after?.lineItems).toHaveLength(1);
  });

  it("a fractional quantity computes the line total exactly", async () => {
    const job = await createJob(ctx.db, {}, null);
    const invoice = await createInvoice(ctx.db, { jobId: job.id }, null);

    await addInvoiceLineItem(
      ctx.db,
      invoice.id,
      { description: "Hours", quantity: "2.5", unitPriceCents: 10000 },
      null,
    );

    const after = await getInvoice(ctx.db, invoice.id);
    expect(after?.lineItems[0].lineTotalCents).toBe(25000);
    expect(after?.subtotalCents).toBe(25000);
  });

  it("a negative unit price represents a discount line and reduces the total", async () => {
    const job = await createJob(ctx.db, {}, null);
    const invoice = await createInvoice(ctx.db, { jobId: job.id }, null);

    await addInvoiceLineItem(
      ctx.db,
      invoice.id,
      { description: "Labour", unitPriceCents: 30000 },
      null,
    );
    await addInvoiceLineItem(
      ctx.db,
      invoice.id,
      { description: "Loyalty discount", unitPriceCents: -5000 },
      null,
    );

    const after = await getInvoice(ctx.db, invoice.id);
    expect(after?.subtotalCents).toBe(25000);
  });

  it("removing a line item recomputes the total", async () => {
    const job = await createJob(ctx.db, {}, null);
    const invoice = await createInvoice(ctx.db, { jobId: job.id }, null);
    const added = await addInvoiceLineItem(
      ctx.db,
      invoice.id,
      { description: "Part", unitPriceCents: 10000 },
      null,
    );
    if (!added.ok) throw new Error("expected ok");

    await removeInvoiceLineItem(ctx.db, invoice.id, added.lineItemId, null);

    const after = await getInvoice(ctx.db, invoice.id);
    expect(after?.lineItems).toHaveLength(0);
    expect(after?.subtotalCents).toBe(0);
  });

  it("editing a line item's quantity/price recomputes the total", async () => {
    const job = await createJob(ctx.db, {}, null);
    const invoice = await createInvoice(ctx.db, { jobId: job.id }, null);
    const added = await addInvoiceLineItem(
      ctx.db,
      invoice.id,
      { description: "Part", unitPriceCents: 10000 },
      null,
    );
    if (!added.ok) throw new Error("expected ok");

    await updateInvoiceLineItem(
      ctx.db,
      invoice.id,
      added.lineItemId,
      { unitPriceCents: 15000 },
      null,
    );

    const after = await getInvoice(ctx.db, invoice.id);
    expect(after?.lineItems[0].unitPriceCents).toBe(15000);
    expect(after?.subtotalCents).toBe(15000);
  });

  it("rejects adding a line item once the invoice is no longer Draft", async () => {
    const job = await createJob(ctx.db, {}, null);
    const invoice = await createInvoice(ctx.db, { jobId: job.id }, null);
    await markInvoiceSent(ctx.db, invoice.id, null);

    const result = await addInvoiceLineItem(
      ctx.db,
      invoice.id,
      { description: "Too late", unitPriceCents: 5000 },
      null,
    );
    expect(result).toEqual({ ok: false, error: "not_editable" });
  });

  it("rejects removing/editing a line item once sent", async () => {
    const job = await createJob(ctx.db, {}, null);
    const invoice = await createInvoice(ctx.db, { jobId: job.id }, null);
    const added = await addInvoiceLineItem(
      ctx.db,
      invoice.id,
      { description: "Part", unitPriceCents: 10000 },
      null,
    );
    if (!added.ok) throw new Error("expected ok");
    await markInvoiceSent(ctx.db, invoice.id, null);

    const removeResult = await removeInvoiceLineItem(ctx.db, invoice.id, added.lineItemId, null);
    expect(removeResult).toEqual({ ok: false, error: "not_editable" });

    const editResult = await updateInvoiceLineItem(
      ctx.db,
      invoice.id,
      added.lineItemId,
      { unitPriceCents: 1 },
      null,
    );
    expect(editResult).toEqual({ ok: false, error: "not_editable" });
  });

  it("records invoice_updated for each line-item mutation", async () => {
    const job = await createJob(ctx.db, {}, null);
    const invoice = await createInvoice(ctx.db, { jobId: job.id }, null);
    await addInvoiceLineItem(
      ctx.db,
      invoice.id,
      { description: "Part", unitPriceCents: 10000 },
      null,
    );

    const rows = await ctx.db
      .select()
      .from(activities)
      .where(
        and(
          eq(activities.entityType, "invoice"),
          eq(activities.entityId, invoice.id),
          eq(activities.action, "invoice_updated"),
        ),
      );
    expect(rows).toHaveLength(1);
  });
});

describe("updateInvoiceDetails", () => {
  let ctx: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    ctx = await createTestDb();
    await seedSequences(ctx.db);
  });

  afterEach(async () => {
    await ctx.client.close();
  });

  it("updates tax and recomputes the total against the existing subtotal", async () => {
    const job = await createJob(ctx.db, {}, null);
    const invoice = await createInvoice(ctx.db, { jobId: job.id }, null);
    await addInvoiceLineItem(
      ctx.db,
      invoice.id,
      { description: "Part", unitPriceCents: 10000 },
      null,
    );

    await updateInvoiceDetails(ctx.db, invoice.id, { taxCents: 800 }, null);

    const after = await getInvoice(ctx.db, invoice.id);
    expect(after?.taxCents).toBe(800);
    expect(after?.totalCents).toBe(10800);
  });

  it("rejects updates once the invoice is no longer Draft", async () => {
    const job = await createJob(ctx.db, {}, null);
    const invoice = await createInvoice(ctx.db, { jobId: job.id }, null);
    await markInvoiceSent(ctx.db, invoice.id, null);

    const result = await updateInvoiceDetails(ctx.db, invoice.id, { notes: "too late" }, null);
    expect(result).toEqual({ ok: false, error: "not_editable" });
  });

  it("updates the per-invoice accent color and font, falling back for an invalid value", async () => {
    const job = await createJob(ctx.db, {}, null);
    const invoice = await createInvoice(ctx.db, { jobId: job.id }, null);

    await updateInvoiceDetails(
      ctx.db,
      invoice.id,
      { accentColor: "#065f46", fontFamily: "Times-Roman" },
      null,
    );
    const after = await getInvoice(ctx.db, invoice.id);
    expect(after?.accentColor).toBe("#065f46");
    expect(after?.fontFamily).toBe("Times-Roman");

    await updateInvoiceDetails(ctx.db, invoice.id, { accentColor: "#not-a-real-option" }, null);
    const afterInvalid = await getInvoice(ctx.db, invoice.id);
    expect(afterInvalid?.accentColor).toBe("#1e3a5f");
  });

  it("updates the logo key independently of the business-wide default", async () => {
    const job = await createJob(ctx.db, {}, null);
    const invoice = await createInvoice(ctx.db, { jobId: job.id }, null);

    await updateInvoiceDetails(ctx.db, invoice.id, { logoKey: "settings/logo/new.png" }, null);
    const after = await getInvoice(ctx.db, invoice.id);
    expect(after?.logoKey).toBe("settings/logo/new.png");
  });
});

describe("markInvoiceSent", () => {
  let ctx: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    ctx = await createTestDb();
    await seedSequences(ctx.db);
  });

  afterEach(async () => {
    await ctx.client.close();
  });

  it("transitions draft to sent and sets sentAt", async () => {
    const job = await createJob(ctx.db, {}, null);
    const invoice = await createInvoice(ctx.db, { jobId: job.id }, null);

    const result = await markInvoiceSent(ctx.db, invoice.id, null);
    expect(result.ok).toBe(true);

    const after = await getInvoice(ctx.db, invoice.id);
    expect(after?.status).toBe("sent");
    expect(after?.sentAt).not.toBeNull();
  });

  it("rejects marking an already-sent invoice sent again", async () => {
    const job = await createJob(ctx.db, {}, null);
    const invoice = await createInvoice(ctx.db, { jobId: job.id }, null);
    await markInvoiceSent(ctx.db, invoice.id, null);

    const result = await markInvoiceSent(ctx.db, invoice.id, null);
    expect(result).toEqual({ ok: false, error: "invalid_transition" });
  });

  it("records invoice_status_changed with old/new status", async () => {
    const job = await createJob(ctx.db, {}, null);
    const invoice = await createInvoice(ctx.db, { jobId: job.id }, null);
    await markInvoiceSent(ctx.db, invoice.id, null);

    const rows = await ctx.db
      .select()
      .from(activities)
      .where(
        and(
          eq(activities.entityType, "invoice"),
          eq(activities.entityId, invoice.id),
          eq(activities.action, "invoice_status_changed"),
        ),
      );
    expect(rows).toHaveLength(1);
    expect(rows[0].oldValue).toEqual({ status: "draft" });
    expect(rows[0].newValue).toEqual({ status: "sent" });
  });
});

describe("voidInvoice", () => {
  let ctx: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    ctx = await createTestDb();
    await seedSequences(ctx.db);
  });

  afterEach(async () => {
    await ctx.client.close();
  });

  it("voids a draft invoice with a required reason", async () => {
    const job = await createJob(ctx.db, {}, null);
    const invoice = await createInvoice(ctx.db, { jobId: job.id }, null);

    const result = await voidInvoice(ctx.db, invoice.id, "Created in error", null);
    expect(result.ok).toBe(true);

    const after = await getInvoice(ctx.db, invoice.id);
    expect(after?.status).toBe("void");
    expect(after?.voidReason).toBe("Created in error");
    expect(after?.voidedAt).not.toBeNull();
  });

  it("can void a sent invoice too — voiding isn't limited to draft", async () => {
    const job = await createJob(ctx.db, {}, null);
    const invoice = await createInvoice(ctx.db, { jobId: job.id }, null);
    await markInvoiceSent(ctx.db, invoice.id, null);

    const result = await voidInvoice(ctx.db, invoice.id, "Customer cancelled", null);
    expect(result.ok).toBe(true);
  });

  it("rejects voiding an already-void invoice", async () => {
    const job = await createJob(ctx.db, {}, null);
    const invoice = await createInvoice(ctx.db, { jobId: job.id }, null);
    await voidInvoice(ctx.db, invoice.id, "First reason", null);

    const result = await voidInvoice(ctx.db, invoice.id, "Second reason", null);
    expect(result).toEqual({ ok: false, error: "already_void" });
  });

  it("never reuses a voided invoice's number", async () => {
    const job = await createJob(ctx.db, {}, null);
    const voided = await createInvoice(ctx.db, { jobId: job.id }, null);
    await voidInvoice(ctx.db, voided.id, "Mistake", null);

    const next = await createInvoice(ctx.db, { jobId: job.id }, null);
    expect(next.invoiceNumber).not.toBe(voided.invoiceNumber);
    expect(next.invoiceNumber).toBe("INV-0002");
  });
});

describe("listInvoices", () => {
  let ctx: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    ctx = await createTestDb();
    await seedSequences(ctx.db);
  });

  afterEach(async () => {
    await ctx.client.close();
  });

  it("filters by status", async () => {
    const job = await createJob(ctx.db, {}, null);
    const draftInvoice = await createInvoice(ctx.db, { jobId: job.id }, null);
    const sentInvoice = await createInvoice(ctx.db, { jobId: job.id }, null);
    await markInvoiceSent(ctx.db, sentInvoice.id, null);

    const { rows } = await listInvoices(ctx.db, { status: "sent" });
    expect(rows.map((r) => r.id)).toEqual([sentInvoice.id]);
    expect(rows.map((r) => r.id)).not.toContain(draftInvoice.id);
  });

  it("searches by invoice number, customer name, or job number", async () => {
    const job = await createJob(ctx.db, {}, null);
    const invoice = await createInvoice(ctx.db, { jobId: job.id, customerName: "Jane Doe" }, null);

    expect(
      (await listInvoices(ctx.db, { search: invoice.invoiceNumber })).rows.map((r) => r.id),
    ).toEqual([invoice.id]);
    expect((await listInvoices(ctx.db, { search: "Jane" })).rows.map((r) => r.id)).toEqual([
      invoice.id,
    ]);
    expect((await listInvoices(ctx.db, { search: job.jobNumber })).rows.map((r) => r.id)).toEqual([
      invoice.id,
    ]);
  });
});
