import { and, eq, gte, inArray, isNull, lt, sql } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { invoices, jobs, payments } from "@/lib/db/schema";
import type { DateRange } from "@/lib/reports/date-ranges";
import type { JobStatus } from "@/lib/jobs/jobs";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db<TQueryResult extends PgQueryResultHKT> = PgDatabase<TQueryResult, any, any>;

const REVENUE_STATUSES: JobStatus[] = ["open", "scheduled", "in_progress", "completed"];

export interface FinancialWidgetExtras {
  materialsCents: number;
  contractorPayoutCents: number;
  outstandingCents: number;
}

/**
 * The Financial dashboard tab (docs/PROJECT_SPEC.md §21) needs Materials,
 * Contractor Payouts, and Outstanding as their own numbers alongside
 * Revenue/Profit/Margin/trend/breakdowns — all of which already come from
 * src/lib/reports/financial-report.ts's getFinancialReport. Rather than
 * widen that report's JobFinancials shape (used by the already-shipped
 * Reports phase) just for these three extra cards, this is a small,
 * separate, identically-scoped (same date range + status set) query.
 * "Outstanding" is scoped to invoices belonging to a job created in this
 * date range, so it moves in step with the rest of the tab rather than
 * showing an all-time figure.
 */
export async function getFinancialWidgetExtras<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  dateRange: DateRange,
): Promise<FinancialWidgetExtras> {
  const jobRows = await db
    .select({
      id: jobs.id,
      materialsCents: jobs.materialsCents,
      contractorPayoutCents: jobs.contractorPayoutCents,
    })
    .from(jobs)
    .where(
      and(
        gte(jobs.createdAt, dateRange.start),
        lt(jobs.createdAt, dateRange.end),
        inArray(jobs.status, REVENUE_STATUSES),
      ),
    );

  const materialsCents = jobRows.reduce((sum, j) => sum + j.materialsCents, 0);
  const contractorPayoutCents = jobRows.reduce((sum, j) => sum + j.contractorPayoutCents, 0);

  if (jobRows.length === 0) {
    return { materialsCents, contractorPayoutCents, outstandingCents: 0 };
  }

  const jobIds = jobRows.map((j) => j.id);
  const invoiceBalanceRows = await db
    .select({
      totalCents: invoices.totalCents,
      paidCents: sql<number>`coalesce(sum(${payments.amountCents}), 0)`,
    })
    .from(invoices)
    .leftJoin(payments, and(eq(payments.invoiceId, invoices.id), isNull(payments.voidedAt)))
    .where(
      and(inArray(invoices.jobId, jobIds), inArray(invoices.status, ["sent", "partially_paid"])),
    )
    .groupBy(invoices.id, invoices.totalCents);

  const outstandingCents = invoiceBalanceRows.reduce((sum, row) => {
    const balance = row.totalCents - Number(row.paidCents);
    return balance > 0 ? sum + balance : sum;
  }, 0);

  return { materialsCents, contractorPayoutCents, outstandingCents };
}
