import { describe, expect, it } from "vitest";
import { parseCallWebhookPayload, parseMessageWebhookPayload } from "@/lib/callrail/webhook";

describe("parseCallWebhookPayload", () => {
  it("parses a standard CallRail post-call payload", () => {
    const parsed = parseCallWebhookPayload({
      id: "CAL123",
      customer_phone_number: "+13065551234",
      tracking_phone_number: "+13065559999",
      answered: true,
      duration: 125,
      start_time: "2026-06-15T14:30:00Z",
    });
    expect(parsed).toEqual({
      callrailCallId: "CAL123",
      callerNumber: "+13065551234",
      trackingNumber: "+13065559999",
      answered: true,
      durationSeconds: 125,
      occurredAt: new Date("2026-06-15T14:30:00Z"),
    });
  });

  it("accepts alternate field name variants", () => {
    const parsed = parseCallWebhookPayload({
      call_id: "CAL456",
      caller_id: "+13065551234",
      tracking_number: "+13065559999",
      answered: "false",
      duration_seconds: "45",
    });
    expect(parsed?.callrailCallId).toBe("CAL456");
    expect(parsed?.answered).toBe(false);
    expect(parsed?.durationSeconds).toBe(45);
  });

  it("returns null when there's no identifiable call ID", () => {
    expect(parseCallWebhookPayload({ customer_phone_number: "+13065551234" })).toBeNull();
  });

  it("returns null when there's no identifiable caller number", () => {
    expect(parseCallWebhookPayload({ id: "CAL123" })).toBeNull();
  });

  it("defaults answered to true and tracking number to 'unknown' when absent", () => {
    const parsed = parseCallWebhookPayload({ id: "CAL789", customer_phone_number: "+13065551234" });
    expect(parsed?.answered).toBe(true);
    expect(parsed?.trackingNumber).toBe("unknown");
  });

  it("falls back to the current time when no timestamp field is present", () => {
    const before = Date.now();
    const parsed = parseCallWebhookPayload({ id: "CAL999", customer_phone_number: "+13065551234" });
    expect(parsed?.occurredAt.getTime()).toBeGreaterThanOrEqual(before);
  });
});

describe("parseMessageWebhookPayload", () => {
  it("parses a standard CallRail SMS payload", () => {
    const parsed = parseMessageWebhookPayload({
      id: "SMS123",
      customer_phone_number: "+13065551234",
      tracking_phone_number: "+13065559999",
      text: "Hi, can you call me back?",
      datetime: "2026-06-15T14:30:00Z",
    });
    expect(parsed).toEqual({
      callrailMessageId: "SMS123",
      phoneNumber: "+13065551234",
      trackingNumber: "+13065559999",
      body: "Hi, can you call me back?",
      mediaUrls: [],
      occurredAt: new Date("2026-06-15T14:30:00Z"),
    });
  });

  it("extracts media URLs from an MMS payload", () => {
    const parsed = parseMessageWebhookPayload({
      id: "SMS456",
      customer_phone_number: "+13065551234",
      media_urls: ["https://example.com/photo.jpg"],
    });
    expect(parsed?.mediaUrls).toEqual(["https://example.com/photo.jpg"]);
  });

  it("returns null when there's no identifiable message ID or phone number", () => {
    expect(parseMessageWebhookPayload({ text: "hello" })).toBeNull();
  });
});
