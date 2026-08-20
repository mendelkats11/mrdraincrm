// Date-range helpers for the Day/Week/Month/List schedule views. Plain
// Date math, server-local time — this codebase has no timezone-handling
// infrastructure anywhere yet, so scheduling stays consistent with that
// rather than introducing one just for this phase.

export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfDay(date: Date): Date {
  const d = startOfDay(date);
  d.setDate(d.getDate() + 1);
  return d;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/** Sunday-start week, matching the common North American calendar convention. */
export function startOfWeek(date: Date): Date {
  const d = startOfDay(date);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

export function endOfWeek(date: Date): Date {
  return addDays(startOfWeek(date), 7);
}

export function addMonths(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 1);
}

/** The full set of calendar weeks covering a month, including the
 *  leading/trailing days from adjacent months needed to fill a 42-cell
 *  (6-week) grid — the range the month view actually needs to query. */
export function monthGridRange(date: Date): { start: Date; end: Date } {
  const lastDayOfMonth = new Date(endOfMonth(date).getTime() - 1);
  return { start: startOfWeek(startOfMonth(date)), end: endOfWeek(lastDayOfMonth) };
}

/** Every day (as a Date at midnight) from start (inclusive) to end (exclusive). */
export function eachDayInRange(start: Date, end: Date): Date[] {
  const days: Date[] = [];
  let cursor = startOfDay(start);
  const stop = startOfDay(end);
  while (cursor < stop) {
    days.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return days;
}

/** YYYY-MM-DD, the ?date= query-param format used by /schedule. */
export function toDateParam(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Parses a ?date= param; falls back to today for anything missing/invalid. */
export function parseDateParam(value: string | undefined): Date {
  if (value) {
    const [y, m, d] = value.split("-").map(Number);
    if (y && m && d) {
      const parsed = new Date(y, m - 1, d);
      if (!Number.isNaN(parsed.getTime())) return parsed;
    }
  }
  return startOfDay(new Date());
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
