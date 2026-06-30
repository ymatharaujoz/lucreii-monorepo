import type {
  ProductAnalyticsCatalogStats,
  ProductAnalyticsSnapshot,
  ProductFinancialState,
  ProductPerformanceListItem,
} from "@lucreii/types";

export type ProductCatalogData = ProductAnalyticsSnapshot;

export type ProductInsight = {
  id: string;
  type: "growth" | "alert" | "tip" | "info" | "ai";
  title: string;
  description: string;
  priority?: "high" | "medium" | "low";
  href?: string;
  actionLabel?: string;
  actionKey?: "open-synced-review";
};

export type CatalogStats = ProductAnalyticsCatalogStats;

export type ProductMarketplaceNotice = {
  id: string;
  title: string;
  description: string;
  tone: "alert" | "info" | "success";
  actionLabel?: string;
  href?: string;
  actionKey?: "open-synced-review";
};

export type ProductTableRow = ProductPerformanceListItem;

export type PaginationState = {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
};

export type { ProductFinancialState };
