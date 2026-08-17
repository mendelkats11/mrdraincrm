"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateLeadAction } from "@/lib/crm/lead-actions";
import {
  searchContactsAction,
  searchOrganizationsAction,
  searchPropertiesAction,
} from "@/lib/crm/contact-actions";
import type { LeadWithLabels } from "@/lib/crm/leads";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { EntityPicker } from "@/components/entity-picker";

export function EditLeadDialog({
  lead,
  services,
}: {
  lead: LeadWithLabels;
  services: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await updateLeadAction(undefined, formData);
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
          <DialogTitle>Edit lead</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto">
          <input type="hidden" name="leadId" value={lead.id} />
          <EntityPicker
            name="contactId"
            label="Contact (optional)"
            placeholder="Search contacts…"
            initial={lead.contactId ? { id: lead.contactId, label: lead.contactName ?? "" } : null}
            search={async (q) =>
              (await searchContactsAction(q)).map((c) => ({ id: c.id, label: c.displayName }))
            }
          />
          <EntityPicker
            name="propertyId"
            label="Property (optional)"
            placeholder="Search properties…"
            initial={
              lead.propertyId
                ? {
                    id: lead.propertyId,
                    label: `${lead.propertyAddressLine1}, ${lead.propertyCity}`,
                  }
                : null
            }
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
            initial={
              lead.organizationId
                ? { id: lead.organizationId, label: lead.organizationName ?? "" }
                : null
            }
            search={async (q) =>
              (await searchOrganizationsAction(q)).map((o) => ({ id: o.id, label: o.name }))
            }
          />
          {services.length > 0 ? (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="serviceId">Service (optional)</Label>
              <Select name="serviceId" defaultValue={lead.serviceId ?? undefined}>
                <SelectTrigger id="serviceId">
                  <SelectValue placeholder="Select a service" />
                </SelectTrigger>
                <SelectContent>
                  {services.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="issueDescription">Issue</Label>
            <Textarea
              id="issueDescription"
              name="issueDescription"
              rows={3}
              defaultValue={lead.issueDescription ?? ""}
            />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="emergency" name="emergency" defaultChecked={lead.emergency} />
            <Label htmlFor="emergency" className="font-normal">
              Emergency
            </Label>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="latestSource">Latest source</Label>
            <Input id="latestSource" name="latestSource" defaultValue={lead.latestSource ?? ""} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sourceDetails">Source details</Label>
            <Input
              id="sourceDetails"
              name="sourceDetails"
              defaultValue={lead.sourceDetails ?? ""}
            />
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
