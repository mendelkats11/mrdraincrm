import { and, desc, eq, gte, inArray, isNull, lt, ne, sql } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { invoices, jobContractorAssignments, jobs, leads, payments } from "@/lib/db/schema";
import { listRecentActivity, type TimelineEntry } from "@/lib/audit/activity";
import {
  BUSINESS_TIMEZONE,
  addBusinessDays,
  businessDateString,
  startOfBusinessDay,
} from "@/lib/reminders/timezone";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db<TQueryResult extends PgQueryResultHKT> = PgDatabase<TQueryResult, any, any>;

const ACTIVE_JOB_STATUSES = ["open", "scheduled", "in_progress"] as const;

export interface TodaysJobRow {
  id: string;
  jobNumber: string;
  issueDescription: string | null;
  scheduledStart: Date;
  timeTbd: boolean;
  status: string;
}

export interface EmergencyJobRow {
  id: string;
  jobNumber: string;
  issueDescription: string | null;
  status: string;
  createdAt: Date;
}

export interface OperationsWidgetData {
  newLeadsCount: number;
  openJobsCount: number;
  todaysJobs: TodaysJobRow[];
  emergencyJobs: EmergencyJobRow[];
  outstandingInvoices: { count: number; totalCents: number };
  contractorPayoutsPending: { count: number; totalCents: number };
  recentActivity: TimelineEntry[];
}

/**
 * Everything the Operations dashboard tab needs (docs/PROJECT_SPEC.md §21),
 * as one batch of small independent queries — each individually cheap for a
 * small business's realistic data volume, run in parallel rather than
 * combined into one mega-query, so any single widget's shape can change
 * without touching the others.
 */
export async function getOperationsWidgetData<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  now: Date = new Date(),
): Promise<OperationsWidgetData> {
  const todayStr = businessDateString(now, BUSINESS_TIMEZONE);
  const todayStart = startOfBusinessDay(todayStr, BUSINESS_TIMEZONE);
  const todayEnd = startOfBusinessDay(addBusinessDays(todayStr, 1), BUSINESS_TIMEZONE);

  const [
    [{ count: newLeadsCount }],
    [{ count: openJobsCount }],
    todaysJobs,
    emergencyJobs,
    invoiceBalanceRows,
    assignmentRows,
    recentActivity,
  ] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(leads)
      .where(eq(leads.status, "new")),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(jobs)
      .where(eq(jobs.status, "open")),
    db
      .select({
        id: jobs.id,
        jobNumber: jobs.jobNumber,
        issueDescription: jobs.issueDescription,
        scheduledStart: jobs.scheduledStart,
        timeTbd: jobs.timeTbd,
        status: jobs.status,
      })
      .from(jobs)
      .where(
        and(
          gte(jobs.scheduledStart, todayStart),
          lt(jobs.scheduledStart, todayEnd),
          ne(jobs.status, "cancelled"),
        ),
      )
      .orderBy(jobs.scheduledStart),
    db
      .select({
        id: jobs.id,
        jobNumber: jobs.jobNumber,
        issueDescription: jobs.issueDescription,
        status: jobs.status,
        createdAt: jobs.createdAt,
      })
      .from(jobs)
      .where(and(eq(jobs.emergency, true), inArray(jobs.status, ACTIVE_JOB_STATUSES)))
      .orderBy(desc(jobs.createdAt)),
    db
      .select({
        totalCents: invoices.totalCents,
        paidCents: sql<number>`coalesce(sum(${payments.amountCents}), 0)`,
      })
      .from(invoices)
      .leftJoin(payments, and(eq(payments.invoiceId, invoices.id), isNull(payments.voidedAt)))
      .where(inArray(invoices.status, ["sent", "partially_paid"]))
      .groupBy(invoices.id, invoices.totalCents),
    // All assignment rows, latest-per-job resolved in JS below — mirrors
    // getContractorStats' semantics (src/lib/contractors/assignments.ts):
    // only each job's *current* (latest-assigned) row counts, so an old,
    // since-superseded "payout_pending" row is never double-counted or
    // left dangling after a reassignment.
    db
      .select({
        jobId: jobContractorAssignments.jobId,
        status: jobContractorAssignments.status,
        assignedAt: jobContractorAssignments.assignedAt,
      })
      .from(jobContractorAssignments),
    listRecentActivity(db, 10),
  ]);

  const outstandingInvoices = invoiceBalanceRows.reduce(
    (acc, row) => {
      const balance = row.totalCents - Number(row.paidCents);
      if (balance <= 0) return acc;
      return { count: acc.count + 1, totalCents: acc.totalCents + balance };
    },
    { count: 0, totalCents: 0 },
  );

  const latestAssignmentByJob = new Map<string, (typeof assignmentRows)[number]>();
  for (const row of assignmentRows) {
    const existing = latestAssignmentByJob.get(row.jobId);
    if (!existing || row.assignedAt > existing.assignedAt)
      latestAssignmentByJob.set(row.jobId, row);
  }
  const payoutPendingJobIds = [...latestAssignmentByJob.entries()]
    .filter(([, row]) => row.status === "payout_pending")
    .map(([jobId]) => jobId);

  const contractorPayoutsPending = { count: 0, totalCents: 0 };
  if (payoutPendingJobIds.length > 0) {
    const payoutRows = await db
      .select({ contractorPayoutCents: jobs.contractorPayoutCents })
      .from(jobs)
      .where(inArray(jobs.id, payoutPendingJobIds));
    contractorPayoutsPending.count = payoutRows.length;
    contractorPayoutsPending.totalCents = payoutRows.reduce(
      (sum, row) => sum + row.contractorPayoutCents,
      0,
    );
  }

  return {
    newLeadsCount,
    openJobsCount,
    todaysJobs: todaysJobs
      .filter((j) => j.scheduledStart !== null)
      .map((j) => ({ ...j, scheduledStart: j.scheduledStart! })),
    emergencyJobs,
    outstandingInvoices,
    contractorPayoutsPending,
    recentActivity,
  };
}
