import Link from "next/link";
import { formatCents } from "@/lib/money";
import type { QuoteStatus } from "@/lib/quotes/quotes";
import { QuoteStatusBadge } from "../../quotes/quote-status-badge";

export interface JobQuoteRow {
  id: string;
  quoteNumber: string;
  status: QuoteStatus;
  expiresAt: Date | null;
  totalCents: number;
}

// Read-only — a job is never created here, only via converting an Accepted
// quote (the reverse direction). Practically at most one quote ever links
// to a given job, since conversion always creates a brand-new job, but this
// renders as a list to match the general "may have more than one" shape
// used elsewhere (e.g. InvoicesCard).
export function QuotesCard({ quotes }: { quotes: JobQuoteRow[] }) {
  if (quotes.length === 0) {
    return <p className="text-sm text-muted-foreground">No quotes converted into this job.</p>;
  }

  return (
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
  );
}
