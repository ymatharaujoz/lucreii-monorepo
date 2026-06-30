import { orderListFiltersSchema } from "@lucreii/validation";
import type { OrderCanonicalStatus } from "@lucreii/types";

export class OrderListFiltersDto {
  static schema = orderListFiltersSchema;

  page?: number;
  pageSize?: number;
  search?: string;
  provider?: "mercadolivre" | "shopee" | "shein";
  status?: OrderCanonicalStatus;
  orderedFrom?: string;
  orderedTo?: string;
  sortBy?:
    | "provider"
    | "orderId"
    | "statusLabel"
    | "orderedAt"
    | "itemsSold"
    | "contributionMarginPercent"
    | "shippingAmount"
    | "tariffAmount"
    | "fixedCostAmount"
    | "totalProfitAmount"
    | "totalWithFees";
  sortDirection?: "asc" | "desc";
  includeSummary?: boolean;
}
