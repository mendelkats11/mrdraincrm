import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { getDb } from "@/lib/db/client";
import { listJobs } from "@/lib/jobs/jobs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { JobFilters } from "./job-filters";
import { StatusBadge } from "./status-badge";

const PAGE_SIZE = 25;

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<{
    search?: string;
    status?: string;
    emergency?: string;
    page?: string;
  }>;
}) {
  const params = await searchParams;
  const db = getDb();

  const { rows, total } = await listJobs(db, {
    search: params.search,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    status: params.status as any,
    emergencyOnly: params.emergency === "1",
    page: params.page ? Number(params.page) : 1,
    pageSize: PAGE_SIZE,
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">Jobs</h1>
        <Button asChild>
          <Link href="/jobs/new">+ New Job</Link>
        </Button>
      </div>

      <JobFilters />

      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
          No jobs yet.
          <br />
          Use the <span className="font-medium text-foreground">+ New Job</span> button above to add
          one.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Job #</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Property</TableHead>
                <TableHead>Issue</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Added</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((job) => (
                <TableRow key={job.id}>
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
                  <TableCell className="max-w-xs truncate text-muted-foreground">
                    {job.issueDescription ?? "—"}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={job.status} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Intl.DateTimeFormat("en-CA", { dateStyle: "medium" }).format(
                      job.createdAt,
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {total > PAGE_SIZE ? (
        <p className="text-sm text-muted-foreground">
          Showing {rows.length} of {total}
        </p>
      ) : null}
    </div>
  );
}
