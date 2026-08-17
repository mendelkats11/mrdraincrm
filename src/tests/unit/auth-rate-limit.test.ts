import { describe, expect, it } from "vitest";
import { deterministicIdFrom, normalizeEmail } from "@/lib/auth/rate-limit";

describe("deterministicIdFrom", () => {
  it("is deterministic for the same input", () => {
    expect(deterministicIdFrom("owner@example.com")).toBe(deterministicIdFrom("owner@example.com"));
  });

  it("differs for different input", () => {
    expect(deterministicIdFrom("a@example.com")).not.toBe(deterministicIdFrom("b@example.com"));
  });

  it("produces a well-formed UUID shape", () => {
    expect(deterministicIdFrom("owner@example.com")).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });
});

describe("normalizeEmail", () => {
  it("lowercases and trims", () => {
    expect(normalizeEmail("  Owner@Example.COM  ")).toBe("owner@example.com");
  });
});
