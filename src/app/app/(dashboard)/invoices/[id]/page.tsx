import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb } from "@/lib/db/client";
import { getInvoice } from "@/lib/invoices/invoices";
import { getInvoiceBalance, listPaymentsForInvoice } from "@/lib/payments/payments";
import { getEntityTimeline } from "@/lib/audit/activity";
import { formatCents } from "@/lib/money";
import { getStorageProvider } from "@/lib/storage";
import { resolveLogoUrl } from "@/lib/pdf/logo";
import { toCustomerFacingInvoiceDocument } from "@/lib/pdf/invoice-document";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ActivityTimeline } from "@/components/activity-timeline";
import { InvoicePdfPreview } from "@/components/invoice-pdf-preview";
import { BackLink } from "@/components/back-link";
import { InvoiceStatusBadge } from "../invoice-status-badge";
import { LineItemsSection } from "./line-items-section";
import { InvoiceDetailsDialog } from "./invoice-details-dialog";
import { InvoiceActionsBar } from "./invoice-actions-bar";
import { PaymentsSection } from "./payments-section";

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();

  const invoice = await getInvoice(db, id);
  if (!invoice) notFound();

  const [balance, payments, timeline] = await Promise.all([
    getInvoiceBalance(db, id),
    listPaymentsForInvoice(db, id),
    getEntityTimeline(db, "invoice", id),
  ]);

  let logoUrl: string | null = null;
  if (invoice.logoKey) {
    try {
      logoUrl = await resolveLogoUrl(getStorageProvider(), invoice.logoKey);
    } catch {
      logoUrl = null;
    }
  }
  const pdfDocument = toCustomerFacingInvoiceDocument({ ...invoice, logoUrl });

  const editable = invoice.status === "draft";
  const canRecordPayment = invoice.status !== "draft" && invoice.status !== "void";

  return (
    <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
      <div className="flex flex-col gap-6">
        <BackLink href="/invoices" label="Back to Invoices" />
        <div className="flex items-start justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-semibold text-foreground">
              {invoice.invoiceNumber}
              <InvoiceStatusBadge status={invoice.status} />
            </h1>
            <p className="text-sm text-muted-foreground">
              For job{" "}
              <Link href={`/jobs/${invoice.jobId}`} className="hover:underline">
                {invoice.jobNumber}
              </Link>
            </p>
          </div>
          {editable ? (
            <InvoiceDetailsDialog invoiceId={invoice.id} jobId={invoice.jobId} invoice={invoice} />
          ) : null}
        </div>

        <InvoiceActionsBar invoiceId={invoice.id} jobId={invoice.jobId} status={invoice.status} />

        <div className="grid gap-6 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Business</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-1 text-sm">
              <p>{invoice.businessName ?? "—"}</p>
              <p className="whitespace-pre-wrap text-muted-foreground">
                {invoice.businessAddress ?? ""}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Bill To</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-1 text-sm">
              <p>{invoice.customerName ?? "—"}</p>
              <p className="whitespace-pre-wrap text-muted-foreground">
                {invoice.customerAddress ?? ""}
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Line items</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <LineItemsSection
              invoiceId={invoice.id}
              jobId={invoice.jobId}
              lineItems={invoice.lineItems}
              editable={editable}
            />
            <div className="flex flex-col items-end gap-1 border-t pt-3 text-sm">
              <p>Subtotal: {formatCents(invoice.subtotalCents)}</p>
              <p>Tax: {formatCents(invoice.taxCents)}</p>
              <p className="text-base font-medium">Total: {formatCents(invoice.totalCents)}</p>
            </div>
          </CardContent>
        </Card>

        {invoice.paymentInstructions || invoice.notes || invoice.footer ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Notes</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 text-sm">
              {invoice.paymentInstructions ? (
                <p>
                  <span className="text-muted-foreground">Payment instructions: </span>
                  {invoice.paymentInstructions}
                </p>
              ) : null}
              {invoice.notes ? <p className="whitespace-pre-wrap">{invoice.notes}</p> : null}
              {invoice.footer ? <p className="text-muted-foreground">{invoice.footer}</p> : null}
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Payments</CardTitle>
          </CardHeader>
          <CardContent>
            <PaymentsSection
              jobId={invoice.jobId}
              invoiceId={invoice.id}
              payments={payments}
              balanceCents={balance?.balanceCents ?? null}
              canRecordPayment={canRecordPayment}
            />
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

      <InvoicePdfPreview document={pdfDocument} />
    </div>
  );
}
