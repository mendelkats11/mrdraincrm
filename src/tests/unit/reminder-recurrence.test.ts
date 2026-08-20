import { describe, expect, it } from "vitest";
import { computeNextOccurrence } from "@/lib/reminders/recurrence";
import { zonedPartsToInstant } from "@/lib/reminders/timezone";

function at(year: number, month: number, day: number, hour = 9, minute = 0): Date {
  return zonedPartsToInstant({ year, month, day, hour, minute, second: 0 });
}

describe("computeNextOccurrence", () => {
  it("one_time never recurs", () => {
    expect(computeNextOccurrence(at(2026, 6, 15), "one_time")).toBeNull();
  });

  it("custom has no defined interval and never recurs (Phase 10 scope)", () => {
    expect(computeNextOccurrence(at(2026, 6, 15), "custom")).toBeNull();
  });

  it("daily advances exactly one calendar day, same time of day", () => {
    const next = computeNextOccurrence(at(2026, 6, 15, 9, 0), "daily");
    expect(next).toEqual(at(2026, 6, 16, 9, 0));
  });

  it("weekly advances exactly seven days, same time of day", () => {
    const next = computeNextOccurrence(at(2026, 6, 15, 9, 0), "weekly");
    expect(next).toEqual(at(2026, 6, 22, 9, 0));
  });

  it("monthly advances one month, same day and time", () => {
    const next = computeNextOccurrence(at(2026, 6, 15, 9, 0), "monthly");
    expect(next).toEqual(at(2026, 7, 15, 9, 0));
  });

  it("monthly from the 31st clamps to the last day of a 30-day month", () => {
    const next = computeNextOccurrence(at(2026, 1, 31, 9, 0), "monthly");
    expect(next).toEqual(at(2026, 2, 28, 9, 0)); // 2026 is not a leap year
  });

  it("monthly from the 31st clamps to Feb 29 in a leap year", () => {
    const next = computeNextOccurrence(at(2028, 1, 31, 9, 0), "monthly");
    expect(next).toEqual(at(2028, 2, 29, 9, 0)); // 2028 is a leap year
  });

  it("monthly rolls over a year boundary (Dec -> Jan)", () => {
    const next = computeNextOccurrence(at(2026, 12, 15, 9, 0), "monthly");
    expect(next).toEqual(at(2027, 1, 15, 9, 0));
  });

  it("yearly advances exactly one year, same month/day/time", () => {
    const next = computeNextOccurrence(at(2026, 6, 15, 9, 0), "yearly");
    expect(next).toEqual(at(2027, 6, 15, 9, 0));
  });

  it("yearly from Feb 29 in a leap year clamps to Feb 28 in a non-leap year", () => {
    const next = computeNextOccurrence(at(2028, 2, 29, 9, 0), "yearly");
    expect(next).toEqual(at(2029, 2, 28, 9, 0));
  });

  it("advancing preserves the original time of day across the month-end clamp", () => {
    const next = computeNextOccurrence(at(2026, 5, 31, 14, 45), "monthly");
    expect(next).toEqual(at(2026, 6, 30, 14, 45));
  });
});
