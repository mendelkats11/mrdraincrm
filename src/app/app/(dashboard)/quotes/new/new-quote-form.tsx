"use client";

import { type FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createQuoteAction } from "@/lib/quotes/quote-actions";
import {
  searchContactsAction,
  searchOrganizationsAction,
  searchPropertiesAction,
} from "@/lib/crm/contact-actions";
import { EntityPicker, type PickerOption } from "@/components/entity-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

// Quotes are created without a job (unlike invoices) — contact/property/
// organization are all optional live relationships, entered here directly.
// Line items are added afterward on the quote's own detail page, matching
// the from-scratch workflow.
export function NewQuoteForm({
  initialContact,
  initialProperty,
  initialOrganization,
}: {
  initialContact?: PickerOption | null;
  initialProperty?: PickerOption | null;
  initialOrganization?: PickerOption | null;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await createQuoteAction(undefined, formData);
      if (result?.ok) {
        router.push(`/quotes/${result.quoteId}`);
      } else {
        setError(result?.error ?? "Something went wrong.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
      <EntityPicker
        name="organizationId"
        label="Organization (optional)"
        placeholder="Search organizations…"
        initial={initialOrganization}
        search={async (q) =>
          (await searchOrganizationsAction(q)).map((o) => ({ id: o.id, label: o.name }))
        }
      />

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" name="description" rows={3} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="taxAmount">Tax amount</Label>
        <Input id="taxAmount" name="taxAmount" inputMode="decimal" placeholder="0.00" />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="expiresAt">Expires (optional)</Label>
        <Input id="expiresAt" name="expiresAt" type="date" className="w-48" />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" name="notes" rows={2} />
      </div>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create quote"}
        </Button>
      </div>
    </form>
  );
}
