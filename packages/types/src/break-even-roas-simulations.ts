export type BreakEvenRoasSimulationSortKey =
  | "productIdentifier"
  | "contributionMarginRate"
  | "breakEvenRoas"
  | "updatedAt";

export type BreakEvenRoasSimulationSortDirection = "asc" | "desc";

export type BreakEvenRoasSimulationDraft = {
  adsInvestment: string | null;
  adsRoas: string | null;
  productIdentifier: string | null;
  contributionMarginRate: string;
};

export type BreakEvenRoasSimulationResult = {
  adsAttributedRevenue: string | null;
  breakEvenRoas: string;
  calculationVersion: string;
};

export type BreakEvenRoasSimulation = BreakEvenRoasSimulationDraft &
  BreakEvenRoasSimulationResult & {
    id: string;
    companyId: string;
    createdAt: string;
    updatedAt: string;
  };

export type BreakEvenRoasSimulationList = {
  items: BreakEvenRoasSimulation[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};

export type BreakEvenRoasSimulationBulkDeleteResult = {
  ids: string[];
  totalDeleted: number;
};
