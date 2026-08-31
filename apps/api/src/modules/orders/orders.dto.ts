import {
  orderCompositionUpdateSchema,
  orderExportQuerySchema,
  orderListFiltersSchema,
  orderProductCostBulkUpdateSchema,
} from "@lucreii/validation";
import type {
  OrderCanonicalStatus,
  OrderCompositionUpdateInput,
  OrderExportFilters,
  OrderProductCostBulkUpdateInput,
} from "@lucreii/types";

export class OrderListFiltersDto {
  static schema = orderListFiltersSchema;

  page?: number;
  pageSize?: number;
  search?: string;
  saleId?: string;
  sku?: string;
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

export class UpdateOrderCompositionDto implements OrderCompositionUpdateInput {
  static schema = orderCompositionUpdateSchema;

  refundBonusAmount?: string;
  productCostAmount?: string;
  marketplaceCommissionAmount?: string;
  shippingOrFixedFeeAmount?: string;
  packagingCostAmount?: string;
}

export class UpdateOrderProductCostBulkDto
  implements OrderProductCostBulkUpdateInput
{
  static schema = orderProductCostBulkUpdateSchema;

  orderIds!: string[];
  productCostAmount!: string;
}

export class OrderExportQueryDto implements OrderExportFilters {
  static schema = orderExportQuerySchema;

  ids?: string[];
  search?: string;
  saleId?: string;
  sku?: string;
  provider?: "mercadolivre" | "shopee" | "shein";
  status?: OrderCanonicalStatus;
  orderedFrom?: string;
  orderedTo?: string;
}
