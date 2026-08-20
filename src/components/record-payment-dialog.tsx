"use client";

import { type FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { recordPaymentAction } from "@/lib/payments/payment-actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const NO_INVOICE_VALUE = "none";

function todayInputValue(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export interface InvoiceOption {
  id: string;
  invoiceNumber: string;
}

/**
 * Shared between the invoice detail page (fixedInvoiceId — allocation
 * can't be changed) and the job detail page (availableInvoices — the owner
 * optionally picks which of the job's sent/partially_paid/paid invoices,
 * if any, this payment applies to; a payment always belongs to the job
 * regardless — docs/IMPLEMENTATION_PLAN.md §2.1.D). A negative amount
 * records a refund (Phase 8 §5) — overpayment is allowed, unvalidated
 * (Phase 8 decision 4).
 */
export function RecordPaymentDialog({
  jobId,
  fixedInvoiceId,
  availableInvoices,
  disabled,
}: {
  jobId: string;
  fixedInvoiceId?: string;
  availableInvoices?: InvoiceOption[];
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    if (formData.get("invoiceId") === NO_INVOICE_VALUE) {
      formData.delete("invoiceId");
    }
    startTransition(async () => {
      const result = await recordPaymentAction(undefined, formData);
      if (result?.ok) {
        setOpen(false);
        setError(null);
        router.refresh();
      } else {
        setError(result?.error ?? "Something went wrong.");
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setError(null);
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" disabled={disabled}>
          Record payment
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record a payment</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input type="hidden" name="jobId" value={jobId} />
          {fixedInvoiceId ? <input type="hidden" name="invoiceId" value={fixedInvoiceId} /> : null}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="amount">Amount</Label>
            <Input
              id="amount"
              name="amount"
              inputMode="decimal"
              placeholder="0.00 (negative = refund)"
              required
              autoFocus
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="paidAt">Date</Label>
            <Input
              id="paidAt"
              name="paidAt"
              type="date"
              defaultValue={todayInputValue()}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="method">Method</Label>
            <Select name="method" defaultValue="e_transfer">
              <SelectTrigger id="method">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="e_transfer">E-Transfer</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="cheque">Cheque</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {!fixedInvoiceId && availableInvoices && availableInvoices.length > 0 ? (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="invoiceId">Apply to invoice (optional)</Label>
              <Select name="invoiceId" defaultValue={NO_INVOICE_VALUE}>
                <SelectTrigger id="invoiceId">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_INVOICE_VALUE}>No specific invoice</SelectItem>
                  {availableInvoices.map((invoice) => (
                    <SelectItem key={invoice.id} value={invoice.id}>
                      {invoice.invoiceNumber}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="referenceNote">Reference / note (optional)</Label>
            <Textarea id="referenceNote" name="referenceNote" rows={2} />
          </div>
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Recording…" : "Record payment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
