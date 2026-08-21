import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";
import { requireUser } from "@/lib/auth/require-user";
import { getFinancialReport } from "@/lib/reports/financial-report";
import { resolveReportDateRange } from "@/lib/reports/resolve-range-from-search-params";
import { rowsToCsv } from "@/lib/reports/csv";
import { formatCents } from "@/lib/money";
import { formatBasisPointsAsPercent } from "@/lib/financials/job-financials";
import type { JobStatus } from "@/lib/jobs/jobs";

export async function GET(request: Request) {
  await requireUser();
  const url = new URL(request.url);
  const params = Object.fromEntries(url.searchParams);
  const dateRange = resolveReportDateRange(params);

  const db = getDb();
  const report = await getFinancialReport(db, {
    dateRange,
    serviceId: params.serviceId || undefined,
    contractorId: params.contractorId || undefined,
    statuses: params.status ? [params.status as JobStatus] : undefined,
  });

  const csv = rowsToCsv(report.rows, [
    { header: "Job #", value: (r) => r.jobNumber },
    { header: "Date", value: (r) => r.createdAt.toISOString().slice(0, 10) },
    { header: "Status", value: (r) => r.status },
    { header: "Service", value: (r) => r.serviceName ?? "" },
    { header: "Contractor", value: (r) => r.contractorName ?? "" },
    { header: "Customer Total", value: (r) => formatCents(r.financials.customerTotalCents) },
    { header: "Revenue", value: (r) => formatCents(r.financials.revenueCents) },
    { header: "Total Costs", value: (r) => formatCents(r.financials.totalCostsCents) },
    { header: "Profit", value: (r) => formatCents(r.financials.profitCents) },
    {
      header: "Margin",
      value: (r) => formatBasisPointsAsPercent(r.financials.profitMarginBasisPoints),
    },
  ]);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="financial-report.csv"`,
    },
  });
}
