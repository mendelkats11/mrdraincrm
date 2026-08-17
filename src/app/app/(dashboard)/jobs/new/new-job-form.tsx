"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createJobAction } from "@/lib/jobs/job-actions";
import { searchOrganizationsAction, searchPropertiesAction } from "@/lib/crm/contact-actions";
import { EntityPicker } from "@/components/entity-picker";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { ContactField } from "./contact-field";

const STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "open", label: "Open" },
  { value: "scheduled", label: "Scheduled" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
] as const;

export function NewJobForm({
  services,
  initialContact,
  initialProperty,
}: {
  services: { id: string; name: string }[];
  initialContact?: { id: string; label: string } | null;
  initialProperty?: { id: string; label: string } | null;
}) {
  // Basic/Detailed presentation toggle — docs/DESIGN_SYSTEM.md §11. Basic
  // prioritizes fast job creation; Detailed exposes the fuller set of
  // relationships/notes/financial inputs without forcing every job creation
  // through them.
  const [mode, setMode] = useState<"basic" | "detailed">("basic");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await createJobAction(undefined, formData);
      if (result?.ok) {
        router.push(`/jobs/${result.jobId}`);
      } else {
        setError(result?.error ?? "Something went wrong.");
      }
    });
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant={mode === "basic" ? "default" : "outline"}
          size="sm"
          onClick={() => setMode("basic")}
        >
          Basic
        </Button>
        <Button
          type="button"
          variant={mode === "detailed" ? "default" : "outline"}
          size="sm"
          onClick={() => setMode("detailed")}
        >
          Detailed
        </Button>
      </div>

      <ContactField initial={initialContact} />

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

      {mode === "detailed" ? (
        <EntityPicker
          name="organizationId"
          label="Organization (optional)"
          placeholder="Search organizations…"
          search={async (q) =>
            (await searchOrganizationsAction(q)).map((o) => ({ id: o.id, label: o.name }))
          }
        />
      ) : null}

      {services.length > 0 ? (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="serviceId">Service (optional)</Label>
          <Select name="serviceId">
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
          placeholder="Describe the work — this isn't limited to the service picked above."
        />
      </div>

      <div className="flex items-center gap-2">
        <Checkbox id="emergency" name="emergency" />
        <Label htmlFor="emergency" className="font-normal">
          Emergency
        </Label>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="status">Status</Label>
        <Select name="status" defaultValue="draft">
          <SelectTrigger id="status" className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {mode === "detailed" ? (
        <>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="internalNotes">Internal notes</Label>
            <Textarea id="internalNotes" name="internalNotes" rows={3} />
          </div>

          <div className="rounded-lg border p-4">
            <h2 className="mb-3 text-sm font-medium text-foreground">
              Financial inputs (all manual dollar amounts)
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="jobAmount">Job amount</Label>
                <Input id="jobAmount" name="jobAmount" inputMode="decimal" placeholder="0.00" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="taxAmount">Tax amount</Label>
                <Input id="taxAmount" name="taxAmount" inputMode="decimal" placeholder="0.00" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="materials">Materials</Label>
                <Input id="materials" name="materials" inputMode="decimal" placeholder="0.00" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="contractorPayout">Contractor payout</Label>
                <Input
                  id="contractorPayout"
                  name="contractorPayout"
                  inputMode="decimal"
                  placeholder="0.00"
                />
              </div>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Custom charges can be added once the job is created.
            </p>
          </div>
        </>
      ) : null}

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create job"}
        </Button>
      </div>
    </form>
  );
}
