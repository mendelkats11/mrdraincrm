import { desc, eq, inArray } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { contractors, jobContractorAssignments, jobs } from "@/lib/db/schema";
import { recordActivity } from "@/lib/audit/activity";
import { jobsConflict } from "@/lib/schedule/overlap";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db<TQueryResult extends PgQueryResultHKT> = PgDatabase<TQueryResult, any, any>;

/**
 * job_contractor_assignments is append-only for Phase 6's purposes: every
 * assign/reassign/unassign inserts a new row rather than mutating an
 * existing one, so history is always intact (approved decision — see
 * src/lib/db/schema/jobs.ts). "Current" is simply whichever row for a job
 * has the latest assignedAt; "unassigned" is a real status value already
 * in the schema's enum, used as an explicit "nobody assigned as of here"
 * marker row rather than an implicit absence.
 */

export interface CurrentAssignment {
  id: string;
  contractorId: string;
  contractorName: string;
  contractorPhone: string | null;
  contractorEmail: string | null;
  assignedAt: Date;
}

export async function getCurrentAssignment<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  jobId: string,
): Promise<CurrentAssignment | null> {
  const [row] = await db
    .select({
      id: jobContractorAssignments.id,
      contractorId: jobContractorAssignments.contractorId,
      contractorName: contractors.name,
      contractorPhone: contractors.phone,
      contractorEmail: contractors.email,
      status: jobContractorAssignments.status,
      assignedAt: jobContractorAssignments.assignedAt,
    })
    .from(jobContractorAssignments)
    .innerJoin(contractors, eq(jobContractorAssignments.contractorId, contractors.id))
    .where(eq(jobContractorAssignments.jobId, jobId))
    .orderBy(desc(jobContractorAssignments.assignedAt))
    .limit(1);

  if (!row || row.status === "unassigned") return null;
  return row;
}

/** Batched version for list/calendar views — avoids one query per row. */
export async function getCurrentAssignmentsForJobs<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  jobIds: string[],
): Promise<Map<string, { contractorId: string; contractorName: string }>> {
  if (jobIds.length === 0) return new Map();

  const rows = await db
    .select({
      jobId: jobContractorAssignments.jobId,
      contractorId: jobContractorAssignments.contractorId,
      contractorName: contractors.name,
      status: jobContractorAssignments.status,
      assignedAt: jobContractorAssignments.assignedAt,
    })
    .from(jobContractorAssignments)
    .innerJoin(contractors, eq(jobContractorAssignments.contractorId, contractors.id))
    .where(inArray(jobContractorAssignments.jobId, jobIds));

  const latestByJob = new Map<string, (typeof rows)[number]>();
  for (const row of rows) {
    const existing = latestByJob.get(row.jobId);
    if (!existing || row.assignedAt > existing.assignedAt) {
      latestByJob.set(row.jobId, row);
    }
  }

  const result = new Map<string, { contractorId: string; contractorName: string }>();
  for (const [jobId, row] of latestByJob) {
    if (row.status !== "unassigned") {
      result.set(jobId, { contractorId: row.contractorId, contractorName: row.contractorName });
    }
  }
  return result;
}

export interface AssignmentHistoryRow {
  id: string;
  contractorId: string;
  contractorName: string;
  status: string;
  assignedAt: Date;
}

export async function listAssignmentHistory<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  jobId: string,
): Promise<AssignmentHistoryRow[]> {
  return db
    .select({
      id: jobContractorAssignments.id,
      contractorId: jobContractorAssignments.contractorId,
      contractorName: contractors.name,
      status: jobContractorAssignments.status,
      assignedAt: jobContractorAssignments.assignedAt,
    })
    .from(jobContractorAssignments)
    .innerJoin(contractors, eq(jobContractorAssignments.contractorId, contractors.id))
    .where(eq(jobContractorAssignments.jobId, jobId))
    .orderBy(desc(jobContractorAssignments.assignedAt));
}

/**
 * Assigns (or reassigns) a contractor to a job. Re-selecting the contractor
 * already currently assigned is a no-op (no duplicate history row). A real
 * change always inserts a new row — the prior assignment, if any, is never
 * touched — and records `contractor_assigned` for a first assignment or
 * `contractor_reassigned` when replacing an existing one. This function
 * never checks for conflicts or blocks anything — conflict checking is a
 * separate, caller-driven step (checkContractorConflict) so the UI can
 * warn-then-confirm without this function needing a "force" parameter.
 */
export async function assignContractor<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  jobId: string,
  contractorId: string,
  actorUserId: string | null,
) {
  return db.transaction(async (tx) => {
    const [latest] = await tx
      .select({
        contractorId: jobContractorAssignments.contractorId,
        status: jobContractorAssignments.status,
      })
      .from(jobContractorAssignments)
      .where(eq(jobContractorAssignments.jobId, jobId))
      .orderBy(desc(jobContractorAssignments.assignedAt))
      .limit(1);

    const currentlyAssignedTo =
      latest && latest.status !== "unassigned" ? latest.contractorId : null;

    if (currentlyAssignedTo === contractorId) {
      const [existing] = await tx
        .select()
        .from(jobContractorAssignments)
        .where(eq(jobContractorAssignments.jobId, jobId))
        .orderBy(desc(jobContractorAssignments.assignedAt))
        .limit(1);
      return existing;
    }

    const [assignment] = await tx
      .insert(jobContractorAssignments)
      .values({ jobId, contractorId, status: "assigned" })
      .returning();

    await recordActivity(tx, {
      actorUserId,
      entityType: "job",
      entityId: jobId,
      action: currentlyAssignedTo ? "contractor_reassigned" : "contractor_assigned",
      oldValue: currentlyAssignedTo ? { contractorId: currentlyAssignedTo } : undefined,
      newValue: { contractorId },
    });

    return assignment;
  });
}

/** No-op (returns null) if nobody is currently assigned. */
export async function unassignContractor<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  jobId: string,
  actorUserId: string | null,
) {
  return db.transaction(async (tx) => {
    const [latest] = await tx
      .select()
      .from(jobContractorAssignments)
      .where(eq(jobContractorAssignments.jobId, jobId))
      .orderBy(desc(jobContractorAssignments.assignedAt))
      .limit(1);

    if (!latest || latest.status === "unassigned") return null;

    const [row] = await tx
      .insert(jobContractorAssignments)
      .values({ jobId, contractorId: latest.contractorId, status: "unassigned" })
      .returning();

    await recordActivity(tx, {
      actorUserId,
      entityType: "job",
      entityId: jobId,
      action: "contractor_unassigned",
      oldValue: { contractorId: latest.contractorId },
    });

    return row;
  });
}

export interface ContractorConflict {
  jobId: string;
  jobNumber: string;
  scheduledStart: Date;
  scheduledEnd: Date | null;
}

/**
 * Warning-only check (approved decision §15-17) — never blocks anything,
 * just tells the caller what to show before they confirm. Looks at every
 * job this contractor currently has an active (non-unassigned) assignment
 * on, other than `excludeJobId` itself, and reports the first one whose
 * schedule overlaps the target range per the shared overlap predicate.
 */
export async function checkContractorConflict<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  contractorId: string,
  targetJob: { scheduledStart: Date | null; scheduledEnd: Date | null; timeTbd: boolean },
  excludeJobId: string,
): Promise<ContractorConflict | null> {
  if (!targetJob.scheduledStart || targetJob.timeTbd) return null;

  const assignmentRows = await db
    .select({
      jobId: jobContractorAssignments.jobId,
      status: jobContractorAssignments.status,
      assignedAt: jobContractorAssignments.assignedAt,
    })
    .from(jobContractorAssignments)
    .where(eq(jobContractorAssignments.contractorId, contractorId));

  const latestByJob = new Map<string, (typeof assignmentRows)[number]>();
  for (const row of assignmentRows) {
    const existing = latestByJob.get(row.jobId);
    if (!existing || row.assignedAt > existing.assignedAt) {
      latestByJob.set(row.jobId, row);
    }
  }

  const otherActiveJobIds = [...latestByJob.values()]
    .filter((row) => row.status !== "unassigned" && row.jobId !== excludeJobId)
    .map((row) => row.jobId);

  if (otherActiveJobIds.length === 0) return null;

  const otherJobs = await db
    .select({
      id: jobs.id,
      jobNumber: jobs.jobNumber,
      scheduledStart: jobs.scheduledStart,
      scheduledEnd: jobs.scheduledEnd,
      timeTbd: jobs.timeTbd,
    })
    .from(jobs)
    .where(inArray(jobs.id, otherActiveJobIds));

  for (const other of otherJobs) {
    if (jobsConflict(targetJob, other)) {
      return {
        jobId: other.id,
        jobNumber: other.jobNumber,
        scheduledStart: other.scheduledStart!,
        scheduledEnd: other.scheduledEnd,
      };
    }
  }

  return null;
}
