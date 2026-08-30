import Link from "next/link";
import type { ContractorJobRow } from "@/lib/contractors/assignments";
import { formatCents } from "@/lib/money";
import { BUSINESS_TIMEZONE } from "@/lib/reminders/timezone";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge as JobStatusBadge } from "../../jobs/status-badge";
import type { JobStatus } from "@/lib/jobs/jobs";

const ASSIGNMENT_STATUS_LABELS: Record<string, string> = {
  assigned: "Assigned",
  completed: "Completed",
  payout_pending: "Payout Pending",
  paid: "Paid",
};

// Same semantic intent as jobs/status-badge.tsx and invoice-status-badge.tsx
// — an in-progress payout reads as a warning (needs action), a completed
// payout as success, everything else neutral.
const ASSIGNMENT_STATUS_VARIANTS: Record<string, BadgeProps["variant"]> = {
  assigned: "info",
  completed: "info",
  payout_pending: "warning",
  paid: "success",
};

const DATE_FMT = new Intl.DateTimeFormat("en-CA", {
  dateStyle: "medium",
  timeZone: BUSINESS_TIMEZONE,
});

export function PayoutHistory({ jobs }: { jobs: ContractorJobRow[] }) {
  if (jobs.length === 0) {
    return <p className="text-sm text-muted-foreground">No jobs yet.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Job</TableHead>
            <TableHead>Job Status</TableHead>
            <TableHead>Payout Status</TableHead>
            <TableHead>Payout Amount</TableHead>
            <TableHead>Assigned</TableHead>
            <TableHead>Paid</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {jobs.map((job) => (
            <TableRow key={job.jobId}>
              <TableCell>
                <Link href={`/jobs/${job.jobId}`} className="font-medium hover:underline">
                  {job.jobNumber}
                </Link>
              </TableCell>
              <TableCell>
                <JobStatusBadge status={job.jobStatus as JobStatus} />
              </TableCell>
              <TableCell>
                <Badge variant={ASSIGNMENT_STATUS_VARIANTS[job.assignmentStatus] ?? "outline"}>
                  {ASSIGNMENT_STATUS_LABELS[job.assignmentStatus] ?? job.assignmentStatus}
                </Badge>
              </TableCell>
              <TableCell>{formatCents(job.contractorPayoutCents)}</TableCell>
              <TableCell className="text-muted-foreground">
                {DATE_FMT.format(job.assignedAt)}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {job.paidAt ? DATE_FMT.format(job.paidAt) : "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
