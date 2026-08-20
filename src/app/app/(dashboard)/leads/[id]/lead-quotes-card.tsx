import Link from "next/link";
import { Button } from "@/components/ui/button";
import { formatCents } from "@/lib/money";
import type { QuoteStatus } from "@/lib/quotes/quotes";
import { QuoteStatusBadge } from "../../quotes/quote-status-badge";

export interface LeadQuoteRow {
  id: string;
  quoteNumber: string;
  status: QuoteStatus;
  expiresAt: Date | null;
  totalCents: number;
}

// Quotes have no leadId column (Phase 9 decision 1) — these are matched via
// the lead's contact, so this is a best-effort view, not a guaranteed
// complete one (a quote created for the same contact through some other
// route would also show up here).
export function LeadQuotesCard({
  quotes,
  newQuoteHref,
}: {
  quotes: LeadQuoteRow[];
  newQuoteHref: string;
}) {
  return (
    <div className="flex flex-col gap-3">
      {quotes.length === 0 ? (
        <p className="text-sm text-muted-foreground">No quotes yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {quotes.map((quote) => (
            <li key={quote.id} className="flex flex-col gap-1 rounded-md border p-2 text-sm">
              <div className="flex items-center justify-between">
                <Link href={`/quotes/${quote.id}`} className="font-medium hover:underline">
                  {quote.quoteNumber}
                </Link>
                <QuoteStatusBadge status={quote.status} expiresAt={quote.expiresAt} />
              </div>
              <p className="text-muted-foreground">{formatCents(quote.totalCents)}</p>
            </li>
          ))}
        </ul>
      )}
      <Button asChild variant="outline" size="sm">
        <Link href={newQuoteHref}>+ New Quote</Link>
      </Button>
    </div>
  );
}
