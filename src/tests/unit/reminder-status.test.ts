import { describe, expect, it } from "vitest";
import { classifyReminderTiming } from "@/lib/reminders/status";
import { zonedPartsToInstant } from "@/lib/reminders/timezone";

function at(year: number, month: number, day: number, hour = 9, minute = 0): Date {
  return zonedPartsToInstant({ year, month, day, hour, minute, second: 0 });
}

describe("classifyReminderTiming", () => {
  const now = at(2026, 6, 15, 12, 0); // noon business time on June 15

  it("is overdue when dueAt was before today", () => {
    expect(classifyReminderTiming(at(2026, 6, 14, 9, 0), now)).toBe("overdue");
  });

  it("is due_today when dueAt is earlier today, even though the time has passed", () => {
    expect(classifyReminderTiming(at(2026, 6, 15, 9, 0), now)).toBe("due_today");
  });

  it("is due_today when dueAt is later today", () => {
    expect(classifyReminderTiming(at(2026, 6, 15, 18, 0), now)).toBe("due_today");
  });

  it("is upcoming when dueAt is tomorrow", () => {
    expect(classifyReminderTiming(at(2026, 6, 16, 0, 0), now)).toBe("upcoming");
  });

  it("is upcoming when dueAt is further in the future", () => {
    expect(classifyReminderTiming(at(2026, 7, 1, 9, 0), now)).toBe("upcoming");
  });

  it("classifies correctly right at the day boundary — 23:59 today is due_today, 00:00 tomorrow is upcoming", () => {
    expect(classifyReminderTiming(at(2026, 6, 15, 23, 59), now)).toBe("due_today");
    expect(classifyReminderTiming(at(2026, 6, 16, 0, 0), now)).toBe("upcoming");
  });
});
