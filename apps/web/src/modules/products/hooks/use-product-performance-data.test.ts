import { beforeEach, describe, expect, it, vi } from "vitest";

const apiClientMock = vi.hoisted(() => ({
  getValidatedData: vi.fn(),
}));

const reactQueryMocks = vi.hoisted(() => ({
  keepPreviousData: vi.fn(),
  useQuery: vi.fn(),
}));

vi.mock("@tanstack/react-query", () => reactQueryMocks);

vi.mock("@/lib/api/client", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api/client")>("@/lib/api/client");

  return {
    ...actual,
    apiClient: apiClientMock,
  };
});

import {
  fetchProductPerformancePage,
  useProductPerformancePage,
} from "./use-product-performance-data";

describe("products performance protected fetchers", () => {
  beforeEach(() => {
    apiClientMock.getValidatedData.mockReset();
    reactQueryMocks.useQuery.mockReset();
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

  it("keeps the previous response while fetching a new page", () => {
    const queryResult = { data: { page: 2 } };
    reactQueryMocks.useQuery.mockReturnValue(queryResult);

    expect(
      useProductPerformancePage({
        page: 2,
        pageSize: 10,
        referenceMonth: "2026-06-01",
      }),
    ).toBe(queryResult);

    expect(reactQueryMocks.useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        placeholderData: reactQueryMocks.keepPreviousData,
      }),
    );
  });
});
