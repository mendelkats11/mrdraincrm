"use client";

import { type FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createInvoiceAction } from "@/lib/invoices/invoice-actions";
import type { InvoiceDefaults } from "@/lib/invoices/invoices";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

// Business/customer info is prefilled from Settings + the job's linked
// contact/property/organization but fully editable here — everything gets
// snapshotted onto the invoice at creation and never re-reads live data
// afterward (docs/PROJECT_SPEC.md §13.3). Line items are added afterward
// on the invoice's own detail page, not here — matching the from-scratch
// workflow, this page only sets up the invoice's header information.
export function NewInvoiceForm({ jobId, defaults }: { jobId: string; defaults: InvoiceDefaults }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await createInvoiceAction(undefined, formData);
      if (result?.ok) {
        router.push(`/invoices/${result.invoiceId}`);
      } else {
        setError(result?.error ?? "Something went wrong.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <input type="hidden" name="jobId" value={jobId} />

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="businessName">Business name</Label>
          <Input id="businessName" name="businessName" defaultValue={defaults.businessName ?? ""} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="logoUrl">Logo URL (optional)</Label>
          <Input id="logoUrl" name="logoUrl" defaultValue={defaults.logoUrl ?? ""} />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="businessAddress">Business address</Label>
        <Textarea
          id="businessAddress"
          name="businessAddress"
          rows={2}
          defaultValue={defaults.businessAddress ?? ""}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="customerName">Customer name</Label>
        <Input id="customerName" name="customerName" defaultValue={defaults.customerName ?? ""} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="customerAddress">Customer / service address</Label>
        <Textarea
          id="customerAddress"
          name="customerAddress"
          rows={2}
          defaultValue={defaults.customerAddress ?? ""}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="taxAmount">Tax amount</Label>
        <Input id="taxAmount" name="taxAmount" inputMode="decimal" placeholder="0.00" />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="paymentInstructions">Payment instructions</Label>
        <Textarea
          id="paymentInstructions"
          name="paymentInstructions"
          rows={2}
          defaultValue="E-transfer to payments@mrdrainsk.com"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" name="notes" rows={2} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="footer">Footer</Label>
        <Input id="footer" name="footer" placeholder="Thank you for your business!" />
      </div>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create invoice"}
        </Button>
      </div>
    </form>
  );
}
