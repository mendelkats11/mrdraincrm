import { Badge } from "@/components/ui/badge";
import type { QuoteStatus } from "@/lib/quotes/quotes";
import { isQuotePastExpiry } from "@/lib/quotes/expiry";

export const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  draft: "Draft",
  sent: "Sent",
  accepted: "Accepted",
  declined: "Declined",
  expired: "Expired",
  cancelled: "Cancelled",
};

const STATUS_VARIANTS: Record<QuoteStatus, "secondary" | "info" | "success" | "destructive"> = {
  draft: "secondary",
  sent: "info",
  accepted: "success",
  declined: "destructive",
  expired: "secondary",
  cancelled: "destructive",
};

/**
 * Phase 9 decision 3: expiry is a derived display state, never persisted.
 * A "sent" quote whose expiresAt has passed shows as Expired here without
 * the underlying status column ever changing — keeps source/derived values
 * separate (docs/CLAUDE.md §8) with no cron infrastructure required.
 */
export function QuoteStatusBadge({
  status,
  expiresAt,
}: {
  status: QuoteStatus;
  expiresAt?: Date | null;
}) {
  const displayStatus: QuoteStatus = isQuotePastExpiry(status, expiresAt ?? null)
    ? "expired"
    : status;
  return (
    <Badge variant={STATUS_VARIANTS[displayStatus]}>{QUOTE_STATUS_LABELS[displayStatus]}</Badge>
  );
}
