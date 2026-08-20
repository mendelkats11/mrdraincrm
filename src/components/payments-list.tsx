import { formatCents } from "@/lib/money";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { VoidPaymentButton } from "@/components/void-payment-button";

const METHOD_LABELS: Record<string, string> = {
  e_transfer: "E-Transfer",
  cash: "Cash",
  cheque: "Cheque",
  other: "Other",
};

const DATE_FMT = new Intl.DateTimeFormat("en-CA", { dateStyle: "medium" });

export interface PaymentRow {
  id: string;
  amountCents: number;
  paidAt: Date;
  method: string;
  referenceNote: string | null;
  voidedAt: Date | null;
  invoiceId: string | null;
}

export function PaymentsList({
  jobId,
  payments,
  showInvoiceColumn,
  invoiceNumberById,
}: {
  jobId: string;
  payments: PaymentRow[];
  showInvoiceColumn?: boolean;
  invoiceNumberById?: Map<string, string>;
}) {
  if (payments.length === 0) {
    return <p className="text-sm text-muted-foreground">No payments recorded.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Method</TableHead>
            <TableHead>Amount</TableHead>
            {showInvoiceColumn ? <TableHead>Invoice</TableHead> : null}
            <TableHead>Note</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {payments.map((payment) => (
            <TableRow key={payment.id}>
              <TableCell className="text-muted-foreground">
                {DATE_FMT.format(payment.paidAt)}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {METHOD_LABELS[payment.method] ?? payment.method}
              </TableCell>
              <TableCell>{formatCents(payment.amountCents)}</TableCell>
              {showInvoiceColumn ? (
                <TableCell className="text-muted-foreground">
                  {payment.invoiceId ? (invoiceNumberById?.get(payment.invoiceId) ?? "—") : "—"}
                </TableCell>
              ) : null}
              <TableCell className="text-muted-foreground">
                {payment.referenceNote ?? "—"}
              </TableCell>
              <TableCell>
                {payment.voidedAt ? <Badge variant="destructive">Voided</Badge> : null}
              </TableCell>
              <TableCell>
                {!payment.voidedAt ? (
                  <VoidPaymentButton
                    paymentId={payment.id}
                    jobId={jobId}
                    invoiceId={payment.invoiceId}
                  />
                ) : null}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
