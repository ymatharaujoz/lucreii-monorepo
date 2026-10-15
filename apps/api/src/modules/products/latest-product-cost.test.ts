import { describe, expect, it } from "vitest";
import { pickLatestProductCost } from "./latest-product-cost";

describe("pickLatestProductCost", () => {
  it("returns null when there are no costs", () => {
    expect(pickLatestProductCost([])).toBeNull();
    expect(pickLatestProductCost(undefined)).toBeNull();
  });

  it("ranks by effectiveFrom ?? createdAt, not by NULLs first", () => {
    const undated = {
      amount: "10.00",
      createdAt: new Date("2026-01-10T00:00:00.000Z"),
      effectiveFrom: null,
    };
    const dated = {
      amount: "20.00",
      createdAt: new Date("2026-03-01T00:00:00.000Z"),
      effectiveFrom: "2026-03-01",
    };

    expect(pickLatestProductCost([undated, dated])).toBe(dated);
    expect(pickLatestProductCost([dated, undated])).toBe(dated);
  });

  it("lets a newer undated row win over an older dated row", () => {
    const olderDated = {
      amount: "10.00",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      effectiveFrom: "2026-01-01",
    };
    const newerUndated = {
      amount: "53.50",
      createdAt: new Date("2026-05-01T00:00:00.000Z"),
      effectiveFrom: null,
    };

    expect(pickLatestProductCost([olderDated, newerUndated])).toBe(
      newerUndated,
    );
  });

  it("breaks ties with createdAt", () => {
    const first = {
      amount: "1.00",
      createdAt: new Date("2026-02-01T08:00:00.000Z"),
      effectiveFrom: "2026-02-01",
    };
    const second = {
      amount: "2.00",
      createdAt: new Date("2026-02-01T09:00:00.000Z"),
      effectiveFrom: "2026-02-01",
    };

    expect(pickLatestProductCost([first, second])).toBe(second);
  });
});
