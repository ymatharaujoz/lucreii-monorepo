import { describe, expect, it } from "vitest";
import { calculatePricing, type PricingInputs } from "./pricing-calculations";

const spreadsheetInputs: PricingInputs = {
  target: 0.36,
  productCost: 2.14,
  packagingCost: 0.5,
  shippingFee: 6.55,
  otherFixedCosts: 1,
  marketplaceCommissionRate: 0.12,
  taxRate: 0.04,
  affiliateCommissionRate: 0.08,
  storeCouponRate: 0.03,
  otherVariableCostRate: 0,
};

describe("calculatePricing", () => {
  it("reproduces the contribution margin spreadsheet calculation", () => {
    const calculation = calculatePricing(
      "contribution-margin",
      spreadsheetInputs,
    );

    expect(calculation.ok).toBe(true);
    if (!calculation.ok) return;

    expect(calculation.result.recommendedSalePrice).toBeCloseTo(27.54054, 4);
    expect(calculation.result.contributionMargin).toBeCloseTo(0.36, 8);
    expect(calculation.result.grossProfit).toBeCloseTo(9.91459, 4);
  });

  it("reproduces the desired profit spreadsheet calculation", () => {
    const calculation = calculatePricing("desired-profit", {
      ...spreadsheetInputs,
      target: 9.91,
    });

    expect(calculation.ok).toBe(true);
    if (!calculation.ok) return;

    expect(calculation.result.recommendedSalePrice).toBeCloseTo(27.53424, 4);
    expect(calculation.result.contributionMargin).toBeCloseTo(0.35991, 4);
    expect(calculation.result.grossProfit).toBeCloseTo(9.91, 4);
  });

  it("reproduces the sale price spreadsheet calculation", () => {
    const calculation = calculatePricing("sale-price", {
      ...spreadsheetInputs,
      target: 27.54,
    });

    expect(calculation.ok).toBe(true);
    if (!calculation.ok) return;

    expect(calculation.result.recommendedSalePrice).toBe(27.54);
    expect(calculation.result.contributionMargin).toBeCloseTo(0.35999, 4);
    expect(calculation.result.grossProfit).toBeCloseTo(9.9142, 4);
  });

  it("treats zero costs and rates as valid", () => {
    const calculation = calculatePricing("contribution-margin", {
      target: 0.2,
      productCost: 10,
      packagingCost: 0,
      shippingFee: 0,
      otherFixedCosts: 0,
      marketplaceCommissionRate: 0,
      taxRate: 0,
      affiliateCommissionRate: 0,
      storeCouponRate: 0,
      otherVariableCostRate: 0,
    });

    expect(calculation.ok).toBe(true);
    if (!calculation.ok) return;

    expect(calculation.result.recommendedSalePrice).toBeCloseTo(12.5, 8);
    expect(calculation.result.grossProfit).toBeCloseTo(2.5, 8);
  });

  it.each([
    ["negative cost", { ...spreadsheetInputs, productCost: -1 }],
    ["invalid rate", { ...spreadsheetInputs, taxRate: 1.01 }],
    ["zero sale price", { ...spreadsheetInputs, target: 0 }],
  ])("blocks %s", (_label, inputs) => {
    const calculation = calculatePricing("sale-price", inputs);

    expect(calculation.ok).toBe(false);
  });

  it("blocks a contribution margin denominator at or below zero", () => {
    const calculation = calculatePricing("contribution-margin", {
      ...spreadsheetInputs,
      target: 0.8,
      marketplaceCommissionRate: 0.2,
    });

    expect(calculation).toMatchObject({ ok: false });
    if (calculation.ok) return;

    expect(calculation.errors[0]?.code).toBe("invalid-denominator");
  });

  it("blocks a desired profit denominator at or below zero", () => {
    const calculation = calculatePricing("desired-profit", {
      ...spreadsheetInputs,
      target: 10,
      marketplaceCommissionRate: 1,
    });

    expect(calculation).toMatchObject({ ok: false });
    if (calculation.ok) return;

    expect(calculation.errors[0]?.code).toBe("invalid-denominator");
  });
});
