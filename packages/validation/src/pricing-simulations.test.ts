import { describe, expect, it } from "vitest";
import {
  pricingSimulationFormSchema,
  pricingSimulationListApiResponseSchema,
  pricingSimulationListQuerySchema,
} from "./pricing-simulations";

const validInput = {
  affiliateCommissionRate: "0.00",
  marketplaceCommissionRate: "0.10",
  mode: "contribution-margin" as const,
  otherFixedCosts: "0.00",
  otherVariableCostRate: "0.00",
  packagingCost: "1.00",
  productCost: "10.00",
  productIdentifier: "SKU-1",
  shippingFee: "0.00",
  storeCouponRate: "0.00",
  target: "0.36",
  taxRate: "0.09",
};

describe("pricing simulation validation", () => {
  it("requires a product name or SKU", () => {
    const result = pricingSimulationFormSchema.safeParse({
      ...validInput,
      productIdentifier: null,
    });

    expect(result.success).toBe(false);
  });

  it("normalizes blank identifiers", () => {
    const result = pricingSimulationFormSchema.safeParse({
      ...validInput,
      productIdentifier: "",
    });

    expect(result.success).toBe(false);

    const namedResult = pricingSimulationFormSchema.safeParse({
      ...validInput,
      productIdentifier: "Produto",
    });

    expect(namedResult.success).toBe(true);
  });

  it("rejects rates outside the allowed range", () => {
    const result = pricingSimulationFormSchema.safeParse({
      ...validInput,
      marketplaceCommissionRate: "1.01",
    });

    expect(result.success).toBe(false);
  });

  it("accepts the supported server-side sorting fields", () => {
    expect(
      pricingSimulationListQuerySchema.parse({
        page: "2",
        pageSize: "10",
        sortBy: "grossProfit",
        sortDirection: "desc",
      }),
    ).toEqual({
      page: 2,
      pageSize: 10,
      sortBy: "grossProfit",
      sortDirection: "desc",
    });

    expect(
      pricingSimulationListQuerySchema.safeParse({ sortBy: "companyId" })
        .success,
    ).toBe(false);
  });

  it("normalizes an empty 200 response into an empty list", () => {
    for (const payload of [
      null,
      { data: [], error: null },
      { data: { items: [] }, error: null },
    ]) {
      const result = pricingSimulationListApiResponseSchema.safeParse(payload);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.data.items).toEqual([]);
        expect(result.data.data.totalItems).toBe(0);
      }
    }

    expect(
      pricingSimulationListApiResponseSchema.safeParse({
        data: null,
        error: { message: "failure" },
      }).success,
    ).toBe(false);
  });
});
