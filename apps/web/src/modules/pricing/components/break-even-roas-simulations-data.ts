import type {
  BreakEvenRoasSimulationList,
  BreakEvenRoasSimulationSortDirection,
  BreakEvenRoasSimulationSortKey,
} from "@lucreii/types";
import { breakEvenRoasSimulationListApiResponseSchema } from "@lucreii/validation";
import { apiClient } from "@/lib/api/client";

export const BREAK_EVEN_ROAS_SIMULATIONS_PAGE_SIZE = 10;

export type BreakEvenRoasSimulationListFilters = {
  page: number;
  search: string;
  sortBy: BreakEvenRoasSimulationSortKey | null;
  sortDirection: BreakEvenRoasSimulationSortDirection | null;
};

export async function fetchBreakEvenRoasSimulations(
  filters: BreakEvenRoasSimulationListFilters,
): Promise<BreakEvenRoasSimulationList> {
  const params = new URLSearchParams({
    page: String(filters.page),
    pageSize: String(BREAK_EVEN_ROAS_SIMULATIONS_PAGE_SIZE),
  });

  if (filters.search.trim()) params.set("search", filters.search.trim());

  if (filters.sortBy && filters.sortDirection) {
    params.set("sortBy", filters.sortBy);
    params.set("sortDirection", filters.sortDirection);
  }

  return apiClient.getValidatedData<BreakEvenRoasSimulationList>(
    `/pricing/break-even-roas/simulations?${params.toString()}`,
    breakEvenRoasSimulationListApiResponseSchema,
  );
}
