import Link from "next/link";
import { getDb } from "@/lib/db/client";
import { getCallRailReport } from "@/lib/reports/callrail-report";
import {
  resolveReportDateRange,
  type ReportSearchParams,
} from "@/lib/reports/resolve-range-from-search-params";
import { listPublishedServiceAreas } from "@/lib/website/service-areas";
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

const DATE_FMT = new Intl.DateTimeFormat("en-CA", { dateStyle: "medium", timeStyle: "short" });

function formatDuration(seconds: number | null): string {
  if (seconds === null) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default async function CallRailReportPage({
  searchParams,
}: {
  searchParams: Promise<
    ReportSearchParams & { serviceAreaId?: string; matched?: string; answered?: string }
  >;
}) {
  const params = await searchParams;
  const dateRange = resolveReportDateRange(params);
  const db = getDb();

  const [report, serviceAreas] = await Promise.all([
    getCallRailReport(db, {
      dateRange,
      serviceAreaId: params.serviceAreaId || undefined,
      matched:
        params.matched === "matched" || params.matched === "unknown" ? params.matched : undefined,
      answered:
        params.answered === "answered" || params.answered === "missed"
          ? params.answered
          : undefined,
    }),
    listPublishedServiceAreas(db),
  ]);

  const exportQuery = new URLSearchParams();
  exportQuery.set("range", params.range ?? "this_month");
  if (params.start) exportQuery.set("start", params.start);
  if (params.end) exportQuery.set("end", params.end);
  if (params.serviceAreaId) exportQuery.set("serviceAreaId", params.serviceAreaId);
  if (params.matched) exportQuery.set("matched", params.matched);
  if (params.answered) exportQuery.set("answered", params.answered);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Reports</h1>
      </div>
      <ReportNav active="/reports/callrail" />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <DateRangeFilter basePath="/reports/callrail" />
          <QuerySelectFilter
            basePath="/reports/callrail"
            paramKey="serviceAreaId"
            allLabel="All service areas"
            options={serviceAreas.map((a) => ({ value: a.id, label: a.name }))}
          />
          <QuerySelectFilter
            basePath="/reports/callrail"
            paramKey="matched"
            allLabel="Matched + unknown"
            options={[
              { value: "matched", label: "Matched only" },
              { value: "unknown", label: "Unknown only" },
            ]}
          />
          <QuerySelectFilter
            basePath="/reports/callrail"
            paramKey="answered"
            allLabel="Answered + missed"
            options={[
              { value: "answered", label: "Answered only" },
              { value: "missed", label: "Missed only" },
            ]}
          />
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href={`/api/reports/callrail/csv?${exportQuery.toString()}`}>Export CSV</Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <SummaryCard label="Total Calls" value={String(report.totalCalls)} />
        <SummaryCard label="Answered" value={String(report.answeredCount)} />
        <SummaryCard label="Missed" value={String(report.missedCount)} />
        <SummaryCard label="Matched" value={String(report.matchedCount)} />
        <SummaryCard label="Unknown Caller" value={String(report.unknownCount)} />
        <SummaryCard label="Avg. Duration" value={formatDuration(report.averageDurationSeconds)} />
        <SummaryCard label="Texts" value={String(report.messageCount)} />
      </div>

      {report.rows.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
          No calls match this date range and filters.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Caller</TableHead>
                <TableHead>Service Area</TableHead>
                <TableHead>Matched</TableHead>
                <TableHead>Answered</TableHead>
                <TableHead>Duration</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {report.rows.map((row) => (
                <TableRow key={row.callId}>
                  <TableCell>
                    <Link href={`/calls/${row.callId}`} className="font-medium hover:underline">
                      {DATE_FMT.format(row.occurredAt)}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{row.callerNumber}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {row.serviceAreaName ?? "—"}
                  </TableCell>
                  <TableCell>
                    {row.matched ? (
                      <Badge variant="secondary">Matched</Badge>
                    ) : (
                      <Badge variant="outline">Unknown</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {row.answered ? "Yes" : "No"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDuration(row.durationSeconds)}
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
