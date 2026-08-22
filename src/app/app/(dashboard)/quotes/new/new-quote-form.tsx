"use client";

import { type FormEvent, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { createQuoteAction } from "@/lib/quotes/quote-actions";
import { searchContactsAction, searchPropertiesAction } from "@/lib/crm/contact-actions";
import { calculateLineTotalCents, dollarsToCents, formatCents } from "@/lib/money";
import { EntityPicker, type PickerOption } from "@/components/entity-picker";
import { QuotePdfPreview } from "@/components/quote-pdf-preview";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

// One page: contact/property, description, line items (with a live PDF
// preview alongside, mirroring the invoice creation flow — src/app/app/
// (dashboard)/invoices/new/new-invoice-form.tsx), tax, expiry, and notes,
// all entered here and created together in one request. Business name/
// address/logo are NOT entered here — quotes always render with the
// business's current Settings at PDF-generation time rather than
// snapshotting them (src/lib/pdf/quote-pdf-generator.tsx), so they're only
// passed in as read-only preview context.
export function NewQuoteForm({
  initialContact,
  initialProperty,
  businessName,
  businessAddress,
  logoUrl,
}: {
  initialContact?: PickerOption | null;
  initialProperty?: PickerOption | null;
  businessName: string | null;
  businessAddress: string | null;
  logoUrl: string | null;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const [customerName, setCustomerName] = useState(initialContact?.label ?? "");
  const [customerAddress, setCustomerAddress] = useState(initialProperty?.label ?? "");
  const [description, setDescription] = useState("");
  const [taxAmount, setTaxAmount] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [notes, setNotes] = useState("");

  const [lineItems, setLineItems] = useState<
    { description: string; quantity: string; unitPrice: string }[]
  >([{ description: "", quantity: "1", unitPrice: "" }]);

  function updateLineItem(
    index: number,
    field: "description" | "quantity" | "unitPrice",
    value: string,
  ) {
    setLineItems((items) =>
      items.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    );
  }

  function addLineItemRow() {
    setLineItems((items) => [...items, { description: "", quantity: "1", unitPrice: "" }]);
  }

  function removeLineItemRow(index: number) {
    setLineItems((items) => items.filter((_, i) => i !== index));
  }

  const previewLineItems = useMemo(
    () =>
      lineItems
        .filter((item) => item.description.trim() && item.unitPrice.trim())
        .map((item) => {
          const unitPriceCents = dollarsToCents(item.unitPrice);
          return {
            description: item.description,
            quantity: item.quantity || "1",
            unitPriceCents,
            lineTotalCents: calculateLineTotalCents(item.quantity || "1", unitPriceCents),
          };
        }),
    [lineItems],
  );

  const previewDocument = useMemo(() => {
    const taxCents = taxAmount ? dollarsToCents(taxAmount) : 0;
    const subtotalCents = previewLineItems.reduce((sum, item) => sum + item.lineTotalCents, 0);
    return {
      quoteNumber: "DRAFT",
      createdAt: new Date(),
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      businessName,
      businessAddress,
      logoUrl,
      customerName: customerName || null,
      customerAddress: customerAddress || null,
      description: description || null,
      lineItems: previewLineItems,
      subtotalCents,
      taxCents,
      totalCents: subtotalCents + taxCents,
      notes: notes || null,
    };
  }, [
    businessName,
    businessAddress,
    logoUrl,
    customerName,
    customerAddress,
    description,
    previewLineItems,
    taxAmount,
    expiresAt,
    notes,
  ]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formData.set(
      "lineItemsJson",
      JSON.stringify(lineItems.filter((item) => item.description.trim() && item.unitPrice.trim())),
    );
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
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <EntityPicker
          name="contactId"
          label="Contact (optional)"
          placeholder="Search contacts…"
          initial={initialContact}
          search={async (q) =>
            (await searchContactsAction(q)).map((c) => ({ id: c.id, label: c.displayName }))
          }
          onSelect={(option) => setCustomerName(option ? option.label : "")}
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
          onSelect={(option) => setCustomerAddress(option ? option.label : "")}
        />
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            name="description"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label>Line items</Label>
          <div className="flex flex-col gap-2 rounded-lg border p-3">
            {lineItems.map((item, index) => (
              <div key={index} className="flex flex-wrap items-end gap-2">
                <div className="flex flex-1 min-w-40 flex-col gap-1.5">
                  <Label htmlFor={`li-description-${index}`} className="text-xs">
                    Description
                  </Label>
                  <Input
                    id={`li-description-${index}`}
                    value={item.description}
                    onChange={(e) => updateLineItem(index, "description", e.target.value)}
                  />
                </div>
                <div className="flex w-20 flex-col gap-1.5">
                  <Label htmlFor={`li-qty-${index}`} className="text-xs">
                    Qty
                  </Label>
                  <Input
                    id={`li-qty-${index}`}
                    value={item.quantity}
                    onChange={(e) => updateLineItem(index, "quantity", e.target.value)}
                  />
                </div>
                <div className="flex w-32 flex-col gap-1.5">
                  <Label htmlFor={`li-price-${index}`} className="text-xs">
                    Unit price
                  </Label>
                  <Input
                    id={`li-price-${index}`}
                    inputMode="decimal"
                    placeholder="0.00"
                    value={item.unitPrice}
                    onChange={(e) => updateLineItem(index, "unitPrice", e.target.value)}
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-9"
                  aria-label="Remove line item"
                  onClick={() => removeLineItemRow(index)}
                  disabled={lineItems.length === 1}
                >
                  <X className="size-3.5" />
                </Button>
              </div>
            ))}
            <div>
              <Button type="button" variant="outline" size="sm" onClick={addLineItemRow}>
                + Add line item
              </Button>
            </div>
            <p className="text-right text-sm text-muted-foreground">
              Subtotal: {formatCents(previewDocument.subtotalCents)}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="taxAmount">Tax amount</Label>
          <Input
            id="taxAmount"
            name="taxAmount"
            inputMode="decimal"
            placeholder="0.00"
            value={taxAmount}
            onChange={(e) => setTaxAmount(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="expiresAt">Expires (optional)</Label>
          <Input
            id="expiresAt"
            name="expiresAt"
            type="date"
            className="w-48"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            name="notes"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
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

      <QuotePdfPreview document={previewDocument} />
    </div>
  );
}
