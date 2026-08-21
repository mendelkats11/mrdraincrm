import { describe, expect, it } from "vitest";
import { toCustomerFacingInvoiceDocument, type InvoiceForPdf } from "@/lib/pdf/invoice-document";

// The compile-time guarantee (materials/payout/profit cannot even be
// expressed on CustomerFacingInvoiceDocument's type) is the primary
// protection here — docs/ARCHITECTURE.md §12. This test is the runtime
// companion: it asserts the mapper's actual output contains exactly the
// customer-facing field set and nothing else, so a future edit that widens
// the type and starts spreading raw invoice/job data through would still
// be caught.
const EXPECTED_KEYS = [
  "invoiceNumber",
  "createdAt",
  "businessName",
  "businessAddress",
  "logoUrl",
  "accentColor",
  "fontFamily",
  "customerName",
  "customerAddress",
  "jobNumber",
  "lineItems",
  "subtotalCents",
  "taxCents",
  "totalCents",
  "paymentInstructions",
  "notes",
  "footer",
].sort();

function fixtureInvoice(): InvoiceForPdf {
  return {
    invoiceNumber: "INV-0001",
    createdAt: new Date(2026, 7, 1),
    businessName: "Mr. Drain Plumbing",
    businessAddress: "123 Main St",
    logoUrl: null,
    accentColor: null,
    fontFamily: null,
    customerName: "Jane Doe",
    customerAddress: "456 Oak Ave",
    jobNumber: "JOB-0001",
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
    subtotalCents: 25000,
    taxCents: 1250,
    totalCents: 26250,
    paymentInstructions: "E-transfer to payments@mrdrainsk.com",
    notes: null,
    footer: "Thank you!",
  };
}

describe("toCustomerFacingInvoiceDocument", () => {
  it("produces exactly the customer-facing field set — no extra fields", () => {
    const document = toCustomerFacingInvoiceDocument(fixtureInvoice());
    expect(Object.keys(document).sort()).toEqual(EXPECTED_KEYS);
  });

  it("carries over line item values without the internal id/sortOrder fields", () => {
    const document = toCustomerFacingInvoiceDocument(fixtureInvoice());
    expect(document.lineItems).toEqual([
      {
        description: "Toilet replacement",
        quantity: "1",
        unitPriceCents: 25000,
        lineTotalCents: 25000,
      },
    ]);
  });

  it("preserves totals and business/customer info exactly", () => {
    const document = toCustomerFacingInvoiceDocument(fixtureInvoice());
    expect(document.subtotalCents).toBe(25000);
    expect(document.taxCents).toBe(1250);
    expect(document.totalCents).toBe(26250);
    expect(document.businessName).toBe("Mr. Drain Plumbing");
    expect(document.customerName).toBe("Jane Doe");
  });

  it("resolves a null accent color/font to their curated defaults", () => {
    const document = toCustomerFacingInvoiceDocument(fixtureInvoice());
    expect(document.accentColor).toBe("#1e3a5f");
    expect(document.fontFamily).toBe("Helvetica");
  });

  it("preserves an explicit accent color/font", () => {
    const document = toCustomerFacingInvoiceDocument({
      ...fixtureInvoice(),
      accentColor: "#065f46",
      fontFamily: "Times-Roman",
    });
    expect(document.accentColor).toBe("#065f46");
    expect(document.fontFamily).toBe("Times-Roman");
  });
});
