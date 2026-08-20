import { Badge } from "@/components/ui/badge";
import type { InvoiceStatus } from "@/lib/invoices/invoices";

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  draft: "Draft",
  sent: "Sent",
  partially_paid: "Partially Paid",
  paid: "Paid",
  void: "Void",
};

const STATUS_VARIANTS: Record<InvoiceStatus, "default" | "outline" | "secondary" | "destructive"> =
  {
    draft: "secondary",
    sent: "outline",
    partially_paid: "outline",
    paid: "default",
    void: "destructive",
  };

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  return <Badge variant={STATUS_VARIANTS[status]}>{INVOICE_STATUS_LABELS[status]}</Badge>;
}
