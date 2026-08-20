// Display formatting for scheduled jobs — shared by the jobs list's
// Scheduled column, the schedule List view, and the Day/Week views.
// "en-CA" matches the locale already used throughout the app (activity
// timeline, job/lead detail dates).

const DATE_FMT = new Intl.DateTimeFormat("en-CA", { month: "short", day: "numeric" });
const TIME_FMT = new Intl.DateTimeFormat("en-CA", { hour: "numeric", minute: "2-digit" });

export interface ScheduleFields {
  scheduledStart: Date | null;
  scheduledEnd: Date | null;
  timeTbd: boolean;
}

/** "Aug 17, 10:00 a.m.", "Aug 17, 10:00 a.m.–12:00 p.m.", "Aug 17 · Time TBD", or "—". */
export function formatScheduleSummary(job: ScheduleFields): string {
  if (!job.scheduledStart) return "—";
  const datePart = DATE_FMT.format(job.scheduledStart);
  if (job.timeTbd) return `${datePart} · Time TBD`;
  const startTime = TIME_FMT.format(job.scheduledStart);
  if (job.scheduledEnd) {
    return `${datePart}, ${startTime}–${TIME_FMT.format(job.scheduledEnd)}`;
  }
  return `${datePart}, ${startTime}`;
}

/** Time-only, for use inside a view that already establishes the date
 *  (Day view, a Week/Month day cell): "10:00 a.m.", "10:00 a.m.–12:00
 *  p.m.", "Any time", or "—". */
export function formatTimeRange(job: ScheduleFields): string {
  if (!job.scheduledStart) return "—";
  if (job.timeTbd) return "Any time";
  const startTime = TIME_FMT.format(job.scheduledStart);
  if (job.scheduledEnd) {
    return `${startTime}–${TIME_FMT.format(job.scheduledEnd)}`;
  }
  return startTime;
}
