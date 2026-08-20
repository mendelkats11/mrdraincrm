import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatTimeRange } from "@/lib/schedule/format";
import { StatusBadge } from "../jobs/status-badge";
import type { ScheduledJobRow } from "@/lib/jobs/jobs";

export interface ScheduledJobWithContractor extends ScheduledJobRow {
  contractorName: string | null;
}

/** Shared job row for Day/Week/List — an agenda-style entry (time label +
 *  identifying details), not a pixel-positioned timeline block. Clicking
 *  anywhere on the row opens /jobs/[id]. */
export function ScheduleJobRow({
  job,
  showTime = true,
}: {
  job: ScheduledJobWithContractor;
  showTime?: boolean;
}) {
  return (
    <Link
      href={`/jobs/${job.id}`}
      className="flex flex-col gap-1 rounded-md border p-3 text-sm transition-colors hover:border-primary sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex flex-col gap-0.5">
        <div className="flex flex-wrap items-center gap-2">
          {showTime ? (
            <span className="font-medium text-foreground">{formatTimeRange(job)}</span>
          ) : null}
          <span className="font-medium text-foreground">{job.jobNumber}</span>
          {job.emergency ? (
            <Badge variant="destructive">
              <AlertTriangle /> Emergency
            </Badge>
          ) : null}
        </div>
        <p className="text-muted-foreground">
          {job.contactName ?? "No contact"}
          {job.propertyAddressLine1 ? ` · ${job.propertyAddressLine1}, ${job.propertyCity}` : ""}
          {job.contractorName ? ` · ${job.contractorName}` : ""}
        </p>
      </div>
      <StatusBadge status={job.status} />
    </Link>
  );
}
