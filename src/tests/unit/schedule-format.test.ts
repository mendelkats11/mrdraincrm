import { describe, expect, it } from "vitest";
import { formatScheduleSummary, formatTimeRange } from "@/lib/schedule/format";

const start = new Date(2026, 7, 17, 10, 0);
const end = new Date(2026, 7, 17, 12, 0);

describe("formatScheduleSummary", () => {
  it("shows a dash for an unscheduled job", () => {
    expect(
      formatScheduleSummary({ scheduledStart: null, scheduledEnd: null, timeTbd: false }),
    ).toBe("—");
  });

  it("shows date + start time only when there's no end", () => {
    expect(
      formatScheduleSummary({ scheduledStart: start, scheduledEnd: null, timeTbd: false }),
    ).toBe("Aug 17, 10:00 a.m.");
  });

  it("shows a date + time range when both start and end are set", () => {
    expect(
      formatScheduleSummary({ scheduledStart: start, scheduledEnd: end, timeTbd: false }),
    ).toBe("Aug 17, 10:00 a.m.–12:00 p.m.");
  });

  it("shows 'Time TBD' instead of a time when timeTbd is set, even with an end time present", () => {
    expect(formatScheduleSummary({ scheduledStart: start, scheduledEnd: end, timeTbd: true })).toBe(
      "Aug 17 · Time TBD",
    );
  });
});

describe("formatTimeRange", () => {
  it("shows a dash for an unscheduled job", () => {
    expect(formatTimeRange({ scheduledStart: null, scheduledEnd: null, timeTbd: false })).toBe("—");
  });

  it("shows 'Any time' for a Time TBD job", () => {
    expect(formatTimeRange({ scheduledStart: start, scheduledEnd: null, timeTbd: true })).toBe(
      "Any time",
    );
  });

  it("shows the start time only when there's no end", () => {
    expect(formatTimeRange({ scheduledStart: start, scheduledEnd: null, timeTbd: false })).toBe(
      "10:00 a.m.",
    );
  });

  it("shows a time range when both start and end are set", () => {
    expect(formatTimeRange({ scheduledStart: start, scheduledEnd: end, timeTbd: false })).toBe(
      "10:00 a.m.–12:00 p.m.",
    );
  });
});
