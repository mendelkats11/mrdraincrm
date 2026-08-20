// Contractor conflict detection — Phase 6 approved decisions §15-17.
// Conflicts are warnings only; nothing in this module ever blocks an
// assignment, it only tells the caller whether to show a warning.

/** Purely for the conflict-check heuristic (§16) — never stored, never
 *  shown as the job's actual duration, never written to scheduledEnd. */
const DEFAULT_CONFLICT_DURATION_MS = 2 * 60 * 60 * 1000;

export interface TimeRange {
  start: Date;
  end: Date;
}

export interface SchedulableJob {
  scheduledStart: Date | null;
  scheduledEnd: Date | null;
  timeTbd: boolean;
}

/** True when two ranges share any instant — touching ranges (one's end
 *  equals the other's start) do not count as overlapping. */
export function rangesOverlap(a: TimeRange, b: TimeRange): boolean {
  return a.start < b.end && b.start < a.end;
}

/**
 * Resolves a job to the range used for conflict checking, or null if it
 * can't produce one:
 *  - no scheduledStart at all -> null (nothing to conflict with)
 *  - timeTbd -> null (§17: "Time TBD jobs should not be treated as precise
 *    timed conflicts because their time is unknown" — never blocks
 *    assignment, never reported as a conflict)
 *  - scheduledEnd present -> use it as-is
 *  - scheduledEnd absent -> assume a 2-hour duration, heuristic only (§16)
 */
export function toConflictRange(job: SchedulableJob): TimeRange | null {
  if (!job.scheduledStart || job.timeTbd) return null;
  const start = job.scheduledStart;
  const end = job.scheduledEnd ?? new Date(start.getTime() + DEFAULT_CONFLICT_DURATION_MS);
  return { start, end };
}

/** True if the two jobs would conflict for the same contractor. Jobs with
 *  no schedule, or with timeTbd, never conflict with anything. */
export function jobsConflict(a: SchedulableJob, b: SchedulableJob): boolean {
  const rangeA = toConflictRange(a);
  const rangeB = toConflictRange(b);
  if (!rangeA || !rangeB) return false;
  return rangesOverlap(rangeA, rangeB);
}
