import { describe, expect, it } from "vitest";
import { pricingSimulationFormSchema } from "./pricing-simulations";

const validInput = {
  affiliateCommissionRate: "0.00",
  marketplaceCommissionRate: "0.10",
  mode: "contribution-margin" as const,
  otherFixedCosts: "0.00",
  otherVariableCostRate: "0.00",
  packagingCost: "1.00",
  productCost: "10.00",
  productName: null,
  productSku: "SKU-1",
  shippingFee: "0.00",
  storeCouponRate: "0.00",
  target: "0.36",
  taxRate: "0.09",
};

describe("pricing simulation validation", () => {
  it("requires SKU or product name", () => {
    const result = pricingSimulationFormSchema.safeParse({
      ...validInput,
      productName: null,
      productSku: null,
    });

    expect(result.success).toBe(false);
  });

  it("normalizes blank identifiers and accepts one identifier", () => {
    const result = pricingSimulationFormSchema.safeParse({
      ...validInput,
      productName: "Produto",
      productSku: "",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.productSku).toBeNull();
    }
  });

  it("rejects rates outside the allowed range", () => {
    const result = pricingSimulationFormSchema.safeParse({
      ...validInput,
      marketplaceCommissionRate: "1.01",
    });

    expect(result.success).toBe(false);
  });
});
