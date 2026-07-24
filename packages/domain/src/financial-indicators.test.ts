import { describe, expect, it } from "vitest";
import {
  calculateFinancialIndicators,
  calculateFinancialIndicatorsFromTotals,
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
      averageMarginPercent: "1.89",
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

  it("recalculates dependent indicators from canonical order totals", () => {
    expect(
      calculateFinancialIndicatorsFromTotals({
        advertising: "12.00",
        fixedCost: "30.00",
        marketplaceCommission: "15.00",
        netSales: 3,
        packagingCost: "8.00",
        productCost: "53.00",
        refundBonus: "5.00",
        revenue: "120.00",
        shippingCost: "7.00",
        taxAmount: "12.00",
      }),
    ).toMatchObject({
      averageMarginPercent: "4.00",
      breakEvenRevenue: "120.00",
      netMarginPercent: "-10.00",
      netProfit: "-12.00",
      realProfit: "0.00",
      totalProfit: "30.00",
      variableCosts: "90.00",
    });
  });

  it("formats average margin as revenue divided by total profit", () => {
    const result = calculateFinancialIndicatorsFromTotals({
      advertising: "0.00",
      fixedCost: "0.00",
      marketplaceCommission: "100.00",
      netSales: 29,
      packagingCost: "50.00",
      productCost: "294.42",
      revenue: "894.48",
      shippingCost: "50.00",
      taxAmount: "100.00",
    });

    expect(result.totalProfit).toBe("300.06");
    expect(result.averageMarginPercent).toBe("2.98");
  });
});
