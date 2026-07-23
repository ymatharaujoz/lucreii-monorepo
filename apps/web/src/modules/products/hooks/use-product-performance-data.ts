"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type {
  ProductPerformanceListQuery,
  ProductPerformanceListResponse,
} from "@lucreii/types";
import { productPerformanceListApiResponseSchema } from "@lucreii/validation";
import { apiClient } from "@/lib/api/client";

export const productPerformanceQueryKey = ["product-performance-module"] as const;

function readSelectedCompanyIdFromBrowserCookie() {
  if (typeof document === "undefined") {
    return null;
  }

  const match = document.cookie.match(
    /(?:^|;\s*)lucreii_selected_company_id=([^;]+)/i,
  );

  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

export async function fetchProductPerformancePage(
  input: ProductPerformanceListQuery,
): Promise<ProductPerformanceListResponse> {
  const params = new URLSearchParams();

  if (input.referenceMonth) {
    params.set("referenceMonth", input.referenceMonth);
  }

  if (input.page) {
    params.set("page", String(input.page));
  }

  if (input.pageSize) {
    params.set("pageSize", String(input.pageSize));
  }

  if (input.search) {
    params.set("search", input.search);
  }

  if (input.marketplaces && input.marketplaces.length > 0) {
    params.set("marketplaces", input.marketplaces.join(","));
  }

  if (input.sortBy) {
    params.set("sortBy", input.sortBy);
  }

  if (input.sortDirection) {
    params.set("sortDirection", input.sortDirection);
  }

  const path =
    params.size > 0 ? `/products/performance?${params.toString()}` : "/products/performance";

  return apiClient.getValidatedData(path, productPerformanceListApiResponseSchema);
}

export function useProductPerformancePage(
  filters: ProductPerformanceListQuery,
  enabled = true,
) {
  const selectedCompanyId = readSelectedCompanyIdFromBrowserCookie();

  return useQuery({
    enabled,
    placeholderData: keepPreviousData,
    queryFn: () => fetchProductPerformancePage(filters),
    queryKey: [
      ...productPerformanceQueryKey,
      selectedCompanyId,
      filters.referenceMonth ?? "",
      filters.page ?? 1,
      filters.pageSize ?? 10,
      filters.search ?? "",
      (filters.marketplaces ?? []).join(","),
      filters.sortBy ?? "",
      filters.sortDirection ?? "",
    ],
  });
}
