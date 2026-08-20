import { describe, expect, it, vi } from "vitest";
import { fetchBreakEvenRoasSimulations } from "./break-even-roas-simulations-data";

const getValidatedDataMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api/client", () => ({
  apiClient: { getValidatedData: getValidatedDataMock },
}));

describe("break-even ROAS simulations data", () => {
  it("builds a paginated, searchable, sortable request", async () => {
    getValidatedDataMock.mockResolvedValueOnce({
      items: [],
      page: 2,
      pageSize: 10,
      totalItems: 0,
      totalPages: 1,
    });

    await fetchBreakEvenRoasSimulations({
      page: 2,
      search: "CAM-01",
      sortBy: "breakEvenRoas",
      sortDirection: "desc",
    });

    expect(getValidatedDataMock).toHaveBeenCalledWith(
      "/pricing/break-even-roas/simulations?page=2&pageSize=10&search=CAM-01&sortBy=breakEvenRoas&sortDirection=desc",
      expect.anything(),
    );
  });
});
