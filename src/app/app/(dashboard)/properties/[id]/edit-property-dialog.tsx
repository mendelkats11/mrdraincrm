"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updatePropertyAction } from "@/lib/crm/property-actions";
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

const TYPES = [
  { value: "residential", label: "Residential" },
  { value: "commercial", label: "Commercial" },
  { value: "multi_unit", label: "Multi-unit" },
  { value: "industrial", label: "Industrial" },
  { value: "other", label: "Other" },
] as const;

export function EditPropertyDialog({
  property,
}: {
  property: {
    id: string;
    addressLine1: string;
    addressLine2: string | null;
    city: string;
    province: string;
    postalCode: string;
    propertyType: string;
    businessName: string | null;
    notes: string | null;
    organizationId: string | null;
    organizationName: string | null;
  };
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await updatePropertyAction(undefined, formData);
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
        <Button variant="outline">Edit</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit property</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto">
          <input type="hidden" name="propertyId" value={property.id} />
          {/* Organization is no longer editable from the UI, but the hidden
              field preserves any existing legacy link on save instead of
              silently clearing it. */}
          <input type="hidden" name="organizationId" value={property.organizationId ?? ""} />

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="addressLine1">Address</Label>
            <Input
              id="addressLine1"
              name="addressLine1"
              defaultValue={property.addressLine1}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="addressLine2">Unit/Suite</Label>
            <Input
              id="addressLine2"
              name="addressLine2"
              defaultValue={property.addressLine2 ?? ""}
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 flex flex-col gap-1.5">
              <Label htmlFor="city">City</Label>
              <Input id="city" name="city" defaultValue={property.city} required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="province">Province</Label>
              <Input id="province" name="province" defaultValue={property.province} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="postalCode">Postal code</Label>
              <Input
                id="postalCode"
                name="postalCode"
                defaultValue={property.postalCode}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="propertyType">Type</Label>
              <Select name="propertyType" defaultValue={property.propertyType}>
                <SelectTrigger id="propertyType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="businessName">Business name (if applicable)</Label>
            <Input
              id="businessName"
              name="businessName"
              defaultValue={property.businessName ?? ""}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" defaultValue={property.notes ?? ""} rows={3} />
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
