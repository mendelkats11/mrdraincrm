"use client";

import { type FormEvent, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createInvoiceAction } from "@/lib/invoices/invoice-actions";
import type { InvoiceDefaults } from "@/lib/invoices/invoices";
import { searchContactsAction, searchPropertiesAction } from "@/lib/crm/contact-actions";
import { calculateLineTotalCents, dollarsToCents, formatCents } from "@/lib/money";
import { ACCENT_COLOR_OPTIONS, FONT_FAMILY_OPTIONS } from "@/lib/pdf/invoice-template";
import { EntityPicker } from "@/components/entity-picker";
import { InvoicePdfPreview } from "@/components/invoice-pdf-preview";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Business/customer info is prefilled from Settings + (when starting from a
// job) the job's linked contact/property, but fully editable here —
// everything gets snapshotted onto the invoice at creation and never
// re-reads live data afterward (docs/PROJECT_SPEC.md §13.3). Line items are
// entered right here and created together with the invoice in one request
// (createInvoiceAction adds each via addInvoiceLineItem immediately after
// the invoice row exists) — more can still be added/edited/removed on the
// invoice's own detail page afterward, since it stays a Draft.
//
// Fields are controlled (not defaultValue) so the side-by-side PDF preview
// reflects every keystroke, line items included.
export function NewInvoiceForm({
  jobId,
  jobNumber,
  defaults,
  logoUrl,
}: {
  jobId?: string;
  jobNumber?: string;
  defaults: InvoiceDefaults;
  logoUrl: string | null;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const [businessName, setBusinessName] = useState(defaults.businessName ?? "");
  const [businessAddress, setBusinessAddress] = useState(defaults.businessAddress ?? "");
  const [accentColor, setAccentColor] = useState(defaults.accentColor);
  const [fontFamily, setFontFamily] = useState(defaults.fontFamily);
  const [customerName, setCustomerName] = useState(defaults.customerName ?? "");
  const [customerAddress, setCustomerAddress] = useState(defaults.customerAddress ?? "");
  const [taxAmount, setTaxAmount] = useState("");
  const [paymentInstructions, setPaymentInstructions] = useState(
    "E-transfer to payments@mrdrainsk.com",
  );
  const [notes, setNotes] = useState("");
  const [footer, setFooter] = useState("Thank you for your business!");

  // Entered here and created together with the invoice (createInvoiceAction
  // adds each as a real line item right after the invoice row exists) —
  // avoids the old two-step "create an empty invoice, then go add prices on
  // its detail page" flow, which read as "there's no price, just tax."
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
      invoiceNumber: "DRAFT",
      createdAt: new Date(),
      businessName: businessName || null,
      businessAddress: businessAddress || null,
      logoUrl,
      accentColor,
      fontFamily,
      customerName: customerName || null,
      customerAddress: customerAddress || null,
      jobNumber: jobNumber ?? "—",
      lineItems: previewLineItems,
      subtotalCents,
      taxCents,
      totalCents: subtotalCents + taxCents,
      paymentInstructions: paymentInstructions || null,
      notes: notes || null,
      footer: footer || null,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    businessName,
    businessAddress,
    accentColor,
    fontFamily,
    customerName,
    customerAddress,
    taxAmount,
    previewLineItems,
    paymentInstructions,
    notes,
    footer,
  ]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formData.set(
      "lineItemsJson",
      JSON.stringify(lineItems.filter((item) => item.description.trim() && item.unitPrice.trim())),
    );
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
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {jobId ? (
          <input type="hidden" name="jobId" value={jobId} />
        ) : (
          <>
            <EntityPicker
              name="contactId"
              label="Contact (optional)"
              placeholder="Search contacts…"
              search={async (q) =>
                (await searchContactsAction(q)).map((c) => ({ id: c.id, label: c.displayName }))
              }
              onSelect={(option) => setCustomerName(option ? option.label : "")}
            />
            <EntityPicker
              name="propertyId"
              label="Property (optional)"
              placeholder="Search properties…"
              search={async (q) =>
                (await searchPropertiesAction(q)).map((p) => ({
                  id: p.id,
                  label: `${p.addressLine1}, ${p.city}`,
                }))
              }
              onSelect={(option) => setCustomerAddress(option ? option.label : "")}
            />
          </>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="businessName">Business name</Label>
            <Input
              id="businessName"
              name="businessName"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="accentColor">Accent color</Label>
            <Select name="accentColor" value={accentColor} onValueChange={setAccentColor}>
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
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="businessAddress">Business address</Label>
            <Textarea
              id="businessAddress"
              name="businessAddress"
              rows={2}
              value={businessAddress}
              onChange={(e) => setBusinessAddress(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="fontFamily">Font</Label>
            <Select name="fontFamily" value={fontFamily} onValueChange={setFontFamily}>
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
        <p className="text-xs text-muted-foreground">
          Logo is set business-wide in Invoice settings.
        </p>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="customerName">Customer name</Label>
          <Input
            id="customerName"
            name="customerName"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="customerAddress">Customer / service address</Label>
          <Textarea
            id="customerAddress"
            name="customerAddress"
            rows={2}
            value={customerAddress}
            onChange={(e) => setCustomerAddress(e.target.value)}
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
          <Label htmlFor="paymentInstructions">Payment instructions</Label>
          <Textarea
            id="paymentInstructions"
            name="paymentInstructions"
            rows={2}
            value={paymentInstructions}
            onChange={(e) => setPaymentInstructions(e.target.value)}
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
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="footer">Footer</Label>
          <Input
            id="footer"
            name="footer"
            value={footer}
            onChange={(e) => setFooter(e.target.value)}
          />
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

      <InvoicePdfPreview document={previewDocument} />
    </div>
  );
}
