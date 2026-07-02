"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, useCallback } from "react";
import type { ProductAnalyticsSnapshot } from "@lucreii/types";
import { productAnalyticsSnapshotApiResponseSchema } from "@lucreii/validation";
import { ApiClientError, apiClient } from "@/lib/api/client";
import {
  clampReferenceMonth,
  formatReferenceMonthPtBr,
  getSaoPauloCurrentReferenceMonth,
  mergeDescendingReferenceMonthChoices,
} from "@/lib/reference-month";
import type { ProductCatalogData, PaginationState } from "../types/products";
import {
  buildCatalogStats,
  buildProductInsights,
  buildProductTableRows,
  determineFinancialState,
} from "../calculations/product-insights";

export {
  formatReferenceMonthPtBr,
  getSaoPauloCurrentReferenceMonth,
  mergeDescendingReferenceMonthChoices,
} from "@/lib/reference-month";

export const productCatalogQueryKey = ["product-catalog-module"] as const;

function readSelectedCompanyIdFromBrowserCookie() {
  if (typeof document === "undefined") {
    return null;
  }

  const match = document.cookie.match(
    /(?:^|;\s*)lucreii_selected_company_id=([^;]+)/i,
  );

  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

/** Newest-first list of month starts (\`yyyy-mm-01\`) up to cap, length \`count\`. */
export async function fetchProductCatalog(input?: { referenceMonth?: string }): Promise<ProductCatalogData> {
  const params = new URLSearchParams();

  if (input?.referenceMonth) {
    params.set("referenceMonth", input.referenceMonth);
  }

  const path = params.size > 0 ? `/products/analytics?${params.toString()}` : "/products/analytics";

  return apiClient.getValidatedData<ProductAnalyticsSnapshot>(
    path,
    productAnalyticsSnapshotApiResponseSchema,
  );
}

const DEFAULT_PAGE_SIZE = 10;
const REFERENCE_MONTH_HISTORY = 6;

export function useProductData() {
  const queryClient = useQueryClient();
  const selectedCompanyId = readSelectedCompanyIdFromBrowserCookie();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(DEFAULT_PAGE_SIZE);
  const [referenceMonth, setReferenceMonthState] = useState(() => getSaoPauloCurrentReferenceMonth());

  const setReferenceMonth = useCallback((next: string) => {
    const effective = clampReferenceMonth(next);
    if (!effective) {
      return;
    }
    setReferenceMonthState(effective);
    setCurrentPage(1);
  }, []);

  const { data, isLoading, error, refetch } = useQuery({
    queryFn: () =>
      fetchProductCatalog({
        referenceMonth,
      }),
    queryKey: [...productCatalogQueryKey, selectedCompanyId, referenceMonth],
  });

  const allRows = useMemo(() => {
    if (!data) return [];
    return buildProductTableRows(data);
  }, [data]);

  const stats = useMemo(() => {
    if (!data) return null;
    return buildCatalogStats(data);
  }, [data]);

  const insights = useMemo(() => {
    if (!data || !stats) return [];
    return buildProductInsights(data, stats, allRows);
  }, [data, stats, allRows]);

  const sortedRows = useMemo(() => {
    return [...allRows].sort((a, b) => {
      const channelCompare = a.channelLabel.localeCompare(b.channelLabel);
      if (channelCompare !== 0) {
        return channelCompare;
      }

      const nameCompare = a.name.localeCompare(b.name);
      if (nameCompare !== 0) {
        return nameCompare;
      }

      return a.sku.localeCompare(b.sku);
    });
  }, [allRows]);

  const pagination: PaginationState = useMemo(() => {
    const totalItems = sortedRows.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const safePage = Math.min(currentPage, totalPages);

    return {
      currentPage: safePage,
      totalPages,
      pageSize,
      totalItems,
    };
  }, [sortedRows.length, currentPage, pageSize]);

  const financialState = useMemo(() => {
    if (!data) return "empty";
    return determineFinancialState(data);
  }, [data]);

  const refresh = useCallback(
    async (message?: string) => {
      await queryClient.invalidateQueries({ queryKey: productCatalogQueryKey });
      return message;
    },
    [queryClient],
  );

  const goToPage = useCallback((page: number) => {
    setCurrentPage(() => Math.max(1, page));
  }, []);

  const combinedError = error;
  const isUnauthorized = combinedError instanceof ApiClientError && combinedError.status === 401;

  const referenceMonthSelectOptions = useMemo(() => {
    const cap = getSaoPauloCurrentReferenceMonth();
    return mergeDescendingReferenceMonthChoices(referenceMonth, cap, REFERENCE_MONTH_HISTORY);
  }, [referenceMonth]);

  return {
    data,
    referenceMonth,
    referenceMonthSelectOptions,
    stats,
    insights,
    rows: sortedRows,
    allRows: sortedRows,
    pagination,
    financialState,
    dataGaps: data?.dataGaps ?? [],
    products: data?.products ?? [],
    syncedProducts: data?.syncedProducts ?? [],
    isLoading,
    error: combinedError,
    isUnauthorized,
    setReferenceMonth,
    refresh,
    refetch,
    goToPage,
  };
}
