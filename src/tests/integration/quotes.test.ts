// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { createTestDb } from "../helpers/test-db";
import { createContact } from "@/lib/crm/contacts";
import { createOrganization } from "@/lib/crm/organizations";
import { createProperty } from "@/lib/crm/properties";
import {
  addQuoteCustomCharge,
  addQuoteLineItem,
  cancelQuote,
  convertQuoteToJob,
  createQuote,
  getQuote,
  listQuotes,
  listQuotesForContact,
  markQuoteAccepted,
  markQuoteDeclined,
  markQuoteSent,
  removeQuoteCustomCharge,
  removeQuoteLineItem,
  updateQuoteDetails,
  updateQuoteLineItem,
} from "@/lib/quotes/quotes";
import { activities, appSettings, jobs, quotes, sequences } from "@/lib/db/schema";

async function seedSequences(db: Awaited<ReturnType<typeof createTestDb>>["db"]) {
  await db.insert(sequences).values([
    { name: "job", prefix: "JOB-", nextNumber: 1, minDigits: 4 },
    { name: "quote", prefix: "QUO-", nextNumber: 1, minDigits: 4 },
  ]);
}

describe("createQuote", () => {
  let ctx: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    ctx = await createTestDb();
    await seedSequences(ctx.db);
  });

  afterEach(async () => {
    await ctx.client.close();
  });

  it("creates a draft quote with an allocated sequential number and no relationships required", async () => {
    const quote = await createQuote(ctx.db, {}, null);
    expect(quote.quoteNumber).toBe("QUO-0001");
    expect(quote.status).toBe("draft");
    expect(quote.subtotalCents).toBe(0);
  });

  it("allocates sequential, never-repeating numbers", async () => {
    const a = await createQuote(ctx.db, {}, null);
    const b = await createQuote(ctx.db, {}, null);
    expect(a.quoteNumber).toBe("QUO-0001");
    expect(b.quoteNumber).toBe("QUO-0002");
  });

  it("stores manual tax with zero subtotal when there are no line items", async () => {
    const quote = await createQuote(ctx.db, { taxCents: 500 }, null);
    expect(quote.subtotalCents).toBe(0);
    expect(quote.taxCents).toBe(500);
  });

  it("records quote_created activity", async () => {
    const quote = await createQuote(ctx.db, {}, null);
    const rows = await ctx.db
      .select()
      .from(activities)
      .where(and(eq(activities.entityType, "quote"), eq(activities.entityId, quote.id)));
    expect(rows.map((r) => r.action)).toContain("quote_created");
  });

  it("stores the contact/property/organization relationships it's given", async () => {
    const contact = await createContact(ctx.db, { displayName: "Jane Doe" }, null);
    const property = await createProperty(
      ctx.db,
      { addressLine1: "123 Main St", city: "Saskatoon", province: "SK", postalCode: "S7K 0A1" },
      null,
    );
    const org = await createOrganization(ctx.db, { name: "Acme Co" }, null);

    const quote = await createQuote(
      ctx.db,
      { contactId: contact.id, propertyId: property.id, organizationId: org.id },
      null,
    );
    expect(quote.contactId).toBe(contact.id);
    expect(quote.propertyId).toBe(property.id);
    expect(quote.organizationId).toBe(org.id);
  });
});

describe("getQuote", () => {
  let ctx: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    ctx = await createTestDb();
    await seedSequences(ctx.db);
  });

  afterEach(async () => {
    await ctx.client.close();
  });

  it("resolves customer display info live from the linked contact/organization/property", async () => {
    const contact = await createContact(ctx.db, { displayName: "Jane Doe" }, null);
    const org = await createOrganization(ctx.db, { name: "Acme Co" }, null);
    const quote = await createQuote(
      ctx.db,
      { contactId: contact.id, organizationId: org.id },
      null,
    );

    const fetched = await getQuote(ctx.db, quote.id);
    expect(fetched?.contactName).toBe("Jane Doe");
    expect(fetched?.organizationName).toBe("Acme Co");
  });

  it("returns null for a missing quote", async () => {
    expect(await getQuote(ctx.db, "00000000-0000-0000-0000-000000000000")).toBeNull();
  });
});

describe("quote line items and custom charges", () => {
  let ctx: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    ctx = await createTestDb();
    await seedSequences(ctx.db);
  });

  afterEach(async () => {
    await ctx.client.close();
  });

  it("adding a line item recomputes the subtotal", async () => {
    const quote = await createQuote(ctx.db, { taxCents: 1000 }, null);
    const result = await addQuoteLineItem(
      ctx.db,
      quote.id,
      { description: "Toilet replacement", unitPriceCents: 25000 },
      null,
    );
    expect(result.ok).toBe(true);

    const after = await getQuote(ctx.db, quote.id);
    expect(after?.subtotalCents).toBe(25000);
    expect(after?.lineItems).toHaveLength(1);
  });

  it("custom charges are added to the subtotal alongside line items", async () => {
    const quote = await createQuote(ctx.db, {}, null);
    await addQuoteLineItem(
      ctx.db,
      quote.id,
      { description: "Toilet replacement", unitPriceCents: 25000 },
      null,
    );
    const chargeResult = await addQuoteCustomCharge(ctx.db, quote.id, "Permit fee", 5000, null);
    expect(chargeResult.ok).toBe(true);

    const after = await getQuote(ctx.db, quote.id);
    expect(after?.subtotalCents).toBe(30000);
    expect(after?.customCharges).toHaveLength(1);
  });

  it("a negative custom charge amount is a discount and reduces the subtotal", async () => {
    const quote = await createQuote(ctx.db, {}, null);
    await addQuoteLineItem(
      ctx.db,
      quote.id,
      { description: "Labour", unitPriceCents: 30000 },
      null,
    );
    await addQuoteCustomCharge(ctx.db, quote.id, "Loyalty discount", -5000, null);

    const after = await getQuote(ctx.db, quote.id);
    expect(after?.subtotalCents).toBe(25000);
  });

  it("removing a line item recomputes the subtotal", async () => {
    const quote = await createQuote(ctx.db, {}, null);
    const added = await addQuoteLineItem(
      ctx.db,
      quote.id,
      { description: "Part", unitPriceCents: 10000 },
      null,
    );
    if (!added.ok) throw new Error("expected ok");

    await removeQuoteLineItem(ctx.db, quote.id, added.lineItemId, null);

    const after = await getQuote(ctx.db, quote.id);
    expect(after?.lineItems).toHaveLength(0);
    expect(after?.subtotalCents).toBe(0);
  });

  it("removing a custom charge recomputes the subtotal", async () => {
    const quote = await createQuote(ctx.db, {}, null);
    const added = await addQuoteCustomCharge(ctx.db, quote.id, "Permit fee", 5000, null);
    if (!added.ok) throw new Error("expected ok");

    await removeQuoteCustomCharge(ctx.db, quote.id, added.chargeId, null);

    const after = await getQuote(ctx.db, quote.id);
    expect(after?.customCharges).toHaveLength(0);
    expect(after?.subtotalCents).toBe(0);
  });

  it("editing a line item recomputes the subtotal", async () => {
    const quote = await createQuote(ctx.db, {}, null);
    const added = await addQuoteLineItem(
      ctx.db,
      quote.id,
      { description: "Part", unitPriceCents: 10000 },
      null,
    );
    if (!added.ok) throw new Error("expected ok");

    await updateQuoteLineItem(ctx.db, quote.id, added.lineItemId, { unitPriceCents: 15000 }, null);

    const after = await getQuote(ctx.db, quote.id);
    expect(after?.subtotalCents).toBe(15000);
  });

  it("a fractional quantity computes the line total exactly", async () => {
    const quote = await createQuote(ctx.db, {}, null);
    await addQuoteLineItem(
      ctx.db,
      quote.id,
      { description: "Hours", quantity: "2.5", unitPriceCents: 10000 },
      null,
    );
    const after = await getQuote(ctx.db, quote.id);
    expect(after?.lineItems[0].lineTotalCents).toBe(25000);
  });

  it("rejects mutating line items and custom charges once the quote is no longer Draft", async () => {
    const quote = await createQuote(ctx.db, {}, null);
    await markQuoteSent(ctx.db, quote.id, null);

    expect(
      await addQuoteLineItem(ctx.db, quote.id, { description: "Late", unitPriceCents: 100 }, null),
    ).toEqual({ ok: false, error: "not_editable" });
    expect(await addQuoteCustomCharge(ctx.db, quote.id, "Late", 100, null)).toEqual({
      ok: false,
      error: "not_editable",
    });
  });
});

describe("quote status transitions", () => {
  let ctx: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    ctx = await createTestDb();
    await seedSequences(ctx.db);
  });

  afterEach(async () => {
    await ctx.client.close();
  });

  it("draft -> sent -> accepted is a valid path", async () => {
    const quote = await createQuote(ctx.db, {}, null);
    expect((await markQuoteSent(ctx.db, quote.id, null)).ok).toBe(true);
    expect((await markQuoteAccepted(ctx.db, quote.id, null)).ok).toBe(true);

    const after = await getQuote(ctx.db, quote.id);
    expect(after?.status).toBe("accepted");
  });

  it("cannot mark accepted directly from draft — must be sent first", async () => {
    const quote = await createQuote(ctx.db, {}, null);
    expect(await markQuoteAccepted(ctx.db, quote.id, null)).toEqual({
      ok: false,
      error: "invalid_transition",
    });
  });

  it("declined is allowed from sent or accepted", async () => {
    const sentThenDeclined = await createQuote(ctx.db, {}, null);
    await markQuoteSent(ctx.db, sentThenDeclined.id, null);
    expect((await markQuoteDeclined(ctx.db, sentThenDeclined.id, null)).ok).toBe(true);

    const acceptedThenDeclined = await createQuote(ctx.db, {}, null);
    await markQuoteSent(ctx.db, acceptedThenDeclined.id, null);
    await markQuoteAccepted(ctx.db, acceptedThenDeclined.id, null);
    expect((await markQuoteDeclined(ctx.db, acceptedThenDeclined.id, null)).ok).toBe(true);
  });

  it("declined is rejected directly from draft", async () => {
    const quote = await createQuote(ctx.db, {}, null);
    expect(await markQuoteDeclined(ctx.db, quote.id, null)).toEqual({
      ok: false,
      error: "invalid_transition",
    });
  });

  it("cancel (the void/archive equivalent) is allowed from draft, sent, or accepted", async () => {
    const fromDraft = await createQuote(ctx.db, {}, null);
    expect((await cancelQuote(ctx.db, fromDraft.id, null)).ok).toBe(true);

    const fromSent = await createQuote(ctx.db, {}, null);
    await markQuoteSent(ctx.db, fromSent.id, null);
    expect((await cancelQuote(ctx.db, fromSent.id, null)).ok).toBe(true);
  });

  it("cancel is rejected once already declined/expired/cancelled", async () => {
    const quote = await createQuote(ctx.db, {}, null);
    await cancelQuote(ctx.db, quote.id, null);
    expect(await cancelQuote(ctx.db, quote.id, null)).toEqual({
      ok: false,
      error: "invalid_transition",
    });
  });

  it("records quote_status_changed with old/new status", async () => {
    const quote = await createQuote(ctx.db, {}, null);
    await markQuoteSent(ctx.db, quote.id, null);

    const rows = await ctx.db
      .select()
      .from(activities)
      .where(
        and(
          eq(activities.entityType, "quote"),
          eq(activities.entityId, quote.id),
          eq(activities.action, "quote_status_changed"),
        ),
      );
    expect(rows).toHaveLength(1);
    expect(rows[0].oldValue).toEqual({ status: "draft" });
    expect(rows[0].newValue).toEqual({ status: "sent" });
  });
});

describe("updateQuoteDetails", () => {
  let ctx: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    ctx = await createTestDb();
    await seedSequences(ctx.db);
  });

  afterEach(async () => {
    await ctx.client.close();
  });

  it("updates tax without disturbing the subtotal", async () => {
    const quote = await createQuote(ctx.db, {}, null);
    await addQuoteLineItem(ctx.db, quote.id, { description: "Part", unitPriceCents: 10000 }, null);

    await updateQuoteDetails(ctx.db, quote.id, { taxCents: 800 }, null);

    const after = await getQuote(ctx.db, quote.id);
    expect(after?.taxCents).toBe(800);
    expect(after?.subtotalCents).toBe(10000);
  });

  it("rejects updates once the quote is no longer Draft", async () => {
    const quote = await createQuote(ctx.db, {}, null);
    await markQuoteSent(ctx.db, quote.id, null);

    expect(await updateQuoteDetails(ctx.db, quote.id, { notes: "too late" }, null)).toEqual({
      ok: false,
      error: "not_editable",
    });
  });
});

describe("convertQuoteToJob", () => {
  let ctx: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    ctx = await createTestDb();
    await seedSequences(ctx.db);
  });

  afterEach(async () => {
    await ctx.client.close();
  });

  async function acceptedQuote() {
    const quote = await createQuote(ctx.db, { description: "Bathroom reno" }, null);
    await markQuoteSent(ctx.db, quote.id, null);
    await markQuoteAccepted(ctx.db, quote.id, null);
    return quote;
  }

  it("rejects conversion unless the quote is Accepted", async () => {
    const draft = await createQuote(ctx.db, {}, null);
    expect(await convertQuoteToJob(ctx.db, draft.id, null)).toEqual({
      ok: false,
      error: "invalid_status",
    });

    const sent = await createQuote(ctx.db, {}, null);
    await markQuoteSent(ctx.db, sent.id, null);
    expect(await convertQuoteToJob(ctx.db, sent.id, null)).toEqual({
      ok: false,
      error: "invalid_status",
    });
  });

  it("converts an Accepted quote into a new job with an allocated job number", async () => {
    const quote = await acceptedQuote();
    const result = await convertQuoteToJob(ctx.db, quote.id, null);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.jobNumber).toBe("JOB-0001");

    const [job] = await ctx.db.select().from(jobs).where(eq(jobs.id, result.jobId));
    expect(job.issueDescription).toBe("Bathroom reno");
  });

  it("preserves contact/property/organization on the created job", async () => {
    const contact = await createContact(ctx.db, { displayName: "Jane Doe" }, null);
    const org = await createOrganization(ctx.db, { name: "Acme Co" }, null);
    const quote = await createQuote(
      ctx.db,
      { contactId: contact.id, organizationId: org.id },
      null,
    );
    await markQuoteSent(ctx.db, quote.id, null);
    await markQuoteAccepted(ctx.db, quote.id, null);

    const result = await convertQuoteToJob(ctx.db, quote.id, null);
    if (!result.ok) throw new Error("expected ok");

    const [job] = await ctx.db.select().from(jobs).where(eq(jobs.id, result.jobId));
    expect(job.contactId).toBe(contact.id);
    expect(job.organizationId).toBe(org.id);
  });

  it("marks the quote converted and links it to the job — status stays Accepted, not a new enum value", async () => {
    const quote = await acceptedQuote();
    const result = await convertQuoteToJob(ctx.db, quote.id, null);
    if (!result.ok) throw new Error("expected ok");

    const after = await getQuote(ctx.db, quote.id);
    expect(after?.convertedJobId).toBe(result.jobId);
    expect(after?.status).toBe("accepted");
  });

  it("rejects converting an already-converted quote a second time — never creates a duplicate job", async () => {
    const quote = await acceptedQuote();
    const first = await convertQuoteToJob(ctx.db, quote.id, null);
    expect(first.ok).toBe(true);

    const second = await convertQuoteToJob(ctx.db, quote.id, null);
    expect(second).toEqual({ ok: false, error: "already_converted" });

    const allJobs = await ctx.db.select().from(jobs);
    expect(allJobs).toHaveLength(1);
  });

  it("records quote_converted and job_created_from_quote activities", async () => {
    const quote = await acceptedQuote();
    const result = await convertQuoteToJob(ctx.db, quote.id, null);
    if (!result.ok) throw new Error("expected ok");

    const quoteActivity = await ctx.db
      .select()
      .from(activities)
      .where(
        and(
          eq(activities.entityType, "quote"),
          eq(activities.entityId, quote.id),
          eq(activities.action, "quote_converted"),
        ),
      );
    expect(quoteActivity).toHaveLength(1);

    const jobActivity = await ctx.db
      .select()
      .from(activities)
      .where(
        and(
          eq(activities.entityType, "job"),
          eq(activities.entityId, result.jobId),
          eq(activities.action, "job_created_from_quote"),
        ),
      );
    expect(jobActivity).toHaveLength(1);
  });

  it("applies the current appSettings tax inclusion default to the new job", async () => {
    await ctx.db.insert(appSettings).values({ taxInclusionDefault: "included" });
    const quote = await acceptedQuote();
    const result = await convertQuoteToJob(ctx.db, quote.id, null);
    if (!result.ok) throw new Error("expected ok");

    const [job] = await ctx.db.select().from(jobs).where(eq(jobs.id, result.jobId));
    expect(job.taxInclusionMode).toBe("included");
  });

  it("never populates the new job's financial fields from the quote total", async () => {
    const quote = await createQuote(ctx.db, { taxCents: 5000 }, null);
    await addQuoteLineItem(ctx.db, quote.id, { description: "Part", unitPriceCents: 50000 }, null);
    await markQuoteSent(ctx.db, quote.id, null);
    await markQuoteAccepted(ctx.db, quote.id, null);

    const result = await convertQuoteToJob(ctx.db, quote.id, null);
    if (!result.ok) throw new Error("expected ok");

    const [job] = await ctx.db.select().from(jobs).where(eq(jobs.id, result.jobId));
    expect(job.jobAmountCents).toBe(0);
    expect(job.taxAmountCents).toBe(0);
  });
});

describe("listQuotes and listQuotesForContact", () => {
  let ctx: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    ctx = await createTestDb();
    await seedSequences(ctx.db);
  });

  afterEach(async () => {
    await ctx.client.close();
  });

  it("filters by status", async () => {
    const draft = await createQuote(ctx.db, {}, null);
    const sent = await createQuote(ctx.db, {}, null);
    await markQuoteSent(ctx.db, sent.id, null);

    const { rows } = await listQuotes(ctx.db, { status: "sent" });
    expect(rows.map((r) => r.id)).toEqual([sent.id]);
    expect(rows.map((r) => r.id)).not.toContain(draft.id);
  });

  it("searches by quote number or contact/organization name", async () => {
    const contact = await createContact(ctx.db, { displayName: "Jane Doe" }, null);
    const quote = await createQuote(ctx.db, { contactId: contact.id }, null);

    expect((await listQuotes(ctx.db, { search: quote.quoteNumber })).rows.map((r) => r.id)).toEqual(
      [quote.id],
    );
    expect((await listQuotes(ctx.db, { search: "Jane" })).rows.map((r) => r.id)).toEqual([
      quote.id,
    ]);
  });

  it("listQuotesForContact returns only quotes for that contact — quotes have no leadId (decision 1)", async () => {
    const contactA = await createContact(ctx.db, { displayName: "Jane Doe" }, null);
    const contactB = await createContact(ctx.db, { displayName: "John Smith" }, null);
    const quoteA = await createQuote(ctx.db, { contactId: contactA.id }, null);
    await createQuote(ctx.db, { contactId: contactB.id }, null);

    const rows = await listQuotesForContact(ctx.db, contactA.id);
    expect(rows.map((r) => r.id)).toEqual([quoteA.id]);
  });
});

describe("quote_status enum includes cancelled", () => {
  let ctx: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    ctx = await createTestDb();
    await seedSequences(ctx.db);
  });

  afterEach(async () => {
    await ctx.client.close();
  });

  it("a cancelled quote can be persisted and read back", async () => {
    const quote = await createQuote(ctx.db, {}, null);
    await ctx.db.update(quotes).set({ status: "cancelled" }).where(eq(quotes.id, quote.id));

    const after = await getQuote(ctx.db, quote.id);
    expect(after?.status).toBe("cancelled");
  });
});
