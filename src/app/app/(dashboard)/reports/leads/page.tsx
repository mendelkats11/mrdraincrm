import Link from "next/link";
import { getDb } from "@/lib/db/client";
import { getLeadsReport } from "@/lib/reports/leads-report";
import {
  resolveReportDateRange,
  type ReportSearchParams,
} from "@/lib/reports/resolve-range-from-search-params";
import { formatBasisPointsAsPercent } from "@/lib/financials/job-financials";
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
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "quoted", label: "Quoted" },
  { value: "follow_up", label: "Follow Up" },
  { value: "won", label: "Won" },
  { value: "lost", label: "Lost" },
];

const DATE_FMT = new Intl.DateTimeFormat("en-CA", { dateStyle: "medium" });

export default async function LeadsReportPage({
  searchParams,
}: {
  searchParams: Promise<ReportSearchParams & { status?: string; source?: string }>;
}) {
  const params = await searchParams;
  const dateRange = resolveReportDateRange(params);
  const db = getDb();

  const report = await getLeadsReport(db, {
    dateRange,
    status: params.status || undefined,
    source: params.source || undefined,
  });

  const exportQuery = new URLSearchParams();
  exportQuery.set("range", params.range ?? "this_month");
  if (params.start) exportQuery.set("start", params.start);
  if (params.end) exportQuery.set("end", params.end);
  if (params.status) exportQuery.set("status", params.status);
  if (params.source) exportQuery.set("source", params.source);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Reports</h1>
      </div>
      <ReportNav active="/reports/leads" />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <DateRangeFilter basePath="/reports/leads" />
          <QuerySelectFilter
            basePath="/reports/leads"
            paramKey="status"
            allLabel="All statuses"
            options={STATUS_OPTIONS}
          />
          <QuerySelectFilter
            basePath="/reports/leads"
            paramKey="source"
            allLabel="All sources"
            options={report.bySource.map((s) => ({ value: s.source, label: s.source }))}
          />
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href={`/api/reports/leads/csv?${exportQuery.toString()}`}>Export CSV</Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard label="Total Leads" value={String(report.totalCount)} />
        <SummaryCard label="Won" value={String(report.wonCount)} />
        <SummaryCard label="Lost" value={String(report.lostCount)} />
        <SummaryCard
          label="Conversion Rate"
          value={formatBasisPointsAsPercent(report.conversionRateBasisPoints)}
        />
      </div>

      {report.rows.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
          No leads match this date range and filters.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Emergency</TableHead>
                <TableHead>Converted</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {report.rows.map((row) => (
                <TableRow key={row.leadId}>
                  <TableCell>
                    <Link href={`/leads/${row.leadId}`} className="font-medium hover:underline">
                      {DATE_FMT.format(row.createdAt)}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{row.status}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {row.originalSource ?? "Unknown"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {row.emergency ? "Yes" : "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {row.convertedAt ? DATE_FMT.format(row.convertedAt) : "—"}
                  </TableCell>
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
