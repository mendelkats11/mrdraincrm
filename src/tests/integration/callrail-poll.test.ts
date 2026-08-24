// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestDb } from "../helpers/test-db";
import { pollCallRail } from "@/lib/callrail/poll";
import { calls, messages } from "@/lib/db/schema";

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

describe("pollCallRail", () => {
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

  it("no-ops without throwing when CallRail isn't configured", async () => {
    delete process.env.CALLRAIL_API_KEY;
    delete process.env.CALLRAIL_ACCOUNT_ID;
    const result = await pollCallRail(ctx.db);
    expect(result).toBeNull();
  });

  it("fetches calls and texts and creates rows for both, deduplicating on a second poll", async () => {
    process.env.CALLRAIL_API_KEY = "test-key";
    process.env.CALLRAIL_ACCOUNT_ID = "123";

    const fetchMock = vi.fn(async (url: string | URL) => {
      const href = url.toString();
      if (href.includes("/calls.json")) {
        return jsonResponse({
          calls: [
            {
              id: "CAL1",
              customer_phone_number: "+13065551234",
              tracking_phone_number: "+13065559999",
              answered: true,
              duration: 42,
              start_time: "2026-08-20T14:30:00-04:00",
            },
          ],
          total_pages: 1,
        });
      }
      if (href.includes("/text-messages.json")) {
        return jsonResponse({
          conversations: [
            {
              customer_phone_number: "+13065551234",
              current_tracking_number: "+13065559999",
              recent_messages: [
                {
                  direction: "incoming",
                  content: "Can you call me back?",
                  created_at: "2026-08-20T14:31:00.000-04:00",
                  sms_thread: { id: "SMT1" },
                },
                {
                  direction: "outgoing",
                  content: "Sure, calling now",
                  created_at: "2026-08-20T14:32:00.000-04:00",
                  sms_thread: { id: "SMT2" },
                },
              ],
            },
          ],
          total_pages: 1,
        });
      }
      throw new Error(`Unexpected fetch: ${href}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const first = await pollCallRail(ctx.db, new Date("2026-08-22T00:00:00Z"));
    expect(first).toEqual({
      callsSeen: 1,
      callsCreated: 1,
      textsSeen: 1, // the outgoing message is filtered out before this count
      textsCreated: 1,
      errors: 0,
    });

    const allCalls = await ctx.db.select().from(calls);
    expect(allCalls).toHaveLength(1);
    expect(allCalls[0]?.callrailCallId).toBe("CAL1");

    const allMessages = await ctx.db.select().from(messages);
    expect(allMessages).toHaveLength(1);
    expect(allMessages[0]?.body).toBe("Can you call me back?");

    // A second poll (e.g. the next scheduler tick) sees the exact same
    // CallRail data again — must not create duplicates.
    const second = await pollCallRail(ctx.db, new Date("2026-08-22T00:15:00Z"));
    expect(second).toEqual({
      callsSeen: 1,
      callsCreated: 0,
      textsSeen: 1,
      textsCreated: 0,
      errors: 0,
    });
    expect(await ctx.db.select().from(calls)).toHaveLength(1);
    expect(await ctx.db.select().from(messages)).toHaveLength(1);
  });

  it("records an error and continues if fetching calls fails, without crashing", async () => {
    process.env.CALLRAIL_API_KEY = "test-key";
    process.env.CALLRAIL_ACCOUNT_ID = "123";

    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string | URL) => {
        if (url.toString().includes("/calls.json")) {
          return new Response("Server error", { status: 500 });
        }
        return jsonResponse({ conversations: [], total_pages: 1 });
      }),
    );

    const result = await pollCallRail(ctx.db);
    expect(result).toEqual({
      callsSeen: 0,
      callsCreated: 0,
      textsSeen: 0,
      textsCreated: 0,
      errors: 1,
    });
  });
});
