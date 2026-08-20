import { describe, expect, it } from "vitest";
import {
  areAllVisibleSelected,
  toggleSelectedId,
  toggleVisibleSelection,
} from "./pricing-simulations-selection";

describe("pricing simulation selection", () => {
  it("toggles one simulation without changing the others", () => {
    expect(toggleSelectedId(["a", "b"], "b")).toEqual(["a"]);
    expect(toggleSelectedId(["a"], "c")).toEqual(["a", "c"]);
  });

  it("selects and clears only the visible page", () => {
    expect(toggleVisibleSelection(["previous"], ["a", "b"])).toEqual([
      "previous",
      "a",
      "b",
    ]);
    expect(toggleVisibleSelection(["previous", "a", "b"], ["a", "b"])).toEqual([
      "previous",
    ]);
  });

  it("reports the header state from visible rows only", () => {
    expect(areAllVisibleSelected(["a", "b", "previous"], ["a", "b"])).toBe(
      true,
    );
    expect(areAllVisibleSelected(["a"], ["a", "b"])).toBe(false);
    expect(areAllVisibleSelected(["a"], [])).toBe(false);
  });
});
