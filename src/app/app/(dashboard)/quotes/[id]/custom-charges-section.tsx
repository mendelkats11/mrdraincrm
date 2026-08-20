"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  addQuoteCustomChargeAction,
  removeQuoteCustomChargeAction,
} from "@/lib/quotes/quote-actions";
import type { QuoteCustomChargeRow } from "@/lib/quotes/quotes";
import { formatCents } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RemoveButton } from "@/components/remove-button";

// A distinct concept from line items (no quantity/unit price) — mirrors
// job_custom_charges. Positive or negative (negative = discount/credit).
export function CustomChargesSection({
  quoteId,
  customCharges,
  editable,
}: {
  quoteId: string;
  customCharges: QuoteCustomChargeRow[];
  editable: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleAdd(formData: FormData) {
    startTransition(async () => {
      const result = await addQuoteCustomChargeAction(undefined, formData);
      if (result?.ok) {
        setError(null);
        router.refresh();
      } else {
        setError(result?.error ?? "Something went wrong.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-3 border-t pt-3">
      <h3 className="text-sm font-medium text-foreground">Custom charges</h3>
      {customCharges.length === 0 ? (
        <p className="text-sm text-muted-foreground">No custom charges.</p>
      ) : (
        <ul className="flex flex-col gap-1" data-testid="custom-charges-list">
          {customCharges.map((charge) => (
            <li key={charge.id} className="flex items-center justify-between text-sm">
              <span>
                {charge.description}
                <span className="ml-2 text-muted-foreground">
                  {formatCents(charge.amountCents)}
                </span>
              </span>
              {editable ? (
                <RemoveButton
                  label="Remove custom charge"
                  onRemove={removeQuoteCustomChargeAction.bind(null, quoteId, charge.id)}
                />
              ) : null}
            </li>
          ))}
        </ul>
      )}
      {editable ? (
        <form action={handleAdd} className="flex flex-wrap items-end gap-2">
          <input type="hidden" name="quoteId" value={quoteId} />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="chargeDescription" className="text-xs">
              Description
            </Label>
            <Input id="chargeDescription" name="description" className="w-48" required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="chargeAmount" className="text-xs">
              Amount
            </Label>
            <Input
              id="chargeAmount"
              name="amount"
              inputMode="decimal"
              placeholder="0.00 (negative = discount)"
              className="w-40"
              required
            />
          </div>
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? "Adding…" : "Add charge"}
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
