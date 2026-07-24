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

function buildProductsService(
  items: unknown[] = [],
  totalPages = 1,
) {
  return {
    listPerformanceRows: vi.fn().mockResolvedValue({
      items,
      page: 1,
      pageSize: 100,
      totalItems: items.length,
      totalPages,
    }),
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
    db.query.fixedCosts.findMany.mockResolvedValue([]);
    const productsService = buildProductsService([
      {
        advertisingCost: "3.00",
        commissionPct: 10,
        packagingCost: "2.00",
        returns: 0,
        sellingPrice: 100,
        sales: 1,
        shipping: 5,
        unitCost: "20.00",
      },
    ]);

    const result = await new FinancialIndicatorsService(
      db as never,
      productsService as never,
    ).read(
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
    db.query.fixedCosts.findMany.mockResolvedValue([
      { amount: "10.00" },
      { amount: "5.50" },
    ]);
    const productsService = buildProductsService();

    const result = await new FinancialIndicatorsService(
      db as never,
      productsService as never,
    ).read(
      "org-1",
      "user-1",
      "company-1",
      "shopee",
      "2026-05-01",
    );

    expect(result.fixedCost).toBe("15.50");
    expect(result.fixedCostSource).toBe("monthly");
    expect(db.query.fixedCosts.findMany).toHaveBeenCalledOnce();
    expect(productsService.listPerformanceRows).toHaveBeenCalledWith(
      {
        organizationId: "org-1",
        selectedCompanyId: "company-1",
        userId: "user-1",
      },
      {
        marketplaces: ["shopee"],
        page: 1,
        pageSize: 100,
        referenceMonth: "2026-05-01",
      },
    );
  });

  it("uses the same visible performance sales as the products page", async () => {
    const db = buildDb();
    db.query.companies.findFirst.mockResolvedValue({
      fixedCostDefault: "0.00",
      taxRateDefault: "0.00",
    });
    db.query.fixedCosts.findMany.mockResolvedValue([]);
    const productsService = buildProductsService([
      {
        advertisingCost: "0.00",
        commissionPct: 0,
        packagingCost: "0.00",
        returns: 0,
        sales: 28,
        sellingPrice: 10,
        shipping: 0,
        unitCost: "0.00",
      },
    ]);

    const result = await new FinancialIndicatorsService(
      db as never,
      productsService as never,
    ).read("org-1", "user-1", "company-1", "shopee", "2026-04-01");

    expect(result.netSales).toBe(28);
    expect(result.revenue).toBe("280.00");
    expect(productsService.listPerformanceRows).toHaveBeenCalledWith(
      {
        organizationId: "org-1",
        selectedCompanyId: "company-1",
        userId: "user-1",
      },
      {
        marketplaces: ["shopee"],
        page: 1,
        pageSize: 100,
        referenceMonth: "2026-04-01",
      },
    );
  });

  it("accumulates all performance pages", async () => {
    const db = buildDb();
    db.query.companies.findFirst.mockResolvedValue({
      fixedCostDefault: "0.00",
      taxRateDefault: "0.00",
    });
    db.query.fixedCosts.findMany.mockResolvedValue([]);
    const productsService = {
      listPerformanceRows: vi.fn().mockImplementation(({},{ page }: { page: number }) =>
        Promise.resolve({
          items: [
            {
              advertisingCost: "0.00",
              commissionPct: 0,
              packagingCost: "0.00",
              returns: 0,
              sales: page === 1 ? 28 : 4,
              sellingPrice: 10,
              shipping: 0,
              unitCost: "0.00",
            },
          ],
          page,
          pageSize: 100,
          totalItems: 2,
          totalPages: 2,
        }),
      ),
    };

    const result = await new FinancialIndicatorsService(
      db as never,
      productsService as never,
    ).read("org-1", "user-1", "company-1", undefined, "2026-04-01");

    expect(result.netSales).toBe(32);
    expect(result.revenue).toBe("320.00");
    expect(productsService.listPerformanceRows).toHaveBeenCalledTimes(2);
  });
});
