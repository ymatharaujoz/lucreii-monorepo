import type { IntegrationProviderSlug } from "./integrations";
import type { SyncStatusResponse } from "./sync";

export type DecimalString = string;

export type ProductFormValues = {
  name: string;
  sku: string | null;
  sellingPrice: DecimalString;
  isActive: boolean;
};

export type ProductCostFormValues = {
  productId: string;
  costType: string;
  amount: DecimalString;
  currency: string;
  effectiveFrom: string | null;
  notes: string | null;
};

export type ProductManualCreateInitialFinanceValues = {
  unitCost: DecimalString;
  packagingCost: DecimalString;
};

export type ProductManualCreateFormValues = {
  product: ProductFormValues & {
    sku: string;
  };
  initialFinance: ProductManualCreateInitialFinanceValues;
};

export type ProductCatalogExportFilters = {
  ids?: string[];
  marketplaces?: Array<"mercadolivre" | "shopee" | "shein">;
  search?: string;
};

export type ProductBulkDeleteResult = {
  ids: string[];
  totalDeleted: number;
};

export type ProductSpreadsheetImportResult = {
  created: number;
  updated: number;
  imported: number;
  errors: Array<{ row: number; message: string }>;
};

export type AdCostFormValues = {
  productId: string | null;
  channel: string;
  amount: DecimalString;
  currency: string;
  spentAt: string | null;
  notes: string | null;
};

export type ManualExpenseFormValues = {
  category: string;
  amount: DecimalString;
  currency: string;
  incurredAt: string | null;
  notes: string | null;
};

export type ProductRecord = {
  companyId: string;
  coverImageUrl: string | null;
  id: string;
  images: ProductImageRecord[];
  organizationId: string;
  name: string;
  sku: string | null;
  sellingPrice: DecimalString;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ProductImageRecord = {
  externalIdentifier: string | null;
  id: string;
  position: number;
  productId: string;
  source: string;
  url: string;
};

export type ProductCostRecord = {
  id: string;
  companyId: string;
  organizationId: string;
  productId: string;
  costType: string;
  amount: DecimalString;
  currency: string;
  effectiveFrom: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AdCostRecord = {
  id: string;
  companyId: string;
  organizationId: string;
  productId: string | null;
  channel: string;
  amount: DecimalString;
  currency: string;
  spentAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ManualExpenseRecord = {
  id: string;
  companyId: string;
  organizationId: string;
  category: string;
  amount: DecimalString;
  currency: string;
  incurredAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ProductCatalogRole = "parent" | "child" | "standalone";

export type ProductListItem = ProductRecord & {
  catalogGroupKey: string | null;
  catalogRole: ProductCatalogRole;
  children: ProductListItem[];
  derivedFromProvider: "mercadolivre" | null;
  latestCost: ProductCostRecord | null;
  financeDefaults: ProductFinanceDefaultsRecord | null;
  isSyntheticParent: boolean;
  parentProductId: string | null;
  variationLabel: string | null;
};

export type SyncedProductReviewStatus =
  | "ignored"
  | "imported_as_internal_product"
  | "linked_to_existing_product"
  | "unreviewed";

export type SyncedProductSuggestedMatchReason = "sku_exact";

export type SyncedProductSuggestedMatch = {
  productId: string;
  name: string;
  sku: string | null;
  isActive: boolean;
  reason: SyncedProductSuggestedMatchReason;
};

export type SyncedProductLinkedProduct = {
  id: string;
  name: string;
  sku: string | null;
  isActive: boolean;
};

export type SyncedProductRecord = {
  id: string;
  externalProductId: string;
  provider: IntegrationProviderSlug;
  title: string | null;
  sku: string | null;
  metadata?: Record<string, unknown>;
  reviewStatus: SyncedProductReviewStatus;
  linkedProduct: SyncedProductLinkedProduct | null;
  suggestedMatches: SyncedProductSuggestedMatch[];
  orderCount: number;
  unitsSold: number;
  grossRevenue: DecimalString;
  marketplaceCommission: DecimalString;
  fixedFee: DecimalString;
  shippingCost: DecimalString;
  netMarketplaceTake: DecimalString;
  latestUnitPrice: DecimalString | null;
  lastOrderedAt: string | null;
};

export type SyncedProductLinkFormValues = {
  productId: string;
};

export type SyncedProductActionResult = {
  linkedProduct: SyncedProductLinkedProduct | null;
  message: string;
  syncedProduct: SyncedProductRecord;
};

export type ProductFinanceDefaultsRecord = {
  id: string;
  productId: string;
  packagingCost: DecimalString;
  advertisingCost: DecimalString;
  createdAt: string;
  updatedAt: string;
};

export type ProductManualCreateResult = {
  product: ProductRecord;
  productCost: ProductCostRecord;
  financeDefaults: ProductFinanceDefaultsRecord;
};

export type ProductFinancialState =
  | "ready"
  | "empty"
  | "no-costs"
  | "insufficient";

export type ProductAnalyticsInsufficientReason =
  | "missing_cost"
  | "missing_linked_marketplace_signal"
  | "missing_sales_signal";

export type ProductAnalyticsDataGap =
  | "packaging_cost_unavailable"
  | "returns_unavailable"
  | "shipping_cost_unavailable"
  | "tax_amount_unavailable";

export type ProductAnalyticsRow = {
  productId: string;
  name: string;
  sku: string | null;
  isActive: boolean;
  channel: string;
  sales: number;
  returns: number;
  netSales: number;
  salePrice: DecimalString;
  revenue: DecimalString;
  marketplaceCommission: DecimalString;
  shippingCost: DecimalString;
  taxAmount: DecimalString;
  packagingCost: DecimalString;
  productCost: DecimalString;
  adSpend: DecimalString;
  grossProfit: DecimalString;
  contributionMargin: DecimalString;
  unitProfit: DecimalString;
  totalProfit: DecimalString;
  margin: DecimalString;
  roi: DecimalString;
  actualRoas: DecimalString;
  minimumRoas: DecimalString;
  hasCost: boolean;
  hasSalesSignal: boolean;
  hasLinkedMarketplaceSignal: boolean;
  insufficientReasons: ProductAnalyticsInsufficientReason[];
  dataSource: "monthly_performance" | "sync";
};

export type ProductAnalyticsScope = {
  companyId: string | null;
  companyRequired: boolean;
  referenceMonth: string;
  taxRateDefault: DecimalString;
};

export type ProductPerformanceListSortKey =
  | "channelLabel"
  | "parentName"
  | "variationName"
  | "sales"
  | "sellingPrice"
  | "contributionMarginRatio"
  | "totalProfit";

export type ProductPerformanceListQuery = {
  referenceMonth?: string;
  page?: number;
  pageSize?: number;
  search?: string;
  marketplaces?: Array<"mercadolivre" | "shopee" | "shein">;
  sortBy?: ProductPerformanceListSortKey;
  sortDirection?: "asc" | "desc";
};

export type ProductMonthlyPerformanceDisplayRow = {
  id: string;
  productId: string | null;
  referenceMonth: string;
  channel: string;
  productName: string;
  sku: string;
  salesQuantity: number;
  returnsQuantity: number;
  unitCost: DecimalString;
  salePrice: DecimalString;
  commissionRate: DecimalString;
  shippingFee: DecimalString;
  packagingCost: DecimalString;
  advertisingCost: DecimalString;
  marketplaceCommission?: DecimalString;
  marketplaceCommissionUnit?: DecimalString;
  fixedFeeUnit?: DecimalString;
  shippingUnit?: DecimalString;
  shippingOrFixedFeeUnit?: DecimalString;
  shippingOrFixedFeeSource?: "shipping" | "fixed_fee" | "none";
};

export type ProductPerformanceRow = ProductMonthlyPerformanceDisplayRow & {
  catalogGroupKey: string | null;
  catalogRole: ProductCatalogRole;
  children: ProductPerformanceRow[];
  isSyntheticParent: boolean;
  parentProductId: string | null;
  variationLabel: string | null;
};

export type ProductPerformanceListItem = {
  id: string;
  productId: string | null;
  performanceId: string;
  catalogGroupKey: string | null;
  catalogRole: ProductCatalogRole;
  children: ProductPerformanceListItem[];
  isSyntheticParent: boolean;
  name: string;
  displayName: string;
  parentProductId: string | null;
  variationLabel: string | null;
  sku: string;
  isActive: boolean;
  coverImageUrl: string | null;
  channelLabel: string;
  sales: number; // Quantidade bruta de unidades vendidas no periodo
  returns: number;
  netLiquidSales: number; // Quantidade liquida de unidades no periodo
  unitCost: number;
  sellingPrice: number;
  commissionPct: number;
  shipping: number;
  marketplaceCommissionUnit?: number;
  fixedFeeUnit?: number;
  shippingUnit?: number;
  shippingOrFixedFeeUnit?: number;
  shippingOrFixedFeeSource?: "shipping" | "fixed_fee" | "none";
  taxPct: number;
  packagingCost: number;
  totalPackagingCost: number;
  adSpend: number;
  advertisingCost: number;
  revenue: number;
  totalCommission: number;
  totalProfit: number;
  totalProductCost: number;
  unitProfit: number | null;
  contributionMarginRatio: number | null;
  roiRatio: number | null;
  minimumRoas: number | null;
  actualRoas: number | null;
  referenceMonth: string;
};

export type ProductPerformanceListResponse = {
  items: ProductPerformanceListItem[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};

export type ProductAnalyticsCatalogStats = {
  totalProducts: number;
  activeProducts: number;
  archivedProducts: number;
  productsWithCost: number;
  productsWithoutCost: number;
  pendingSyncProducts: number;
  syncedProductsTotal: number;
  totalProductCosts: number;
  totalAdCosts: number;
  totalManualExpenses: number;
};

export type ProductCatalogSnapshot = {
  adCosts: AdCostRecord[];
  manualExpenses: ManualExpenseRecord[];
  productCosts: ProductCostRecord[];
  products: ProductListItem[];
  syncedProducts: SyncedProductRecord[];
};

export type ProductAnalyticsSnapshot = ProductCatalogSnapshot & {
  productRows: ProductAnalyticsRow[];
  monthlyPerformanceRows: ProductMonthlyPerformanceDisplayRow[];
  performanceRows: ProductPerformanceRow[];
  catalogStats: ProductAnalyticsCatalogStats;
  financialState: ProductFinancialState;
  dataGaps: ProductAnalyticsDataGap[];
  mercadoLivreSyncStatus: SyncStatusResponse;
  scope: ProductAnalyticsScope;
};
