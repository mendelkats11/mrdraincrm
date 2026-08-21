import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";
import { requireUser } from "@/lib/auth/require-user";
import { getCallRailReport } from "@/lib/reports/callrail-report";
import { resolveReportDateRange } from "@/lib/reports/resolve-range-from-search-params";
import { rowsToCsv } from "@/lib/reports/csv";

export async function GET(request: Request) {
  await requireUser();
  const url = new URL(request.url);
  const params = Object.fromEntries(url.searchParams);
  const dateRange = resolveReportDateRange(params);

  const db = getDb();
  const report = await getCallRailReport(db, {
    dateRange,
    serviceAreaId: params.serviceAreaId || undefined,
    matched:
      params.matched === "matched" || params.matched === "unknown" ? params.matched : undefined,
    answered:
      params.answered === "answered" || params.answered === "missed" ? params.answered : undefined,
  });

  const csv = rowsToCsv(report.rows, [
    { header: "When", value: (r) => r.occurredAt.toISOString() },
    { header: "Caller", value: (r) => r.callerNumber },
    { header: "Service Area", value: (r) => r.serviceAreaName ?? "" },
    { header: "Matched", value: (r) => (r.matched ? "Yes" : "No") },
    { header: "Answered", value: (r) => (r.answered ? "Yes" : "No") },
    { header: "Duration (s)", value: (r) => r.durationSeconds ?? "" },
  ]);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="callrail-report.csv"`,
    },
  });
}
