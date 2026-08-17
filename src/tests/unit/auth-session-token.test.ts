import { describe, expect, it } from "vitest";
import {
  createSessionCookieValue,
  generateSessionToken,
  hashSessionToken,
  verifySessionCookieValue,
} from "@/lib/auth/session-token";

describe("session token/cookie signing", () => {
  it("generates high-entropy, unique tokens", () => {
    const a = generateSessionToken();
    const b = generateSessionToken();
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThanOrEqual(40);
  });

  it("hashes deterministically", () => {
    const token = generateSessionToken();
    expect(hashSessionToken(token)).toBe(hashSessionToken(token));
  });

  it("hash does not reveal the token", () => {
    const token = generateSessionToken();
    expect(hashSessionToken(token)).not.toContain(token);
  });

  it("round-trips a valid cookie value back to its raw token", () => {
    const token = generateSessionToken();
    const cookieValue = createSessionCookieValue(token);
    expect(verifySessionCookieValue(cookieValue)).toBe(token);
  });

  it("rejects a tampered signature", () => {
    const token = generateSessionToken();
    const cookieValue = createSessionCookieValue(token);
    const tampered = cookieValue.slice(0, -1) + (cookieValue.endsWith("A") ? "B" : "A");
    expect(verifySessionCookieValue(tampered)).toBeNull();
  });

  it("rejects a forged token with an unrelated signature", () => {
    const forged = `${generateSessionToken()}.not-a-real-signature`;
    expect(verifySessionCookieValue(forged)).toBeNull();
  });

  it("rejects malformed input", () => {
    expect(verifySessionCookieValue(undefined)).toBeNull();
    expect(verifySessionCookieValue(null)).toBeNull();
    expect(verifySessionCookieValue("")).toBeNull();
    expect(verifySessionCookieValue("no-separator-here")).toBeNull();
  });

  it("rejects a token signed under a different secret", () => {
    const token = generateSessionToken();
    const cookieValue = createSessionCookieValue(token);
    const original = process.env.SESSION_SECRET;
    process.env.SESSION_SECRET = "a-completely-different-secret";
    try {
      expect(verifySessionCookieValue(cookieValue)).toBeNull();
    } finally {
      process.env.SESSION_SECRET = original;
    }
  });
});
