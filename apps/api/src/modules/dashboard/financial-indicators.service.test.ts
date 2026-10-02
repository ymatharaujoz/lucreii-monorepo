import { describe, expect, it, vi } from "vitest";
import { FinancialIndicatorsService } from "./financial-indicators.service";

function buildDb() {
  return {
    insert: vi.fn(),
    query: {
      companies: { findFirst: vi.fn() },
      fixedCosts: { findMany: vi.fn() },
      productListingAdvertising: { findMany: vi.fn() },
    },
  };
}

function buildOrdersService(
  overrides: Partial<{
    excludedRevenue: string;
    excludedSales: number;
    grossSales: number;
    marketplaceCommission: string;
    netSales: number;
    packagingCost: string;
    productCost: string;
    refundBonus: string;
    revenue: string;
    shippingCost: string;
    taxAmount: string;
    totalProfit: string;
  }> = {},
) {
  return {
    readExportedFinancialSummary: vi.fn().mockResolvedValue({
      excludedRevenue: "0.00",
      excludedSales: 0,
      grossSales: 1,
      marketplaceCommission: "10.00",
      netSales: 1,
      packagingCost: "2.00",
      productCost: "20.00",
      refundBonus: "0.00",
      revenue: "100.00",
      shippingCost: "5.00",
      taxAmount: "10.00",
      ...overrides,
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
    db.query.productListingAdvertising.findMany.mockResolvedValue([]);
    const ordersService = buildOrdersService({ productCost: "19.00" });

    const result = await new FinancialIndicatorsService(
      db as never,
      ordersService as never,
    ).read("org-1", "user-1", "company-1", undefined, "2026-04-01");

    expect(result).toMatchObject({
      breakEvenRevenue: "185.19",
      excludedRevenue: "0.00",
      excludedSales: 0,
      fixedCost: "100.00",
      fixedCostSource: "company_default",
      grossSales: 1,
      netProfit: "-46.00",
      revenue: "100.00",
      totalProfit: "54.00",
      variableCosts: "46.00",
    });
    expect(ordersService.readExportedFinancialSummary).toHaveBeenCalledWith(
      {
        organizationId: "org-1",
        selectedCompanyId: "company-1",
        userId: "user-1",
      },
      { provider: undefined, referenceMonth: "2026-04-01" },
    );
  });

  it("uses the reconciled August totals with incomplete product cost data", async () => {
    const db = buildDb();
    db.query.companies.findFirst.mockResolvedValue(company);
    db.query.fixedCosts.findMany.mockResolvedValue([]);
    db.query.productListingAdvertising.findMany.mockResolvedValue([]);
    const ordersService = buildOrdersService({
      grossSales: 516,
      marketplaceCommission: "2272.31",
      netSales: 486,
      packagingCost: "256.50",
      productCost: "3943.68",
      refundBonus: "533.60",
      revenue: "17706.98",
      shippingCost: "3725.30",
      taxAmount: "708.67",
      totalProfit: "7323.86",
    });

    const result = await new FinancialIndicatorsService(
      db as never,
      ordersService as never,
    ).read("org-1", "user-1", "company-1", "mercadolivre", "2026-08-01");

    expect(result).toMatchObject({
      averageMarginPercent: "41.36",
      marketplaceCommission: "2272.31",
      packagingCost: "256.50",
      productCost: "3943.68",
      revenue: "17706.98",
      shippingCost: "3725.30",
      taxAmount: "708.67",
      totalProfit: "7323.86",
      variableCosts: "10383.12",
    });
  });

  it("sums only the selected month's fixed costs and forwards the marketplace filter", async () => {
    const db = buildDb();
    db.query.companies.findFirst.mockResolvedValue(company);
    db.query.fixedCosts.findMany.mockResolvedValue([
      { amount: "10.00" },
      { amount: "5.50" },
    ]);
    db.query.productListingAdvertising.findMany.mockResolvedValue([]);
    const ordersService = buildOrdersService({
      grossSales: 31,
      marketplaceCommission: "0.00",
      netSales: 0,
      packagingCost: "0.00",
      productCost: "0.00",
      revenue: "0.00",
      shippingCost: "0.00",
      taxAmount: "0.00",
    });

    const result = await new FinancialIndicatorsService(
      db as never,
      ordersService as never,
    ).read("org-1", "user-1", "company-1", "shopee", "2026-05-01");

    expect(result.fixedCost).toBe("15.50");
    expect(result.fixedCostSource).toBe("monthly");
    expect(result.grossSales).toBe(31);
    expect(result.excludedRevenue).toBe("0.00");
    expect(result.excludedSales).toBe(0);
    expect(db.query.fixedCosts.findMany).toHaveBeenCalledOnce();
    expect(ordersService.readExportedFinancialSummary).toHaveBeenCalledWith(
      {
        organizationId: "org-1",
        selectedCompanyId: "company-1",
        userId: "user-1",
      },
      { provider: "shopee", referenceMonth: "2026-05-01" },
    );
  });

  it("uses the persisted listing advertising for the selected provider", async () => {
    const db = buildDb();
    db.query.companies.findFirst.mockResolvedValue(company);
    db.query.fixedCosts.findMany.mockResolvedValue([]);
    db.query.productListingAdvertising.findMany.mockResolvedValue([
      { amount: "25.00" },
    ]);
    const ordersService = buildOrdersService({
      marketplaceCommission: "0.00",
      packagingCost: "0.00",
      productCost: "0.00",
      revenue: "100.00",
      shippingCost: "0.00",
      taxAmount: "0.00",
    });

    const result = await new FinancialIndicatorsService(
      db as never,
      ordersService as never,
    ).read("org-1", "user-1", "company-1", "shopee", "2026-05-01");

    expect(result.advertising).toBe("25.00");
    expect(result.netProfit).toBe("-25.00");
    expect(db.query.productListingAdvertising.findMany).toHaveBeenCalledOnce();
  });

  it("sums advertising across all marketplaces and adds it to the break-even without a provider", async () => {
    const db = buildDb();
    db.query.companies.findFirst.mockResolvedValue(company);
    db.query.fixedCosts.findMany.mockResolvedValue([]);
    db.query.productListingAdvertising.findMany.mockResolvedValue([
      { amount: "25.00" },
      { amount: "10.00" },
      { amount: "5.00" },
    ]);
    const ordersService = buildOrdersService({ productCost: "19.00" });

    const result = await new FinancialIndicatorsService(
      db as never,
      ordersService as never,
    ).read("org-1", "user-1", "company-1", undefined, "2026-04-01");

    expect(result.monthlyAdvertising).toBe("40.00");
    expect(result.advertising).toBe("40.00");
    // (100.00 fixed cost + 40.00 advertising) / 54% average margin
    expect(result.breakEvenRevenue).toBe("259.26");
  });

  it("keeps monthly fixed cost and full-month advertising for a partial date range", async () => {
    const db = buildDb();
    db.query.companies.findFirst.mockResolvedValue(company);
    db.query.fixedCosts.findMany.mockResolvedValue([]);
    db.query.productListingAdvertising.findMany.mockResolvedValue([
      { amount: "31.00" },
    ]);
    const ordersService = buildOrdersService({
      marketplaceCommission: "0.00",
      packagingCost: "0.00",
      productCost: "0.00",
      revenue: "100.00",
      shippingCost: "0.00",
      taxAmount: "0.00",
    });

    const result = await new FinancialIndicatorsService(
      db as never,
      ordersService as never,
    ).read("org-1", "user-1", "company-1", "shopee", "2026-07-01", {
      dateFrom: "2026-07-01",
      dateTo: "2026-07-10",
    });

    expect(result.advertising).toBe("31.00");
    expect(result.fixedCost).toBe("100.00");
    expect(result.monthlyAdvertising).toBe("31.00");
    expect(ordersService.readExportedFinancialSummary).toHaveBeenCalledWith(
      {
        organizationId: "org-1",
        selectedCompanyId: "company-1",
        userId: "user-1",
      },
      {
        dateFrom: "2026-07-01",
        dateTo: "2026-07-10",
        provider: "shopee",
        referenceMonth: "2026-07-01",
      },
    );
  });
});
