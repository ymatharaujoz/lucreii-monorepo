import { beforeEach, describe, expect, it, vi } from "vitest";

const apiClientMock = vi.hoisted(() => ({
  getValidatedData: vi.fn(),
}));

vi.mock("@/lib/api/client", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api/client")>(
    "@/lib/api/client",
  );

  return {
    ...actual,
    apiClient: apiClientMock,
  };
});

import { fetchPricingSimulations } from "./pricing-simulations-data";

describe("pricing simulations list fetcher", () => {
  beforeEach(() => {
    apiClientMock.getValidatedData.mockReset();
    apiClientMock.getValidatedData.mockResolvedValue({
      items: [],
      page: 2,
      pageSize: 10,
      totalItems: 0,
      totalPages: 1,
    });
  });

  it("requests the selected page, search and server-side sort", async () => {
    await fetchPricingSimulations({
      page: 2,
      search: "cam-urb",
      sortBy: "recommendedSalePrice",
      sortDirection: "desc",
    });

    expect(apiClientMock.getValidatedData).toHaveBeenCalledWith(
      "/pricing/simulations?page=2&pageSize=10&search=cam-urb&sortBy=recommendedSalePrice&sortDirection=desc",
      expect.any(Object),
    );
  });

  it("keeps the default server ordering when no sort is selected", async () => {
    await fetchPricingSimulations({
      page: 1,
      search: "",
      sortBy: null,
      sortDirection: null,
    });

    expect(apiClientMock.getValidatedData).toHaveBeenCalledWith(
      "/pricing/simulations?page=1&pageSize=10",
      expect.any(Object),
    );
  });
});
