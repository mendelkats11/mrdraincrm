import { describe, expect, it } from "vitest";
import { formatPhoneForDisplay, normalizePhone } from "@/lib/phone";

describe("normalizePhone", () => {
  it("normalizes a local Canadian number to E.164", () => {
    const result = normalizePhone("(306) 555-1234");
    expect(result).not.toBeNull();
    expect(result?.e164).toBe("+13065551234");
    expect(result?.normalized).toBe("13065551234");
  });

  it("normalizes an already-E.164 number", () => {
    const result = normalizePhone("+13065551234");
    expect(result?.e164).toBe("+13065551234");
  });

  it("produces the same normalized form for equivalent formats", () => {
    const a = normalizePhone("306-555-1234");
    const b = normalizePhone("(306) 555 1234");
    const c = normalizePhone("+1 306 555 1234");
    expect(a?.normalized).toBe(b?.normalized);
    expect(b?.normalized).toBe(c?.normalized);
  });

  it("returns null for an unparseable number", () => {
    expect(normalizePhone("not a phone number")).toBeNull();
    expect(normalizePhone("123")).toBeNull();
  });

  it("returns null for empty/whitespace input", () => {
    expect(normalizePhone("")).toBeNull();
    expect(normalizePhone("   ")).toBeNull();
  });
});

describe("formatPhoneForDisplay", () => {
  it("formats E.164 as a national-style number", () => {
    expect(formatPhoneForDisplay("+13065551234")).toBe("(306) 555-1234");
  });

  it("falls back to the raw input if it can't be parsed", () => {
    expect(formatPhoneForDisplay("not-a-number")).toBe("not-a-number");
  });
});
