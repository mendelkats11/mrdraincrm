import type { InvoiceLineItemRow } from "@/lib/invoices/invoices";
import { resolveAccentColor, resolveFontFamily } from "./invoice-template";

export interface CustomerFacingInvoiceLineItem {
  description: string;
  quantity: string;
  unitPriceCents: number;
  lineTotalCents: number;
}

/**
 * The internal/customer-facing boundary enforced at compile time, not by
 * convention (docs/ARCHITECTURE.md §12, docs/PROJECT_SPEC.md §13.3): this
 * type structurally cannot contain materials cost, contractor payout, or
 * internal profit — those fields don't exist here, and nothing in this
 * file ever imports the `jobs` schema. Only toCustomerFacingInvoiceDocument
 * below may construct one, from an already-loaded invoice + line items.
 */
export interface CustomerFacingInvoiceDocument {
  invoiceNumber: string;
  createdAt: Date;
  businessName: string | null;
  businessAddress: string | null;
  /** Already-resolved, short-lived signed URL — never a stored key (Phase
   *  11.1 decision: logoKey is a private R2 object, resolved by the caller
   *  right before this document is constructed, see invoice-pdf route). */
  logoUrl: string | null;
  accentColor: string;
  fontFamily: string;
  customerName: string | null;
  customerAddress: string | null;
  jobNumber: string;
  lineItems: CustomerFacingInvoiceLineItem[];
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
  paymentInstructions: string | null;
  notes: string | null;
  footer: string | null;
}

export interface InvoiceForPdf {
  invoiceNumber: string;
  createdAt: Date;
  businessName: string | null;
  businessAddress: string | null;
  logoUrl: string | null;
  accentColor?: string | null;
  fontFamily?: string | null;
  customerName: string | null;
  customerAddress: string | null;
  jobNumber: string;
  lineItems: InvoiceLineItemRow[];
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
  paymentInstructions: string | null;
  notes: string | null;
  footer: string | null;
}

export function toCustomerFacingInvoiceDocument(
  invoice: InvoiceForPdf,
): CustomerFacingInvoiceDocument {
  return {
    invoiceNumber: invoice.invoiceNumber,
    createdAt: invoice.createdAt,
    businessName: invoice.businessName,
    businessAddress: invoice.businessAddress,
    logoUrl: invoice.logoUrl,
    accentColor: resolveAccentColor(invoice.accentColor),
    fontFamily: resolveFontFamily(invoice.fontFamily),
    customerName: invoice.customerName,
    customerAddress: invoice.customerAddress,
    jobNumber: invoice.jobNumber,
    lineItems: invoice.lineItems.map((item) => ({
      description: item.description,
      quantity: item.quantity,
      unitPriceCents: item.unitPriceCents,
      lineTotalCents: item.lineTotalCents,
    })),
    subtotalCents: invoice.subtotalCents,
    taxCents: invoice.taxCents,
    totalCents: invoice.totalCents,
    paymentInstructions: invoice.paymentInstructions,
    notes: invoice.notes,
    footer: invoice.footer,
  };
}
