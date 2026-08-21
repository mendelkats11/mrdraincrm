"use client";

import Link from "next/link";
import { type FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateInvoiceDetailsAction } from "@/lib/invoices/invoice-actions";
import { centsToDollarsInputValue } from "@/lib/money";
import {
  ACCENT_COLOR_OPTIONS,
  FONT_FAMILY_OPTIONS,
  resolveAccentColor,
  resolveFontFamily,
} from "@/lib/pdf/invoice-template";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface EditableInvoiceDetails {
  businessName: string | null;
  businessAddress: string | null;
  accentColor: string | null;
  fontFamily: string | null;
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

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="businessName">Business name</Label>
            <Input
              id="businessName"
              name="businessName"
              defaultValue={invoice.businessName ?? ""}
            />
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
          <p className="text-xs text-muted-foreground">
            Logo is set business-wide in{" "}
            <Link href="/invoices/settings" className="underline">
              Invoice settings
            </Link>
            .
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="accentColor">Accent color</Label>
              <Select name="accentColor" defaultValue={resolveAccentColor(invoice.accentColor)}>
                <SelectTrigger id="accentColor">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACCENT_COLOR_OPTIONS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="fontFamily">Font</Label>
              <Select name="fontFamily" defaultValue={resolveFontFamily(invoice.fontFamily)}>
                <SelectTrigger id="fontFamily">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FONT_FAMILY_OPTIONS.map((f) => (
                    <SelectItem key={f.value} value={f.value}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
