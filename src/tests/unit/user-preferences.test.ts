import { describe, expect, it } from "vitest";
import { applyOrderAndVisibility } from "@/lib/preferences/apply-order";

const DEFAULT_ORDER = ["a", "b", "c", "d"];

describe("applyOrderAndVisibility", () => {
  it("returns the default order when nothing is saved", () => {
    expect(applyOrderAndVisibility(DEFAULT_ORDER, [], [])).toEqual(["a", "b", "c", "d"]);
  });

  it("reorders known ids to match the saved order", () => {
    expect(applyOrderAndVisibility(DEFAULT_ORDER, ["c", "a", "b", "d"], [])).toEqual([
      "c",
      "a",
      "b",
      "d",
    ]);
  });

  it("appends a new default id the saved order predates, rather than dropping it", () => {
    // "d" didn't exist yet when this order was saved.
    expect(applyOrderAndVisibility(DEFAULT_ORDER, ["c", "a", "b"], [])).toEqual([
      "c",
      "a",
      "b",
      "d",
    ]);
  });

  it("drops hidden ids after ordering", () => {
    expect(applyOrderAndVisibility(DEFAULT_ORDER, ["c", "a", "b", "d"], ["a", "d"])).toEqual([
      "c",
      "b",
    ]);
  });

  it("ignores a saved id that no longer exists in the default set", () => {
    expect(applyOrderAndVisibility(DEFAULT_ORDER, ["z", "c", "a"], [])).toEqual([
      "c",
      "a",
      "b",
      "d",
    ]);
  });
});
