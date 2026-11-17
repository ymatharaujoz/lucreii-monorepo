import { describe, expect, it } from "vitest";
import {
  allocateAdGroupCostsToListings,
  centsToDecimalString,
} from "./listing-advertising-allocation";

describe("allocateAdGroupCostsToListings", () => {
  it("assigns an ad group cost to the single listing it promotes", () => {
    const allocation = allocateAdGroupCostsToListings(
      new Map([["MLB123", 15_050]]),
      [{ advertisingKey: "mercadolivre:MLB123", marketplaceIds: ["MLB123"], sales: 3 }],
    );

    expect(allocation).toEqual(new Map([["mercadolivre:MLB123", 15_050]]));
  });

  it("splits a shared ad group proportionally to units sold, keeping every cent", () => {
    const allocation = allocateAdGroupCostsToListings(new Map([["FAM1", 1_000]]), [
      { advertisingKey: "product:a", marketplaceIds: ["FAM1"], sales: 1 },
      { advertisingKey: "product:b", marketplaceIds: ["FAM1"], sales: 2 },
    ]);

    expect(allocation.get("product:a")).toBe(333);
    expect(allocation.get("product:b")).toBe(667);
  });

  it("splits evenly when no listing of the ad group sold", () => {
    const allocation = allocateAdGroupCostsToListings(new Map([["FAM1", 1_001]]), [
      { advertisingKey: "product:a", marketplaceIds: ["FAM1"], sales: 0 },
      { advertisingKey: "product:b", marketplaceIds: ["FAM1"], sales: 0 },
    ]);

    expect(
      (allocation.get("product:a") ?? 0) + (allocation.get("product:b") ?? 0),
    ).toBe(1_001);
    expect(allocation.get("product:a")).toBe(500);
  });

  it("sums several ad groups matching the same listing (e.g. legacy item id)", () => {
    const allocation = allocateAdGroupCostsToListings(
      new Map([
        ["FAM1", 200],
        ["MLB999", 300],
      ]),
      [{ advertisingKey: "mercadolivre:FAM1", marketplaceIds: ["FAM1", "MLB999"], sales: 0 }],
    );

    expect(allocation.get("mercadolivre:FAM1")).toBe(500);
  });

  it("keeps zero-cost matches and leaves unmatched listings out", () => {
    const allocation = allocateAdGroupCostsToListings(
      new Map([
        ["MLB1", 0],
        ["MLB-unknown", 900],
      ]),
      [
        { advertisingKey: "mercadolivre:MLB1", marketplaceIds: ["MLB1"], sales: 4 },
        { advertisingKey: "mercadolivre:MLB2", marketplaceIds: ["MLB2"], sales: 4 },
      ],
    );

    expect(allocation).toEqual(new Map([["mercadolivre:MLB1", 0]]));
  });
});

describe("centsToDecimalString", () => {
  it("formats integer cents as an API decimal", () => {
    expect(centsToDecimalString(123_405)).toBe("1234.05");
    expect(centsToDecimalString(0)).toBe("0.00");
  });
});
