export type PricingSimulationMode =
  | "contribution-margin"
  | "desired-profit"
  | "sale-price";

export type PricingSimulationSortKey =
  | "productIdentifier"
  | "mode"
  | "recommendedSalePrice"
  | "contributionMargin"
  | "grossProfit"
  | "updatedAt";

export type PricingSimulationSortDirection = "asc" | "desc";

export type PricingSimulationDraft = {
  mode: PricingSimulationMode;
  productIdentifier: string | null;
  target: string;
  productCost: string;
  packagingCost: string;
  shippingFee: string;
  otherFixedCosts: string;
  marketplaceCommissionRate: string;
  taxRate: string;
  affiliateCommissionRate: string;
  storeCouponRate: string;
  otherVariableCostRate: string;
};

export type PricingSimulationResult = {
  recommendedSalePrice: string;
  contributionMargin: string;
  grossProfit: string;
  fixedCosts: string;
  variableRates: string;
  calculationVersion: string;
};

export type PricingSimulation = PricingSimulationDraft &
  PricingSimulationResult & {
    id: string;
    companyId: string;
    createdAt: string;
    updatedAt: string;
  };

export type PricingSimulationList = {
  items: PricingSimulation[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};
