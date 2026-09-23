"use client";

import { useQuery } from "@tanstack/react-query";
import type {
  DashboardChartsResponse,
  DashboardFinancialIndicators,
  DashboardProfitabilityResponse,
  DashboardRecentSyncResponse,
  DashboardSummaryResponse,
  IntegrationProviderSlug,
} from "@lucreii/types";
import {
  dashboardChartsApiResponseSchema,
  dashboardFinancialIndicatorsApiResponseSchema,
  dashboardProfitabilityApiResponseSchema,
  dashboardRecentSyncApiResponseSchema,
  dashboardSummaryApiResponseSchema,
} from "@lucreii/validation";
import { ApiClientError, apiClient } from "@/lib/api/client";
import {
  deriveBusinessStatus,
  determineDashboardFinancialState,
} from "../calculations/financial-state";

const dashboardSummaryQueryKey = ["dashboard-summary"] as const;
const dashboardChartsQueryKey = ["dashboard-charts"] as const;
const dashboardProfitabilityQueryKey = ["dashboard-profitability"] as const;
const dashboardFinancialIndicatorsQueryKey = [
  "dashboard-financial-indicators",
] as const;

function readSelectedCompanyIdFromBrowserCookie() {
  if (typeof document === "undefined") {
    return null;
  }

  const match = document.cookie.match(
    /(?:^|;\s*)lucreii_selected_company_id=([^;]+)/i,
  );

  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

function dashboardUrl(
  path: string,
  provider?: IntegrationProviderSlug | null,
  referenceMonth?: string,
) {
  const params = new URLSearchParams();

  if (provider) {
    params.set("provider", provider);
  }

  if (referenceMonth) {
    params.set("referenceMonth", referenceMonth);
  }

  return params.size > 0 ? `${path}?${params.toString()}` : path;
}

export async function fetchDashboardSummary(
  providerOrLegacy?: IntegrationProviderSlug | boolean | null,
  referenceMonth?: string,
): Promise<DashboardSummaryResponse> {
  const provider =
    typeof providerOrLegacy === "string" ? providerOrLegacy : null;
  return apiClient.getValidatedData(
    dashboardUrl("/dashboard/summary", provider, referenceMonth),
    dashboardSummaryApiResponseSchema,
  );
}

export async function fetchDashboardCharts(
  provider?: IntegrationProviderSlug | null,
  referenceMonth?: string,
): Promise<DashboardChartsResponse> {
  return apiClient.getValidatedData(
    dashboardUrl("/dashboard/charts", provider, referenceMonth),
    dashboardChartsApiResponseSchema,
  );
}

export async function fetchDashboardRecentSync(
  provider?: IntegrationProviderSlug | null,
): Promise<DashboardRecentSyncResponse> {
  return apiClient.getValidatedData(
    dashboardUrl("/dashboard/recent-sync", provider),
    dashboardRecentSyncApiResponseSchema,
  );
}

export async function fetchDashboardProfitability(
  provider?: IntegrationProviderSlug | null,
  referenceMonth?: string,
): Promise<DashboardProfitabilityResponse> {
  return apiClient.getValidatedData(
    dashboardUrl("/dashboard/profitability", provider, referenceMonth),
    dashboardProfitabilityApiResponseSchema,
  );
}

export async function fetchDashboardFinancialIndicators(
  provider?: IntegrationProviderSlug | null,
  referenceMonth?: string,
): Promise<DashboardFinancialIndicators> {
  return apiClient.getValidatedData(
    dashboardUrl("/dashboard/financial-indicators", provider, referenceMonth),
    dashboardFinancialIndicatorsApiResponseSchema,
  );
}

export function useDashboardData(
  provider: IntegrationProviderSlug | null = null,
  referenceMonth?: string,
) {
  const selectedCompanyId = readSelectedCompanyIdFromBrowserCookie();
  const summaryQuery = useQuery({
    queryFn: () => fetchDashboardSummary(provider, referenceMonth),
    queryKey: [
      ...dashboardSummaryQueryKey,
      selectedCompanyId,
      provider,
      referenceMonth ?? "",
    ],
    retry: 2,
  });

  const chartsQuery = useQuery({
    queryFn: () => fetchDashboardCharts(provider, referenceMonth),
    queryKey: [
      ...dashboardChartsQueryKey,
      selectedCompanyId,
      provider,
      referenceMonth ?? "",
    ],
    retry: 2,
  });

  const profitabilityQuery = useQuery({
    queryFn: () => fetchDashboardProfitability(provider, referenceMonth),
    queryKey: [
      ...dashboardProfitabilityQueryKey,
      selectedCompanyId,
      provider,
      referenceMonth ?? "",
    ],
    retry: 2,
  });
  const financialIndicatorsQuery = useQuery({
    queryFn: () => fetchDashboardFinancialIndicators(provider, referenceMonth),
    queryKey: [
      ...dashboardFinancialIndicatorsQueryKey,
      selectedCompanyId,
      provider,
      referenceMonth ?? "",
    ],
    retry: 2,
  });

  const isLoading =
    summaryQuery.isLoading ||
    chartsQuery.isLoading ||
    profitabilityQuery.isLoading ||
    financialIndicatorsQuery.isLoading;
  const error =
    summaryQuery.error ||
    chartsQuery.error ||
    profitabilityQuery.error ||
    financialIndicatorsQuery.error ||
    null;
  const financialState = determineDashboardFinancialState(
    summaryQuery.data,
    chartsQuery.data,
    profitabilityQuery.data,
  );
  const businessStatus = deriveBusinessStatus(summaryQuery.data);

  return {
    summaryQuery,
    chartsQuery,
    profitabilityQuery,
    financialIndicatorsQuery,
    isLoading,
    error: error as Error | ApiClientError | null,
    financialState,
    businessStatus,
    refetchAll() {
      summaryQuery.refetch();
      chartsQuery.refetch();
      profitabilityQuery.refetch();
      financialIndicatorsQuery.refetch();
    },
  };
}
