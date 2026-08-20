import { describe, expect, it } from "vitest";
import { calculateBreakEvenRoas } from "./pricing";

describe("break-even ROAS formula", () => {
  it("calculates one divided by the normalized margin", () => {
    expect(calculateBreakEvenRoas(0.15)).toBeCloseTo(6.666667, 6);
  });

  it("rejects empty and out-of-range margins", () => {
    expect(calculateBreakEvenRoas(0)).toBeNull();
    expect(calculateBreakEvenRoas(-0.01)).toBeNull();
    expect(calculateBreakEvenRoas(1.01)).toBeNull();
    expect(calculateBreakEvenRoas(Number.NaN)).toBeNull();
  });
});
