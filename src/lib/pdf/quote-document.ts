import type { QuoteCustomChargeRow, QuoteLineItemRow } from "@/lib/quotes/quotes";

export interface CustomerFacingQuoteLineItem {
  description: string;
  quantity: string;
  unitPriceCents: number;
  lineTotalCents: number;
}

/**
 * The internal/customer-facing boundary enforced at compile time, mirroring
 * CustomerFacingInvoiceDocument (docs/ARCHITECTURE.md §12) — this type
 * structurally cannot contain job internals (materials, payout, profit),
 * since nothing here ever imports the jobs schema. Only
 * toCustomerFacingQuoteDocument below may construct one.
 */
export interface CustomerFacingQuoteDocument {
  quoteNumber: string;
  createdAt: Date;
  expiresAt: Date | null;
  businessName: string | null;
  businessAddress: string | null;
  logoUrl: string | null;
  customerName: string | null;
  customerAddress: string | null;
  description: string | null;
  lineItems: CustomerFacingQuoteLineItem[];
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
  notes: string | null;
}

export interface QuoteForPdf {
  quoteNumber: string;
  createdAt: Date;
  expiresAt: Date | null;
  businessName: string | null;
  businessAddress: string | null;
  logoUrl: string | null;
  customerName: string | null;
  customerAddress: string | null;
  description: string | null;
  lineItems: QuoteLineItemRow[];
  customCharges: QuoteCustomChargeRow[];
  subtotalCents: number;
  taxCents: number;
  notes: string | null;
}

/**
 * Custom charges are folded into the same rendered line-item list (as a
 * quantity-1 row) — the database keeps them as a distinct table so the
 * editing UI can treat them differently (no quantity/unit-price), but the
 * customer-facing PDF just needs one flat, readable list of what they're
 * being charged for. There is no stored totalCents on quotes (unlike
 * invoices) — it's always subtotal + tax, computed here.
 */
export function toCustomerFacingQuoteDocument(quote: QuoteForPdf): CustomerFacingQuoteDocument {
  const lineItems: CustomerFacingQuoteLineItem[] = [
    ...quote.lineItems.map((item) => ({
      description: item.description,
      quantity: item.quantity,
      unitPriceCents: item.unitPriceCents,
      lineTotalCents: item.lineTotalCents,
    })),
    ...quote.customCharges.map((charge) => ({
      description: charge.description,
      quantity: "1",
      unitPriceCents: charge.amountCents,
      lineTotalCents: charge.amountCents,
    })),
  ];

  return {
    quoteNumber: quote.quoteNumber,
    createdAt: quote.createdAt,
    expiresAt: quote.expiresAt,
    businessName: quote.businessName,
    businessAddress: quote.businessAddress,
    logoUrl: quote.logoUrl,
    customerName: quote.customerName,
    customerAddress: quote.customerAddress,
    description: quote.description,
    lineItems,
    subtotalCents: quote.subtotalCents,
    taxCents: quote.taxCents,
    totalCents: quote.subtotalCents + quote.taxCents,
    notes: quote.notes,
  };
}
