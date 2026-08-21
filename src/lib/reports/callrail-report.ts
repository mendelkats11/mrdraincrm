import { and, eq, gte, lt } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { calls, messages, serviceAreas } from "@/lib/db/schema";
import type { DateRange } from "./date-ranges";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db<TQueryResult extends PgQueryResultHKT> = PgDatabase<TQueryResult, any, any>;

export interface CallRailReportFilters {
  dateRange: DateRange;
  serviceAreaId?: string;
  matched?: "matched" | "unknown";
  answered?: "answered" | "missed";
}

export interface CallRailReportRow {
  callId: string;
  occurredAt: Date;
  callerNumber: string;
  serviceAreaName: string | null;
  matched: boolean;
  answered: boolean;
  durationSeconds: number | null;
  ignored: boolean;
}

export interface CallRailReportResult {
  rows: CallRailReportRow[];
  totalCalls: number;
  answeredCount: number;
  missedCount: number;
  matchedCount: number;
  unknownCount: number;
  averageDurationSeconds: number | null;
  byServiceArea: { serviceAreaName: string; count: number }[];
  messageCount: number;
}

export async function getCallRailReport<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  filters: CallRailReportFilters,
): Promise<CallRailReportResult> {
  const conditions = [
    gte(calls.occurredAt, filters.dateRange.start),
    lt(calls.occurredAt, filters.dateRange.end),
  ];
  if (filters.serviceAreaId) conditions.push(eq(calls.serviceAreaId, filters.serviceAreaId));
  if (filters.matched) conditions.push(eq(calls.matched, filters.matched === "matched"));
  if (filters.answered) conditions.push(eq(calls.answered, filters.answered === "answered"));

  const [callRows, messageRows] = await Promise.all([
    db
      .select({
        id: calls.id,
        occurredAt: calls.occurredAt,
        callerNumber: calls.callerNumber,
        serviceAreaName: serviceAreas.name,
        matched: calls.matched,
        answered: calls.answered,
        durationSeconds: calls.durationSeconds,
        ignored: calls.ignored,
      })
      .from(calls)
      .leftJoin(serviceAreas, eq(calls.serviceAreaId, serviceAreas.id))
      .where(and(...conditions)),
    db
      .select({ id: messages.id })
      .from(messages)
      .where(
        and(
          gte(messages.occurredAt, filters.dateRange.start),
          lt(messages.occurredAt, filters.dateRange.end),
        ),
      ),
  ]);

  const rows: CallRailReportRow[] = callRows.map((c) => ({
    callId: c.id,
    occurredAt: c.occurredAt,
    callerNumber: c.callerNumber,
    serviceAreaName: c.serviceAreaName,
    matched: c.matched,
    answered: c.answered,
    durationSeconds: c.durationSeconds,
    ignored: c.ignored,
  }));

  const byServiceArea = new Map<string, number>();
  let answeredCount = 0;
  let matchedCount = 0;
  let durationSum = 0;
  let durationCount = 0;
  for (const row of rows) {
    const label = row.serviceAreaName ?? "No tracking number match";
    byServiceArea.set(label, (byServiceArea.get(label) ?? 0) + 1);
    if (row.answered) answeredCount += 1;
    if (row.matched) matchedCount += 1;
    if (row.durationSeconds !== null) {
      durationSum += row.durationSeconds;
      durationCount += 1;
    }
  }

  return {
    rows: rows.sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime()),
    totalCalls: rows.length,
    answeredCount,
    missedCount: rows.length - answeredCount,
    matchedCount,
    unknownCount: rows.length - matchedCount,
    averageDurationSeconds: durationCount === 0 ? null : Math.round(durationSum / durationCount),
    byServiceArea: [...byServiceArea.entries()]
      .map(([serviceAreaName, count]) => ({ serviceAreaName, count }))
      .sort((a, b) => b.count - a.count),
    messageCount: messageRows.length,
  };
}
