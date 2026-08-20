import { describe, expect, it } from "vitest";
import {
  addBusinessDays,
  businessDateString,
  getZonedParts,
  startOfBusinessDay,
  zonedPartsToInstant,
} from "@/lib/reminders/timezone";

// America/Regina is fixed CST (UTC-6), no DST — these exact-offset
// assertions are correct precisely because of that; a DST-observing zone
// would need the boundary to shift twice a year.
describe("businessDateString", () => {
  it("reads the correct calendar date even when UTC has already rolled to the next day", () => {
    // 2026-06-15T04:00:00Z is 2026-06-14T22:00:00 in America/Regina (UTC-6).
    const instant = new Date("2026-06-15T04:00:00Z");
    expect(businessDateString(instant)).toBe("2026-06-14");
  });

  it("reads the correct calendar date when UTC is still on the same day", () => {
    // 2026-06-15T18:00:00Z is 2026-06-15T12:00:00 in America/Regina.
    const instant = new Date("2026-06-15T18:00:00Z");
    expect(businessDateString(instant)).toBe("2026-06-15");
  });
});

describe("startOfBusinessDay", () => {
  it("00:00 America/Regina is 06:00 UTC the same day", () => {
    const instant = startOfBusinessDay("2026-06-15");
    expect(instant.toISOString()).toBe("2026-06-15T06:00:00.000Z");
  });
});

describe("zonedPartsToInstant / getZonedParts round-trip", () => {
  it("round-trips a wall-clock time through UTC and back", () => {
    const parts = { year: 2026, month: 3, day: 10, hour: 9, minute: 30, second: 0 };
    const instant = zonedPartsToInstant(parts);
    expect(getZonedParts(instant)).toEqual(parts);
  });

  it("9am America/Regina is 3pm UTC", () => {
    const instant = zonedPartsToInstant({
      year: 2026,
      month: 3,
      day: 10,
      hour: 9,
      minute: 0,
      second: 0,
    });
    expect(instant.toISOString()).toBe("2026-03-10T15:00:00.000Z");
  });
});

describe("addBusinessDays", () => {
  it("adds days within a month", () => {
    expect(addBusinessDays("2026-06-15", 1)).toBe("2026-06-16");
  });

  it("rolls over a month boundary", () => {
    expect(addBusinessDays("2026-06-30", 1)).toBe("2026-07-01");
  });

  it("rolls over a year boundary", () => {
    expect(addBusinessDays("2026-12-31", 1)).toBe("2027-01-01");
  });
});
