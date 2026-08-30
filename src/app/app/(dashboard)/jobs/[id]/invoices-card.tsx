import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCents } from "@/lib/money";
import type { InvoiceStatus } from "@/lib/invoices/invoices";
import { InvoiceStatusBadge } from "../../invoices/invoice-status-badge";

export interface JobInvoiceRow {
  id: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  totalCents: number;
}

// A job may have more than one invoice — no hard block, matching
// docs/ARCHITECTURE.md §4 ("one or more invoices ... default to one").
// The mismatch note is the non-blocking warning from
// docs/IMPLEMENTATION_PLAN.md §2.1.A — neither figure is ever auto-adjusted
// to force a match.
export function InvoicesCard({
  jobId,
  invoices,
  jobAmountCents,
}: {
  jobId: string;
  invoices: JobInvoiceRow[];
  jobAmountCents: number;
}) {
  return (
    <div className="flex flex-col gap-3">
      {invoices.length === 0 ? (
        <p className="text-sm text-muted-foreground">No invoices yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {invoices.map((invoice) => {
            const mismatch = invoice.status !== "void" && invoice.totalCents !== jobAmountCents;
            return (
              <li key={invoice.id} className="flex flex-col gap-1 rounded-md border p-2 text-sm">
                <div className="flex items-center justify-between">
                  <Link href={`/invoices/${invoice.id}`} className="font-medium hover:underline">
                    {invoice.invoiceNumber}
                  </Link>
                  <InvoiceStatusBadge status={invoice.status} />
                </div>
                <p className="text-muted-foreground">{formatCents(invoice.totalCents)}</p>
                {mismatch ? (
                  <p className="flex items-center gap-1 text-xs text-warning">
                    <AlertTriangle className="size-3 shrink-0" aria-hidden="true" />
                    Differs from job amount by{" "}
                    {formatCents(Math.abs(invoice.totalCents - jobAmountCents))}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
      <Button asChild variant="outline" size="sm">
        <Link href={`/invoices/new?jobId=${jobId}`}>+ New Invoice</Link>
      </Button>
    </div>
  );
}
