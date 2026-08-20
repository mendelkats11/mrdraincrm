"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  addInvoiceLineItemAction,
  removeInvoiceLineItemAction,
} from "@/lib/invoices/invoice-actions";
import type { InvoiceLineItemRow } from "@/lib/invoices/invoices";
import { formatCents } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RemoveButton } from "@/components/remove-button";
import { EditLineItemDialog } from "./edit-line-item-dialog";

// From-scratch line items only — no service catalog, negative unit price
// is how a discount line is represented (docs/PROJECT_SPEC.md §13.2,
// mirrors job custom charges). Locked once the invoice is no longer Draft
// (Phase 8 decision 2) — the `editable` flag is the single source of truth
// for whether any of the mutation UI below renders at all.
export function LineItemsSection({
  invoiceId,
  jobId,
  lineItems,
  editable,
}: {
  invoiceId: string;
  jobId: string;
  lineItems: InvoiceLineItemRow[];
  editable: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleAdd(formData: FormData) {
    startTransition(async () => {
      const result = await addInvoiceLineItemAction(undefined, formData);
      if (result?.ok) {
        setError(null);
        router.refresh();
      } else {
        setError(result?.error ?? "Something went wrong.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {lineItems.length === 0 ? (
        <p className="text-sm text-muted-foreground">No line items yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left text-xs text-muted-foreground">
                <th className="px-3 py-2 font-medium">Description</th>
                <th className="px-3 py-2 font-medium">Qty</th>
                <th className="px-3 py-2 font-medium">Unit Price</th>
                <th className="px-3 py-2 text-right font-medium">Total</th>
                {editable ? <th className="w-24 px-3 py-2" /> : null}
              </tr>
            </thead>
            <tbody>
              {lineItems.map((item) => (
                <tr key={item.id} className="border-b last:border-0">
                  <td className="px-3 py-2">{item.description}</td>
                  <td className="px-3 py-2 text-muted-foreground">{item.quantity}</td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {formatCents(item.unitPriceCents)}
                  </td>
                  <td className="px-3 py-2 text-right">{formatCents(item.lineTotalCents)}</td>
                  {editable ? (
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1">
                        <EditLineItemDialog invoiceId={invoiceId} jobId={jobId} lineItem={item} />
                        <RemoveButton
                          label="Remove line item"
                          onRemove={removeInvoiceLineItemAction.bind(
                            null,
                            invoiceId,
                            jobId,
                            item.id,
                          )}
                        />
                      </div>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editable ? (
        <form action={handleAdd} className="flex flex-wrap items-end gap-2 rounded-lg border p-3">
          <input type="hidden" name="invoiceId" value={invoiceId} />
          <input type="hidden" name="jobId" value={jobId} />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="description" className="text-xs">
              Description
            </Label>
            <Input id="description" name="description" className="w-56" required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="quantity" className="text-xs">
              Qty
            </Label>
            <Input id="quantity" name="quantity" defaultValue="1" className="w-20" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="unitPrice" className="text-xs">
              Unit price
            </Label>
            <Input
              id="unitPrice"
              name="unitPrice"
              inputMode="decimal"
              placeholder="0.00 (negative = discount)"
              className="w-44"
              required
            />
          </div>
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? "Adding…" : "Add line item"}
          </Button>
        </form>
      ) : null}
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
