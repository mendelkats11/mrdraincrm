import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatScheduleSummary } from "@/lib/schedule/format";
import { StatusBadge } from "../jobs/status-badge";
import type { ScheduledJobWithContractor } from "./schedule-job-row";

export function ListView({ jobs }: { jobs: ScheduledJobWithContractor[] }) {
  if (jobs.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
        No jobs scheduled in this range.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date / Time</TableHead>
            <TableHead>Job</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead>Property</TableHead>
            <TableHead>Contractor</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {jobs.map((job) => (
            <TableRow key={job.id}>
              <TableCell className="whitespace-nowrap text-muted-foreground">
                {formatScheduleSummary(job)}
              </TableCell>
              <TableCell>
                <Link href={`/jobs/${job.id}`} className="font-medium hover:underline">
                  {job.jobNumber}
                </Link>
                {job.emergency ? (
                  <Badge variant="destructive" className="ml-2">
                    <AlertTriangle /> Emergency
                  </Badge>
                ) : null}
              </TableCell>
              <TableCell className="text-muted-foreground">{job.contactName ?? "—"}</TableCell>
              <TableCell className="text-muted-foreground">
                {job.propertyAddressLine1 ?? "—"}
              </TableCell>
              <TableCell className="text-muted-foreground">{job.contractorName ?? "—"}</TableCell>
              <TableCell>
                <StatusBadge status={job.status} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
