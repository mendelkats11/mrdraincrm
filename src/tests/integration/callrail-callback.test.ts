// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestDb } from "../helpers/test-db";
import {
  getOwnerCallbackPhoneNumber,
  initiateCallback,
  setOwnerCallbackPhoneNumber,
} from "@/lib/callrail/callback";
import { processCallWebhook } from "@/lib/callrail/calls";

describe("owner callback phone number", () => {
  let ctx: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    ctx = await createTestDb();
  });
  afterEach(async () => {
    await ctx.client.close();
  });

  it("is null until set, then round-trips through normalization", async () => {
    expect(await getOwnerCallbackPhoneNumber(ctx.db)).toBeNull();

    await setOwnerCallbackPhoneNumber(ctx.db, "+13065551234", null);
    expect(await getOwnerCallbackPhoneNumber(ctx.db)).toBe("+13065551234");
  });
});

describe("initiateCallback", () => {
  let ctx: Awaited<ReturnType<typeof createTestDb>>;
  const originalEnv = { ...process.env };

  beforeEach(async () => {
    ctx = await createTestDb();
  });
  afterEach(async () => {
    await ctx.client.close();
    process.env = { ...originalEnv };
    vi.unstubAllGlobals();
  });

  it("returns not_found for a missing call", async () => {
    const result = await initiateCallback(ctx.db, "00000000-0000-0000-0000-000000000000", null);
    expect(result).toEqual({ ok: false, error: "not_found" });
  });

  it("returns not_configured when the owner callback phone number isn't set", async () => {
    process.env.CALLRAIL_API_KEY = "test-key";
    process.env.CALLRAIL_ACCOUNT_ID = "123";
    // Deliberately not calling setOwnerCallbackPhoneNumber.

    const call = await processCallWebhook(ctx.db, {
      id: "CAL-CB-1",
      customer_phone_number: "+13065551234",
      tracking_phone_number: "+13065559999",
    });
    if (!call.ok || call.duplicate) throw new Error("expected ok");

    const result = await initiateCallback(ctx.db, call.callId, null);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("not_configured");
  });

  it("returns not_configured when CallRail env vars are missing, even with a phone number set", async () => {
    delete process.env.CALLRAIL_API_KEY;
    delete process.env.CALLRAIL_ACCOUNT_ID;
    await setOwnerCallbackPhoneNumber(ctx.db, "+13065551234", null);

    const call = await processCallWebhook(ctx.db, {
      id: "CAL-CB-2",
      customer_phone_number: "+13065552222",
      tracking_phone_number: "+13065559999",
    });
    if (!call.ok || call.duplicate) throw new Error("expected ok");

    const result = await initiateCallback(ctx.db, call.callId, null);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("not_configured");
  });

  function stubTrackerLookup(trackingNumber: string, trackerId: string) {
    return new Response(
      JSON.stringify({
        trackers: [{ id: trackerId, tracking_numbers: [trackingNumber] }],
        total_pages: 1,
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  }

  it("resolves the tracker ID for the call's tracking number and uses it as caller_id — the real bug this fixes (CallRail's caller_id is a tracker ID, not a phone number)", async () => {
    process.env.CALLRAIL_API_KEY = "test-key";
    process.env.CALLRAIL_ACCOUNT_ID = "123";
    await setOwnerCallbackPhoneNumber(ctx.db, "+13065550000", null);

    const call = await processCallWebhook(ctx.db, {
      id: "CAL-CB-3",
      customer_phone_number: "+13065551111",
      tracking_phone_number: "+13065559999",
    });
    if (!call.ok || call.duplicate) throw new Error("expected ok");

    const fetchMock = vi.fn(async (url: string | URL, init?: RequestInit) => {
      const href = url.toString();
      if (href.includes("/trackers.json")) {
        return stubTrackerLookup("+13065559999", "TRK_ABC123");
      }
      expect(href).toBe("https://api.callrail.com/v3/a/123/calls.json");
      expect(JSON.parse(init!.body as string)).toEqual({
        caller_id: "TRK_ABC123",
        customer_phone_number: "+13065551111",
        business_phone_number: "+13065550000",
      });
      return new Response(JSON.stringify({ id: "CAL-OUTBOUND-1", direction: "outbound" }), {
        status: 201,
        headers: { "content-type": "application/json" },
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await initiateCallback(ctx.db, call.callId, null);
    expect(result).toEqual({ ok: true, outboundCallrailCallId: "CAL-OUTBOUND-1" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("fails clearly when no tracker matches the call's tracking number", async () => {
    process.env.CALLRAIL_API_KEY = "test-key";
    process.env.CALLRAIL_ACCOUNT_ID = "123";
    await setOwnerCallbackPhoneNumber(ctx.db, "+13065550000", null);

    const call = await processCallWebhook(ctx.db, {
      id: "CAL-CB-5",
      customer_phone_number: "+13065551111",
      tracking_phone_number: "+13065559999",
    });
    if (!call.ok || call.duplicate) throw new Error("expected ok");

    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        stubTrackerLookup("+13065550001" /* different number */, "TRK_OTHER"),
      ),
    );

    const result = await initiateCallback(ctx.db, call.callId, null);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("api_error");
      expect(result.message).toContain("+13065559999");
    }
  });

  it("surfaces CallRail's error message when the outbound call itself fails (e.g. a read-only key)", async () => {
    process.env.CALLRAIL_API_KEY = "test-key";
    process.env.CALLRAIL_ACCOUNT_ID = "123";
    await setOwnerCallbackPhoneNumber(ctx.db, "+13065550000", null);

    const call = await processCallWebhook(ctx.db, {
      id: "CAL-CB-4",
      customer_phone_number: "+13065551111",
      tracking_phone_number: "+13065559999",
    });
    if (!call.ok || call.duplicate) throw new Error("expected ok");

    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string | URL) => {
        if (url.toString().includes("/trackers.json")) {
          return stubTrackerLookup("+13065559999", "TRK_ABC123");
        }
        return new Response(
          JSON.stringify({
            error: "This API key is read-only and cannot be used to make changes.",
          }),
          { status: 403, headers: { "content-type": "application/json" } },
        );
      }),
    );

    const result = await initiateCallback(ctx.db, call.callId, null);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("api_error");
      expect(result.message).toContain("read-only");
    }
  });
});
