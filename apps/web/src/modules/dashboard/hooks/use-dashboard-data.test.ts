import { beforeEach, describe, expect, it, vi } from "vitest";

const apiClientMock = vi.hoisted(() => ({
  getValidatedData: vi.fn(),
}));

vi.mock("@/lib/api/client", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api/client")>("@/lib/api/client");

  return {
    ...actual,
    apiClient: apiClientMock,
  };
});

import { fetchDashboardCharts, fetchDashboardProfitability, fetchDashboardSummary } from "./use-dashboard-data";

describe("dashboard protected fetchers", () => {
  beforeEach(() => {
    apiClientMock.getValidatedData.mockReset();
  });

  it("uses the validated API path as the protected data source", async () => {
    apiClientMock.getValidatedData.mockResolvedValue({
      cards: [],
      summary: {
        avgRoi: "0.00",
        avgRoas: "0.00",
        avgTicket: "0.00",
        breakEvenRevenue: "0.00",
        breakEvenUnits: "0.00",
        contributionMargin: "0.00",
        grossMarginPercent: "0.00",
        grossProfit: "0.00",
        grossRevenue: "0.00",
        netProfit: "0.00",
        netRevenue: "0.00",
        ordersCount: 0,
        totalAdCosts: "0.00",
        totalCogs: "0.00",
        totalFees: "0.00",
        totalManualExpenses: "0.00",
        totalReturns: 0,
        unitsSold: 0,
      },
    });

    await fetchDashboardSummary(false);

    expect(apiClientMock.getValidatedData).toHaveBeenCalledWith(
      "/dashboard/summary",
      expect.any(Object),
    );
  });

  it("appends referenceMonth to dashboard endpoints when month filter is provided", async () => {
    apiClientMock.getValidatedData.mockResolvedValue({
      cards: [],
      channels: [],
      daily: [],
      products: [],
      summary: {
        avgRoi: "0.00",
        avgRoas: "0.00",
        avgTicket: "0.00",
        breakEvenRevenue: "0.00",
        breakEvenUnits: "0.00",
        contributionMargin: "0.00",
        grossMarginPercent: "0.00",
        grossProfit: "0.00",
        grossRevenue: "0.00",
        netProfit: "0.00",
        netRevenue: "0.00",
        ordersCount: 0,
        totalAdCosts: "0.00",
        totalCogs: "0.00",
        totalFees: "0.00",
        totalManualExpenses: "0.00",
        totalReturns: 0,
        unitsSold: 0,
      },
    });

    await fetchDashboardSummary("shopee", "2026-07-01");
    await fetchDashboardCharts("shopee", "2026-07-01");
    await fetchDashboardProfitability("shopee", "2026-07-01");

    expect(apiClientMock.getValidatedData).toHaveBeenNthCalledWith(
      1,
      "/dashboard/summary?provider=shopee&referenceMonth=2026-07-01",
      expect.any(Object),
    );
    expect(apiClientMock.getValidatedData).toHaveBeenNthCalledWith(
      2,
      "/dashboard/charts?provider=shopee&referenceMonth=2026-07-01",
      expect.any(Object),
    );
    expect(apiClientMock.getValidatedData).toHaveBeenNthCalledWith(
      3,
      "/dashboard/profitability?provider=shopee&referenceMonth=2026-07-01",
      expect.any(Object),
    );
  });
});
