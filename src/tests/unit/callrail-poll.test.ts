import { describe, expect, it } from "vitest";
import { flattenIncomingTexts, lookbackStartDate } from "@/lib/callrail/poll";
import type { CallRailConversation } from "@/lib/callrail/api-client";

describe("lookbackStartDate", () => {
  it("returns a date 2 days before the given time, as YYYY-MM-DD", () => {
    expect(lookbackStartDate(new Date("2026-08-23T12:00:00Z"))).toBe("2026-08-21");
  });

  it("crosses a month boundary correctly", () => {
    expect(lookbackStartDate(new Date("2026-09-01T00:00:00Z"))).toBe("2026-08-30");
  });
});

describe("flattenIncomingTexts", () => {
  it("flattens an incoming message into a webhook-shaped payload", () => {
    const conversations: CallRailConversation[] = [
      {
        customer_phone_number: "+13065551234",
        current_tracking_number: "+13065559999",
        recent_messages: [
          {
            direction: "incoming",
            content: "Hi, can you call me back?",
            created_at: "2026-08-20T14:30:00.000-04:00",
            sms_thread: { id: "SMT123" },
            media_urls: [],
          },
        ],
      },
    ];

    expect(flattenIncomingTexts(conversations)).toEqual([
      {
        id: "SMT123:2026-08-20T14:30:00.000-04:00",
        customer_phone_number: "+13065551234",
        tracking_phone_number: "+13065559999",
        text: "Hi, can you call me back?",
        created_at: "2026-08-20T14:30:00.000-04:00",
        media_urls: [],
      },
    ]);
  });

  it("excludes outgoing messages (docs/CLAUDE.md §6 — outgoing SMS is not part of V1)", () => {
    const conversations: CallRailConversation[] = [
      {
        customer_phone_number: "+13065551234",
        current_tracking_number: "+13065559999",
        recent_messages: [
          {
            direction: "outgoing",
            content: "We'll be there at 2pm",
            created_at: "2026-08-20T14:31:00.000-04:00",
            sms_thread: { id: "SMT124" },
          },
        ],
      },
    ];

    expect(flattenIncomingTexts(conversations)).toEqual([]);
  });

  it("skips a message with no thread id or timestamp rather than crashing", () => {
    const conversations: CallRailConversation[] = [
      {
        customer_phone_number: "+13065551234",
        recent_messages: [{ direction: "incoming", content: "hi" }],
      },
    ];

    expect(flattenIncomingTexts(conversations)).toEqual([]);
  });

  it("gives two messages that share one sms_thread.id distinct synthetic ids", () => {
    const conversations: CallRailConversation[] = [
      {
        customer_phone_number: "+13065551234",
        current_tracking_number: "+13065559999",
        recent_messages: [
          {
            direction: "incoming",
            content: "First",
            created_at: "2026-08-20T14:30:00.000-04:00",
            sms_thread: { id: "SMT_SHARED" },
          },
          {
            direction: "incoming",
            content: "Second",
            created_at: "2026-08-20T14:31:00.000-04:00",
            sms_thread: { id: "SMT_SHARED" },
          },
        ],
      },
    ];

    const result = flattenIncomingTexts(conversations);
    expect(result).toHaveLength(2);
    expect(result[0]!.id).not.toBe(result[1]!.id);
  });

  it("flattens messages across multiple conversations", () => {
    const conversations: CallRailConversation[] = [
      {
        customer_phone_number: "+13065551111",
        current_tracking_number: "+13065559999",
        recent_messages: [
          {
            direction: "incoming",
            content: "A",
            created_at: "2026-08-20T14:30:00.000-04:00",
            sms_thread: { id: "SMT1" },
          },
        ],
      },
      {
        customer_phone_number: "+13065552222",
        current_tracking_number: "+13065558888",
        recent_messages: [
          {
            direction: "incoming",
            content: "B",
            created_at: "2026-08-20T15:00:00.000-04:00",
            sms_thread: { id: "SMT2" },
          },
        ],
      },
    ];

    const result = flattenIncomingTexts(conversations);
    expect(result).toHaveLength(2);
    expect(result.map((m) => m["customer_phone_number"])).toEqual(["+13065551111", "+13065552222"]);
  });
});
