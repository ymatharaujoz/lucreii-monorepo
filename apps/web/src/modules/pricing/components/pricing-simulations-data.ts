import type {
  PricingSimulationList,
  PricingSimulationSortDirection,
  PricingSimulationSortKey,
} from "@lucreii/types";
import { pricingSimulationListApiResponseSchema } from "@lucreii/validation";
import { apiClient } from "@/lib/api/client";

export const PRICING_SIMULATIONS_PAGE_SIZE = 10;

export type PricingSimulationListFilters = {
  page: number;
  search: string;
  sortBy: PricingSimulationSortKey | null;
  sortDirection: PricingSimulationSortDirection | null;
};

export async function fetchPricingSimulations(
  filters: PricingSimulationListFilters,
): Promise<PricingSimulationList> {
  const params = new URLSearchParams({
    page: String(filters.page),
    pageSize: String(PRICING_SIMULATIONS_PAGE_SIZE),
  });

  if (filters.search.trim()) params.set("search", filters.search.trim());

  if (filters.sortBy && filters.sortDirection) {
    params.set("sortBy", filters.sortBy);
    params.set("sortDirection", filters.sortDirection);
  }

  return apiClient.getValidatedData<PricingSimulationList>(
    `/pricing/simulations?${params.toString()}`,
    pricingSimulationListApiResponseSchema,
  );
}
