import { and, eq, gte, inArray, lt, sql } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { jobCustomCharges, jobs, services } from "@/lib/db/schema";
import { getCurrentAssignmentsForJobs } from "@/lib/contractors/assignments";
import {
  calculateJobFinancials,
  sumJobFinancials,
  type JobFinancials,
} from "@/lib/financials/job-financials";
import { getIncludeTaxInRevenue } from "./reporting-settings";
import { getZonedParts, BUSINESS_TIMEZONE } from "@/lib/reminders/timezone";
import type { JobStatus } from "@/lib/jobs/jobs";
import type { DateRange } from "./date-ranges";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db<TQueryResult extends PgQueryResultHKT> = PgDatabase<TQueryResult, any, any>;

/** Jobs that never became real, billable work — excluded by default from
 *  every financial view. The status filter can still opt back in
 *  explicitly (e.g. to audit cancelled jobs), per §22's "status" filter
 *  dimension. */
const DEFAULT_REVENUE_STATUSES: JobStatus[] = ["open", "scheduled", "in_progress", "completed"];

export interface FinancialReportFilters {
  dateRange: DateRange;
  serviceId?: string;
  contractorId?: string;
  statuses?: JobStatus[];
}

export interface FinancialReportRow {
  jobId: string;
  jobNumber: string;
  createdAt: Date;
  status: string;
  serviceName: string | null;
  contractorName: string | null;
  financials: JobFinancials;
}

export interface FinancialReportBreakdown {
  label: string;
  financials: JobFinancials;
  jobCount: number;
}

export interface FinancialReportResult {
  rows: FinancialReportRow[];
  totals: JobFinancials;
  jobCount: number;
  includeTaxInRevenue: boolean;
  byService: FinancialReportBreakdown[];
  byMonth: FinancialReportBreakdown[];
}

const monthFormatter = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "short",
  timeZone: BUSINESS_TIMEZONE,
});

export async function getFinancialReport<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  filters: FinancialReportFilters,
): Promise<FinancialReportResult> {
  const statuses =
    filters.statuses && filters.statuses.length > 0
      ? filters.statuses
      : [...DEFAULT_REVENUE_STATUSES];
  const includeTaxInRevenue = await getIncludeTaxInRevenue(db);

  const conditions = [
    gte(jobs.createdAt, filters.dateRange.start),
    lt(jobs.createdAt, filters.dateRange.end),
    inArray(jobs.status, statuses),
  ];
  if (filters.serviceId) conditions.push(eq(jobs.serviceId, filters.serviceId));

  const jobRows = await db
    .select({
      id: jobs.id,
      jobNumber: jobs.jobNumber,
      createdAt: jobs.createdAt,
      status: jobs.status,
      serviceId: jobs.serviceId,
      serviceName: services.name,
      jobAmountCents: jobs.jobAmountCents,
      taxAmountCents: jobs.taxAmountCents,
      materialsCents: jobs.materialsCents,
      contractorPayoutCents: jobs.contractorPayoutCents,
    })
    .from(jobs)
    .leftJoin(services, eq(jobs.serviceId, services.id))
    .where(and(...conditions));

  if (jobRows.length === 0) {
    return {
      rows: [],
      totals: sumJobFinancials([]),
      jobCount: 0,
      includeTaxInRevenue,
      byService: [],
      byMonth: [],
    };
  }

  const jobIds = jobRows.map((j) => j.id);

  const chargeRows = await db
    .select({
      jobId: jobCustomCharges.jobId,
      total: sql<number>`coalesce(sum(${jobCustomCharges.amountCents}), 0)`,
    })
    .from(jobCustomCharges)
    .where(inArray(jobCustomCharges.jobId, jobIds))
    .groupBy(jobCustomCharges.jobId);
  const chargesByJob = new Map(chargeRows.map((r) => [r.jobId, Number(r.total)]));

  const assignments = await getCurrentAssignmentsForJobs(db, jobIds);

  let rows: FinancialReportRow[] = jobRows.map((job) => {
    const financials = calculateJobFinancials(
      {
        jobAmountCents: job.jobAmountCents,
        taxAmountCents: job.taxAmountCents,
        customChargesCents: chargesByJob.get(job.id) ?? 0,
        materialsCents: job.materialsCents,
        contractorPayoutCents: job.contractorPayoutCents,
      },
      includeTaxInRevenue,
    );
    const assignment = assignments.get(job.id);
    return {
      jobId: job.id,
      jobNumber: job.jobNumber,
      createdAt: job.createdAt,
      status: job.status,
      serviceName: job.serviceName,
      contractorName: assignment?.contractorName ?? null,
      financials,
    };
  });

  if (filters.contractorId) {
    rows = rows.filter((r) => assignments.get(r.jobId)?.contractorId === filters.contractorId);
  }

  const totals = sumJobFinancials(rows.map((r) => r.financials));

  const byService = groupBy(rows, (r) => r.serviceName ?? "No service selected", "revenue");
  const byMonth = groupBy(
    rows,
    (r) => {
      const parts = getZonedParts(r.createdAt, BUSINESS_TIMEZONE);
      // Zero-padded numeric prefix sorts chronologically as a plain string;
      // stripped before display.
      return `${parts.year}-${String(parts.month).padStart(2, "0")}|${monthFormatter.format(new Date(Date.UTC(parts.year, parts.month - 1, 1)))}`;
    },
    "key",
  ).map((b) => ({ ...b, label: b.label.split("|")[1] }));

  return { rows, totals, jobCount: rows.length, includeTaxInRevenue, byService, byMonth };
}

function groupBy(
  rows: FinancialReportRow[],
  keyFn: (row: FinancialReportRow) => string,
  sortBy: "revenue" | "key",
): FinancialReportBreakdown[] {
  const groups = new Map<string, FinancialReportRow[]>();
  for (const row of rows) {
    const key = keyFn(row);
    const group = groups.get(key);
    if (group) group.push(row);
    else groups.set(key, [row]);
  }
  const result = [...groups.entries()].map(([label, groupRows]) => ({
    label,
    financials: sumJobFinancials(groupRows.map((r) => r.financials)),
    jobCount: groupRows.length,
  }));
  return sortBy === "revenue"
    ? result.sort((a, b) => b.financials.revenueCents - a.financials.revenueCents)
    : result.sort((a, b) => a.label.localeCompare(b.label));
}
