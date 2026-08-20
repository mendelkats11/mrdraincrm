import { describe, expect, it } from "vitest";
import {
  calculateLineTotalCents,
  centsToDollarsInputValue,
  dollarsToCents,
  formatCents,
} from "@/lib/money";

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

describe("calculateLineTotalCents", () => {
  it("multiplies a whole-number quantity by unit price", () => {
    expect(calculateLineTotalCents("2", 5000)).toBe(10000);
  });

  it("handles a fractional quantity exactly, without floating-point drift", () => {
    // 0.1 * 100 !== 10 under naive IEEE-754 float multiplication — this
    // must still come out exact.
    expect(calculateLineTotalCents("0.1", 10000)).toBe(1000);
    expect(calculateLineTotalCents("1.5", 999)).toBe(1499); // 1498.5 rounds to 1499
  });

  it("defaults an empty quantity string to zero", () => {
    expect(calculateLineTotalCents("", 5000)).toBe(0);
  });

  it("handles a negative quantity or unit price (discount line)", () => {
    expect(calculateLineTotalCents("-1", 5000)).toBe(-5000);
    expect(calculateLineTotalCents("1", -1000)).toBe(-1000);
  });

  it("handles a negative fractional quantity", () => {
    expect(calculateLineTotalCents("-2.5", 1000)).toBe(-2500);
  });

  it("returns zero for zero quantity or zero unit price", () => {
    expect(calculateLineTotalCents("0", 5000)).toBe(0);
    expect(calculateLineTotalCents("5", 0)).toBe(0);
  });

  it("rounds the final division result to the nearest cent", () => {
    // 1 unit at 999 cents split across 3 (0.33 qty, the max precision the
    // numeric(10,2) column supports — matches dollarsToCents' own
    // 2-decimal-digit handling): 0.33 * 999 = 329.67, rounds to 330.
    expect(calculateLineTotalCents("0.33", 999)).toBe(330);
  });

  it("only honors 2 quantity decimal digits, matching the numeric(10,2) column", () => {
    // A 3rd decimal digit is truncated the same way dollarsToCents already
    // truncates a dollar amount's 3rd decimal digit — not rounded into the
    // 2nd digit.
    expect(calculateLineTotalCents("0.335", 100)).toBe(calculateLineTotalCents("0.33", 100));
  });
});
