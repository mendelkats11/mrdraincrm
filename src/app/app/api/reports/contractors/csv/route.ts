import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";
import { requireUser } from "@/lib/auth/require-user";
import { getContractorsReport } from "@/lib/reports/contractors-report";
import { resolveReportDateRange } from "@/lib/reports/resolve-range-from-search-params";
import { rowsToCsv } from "@/lib/reports/csv";
import { formatCents } from "@/lib/money";

export async function GET(request: Request) {
  await requireUser();
  const url = new URL(request.url);
  const params = Object.fromEntries(url.searchParams);
  const dateRange = resolveReportDateRange(params);

  const db = getDb();
  const report = await getContractorsReport(db, {
    dateRange,
    contractorId: params.contractorId || undefined,
  });

  const csv = rowsToCsv(report.rows, [
    { header: "Contractor", value: (r) => r.contractorName },
    { header: "Jobs", value: (r) => r.jobCount },
    { header: "Completed", value: (r) => r.jobsCompleted },
    { header: "Job Value", value: (r) => formatCents(r.totalJobValueCents) },
    { header: "Payout", value: (r) => formatCents(r.totalPayoutCents) },
    { header: "Paid", value: (r) => formatCents(r.totalPaidCents) },
    { header: "Outstanding", value: (r) => formatCents(r.outstandingPayoutCents) },
  ]);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="contractors-report.csv"`,
    },
  });
}
