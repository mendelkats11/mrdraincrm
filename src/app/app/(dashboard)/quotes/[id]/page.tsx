import { notFound } from "next/navigation";
import Link from "next/link";
import { getDb } from "@/lib/db/client";
import { getQuote } from "@/lib/quotes/quotes";
import { getEntityTimeline } from "@/lib/audit/activity";
import { formatCents } from "@/lib/money";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ActivityTimeline } from "@/components/activity-timeline";
import { QuoteStatusBadge } from "../quote-status-badge";
import { LineItemsSection } from "./line-items-section";
import { CustomChargesSection } from "./custom-charges-section";
import { QuoteDetailsDialog } from "./quote-details-dialog";
import { QuoteActionsBar } from "./quote-actions-bar";

export default async function QuoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();

  const quote = await getQuote(db, id);
  if (!quote) notFound();

  const timeline = await getEntityTimeline(db, "quote", id);

  const editable = quote.status === "draft";
  const totalCents = quote.subtotalCents + quote.taxCents;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold text-foreground">
            {quote.quoteNumber}
            <QuoteStatusBadge status={quote.status} expiresAt={quote.expiresAt} />
          </h1>
          {quote.convertedJobId ? (
            <p className="text-sm text-muted-foreground">
              Converted to job{" "}
              <Link href={`/jobs/${quote.convertedJobId}`} className="hover:underline">
                {quote.convertedJobNumber}
              </Link>
            </p>
          ) : null}
        </div>
        {editable ? (
          <QuoteDetailsDialog
            quoteId={quote.id}
            quote={{
              description: quote.description,
              notes: quote.notes,
              expiresAt: quote.expiresAt,
              taxCents: quote.taxCents,
            }}
            initialContact={
              quote.contactId && quote.contactName
                ? { id: quote.contactId, label: quote.contactName }
                : null
            }
            initialProperty={
              quote.propertyId && quote.propertyAddressLine1
                ? {
                    id: quote.propertyId,
                    label: quote.propertyCity
                      ? `${quote.propertyAddressLine1}, ${quote.propertyCity}`
                      : quote.propertyAddressLine1,
                  }
                : null
            }
            initialOrganization={
              quote.organizationId && quote.organizationName
                ? { id: quote.organizationId, label: quote.organizationName }
                : null
            }
          />
        ) : null}
      </div>

      <QuoteActionsBar
        quoteId={quote.id}
        status={quote.status}
        convertedJobId={quote.convertedJobId}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Customer</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-1 text-sm">
          <p>{quote.organizationName ?? quote.contactName ?? "—"}</p>
          {quote.organizationName && quote.contactName ? (
            <p className="text-muted-foreground">{quote.contactName}</p>
          ) : null}
          <p className="text-muted-foreground">
            {quote.propertyAddressLine1
              ? [quote.propertyAddressLine1, quote.propertyCity].filter(Boolean).join(", ")
              : ""}
          </p>
          {quote.description ? (
            <p className="mt-2 whitespace-pre-wrap">{quote.description}</p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Line items</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <LineItemsSection quoteId={quote.id} lineItems={quote.lineItems} editable={editable} />
          <CustomChargesSection
            quoteId={quote.id}
            customCharges={quote.customCharges}
            editable={editable}
          />
          <div className="flex flex-col items-end gap-1 border-t pt-3 text-sm">
            <p>Subtotal: {formatCents(quote.subtotalCents)}</p>
            <p>Tax: {formatCents(quote.taxCents)}</p>
            <p className="text-base font-medium">Total: {formatCents(totalCents)}</p>
          </div>
        </CardContent>
      </Card>

      {quote.notes ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notes</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <p className="whitespace-pre-wrap">{quote.notes}</p>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <ActivityTimeline entries={timeline} />
        </CardContent>
      </Card>
    </div>
  );
}
