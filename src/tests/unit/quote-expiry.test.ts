import { describe, expect, it } from "vitest";
import { isQuotePastExpiry } from "@/lib/quotes/expiry";

describe("isQuotePastExpiry", () => {
  const now = new Date(2026, 5, 15);

  it("is false when there is no expiration date", () => {
    expect(isQuotePastExpiry("sent", null, now)).toBe(false);
  });

  it("is false when the expiration date is in the future", () => {
    expect(isQuotePastExpiry("sent", new Date(2026, 5, 20), now)).toBe(false);
  });

  it("is true when status is sent and the expiration date has passed", () => {
    expect(isQuotePastExpiry("sent", new Date(2026, 5, 10), now)).toBe(true);
  });

  it("is false for draft even if the expiration date has passed", () => {
    expect(isQuotePastExpiry("draft", new Date(2026, 5, 10), now)).toBe(false);
  });

  it("is false for accepted even if the expiration date has passed — expiry stops mattering once a customer responded", () => {
    expect(isQuotePastExpiry("accepted", new Date(2026, 5, 10), now)).toBe(false);
  });

  it("is false for declined/expired/cancelled — already terminal", () => {
    expect(isQuotePastExpiry("declined", new Date(2026, 5, 10), now)).toBe(false);
    expect(isQuotePastExpiry("expired", new Date(2026, 5, 10), now)).toBe(false);
    expect(isQuotePastExpiry("cancelled", new Date(2026, 5, 10), now)).toBe(false);
  });

  it("is false exactly at the boundary (now === expiresAt)", () => {
    const boundary = new Date(2026, 5, 15);
    expect(isQuotePastExpiry("sent", boundary, boundary)).toBe(false);
  });
});
