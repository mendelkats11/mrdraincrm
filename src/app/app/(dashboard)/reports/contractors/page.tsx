import Link from "next/link";
import { getDb } from "@/lib/db/client";
import { getContractorsReport } from "@/lib/reports/contractors-report";
import {
  resolveReportDateRange,
  type ReportSearchParams,
} from "@/lib/reports/resolve-range-from-search-params";
import { listContractors } from "@/lib/contractors/contractors";
import { formatCents } from "@/lib/money";
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

export default async function ContractorsReportPage({
  searchParams,
}: {
  searchParams: Promise<ReportSearchParams & { contractorId?: string }>;
}) {
  const params = await searchParams;
  const dateRange = resolveReportDateRange(params);
  const db = getDb();

  const [report, contractors] = await Promise.all([
    getContractorsReport(db, { dateRange, contractorId: params.contractorId || undefined }),
    listContractors(db, { status: "all", pageSize: 500 }),
  ]);

  const exportQuery = new URLSearchParams();
  exportQuery.set("range", params.range ?? "this_month");
  if (params.start) exportQuery.set("start", params.start);
  if (params.end) exportQuery.set("end", params.end);
  if (params.contractorId) exportQuery.set("contractorId", params.contractorId);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Reports</h1>
      </div>
      <ReportNav active="/reports/contractors" />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <DateRangeFilter basePath="/reports/contractors" />
          <QuerySelectFilter
            basePath="/reports/contractors"
            paramKey="contractorId"
            allLabel="All contractors"
            options={contractors.rows.map((c) => ({ value: c.id, label: c.name }))}
          />
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href={`/api/reports/contractors/csv?${exportQuery.toString()}`}>Export CSV</Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard label="Jobs" value={String(report.totals.jobCount)} />
        <SummaryCard label="Total Payout" value={formatCents(report.totals.totalPayoutCents)} />
        <SummaryCard label="Total Paid" value={formatCents(report.totals.totalPaidCents)} />
        <SummaryCard
          label="Outstanding"
          value={formatCents(report.totals.outstandingPayoutCents)}
        />
      </div>

      {report.rows.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
          No contractor-assigned jobs in this date range.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contractor</TableHead>
                <TableHead className="text-right">Jobs</TableHead>
                <TableHead className="text-right">Completed</TableHead>
                <TableHead className="text-right">Job Value</TableHead>
                <TableHead className="text-right">Payout</TableHead>
                <TableHead className="text-right">Paid</TableHead>
                <TableHead className="text-right">Outstanding</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {report.rows.map((row) => (
                <TableRow key={row.contractorId}>
                  <TableCell>
                    <Link
                      href={`/contractors/${row.contractorId}`}
                      className="font-medium hover:underline"
                    >
                      {row.contractorName}
                    </Link>
                  </TableCell>
                  <TableCell className="text-right">{row.jobCount}</TableCell>
                  <TableCell className="text-right">{row.jobsCompleted}</TableCell>
                  <TableCell className="text-right">
                    {formatCents(row.totalJobValueCents)}
                  </TableCell>
                  <TableCell className="text-right">{formatCents(row.totalPayoutCents)}</TableCell>
                  <TableCell className="text-right">{formatCents(row.totalPaidCents)}</TableCell>
                  <TableCell className="text-right">
                    {formatCents(row.outstandingPayoutCents)}
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
