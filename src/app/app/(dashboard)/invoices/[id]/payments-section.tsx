import { formatCents } from "@/lib/money";
import { PaymentsList, type PaymentRow } from "@/components/payments-list";
import { RecordPaymentDialog } from "@/components/record-payment-dialog";

// A negative balance is displayed as a credit rather than hidden or
// clamped to zero — overpayment is allowed, not validated against
// (Phase 8 decision 4).
export function PaymentsSection({
  jobId,
  invoiceId,
  payments,
  balanceCents,
  canRecordPayment,
}: {
  jobId: string;
  invoiceId: string;
  payments: PaymentRow[];
  balanceCents: number | null;
  canRecordPayment: boolean;
}) {
  return (
    <div className="flex flex-col gap-3">
      {balanceCents !== null ? (
        <p className="text-sm">
          Balance:{" "}
          <span className="font-medium">
            {balanceCents <= 0 ? "Paid in full" : formatCents(balanceCents)}
          </span>
          {balanceCents < 0 ? (
            <span className="ml-1 text-muted-foreground">
              ({formatCents(Math.abs(balanceCents))} credit)
            </span>
          ) : null}
        </p>
      ) : null}

      <PaymentsList jobId={jobId} payments={payments} />

      <div>
        <RecordPaymentDialog
          jobId={jobId}
          fixedInvoiceId={invoiceId}
          disabled={!canRecordPayment}
        />
      </div>
    </div>
  );
}
