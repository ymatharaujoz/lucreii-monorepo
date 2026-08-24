import { describe, expect, it } from "vitest";
import {
  breakEvenRoasSimulationBulkDeleteSchema,
  breakEvenRoasSimulationFormSchema,
  breakEvenRoasSimulationListApiResponseSchema,
  breakEvenRoasSimulationListQuerySchema,
} from "./break-even-roas-simulations";

describe("break-even ROAS simulation validation", () => {
  it("requires an identifier and accepts a normalized margin", () => {
    expect(
      breakEvenRoasSimulationFormSchema.safeParse({
        adsInvestment: null,
        adsRoas: null,
        contributionMarginRate: "0.150000",
        productIdentifier: "CAM-01",
      }).success,
    ).toBe(true);
    expect(
      breakEvenRoasSimulationFormSchema.safeParse({
        contributionMarginRate: "0.150000",
        productIdentifier: "",
      }).success,
    ).toBe(false);
  });

  it("rejects invalid margins and supports server sorting", () => {
    expect(
      breakEvenRoasSimulationFormSchema.safeParse({
        contributionMarginRate: "1.000001",
        productIdentifier: "CAM-01",
      }).success,
    ).toBe(false);
    expect(
      breakEvenRoasSimulationFormSchema.safeParse({
        adsInvestment: "-1",
        adsRoas: null,
        contributionMarginRate: "0.150000",
        productIdentifier: "CAM-01",
      }).success,
    ).toBe(false);
    expect(
      breakEvenRoasSimulationFormSchema.safeParse({
        adsInvestment: "289.000000",
        adsRoas: "3.000000",
        contributionMarginRate: "0.150000",
        productIdentifier: "CAM-01",
      }).success,
    ).toBe(true);
    expect(
      breakEvenRoasSimulationListQuerySchema.parse({
        page: "2",
        pageSize: "10",
        sortBy: "breakEvenRoas",
        sortDirection: "desc",
      }),
    ).toEqual({
      page: 2,
      pageSize: 10,
      sortBy: "breakEvenRoas",
      sortDirection: "desc",
    });
  });

  it("validates bulk IDs and normalizes an empty successful response", () => {
    expect(
      breakEvenRoasSimulationBulkDeleteSchema.safeParse({
        ids: ["22222222-2222-4222-8222-222222222222"],
      }).success,
    ).toBe(true);
    expect(
      breakEvenRoasSimulationBulkDeleteSchema.safeParse({ ids: [] }).success,
    ).toBe(false);

    const response = breakEvenRoasSimulationListApiResponseSchema.parse({
      data: [],
      error: null,
    });
    expect(response.data.items).toEqual([]);
    expect(response.data.totalPages).toBe(1);
  });
});
