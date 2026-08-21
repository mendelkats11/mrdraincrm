import { describe, expect, it } from "vitest";
import { resolveDateRange } from "@/lib/reports/date-ranges";
import { getZonedParts } from "@/lib/reminders/timezone";

// America/Regina is fixed UTC-6 year-round (no DST), so "now" at 20:00 UTC
// is 14:00 local — safely mid-afternoon, never crossing a day boundary
// between the UTC instant used to construct `now` and the business date.
const NOW = new Date("2026-08-20T20:00:00Z"); // Thursday, Aug 20 2026 local

describe("resolveDateRange", () => {
  it("today: local midnight to next local midnight", () => {
    const { start, end } = resolveDateRange("today", undefined, NOW);
    expect(getZonedParts(start)).toMatchObject({ year: 2026, month: 8, day: 20, hour: 0 });
    expect(getZonedParts(end)).toMatchObject({ year: 2026, month: 8, day: 21, hour: 0 });
  });

  it("yesterday: the day before today, still a 24h window", () => {
    const { start, end } = resolveDateRange("yesterday", undefined, NOW);
    expect(getZonedParts(start)).toMatchObject({ year: 2026, month: 8, day: 19 });
    expect(getZonedParts(end)).toMatchObject({ year: 2026, month: 8, day: 20 });
  });

  it("this_week: Sunday-start, 7 days", () => {
    const { start, end } = resolveDateRange("this_week", undefined, NOW);
    // Aug 20 2026 is a Thursday; the preceding Sunday is Aug 16.
    expect(getZonedParts(start)).toMatchObject({ year: 2026, month: 8, day: 16 });
    expect(getZonedParts(end)).toMatchObject({ year: 2026, month: 8, day: 23 });
  });

  it("this_month / last_month", () => {
    const thisMonth = resolveDateRange("this_month", undefined, NOW);
    expect(getZonedParts(thisMonth.start)).toMatchObject({ year: 2026, month: 8, day: 1 });
    expect(getZonedParts(thisMonth.end)).toMatchObject({ year: 2026, month: 9, day: 1 });

    const lastMonth = resolveDateRange("last_month", undefined, NOW);
    expect(getZonedParts(lastMonth.start)).toMatchObject({ year: 2026, month: 7, day: 1 });
    expect(getZonedParts(lastMonth.end)).toMatchObject({ year: 2026, month: 8, day: 1 });
  });

  it("last_month crosses a year boundary correctly in January", () => {
    const jan = new Date("2026-01-15T20:00:00Z");
    const lastMonth = resolveDateRange("last_month", undefined, jan);
    expect(getZonedParts(lastMonth.start)).toMatchObject({ year: 2025, month: 12, day: 1 });
    expect(getZonedParts(lastMonth.end)).toMatchObject({ year: 2026, month: 1, day: 1 });
  });

  it("this_quarter: Aug falls in Q3 (Jul-Sep)", () => {
    const { start, end } = resolveDateRange("this_quarter", undefined, NOW);
    expect(getZonedParts(start)).toMatchObject({ year: 2026, month: 7, day: 1 });
    expect(getZonedParts(end)).toMatchObject({ year: 2026, month: 10, day: 1 });
  });

  it("this_quarter rolls into the next year from Q4", () => {
    const dec = new Date("2026-12-15T20:00:00Z");
    const { start, end } = resolveDateRange("this_quarter", undefined, dec);
    expect(getZonedParts(start)).toMatchObject({ year: 2026, month: 10, day: 1 });
    expect(getZonedParts(end)).toMatchObject({ year: 2027, month: 1, day: 1 });
  });

  it("this_year / last_year", () => {
    const thisYear = resolveDateRange("this_year", undefined, NOW);
    expect(getZonedParts(thisYear.start)).toMatchObject({ year: 2026, month: 1, day: 1 });
    expect(getZonedParts(thisYear.end)).toMatchObject({ year: 2027, month: 1, day: 1 });

    const lastYear = resolveDateRange("last_year", undefined, NOW);
    expect(getZonedParts(lastYear.start)).toMatchObject({ year: 2025, month: 1, day: 1 });
    expect(getZonedParts(lastYear.end)).toMatchObject({ year: 2026, month: 1, day: 1 });
  });

  it("custom: inclusive end date resolved to the start of the following day", () => {
    const { start, end } = resolveDateRange(
      "custom",
      { start: "2026-08-05", end: "2026-08-07" },
      NOW,
    );
    expect(getZonedParts(start)).toMatchObject({ year: 2026, month: 8, day: 5, hour: 0 });
    expect(getZonedParts(end)).toMatchObject({ year: 2026, month: 8, day: 8, hour: 0 });
  });

  it("custom falls back to this_month when no range is supplied", () => {
    const custom = resolveDateRange("custom", undefined, NOW);
    const thisMonth = resolveDateRange("this_month", undefined, NOW);
    expect(custom).toEqual(thisMonth);
  });
});
