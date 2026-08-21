import Link from "next/link";
import { getDb } from "@/lib/db/client";
import { getFinancialReport } from "@/lib/reports/financial-report";
import {
  resolveReportDateRange,
  type ReportSearchParams,
} from "@/lib/reports/resolve-range-from-search-params";
import { listServicesForAdmin } from "@/lib/website/services";
import { listContractors } from "@/lib/contractors/contractors";
import { formatCents } from "@/lib/money";
import { formatBasisPointsAsPercent } from "@/lib/financials/job-financials";
import type { JobStatus } from "@/lib/jobs/jobs";
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
import { ReportingSettingsToggle } from "../reporting-settings-toggle";

const STATUS_OPTIONS = [
  { value: "open", label: "Open" },
  { value: "scheduled", label: "Scheduled" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "draft", label: "Draft" },
];

const DATE_FMT = new Intl.DateTimeFormat("en-CA", { dateStyle: "medium" });

export default async function FinancialReportPage({
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
    getFinancialReport(db, {
      dateRange,
      serviceId: params.serviceId || undefined,
      contractorId: params.contractorId || undefined,
      statuses: params.status ? [params.status as JobStatus] : undefined,
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
      <ReportNav active="/reports/financial" />

      <ReportingSettingsToggle includeTaxInRevenue={report.includeTaxInRevenue} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <DateRangeFilter basePath="/reports/financial" />
          <QuerySelectFilter
            basePath="/reports/financial"
            paramKey="serviceId"
            allLabel="All services"
            options={services.map((s) => ({ value: s.id, label: s.name }))}
          />
          <QuerySelectFilter
            basePath="/reports/financial"
            paramKey="contractorId"
            allLabel="All contractors"
            options={contractors.rows.map((c) => ({ value: c.id, label: c.name }))}
          />
          <QuerySelectFilter
            basePath="/reports/financial"
            paramKey="status"
            allLabel="Open/Scheduled/In Progress/Completed"
            options={STATUS_OPTIONS}
          />
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`/api/reports/financial/csv?${exportQuery.toString()}`}>Export CSV</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href={`/api/reports/financial/pdf?${exportQuery.toString()}`}>Export PDF</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard label="Revenue" value={formatCents(report.totals.revenueCents)} />
        <SummaryCard label="Total Costs" value={formatCents(report.totals.totalCostsCents)} />
        <SummaryCard label="Profit" value={formatCents(report.totals.profitCents)} />
        <SummaryCard
          label="Profit Margin"
          value={formatBasisPointsAsPercent(report.totals.profitMarginBasisPoints)}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <SummaryCard label="Customer Total" value={formatCents(report.totals.customerTotalCents)} />
        <SummaryCard label="Jobs" value={String(report.jobCount)} />
      </div>

      {report.byService.length > 0 ? (
        <BreakdownTable title="By Service" rows={report.byService} />
      ) : null}
      {report.byMonth.length > 0 ? <BreakdownTable title="By Month" rows={report.byMonth} /> : null}

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
                <TableHead className="text-right">Customer Total</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead className="text-right">Costs</TableHead>
                <TableHead className="text-right">Profit</TableHead>
                <TableHead className="text-right">Margin</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {report.rows.map((row) => (
                <TableRow key={row.jobId}>
                  <TableCell>
                    <Link href={`/jobs/${row.jobId}`} className="font-medium hover:underline">
                      {row.jobNumber}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {DATE_FMT.format(row.createdAt)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{row.serviceName ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {row.contractorName ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{row.status}</TableCell>
                  <TableCell className="text-right">
                    {formatCents(row.financials.customerTotalCents)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCents(row.financials.revenueCents)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCents(row.financials.totalCostsCents)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCents(row.financials.profitCents)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatBasisPointsAsPercent(row.financials.profitMarginBasisPoints)}
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

function BreakdownTable({
  title,
  rows,
}: {
  title: string;
  rows: {
    label: string;
    jobCount: number;
    financials: { revenueCents: number; profitCents: number };
  }[];
}) {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead
              colSpan={4}
              className="text-xs font-semibold uppercase text-muted-foreground"
            >
              {title}
            </TableHead>
          </TableRow>
          <TableRow>
            <TableHead></TableHead>
            <TableHead className="text-right">Jobs</TableHead>
            <TableHead className="text-right">Revenue</TableHead>
            <TableHead className="text-right">Profit</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.label}>
              <TableCell>{row.label}</TableCell>
              <TableCell className="text-right">{row.jobCount}</TableCell>
              <TableCell className="text-right">
                {formatCents(row.financials.revenueCents)}
              </TableCell>
              <TableCell className="text-right">
                {formatCents(row.financials.profitCents)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
