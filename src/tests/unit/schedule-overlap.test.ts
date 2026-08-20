import { describe, expect, it } from "vitest";
import { jobsConflict, rangesOverlap, toConflictRange } from "@/lib/schedule/overlap";

function at(hour: number, minute = 0, day = 15): Date {
  return new Date(2026, 7, day, hour, minute); // August 2026
}

describe("rangesOverlap", () => {
  it("detects overlapping ranges", () => {
    expect(rangesOverlap({ start: at(10), end: at(12) }, { start: at(11), end: at(13) })).toBe(
      true,
    );
  });

  it("touching ranges do not overlap", () => {
    expect(rangesOverlap({ start: at(10), end: at(12) }, { start: at(12), end: at(14) })).toBe(
      false,
    );
  });

  it("non-overlapping ranges do not overlap", () => {
    expect(rangesOverlap({ start: at(10), end: at(11) }, { start: at(13), end: at(14) })).toBe(
      false,
    );
  });

  it("one range fully containing another overlaps", () => {
    expect(rangesOverlap({ start: at(9), end: at(17) }, { start: at(10), end: at(11) })).toBe(true);
  });
});

describe("toConflictRange", () => {
  it("returns null for a job with no scheduledStart", () => {
    expect(
      toConflictRange({ scheduledStart: null, scheduledEnd: null, timeTbd: false }),
    ).toBeNull();
  });

  it("returns null for a Time TBD job even with a start set", () => {
    expect(
      toConflictRange({ scheduledStart: at(10), scheduledEnd: null, timeTbd: true }),
    ).toBeNull();
  });

  it("uses the real end when scheduledEnd is set", () => {
    const range = toConflictRange({ scheduledStart: at(10), scheduledEnd: at(11), timeTbd: false });
    expect(range).toEqual({ start: at(10), end: at(11) });
  });

  it("assumes a 2-hour duration when scheduledEnd is absent", () => {
    const range = toConflictRange({ scheduledStart: at(10), scheduledEnd: null, timeTbd: false });
    expect(range).toEqual({ start: at(10), end: at(12) });
  });
});

describe("jobsConflict", () => {
  it("flags overlapping timed jobs", () => {
    const a = { scheduledStart: at(10), scheduledEnd: at(12), timeTbd: false };
    const b = { scheduledStart: at(11), scheduledEnd: at(13), timeTbd: false };
    expect(jobsConflict(a, b)).toBe(true);
  });

  it("does not flag touching/non-overlapping jobs", () => {
    const a = { scheduledStart: at(10), scheduledEnd: at(12), timeTbd: false };
    const b = { scheduledStart: at(12), scheduledEnd: at(13), timeTbd: false };
    expect(jobsConflict(a, b)).toBe(false);
  });

  it("does not flag jobs on different days at the same time", () => {
    const a = { scheduledStart: at(10, 0, 15), scheduledEnd: at(12, 0, 15), timeTbd: false };
    const b = { scheduledStart: at(10, 0, 16), scheduledEnd: at(12, 0, 16), timeTbd: false };
    expect(jobsConflict(a, b)).toBe(false);
  });

  it("applies the 2-hour heuristic to open-ended jobs — flags an overlap the heuristic would catch", () => {
    const openEnded = { scheduledStart: at(10), scheduledEnd: null, timeTbd: false }; // heuristic: 10-12
    const overlapping = { scheduledStart: at(11), scheduledEnd: at(11, 30), timeTbd: false };
    expect(jobsConflict(openEnded, overlapping)).toBe(true);
  });

  it("applies the 2-hour heuristic to open-ended jobs — does not flag a job outside the heuristic window", () => {
    const openEnded = { scheduledStart: at(10), scheduledEnd: null, timeTbd: false }; // heuristic: 10-12
    const later = { scheduledStart: at(13), scheduledEnd: at(14), timeTbd: false };
    expect(jobsConflict(openEnded, later)).toBe(false);
  });

  it("two open-ended jobs starting an hour apart conflict under the 2-hour heuristic", () => {
    const a = { scheduledStart: at(10), scheduledEnd: null, timeTbd: false }; // 10-12
    const b = { scheduledStart: at(11), scheduledEnd: null, timeTbd: false }; // 11-13
    expect(jobsConflict(a, b)).toBe(true);
  });

  it("never flags a Time TBD job as conflicting, even at an overlapping time", () => {
    const tbd = { scheduledStart: at(10), scheduledEnd: at(12), timeTbd: true };
    const timed = { scheduledStart: at(11), scheduledEnd: at(13), timeTbd: false };
    expect(jobsConflict(tbd, timed)).toBe(false);
    expect(jobsConflict(timed, tbd)).toBe(false);
  });

  it("never flags an unscheduled job (no scheduledStart) as conflicting", () => {
    const unscheduled = { scheduledStart: null, scheduledEnd: null, timeTbd: false };
    const timed = { scheduledStart: at(11), scheduledEnd: at(13), timeTbd: false };
    expect(jobsConflict(unscheduled, timed)).toBe(false);
  });
});
