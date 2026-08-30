import Link from "next/link";
import { getDb } from "@/lib/db/client";
import { listQuotes, type QuoteStatus } from "@/lib/quotes/quotes";
import { formatCents } from "@/lib/money";
import { BUSINESS_TIMEZONE } from "@/lib/reminders/timezone";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { QuoteFilters } from "./quote-filters";
import { QuoteStatusBadge } from "./quote-status-badge";

const PAGE_SIZE = 25;
const VALID_STATUSES: QuoteStatus[] = [
  "draft",
  "sent",
  "accepted",
  "declined",
  "expired",
  "cancelled",
];

const DATE_FMT = new Intl.DateTimeFormat("en-CA", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: BUSINESS_TIMEZONE,
});

export default async function QuotesPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; status?: string; page?: string }>;
}) {
  const params = await searchParams;
  const db = getDb();

  const status = VALID_STATUSES.includes(params.status as QuoteStatus)
    ? (params.status as QuoteStatus)
    : "all";

  const { rows, total } = await listQuotes(db, {
    search: params.search,
    status,
    page: params.page ? Number(params.page) : 1,
    pageSize: PAGE_SIZE,
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">Quotes</h1>
        <Button asChild>
          <Link href="/quotes/new">+ New Quote</Link>
        </Button>
      </div>

      <QuoteFilters />

      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
          No quotes yet.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Quote #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Property</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Job</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((quote) => (
                <TableRow key={quote.id}>
                  <TableCell>
                    <Link href={`/quotes/${quote.id}`} className="font-medium hover:underline">
                      {quote.quoteNumber}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {quote.organizationName ?? quote.contactName ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {quote.propertyAddressLine1 ?? "—"}
                  </TableCell>
                  <TableCell>
                    <QuoteStatusBadge status={quote.status} expiresAt={quote.expiresAt} />
                  </TableCell>
                  <TableCell>{formatCents(quote.totalCents)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {DATE_FMT.format(quote.createdAt)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {quote.convertedJobId ? (
                      <Link href={`/jobs/${quote.convertedJobId}`} className="hover:underline">
                        {quote.convertedJobNumber}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {total > PAGE_SIZE ? (
        <p className="text-sm text-muted-foreground">
          Showing {rows.length} of {total}
        </p>
      ) : null}
    </div>
  );
}
