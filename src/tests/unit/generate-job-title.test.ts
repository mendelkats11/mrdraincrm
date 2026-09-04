import { describe, expect, it } from "vitest";
import {
  JOB_TITLE_LOCATIONS,
  JOB_TITLE_SERVICES,
  generateJobTitle,
} from "@/lib/website/generate-job-title";

describe("generateJobTitle", () => {
  it("always contains one real service and one real location", () => {
    for (let i = 0; i < 50; i++) {
      const title = generateJobTitle();
      expect(JOB_TITLE_SERVICES.some((service) => title.includes(service))).toBe(true);
      expect(JOB_TITLE_LOCATIONS.some((location) => title.includes(location))).toBe(true);
    }
  });

  it("never leaves a template placeholder unfilled", () => {
    for (let i = 0; i < 50; i++) {
      expect(generateJobTitle()).not.toMatch(/\{.*\}/);
    }
  });

  it("produces more than one distinct title across many calls", () => {
    const titles = new Set(Array.from({ length: 50 }, () => generateJobTitle()));
    expect(titles.size).toBeGreaterThan(1);
  });
});
