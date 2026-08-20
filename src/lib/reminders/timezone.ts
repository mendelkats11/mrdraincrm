// Business timezone strategy — Phase 10 decision. No timezone constant
// existed anywhere in the codebase before this; every existing date display
// (e.g. the Schedule calendar) formats in whatever the *runtime's* local
// zone happens to be, which is fine for a human at a browser but breaks
// down for a server-side scheduled function running in UTC.
//
// Saskatoon, SK — inferred from the real Saskatoon-area service areas in
// docs/PROJECT_SPEC.md §4 (Brighton, Stonebridge, Martensville, etc.),
// confirmed by the project owner. Saskatchewan is unusual in not observing
// daylight saving time (fixed CST, UTC-6 year-round), which is what makes
// the boundary math below exact rather than approximate — see
// getTimezoneOffsetMinutes.
export const BUSINESS_TIMEZONE = "America/Regina";

export interface ZonedDateTimeParts {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number;
  minute: number;
  second: number;
}

/**
 * The business-timezone offset (in minutes, local minus UTC) in effect at
 * a given instant. Works for any IANA zone, DST or not — for a
 * fixed-offset zone like America/Regina this is simply constant.
 */
function getTimezoneOffsetMinutes(instant: Date, timeZone: string): number {
  const p = rawParts(instant, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return (asUtc - instant.getTime()) / 60_000;
}

function rawParts(instant: Date, timeZone: string): ZonedDateTimeParts {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(instant);

  const map: Record<string, string> = {};
  for (const part of parts) if (part.type !== "literal") map[part.type] = part.value;

  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour),
    minute: Number(map.minute),
    second: Number(map.second),
  };
}

/** The wall-clock date/time components a given instant reads as in the business timezone. */
export function getZonedParts(
  instant: Date,
  timeZone: string = BUSINESS_TIMEZONE,
): ZonedDateTimeParts {
  return rawParts(instant, timeZone);
}

/**
 * The UTC instant corresponding to the given wall-clock date/time in the
 * business timezone. Two-pass offset resolution so this stays exact across
 * a DST transition, should the business timezone ever change to a
 * DST-observing zone — for the current fixed-offset America/Regina, both
 * passes agree and the second is a no-op.
 */
export function zonedPartsToInstant(
  parts: ZonedDateTimeParts,
  timeZone: string = BUSINESS_TIMEZONE,
): Date {
  const guess = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );

  const firstPassOffset = getTimezoneOffsetMinutes(new Date(guess), timeZone);
  const firstPassInstant = guess - firstPassOffset * 60_000;

  const secondPassOffset = getTimezoneOffsetMinutes(new Date(firstPassInstant), timeZone);
  return new Date(guess - secondPassOffset * 60_000);
}

/** The business-timezone calendar date (YYYY-MM-DD) a given instant falls on. */
export function businessDateString(instant: Date, timeZone: string = BUSINESS_TIMEZONE): string {
  const p = getZonedParts(instant, timeZone);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

/** The UTC instant corresponding to 00:00:00 on the given business-timezone calendar date. */
export function startOfBusinessDay(dateString: string, timeZone: string = BUSINESS_TIMEZONE): Date {
  const [year, month, day] = dateString.split("-").map(Number);
  return zonedPartsToInstant({ year, month, day, hour: 0, minute: 0, second: 0 }, timeZone);
}

/** Adds `days` calendar days to a business-timezone date string. */
export function addBusinessDays(dateString: string, days: number): string {
  const [year, month, day] = dateString.split("-").map(Number);
  const d = new Date(Date.UTC(year, month - 1, day + days));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(
    d.getUTCDate(),
  ).padStart(2, "0")}`;
}
