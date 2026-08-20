import { PaymentsList, type PaymentRow } from "@/components/payments-list";
import { RecordPaymentDialog, type InvoiceOption } from "@/components/record-payment-dialog";

// A payment always belongs to a job, and may optionally also be allocated
// to one specific invoice (docs/IMPLEMENTATION_PLAN.md §2.1.D) — this is
// where a job-only payment (no invoice at all yet) gets recorded.
export function JobPaymentsSection({
  jobId,
  payments,
  availableInvoices,
}: {
  jobId: string;
  payments: PaymentRow[];
  availableInvoices: InvoiceOption[];
}) {
  const invoiceNumberById = new Map(
    availableInvoices.map((invoice) => [invoice.id, invoice.invoiceNumber]),
  );

  return (
    <div className="flex flex-col gap-3">
      <PaymentsList
        jobId={jobId}
        payments={payments}
        showInvoiceColumn
        invoiceNumberById={invoiceNumberById}
      />
      <div>
        <RecordPaymentDialog jobId={jobId} availableInvoices={availableInvoices} />
      </div>
    </div>
  );
}
