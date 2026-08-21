import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";
import { requireUser } from "@/lib/auth/require-user";
import { getJobsReport } from "@/lib/reports/jobs-report";
import { resolveReportDateRange } from "@/lib/reports/resolve-range-from-search-params";
import { rowsToCsv } from "@/lib/reports/csv";

export async function GET(request: Request) {
  await requireUser();
  const url = new URL(request.url);
  const params = Object.fromEntries(url.searchParams);
  const dateRange = resolveReportDateRange(params);

  const db = getDb();
  const report = await getJobsReport(db, {
    dateRange,
    serviceId: params.serviceId || undefined,
    contractorId: params.contractorId || undefined,
    status: params.status || undefined,
  });

  const csv = rowsToCsv(report.rows, [
    { header: "Job #", value: (r) => r.jobNumber },
    { header: "Date", value: (r) => r.createdAt.toISOString().slice(0, 10) },
    { header: "Status", value: (r) => r.status },
    { header: "Emergency", value: (r) => (r.emergency ? "Yes" : "No") },
    { header: "Service", value: (r) => r.serviceName ?? "" },
    { header: "Contractor", value: (r) => r.contractorName ?? "" },
  ]);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="jobs-report.csv"`,
    },
  });
}
