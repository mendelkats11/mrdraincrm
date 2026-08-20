import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { getDb } from "@/lib/db/client";
import { getLead, listActiveServices } from "@/lib/crm/leads";
import { listQuotesForContact } from "@/lib/quotes/quotes";
import { getEntityTimeline } from "@/lib/audit/activity";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ActivityTimeline } from "@/components/activity-timeline";
import { StatusSelect } from "./status-select";
import { ConvertToJobButton } from "./convert-to-job-button";
import { EditLeadDialog } from "./edit-lead-dialog";
import { LeadQuotesCard } from "./lead-quotes-card";

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();

  const lead = await getLead(db, id);
  if (!lead) notFound();

  const [services, timeline, quotes] = await Promise.all([
    listActiveServices(db),
    getEntityTimeline(db, "lead", id),
    lead.contactId ? listQuotesForContact(db, lead.contactId) : Promise.resolve([]),
  ]);

  const quoteRows = quotes.map((quote) => ({
    id: quote.id,
    quoteNumber: quote.quoteNumber,
    status: quote.status,
    expiresAt: quote.expiresAt,
    totalCents: quote.subtotalCents + quote.taxCents,
  }));

  const newQuoteParams = new URLSearchParams();
  if (lead.contactId) newQuoteParams.set("contactId", lead.contactId);
  if (lead.propertyId) newQuoteParams.set("propertyId", lead.propertyId);
  if (lead.organizationId) newQuoteParams.set("organizationId", lead.organizationId);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold text-foreground">
            {lead.contactName ?? "Lead (no contact)"}
            {lead.emergency ? (
              <Badge variant="destructive">
                <AlertTriangle /> Emergency
              </Badge>
            ) : null}
          </h1>
          {lead.issueDescription ? (
            <p className="text-sm text-muted-foreground">{lead.issueDescription}</p>
          ) : null}
        </div>
        <div className="flex gap-2">
          <EditLeadDialog lead={lead} services={services} />
          {lead.status !== "won" && lead.status !== "lost" ? (
            <ConvertToJobButton leadId={lead.id} />
          ) : null}
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Status</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <StatusSelect leadId={lead.id} status={lead.status} />
            {lead.convertedJobNumber && lead.convertedJobId ? (
              <p className="text-sm text-muted-foreground">
                Converted to job{" "}
                <Link
                  href={`/jobs/${lead.convertedJobId}`}
                  className="font-medium text-primary hover:underline"
                >
                  {lead.convertedJobNumber}
                </Link>
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Linked records</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-1 text-sm">
            <p>
              Contact:{" "}
              {lead.contactId ? (
                <Link href={`/contacts/${lead.contactId}`} className="hover:underline">
                  {lead.contactName}
                </Link>
              ) : (
                <span className="text-muted-foreground">None</span>
              )}
            </p>
            <p>
              Property:{" "}
              {lead.propertyId ? (
                <Link href={`/properties/${lead.propertyId}`} className="hover:underline">
                  {lead.propertyAddressLine1}, {lead.propertyCity}
                </Link>
              ) : (
                <span className="text-muted-foreground">None</span>
              )}
            </p>
            <p>
              Organization:{" "}
              {lead.organizationId ? (
                <Link href={`/organizations/${lead.organizationId}`} className="hover:underline">
                  {lead.organizationName}
                </Link>
              ) : (
                <span className="text-muted-foreground">None</span>
              )}
            </p>
            <p>
              Service: {lead.serviceName ?? <span className="text-muted-foreground">None</span>}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Source</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-1 text-sm">
            <p>
              Original source:{" "}
              <span className="text-muted-foreground">{lead.originalSource ?? "—"}</span>
            </p>
            <p>
              Latest source:{" "}
              <span className="text-muted-foreground">{lead.latestSource ?? "—"}</span>
            </p>
            <p>
              Details: <span className="text-muted-foreground">{lead.sourceDetails ?? "—"}</span>
            </p>
            <p>
              Landing page: <span className="text-muted-foreground">{lead.landingPage ?? "—"}</span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dates</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-1 text-sm">
            <p>
              Created:{" "}
              <span className="text-muted-foreground">
                {new Intl.DateTimeFormat("en-CA", {
                  dateStyle: "medium",
                  timeStyle: "short",
                }).format(lead.createdAt)}
              </span>
            </p>
            <p>
              Converted:{" "}
              <span className="text-muted-foreground">
                {lead.convertedAt
                  ? new Intl.DateTimeFormat("en-CA", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }).format(lead.convertedAt)
                  : "—"}
              </span>
            </p>
          </CardContent>
        </Card>
      </div>

      {lead.contactId ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quotes</CardTitle>
          </CardHeader>
          <CardContent>
            <LeadQuotesCard
              quotes={quoteRows}
              newQuoteHref={`/quotes/new?${newQuoteParams.toString()}`}
            />
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
