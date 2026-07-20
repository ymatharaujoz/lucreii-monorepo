export type IntegrationProviderSlug = "mercadolivre" | "shopee" | "shein";

export type IntegrationConnectionStatus =
  | "connected"
  | "disconnected"
  | "needs_reconnect"
  | "unavailable";

export type IntegrationConnectionRecord = {
  provider: IntegrationProviderSlug;
  displayName: string;
  status: IntegrationConnectionStatus;
  statusMessage: string;
  connectedAccountId: string | null;
  connectedAccountLabel: string | null;
  tokenExpiresAt: string | null;
  lastSyncedAt: string | null;
  connectAvailable: boolean;
  disconnectAvailable: boolean;
  connectLabel: string;
  disconnectLabel: string | null;
};

export type MarketplaceCatalogImportIssue = {
  externalProductId: string;
  message: string;
  sku: string | null;
};

export type MarketplaceCatalogImportResult = {
  conflicts: MarketplaceCatalogImportIssue[];
  created: number;
  errors: MarketplaceCatalogImportIssue[];
  found: number;
  unchanged: number;
  updated: number;
};

export type OrderImportTag = "ENVIO FLEX";

export type OrderImportPendingFinancialField =
  | "shippingOrFixedFeeAmount"
  | "taxAmount";

export type OrderImportRowError = {
  row: number;
  message: string;
  saleId?: string | null;
};

export type OrderSpreadsheetImportResult = {
  provider: IntegrationProviderSlug;
  imported: number;
  created: number;
  updated: number;
  pendingFlex: number;
  totalRows: number;
  validRows: number;
  errors: OrderImportRowError[];
};

export type IntegrationConnectResponse = {
  authorizationUrl: string;
  provider: IntegrationProviderSlug;
};
