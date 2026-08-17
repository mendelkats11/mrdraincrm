import { describe, expect, it } from "vitest";
import { centsToDollarsInputValue, dollarsToCents, formatCents } from "@/lib/money";

describe("dollarsToCents", () => {
  it("converts a whole dollar amount", () => {
    expect(dollarsToCents("150")).toBe(15000);
  });

  it("converts a decimal amount without floating-point error", () => {
    expect(dollarsToCents("150.1")).toBe(15010);
    expect(dollarsToCents("19.99")).toBe(1999);
    expect(dollarsToCents("0.01")).toBe(1);
  });

  it("handles a single decimal digit as tenths of a dollar", () => {
    expect(dollarsToCents("10.5")).toBe(1050);
  });

  it("handles negative amounts (discounts/credits)", () => {
    expect(dollarsToCents("-25.50")).toBe(-2550);
  });

  it("treats an empty string as zero", () => {
    expect(dollarsToCents("")).toBe(0);
    expect(dollarsToCents("   ")).toBe(0);
  });

  it("handles a bare decimal point gracefully", () => {
    expect(dollarsToCents(".")).toBe(0);
  });
});

describe("centsToDollarsInputValue", () => {
  it("round-trips with dollarsToCents", () => {
    expect(centsToDollarsInputValue(15010)).toBe("150.10");
    expect(centsToDollarsInputValue(1)).toBe("0.01");
    expect(centsToDollarsInputValue(0)).toBe("0.00");
  });

  it("handles negative cents", () => {
    expect(centsToDollarsInputValue(-2550)).toBe("-25.50");
  });
});

describe("formatCents", () => {
  it("formats a positive amount with thousands separators", () => {
    expect(formatCents(150000)).toBe("$1,500.00");
  });

  it("formats a negative amount", () => {
    expect(formatCents(-2550)).toBe("-$25.50");
  });

  it("formats zero", () => {
    expect(formatCents(0)).toBe("$0.00");
  });
});
