"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { changeLeadStatusAction } from "@/lib/crm/lead-actions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { STATUS_LABELS } from "../status-badge";
import type { LeadStatus } from "@/lib/crm/leads";

// "won" is intentionally not a selectable option — it's set only by
// converting the lead to a job (see ConvertToJobButton), matching how
// changeLeadStatusAction rejects it server-side too.
const SELECTABLE_STATUSES: Exclude<LeadStatus, "won">[] = [
  "new",
  "contacted",
  "quoted",
  "follow_up",
  "lost",
];

export function StatusSelect({ leadId, status }: { leadId: string; status: LeadStatus }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  if (status === "won") {
    return <p className="text-sm text-muted-foreground">Won — converted to a job.</p>;
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Select
        value={status}
        disabled={pending}
        onValueChange={(next) => {
          const formData = new FormData();
          formData.set("leadId", leadId);
          formData.set("status", next);
          startTransition(async () => {
            const result = await changeLeadStatusAction(undefined, formData);
            if (result?.ok) {
              setError(null);
              router.refresh();
            } else {
              setError(result?.error ?? "Something went wrong.");
            }
          });
        }}
      >
        <SelectTrigger className="w-44">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {SELECTABLE_STATUSES.map((s) => (
            <SelectItem key={s} value={s}>
              {STATUS_LABELS[s]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
