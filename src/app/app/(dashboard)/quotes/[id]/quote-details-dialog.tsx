"use client";

import { type FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateQuoteDetailsAction } from "@/lib/quotes/quote-actions";
import { searchContactsAction, searchPropertiesAction } from "@/lib/crm/contact-actions";
import { EntityPicker, type PickerOption } from "@/components/entity-picker";
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

export interface EditableQuoteDetails {
  description: string | null;
  notes: string | null;
  expiresAt: Date | null;
  taxCents: number;
}

export function QuoteDetailsDialog({
  quoteId,
  quote,
  initialContact,
  initialProperty,
  existingOrganizationId,
}: {
  quoteId: string;
  quote: EditableQuoteDetails;
  initialContact: PickerOption | null;
  initialProperty: PickerOption | null;
  /** Organization is no longer editable from the UI; this preserves any
   *  existing legacy link on save instead of silently clearing it. */
  existingOrganizationId: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await updateQuoteDetailsAction(undefined, formData);
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
          <DialogTitle>Edit quote details</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto">
          <input type="hidden" name="quoteId" value={quoteId} />
          <input type="hidden" name="organizationId" value={existingOrganizationId ?? ""} />

          <EntityPicker
            name="contactId"
            label="Contact (optional)"
            placeholder="Search contacts…"
            initial={initialContact}
            search={async (q) =>
              (await searchContactsAction(q)).map((c) => ({ id: c.id, label: c.displayName }))
            }
          />
          <EntityPicker
            name="propertyId"
            label="Property (optional)"
            placeholder="Search properties…"
            initial={initialProperty}
            search={async (q) =>
              (await searchPropertiesAction(q)).map((p) => ({
                id: p.id,
                label: `${p.addressLine1}, ${p.city}`,
              }))
            }
          />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              rows={3}
              defaultValue={quote.description ?? ""}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="taxAmount">Tax amount</Label>
            <Input
              id="taxAmount"
              name="taxAmount"
              inputMode="decimal"
              defaultValue={centsToDollarsInputValue(quote.taxCents)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="expiresAt">Expires</Label>
            <Input
              id="expiresAt"
              name="expiresAt"
              type="date"
              className="w-48"
              defaultValue={
                quote.expiresAt ? quote.expiresAt.toISOString().slice(0, 10) : undefined
              }
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" rows={2} defaultValue={quote.notes ?? ""} />
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
