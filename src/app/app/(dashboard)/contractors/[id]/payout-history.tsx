import Link from "next/link";
import type { ContractorJobRow } from "@/lib/contractors/assignments";
import { formatCents } from "@/lib/money";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const ASSIGNMENT_STATUS_LABELS: Record<string, string> = {
  assigned: "Assigned",
  completed: "Completed",
  payout_pending: "Payout Pending",
  paid: "Paid",
};

const DATE_FMT = new Intl.DateTimeFormat("en-CA", { dateStyle: "medium" });

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
              <TableCell className="text-muted-foreground capitalize">
                {job.jobStatus.replace(/_/g, " ")}
              </TableCell>
              <TableCell>
                <Badge variant="outline">
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
