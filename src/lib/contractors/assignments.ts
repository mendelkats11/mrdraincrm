import { and, desc, eq, inArray } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { contractors, jobContractorAssignments, jobCustomCharges, jobs } from "@/lib/db/schema";
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
  status: string;
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

// ---- Phase 7: contractor status lifecycle + rollups ----

export type AssignmentActiveStatus = "assigned" | "completed" | "payout_pending" | "paid";

export type UpdateAssignmentStatusResult =
  { ok: true } | { ok: false; error: "no_current_assignment" };

/**
 * Advances (or moves back) the *current* assignment row's own status,
 * updated in place — not appended as a new row. History is preserved via
 * the `activities` log, the same way `changeJobStatus` already handles job
 * status changes, rather than by inserting parallel assignment rows (which
 * would overload `assignedAt`'s meaning and pollute the "Assignment
 * history" UI Phase 6 built specifically to show identity changes). Free
 * transitions in either direction, no state machine — mirrors the existing
 * job-status precedent. `paidAt` is set exactly when entering "paid" and
 * cleared otherwise. Never touches `contractorId`, and never sets
 * "unassigned" — that remains exclusively `unassignContractor`'s
 * append-only marker row. The job's own `status` is never touched either;
 * the two status systems are deliberately independent
 * (docs/PROJECT_SPEC.md §8.5).
 */
export async function updateAssignmentStatus<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  jobId: string,
  status: AssignmentActiveStatus,
  actorUserId: string | null,
): Promise<UpdateAssignmentStatusResult> {
  return db.transaction(async (tx) => {
    const [latest] = await tx
      .select()
      .from(jobContractorAssignments)
      .where(eq(jobContractorAssignments.jobId, jobId))
      .orderBy(desc(jobContractorAssignments.assignedAt))
      .limit(1);

    if (!latest || latest.status === "unassigned") {
      return { ok: false, error: "no_current_assignment" };
    }
    if (latest.status === status) return { ok: true };

    await tx
      .update(jobContractorAssignments)
      .set({ status, paidAt: status === "paid" ? new Date() : null })
      .where(eq(jobContractorAssignments.id, latest.id));

    await recordActivity(tx, {
      actorUserId,
      entityType: "job",
      entityId: jobId,
      action: "contractor_status_changed",
      oldValue: { status: latest.status },
      newValue: { status },
    });

    return { ok: true };
  });
}

/**
 * Jobs where this contractor's assignment row is the *true* current one —
 * resolved globally across every contractor ever assigned to each
 * candidate job, not just this contractor's own latest row, so a job
 * reassigned away to someone else is correctly excluded rather than
 * double-counted in both contractors' totals.
 */
async function getCurrentJobsForContractor<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  contractorId: string,
): Promise<Map<string, string>> {
  const ownRows = await db
    .select({ jobId: jobContractorAssignments.jobId })
    .from(jobContractorAssignments)
    .where(eq(jobContractorAssignments.contractorId, contractorId));
  const candidateJobIds = [...new Set(ownRows.map((r) => r.jobId))];
  if (candidateJobIds.length === 0) return new Map();

  const allRows = await db
    .select({
      jobId: jobContractorAssignments.jobId,
      contractorId: jobContractorAssignments.contractorId,
      status: jobContractorAssignments.status,
      assignedAt: jobContractorAssignments.assignedAt,
    })
    .from(jobContractorAssignments)
    .where(inArray(jobContractorAssignments.jobId, candidateJobIds));

  const latestByJob = new Map<string, (typeof allRows)[number]>();
  for (const row of allRows) {
    const existing = latestByJob.get(row.jobId);
    if (!existing || row.assignedAt > existing.assignedAt) {
      latestByJob.set(row.jobId, row);
    }
  }

  const result = new Map<string, string>();
  for (const [jobId, row] of latestByJob) {
    if (row.status !== "unassigned" && row.contractorId === contractorId) {
      result.set(jobId, row.status);
    }
  }
  return result;
}

const COMPLETED_STAGE_STATUSES = new Set(["completed", "payout_pending", "paid"]);

export interface ContractorStats {
  jobsCompleted: number;
  totalJobValueCents: number;
  totalPayoutCents: number;
  totalPaidCents: number;
  outstandingPayoutCents: number;
}

/**
 * All rollups are computed live from current data, never stored, and
 * scoped to jobs where this contractor is the *current* assignment only
 * (see getCurrentJobsForContractor). "Jobs Completed" uses the
 * assignment's own status (completed/payout_pending/paid all count) —
 * deliberately independent of the job's own status, per
 * docs/PROJECT_SPEC.md §8.5. "Total Job Value" is a raw sum of
 * manually-entered fields — job amount + custom charges, plus tax only
 * when that job's own taxInclusionMode snapshot is "included" — never a
 * profit/margin figure (exclusively Phase 8's lib/financials module).
 * "Outstanding Payout" is Total Payout minus Total Paid, i.e. how much of
 * the already-manually-entered contractor payout across this contractor's
 * current jobs has not yet been marked Paid.
 */
export async function getContractorStats<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  contractorId: string,
): Promise<ContractorStats> {
  const currentJobs = await getCurrentJobsForContractor(db, contractorId);
  if (currentJobs.size === 0) {
    return {
      jobsCompleted: 0,
      totalJobValueCents: 0,
      totalPayoutCents: 0,
      totalPaidCents: 0,
      outstandingPayoutCents: 0,
    };
  }

  const jobIds = [...currentJobs.keys()];

  const jobRows = await db
    .select({
      id: jobs.id,
      jobAmountCents: jobs.jobAmountCents,
      taxAmountCents: jobs.taxAmountCents,
      taxInclusionMode: jobs.taxInclusionMode,
      contractorPayoutCents: jobs.contractorPayoutCents,
    })
    .from(jobs)
    .where(inArray(jobs.id, jobIds));

  const chargeRows = await db
    .select({ jobId: jobCustomCharges.jobId, amountCents: jobCustomCharges.amountCents })
    .from(jobCustomCharges)
    .where(inArray(jobCustomCharges.jobId, jobIds));

  const chargesByJob = new Map<string, number>();
  for (const charge of chargeRows) {
    chargesByJob.set(charge.jobId, (chargesByJob.get(charge.jobId) ?? 0) + charge.amountCents);
  }

  let jobsCompleted = 0;
  let totalJobValueCents = 0;
  let totalPayoutCents = 0;
  let totalPaidCents = 0;

  for (const job of jobRows) {
    const status = currentJobs.get(job.id)!;
    if (COMPLETED_STAGE_STATUSES.has(status)) jobsCompleted += 1;

    const customChargesTotal = chargesByJob.get(job.id) ?? 0;
    const tax = job.taxInclusionMode === "included" ? job.taxAmountCents : 0;
    totalJobValueCents += job.jobAmountCents + customChargesTotal + tax;

    totalPayoutCents += job.contractorPayoutCents;
    if (status === "paid") totalPaidCents += job.contractorPayoutCents;
  }

  return {
    jobsCompleted,
    totalJobValueCents,
    totalPayoutCents,
    totalPaidCents,
    outstandingPayoutCents: totalPayoutCents - totalPaidCents,
  };
}

export interface ContractorJobRow {
  jobId: string;
  jobNumber: string;
  jobStatus: string;
  assignmentStatus: string;
  contractorPayoutCents: number;
  assignedAt: Date;
  paidAt: Date | null;
}

/** Payout-history table for a contractor's detail page — current-assignment jobs only, newest first. */
export async function listJobsForContractor<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  contractorId: string,
): Promise<ContractorJobRow[]> {
  const currentJobs = await getCurrentJobsForContractor(db, contractorId);
  if (currentJobs.size === 0) return [];

  const jobIds = [...currentJobs.keys()];

  const jobRows = await db
    .select({
      id: jobs.id,
      jobNumber: jobs.jobNumber,
      status: jobs.status,
      contractorPayoutCents: jobs.contractorPayoutCents,
    })
    .from(jobs)
    .where(inArray(jobs.id, jobIds));

  // Re-fetch this contractor's own rows for exactly these job IDs to read
  // assignedAt/paidAt — safe to take each job's latest row among just this
  // contractor's rows here, since jobIds is already filtered (via
  // getCurrentJobsForContractor) to jobs where this contractor's row IS
  // the true current one.
  const assignmentRows = await db
    .select({
      jobId: jobContractorAssignments.jobId,
      assignedAt: jobContractorAssignments.assignedAt,
      paidAt: jobContractorAssignments.paidAt,
    })
    .from(jobContractorAssignments)
    .where(
      and(
        inArray(jobContractorAssignments.jobId, jobIds),
        eq(jobContractorAssignments.contractorId, contractorId),
      ),
    );

  const latestAssignmentByJob = new Map<string, (typeof assignmentRows)[number]>();
  for (const row of assignmentRows) {
    const existing = latestAssignmentByJob.get(row.jobId);
    if (!existing || row.assignedAt > existing.assignedAt) {
      latestAssignmentByJob.set(row.jobId, row);
    }
  }

  const jobById = new Map(jobRows.map((j) => [j.id, j]));

  return jobIds
    .map((jobId): ContractorJobRow | null => {
      const job = jobById.get(jobId);
      const assignment = latestAssignmentByJob.get(jobId);
      if (!job || !assignment) return null;
      return {
        jobId,
        jobNumber: job.jobNumber,
        jobStatus: job.status,
        assignmentStatus: currentJobs.get(jobId)!,
        contractorPayoutCents: job.contractorPayoutCents,
        assignedAt: assignment.assignedAt,
        paidAt: assignment.paidAt,
      };
    })
    .filter((r): r is ContractorJobRow => r !== null)
    .sort((a, b) => b.assignedAt.getTime() - a.assignedAt.getTime());
}
