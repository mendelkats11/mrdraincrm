import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { getDb } from "@/lib/db/client";
import { requireUser } from "@/lib/auth/require-user";
import { getFinancialReport } from "@/lib/reports/financial-report";
import { resolveReportDateRange } from "@/lib/reports/resolve-range-from-search-params";
import { isDateRangePreset, DATE_RANGE_PRESET_LABELS } from "@/lib/reports/date-ranges";
import { FinancialReportPdfDocument } from "@/lib/pdf/financial-report-pdf";
import type { JobStatus } from "@/lib/jobs/jobs";

export async function GET(request: Request) {
  await requireUser();
  const url = new URL(request.url);
  const params = Object.fromEntries(url.searchParams);
  const dateRange = resolveReportDateRange(params);
  const dateRangeLabel =
    params.range && isDateRangePreset(params.range)
      ? DATE_RANGE_PRESET_LABELS[params.range]
      : "This month";

  const db = getDb();
  const report = await getFinancialReport(db, {
    dateRange,
    serviceId: params.serviceId || undefined,
    contractorId: params.contractorId || undefined,
    statuses: params.status ? [params.status as JobStatus] : undefined,
  });

  const buffer = await renderToBuffer(
    <FinancialReportPdfDocument
      data={{
        dateRangeLabel,
        generatedAt: new Date(),
        totals: report.totals,
        jobCount: report.jobCount,
        byService: report.byService,
        byMonth: report.byMonth,
      }}
    />,
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="financial-report.pdf"`,
    },
  });
}
