"use client";

import { type FormEvent, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createInvoiceAction } from "@/lib/invoices/invoice-actions";
import type { InvoiceDefaults } from "@/lib/invoices/invoices";
import {
  searchContactsAction,
  searchOrganizationsAction,
  searchPropertiesAction,
} from "@/lib/crm/contact-actions";
import { dollarsToCents } from "@/lib/money";
import { ACCENT_COLOR_OPTIONS, FONT_FAMILY_OPTIONS } from "@/lib/pdf/invoice-template";
import { EntityPicker, type PickerOption } from "@/components/entity-picker";
import { InvoicePdfPreview } from "@/components/invoice-pdf-preview";
import { Button } from "@/components/ui/button";
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

// Business/customer info is prefilled from Settings + (when starting from a
// job) the job's linked contact/property/organization, but fully editable
// here — everything gets snapshotted onto the invoice at creation and never
// re-reads live data afterward (docs/PROJECT_SPEC.md §13.3). Line items are
// added afterward on the invoice's own detail page, not here — matching the
// from-scratch workflow, this page only sets up the invoice's header info.
//
// Fields are controlled (not defaultValue) so the side-by-side PDF preview
// can reflect every keystroke — no line items exist yet, so the preview
// necessarily shows an empty table until the invoice is created.
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

  const [contact, setContact] = useState<PickerOption | null>(null);
  const [organization, setOrganization] = useState<PickerOption | null>(null);

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

  const previewDocument = useMemo(() => {
    const taxCents = taxAmount ? dollarsToCents(taxAmount) : 0;
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
      lineItems: [],
      subtotalCents: 0,
      taxCents,
      totalCents: taxCents,
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
    paymentInstructions,
    notes,
    footer,
  ]);

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
              onSelect={(option) => {
                setContact(option);
                if (option && !organization) setCustomerName(option.label);
                if (!option && !organization) setCustomerName("");
              }}
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
            <EntityPicker
              name="organizationId"
              label="Organization (optional)"
              placeholder="Search organizations…"
              search={async (q) =>
                (await searchOrganizationsAction(q)).map((o) => ({ id: o.id, label: o.name }))
              }
              onSelect={(option) => {
                setOrganization(option);
                if (option) setCustomerName(option.label);
                else if (contact) setCustomerName(contact.label);
                else setCustomerName("");
              }}
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
