import {
  addBusinessDays,
  BUSINESS_TIMEZONE,
  businessDateString,
  startOfBusinessDay,
} from "./timezone";

export type ReminderTiming = "overdue" | "due_today" | "upcoming";

/**
 * Classifies an active (not completed/cancelled) reminder's timing —
 * boundaries computed in the business timezone, never raw UTC/string
 * comparison. Callers must check completedAt/cancelledAt themselves first;
 * this only answers "when," not "is it still active."
 */
export function classifyReminderTiming(
  dueAt: Date,
  now: Date,
  timeZone: string = BUSINESS_TIMEZONE,
): ReminderTiming {
  const today = businessDateString(now, timeZone);
  const tomorrow = addBusinessDays(today, 1);
  const startOfToday = startOfBusinessDay(today, timeZone);
  const startOfTomorrow = startOfBusinessDay(tomorrow, timeZone);

  if (dueAt < startOfToday) return "overdue";
  if (dueAt < startOfTomorrow) return "due_today";
  return "upcoming";
}
