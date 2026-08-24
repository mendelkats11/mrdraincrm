// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { createTestDb } from "../helpers/test-db";
import { createContact } from "@/lib/crm/contacts";
import {
  createContactFromCall,
  createLeadFromCall,
  getCall,
  ignoreCall,
  listCalls,
  listMessages,
  processCallWebhook,
  processMessageWebhook,
} from "@/lib/callrail/calls";
import {
  listServiceAreasForTrackingConfig,
  updateServiceAreaTrackingNumber,
} from "@/lib/callrail/service-areas";
import { activities, calls, contacts, messages, serviceAreas } from "@/lib/db/schema";

describe("processCallWebhook", () => {
  let ctx: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    ctx = await createTestDb();
  });
  afterEach(async () => {
    await ctx.client.close();
  });

  it("creates a call record from a valid payload", async () => {
    const result = await processCallWebhook(ctx.db, {
      id: "CAL1",
      customer_phone_number: "+13065551234",
      tracking_phone_number: "+13065559999",
      answered: true,
      duration: 90,
    });
    expect(result).toEqual({ ok: true, duplicate: false, callId: expect.any(String) });

    if (!result.ok || result.duplicate) throw new Error("expected a fresh call");
    const call = await getCall(ctx.db, result.callId);
    expect(call?.callerNumber).toBe("+13065551234");
    expect(call?.matched).toBe(false);
  });

  it("the exact same webhook delivered twice creates exactly one call record", async () => {
    const payload = { id: "CAL-DUPE", customer_phone_number: "+13065551234" };
    const first = await processCallWebhook(ctx.db, payload);
    const second = await processCallWebhook(ctx.db, payload);

    expect(first).toMatchObject({ duplicate: false });
    expect(second).toEqual({ ok: true, duplicate: true });

    const rows = await ctx.db.select().from(calls).where(eq(calls.callrailCallId, "CAL-DUPE"));
    expect(rows).toHaveLength(1);
  });

  it("matches an existing contact by phone number and never auto-creates one for an unknown caller", async () => {
    const contact = await createContact(
      ctx.db,
      { displayName: "Jane Doe", phone: { e164: "+13065551234", normalized: "13065551234" } },
      null,
    );

    const matched = await processCallWebhook(ctx.db, {
      id: "CAL-KNOWN",
      customer_phone_number: "+13065551234",
    });
    if (!matched.ok || matched.duplicate) throw new Error("expected ok");
    const matchedCall = await getCall(ctx.db, matched.callId);
    expect(matchedCall?.contactId).toBe(contact.id);
    expect(matchedCall?.matched).toBe(true);

    const unknown = await processCallWebhook(ctx.db, {
      id: "CAL-UNKNOWN",
      customer_phone_number: "+13065559876",
    });
    if (!unknown.ok || unknown.duplicate) throw new Error("expected ok");
    const unknownCall = await getCall(ctx.db, unknown.callId);
    expect(unknownCall?.contactId).toBeNull();
    expect(unknownCall?.matched).toBe(false);

    // No new contact was created for the unknown caller.
    const allContacts = await ctx.db.select().from(contacts);
    expect(allContacts).toHaveLength(1);
  });

  it("resolves the service area from the tracking number", async () => {
    const [area] = await ctx.db
      .insert(serviceAreas)
      .values({ name: "Stonebridge", slug: "stonebridge", callrailTrackingNumber: "+13065559999" })
      .returning();

    const result = await processCallWebhook(ctx.db, {
      id: "CAL-AREA",
      customer_phone_number: "+13065551234",
      tracking_phone_number: "+13065559999",
    });
    if (!result.ok || result.duplicate) throw new Error("expected ok");
    const call = await getCall(ctx.db, result.callId);
    expect(call?.serviceAreaId).toBe(area.id);
    expect(call?.serviceAreaName).toBe("Stonebridge");
  });

  it("resolves the service area even when the stored tracking number and the incoming one are formatted differently", async () => {
    // Real-world bug: the Service Area settings screen accepts free-text
    // (an admin might type "(306) 555-9999"), while CallRail's API/webhook
    // payloads always send E.164 ("+13065559999") — an exact-string match
    // between the two would never resolve, even for the identical number.
    const [area] = await ctx.db
      .insert(serviceAreas)
      .values({
        name: "Brighton",
        slug: "brighton",
        callrailTrackingNumber: "(306) 555-9999",
      })
      .returning();

    const result = await processCallWebhook(ctx.db, {
      id: "CAL-AREA-FORMAT",
      customer_phone_number: "+13065551234",
      tracking_phone_number: "+13065559999",
    });
    if (!result.ok || result.duplicate) throw new Error("expected ok");
    const call = await getCall(ctx.db, result.callId);
    expect(call?.serviceAreaId).toBe(area.id);
  });

  it("leaves the service area unset when no configured tracking number matches", async () => {
    await ctx.db
      .insert(serviceAreas)
      .values({ name: "Warman", slug: "warman", callrailTrackingNumber: null });

    const result = await processCallWebhook(ctx.db, {
      id: "CAL-NO-AREA",
      customer_phone_number: "+13065551234",
      tracking_phone_number: "+13065551111",
    });
    if (!result.ok || result.duplicate) throw new Error("expected ok");
    const call = await getCall(ctx.db, result.callId);
    expect(call?.serviceAreaId).toBeNull();
  });

  it("returns unparseable_payload for a payload with no identifiable fields", async () => {
    const result = await processCallWebhook(ctx.db, { irrelevant: "data" });
    expect(result).toEqual({ ok: false, error: "unparseable_payload" });
  });

  it("records a call_received activity", async () => {
    const result = await processCallWebhook(ctx.db, {
      id: "CAL-ACT",
      customer_phone_number: "+13065551234",
    });
    if (!result.ok || result.duplicate) throw new Error("expected ok");
    const rows = await ctx.db
      .select()
      .from(activities)
      .where(and(eq(activities.entityType, "call"), eq(activities.entityId, result.callId)));
    expect(rows.map((r) => r.action)).toContain("call_received");
  });
});

describe("processMessageWebhook", () => {
  let ctx: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    ctx = await createTestDb();
  });
  afterEach(async () => {
    await ctx.client.close();
  });

  it("creates a message record and is idempotent under duplicate delivery", async () => {
    const payload = { id: "SMS1", customer_phone_number: "+13065551234", text: "hello" };
    const first = await processMessageWebhook(ctx.db, payload);
    const second = await processMessageWebhook(ctx.db, payload);

    expect(first).toMatchObject({ duplicate: false });
    expect(second).toEqual({ ok: true, duplicate: true });

    const rows = await ctx.db.select().from(messages).where(eq(messages.callrailMessageId, "SMS1"));
    expect(rows).toHaveLength(1);
    expect(rows[0].body).toBe("hello");
  });

  it("listMessages returns the created message, newest first", async () => {
    await processMessageWebhook(ctx.db, {
      id: "SMS-LIST-1",
      customer_phone_number: "+13065551234",
      text: "first",
    });
    await processMessageWebhook(ctx.db, {
      id: "SMS-LIST-2",
      customer_phone_number: "+13065551234",
      text: "second",
    });

    const { rows } = await listMessages(ctx.db);
    expect(rows.map((r) => r.body)).toEqual(["second", "first"]);
  });
});

describe("ignoreCall", () => {
  let ctx: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    ctx = await createTestDb();
  });
  afterEach(async () => {
    await ctx.client.close();
  });

  it("marks a call ignored and records activity", async () => {
    const result = await processCallWebhook(ctx.db, {
      id: "CAL-IGNORE",
      customer_phone_number: "+13065551234",
    });
    if (!result.ok || result.duplicate) throw new Error("expected ok");

    expect((await ignoreCall(ctx.db, result.callId, null)).ok).toBe(true);
    const call = await getCall(ctx.db, result.callId);
    expect(call?.ignored).toBe(true);
  });

  it("returns not_found for a missing call", async () => {
    expect(await ignoreCall(ctx.db, "00000000-0000-0000-0000-000000000000", null)).toEqual({
      ok: false,
      error: "not_found",
    });
  });
});

describe("createContactFromCall and createLeadFromCall", () => {
  let ctx: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    ctx = await createTestDb();
  });
  afterEach(async () => {
    await ctx.client.close();
  });

  it("creates a contact and retroactively matches historical calls from the same number", async () => {
    const first = await processCallWebhook(ctx.db, {
      id: "CAL-HIST-1",
      customer_phone_number: "+13065551234",
    });
    const second = await processCallWebhook(ctx.db, {
      id: "CAL-HIST-2",
      customer_phone_number: "+13065551234",
    });
    if (!first.ok || first.duplicate || !second.ok || second.duplicate) {
      throw new Error("expected ok");
    }

    const result = await createContactFromCall(
      ctx.db,
      first.callId,
      { displayName: "New Caller" },
      null,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const call1 = await getCall(ctx.db, first.callId);
    const call2 = await getCall(ctx.db, second.callId);
    expect(call1?.contactId).toBe(result.contactId);
    expect(call2?.contactId).toBe(result.contactId);
    expect(call1?.matched).toBe(true);
    expect(call2?.matched).toBe(true);
  });

  it("creates a contact and a linked lead in one action", async () => {
    const call = await processCallWebhook(ctx.db, {
      id: "CAL-LEAD",
      customer_phone_number: "+13065551234",
    });
    if (!call.ok || call.duplicate) throw new Error("expected ok");

    const result = await createLeadFromCall(
      ctx.db,
      call.callId,
      { displayName: "New Caller", issueDescription: "Leaky faucet" },
      null,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const updatedCall = await getCall(ctx.db, call.callId);
    expect(updatedCall?.contactId).toBe(result.contactId);
  });

  it("returns not_found for a missing call", async () => {
    const result = await createContactFromCall(
      ctx.db,
      "00000000-0000-0000-0000-000000000000",
      { displayName: "X" },
      null,
    );
    expect(result).toEqual({ ok: false, error: "not_found" });
  });
});

describe("listCalls filters", () => {
  let ctx: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    ctx = await createTestDb();
  });
  afterEach(async () => {
    await ctx.client.close();
  });

  it("filters by unmatched/matched/ignored", async () => {
    const contact = await createContact(
      ctx.db,
      { displayName: "Jane", phone: { e164: "+13065551111", normalized: "13065551111" } },
      null,
    );
    const matchedResult = await processCallWebhook(ctx.db, {
      id: "CAL-F-1",
      customer_phone_number: "+13065551111",
    });
    const unmatchedResult = await processCallWebhook(ctx.db, {
      id: "CAL-F-2",
      customer_phone_number: "+13065552222",
    });
    const toIgnore = await processCallWebhook(ctx.db, {
      id: "CAL-F-3",
      customer_phone_number: "+13065553333",
    });
    if (!toIgnore.ok || toIgnore.duplicate) throw new Error("expected ok");
    await ignoreCall(ctx.db, toIgnore.callId, null);

    if (!matchedResult.ok || matchedResult.duplicate) throw new Error("expected ok");
    const matchedRows = (await listCalls(ctx.db, { status: "matched" })).rows;
    expect(matchedRows.map((r) => r.id)).toContain(matchedResult.callId);
    expect(matchedRows.map((r) => r.contactName)).toContain(contact.displayName);

    const unmatchedRows = (await listCalls(ctx.db, { status: "unmatched" })).rows;
    if (!unmatchedResult.ok || unmatchedResult.duplicate) throw new Error("expected ok");
    expect(unmatchedRows.map((r) => r.id)).toContain(unmatchedResult.callId);

    const ignoredRows = (await listCalls(ctx.db, { status: "ignored" })).rows;
    expect(ignoredRows.map((r) => r.id)).toContain(toIgnore.callId);
    expect(unmatchedRows.map((r) => r.id)).not.toContain(toIgnore.callId);
  });
});

describe("service area tracking numbers", () => {
  let ctx: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    ctx = await createTestDb();
  });
  afterEach(async () => {
    await ctx.client.close();
  });

  it("updates the tracking number and records activity", async () => {
    const [area] = await ctx.db
      .insert(serviceAreas)
      .values({ name: "Warman", slug: "warman" })
      .returning();

    const result = await updateServiceAreaTrackingNumber(ctx.db, area.id, "+13065551000", null);
    expect(result.ok).toBe(true);

    const rows = await listServiceAreasForTrackingConfig(ctx.db);
    expect(rows.find((r) => r.id === area.id)?.callrailTrackingNumber).toBe("+13065551000");

    const activityRows = await ctx.db
      .select()
      .from(activities)
      .where(and(eq(activities.entityType, "service_area"), eq(activities.entityId, area.id)));
    expect(activityRows.map((r) => r.action)).toContain("service_area_tracking_number_updated");
  });

  it("returns not_found for a missing service area", async () => {
    const result = await updateServiceAreaTrackingNumber(
      ctx.db,
      "00000000-0000-0000-0000-000000000000",
      "+13065551000",
      null,
    );
    expect(result).toEqual({ ok: false, error: "not_found" });
  });
});
