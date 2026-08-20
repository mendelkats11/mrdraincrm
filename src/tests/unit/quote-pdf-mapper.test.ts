import { describe, expect, it } from "vitest";
import { toCustomerFacingQuoteDocument, type QuoteForPdf } from "@/lib/pdf/quote-document";

// Mirrors invoice-pdf-mapper.test.ts — the compile-time guarantee (this
// type structurally cannot contain job internals) is the primary
// protection; this is the runtime companion asserting the mapper's actual
// output contains exactly the customer-facing field set.
const EXPECTED_KEYS = [
  "quoteNumber",
  "createdAt",
  "expiresAt",
  "businessName",
  "businessAddress",
  "logoUrl",
  "customerName",
  "customerAddress",
  "description",
  "lineItems",
  "subtotalCents",
  "taxCents",
  "totalCents",
  "notes",
].sort();

function fixtureQuote(): QuoteForPdf {
  return {
    quoteNumber: "QUO-0001",
    createdAt: new Date(2026, 7, 1),
    expiresAt: new Date(2026, 7, 31),
    businessName: "Mr. Drain Plumbing",
    businessAddress: "123 Main St",
    logoUrl: null,
    customerName: "Jane Doe",
    customerAddress: "456 Oak Ave",
    description: "Bathroom renovation plumbing",
    lineItems: [
      {
        id: "line-1",
        description: "Toilet replacement",
        quantity: "1",
        unitPriceCents: 25000,
        lineTotalCents: 25000,
        sortOrder: 0,
      },
    ],
    customCharges: [
      {
        id: "charge-1",
        description: "Permit fee",
        amountCents: 5000,
        createdAt: new Date(2026, 7, 1),
      },
    ],
    subtotalCents: 30000,
    taxCents: 1500,
    notes: "Valid for 30 days",
  };
}

describe("toCustomerFacingQuoteDocument", () => {
  it("produces exactly the customer-facing field set — no extra fields", () => {
    const document = toCustomerFacingQuoteDocument(fixtureQuote());
    expect(Object.keys(document).sort()).toEqual(EXPECTED_KEYS);
  });

  it("folds custom charges into the line-item list as quantity-1 rows", () => {
    const document = toCustomerFacingQuoteDocument(fixtureQuote());
    expect(document.lineItems).toEqual([
      {
        description: "Toilet replacement",
        quantity: "1",
        unitPriceCents: 25000,
        lineTotalCents: 25000,
      },
      {
        description: "Permit fee",
        quantity: "1",
        unitPriceCents: 5000,
        lineTotalCents: 5000,
      },
    ]);
  });

  it("computes totalCents as subtotal + tax — there is no stored totalCents on quotes", () => {
    const document = toCustomerFacingQuoteDocument(fixtureQuote());
    expect(document.totalCents).toBe(31500);
  });

  it("preserves business/customer info and expiration exactly", () => {
    const document = toCustomerFacingQuoteDocument(fixtureQuote());
    expect(document.businessName).toBe("Mr. Drain Plumbing");
    expect(document.customerName).toBe("Jane Doe");
    expect(document.expiresAt).toEqual(new Date(2026, 7, 31));
  });
});
