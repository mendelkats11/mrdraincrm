import type { QuoteStatus } from "./quotes";

/**
 * Phase 9 decision 3: expiry is a derived display state, never persisted —
 * a "sent" quote whose expiresAt has passed shows as Expired without the
 * stored status column ever changing. Pure function so it's testable
 * without rendering the badge component, mirroring deriveInvoicePaidStatus.
 */
export function isQuotePastExpiry(
  status: QuoteStatus,
  expiresAt: Date | null,
  now: Date = new Date(),
): boolean {
  return status === "sent" && !!expiresAt && now > expiresAt;
}
