// "draft"/"sent"/"void" are exclusively explicit staff actions — never
// touched by this function. "partially_paid"/"paid" are recomputed here and
// persisted by the payment service every time a payment affecting this
// invoice is recorded or voided, so the stored status can never drift out
// of sync with the actual sum of non-voided payments (Phase 8 decision 1).
export type InvoicePaidStatus = "sent" | "partially_paid" | "paid";

/**
 * Pure — given an invoice's stored total and the current sum of its
 * non-voided allocated payments, returns what its status should be. Only
 * meaningful while the invoice is already sent/partially_paid/paid; the
 * caller is responsible for never invoking this against a draft or void
 * invoice (those statuses are exclusively manual).
 */
export function deriveInvoicePaidStatus(totalCents: number, paidCents: number): InvoicePaidStatus {
  if (paidCents <= 0) return "sent";
  if (paidCents >= totalCents) return "paid";
  return "partially_paid";
}
