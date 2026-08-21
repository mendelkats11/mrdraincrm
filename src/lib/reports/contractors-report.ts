import { and, gte, inArray, lt } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { contractors, jobContractorAssignments, jobCustomCharges, jobs } from "@/lib/db/schema";
import { getIncludeTaxInRevenue } from "./reporting-settings";
import {
  calculateJobFinancials,
  sumJobFinancials,
  type JobFinancials,
} from "@/lib/financials/job-financials";
import type { DateRange } from "./date-ranges";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db<TQueryResult extends PgQueryResultHKT> = PgDatabase<TQueryResult, any, any>;

const COMPLETED_STAGE_STATUSES = new Set(["completed", "payout_pending", "paid"]);

export interface ContractorsReportFilters {
  dateRange: DateRange;
  contractorId?: string;
}

export interface ContractorReportRow {
  contractorId: string;
  contractorName: string;
  jobCount: number;
  jobsCompleted: number;
  totalJobValueCents: number;
  totalPayoutCents: number;
  totalPaidCents: number;
  outstandingPayoutCents: number;
}

export interface ContractorsReportResult {
  rows: ContractorReportRow[];
  totals: {
    jobCount: number;
    jobsCompleted: number;
    totalJobValueCents: number;
    totalPayoutCents: number;
    totalPaidCents: number;
    outstandingPayoutCents: number;
  };
}

/**
 * Per-contractor rollup, scoped to jobs created within the date range whose
 * *current* assignment (globally latest assignedAt row for that job) is to
 * that contractor — mirrors getContractorStats' semantics (src/lib/
 * contractors/assignments.ts) but computed once across every contractor
 * instead of per-contractor, and date-scoped for reporting.
 */
export async function getContractorsReport<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  filters: ContractorsReportFilters,
): Promise<ContractorsReportResult> {
  const jobRows = await db
    .select({
      id: jobs.id,
      jobAmountCents: jobs.jobAmountCents,
      taxAmountCents: jobs.taxAmountCents,
      materialsCents: jobs.materialsCents,
      contractorPayoutCents: jobs.contractorPayoutCents,
    })
    .from(jobs)
    .where(
      and(gte(jobs.createdAt, filters.dateRange.start), lt(jobs.createdAt, filters.dateRange.end)),
    );

  if (jobRows.length === 0) return { rows: [], totals: emptyTotals() };

  const jobIds = jobRows.map((j) => j.id);

  const [chargeRows, assignmentRows, contractorRows] = await Promise.all([
    db
      .select({ jobId: jobCustomCharges.jobId, amountCents: jobCustomCharges.amountCents })
      .from(jobCustomCharges)
      .where(inArray(jobCustomCharges.jobId, jobIds)),
    db
      .select({
        jobId: jobContractorAssignments.jobId,
        contractorId: jobContractorAssignments.contractorId,
        status: jobContractorAssignments.status,
        assignedAt: jobContractorAssignments.assignedAt,
      })
      .from(jobContractorAssignments)
      .where(inArray(jobContractorAssignments.jobId, jobIds)),
    db.select({ id: contractors.id, name: contractors.name }).from(contractors),
  ]);

  const includeTaxInRevenue = await getIncludeTaxInRevenue(db);
  const contractorNameById = new Map(contractorRows.map((c) => [c.id, c.name]));

  const chargesByJob = new Map<string, number>();
  for (const charge of chargeRows) {
    chargesByJob.set(charge.jobId, (chargesByJob.get(charge.jobId) ?? 0) + charge.amountCents);
  }

  const latestAssignmentByJob = new Map<string, (typeof assignmentRows)[number]>();
  for (const row of assignmentRows) {
    const existing = latestAssignmentByJob.get(row.jobId);
    if (!existing || row.assignedAt > existing.assignedAt)
      latestAssignmentByJob.set(row.jobId, row);
  }

  const financialsByJob = new Map<string, JobFinancials>();
  for (const job of jobRows) {
    financialsByJob.set(
      job.id,
      calculateJobFinancials(
        {
          jobAmountCents: job.jobAmountCents,
          taxAmountCents: job.taxAmountCents,
          customChargesCents: chargesByJob.get(job.id) ?? 0,
          materialsCents: job.materialsCents,
          contractorPayoutCents: job.contractorPayoutCents,
        },
        includeTaxInRevenue,
      ),
    );
  }

  const byContractor = new Map<
    string,
    {
      jobCount: number;
      jobsCompleted: number;
      financials: JobFinancials[];
      payoutCents: number;
      paidCents: number;
    }
  >();

  for (const job of jobRows) {
    const assignment = latestAssignmentByJob.get(job.id);
    if (!assignment || assignment.status === "unassigned") continue;
    if (filters.contractorId && assignment.contractorId !== filters.contractorId) continue;

    const entry = byContractor.get(assignment.contractorId) ?? {
      jobCount: 0,
      jobsCompleted: 0,
      financials: [],
      payoutCents: 0,
      paidCents: 0,
    };
    entry.jobCount += 1;
    if (COMPLETED_STAGE_STATUSES.has(assignment.status)) entry.jobsCompleted += 1;
    entry.financials.push(financialsByJob.get(job.id)!);
    entry.payoutCents += job.contractorPayoutCents;
    if (assignment.status === "paid") entry.paidCents += job.contractorPayoutCents;
    byContractor.set(assignment.contractorId, entry);
  }

  const rows: ContractorReportRow[] = [...byContractor.entries()]
    .map(([contractorId, entry]) => {
      const totalJobValueCents = sumJobFinancials(entry.financials).customerTotalCents;
      return {
        contractorId,
        contractorName: contractorNameById.get(contractorId) ?? "Unknown contractor",
        jobCount: entry.jobCount,
        jobsCompleted: entry.jobsCompleted,
        totalJobValueCents,
        totalPayoutCents: entry.payoutCents,
        totalPaidCents: entry.paidCents,
        outstandingPayoutCents: entry.payoutCents - entry.paidCents,
      };
    })
    .sort((a, b) => b.totalJobValueCents - a.totalJobValueCents);

  const totals = rows.reduce(
    (acc, r) => ({
      jobCount: acc.jobCount + r.jobCount,
      jobsCompleted: acc.jobsCompleted + r.jobsCompleted,
      totalJobValueCents: acc.totalJobValueCents + r.totalJobValueCents,
      totalPayoutCents: acc.totalPayoutCents + r.totalPayoutCents,
      totalPaidCents: acc.totalPaidCents + r.totalPaidCents,
      outstandingPayoutCents: acc.outstandingPayoutCents + r.outstandingPayoutCents,
    }),
    emptyTotals(),
  );

  return { rows, totals };
}

function emptyTotals() {
  return {
    jobCount: 0,
    jobsCompleted: 0,
    totalJobValueCents: 0,
    totalPayoutCents: 0,
    totalPaidCents: 0,
    outstandingPayoutCents: 0,
  };
}
