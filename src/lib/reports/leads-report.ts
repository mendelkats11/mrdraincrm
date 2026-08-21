import { and, eq, gte, lt } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { leads } from "@/lib/db/schema";
import type { LeadStatus } from "@/lib/crm/leads";
import type { DateRange } from "./date-ranges";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db<TQueryResult extends PgQueryResultHKT> = PgDatabase<TQueryResult, any, any>;

export interface LeadsReportFilters {
  dateRange: DateRange;
  status?: string;
  source?: string;
}

export interface LeadsReportRow {
  leadId: string;
  createdAt: Date;
  status: string;
  originalSource: string | null;
  emergency: boolean;
  convertedAt: Date | null;
}

export interface LeadsReportResult {
  rows: LeadsReportRow[];
  totalCount: number;
  wonCount: number;
  lostCount: number;
  /** Won / Total, in basis points — null when there are no leads in range. */
  conversionRateBasisPoints: number | null;
  byStatus: { status: string; count: number }[];
  bySource: { source: string; count: number }[];
}

export async function getLeadsReport<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  filters: LeadsReportFilters,
): Promise<LeadsReportResult> {
  const conditions = [
    gte(leads.createdAt, filters.dateRange.start),
    lt(leads.createdAt, filters.dateRange.end),
  ];
  if (filters.status) conditions.push(eq(leads.status, filters.status as LeadStatus));
  if (filters.source) conditions.push(eq(leads.originalSource, filters.source));

  const rows = await db
    .select({
      id: leads.id,
      createdAt: leads.createdAt,
      status: leads.status,
      originalSource: leads.originalSource,
      emergency: leads.emergency,
      convertedAt: leads.convertedAt,
    })
    .from(leads)
    .where(and(...conditions));

  const statusCounts = new Map<string, number>();
  const sourceCounts = new Map<string, number>();
  let wonCount = 0;
  let lostCount = 0;
  for (const row of rows) {
    statusCounts.set(row.status, (statusCounts.get(row.status) ?? 0) + 1);
    const sourceLabel = row.originalSource ?? "Unknown";
    sourceCounts.set(sourceLabel, (sourceCounts.get(sourceLabel) ?? 0) + 1);
    if (row.status === "won") wonCount += 1;
    if (row.status === "lost") lostCount += 1;
  }

  return {
    rows: rows
      .map((r) => ({
        leadId: r.id,
        createdAt: r.createdAt,
        status: r.status,
        originalSource: r.originalSource,
        emergency: r.emergency,
        convertedAt: r.convertedAt,
      }))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
    totalCount: rows.length,
    wonCount,
    lostCount,
    conversionRateBasisPoints:
      rows.length === 0 ? null : Math.round((wonCount * 10000) / rows.length),
    byStatus: [...statusCounts.entries()].map(([status, count]) => ({ status, count })),
    bySource: [...sourceCounts.entries()]
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count),
  };
}
