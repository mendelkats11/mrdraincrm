import { and, eq, gte, lt } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { jobs, services } from "@/lib/db/schema";
import { getCurrentAssignmentsForJobs } from "@/lib/contractors/assignments";
import type { JobStatus } from "@/lib/jobs/jobs";
import type { DateRange } from "./date-ranges";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db<TQueryResult extends PgQueryResultHKT> = PgDatabase<TQueryResult, any, any>;

export interface JobsReportFilters {
  dateRange: DateRange;
  serviceId?: string;
  contractorId?: string;
  status?: string;
}

export interface JobsReportRow {
  jobId: string;
  jobNumber: string;
  createdAt: Date;
  status: string;
  emergency: boolean;
  serviceName: string | null;
  contractorName: string | null;
}

export interface JobsReportResult {
  rows: JobsReportRow[];
  totalCount: number;
  byStatus: { status: string; count: number }[];
  byService: { serviceName: string; count: number }[];
  emergencyCount: number;
}

export async function getJobsReport<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  filters: JobsReportFilters,
): Promise<JobsReportResult> {
  const conditions = [
    gte(jobs.createdAt, filters.dateRange.start),
    lt(jobs.createdAt, filters.dateRange.end),
  ];
  if (filters.serviceId) conditions.push(eq(jobs.serviceId, filters.serviceId));
  if (filters.status) conditions.push(eq(jobs.status, filters.status as JobStatus));

  const jobRows = await db
    .select({
      id: jobs.id,
      jobNumber: jobs.jobNumber,
      createdAt: jobs.createdAt,
      status: jobs.status,
      emergency: jobs.emergency,
      serviceName: services.name,
    })
    .from(jobs)
    .leftJoin(services, eq(jobs.serviceId, services.id))
    .where(and(...conditions));

  if (jobRows.length === 0) {
    return { rows: [], totalCount: 0, byStatus: [], byService: [], emergencyCount: 0 };
  }

  const jobIds = jobRows.map((j) => j.id);
  const assignments = await getCurrentAssignmentsForJobs(db, jobIds);

  let rows: JobsReportRow[] = jobRows.map((job) => ({
    jobId: job.id,
    jobNumber: job.jobNumber,
    createdAt: job.createdAt,
    status: job.status,
    emergency: job.emergency,
    serviceName: job.serviceName,
    contractorName: assignments.get(job.id)?.contractorName ?? null,
  }));

  if (filters.contractorId) {
    rows = rows.filter((r) => assignments.get(r.jobId)?.contractorId === filters.contractorId);
  }

  const statusCounts = new Map<string, number>();
  const serviceCounts = new Map<string, number>();
  let emergencyCount = 0;
  for (const row of rows) {
    statusCounts.set(row.status, (statusCounts.get(row.status) ?? 0) + 1);
    const serviceLabel = row.serviceName ?? "No service selected";
    serviceCounts.set(serviceLabel, (serviceCounts.get(serviceLabel) ?? 0) + 1);
    if (row.emergency) emergencyCount += 1;
  }

  return {
    rows: rows.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
    totalCount: rows.length,
    byStatus: [...statusCounts.entries()].map(([status, count]) => ({ status, count })),
    byService: [...serviceCounts.entries()]
      .map(([serviceName, count]) => ({ serviceName, count }))
      .sort((a, b) => b.count - a.count),
    emergencyCount,
  };
}
