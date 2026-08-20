import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { getDb } from "@/lib/db/client";
import { getJob, listActiveServices } from "@/lib/jobs/jobs";
import { listJobPhotos, type JobPhotoWithUrl } from "@/lib/jobs/job-photos";
import { getStorageProvider } from "@/lib/storage";
import { getCurrentAssignment, listAssignmentHistory } from "@/lib/contractors/assignments";
import { listInvoicesForJob } from "@/lib/invoices/invoices";
import { listPaymentsForJob } from "@/lib/payments/payments";
import { listQuotesForJob } from "@/lib/quotes/quotes";
import { listRemindersForEntity } from "@/lib/reminders/reminders";
import { getEntityTimeline } from "@/lib/audit/activity";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ActivityTimeline } from "@/components/activity-timeline";
import { RemindersCard } from "@/components/reminders-card";
import { StatusSelect } from "./status-select";
import { EditJobDialog } from "./edit-job-dialog";
import { FinancialSection } from "./financial-section";
import { PhotosSection } from "./photos-section";
import { ScheduleSection } from "./schedule-section";
import { ContractorSection } from "./contractor-section";
import { InvoicesCard } from "./invoices-card";
import { JobPaymentsSection } from "./job-payments-section";
import { QuotesCard } from "./quotes-card";

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();

  const job = await getJob(db, id);
  if (!job) notFound();

  let photos: JobPhotoWithUrl[] = [];
  let storageConfigured = true;
  try {
    photos = await listJobPhotos(db, getStorageProvider(), id);
  } catch {
    storageConfigured = false;
  }

  const [
    services,
    timeline,
    currentAssignment,
    assignmentHistory,
    invoices,
    payments,
    quotes,
    reminders,
  ] = await Promise.all([
    listActiveServices(db),
    getEntityTimeline(db, "job", id),
    getCurrentAssignment(db, id),
    listAssignmentHistory(db, id),
    listInvoicesForJob(db, id),
    listPaymentsForJob(db, id),
    listQuotesForJob(db, id),
    listRemindersForEntity(db, { jobId: id }),
  ]);

  const availableInvoices = invoices
    .filter((invoice) => invoice.status !== "draft" && invoice.status !== "void")
    .map((invoice) => ({ id: invoice.id, invoiceNumber: invoice.invoiceNumber }));

  const quoteRows = quotes.map((quote) => ({
    id: quote.id,
    quoteNumber: quote.quoteNumber,
    status: quote.status,
    expiresAt: quote.expiresAt,
    totalCents: quote.subtotalCents + quote.taxCents,
  }));

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold text-foreground">
            {job.jobNumber}
            {job.emergency ? (
              <Badge variant="destructive">
                <AlertTriangle /> Emergency
              </Badge>
            ) : null}
          </h1>
          {job.issueDescription ? (
            <p className="text-sm text-muted-foreground">{job.issueDescription}</p>
          ) : null}
          {job.leadId ? (
            <p className="text-sm">
              <Link href={`/leads/${job.leadId}`} className="text-primary hover:underline">
                View originating lead
              </Link>
            </p>
          ) : null}
        </div>
        <EditJobDialog job={job} services={services} />
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <StatusSelect jobId={job.id} status={job.status} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Linked records</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-1 text-sm">
            <p>
              Contact:{" "}
              {job.contactId ? (
                <Link href={`/contacts/${job.contactId}`} className="hover:underline">
                  {job.contactName}
                </Link>
              ) : (
                <span className="text-muted-foreground">None</span>
              )}
            </p>
            <p>
              Property:{" "}
              {job.propertyId ? (
                <Link href={`/properties/${job.propertyId}`} className="hover:underline">
                  {job.propertyAddressLine1}, {job.propertyCity}
                </Link>
              ) : (
                <span className="text-muted-foreground">None</span>
              )}
            </p>
            <p>
              Organization:{" "}
              {job.organizationId ? (
                <Link href={`/organizations/${job.organizationId}`} className="hover:underline">
                  {job.organizationName}
                </Link>
              ) : (
                <span className="text-muted-foreground">None</span>
              )}
            </p>
            <p>Service: {job.serviceName ?? <span className="text-muted-foreground">None</span>}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Schedule</CardTitle>
          </CardHeader>
          <CardContent>
            <ScheduleSection
              jobId={job.id}
              scheduledStart={job.scheduledStart}
              scheduledEnd={job.scheduledEnd}
              timeTbd={job.timeTbd}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contractor</CardTitle>
          </CardHeader>
          <CardContent>
            <ContractorSection
              jobId={job.id}
              current={currentAssignment}
              history={assignmentHistory}
            />
          </CardContent>
        </Card>
      </div>

      {job.internalNotes ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Internal notes</CardTitle>
          </CardHeader>
          <CardContent className="whitespace-pre-wrap text-sm">{job.internalNotes}</CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Financial inputs</CardTitle>
        </CardHeader>
        <CardContent>
          <FinancialSection
            jobId={job.id}
            jobAmountCents={job.jobAmountCents}
            taxAmountCents={job.taxAmountCents}
            materialsCents={job.materialsCents}
            contractorPayoutCents={job.contractorPayoutCents}
            customCharges={job.customCharges}
          />
        </CardContent>
      </Card>

      {quoteRows.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quotes</CardTitle>
          </CardHeader>
          <CardContent>
            <QuotesCard quotes={quoteRows} />
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-6 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Invoices</CardTitle>
          </CardHeader>
          <CardContent>
            <InvoicesCard jobId={job.id} invoices={invoices} jobAmountCents={job.jobAmountCents} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Payments</CardTitle>
          </CardHeader>
          <CardContent>
            <JobPaymentsSection
              jobId={job.id}
              payments={payments}
              availableInvoices={availableInvoices}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Reminders</CardTitle>
        </CardHeader>
        <CardContent>
          <RemindersCard reminders={reminders} jobId={job.id} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Photos</CardTitle>
        </CardHeader>
        <CardContent>
          {storageConfigured ? (
            <PhotosSection jobId={job.id} photos={photos} />
          ) : (
            <p className="text-sm text-muted-foreground">
              Photo storage isn&apos;t configured yet — set the R2_* environment variables to enable
              uploads.
            </p>
          )}
        </CardContent>
      </Card>

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
