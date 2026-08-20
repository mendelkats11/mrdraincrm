"use client";

import { type FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateInvoiceDetailsAction } from "@/lib/invoices/invoice-actions";
import { centsToDollarsInputValue } from "@/lib/money";
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
import { Textarea } from "@/components/ui/textarea";

export interface EditableInvoiceDetails {
  businessName: string | null;
  businessAddress: string | null;
  logoUrl: string | null;
  customerName: string | null;
  customerAddress: string | null;
  taxCents: number;
  paymentInstructions: string | null;
  notes: string | null;
  footer: string | null;
}

export function InvoiceDetailsDialog({
  invoiceId,
  jobId,
  invoice,
}: {
  invoiceId: string;
  jobId: string;
  invoice: EditableInvoiceDetails;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await updateInvoiceDetailsAction(undefined, formData);
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
        <Button type="button" variant="outline" size="sm">
          Edit details
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit invoice details</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto">
          <input type="hidden" name="invoiceId" value={invoiceId} />
          <input type="hidden" name="jobId" value={jobId} />
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="businessName">Business name</Label>
              <Input
                id="businessName"
                name="businessName"
                defaultValue={invoice.businessName ?? ""}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="logoUrl">Logo URL</Label>
              <Input id="logoUrl" name="logoUrl" defaultValue={invoice.logoUrl ?? ""} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="businessAddress">Business address</Label>
            <Textarea
              id="businessAddress"
              name="businessAddress"
              rows={2}
              defaultValue={invoice.businessAddress ?? ""}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="customerName">Customer name</Label>
            <Input
              id="customerName"
              name="customerName"
              defaultValue={invoice.customerName ?? ""}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="customerAddress">Customer / service address</Label>
            <Textarea
              id="customerAddress"
              name="customerAddress"
              rows={2}
              defaultValue={invoice.customerAddress ?? ""}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="taxAmount">Tax amount</Label>
            <Input
              id="taxAmount"
              name="taxAmount"
              inputMode="decimal"
              defaultValue={centsToDollarsInputValue(invoice.taxCents)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="paymentInstructions">Payment instructions</Label>
            <Textarea
              id="paymentInstructions"
              name="paymentInstructions"
              rows={2}
              defaultValue={invoice.paymentInstructions ?? ""}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" rows={2} defaultValue={invoice.notes ?? ""} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="footer">Footer</Label>
            <Input id="footer" name="footer" defaultValue={invoice.footer ?? ""} />
          </div>
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
