// Report date-range presets — docs/PROJECT_SPEC.md §21 ("Date ranges").
// Boundaries are resolved in the business timezone (America/Regina, see
// src/lib/reminders/timezone.ts) rather than server-local time, since
// reports run server-side on Netlify (UTC) but "Today"/"This month" must
// match what the owner, in Saskatoon, means by those words.
import { BUSINESS_TIMEZONE, getZonedParts, zonedPartsToInstant } from "@/lib/reminders/timezone";

export const DATE_RANGE_PRESETS = [
  "today",
  "yesterday",
  "this_week",
  "this_month",
  "last_month",
  "this_quarter",
  "this_year",
  "last_year",
  "custom",
] as const;

export type DateRangePreset = (typeof DATE_RANGE_PRESETS)[number];

/** Half-open instant range: [start, end). */
export interface DateRange {
  start: Date;
  end: Date;
}

function businessDayStart(year: number, month: number, day: number): Date {
  return zonedPartsToInstant({ year, month, day, hour: 0, minute: 0, second: 0 });
}

/** Sunday-start week, matching the existing schedule-view convention (src/lib/schedule/ranges.ts). */
function businessWeekStart(parts: { year: number; month: number; day: number }): Date {
  // Anchor on the UTC representation of the zoned calendar date purely to do
  // day-of-week arithmetic — the actual instant is always resolved via
  // zonedPartsToInstant below, so this never leaks a UTC-vs-local bug.
  const anchor = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
  const sundayAnchor = new Date(anchor);
  sundayAnchor.setUTCDate(anchor.getUTCDate() - anchor.getUTCDay());
  return businessDayStart(
    sundayAnchor.getUTCFullYear(),
    sundayAnchor.getUTCMonth() + 1,
    sundayAnchor.getUTCDate(),
  );
}

function addDaysToBusinessInstant(start: Date, days: number): Date {
  const parts = getZonedParts(start, BUSINESS_TIMEZONE);
  const shifted = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days));
  return businessDayStart(
    shifted.getUTCFullYear(),
    shifted.getUTCMonth() + 1,
    shifted.getUTCDate(),
  );
}

export interface CustomDateRangeInput {
  /** YYYY-MM-DD, inclusive start. */
  start: string;
  /** YYYY-MM-DD, inclusive end. */
  end: string;
}

/** Resolves a preset (or explicit custom start/end) into a half-open instant range. */
export function resolveDateRange(
  preset: DateRangePreset,
  custom?: CustomDateRangeInput,
  now: Date = new Date(),
): DateRange {
  const today = getZonedParts(now, BUSINESS_TIMEZONE);
  const todayStart = businessDayStart(today.year, today.month, today.day);

  switch (preset) {
    case "today":
      return { start: todayStart, end: addDaysToBusinessInstant(todayStart, 1) };
    case "yesterday": {
      const start = addDaysToBusinessInstant(todayStart, -1);
      return { start, end: todayStart };
    }
    case "this_week": {
      const start = businessWeekStart(today);
      return { start, end: addDaysToBusinessInstant(start, 7) };
    }
    case "this_month": {
      const start = businessDayStart(today.year, today.month, 1);
      const end = businessDayStart(
        today.month === 12 ? today.year + 1 : today.year,
        today.month === 12 ? 1 : today.month + 1,
        1,
      );
      return { start, end };
    }
    case "last_month": {
      const month = today.month === 1 ? 12 : today.month - 1;
      const year = today.month === 1 ? today.year - 1 : today.year;
      const start = businessDayStart(year, month, 1);
      const end = businessDayStart(today.year, today.month, 1);
      return { start, end };
    }
    case "this_quarter": {
      const quarterStartMonth = Math.floor((today.month - 1) / 3) * 3 + 1;
      const start = businessDayStart(today.year, quarterStartMonth, 1);
      const endMonth = quarterStartMonth + 3;
      const end =
        endMonth > 12
          ? businessDayStart(today.year + 1, endMonth - 12, 1)
          : businessDayStart(today.year, endMonth, 1);
      return { start, end };
    }
    case "this_year": {
      const start = businessDayStart(today.year, 1, 1);
      const end = businessDayStart(today.year + 1, 1, 1);
      return { start, end };
    }
    case "last_year": {
      const start = businessDayStart(today.year - 1, 1, 1);
      const end = businessDayStart(today.year, 1, 1);
      return { start, end };
    }
    case "custom": {
      if (!custom) return resolveDateRange("this_month", undefined, now);
      const [sy, sm, sd] = custom.start.split("-").map(Number);
      const [ey, em, ed] = custom.end.split("-").map(Number);
      const start = businessDayStart(sy, sm, sd);
      // End is inclusive as entered by the user; stored range is half-open,
      // so the resolved end is the start of the day *after* the entered date.
      const end = addDaysToBusinessInstant(businessDayStart(ey, em, ed), 1);
      return { start, end };
    }
  }
}

export const DATE_RANGE_PRESET_LABELS: Record<DateRangePreset, string> = {
  today: "Today",
  yesterday: "Yesterday",
  this_week: "This week",
  this_month: "This month",
  last_month: "Last month",
  this_quarter: "This quarter",
  this_year: "This year",
  last_year: "Last year",
  custom: "Custom",
};

export function isDateRangePreset(value: string): value is DateRangePreset {
  return (DATE_RANGE_PRESETS as readonly string[]).includes(value);
}
