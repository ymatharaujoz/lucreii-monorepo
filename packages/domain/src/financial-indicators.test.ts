import { describe, expect, it } from "vitest";
import {
  calculateFinancialIndicators,
  sumMoneyValues,
} from "./financial-indicators";

describe("calculateFinancialIndicators", () => {
  it("calculates the workbook formulas from performance lines in cents", () => {
    expect(
      calculateFinancialIndicators({
        fixedCost: "100.00",
        taxRate: "0.10",
        lines: [
          {
            advertisingCost: "3.00",
            commissionRate: "0.10",
            packagingCost: "2.00",
            returnsQuantity: 1,
            salePrice: "100.00",
            salesQuantity: 3,
            shippingFee: "5.00",
            unitCost: "20.00",
          },
        ],
      }),
    ).toEqual({
      advertising: "3.00",
      averageMarginPercent: "53.00",
      breakEvenRevenue: "188.68",
      fixedCost: "100.00",
      marketplaceCommission: "20.00",
      netMarginPercent: "1.50",
      netProfit: "3.00",
      netSales: 2,
      packagingCost: "4.00",
      productCost: "40.00",
      realProfit: "6.00",
      revenue: "200.00",
      shippingCost: "10.00",
      taxAmount: "20.00",
      totalProfit: "106.00",
      variableCosts: "94.00",
    });
  });

  it("clamps returns, accepts empty optional money fields, and is zero-safe", () => {
    expect(
      calculateFinancialIndicators({
        fixedCost: "25.00",
        taxRate: "0.05",
        lines: [
          {
            returnsQuantity: 4,
            salePrice: "",
            salesQuantity: 2,
          },
        ],
      }),
    ).toEqual({
      advertising: "0.00",
      averageMarginPercent: "0.00",
      breakEvenRevenue: "0.00",
      fixedCost: "25.00",
      marketplaceCommission: "0.00",
      netMarginPercent: "0.00",
      netProfit: "-25.00",
      netSales: 0,
      packagingCost: "0.00",
      productCost: "0.00",
      realProfit: "-25.00",
      revenue: "0.00",
      shippingCost: "0.00",
      taxAmount: "0.00",
      totalProfit: "0.00",
      variableCosts: "0.00",
    });
  });

  it("sums fixed-cost rows without floating-point drift", () => {
    expect(sumMoneyValues(["2987.70", "0.01", "0.005"])).toBe("2987.72");
  });
});
