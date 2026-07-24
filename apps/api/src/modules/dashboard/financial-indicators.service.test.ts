import { describe, expect, it, vi } from "vitest";
import { FinancialIndicatorsService } from "./financial-indicators.service";

function buildDb() {
  return {
    query: {
      companies: { findFirst: vi.fn() },
      fixedCosts: { findMany: vi.fn() },
      productMonthlyPerformance: { findMany: vi.fn() },
    },
  };
}

const company = {
  fixedCostDefault: "100.00",
  taxRateDefault: "0.10",
};

describe("FinancialIndicatorsService", () => {
  it("uses the company fixed-cost fallback when the month has no launches", async () => {
    const db = buildDb();
    db.query.companies.findFirst.mockResolvedValue(company);
    db.query.productMonthlyPerformance.findMany.mockResolvedValue([
      {
        advertisingCost: "3.00",
        commissionRate: "0.10",
        packagingCost: "2.00",
        returnsQuantity: 0,
        salePrice: "100.00",
        salesQuantity: 1,
        shippingFee: "5.00",
        unitCost: "20.00",
      },
    ]);
    db.query.fixedCosts.findMany.mockResolvedValue([]);

    const result = await new FinancialIndicatorsService(db as never).read(
      "org-1",
      "user-1",
      "company-1",
      undefined,
      "2026-04-01",
    );

    expect(result).toMatchObject({
      breakEvenRevenue: "188.68",
      fixedCost: "100.00",
      fixedCostSource: "company_default",
      netProfit: "-50.00",
      revenue: "100.00",
      totalProfit: "53.00",
      variableCosts: "47.00",
    });
  });

  it("sums only the selected month's fixed costs and forwards the marketplace filter", async () => {
    const db = buildDb();
    db.query.companies.findFirst.mockResolvedValue(company);
    db.query.productMonthlyPerformance.findMany.mockResolvedValue([]);
    db.query.fixedCosts.findMany.mockResolvedValue([
      { amount: "10.00" },
      { amount: "5.50" },
    ]);

    const result = await new FinancialIndicatorsService(db as never).read(
      "org-1",
      "user-1",
      "company-1",
      "shopee",
      "2026-05-01",
    );

    expect(result.fixedCost).toBe("15.50");
    expect(result.fixedCostSource).toBe("monthly");
    expect(db.query.productMonthlyPerformance.findMany).toHaveBeenCalledOnce();
    expect(db.query.fixedCosts.findMany).toHaveBeenCalledOnce();
  });
});
