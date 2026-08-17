"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { changeJobStatusAction } from "@/lib/jobs/job-actions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { STATUS_LABELS } from "../status-badge";
import type { JobStatus } from "@/lib/jobs/jobs";

// Free transitions between all six statuses — no state machine, per the
// approved Phase 5 decision.
const ALL_STATUSES: JobStatus[] = [
  "draft",
  "open",
  "scheduled",
  "in_progress",
  "completed",
  "cancelled",
];

export function StatusSelect({ jobId, status }: { jobId: string; status: JobStatus }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <div className="flex flex-col gap-1.5">
      <Select
        value={status}
        disabled={pending}
        onValueChange={(next) => {
          const formData = new FormData();
          formData.set("jobId", jobId);
          formData.set("status", next);
          startTransition(async () => {
            const result = await changeJobStatusAction(undefined, formData);
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
          {ALL_STATUSES.map((s) => (
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
