import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { formatScheduleSummary } from "@/lib/schedule/format";
import type { EntityJobRow } from "@/lib/jobs/jobs";
import { StatusBadge as JobStatusBadge } from "@/app/app/(dashboard)/jobs/status-badge";

/** Reusable "Jobs" card for the Contact/Property detail pages —
 *  overhaul.md §5/§9/§17: a record's jobs should be visible and one click
 *  away from the record itself, not something the user has to find via the
 *  Jobs list search. Read-only — the page's own header "+ New Job" button
 *  (already contextual, via /jobs/new?contactId=/?propertyId=) is the one
 *  create action; a second one here would just duplicate it. */
export function RelatedJobsCard({ jobs }: { jobs: EntityJobRow[] }) {
  return (
    <div className="flex flex-col gap-3">
      {jobs.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No jobs yet. Use the <span className="font-medium text-foreground">+ New Job</span> button
          above.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {jobs.map((job) => (
            <li key={job.id} className="flex flex-col gap-1 rounded-md border p-2 text-sm">
              <div className="flex items-center justify-between gap-2">
                <Link
                  href={`/jobs/${job.id}`}
                  className="flex items-center gap-1.5 font-medium hover:underline"
                >
                  {job.jobNumber}
                  {job.emergency ? (
                    <AlertTriangle
                      className="size-3.5 shrink-0 text-destructive"
                      aria-hidden="true"
                    />
                  ) : null}
                </Link>
                <JobStatusBadge status={job.status} />
              </div>
              <p className="truncate text-muted-foreground">
                {job.issueDescription ?? "No description"} · {formatScheduleSummary(job)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
