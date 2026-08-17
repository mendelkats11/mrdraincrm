"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  addJobCustomChargeAction,
  removeJobCustomChargeAction,
  updateJobFinancialsAction,
} from "@/lib/jobs/job-actions";
import { centsToDollarsInputValue, formatCents } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RemoveButton } from "@/components/remove-button";

// Raw manual dollar inputs only — this section never computes or shows a
// customer total, cost total, profit, or margin. Those belong exclusively
// to Phase 8's financial engine, which will read these same columns.
export function FinancialSection({
  jobId,
  jobAmountCents,
  taxAmountCents,
  materialsCents,
  contractorPayoutCents,
  customCharges,
}: {
  jobId: string;
  jobAmountCents: number;
  taxAmountCents: number;
  materialsCents: number;
  contractorPayoutCents: number;
  customCharges: { id: string; description: string; amountCents: number }[];
}) {
  const [error, setError] = useState<string | null>(null);
  const [chargeError, setChargeError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [chargePending, startChargeTransition] = useTransition();
  const router = useRouter();

  function handleSave(formData: FormData) {
    startTransition(async () => {
      const result = await updateJobFinancialsAction(undefined, formData);
      if (result?.ok) {
        setError(null);
        router.refresh();
      } else {
        setError(result?.error ?? "Something went wrong.");
      }
    });
  }

  function handleAddCharge(formData: FormData) {
    startChargeTransition(async () => {
      const result = await addJobCustomChargeAction(undefined, formData);
      if (result?.ok) {
        setChargeError(null);
        router.refresh();
      } else {
        setChargeError(result?.error ?? "Something went wrong.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <form action={handleSave} className="flex flex-col gap-3">
        <input type="hidden" name="jobId" value={jobId} />
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="jobAmount">Job amount</Label>
            <Input
              id="jobAmount"
              name="jobAmount"
              inputMode="decimal"
              defaultValue={centsToDollarsInputValue(jobAmountCents)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="taxAmount">Tax amount</Label>
            <Input
              id="taxAmount"
              name="taxAmount"
              inputMode="decimal"
              defaultValue={centsToDollarsInputValue(taxAmountCents)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="materials">Materials</Label>
            <Input
              id="materials"
              name="materials"
              inputMode="decimal"
              defaultValue={centsToDollarsInputValue(materialsCents)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="contractorPayout">Contractor payout</Label>
            <Input
              id="contractorPayout"
              name="contractorPayout"
              inputMode="decimal"
              defaultValue={centsToDollarsInputValue(contractorPayoutCents)}
            />
          </div>
        </div>
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <div>
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? "Saving…" : "Save financial inputs"}
          </Button>
        </div>
      </form>

      <div className="border-t pt-3">
        <h3 className="mb-2 text-sm font-medium text-foreground">Custom charges</h3>
        {customCharges.length === 0 ? (
          <p className="text-sm text-muted-foreground">No custom charges.</p>
        ) : (
          <ul className="mb-3 flex flex-col gap-1" data-testid="custom-charges-list">
            {customCharges.map((charge) => (
              <li key={charge.id} className="flex items-center justify-between text-sm">
                <span>
                  {charge.description}
                  <span className="ml-2 text-muted-foreground">
                    {formatCents(charge.amountCents)}
                  </span>
                </span>
                <RemoveButton
                  label="Remove custom charge"
                  onRemove={removeJobCustomChargeAction.bind(null, jobId, charge.id)}
                />
              </li>
            ))}
          </ul>
        )}
        <form action={handleAddCharge} className="flex flex-wrap items-end gap-2">
          <input type="hidden" name="jobId" value={jobId} />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="chargeDescription" className="text-xs">
              Description
            </Label>
            <Input id="chargeDescription" name="description" className="w-48" />
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
            />
          </div>
          <Button type="submit" size="sm" variant="outline" disabled={chargePending}>
            {chargePending ? "Adding…" : "Add charge"}
          </Button>
        </form>
        {chargeError ? (
          <p role="alert" className="mt-1 text-sm text-destructive">
            {chargeError}
          </p>
        ) : null}
      </div>
    </div>
  );
}
