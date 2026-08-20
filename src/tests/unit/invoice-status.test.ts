import { describe, expect, it } from "vitest";
import { deriveInvoicePaidStatus } from "@/lib/invoices/status";

describe("deriveInvoicePaidStatus", () => {
  it("returns 'sent' when nothing has been paid yet", () => {
    expect(deriveInvoicePaidStatus(10_000, 0)).toBe("sent");
  });

  it("returns 'partially_paid' for a partial payment", () => {
    expect(deriveInvoicePaidStatus(10_000, 4_000)).toBe("partially_paid");
  });

  it("returns 'paid' once the paid amount reaches the total", () => {
    expect(deriveInvoicePaidStatus(10_000, 10_000)).toBe("paid");
  });

  it("returns 'paid' for an overpayment (paid exceeds total)", () => {
    expect(deriveInvoicePaidStatus(10_000, 12_000)).toBe("paid");
  });

  it("returns 'sent' for a negative paid sum (e.g. a lone refund)", () => {
    expect(deriveInvoicePaidStatus(10_000, -500)).toBe("sent");
  });

  it("a zero-total invoice with nothing recorded stays 'sent', not 'paid'", () => {
    // The paidCents<=0 check runs before the total comparison, so a $0
    // invoice isn't silently auto-paid — it still needs an explicit $0
    // payment (or none) recorded to reflect that nothing is owed; this
    // documents that ordering rather than assuming it.
    expect(deriveInvoicePaidStatus(0, 0)).toBe("sent");
  });

  it("a zero-total invoice becomes 'paid' once any non-negative payment reconciles it", () => {
    expect(deriveInvoicePaidStatus(0, 1)).toBe("paid");
  });
});
