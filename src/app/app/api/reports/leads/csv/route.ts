import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";
import { requireUser } from "@/lib/auth/require-user";
import { getLeadsReport } from "@/lib/reports/leads-report";
import { resolveReportDateRange } from "@/lib/reports/resolve-range-from-search-params";
import { rowsToCsv } from "@/lib/reports/csv";

export async function GET(request: Request) {
  await requireUser();
  const url = new URL(request.url);
  const params = Object.fromEntries(url.searchParams);
  const dateRange = resolveReportDateRange(params);

  const db = getDb();
  const report = await getLeadsReport(db, {
    dateRange,
    status: params.status || undefined,
    source: params.source || undefined,
  });

  const csv = rowsToCsv(report.rows, [
    { header: "Date", value: (r) => r.createdAt.toISOString().slice(0, 10) },
    { header: "Status", value: (r) => r.status },
    { header: "Source", value: (r) => r.originalSource ?? "" },
    { header: "Emergency", value: (r) => (r.emergency ? "Yes" : "No") },
    {
      header: "Converted",
      value: (r) => (r.convertedAt ? r.convertedAt.toISOString().slice(0, 10) : ""),
    },
  ]);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="leads-report.csv"`,
    },
  });
}
