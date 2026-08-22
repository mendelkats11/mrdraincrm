"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateJobAction } from "@/lib/jobs/job-actions";
import { searchContactsAction, searchPropertiesAction } from "@/lib/crm/contact-actions";
import type { JobWithLabels } from "@/lib/jobs/jobs";
import { EntityPicker } from "@/components/entity-picker";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export function EditJobDialog({
  job,
  services,
}: {
  job: JobWithLabels;
  services: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await updateJobAction(undefined, formData);
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
          <DialogTitle>Edit job</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto">
          <input type="hidden" name="jobId" value={job.id} />
          {/* Organization is no longer editable from the UI, but this
              preserves any existing legacy link on save instead of
              silently clearing it. */}
          <input type="hidden" name="organizationId" value={job.organizationId ?? ""} />
          <EntityPicker
            name="contactId"
            label="Contact (optional)"
            placeholder="Search contacts…"
            initial={job.contactId ? { id: job.contactId, label: job.contactName ?? "" } : null}
            search={async (q) =>
              (await searchContactsAction(q)).map((c) => ({ id: c.id, label: c.displayName }))
            }
          />
          <EntityPicker
            name="propertyId"
            label="Property (optional)"
            placeholder="Search properties…"
            initial={
              job.propertyId
                ? { id: job.propertyId, label: `${job.propertyAddressLine1}, ${job.propertyCity}` }
                : null
            }
            search={async (q) =>
              (await searchPropertiesAction(q)).map((p) => ({
                id: p.id,
                label: `${p.addressLine1}, ${p.city}`,
              }))
            }
          />
          {services.length > 0 ? (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="serviceId">Service (optional)</Label>
              <Select name="serviceId" defaultValue={job.serviceId ?? undefined}>
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
            <Label htmlFor="issueDescription">Issue / work description</Label>
            <Textarea
              id="issueDescription"
              name="issueDescription"
              rows={3}
              defaultValue={job.issueDescription ?? ""}
            />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="emergency" name="emergency" defaultChecked={job.emergency} />
            <Label htmlFor="emergency" className="font-normal">
              Emergency
            </Label>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="internalNotes">Internal notes</Label>
            <Textarea
              id="internalNotes"
              name="internalNotes"
              rows={3}
              defaultValue={job.internalNotes ?? ""}
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
