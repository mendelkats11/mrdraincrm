import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { getDb } from "@/lib/db/client";
import { getJobsReport } from "@/lib/reports/jobs-report";
import {
  resolveReportDateRange,
  type ReportSearchParams,
} from "@/lib/reports/resolve-range-from-search-params";
import { listServicesForAdmin } from "@/lib/website/services";
import { listContractors } from "@/lib/contractors/contractors";
import { BUSINESS_TIMEZONE } from "@/lib/reminders/timezone";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ReportNav } from "../report-nav";
import { DateRangeFilter } from "../date-range-filter";
import { QuerySelectFilter } from "../query-select-filter";

const STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "open", label: "Open" },
  { value: "scheduled", label: "Scheduled" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const DATE_FMT = new Intl.DateTimeFormat("en-CA", {
  dateStyle: "medium",
  timeZone: BUSINESS_TIMEZONE,
});

export default async function JobsReportPage({
  searchParams,
}: {
  searchParams: Promise<
    ReportSearchParams & { serviceId?: string; contractorId?: string; status?: string }
  >;
}) {
  const params = await searchParams;
  const dateRange = resolveReportDateRange(params);
  const db = getDb();

  const [report, services, contractors] = await Promise.all([
    getJobsReport(db, {
      dateRange,
      serviceId: params.serviceId || undefined,
      contractorId: params.contractorId || undefined,
      status: params.status || undefined,
    }),
    listServicesForAdmin(db),
    listContractors(db, { status: "all", pageSize: 500 }),
  ]);

  const exportQuery = new URLSearchParams();
  exportQuery.set("range", params.range ?? "this_month");
  if (params.start) exportQuery.set("start", params.start);
  if (params.end) exportQuery.set("end", params.end);
  if (params.serviceId) exportQuery.set("serviceId", params.serviceId);
  if (params.contractorId) exportQuery.set("contractorId", params.contractorId);
  if (params.status) exportQuery.set("status", params.status);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Reports</h1>
      </div>
      <ReportNav active="/reports/jobs" />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <DateRangeFilter basePath="/reports/jobs" />
          <QuerySelectFilter
            basePath="/reports/jobs"
            paramKey="serviceId"
            allLabel="All services"
            options={services.map((s) => ({ value: s.id, label: s.name }))}
          />
          <QuerySelectFilter
            basePath="/reports/jobs"
            paramKey="contractorId"
            allLabel="All contractors"
            options={contractors.rows.map((c) => ({ value: c.id, label: c.name }))}
          />
          <QuerySelectFilter
            basePath="/reports/jobs"
            paramKey="status"
            allLabel="All statuses"
            options={STATUS_OPTIONS}
          />
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href={`/api/reports/jobs/csv?${exportQuery.toString()}`}>Export CSV</Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <SummaryCard label="Total Jobs" value={String(report.totalCount)} />
        <SummaryCard label="Emergencies" value={String(report.emergencyCount)} />
        <SummaryCard label="Statuses" value={String(report.byStatus.length)} />
      </div>

      {report.rows.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
          No jobs match this date range and filters.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Job #</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Contractor</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {report.rows.map((row) => (
                <TableRow key={row.jobId}>
                  <TableCell>
                    <Link href={`/jobs/${row.jobId}`} className="font-medium hover:underline">
                      {row.jobNumber}
                    </Link>
                    {row.emergency ? (
                      <Badge variant="destructive" className="ml-2">
                        <AlertTriangle /> Emergency
                      </Badge>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {DATE_FMT.format(row.createdAt)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{row.serviceName ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {row.contractorName ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{row.status}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent className="text-2xl font-semibold">{value}</CardContent>
    </Card>
  );
}
