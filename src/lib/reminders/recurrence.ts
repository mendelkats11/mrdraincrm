import { BUSINESS_TIMEZONE, getZonedParts, zonedPartsToInstant } from "./timezone";

export type ReminderRecurrence = "one_time" | "daily" | "weekly" | "monthly" | "yearly" | "custom";

/** Last day of the given month (1-12) in the given year, accounting for leap years. */
function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/**
 * Computes the next occurrence's dueAt from the *original* dueAt (never
 * from "now" or from when it was actually completed) — Phase 10 decision:
 * "every Monday 9am" always regenerates as the next Monday 9am, even if
 * completed late, so the schedule never drifts.
 *
 * Time-of-day is preserved in the business timezone (not UTC), so a 9am
 * reminder stays 9am business time when advanced across a month/year
 * boundary, regardless of how UTC offsets happen to fall.
 *
 * Month/year-end handling: adding a month/year clamps to the last valid day
 * of the resulting month rather than overflowing (Jan 31 + monthly -> Feb
 * 28/29, not Mar 2-3) — standard "add a month" semantics.
 *
 * "custom" has no defined interval anywhere in the schema or spec (Phase 9
 * decision 2's sibling for reminders) and "one_time" never recurs — both
 * return null.
 */
export function computeNextOccurrence(
  currentDueAt: Date,
  recurrence: ReminderRecurrence,
  timeZone: string = BUSINESS_TIMEZONE,
): Date | null {
  if (recurrence === "one_time" || recurrence === "custom") return null;

  const parts = getZonedParts(currentDueAt, timeZone);

  switch (recurrence) {
    case "daily":
      return advanceByDays(parts, 1, timeZone);
    case "weekly":
      return advanceByDays(parts, 7, timeZone);
    case "monthly":
      return advanceByMonths(parts, 1, timeZone);
    case "yearly":
      return advanceByMonths(parts, 12, timeZone);
  }
}

function advanceByDays(
  parts: ReturnType<typeof getZonedParts>,
  days: number,
  timeZone: string,
): Date {
  // Calendar-day arithmetic in UTC-space is safe here since we're only
  // moving the date, not reinterpreting a wall-clock time near a DST
  // transition — the resulting Y/M/D is then re-anchored to the business
  // timezone with the original time-of-day by zonedPartsToInstant below.
  const d = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days));
  return zonedPartsToInstant(
    {
      year: d.getUTCFullYear(),
      month: d.getUTCMonth() + 1,
      day: d.getUTCDate(),
      hour: parts.hour,
      minute: parts.minute,
      second: parts.second,
    },
    timeZone,
  );
}

function advanceByMonths(
  parts: ReturnType<typeof getZonedParts>,
  months: number,
  timeZone: string,
): Date {
  const totalMonths = parts.month - 1 + months;
  const targetYear = parts.year + Math.floor(totalMonths / 12);
  const targetMonth = (totalMonths % 12) + 1;
  const targetDay = Math.min(parts.day, daysInMonth(targetYear, targetMonth));

  return zonedPartsToInstant(
    {
      year: targetYear,
      month: targetMonth,
      day: targetDay,
      hour: parts.hour,
      minute: parts.minute,
      second: parts.second,
    },
    timeZone,
  );
}
