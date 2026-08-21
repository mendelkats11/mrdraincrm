import { describe, expect, it } from "vitest";
import {
  ACCENT_COLOR_OPTIONS,
  DEFAULT_ACCENT_COLOR,
  DEFAULT_FONT_FAMILY,
  FONT_FAMILY_OPTIONS,
  resolveAccentColor,
  resolveFontFamily,
} from "@/lib/pdf/invoice-template";

describe("resolveAccentColor", () => {
  it("returns the default for null/undefined", () => {
    expect(resolveAccentColor(null)).toBe(DEFAULT_ACCENT_COLOR);
    expect(resolveAccentColor(undefined)).toBe(DEFAULT_ACCENT_COLOR);
  });

  it("returns the default for a value outside the curated palette", () => {
    expect(resolveAccentColor("#ff00ff")).toBe(DEFAULT_ACCENT_COLOR);
  });

  it("passes through any curated option", () => {
    for (const option of ACCENT_COLOR_OPTIONS) {
      expect(resolveAccentColor(option.value)).toBe(option.value);
    }
  });
});

describe("resolveFontFamily", () => {
  it("returns the default for null/undefined", () => {
    expect(resolveFontFamily(null)).toBe(DEFAULT_FONT_FAMILY);
    expect(resolveFontFamily(undefined)).toBe(DEFAULT_FONT_FAMILY);
  });

  it("returns the default for a font outside the curated list", () => {
    expect(resolveFontFamily("Comic Sans MS")).toBe(DEFAULT_FONT_FAMILY);
  });

  it("passes through any curated option", () => {
    for (const option of FONT_FAMILY_OPTIONS) {
      expect(resolveFontFamily(option.value)).toBe(option.value);
    }
  });
});
