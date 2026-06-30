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

import { fetchProductPerformancePage } from "./use-product-performance-data";

describe("products performance protected fetchers", () => {
  beforeEach(() => {
    apiClientMock.getValidatedData.mockReset();
  });

  it("uses paginated performance endpoint with server-side filters and sorting", async () => {
    apiClientMock.getValidatedData.mockResolvedValue({
      items: [],
      page: 2,
      pageSize: 10,
      totalItems: 0,
      totalPages: 1,
    });

    await fetchProductPerformancePage({
      marketplaces: ["mercadolivre", "shopee"],
      page: 2,
      pageSize: 10,
      referenceMonth: "2026-06-01",
      search: "Kit",
      sortBy: "totalProfit",
      sortDirection: "desc",
    });

    expect(apiClientMock.getValidatedData).toHaveBeenCalledWith(
      "/products/performance?referenceMonth=2026-06-01&page=2&pageSize=10&search=Kit&marketplaces=mercadolivre%2Cshopee&sortBy=totalProfit&sortDirection=desc",
      expect.any(Object),
    );
  });
});
