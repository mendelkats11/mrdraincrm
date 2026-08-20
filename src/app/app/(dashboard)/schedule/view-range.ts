import {
  endOfDay,
  endOfWeek,
  monthGridRange,
  startOfDay,
  startOfWeek,
} from "@/lib/schedule/ranges";

export type ScheduleView = "day" | "week" | "month" | "list";

export function parseView(value: string | undefined): ScheduleView {
  return value === "week" || value === "month" || value === "list" ? value : "day";
}

const HEADING_FMT = {
  day: new Intl.DateTimeFormat("en-CA", { dateStyle: "full" }),
  month: new Intl.DateTimeFormat("en-CA", { month: "long", year: "numeric" }),
  short: new Intl.DateTimeFormat("en-CA", { month: "short", day: "numeric" }),
};

/**
 * The query range for each view, and a human-readable heading for it.
 * List reuses Week's range — ROADMAP/PROJECT_SPEC don't define a distinct
 * period for List, and matching Week keeps Previous/Next behavior
 * consistent (always a 7-day jump) across the two views that would
 * otherwise disagree about what "next" means.
 */
export function getViewRange(
  view: ScheduleView,
  date: Date,
): { start: Date; end: Date; heading: string } {
  if (view === "day") {
    return { start: startOfDay(date), end: endOfDay(date), heading: HEADING_FMT.day.format(date) };
  }
  if (view === "month") {
    const grid = monthGridRange(date);
    return { ...grid, heading: HEADING_FMT.month.format(date) };
  }
  // week and list
  const start = startOfWeek(date);
  const end = endOfWeek(date);
  const lastDay = new Date(end.getTime() - 24 * 60 * 60 * 1000);
  return {
    start,
    end,
    heading: `${HEADING_FMT.short.format(start)} – ${HEADING_FMT.short.format(lastDay)}`,
  };
}
