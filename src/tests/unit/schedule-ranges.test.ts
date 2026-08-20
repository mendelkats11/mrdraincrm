import { describe, expect, it } from "vitest";
import {
  addDays,
  eachDayInRange,
  endOfDay,
  endOfMonth,
  endOfWeek,
  isSameDay,
  monthGridRange,
  parseDateParam,
  startOfDay,
  startOfMonth,
  startOfWeek,
  toDateParam,
} from "@/lib/schedule/ranges";

describe("startOfDay / endOfDay", () => {
  it("normalizes to midnight and the next midnight", () => {
    const d = new Date(2026, 7, 17, 14, 30);
    expect(startOfDay(d)).toEqual(new Date(2026, 7, 17, 0, 0, 0, 0));
    expect(endOfDay(d)).toEqual(new Date(2026, 7, 18, 0, 0, 0, 0));
  });
});

describe("startOfWeek / endOfWeek", () => {
  it("starts on Sunday", () => {
    // Aug 17 2026 is a Monday.
    const monday = new Date(2026, 7, 17);
    expect(startOfWeek(monday)).toEqual(new Date(2026, 7, 16));
    expect(endOfWeek(monday)).toEqual(new Date(2026, 7, 23));
  });

  it("a Sunday is its own week start", () => {
    const sunday = new Date(2026, 7, 16);
    expect(startOfWeek(sunday)).toEqual(new Date(2026, 7, 16));
  });
});

describe("startOfMonth / endOfMonth", () => {
  it("returns the first day of this month and next month", () => {
    const mid = new Date(2026, 7, 17);
    expect(startOfMonth(mid)).toEqual(new Date(2026, 7, 1));
    expect(endOfMonth(mid)).toEqual(new Date(2026, 8, 1));
  });
});

describe("monthGridRange", () => {
  it("covers full weeks including adjacent-month padding days", () => {
    // August 2026: Aug 1 is a Saturday, Aug 31 is a Monday.
    const range = monthGridRange(new Date(2026, 7, 17));
    expect(range.start).toEqual(new Date(2026, 6, 26)); // Sunday before Aug 1
    expect(range.end).toEqual(new Date(2026, 8, 6)); // Sunday after the week containing Aug 31
    // The grid always divides evenly into 7-day weeks.
    const totalDays = (range.end.getTime() - range.start.getTime()) / (1000 * 60 * 60 * 24);
    expect(totalDays % 7).toBe(0);
  });
});

describe("eachDayInRange", () => {
  it("lists every day, start inclusive, end exclusive", () => {
    const days = eachDayInRange(new Date(2026, 7, 1), new Date(2026, 7, 4));
    expect(days).toEqual([new Date(2026, 7, 1), new Date(2026, 7, 2), new Date(2026, 7, 3)]);
  });
});

describe("addDays", () => {
  it("adds and subtracts days, crossing month boundaries", () => {
    expect(addDays(new Date(2026, 7, 31), 1)).toEqual(new Date(2026, 8, 1));
    expect(addDays(new Date(2026, 7, 1), -1)).toEqual(new Date(2026, 6, 31));
  });
});

describe("toDateParam / parseDateParam", () => {
  it("round-trips a date through the query-param format", () => {
    const d = new Date(2026, 7, 5);
    expect(toDateParam(d)).toBe("2026-08-05");
    expect(parseDateParam("2026-08-05")).toEqual(d);
  });

  it("falls back to today for missing or invalid input", () => {
    expect(isSameDay(parseDateParam(undefined), startOfDay(new Date()))).toBe(true);
    expect(isSameDay(parseDateParam("not-a-date"), startOfDay(new Date()))).toBe(true);
  });
});

describe("isSameDay", () => {
  it("compares calendar day regardless of time", () => {
    expect(isSameDay(new Date(2026, 7, 17, 1), new Date(2026, 7, 17, 23))).toBe(true);
    expect(isSameDay(new Date(2026, 7, 17), new Date(2026, 7, 18))).toBe(false);
  });
});
