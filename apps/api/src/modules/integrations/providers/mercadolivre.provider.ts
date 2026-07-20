import { createHash } from "node:crypto";
import { Logger } from "@nestjs/common";
import type { ApiRuntimeEnv } from "@/common/config/api-env";
import {
  type IntegrationCatalogImportContext,
  type IntegrationCatalogSingleItemImportContext,
  type IntegrationCatalogProduct,
  IntegrationProviderError,
  type IntegrationProvider,
  type IntegrationProviderAuthorization,
  type IntegrationProviderCallbackInput,
  type IntegrationProviderCallbackResult,
  type IntegrationProviderContext,
  type IntegrationSyncContext,
  type IntegrationSyncFee,
  type IntegrationSyncNotification,
  type IntegrationSyncOrder,
  type IntegrationSyncOrderItem,
  type IntegrationSyncProduct,
  type IntegrationSyncResult,
  type IntegrationProviderTokenRefreshResult,
} from "../integrations.types";
import type { MarketplaceConnection } from "@lucreii/database";

type MercadoLivreItemSearchResponse = {
  results?: Array<string | number>;
  scroll_id?: string;
};

type MercadoLivreItemPicture = {
  id?: string;
  secure_url?: string;
  url?: string;
};

type MercadoLivreItemVariation = {
  attributes?: MercadoLivreItemAttribute[];
  attribute_combinations?: Array<{
    name?: string;
    value_name?: string;
  }>;
  id?: string | number;
  picture_ids?: string[];
  price?: number;
  seller_custom_field?: string | null;
  seller_sku?: string | null;
};

type MercadoLivreItemAttribute = {
  id?: string;
  name?: string;
  value_name?: string | null;
  values?: Array<{
    name?: string | null;
  }>;
};

type MercadoLivreItemResponse = {
  attributes?: MercadoLivreItemAttribute[];
  catalog_listing?: boolean;
  catalog_product_id?: string | number | null;
  id?: string;
  pictures?: MercadoLivreItemPicture[];
  price?: number;
  seller_custom_field?: string | null;
  seller_sku?: string | null;
  status?: string;
  title?: string;
  user_product_id?: string | number | null;
  variations?: MercadoLivreItemVariation[];
};

type MercadoLivreUserProductResponse = {
  attributes?: MercadoLivreItemAttribute[];
  family_id?: string | number;
  family_name?: string;
  id?: string | number;
  pictures?: MercadoLivreItemPicture[];
  seller_sku?: string | null;
  siblings?: Array<{
    attributes?: MercadoLivreItemAttribute[];
    id?: string | number;
    pictures?: MercadoLivreItemPicture[];
    seller_sku?: string | null;
  }>;
  status?: string;
};

type MercadoLivreVariationDetailResponse = {
  attributes?: MercadoLivreItemAttribute[];
  attribute_combinations?: Array<{
    name?: string;
    value_name?: string;
  }>;
  id?: string | number;
  picture_ids?: string[];
  price?: number;
  seller_custom_field?: string | null;
  seller_sku?: string | null;
};

type MercadoLivreMultiGetResponse = Array<{
  body?: MercadoLivreItemResponse;
  code?: number;
}>;

type MercadoLivreTokenResponse = {
  access_token?: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
  user_id?: number;
};

type MercadoLivreProfileResponse = {
  email?: string;
  first_name?: string;
  id?: number;
  last_name?: string;
  nickname?: string;
  site_id?: string;
};

type MercadoLivreOrderSearchResponse = {
  paging?: {
    limit?: number;
    offset?: number;
    total?: number;
  };
  results?: MercadoLivreOrderResponse[];
};

type MercadoLivreOrderResponse = {
  currency_id?: string;
  date_closed?: string;
  date_created?: string;
  id?: number | string;
  order_items?: MercadoLivreOrderItemResponse[];
  pack_id?: number | string;
  payments?: Array<{
    fee_amount?: number;
    id?: number | string;
    marketplace_fee?: number;
    shipping_cost?: number;
  }>;
  seller?: {
    id?: number;
  };
  shipping?: {
    id?: number | string;
  };
  shipping_cost?: number;
  status?: string;
  tags?: string[];
  total_amount?: number;
};

type MercadoLivreOrderDetailResponse = MercadoLivreOrderResponse;

type MercadoLivrePackResponse = {
  orders?: Array<{
    id?: number | string;
  }>;
};

type MercadoLivreShipmentCostsResponse = {
  receiver?: {
    cost?: number | string;
    discounts?: Array<{
      promoted_amount?: number | string;
    }>;
  };
  senders?: Array<{
    cost?: number | string;
    user_id?: number | string;
  }>;
};

type MercadoLivreShipmentResponse = {
  logistic?: {
    mode?: string | null;
    type?: string | null;
  } | null;
};

type MercadoLivrePaymentFinancialDetail = {
  amount?: number;
  amounts?: {
    paid?: number;
    original?: number;
    refunded?: number;
    total?: number;
  };
  collector?: string;
  description?: string;
  detail?: string;
  fee_payer?: string;
  name?: string;
  reason?: string;
  type?: string;
  value?: number;
};

type MercadoLivrePaymentResponse = {
  charges_details?: MercadoLivrePaymentFinancialDetail[];
  fee_details?: MercadoLivrePaymentFinancialDetail[];
  id?: number | string;
  net_received_amount?: number | string;
  transaction_details?: {
    net_received_amount?: number | string;
  };
};

export type MercadoLivreShippingCostResolution = {
  amount: number;
  metadata?: Record<string, unknown>;
  refundBonusAdjustment?: MercadoLivreFinancialAdjustment | null;
  source:
    | "billing/integration/group/ML/order/details"
    | "payment.charges_details.shipping"
    | "payment.fee_details.shipping"
    | "shipment_costs.senders"
    | "shipment_detail.order_cost"
    | "shipment_detail.shipping_option.cost";
};

type MercadoLivreShipmentCostLookup = {
  buyerShippingAmount: number;
  lookupStatus: "missing_seller" | "request_failed" | "resolved";
  sellerCost: MercadoLivreShippingCostResolution | null;
};

type MercadoLivreOrderItemResponse = {
  item?: {
    category_id?: string;
    id?: number | string;
    seller_custom_field?: string | null;
    variation_id?: number | string;
    seller_sku?: string;
    title?: string;
  };
  listing_type_id?: string;
  quantity_cancelled?: number;
  quantity_refunded?: number;
  quantity?: number;
  variation_id?: number | string;
  sale_fee?: number;
  unit_price?: number;
};

type MercadoLivreListingPriceResponse = {
  sale_fee_amount?: number;
  sale_fee_details?: {
    fixed_fee?: number;
    gross_amount?: number;
    percentage_fee?: number;
  };
};

type MercadoLivreBillingDetailFeeResponse = {
  discount?: number;
  discount_reason?: string | null;
  fixed_fee?: number;
  fee_amount?: number;
  gross?: number;
  net?: number;
  rebate?: number;
};

type MercadoLivreBillingChargeInfo = Record<string, unknown> & {
  charge_bonified_id?: number | string | null;
  detail_amount?: number | string | null;
  detail_id?: number | string | null;
  detail_sub_type?: string | null;
  detail_type?: string | null;
  status?: string | null;
  transaction_detail?: string | null;
};

type MercadoLivreBillingDiscountInfo = Record<string, unknown> & {
  discount_amount?: number | string | null;
  discount_reason?: string | null;
  rebate?: number | string | null;
};

type MercadoLivreBillingSalesInfo = Record<string, unknown> & {
  operation_id?: number | string | null;
  pack_id?: number | string | null;
  payment_id?: number | string | null;
  order_id?: number | string | null;
  sale_fee?: MercadoLivreBillingDetailFeeResponse | null;
  shipment_id?: number | string | null;
};

type MercadoLivreBillingMovementDetail = Record<string, unknown> & {
  charge_info?: MercadoLivreBillingChargeInfo | null;
  discount_info?: MercadoLivreBillingDiscountInfo | null;
  document_info?: {
    document_id?: number | string | null;
  } | null;
  pack_id?: number | string | null;
  payment_id?: number | string | null;
  sales_info?: MercadoLivreBillingSalesInfo[];
  shipment_id?: number | string | null;
  shipping_info?: {
    pack_id?: number | string | null;
    receiver_shipping_cost?: number | string | null;
    shipment_id?: number | string | null;
    shipping_id?: number | string | null;
  } | null;
};

type MercadoLivreBillingDetailResult = Record<string, unknown> & {
  charge_info?: MercadoLivreBillingChargeInfo | null;
  details?: MercadoLivreBillingMovementDetail[];
  discount_info?: MercadoLivreBillingDiscountInfo | null;
  document_info?: {
    document_id?: number | string | null;
  } | null;
  fixed_fee?: number;
  fee_amount?: number;
  operation_id?: number | string;
  pack_id?: number | string | null;
  payment_id?: number | string | null;
  order_id?: number | string;
  sale_fee?: MercadoLivreBillingDetailFeeResponse | null;
  sales_info?: MercadoLivreBillingSalesInfo[];
  shipment_id?: number | string | null;
  shipping_info?: {
    pack_id?: number | string | null;
    shipment_id?: number | string | null;
    shipping_id?: number | string | null;
  } | null;
};

type MercadoLivreBillingAdjustmentResult = Record<string, unknown> & {
  operation_id?: number | string;
  sale_fee?: MercadoLivreBillingDetailFeeResponse | null;
};

type MercadoLivreFinancialAdjustment = {
  amount: number;
  componentAmounts?: {
    creditNote: number;
    detailDiscount: number;
    detailRebate: number;
    saleFeeDiscount: number;
    saleFeeRebate: number;
    shippingDiscount?: number;
  };
  movementKeys?: string[];
  movements?: Array<{
    amount: number;
    documentType: MercadoLivreBillingDocumentType;
    key: string;
    payload: Record<string, unknown> | null;
    source: string;
  }>;
  operationId: string | null;
  originalDescription: string | null;
  originalType: string | null;
  rawPayload: Record<string, unknown> | null;
  source:
    | "billing/integration/group/ML/order/details"
    | "billing/integration/periods"
    | "billing/credit_note"
    | "shipment_costs.senders";
};

type MercadoLivreCollectedFees = {
  fees: IntegrationSyncFee[];
  refundBonusAdjustment: MercadoLivreFinancialAdjustment | null;
};

export type MercadoLivreBillingDetailResponse = {
  last_id?: number | string;
  limit?: number;
  offset?: number;
  results?: MercadoLivreBillingDetailResult[];
  total?: number;
  errors?: unknown[];
};

type MercadoLivreBillingDocumentType = "BILL" | "CREDIT_NOTE";

type MercadoLivreBillingFeeBreakdown = {
  available: boolean;
  permanentError: boolean;
  fixedFee: number | null;
  grossAmount: number | null;
  marketplaceCommission: number | null;
  operationId: string | null;
  refundBonus: number | null;
  refundBonusAdjustment: MercadoLivreFinancialAdjustment | null;
};

type MercadoLivreRefundBonusResolution = {
  adjustment: MercadoLivreFinancialAdjustment | null;
  status: "PENDING" | "RESOLVED" | "RESOLVED_ZERO" | "ERROR";
};

type MercadoLivreBillingOrderShippingDetail = Record<string, unknown> & {
  charge_info?: MercadoLivreBillingChargeInfo;
  detail_amount?: number | string;
  marketplace_info?: {
    marketplace?: string | null;
  };
  order_id?: number | string;
  shipping_info?: {
    receiver_shipping_cost?: number | string;
    shipment_id?: number | string;
    shipping_id?: number | string;
  };
};

type MercadoLivreBillingOrderResult = MercadoLivreBillingOrderShippingDetail & {
  details?: MercadoLivreBillingOrderShippingDetail[];
  discount_info?: MercadoLivreBillingDiscountInfo | null;
  operation_id?: number | string;
  sale_fee?: MercadoLivreBillingDetailFeeResponse | null;
  sales_info?: MercadoLivreBillingSalesInfo[];
  total?: number | string;
  total_amount?: number | string;
};

type MercadoLivreBillingOrderDetailsResolution = {
  available: boolean;
  permanentError: boolean;
  payload: MercadoLivreBillingOrderDetailsResponse | null;
};

type MercadoLivreSpreadsheetFixedCostResolution = {
  fixedCost: number | null;
  orderIds: string[];
};

type MercadoLivreBillingOrderFeeBreakdown = {
  fixedFee: number | null;
  grossAmount: number | null;
  operationId: string | null;
};

export type MercadoLivreBillingOrderDetailsResponse = Record<
  string,
  unknown
> & {
  details?: MercadoLivreBillingOrderShippingDetail[];
  results?: MercadoLivreBillingOrderResult[];
};

type MercadoLivreBillingOrderAdjustmentMetadata = {
  mercadoLivreRefundBonusAmount?: string;
  mercadoLivreRefundBonusComponentAmounts?: Record<string, string>;
  mercadoLivreRefundBonusMovementKeys?: string[];
  mercadoLivreRefundBonusOriginalDescription?: string | null;
  mercadoLivreRefundBonusOriginalType?: string | null;
  mercadoLivreRefundBonusOperationId?: string | null;
  mercadoLivreRefundBonusSource?: MercadoLivreFinancialAdjustment["source"];
};

function toDecimalString(value: number | string | null | undefined) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value.toFixed(2);
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed.toFixed(2) : "0.00";
  }

  return "0.00";
}

function toBillingPeriodKey(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

function dedupeProducts(products: IntegrationSyncProduct[]) {
  const unique = new Map<string, IntegrationSyncProduct>();

  for (const product of products) {
    unique.set(product.externalProductId, product);
  }

  return Array.from(unique.values());
}

async function parseProviderResponse(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return response.json();
  }

  return response.text();
}

function sanitizeProviderPayload(payload: unknown) {
  if (typeof payload === "string") {
    return payload;
  }

  if (!payload || typeof payload !== "object") {
    return null;
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (/(token|secret|password)/i.test(key)) {
      sanitized[key] = "[redacted]";
      continue;
    }
    sanitized[key] = value;
  }

  return sanitized;
}

function buildCodeChallenge(codeVerifier: string) {
  return createHash("sha256").update(codeVerifier).digest("base64url");
}

function readBillingFixedFee(
  result:
    | {
        fixed_fee?: number;
        fee_amount?: number;
        sale_fee?: MercadoLivreBillingDetailFeeResponse | null;
      }
    | null
    | undefined,
) {
  if (!result) {
    return null;
  }

  const candidates = [
    result.fixed_fee,
    result.fee_amount,
    result.sale_fee?.fixed_fee,
    result.sale_fee?.fee_amount,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "number" && candidate > 0) {
      return candidate;
    }
  }

  return null;
}

function readBillingMarketplaceCommission(
  result:
    | {
        sale_fee?: MercadoLivreBillingDetailFeeResponse | null;
      }
    | null
    | undefined,
) {
  if (!result) {
    return null;
  }

  if (typeof result.sale_fee?.net === "number" && result.sale_fee.net > 0) {
    return result.sale_fee.net;
  }

  const fixedFee = readBillingFixedFee(result);
  if (
    typeof result.sale_fee?.gross === "number" &&
    result.sale_fee.gross > 0 &&
    fixedFee !== null &&
    result.sale_fee.gross > fixedFee
  ) {
    return result.sale_fee.gross - fixedFee;
  }

  return null;
}

function normalizeBillingText(value: unknown) {
  return typeof value === "string"
    ? value
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .toLowerCase()
    : "";
}

function readPositiveBillingNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return null;
}

function readBillingMoneyNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

function readBillingResultOrderIds(result: MercadoLivreBillingDetailResult) {
  const ids = new Set<string>();
  const add = (value: unknown) => {
    if (value !== undefined && value !== null && String(value).trim()) {
      ids.add(String(value));
    }
  };

  add(result.order_id);
  for (const salesInfo of result.sales_info ?? []) {
    add(salesInfo.order_id);
  }

  for (const detail of result.details ?? []) {
    for (const salesInfo of detail.sales_info ?? []) {
      add(salesInfo.order_id);
    }
  }

  return ids;
}

function readBillingResultOperationIds(
  result: MercadoLivreBillingDetailResult,
) {
  const ids = new Set<string>();
  const add = (value: unknown) => {
    if (value !== undefined && value !== null && String(value).trim()) {
      ids.add(String(value));
    }
  };

  add(result.operation_id);
  for (const salesInfo of result.sales_info ?? []) {
    add(salesInfo.operation_id);
  }

  for (const detail of result.details ?? []) {
    for (const salesInfo of detail.sales_info ?? []) {
      add(salesInfo.operation_id);
    }
  }

  return ids;
}

function readBillingResultRelatedIds(result: MercadoLivreBillingDetailResult) {
  const ids = new Set<string>();
  const add = (value: unknown) => {
    if (value !== undefined && value !== null && String(value).trim()) {
      ids.add(String(value));
    }
  };

  for (const operationId of readBillingResultOperationIds(result)) {
    add(operationId);
  }
  add(result.pack_id);
  add(result.payment_id);
  add(result.shipment_id);
  add(result.shipping_info?.pack_id);
  add(result.shipping_info?.shipment_id);
  add(result.shipping_info?.shipping_id);

  for (const salesInfo of result.sales_info ?? []) {
    add(salesInfo.pack_id);
    add(salesInfo.payment_id);
    add(salesInfo.shipment_id);
  }

  for (const detail of result.details ?? []) {
    add(detail.pack_id);
    add(detail.payment_id);
    add(detail.shipment_id);
    add(detail.shipping_info?.pack_id);
    add(detail.shipping_info?.shipment_id);
    add(detail.shipping_info?.shipping_id);

    for (const salesInfo of detail.sales_info ?? []) {
      add(salesInfo.pack_id);
      add(salesInfo.payment_id);
      add(salesInfo.shipment_id);
    }
  }

  return ids;
}

function readMercadoLivreOrderRelatedIds(order: MercadoLivreOrderResponse) {
  const ids = new Set<string>();
  const add = (value: unknown) => {
    if (value !== undefined && value !== null && String(value).trim()) {
      ids.add(String(value));
    }
  };

  add(order.id);
  add(order.pack_id);
  add(order.shipping?.id);
  for (const payment of order.payments ?? []) {
    add(payment.id);
  }

  return ids;
}

function billingResultMatchesOrder(
  result: MercadoLivreBillingDetailResult,
  order: MercadoLivreOrderResponse,
) {
  const orderIds = readMercadoLivreOrderRelatedIds(order);
  for (const orderId of readBillingResultOrderIds(result)) {
    if (orderIds.has(orderId)) {
      return true;
    }
  }

  for (const relatedId of readBillingResultRelatedIds(result)) {
    if (orderIds.has(relatedId)) {
      return true;
    }
  }

  return false;
}

function selectBillingResultsForOrder(
  results: MercadoLivreBillingDetailResult[],
  order: MercadoLivreOrderResponse,
) {
  const orderId =
    order.id !== undefined && order.id !== null ? String(order.id) : null;
  const exactResults = orderId
    ? results.filter((result) => readBillingResultOrderIds(result).has(orderId))
    : [];

  return exactResults.length > 0
    ? exactResults
    : results.filter((result) => billingResultMatchesOrder(result, order));
}

function mergeBillingFinancialAdjustments(
  adjustments: MercadoLivreFinancialAdjustment[],
) {
  if (adjustments.length === 0) {
    return null;
  }

  const seenMovementKeys = new Set<string>();
  const movements: NonNullable<MercadoLivreFinancialAdjustment["movements"]> =
    [];
  const components = {
    creditNote: 0,
    detailDiscount: 0,
    detailRebate: 0,
    saleFeeDiscount: 0,
    saleFeeRebate: 0,
    shippingDiscount: 0,
  };
  let amount = 0;

  for (const adjustment of adjustments) {
    const movementKeys = adjustment.movementKeys ?? [];
    const uniqueKeys = movementKeys.filter((key) => !seenMovementKeys.has(key));

    if (uniqueKeys.length === 0 && movementKeys.length > 0) {
      continue;
    }

    for (const key of uniqueKeys) {
      seenMovementKeys.add(key);
    }

    for (const movement of adjustment.movements ?? []) {
      if (!seenMovementKeys.has(movement.key)) {
        continue;
      }

      if (!movements.some((entry) => entry.key === movement.key)) {
        movements.push(movement);
      }
    }

    amount += adjustment.amount;
    for (const [key, value] of Object.entries(
      adjustment.componentAmounts ?? {},
    )) {
      if (key in components && typeof value === "number") {
        components[key as keyof typeof components] += value;
      }
    }
  }

  if (amount <= 0) {
    return null;
  }

  const first = adjustments[0]!;
  return {
    ...first,
    amount: roundMoneyNumber(amount),
    componentAmounts: Object.fromEntries(
      Object.entries(components).map(([key, value]) => [
        key,
        roundMoneyNumber(value),
      ]),
    ) as MercadoLivreFinancialAdjustment["componentAmounts"],
    movementKeys: Array.from(seenMovementKeys),
    movements,
  } satisfies MercadoLivreFinancialAdjustment;
}

function hasMercadoLivreShippingBonus(
  adjustment: MercadoLivreFinancialAdjustment | null | undefined,
) {
  if (
    !adjustment ||
    (adjustment.componentAmounts?.shippingDiscount ?? 0) <= 0
  ) {
    return false;
  }

  return (
    adjustment.source === "shipment_costs.senders" ||
    adjustment.movements?.some(
      (movement) =>
        movement.source === "shipment_costs.senders" ||
        movement.key.startsWith("shipping:"),
    ) === true
  );
}

function flattenBillingOrderDetails(
  payload: MercadoLivreBillingOrderDetailsResponse,
) {
  const details = [...(payload.details ?? [])];

  for (const result of payload.results ?? []) {
    if ("details" in result && Array.isArray(result.details)) {
      details.push(...result.details);
      continue;
    }

    details.push(result as MercadoLivreBillingOrderShippingDetail);
  }

  return details;
}

function readBillingOrderResultTotalAmount(
  result: MercadoLivreBillingOrderResult,
) {
  const record = result as Record<string, unknown>;
  const nestedAmounts =
    record.amounts && typeof record.amounts === "object"
      ? (record.amounts as Record<string, unknown>)
      : null;
  const nestedSummary =
    record.summary && typeof record.summary === "object"
      ? (record.summary as Record<string, unknown>)
      : null;
  const candidates = [
    result.total_amount,
    result.total,
    record.billing_total_amount,
    record.net_total,
    record.net_amount,
    nestedAmounts?.total,
    nestedAmounts?.net_total,
    nestedSummary?.total,
    nestedSummary?.net_total,
  ];

  for (const candidate of candidates) {
    const amount = readBillingMoneyNumber(candidate);
    if (amount !== null && amount > 0) {
      return amount;
    }
  }

  return null;
}

function readMercadoLivreBillingTotalAmountFromFees(
  fees: IntegrationSyncFee[],
) {
  for (const fee of fees) {
    const metadata =
      fee.metadata && typeof fee.metadata === "object"
        ? (fee.metadata as Record<string, unknown>)
        : null;
    const amount = readBillingMoneyNumber(
      metadata?.mercadoLivreBillingTotalAmount,
    );

    if (amount !== null && amount > 0) {
      return toDecimalString(amount);
    }
  }

  return null;
}

function findBillingOrderResult(input: {
  orderId: string;
  payload: MercadoLivreBillingOrderDetailsResponse;
}) {
  return (input.payload.results ?? []).find((result) =>
    readBillingResultOrderIds(result).has(input.orderId),
  );
}

function readBillingOrderTotalAmount(input: {
  orderId: string;
  payload: MercadoLivreBillingOrderDetailsResponse;
}) {
  const results = input.payload.results ?? [];
  const matchingResult = findBillingOrderResult(input);
  const orderedResults = matchingResult
    ? [matchingResult, ...results.filter((result) => result !== matchingResult)]
    : results;

  for (const result of orderedResults) {
    const amount = readBillingOrderResultTotalAmount(result);
    if (amount !== null) {
      return roundMoneyNumber(amount);
    }
  }

  return null;
}

function readMercadoLivreBillingOrderFeeBreakdown(input: {
  orderId: string;
  payload: MercadoLivreBillingOrderDetailsResponse;
}): MercadoLivreBillingOrderFeeBreakdown {
  const result = findBillingOrderResult(input);
  const grossAmount = readBillingMoneyNumber(result?.sale_fee?.gross);
  const fixedFee = readBillingMoneyNumber(result?.sale_fee?.fixed_fee);

  return {
    fixedFee:
      fixedFee !== null && fixedFee >= 0 ? roundMoneyNumber(fixedFee) : null,
    grossAmount:
      grossAmount !== null && grossAmount > 0
        ? roundMoneyNumber(grossAmount)
        : null,
    operationId: [...readBillingResultOperationIds(result ?? {})][0] ?? null,
  };
}

function readBillingOrderFinancialAdjustment(input: {
  orderId: string;
  payload: MercadoLivreBillingOrderDetailsResponse;
}) {
  const matchingResults = (input.payload.results ?? []).filter((result) =>
    readBillingResultOrderIds(result).has(input.orderId),
  );

  return mergeBillingFinancialAdjustments(
    matchingResults
      .map((result) =>
        readBillingFinancialAdjustment(
          result,
          "billing/integration/group/ML/order/details",
        ),
      )
      .filter(
        (value): value is MercadoLivreFinancialAdjustment =>
          value !== null && value !== undefined,
      ),
  );
}

function readBillingOrderSaleFeeRebate(input: {
  orderId: string;
  payload: MercadoLivreBillingOrderDetailsResponse;
}) {
  const result = findBillingOrderResult(input);
  const rebate = readBillingMoneyNumber(result?.sale_fee?.rebate);

  return rebate !== null && rebate >= 0 ? roundMoneyNumber(rebate) : null;
}

export function readMercadoLivreBillingOrderRefundBonus(input: {
  orderId: string;
  payload: MercadoLivreBillingOrderDetailsResponse;
}) {
  return readBillingOrderFinancialAdjustment(input);
}

export function readMercadoLivreBillingRefundBonus(input: {
  documentType: MercadoLivreBillingDocumentType;
  orderId: string;
  payload: MercadoLivreBillingDetailResponse;
}) {
  const source: MercadoLivreFinancialAdjustment["source"] =
    input.documentType === "CREDIT_NOTE"
      ? "billing/credit_note"
      : "billing/integration/periods";
  const matches = (input.payload.results ?? []).filter((result) =>
    readBillingResultOrderIds(result).has(input.orderId),
  );

  return mergeBillingFinancialAdjustments(
    matches
      .map((result) => readBillingFinancialAdjustment(result, source))
      .filter(
        (value): value is MercadoLivreFinancialAdjustment =>
          value !== null && value !== undefined,
      ),
  );
}

function readMercadoLivreBillingRefundBonusAdjustmentFromFees(
  fees: IntegrationSyncFee[],
): MercadoLivreFinancialAdjustment | null {
  const adjustments: MercadoLivreFinancialAdjustment[] = [];

  for (const fee of fees) {
    const metadata =
      fee.metadata && typeof fee.metadata === "object"
        ? (fee.metadata as MercadoLivreBillingOrderAdjustmentMetadata &
            Record<string, unknown>)
        : null;
    const amount = readBillingMoneyNumber(
      metadata?.mercadoLivreRefundBonusAmount,
    );

    if (amount !== null && amount > 0) {
      adjustments.push({
        amount: roundMoneyNumber(amount),
        componentAmounts: metadata?.mercadoLivreRefundBonusComponentAmounts
          ? (Object.fromEntries(
              Object.entries(
                metadata.mercadoLivreRefundBonusComponentAmounts,
              ).map(([key, value]) => [key, Number(value) || 0]),
            ) as MercadoLivreFinancialAdjustment["componentAmounts"])
          : undefined,
        movementKeys: metadata?.mercadoLivreRefundBonusMovementKeys,
        operationId:
          typeof metadata?.mercadoLivreRefundBonusOperationId === "string"
            ? metadata.mercadoLivreRefundBonusOperationId
            : null,
        originalDescription:
          typeof metadata?.mercadoLivreRefundBonusOriginalDescription ===
          "string"
            ? metadata.mercadoLivreRefundBonusOriginalDescription
            : null,
        originalType:
          typeof metadata?.mercadoLivreRefundBonusOriginalType === "string"
            ? metadata.mercadoLivreRefundBonusOriginalType
            : null,
        rawPayload:
          metadata?.raw_billing_payload &&
          typeof metadata.raw_billing_payload === "object"
            ? (metadata.raw_billing_payload as Record<string, unknown>)
            : null,
        source:
          metadata?.mercadoLivreRefundBonusSource ??
          "billing/integration/group/ML/order/details",
      });
    }
  }

  return mergeBillingFinancialAdjustments(adjustments);
}

function readBillingReceiverShippingCost(
  details: MercadoLivreBillingOrderShippingDetail[],
) {
  const cffeDetail = details.find(
    (detail) =>
      detail.charge_info?.detail_sub_type === "CFFE" &&
      detail.shipping_info?.receiver_shipping_cost != null,
  );
  const detail =
    cffeDetail ??
    details.find(
      (candidate) => candidate.shipping_info?.receiver_shipping_cost != null,
    );

  return readBillingMoneyNumber(detail?.shipping_info?.receiver_shipping_cost);
}

function readBillingCffeAmount(
  details: MercadoLivreBillingOrderShippingDetail[],
) {
  return details.reduce((sum, detail) => {
    if (detail.charge_info?.detail_sub_type !== "CFFE") {
      return sum;
    }

    return (
      sum + (readBillingMoneyNumber(detail.charge_info.detail_amount) ?? 0)
    );
  }, 0);
}

export function readMercadoLivreBillingOrderShippingCost(input: {
  orderId: string;
  payload: MercadoLivreBillingOrderDetailsResponse;
}): MercadoLivreShippingCostResolution | null {
  const details = flattenBillingOrderDetails(input.payload);
  const billingTotalAmount = readBillingOrderTotalAmount(input);
  const financialAdjustment = readBillingOrderFinancialAdjustment(input);

  const buyerPaid = readBillingReceiverShippingCost(details) ?? 0;
  const sellerFee = readBillingCffeAmount(details);

  const roundedBuyerPaid = roundMoneyNumber(buyerPaid);
  const roundedSellerFee = roundMoneyNumber(sellerFee);

  const netAmount = roundMoneyNumber(roundedBuyerPaid - roundedSellerFee);
  const sellerShippingCost = Math.abs(netAmount);

  if (
    isAlmostEqualMoney(roundedBuyerPaid, 0) &&
    isAlmostEqualMoney(roundedSellerFee, 0) &&
    billingTotalAmount === null &&
    financialAdjustment === null
  ) {
    return null;
  }

  const sanitizedPayload = sanitizeProviderPayload(input.payload);

  return {
    amount: sellerShippingCost,
    refundBonusAdjustment: financialAdjustment,
    metadata: {
      buyerShippingAmount: roundedBuyerPaid,
      grossShippingTariffAmount: roundedSellerFee,
      raw_billing_payload: sanitizedPayload,
      ...(billingTotalAmount !== null
        ? {
            mercadoLivreBillingTotalAmount: toDecimalString(billingTotalAmount),
          }
        : {}),
      ...(financialAdjustment
        ? {
            mercadoLivreRefundBonusAmount: toDecimalString(
              financialAdjustment.amount,
            ),
            ...(financialAdjustment.componentAmounts
              ? {
                  mercadoLivreRefundBonusComponentAmounts: Object.fromEntries(
                    Object.entries(financialAdjustment.componentAmounts).map(
                      ([key, value]) => [key, toDecimalString(value)],
                    ),
                  ),
                }
              : {}),
            ...(financialAdjustment.movementKeys
              ? {
                  mercadoLivreRefundBonusMovementKeys:
                    financialAdjustment.movementKeys,
                }
              : {}),
            mercadoLivreRefundBonusOperationId: financialAdjustment.operationId,
            mercadoLivreRefundBonusOriginalDescription:
              financialAdjustment.originalDescription,
            mercadoLivreRefundBonusOriginalType:
              financialAdjustment.originalType,
            mercadoLivreRefundBonusSource: financialAdjustment.source,
          }
        : {}),
      shipping_buyer_paid: toDecimalString(roundedBuyerPaid),
      shipping_net_amount: toDecimalString(netAmount),
      shipping_seller_fee: toDecimalString(roundedSellerFee),
    },
    source: "billing/integration/group/ML/order/details",
  };
}

function readBillingFinancialAdjustment(
  result: MercadoLivreBillingAdjustmentResult | null | undefined,
  source: MercadoLivreFinancialAdjustment["source"] = "billing/integration/periods",
): MercadoLivreFinancialAdjustment | null {
  if (!result) {
    return null;
  }

  const billingResult = result as MercadoLivreBillingDetailResult;
  const saleFeeRebate =
    readPositiveBillingNumber(billingResult.sale_fee?.rebate) ?? 0;
  if (saleFeeRebate <= 0) {
    return null;
  }

  const orderId = [...readBillingResultOrderIds(billingResult)][0] ?? "unknown";
  const movementKey = `sale_fee:${orderId}`;
  const rawPayload = sanitizeProviderPayload(result) as Record<
    string,
    unknown
  > | null;

  return {
    amount: saleFeeRebate,
    componentAmounts: {
      creditNote: 0,
      detailDiscount: 0,
      detailRebate: 0,
      saleFeeDiscount: 0,
      saleFeeRebate,
    },
    movementKeys: [movementKey],
    operationId: [...readBillingResultOperationIds(billingResult)][0] ?? null,
    originalDescription: billingResult.sale_fee?.discount_reason ?? null,
    originalType: "SALE_FEE_REBATE",
    rawPayload,
    source,
    movements: [
      {
        amount: saleFeeRebate,
        documentType: "BILL",
        key: movementKey,
        payload: rawPayload,
        source,
      },
    ],
  } satisfies MercadoLivreFinancialAdjustment;
}

function readPaymentNetReceivedAmount(payload: MercadoLivrePaymentResponse) {
  const candidates = [
    payload.transaction_details?.net_received_amount,
    payload.net_received_amount,
  ];

  for (const candidate of candidates) {
    const amount = readPositiveBillingNumber(candidate);
    if (amount !== null) {
      return amount;
    }
  }

  return null;
}

function roundMoneyNumber(value: number) {
  return Math.round(value * 100) / 100;
}

function isAlmostEqualMoney(left: number, right: number) {
  return Math.abs(left - right) < 0.01;
}

function readListingPriceMarketplaceCommission(
  payload: MercadoLivreListingPriceResponse | null | undefined,
) {
  if (!payload) {
    return null;
  }

  const grossAmount = payload.sale_fee_details?.gross_amount;
  const fixedFee = payload.sale_fee_details?.fixed_fee;
  const saleFeeAmount = payload.sale_fee_amount;
  if (
    typeof saleFeeAmount === "number" &&
    saleFeeAmount > 0 &&
    typeof fixedFee === "number" &&
    fixedFee >= 0 &&
    saleFeeAmount >= fixedFee
  ) {
    return saleFeeAmount - fixedFee;
  }

  if (typeof saleFeeAmount === "number" && saleFeeAmount > 0) {
    return saleFeeAmount;
  }

  if (
    typeof grossAmount === "number" &&
    grossAmount > 0 &&
    typeof fixedFee === "number" &&
    fixedFee >= 0 &&
    grossAmount >= fixedFee
  ) {
    return grossAmount - fixedFee;
  }

  return typeof grossAmount === "number" && grossAmount > 0
    ? grossAmount
    : null;
}

function deriveMercadoLivreSiteId(itemId: number | string | null | undefined) {
  if (!itemId) {
    return null;
  }

  const normalized = String(itemId).trim().toUpperCase();
  if (normalized.length < 3) {
    return null;
  }

  const prefix = normalized.slice(0, 3);
  return /^[A-Z]{3}$/.test(prefix) ? prefix : null;
}

function normalizeMercadoLivreManualSku(value: string | null | undefined) {
  const sku = value?.trim();
  if (!sku) {
    return null;
  }

  const normalized = sku.toUpperCase();
  const isInternalSku =
    /^ML-\d+(?:-MLBU\d+)?$/.test(normalized) ||
    /^ML-(?:MLB|MLBU)[A-Z0-9:-]+$/.test(normalized) ||
    /^(?:MLB|MLBU)\d+$/.test(normalized);

  return isInternalSku ? null : sku;
}

function normalizeMercadoLivreSku(value: string | null | undefined) {
  const sku = value?.trim();
  return sku ? sku : null;
}

function readMercadoLivreAttributeSku(
  attributes: MercadoLivreItemAttribute[] | undefined,
) {
  for (const attribute of attributes ?? []) {
    const attributeId = attribute.id?.trim().toUpperCase();
    const attributeName = attribute.name?.trim().toUpperCase();

    if (attributeId !== "SELLER_SKU" && attributeName !== "SKU") {
      continue;
    }

    const value =
      attribute.value_name?.trim() ??
      attribute.values?.[0]?.name?.trim() ??
      null;
    if (value) {
      return value;
    }
  }

  return null;
}

function buildMercadoLivreVariationLabel(
  attributeCombinations:
    | Array<{
        name?: string;
        value_name?: string;
      }>
    | undefined,
) {
  const labels = (attributeCombinations ?? [])
    .map((attribute) => {
      const name = attribute.name?.trim();
      const value = attribute.value_name?.trim();
      return name && value ? `${name}: ${value}` : null;
    })
    .filter((value): value is string => value !== null);

  return labels.length > 0 ? labels.join(", ") : null;
}

function readMercadoLivreAttributeValue(
  attributes: MercadoLivreItemAttribute[] | undefined,
  targetId: string,
) {
  const normalizedTargetId = targetId.trim().toUpperCase();

  for (const attribute of attributes ?? []) {
    if (attribute.id?.trim().toUpperCase() !== normalizedTargetId) {
      continue;
    }

    const value = normalizeMercadoLivreManualSku(
      attribute.value_name?.trim() ??
        attribute.values?.[0]?.name?.trim() ??
        null,
    );
    if (value) {
      return value;
    }
  }

  return null;
}

function buildMercadoLivreUserProductLabel(
  attributes: MercadoLivreItemAttribute[] | undefined,
) {
  const color = readMercadoLivreAttributeValue(attributes, "COLOR");
  const size = readMercadoLivreAttributeValue(attributes, "SIZE");
  const labels = [
    color ? `Cor: ${color}` : null,
    size ? `Tamanho: ${size}` : null,
  ].filter((value): value is string => value !== null);

  return labels.length > 0 ? labels.join(", ") : null;
}

function toOptionalString(value: number | string | null | undefined) {
  if (value === null || value === undefined) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeMercadoLivrePictureUrls(
  pictures: MercadoLivreItemPicture[] | undefined,
) {
  const urls: string[] = [];
  const seen = new Set<string>();

  for (const picture of pictures ?? []) {
    const url = picture.secure_url ?? picture.url ?? "";
    if (!url.startsWith("https://") || seen.has(url)) {
      continue;
    }

    seen.add(url);
    urls.push(url);
  }

  return urls;
}

function dedupeCatalogProductsByExternalProductId(
  products: IntegrationCatalogProduct[],
) {
  const deduped: IntegrationCatalogProduct[] = [];
  const seen = new Set<string>();

  for (const product of products) {
    if (seen.has(product.externalProductId)) {
      continue;
    }

    seen.add(product.externalProductId);
    deduped.push(product);
  }

  return deduped;
}

function toTimestamp(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? null : timestamp;
}

function extractMercadoLivreOrderIdFromNotification(
  notification: IntegrationSyncNotification | null | undefined,
) {
  if (!notification || typeof notification !== "object") {
    return null;
  }

  const candidate =
    "notificationId" in notification &&
    typeof notification.notificationId === "string" &&
    notification.notificationId.trim().length > 0
      ? notification.notificationId.trim()
      : "resource" in notification &&
          typeof notification.resource === "string" &&
          notification.resource.trim().length > 0
        ? notification.resource.trim()
        : null;

  if (!candidate) {
    return null;
  }

  const match = candidate.match(/\/orders\/([^/?]+)/i);
  return match?.[1] ? decodeURIComponent(match[1]) : candidate;
}

function resolveMercadoLivreReturnQuantity(
  item: MercadoLivreOrderItemResponse,
) {
  const candidates = [item.quantity_refunded, item.quantity_cancelled];

  for (const candidate of candidates) {
    if (
      typeof candidate === "number" &&
      Number.isFinite(candidate) &&
      candidate > 0
    ) {
      return Math.max(0, Math.trunc(candidate));
    }
  }

  return 0;
}

export class MercadoLivreProvider implements IntegrationProvider {
  readonly displayName = "Mercado Livre";
  readonly provider = "mercadolivre" as const;
  private readonly logger = new Logger(MercadoLivreProvider.name);
  private readonly billingDetailCache = new Map<
    string,
    Promise<{
      available: boolean;
      permanentError: boolean;
      payload: MercadoLivreBillingDetailResponse | null;
    }>
  >();
  private readonly billingOrderDetailCache = new Map<
    string,
    Promise<MercadoLivreBillingOrderDetailsResolution>
  >();
  private readonly spreadsheetOrderIdCache = new Map<
    string,
    Promise<string[]>
  >();
  private readonly spreadsheetOrderCache = new Map<
    string,
    Promise<MercadoLivreOrderDetailResponse | null>
  >();
  private readonly spreadsheetFixedCostCache = new Map<
    string,
    Promise<number | null>
  >();
  private readonly paymentDetailCache = new Map<
    string,
    Promise<MercadoLivrePaymentResponse | null>
  >();
  private readonly shipmentDetailCache = new Map<
    string,
    Promise<MercadoLivreShipmentResponse | null>
  >();

  constructor(private readonly env: ApiRuntimeEnv) {}

  isConfigured() {
    return Boolean(
      this.env.MERCADOLIVRE_CLIENT_ID && this.env.MERCADOLIVRE_CLIENT_SECRET,
    );
  }

  supportsSync() {
    return this.isConfigured();
  }

  async createAuthorization(
    input: IntegrationProviderContext,
  ): Promise<IntegrationProviderAuthorization> {
    if (!this.isConfigured()) {
      throw new IntegrationProviderError(
        "Mercado Livre is not configured in the API environment.",
        "provider_not_configured",
      );
    }

    const url = new URL("https://auth.mercadolivre.com.br/authorization");
    url.searchParams.set("client_id", this.env.MERCADOLIVRE_CLIENT_ID ?? "");
    url.searchParams.set("redirect_uri", this.getRedirectUri());
    url.searchParams.set("response_type", "code");
    url.searchParams.set("state", input.state);

    if (this.env.MERCADOLIVRE_USE_PKCE) {
      if (!input.codeVerifier) {
        throw new IntegrationProviderError(
          "PKCE do Mercado Livre está habilitado, mas o code_verifier não foi gerado.",
          "callback_invalid",
        );
      }

      url.searchParams.set(
        "code_challenge",
        buildCodeChallenge(input.codeVerifier),
      );
      url.searchParams.set("code_challenge_method", "S256");
    }

    return {
      authorizationUrl: url.toString(),
    };
  }

  async exchangeCode(
    code: string,
    input: IntegrationProviderCallbackInput = {},
  ): Promise<IntegrationProviderCallbackResult> {
    if (!this.isConfigured()) {
      throw new IntegrationProviderError(
        "Mercado Livre is not configured in the API environment.",
        "provider_not_configured",
      );
    }

    if (this.env.MERCADOLIVRE_USE_PKCE && !input.codeVerifier) {
      throw new IntegrationProviderError(
        "PKCE do Mercado Livre está habilitado, mas o code_verifier do callback não foi encontrado.",
        "callback_invalid",
      );
    }

    const tokenRequestBody = new URLSearchParams({
      client_id: this.env.MERCADOLIVRE_CLIENT_ID ?? "",
      client_secret: this.env.MERCADOLIVRE_CLIENT_SECRET ?? "",
      code,
      grant_type: "authorization_code",
      redirect_uri: this.getRedirectUri(),
    });

    if (input.codeVerifier) {
      tokenRequestBody.set("code_verifier", input.codeVerifier);
    }

    const tokenResponse = await fetch(
      "https://api.mercadolibre.com/oauth/token",
      {
        body: tokenRequestBody,
        headers: {
          accept: "application/json",
          "content-type": "application/x-www-form-urlencoded",
        },
        method: "POST",
      },
    );

    const tokenPayload = (await parseProviderResponse(tokenResponse)) as
      | MercadoLivreTokenResponse
      | string;

    if (
      !tokenResponse.ok ||
      typeof tokenPayload === "string" ||
      !tokenPayload.access_token
    ) {
      throw new IntegrationProviderError(
        `Mercado Livre token exchange failed.${
          typeof tokenPayload === "string"
            ? ` status=${tokenResponse.status} payload=${tokenPayload}`
            : ` status=${tokenResponse.status} payload=${JSON.stringify(sanitizeProviderPayload(tokenPayload))}`
        }`,
        "remote_request_failed",
      );
    }

    const profileResponse = await fetch(
      "https://api.mercadolibre.com/users/me",
      {
        headers: {
          Authorization: `Bearer ${tokenPayload.access_token}`,
          accept: "application/json",
        },
        method: "GET",
      },
    );
    const profilePayload = (await parseProviderResponse(profileResponse)) as
      | MercadoLivreProfileResponse
      | string;

    if (
      !profileResponse.ok ||
      typeof profilePayload === "string" ||
      !profilePayload.id
    ) {
      throw new IntegrationProviderError(
        `Mercado Livre account lookup failed.${
          typeof profilePayload === "string"
            ? ` status=${profileResponse.status} payload=${profilePayload}`
            : ` status=${profileResponse.status} payload=${JSON.stringify(sanitizeProviderPayload(profilePayload))}`
        }`,
        "remote_request_failed",
      );
    }

    return {
      accessToken: tokenPayload.access_token,
      connectedAccountId: String(profilePayload.id ?? tokenPayload.user_id),
      connectedAccountLabel:
        profilePayload.nickname ??
        profilePayload.email ??
        ([profilePayload.first_name, profilePayload.last_name]
          .filter(Boolean)
          .join(" ")
          .trim() ||
          null),
      metadata: {
        email: profilePayload.email ?? null,
        firstName: profilePayload.first_name ?? null,
        lastName: profilePayload.last_name ?? null,
        nickname: profilePayload.nickname ?? null,
        scope: tokenPayload.scope ?? null,
        siteId: profilePayload.site_id ?? null,
        tokenType: tokenPayload.token_type ?? null,
      },
      refreshToken: tokenPayload.refresh_token ?? null,
      tokenExpiresAt:
        typeof tokenPayload.expires_in === "number"
          ? new Date(Date.now() + tokenPayload.expires_in * 1000)
          : null,
    };
  }

  async disconnect() {
    return undefined;
  }

  async refreshAccessToken(
    connection: MarketplaceConnection,
  ): Promise<IntegrationProviderTokenRefreshResult> {
    if (!connection.refreshToken) {
      throw new IntegrationProviderError(
        "Mercado Livre connection is missing refresh_token.",
        "callback_invalid",
      );
    }

    const tokenRequestBody = new URLSearchParams({
      client_id: this.env.MERCADOLIVRE_CLIENT_ID ?? "",
      client_secret: this.env.MERCADOLIVRE_CLIENT_SECRET ?? "",
      grant_type: "refresh_token",
      refresh_token: connection.refreshToken,
    });

    const tokenResponse = await fetch(
      "https://api.mercadolibre.com/oauth/token",
      {
        body: tokenRequestBody,
        headers: {
          accept: "application/json",
          "content-type": "application/x-www-form-urlencoded",
        },
        method: "POST",
      },
    );

    const tokenPayload = (await parseProviderResponse(tokenResponse)) as
      | MercadoLivreTokenResponse
      | string;

    if (
      !tokenResponse.ok ||
      typeof tokenPayload === "string" ||
      !tokenPayload.access_token
    ) {
      throw new IntegrationProviderError(
        `Mercado Livre token refresh failed.${
          typeof tokenPayload === "string"
            ? ` status=${tokenResponse.status} payload=${tokenPayload}`
            : ` status=${tokenResponse.status} payload=${JSON.stringify(sanitizeProviderPayload(tokenPayload))}`
        }`,
        "remote_request_failed",
      );
    }

    return {
      accessToken: tokenPayload.access_token,
      refreshToken: tokenPayload.refresh_token ?? connection.refreshToken,
      tokenExpiresAt:
        typeof tokenPayload.expires_in === "number"
          ? new Date(Date.now() + tokenPayload.expires_in * 1000)
          : new Date(Date.now() + 6 * 60 * 60 * 1000),
    };
  }

  async resolveSpreadsheetFixedCost(input: {
    accessToken: string;
    orderId: string;
  }): Promise<number | null> {
    const cacheKey = `${input.accessToken}:${input.orderId}`;
    let fixedCostPromise = this.spreadsheetFixedCostCache.get(cacheKey);

    if (!fixedCostPromise) {
      fixedCostPromise = (async () => {
        const order = await this.fetchSpreadsheetOrderDetails({
          accessToken: input.accessToken,
          orderId: input.orderId,
        });

        if (!order) {
          throw new IntegrationProviderError(
            `Mercado Livre order lookup failed for order ${input.orderId}.`,
            "remote_request_failed",
          );
        }

        const listingPriceBreakdown = await this.fetchListingPriceFeeBreakdown({
          accessToken: input.accessToken,
          order,
          useSaleFeeAsFixedFeeFallback: false,
        });

        if (!listingPriceBreakdown) {
          return null;
        }

        if (listingPriceBreakdown.fixedFee !== null) {
          return roundMoneyNumber(listingPriceBreakdown.fixedFee);
        }

        if (listingPriceBreakdown.marketplaceCommission === null) {
          return null;
        }

        const billingResolution = await this.fetchBillingOrderDetailsResolution(
          {
            accessToken: input.accessToken,
            orderId: input.orderId,
          },
        );
        if (!billingResolution.available || !billingResolution.payload) {
          throw new IntegrationProviderError(
            `Mercado Livre billing lookup failed for order ${input.orderId}.`,
            "remote_request_failed",
          );
        }

        const billingGrossAmount = readMercadoLivreBillingOrderFeeBreakdown({
          orderId: input.orderId,
          payload: billingResolution.payload,
        }).grossAmount;
        if (
          billingGrossAmount === null ||
          billingGrossAmount < listingPriceBreakdown.marketplaceCommission ||
          (listingPriceBreakdown.grossAmount !== null &&
            !isAlmostEqualMoney(
              billingGrossAmount,
              listingPriceBreakdown.grossAmount,
            ))
        ) {
          return null;
        }

        return roundMoneyNumber(
          billingGrossAmount - listingPriceBreakdown.marketplaceCommission,
        );
      })();
      this.spreadsheetFixedCostCache.set(cacheKey, fixedCostPromise);
    }

    return fixedCostPromise;
  }

  async resolveSpreadsheetFixedCostForSale(input: {
    accessToken: string;
    saleId: string;
  }): Promise<MercadoLivreSpreadsheetFixedCostResolution> {
    const orderIds = await this.resolveSpreadsheetOrderIds(input);
    if (orderIds.length === 0) {
      return { fixedCost: null, orderIds };
    }

    const fixedCosts = await Promise.all(
      orderIds.map((orderId) =>
        this.resolveSpreadsheetFixedCost({
          accessToken: input.accessToken,
          orderId,
        }),
      ),
    );

    const resolvedFixedCosts = fixedCosts.filter(
      (fixedCost): fixedCost is number => fixedCost !== null,
    );
    if (resolvedFixedCosts.length !== orderIds.length) {
      return { fixedCost: null, orderIds };
    }

    return {
      fixedCost: roundMoneyNumber(
        resolvedFixedCosts.reduce((total, fixedCost) => total + fixedCost, 0),
      ),
      orderIds,
    };
  }

  async importCatalog(
    input: IntegrationCatalogImportContext,
  ): Promise<IntegrationCatalogProduct[]> {
    const accountId = input.connection.externalAccountId;
    const accessToken = input.connection.accessToken;

    if (!accountId || !accessToken) {
      throw new IntegrationProviderError(
        "Mercado Livre connection is missing the account token required for catalog import.",
        "callback_invalid",
      );
    }

    const itemIds = await this.fetchCatalogItemIds({
      accessToken,
      accountId,
    });
    const products: IntegrationCatalogProduct[] = [];

    for (let offset = 0; offset < itemIds.length; offset += 20) {
      const itemBatch = await this.fetchCatalogItems({
        accessToken,
        itemIds: itemIds.slice(offset, offset + 20),
      });

      for (const item of itemBatch) {
        products.push(
          ...(await this.normalizeCatalogProductsFromItem({
            accessToken,
            item,
          })),
        );
      }
    }

    return dedupeCatalogProductsByExternalProductId(products);
  }

  async importCatalogByExternalProductId(
    input: IntegrationCatalogSingleItemImportContext,
  ): Promise<IntegrationCatalogProduct[]> {
    const accessToken = input.connection.accessToken;
    const accountId = input.connection.externalAccountId;
    const externalProductId = input.externalProductId.trim();

    if (!accessToken || !externalProductId) {
      throw new IntegrationProviderError(
        "Mercado Livre connection is missing the account token required for catalog import.",
        "callback_invalid",
      );
    }

    if (
      externalProductId.startsWith("MLB") &&
      !externalProductId.startsWith("MLBU")
    ) {
      const [item] = await this.fetchCatalogItems({
        accessToken,
        itemIds: [externalProductId],
      });

      if (!item) {
        return [];
      }

      return this.normalizeCatalogProductsFromItem({
        accessToken,
        item,
      });
    }

    if (!accountId) {
      throw new IntegrationProviderError(
        "Mercado Livre connection is missing the seller account required for family catalog import.",
        "callback_invalid",
      );
    }

    const resolvedItem = await this.resolveUserProductBackedCatalogItem({
      accessToken,
      accountId,
      externalProductId,
    });

    if (!resolvedItem) {
      return [];
    }

    return this.normalizeMercadoLivreUserProductFamily({
      item: resolvedItem.item,
      userProduct: resolvedItem.userProduct,
    });
  }

  async syncOrders(
    input: IntegrationSyncContext,
  ): Promise<IntegrationSyncResult> {
    if (!this.supportsSync()) {
      throw new IntegrationProviderError(
        "Mercado Livre sync is not configured in the API environment.",
        "provider_not_configured",
      );
    }

    const accountId = input.connection.externalAccountId;

    if (!accountId || !input.connection.accessToken) {
      throw new IntegrationProviderError(
        "Mercado Livre connection is missing the account token required for sync.",
        "callback_invalid",
      );
    }

    const isManualRange = input.mode === "manual_range";
    const incrementalOrderedAfter =
      !isManualRange &&
      input.cursor &&
      typeof input.cursor === "object" &&
      typeof input.cursor.orderedAfter === "string"
        ? input.cursor.orderedAfter
        : null;

    const notificationOrderId = !isManualRange
      ? extractMercadoLivreOrderIdFromNotification(input.notification)
      : null;

    if (!isManualRange && notificationOrderId) {
      const detail = await this.fetchOrderDetails({
        accessToken: input.connection.accessToken,
        orderId: notificationOrderId,
      });
      const order = detail
        ? await this.normalizeOrder(
            detail,
            {
              accessToken: input.connection.accessToken,
              sellerAccountId: accountId,
            },
            detail,
          )
        : null;
      const orders = order ? [order] : [];
      const products = dedupeProducts(
        orders.flatMap((entry) =>
          entry.items
            .filter((item) => item.externalProductId !== null)
            .map<IntegrationSyncProduct>((item) => ({
              externalProductId: item.externalProductId ?? "",
              metadata: {
                source: "mercadolivre-order-item",
                variationId: item.variationId ?? null,
              },
              sku: item.sku ?? null,
              title: item.title ?? null,
            })),
        ),
      );
      const nextOrderedAfter = orders.reduce<string | null>((latest, entry) => {
        if (!entry.orderedAt) {
          return latest;
        }

        return latest === null || entry.orderedAt > latest
          ? entry.orderedAt
          : latest;
      }, incrementalOrderedAfter);

      return {
        cursor: nextOrderedAfter
          ? {
              orderedAfter: nextOrderedAfter,
            }
          : input.cursor,
        orders,
        products,
      };
    }

    const orderFetchResult = isManualRange
      ? await this.fetchOrders({
          accessToken: input.connection.accessToken,
          accountId,
          mode: "manual_range",
          rangeEndAt: input.range.endAt,
          rangeStartAt: input.range.startAt,
        })
      : await this.fetchOrders({
          accessToken: input.connection.accessToken,
          accountId,
          mode: "incremental",
          orderedAfter: incrementalOrderedAfter,
        });
    const { metadata, orders } = orderFetchResult;

    const products = dedupeProducts(
      orders.flatMap((order) =>
        order.items
          .filter((item) => item.externalProductId !== null)
          .map<IntegrationSyncProduct>((item) => ({
            externalProductId: item.externalProductId ?? "",
            metadata: {
              source: "mercadolivre-order-item",
              variationId: item.variationId ?? null,
            },
            sku: item.sku ?? null,
            title: item.title ?? null,
          })),
      ),
    );

    const nextOrderedAfter = isManualRange
      ? null
      : orders.reduce<string | null>((latest, order) => {
          if (!order.orderedAt) {
            return latest;
          }

          return latest === null || order.orderedAt > latest
            ? order.orderedAt
            : latest;
        }, incrementalOrderedAfter);

    return {
      cursor: nextOrderedAfter
        ? {
            orderedAfter: nextOrderedAfter,
          }
        : !isManualRange
          ? input.cursor
          : null,
      metadata,
      orders,
      products,
    };
  }

  private async fetchCatalogItemIds(input: {
    accessToken: string;
    accountId: string;
  }) {
    const itemIds: string[] = [];
    for (const status of ["active", "paused"] as const) {
      let scrollId: string | null = null;

      do {
        const url = new URL(
          `https://api.mercadolibre.com/users/${encodeURIComponent(input.accountId)}/items/search`,
        );
        url.searchParams.set("status", status);
        url.searchParams.set("search_type", "scan");
        url.searchParams.set("limit", "100");
        if (scrollId) {
          url.searchParams.set("scroll_id", scrollId);
        }

        const response = await this.fetchWithRetry(url, {
          headers: { Authorization: `Bearer ${input.accessToken}` },
        });
        const payload = (await parseProviderResponse(response)) as
          | MercadoLivreItemSearchResponse
          | string;

        if (!response.ok || typeof payload === "string") {
          throw new IntegrationProviderError(
            `Mercado Livre catalog search failed.${typeof payload === "string" ? ` ${payload}` : ""}`,
            "remote_request_failed",
          );
        }

        const pageIds = (payload.results ?? []).map(String);
        itemIds.push(...pageIds);
        scrollId = payload.scroll_id ?? null;

        if (pageIds.length === 0) {
          break;
        }
      } while (scrollId);
    }

    return [...new Set(itemIds)];
  }

  private async fetchCatalogItems(input: {
    accessToken: string;
    itemIds: string[];
  }) {
    if (input.itemIds.length === 0) {
      return [];
    }

    const url = new URL("https://api.mercadolibre.com/items");
    url.searchParams.set("ids", input.itemIds.join(","));
    const response = await this.fetchWithRetry(url, {
      headers: { Authorization: `Bearer ${input.accessToken}` },
    });
    const payload = (await parseProviderResponse(response)) as
      | MercadoLivreMultiGetResponse
      | string;

    if (
      !response.ok ||
      typeof payload === "string" ||
      !Array.isArray(payload)
    ) {
      throw new IntegrationProviderError(
        `Mercado Livre item lookup failed.${typeof payload === "string" ? ` ${payload}` : ""}`,
        "remote_request_failed",
      );
    }

    return payload
      .filter((entry) => entry.code === 200 && entry.body?.id)
      .map((entry) => entry.body!);
  }

  private async fetchVariationDetails(input: {
    accessToken: string;
    item: MercadoLivreItemResponse;
  }) {
    const itemId = input.item.id;
    const variations = input.item.variations ?? [];

    if (!itemId || variations.length === 0) {
      return new Map<string, MercadoLivreVariationDetailResponse>();
    }

    const variationDetails = await Promise.all(
      variations.map(async (variation) => {
        if (variation.id === undefined || variation.id === null) {
          return null;
        }

        const variationId = String(variation.id);
        const url = new URL(
          `https://api.mercadolibre.com/items/${encodeURIComponent(itemId)}/variations/${encodeURIComponent(variationId)}`,
        );
        const response = await this.fetchWithRetry(url, {
          headers: { Authorization: `Bearer ${input.accessToken}` },
        });
        const payload = (await parseProviderResponse(response)) as
          | MercadoLivreVariationDetailResponse
          | string;

        if (!response.ok || typeof payload === "string" || !payload.id) {
          throw new IntegrationProviderError(
            `Mercado Livre variation lookup failed.${typeof payload === "string" ? ` ${payload}` : ""}`,
            "remote_request_failed",
          );
        }

        return [variationId, payload] as const;
      }),
    );

    return new Map(
      variationDetails.filter(
        (
          entry,
        ): entry is readonly [string, MercadoLivreVariationDetailResponse] =>
          entry !== null,
      ),
    );
  }

  private readMercadoLivreItemUserProductId(item: MercadoLivreItemResponse) {
    const candidates = [item.user_product_id, item.catalog_product_id];

    for (const candidate of candidates) {
      const normalized = toOptionalString(candidate);
      if (normalized?.startsWith("MLBU")) {
        return normalized;
      }
    }

    return null;
  }

  private async fetchUserProduct(input: {
    accessToken: string;
    userProductId: string;
  }) {
    const response = await this.fetchWithRetry(
      `https://api.mercadolibre.com/user-products/${encodeURIComponent(input.userProductId)}`,
      {
        headers: { Authorization: `Bearer ${input.accessToken}` },
      },
    );
    const payload = (await parseProviderResponse(response)) as
      | MercadoLivreUserProductResponse
      | string;

    if (!response.ok || typeof payload === "string" || !payload.id) {
      throw new IntegrationProviderError(
        `Mercado Livre user product lookup failed.${typeof payload === "string" ? ` ${payload}` : ""}`,
        "remote_request_failed",
      );
    }

    return payload;
  }

  private async resolveUserProductBackedCatalogItem(input: {
    accessToken: string;
    accountId: string;
    externalProductId: string;
  }) {
    const targetUserProductId = input.externalProductId.startsWith("MLBU")
      ? input.externalProductId
      : null;
    const targetFamilyId =
      targetUserProductId === null ? input.externalProductId : null;
    const itemIds = await this.fetchCatalogItemIds({
      accessToken: input.accessToken,
      accountId: input.accountId,
    });

    for (let offset = 0; offset < itemIds.length; offset += 20) {
      const itemBatch = await this.fetchCatalogItems({
        accessToken: input.accessToken,
        itemIds: itemIds.slice(offset, offset + 20),
      });

      for (const item of itemBatch) {
        const userProductId = this.readMercadoLivreItemUserProductId(item);
        if (!userProductId) {
          continue;
        }

        if (targetUserProductId && userProductId !== targetUserProductId) {
          continue;
        }

        const userProduct = await this.fetchUserProduct({
          accessToken: input.accessToken,
          userProductId,
        });
        const familyId = toOptionalString(userProduct.family_id);
        const resolvedUserProductId = toOptionalString(userProduct.id);

        if (
          (targetUserProductId &&
            resolvedUserProductId === targetUserProductId) ||
          (targetFamilyId && familyId === targetFamilyId)
        ) {
          return {
            item,
            userProduct,
          };
        }
      }
    }

    return null;
  }

  private async normalizeCatalogProductsFromItem(input: {
    accessToken: string;
    item: MercadoLivreItemResponse;
  }) {
    const userProductId = this.readMercadoLivreItemUserProductId(input.item);
    if (userProductId) {
      const userProduct = await this.fetchUserProduct({
        accessToken: input.accessToken,
        userProductId,
      });
      return this.normalizeMercadoLivreUserProductFamily({
        item: input.item,
        userProduct,
      });
    }

    const variationDetailsById = await this.fetchVariationDetails({
      accessToken: input.accessToken,
      item: input.item,
    });

    return this.normalizeCatalogItem(input.item, variationDetailsById);
  }

  private normalizeMercadoLivreUserProductFamily(input: {
    item: MercadoLivreItemResponse | null;
    userProduct: MercadoLivreUserProductResponse;
  }): IntegrationCatalogProduct[] {
    const familyId =
      toOptionalString(input.userProduct.family_id) ??
      toOptionalString(input.userProduct.id);
    if (!familyId) {
      return [];
    }

    const familyName =
      input.userProduct.family_name?.trim() ||
      input.item?.title?.trim() ||
      `Produto Mercado Livre ${familyId}`;
    const legacyItemId = toOptionalString(input.item?.id);
    const isActive =
      input.item?.status === "active" || input.userProduct.status === "active";
    const images = normalizeMercadoLivrePictureUrls([
      ...(input.userProduct.pictures ?? []),
      ...(input.item?.pictures ?? []),
    ]);
    const sellingPrice = toDecimalString(input.item?.price);
    const siblings = input.userProduct.siblings?.length
      ? input.userProduct.siblings
      : [
          {
            attributes: input.userProduct.attributes,
            id: input.userProduct.id,
            pictures: input.userProduct.pictures,
            seller_sku: input.userProduct.seller_sku,
          },
        ];
    const products: IntegrationCatalogProduct[] = [
      {
        externalProductId: familyId,
        images,
        isActive,
        metadata: {
          familyName,
          ...(legacyItemId ? { legacyItemId } : {}),
          itemId: familyId,
          source: "mercadolivre-user-product-family",
          variationId: null,
        },
        sellingPrice,
        sku: `ML-${familyId}`,
        title: familyName,
      },
    ];
    const seenUserProductIds = new Set<string>();

    for (const sibling of siblings) {
      const userProductId = toOptionalString(sibling.id);
      if (!userProductId || seenUserProductIds.has(userProductId)) {
        continue;
      }

      seenUserProductIds.add(userProductId);
      const attributes = sibling.attributes ?? [];
      const color = readMercadoLivreAttributeValue(attributes, "COLOR");
      const size = readMercadoLivreAttributeValue(attributes, "SIZE");
      const title =
        buildMercadoLivreUserProductLabel(attributes) ?? userProductId;
      const siblingImages = normalizeMercadoLivrePictureUrls(sibling.pictures);

      products.push({
        externalProductId: userProductId,
        images: siblingImages.length > 0 ? siblingImages : images,
        isActive,
        metadata: {
          ...(color ? { color } : {}),
          itemId: familyId,
          ...(legacyItemId ? { legacyItemId } : {}),
          ...(size ? { size } : {}),
          source: "mercadolivre-user-product",
          userProductId,
          variationId: userProductId,
        },
        sellingPrice,
        sku:
          readMercadoLivreAttributeSku(attributes) ??
          normalizeMercadoLivreSku(sibling.seller_sku) ??
          `ML-${userProductId}`,
        title,
      });
    }

    return products;
  }

  private resolveCatalogItemSku(
    item: MercadoLivreItemResponse,
    variationId: string | null,
  ) {
    const itemId = String(item.id);

    if (variationId) {
      const variation = (item.variations ?? []).find(
        (entry) => String(entry.id) === variationId,
      );

      if (variation) {
        return this.resolveCatalogSku({
          attributes: variation.attributes,
          fallbackSku: `ML-${itemId}-${variationId}`,
          sellerCustomField: variation.seller_custom_field,
          sellerSku: variation.seller_sku,
        });
      }
    }

    return this.resolveCatalogSku({
      attributes: item.attributes,
      fallbackSku: `ML-${itemId}`,
      sellerCustomField: item.seller_custom_field,
      sellerSku: item.seller_sku,
    });
  }

  private resolveUserProductOrderSku(
    userProduct: MercadoLivreUserProductResponse,
  ) {
    const sellerSkuAttribute = (userProduct.attributes ?? []).find(
      (attribute) => attribute.id?.trim().toUpperCase() === "SELLER_SKU",
    );

    return (
      normalizeMercadoLivreManualSku(sellerSkuAttribute?.values?.[0]?.name) ??
      readMercadoLivreAttributeSku(userProduct.attributes)
    );
  }

  private async resolveOrderItemCatalogSku(input: {
    accessToken: string;
    item: MercadoLivreItemResponse;
    variationId: string | null;
  }) {
    const userProductId = this.readMercadoLivreItemUserProductId(input.item);
    if (userProductId) {
      const userProduct = await this.fetchUserProduct({
        accessToken: input.accessToken,
        userProductId,
      });
      return this.resolveUserProductOrderSku(userProduct);
    }

    if (input.variationId) {
      const variation = (input.item.variations ?? []).find(
        (entry) => toOptionalString(entry.id) === input.variationId,
      );

      return (
        normalizeMercadoLivreManualSku(variation?.seller_custom_field) ??
        normalizeMercadoLivreManualSku(variation?.seller_sku) ??
        normalizeMercadoLivreSku(variation?.seller_sku) ??
        (input.item.id ? `ML-${input.item.id}-${input.variationId}` : null)
      );
    }

    return (
      normalizeMercadoLivreManualSku(input.item.seller_custom_field) ??
      normalizeMercadoLivreManualSku(input.item.seller_sku) ??
      normalizeMercadoLivreSku(input.item.seller_sku) ??
      (input.item.id ? `ML-${input.item.id}` : null)
    );
  }

  private async resolveMissingOrderSkus(input: {
    accessToken: string;
    orderItems: MercadoLivreOrderItemResponse[];
  }) {
    const unresolvedItems = input.orderItems
      .map((item) => ({
        externalProductId: (() => {
          const itemId = toOptionalString(item.item?.id);
          const variationId = toOptionalString(
            item.item?.variation_id ?? item.variation_id,
          );
          return itemId && variationId ? `${itemId}:${variationId}` : itemId;
        })(),
        itemId: toOptionalString(item.item?.id),
        sku:
          normalizeMercadoLivreManualSku(item.item?.seller_sku) ||
          normalizeMercadoLivreManualSku(item.item?.seller_custom_field) ||
          normalizeMercadoLivreSku(item.item?.seller_sku) ||
          null,
        variationId: toOptionalString(
          item.item?.variation_id ?? item.variation_id,
        ),
      }))
      .filter(
        (
          entry,
        ): entry is {
          externalProductId: string;
          itemId: string;
          sku: null;
          variationId: string | null;
        } => Boolean(entry.externalProductId && entry.itemId && !entry.sku),
      );

    if (unresolvedItems.length === 0) {
      return new Map<string, string>();
    }

    let catalogItems: MercadoLivreItemResponse[];
    try {
      catalogItems = await this.fetchCatalogItems({
        accessToken: input.accessToken,
        itemIds: [...new Set(unresolvedItems.map((entry) => entry.itemId))],
      });
    } catch {
      return new Map<string, string>();
    }
    const catalogItemsById = new Map(
      catalogItems.map((item) => [String(item.id), item] as const),
    );
    const resolvedSkus = new Map<string, string>();

    for (const item of unresolvedItems) {
      const catalogItem = catalogItemsById.get(item.itemId);

      if (!catalogItem) {
        continue;
      }

      const resolvedSku = await this.resolveOrderItemCatalogSku({
        accessToken: input.accessToken,
        item: catalogItem,
        variationId: item.variationId,
      });

      if (resolvedSku) {
        resolvedSkus.set(item.externalProductId, resolvedSku);
      }
    }

    return resolvedSkus;
  }

  private normalizeCatalogItem(
    item: MercadoLivreItemResponse,
    variationDetailsById = new Map<
      string,
      MercadoLivreVariationDetailResponse
    >(),
  ): IntegrationCatalogProduct[] {
    const itemId = String(item.id);
    const itemImages = (item.pictures ?? [])
      .map((picture) => ({
        id: picture.id ?? "",
        url: picture.secure_url ?? picture.url ?? "",
      }))
      .filter((picture) => picture.url.startsWith("https://"));
    const itemImageById = new Map(
      itemImages.map((picture) => [picture.id, picture.url] as const),
    );
    const variations = item.variations ?? [];
    const itemTitle = item.title?.trim() || `Produto Mercado Livre ${itemId}`;

    const products: IntegrationCatalogProduct[] = [
      {
        externalProductId: itemId,
        images: itemImages.map((picture) => picture.url),
        isActive: item.status === "active",
        metadata: { itemId, variationId: null },
        sellingPrice: toDecimalString(item.price),
        sku: this.resolveCatalogSku({
          fallbackSku: `ML-${itemId}`,
          attributes: item.attributes,
          sellerCustomField: item.seller_custom_field,
          sellerSku: item.seller_sku,
        }),
        title: itemTitle,
      },
    ];

    if (variations.length === 0) {
      return products;
    }

    for (const variation of variations) {
      if (variation.id === undefined || variation.id === null) {
        continue;
      }

      const variationId = String(variation.id);
      const variationDetail = variationDetailsById.get(variationId);
      const variationLabel = buildMercadoLivreVariationLabel(
        variationDetail?.attribute_combinations ??
          variation.attribute_combinations,
      );
      const images = (
        variationDetail?.picture_ids ??
        variation.picture_ids ??
        []
      )
        .map((pictureId) => itemImageById.get(pictureId))
        .filter((url): url is string => Boolean(url));

      products.push({
        externalProductId: `${itemId}:${variationId}`,
        images:
          images.length > 0 ? images : itemImages.map((picture) => picture.url),
        isActive: item.status === "active",
        metadata: { itemId, variationId },
        sellingPrice: toDecimalString(
          variationDetail?.price ?? variation.price ?? item.price,
        ),
        sku: this.resolveVariationCatalogSku({
          fallbackSku: `ML-${itemId}-${variationId}`,
          attributes: variationDetail?.attributes ?? variation.attributes,
          sellerCustomField:
            variationDetail?.seller_custom_field ??
            variation.seller_custom_field,
          sellerSku: variationDetail?.seller_sku ?? variation.seller_sku,
        }),
        title: variationLabel ?? itemTitle,
      });
    }

    return products;
  }

  private resolveCatalogSku(input: {
    attributes?: MercadoLivreItemAttribute[];
    fallbackSku: string;
    sellerCustomField?: string | null;
    sellerSku?: string | null;
  }) {
    return (
      normalizeMercadoLivreManualSku(input.sellerSku) ??
      readMercadoLivreAttributeSku(input.attributes) ??
      normalizeMercadoLivreManualSku(input.sellerCustomField) ??
      normalizeMercadoLivreSku(input.sellerSku) ??
      input.fallbackSku
    );
  }

  private resolveVariationCatalogSku(input: {
    attributes?: MercadoLivreItemAttribute[];
    fallbackSku: string;
    sellerCustomField?: string | null;
    sellerSku?: string | null;
  }) {
    return (
      readMercadoLivreAttributeSku(input.attributes) ??
      normalizeMercadoLivreManualSku(input.sellerSku) ??
      normalizeMercadoLivreManualSku(input.sellerCustomField) ??
      normalizeMercadoLivreSku(input.sellerSku) ??
      input.fallbackSku
    );
  }

  private async fetchWithRetry(
    input: string | URL,
    init?: RequestInit,
  ): Promise<Response> {
    let response: Response | null = null;

    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        response = await fetch(input, init);
      } catch {
        if (attempt === 2) {
          return new Response(null, { status: 503 });
        }

        continue;
      }
      if (!response) {
        if (attempt === 2) {
          return new Response(null, { status: 503 });
        }

        continue;
      }
      if (response.status !== 429 && response.status < 500) {
        return response;
      }
    }

    return response!;
  }

  private resolveSaleTimestamp(input: {
    date_closed?: string;
    date_created?: string;
  }) {
    return input.date_closed ?? input.date_created ?? null;
  }

  private isManualRangeOrderWithinRange(
    order: IntegrationSyncOrder,
    range: {
      endAt: string;
      startAt: string;
    },
  ) {
    const orderedAt = toTimestamp(order.orderedAt);
    const startAt = toTimestamp(range.startAt);
    const endAt = toTimestamp(range.endAt);

    if (orderedAt === null || startAt === null || endAt === null) {
      return false;
    }

    return orderedAt >= startAt && orderedAt <= endAt;
  }

  private async fetchOrders(
    input:
      | {
          accessToken: string;
          accountId: string;
          mode: "incremental";
          orderedAfter: string | null;
        }
      | {
          accessToken: string;
          accountId: string;
          mode: "manual_range";
          rangeEndAt: string;
          rangeStartAt: string;
        },
  ) {
    const collected: IntegrationSyncOrder[] = [];
    let offset = 0;
    const limit = 50;
    let pageCount = 0;
    let rawOrderCount = 0;
    let total = Number.POSITIVE_INFINITY;

    while (offset < total) {
      const url = new URL("https://api.mercadolibre.com/orders/search");
      url.searchParams.set("limit", String(limit));
      url.searchParams.set("offset", String(offset));
      url.searchParams.set("seller", input.accountId);
      url.searchParams.set("sort", "date_desc");

      if (input.mode === "incremental" && input.orderedAfter) {
        url.searchParams.set("order.date_created.from", input.orderedAfter);
      }
      if (input.mode === "manual_range") {
        url.searchParams.set("order.date_created.to", input.rangeEndAt);
      }

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${input.accessToken}`,
          accept: "application/json",
        },
        method: "GET",
      });
      const payload = (await parseProviderResponse(response)) as
        | MercadoLivreOrderSearchResponse
        | string;

      if (!response.ok || typeof payload === "string") {
        throw new IntegrationProviderError(
          `Mercado Livre order fetch failed.${typeof payload === "string" ? ` ${payload}` : ""}`,
          "remote_request_failed",
        );
      }

      const rawPageOrders = payload.results ?? [];
      await this.prefetchBillingOrderDetails({
        accessToken: input.accessToken,
        orderIds: rawPageOrders
          .map((order) =>
            order.id !== undefined && order.id !== null
              ? String(order.id)
              : null,
          )
          .filter((value): value is string => value !== null),
      });

      const pageOrders = await Promise.all(
        rawPageOrders.map((order) =>
          this.normalizeOrder(order, {
            accessToken: input.accessToken,
            sellerAccountId: input.accountId,
          }),
        ),
      );
      rawOrderCount += pageOrders.length;

      collected.push(
        ...pageOrders.filter((order) =>
          input.mode === "manual_range"
            ? this.isManualRangeOrderWithinRange(order, {
                endAt: input.rangeEndAt,
                startAt: input.rangeStartAt,
              })
            : true,
        ),
      );
      total = payload.paging?.total ?? pageOrders.length;
      offset += payload.paging?.limit ?? limit;
      pageCount += 1;

      if (pageOrders.length === 0) {
        break;
      }
    }

    return {
      metadata:
        input.mode === "manual_range"
          ? {
              fetchedOrderCount: rawOrderCount,
              fetchedPageCount: pageCount,
              importedOrderCount: collected.length,
              rangeEndAt: input.rangeEndAt,
              rangeStartAt: input.rangeStartAt,
              saleDateField: "date_closed_or_date_created",
              searchUpperBoundField: "order.date_created.to",
            }
          : undefined,
      orders: collected,
    };
  }

  private async normalizeOrder(
    order: MercadoLivreOrderResponse,
    input: {
      accessToken: string;
      sellerAccountId: string;
    },
    detailedOrderOverride?: MercadoLivreOrderDetailResponse | null,
  ): Promise<IntegrationSyncOrder> {
    const detailedOrder =
      detailedOrderOverride ??
      (order.id !== undefined && order.id !== null
        ? await this.fetchOrderDetails({
            accessToken: input.accessToken,
            orderId: String(order.id),
          })
        : null);
    const resolvedOrder = detailedOrder
      ? this.mergeOrderWithDetails(order, detailedOrder)
      : order;
    const externalOrderId = String(order.id ?? "");
    const skuByExternalProductId: Record<string, string | null> = {};
    const titleByExternalProductId: Record<string, string | null> = {};
    const returnQuantityBySku: Record<string, number> = {};
    const resolvedSkuByExternalProductId = await this.resolveMissingOrderSkus({
      accessToken: input.accessToken,
      orderItems: resolvedOrder.order_items ?? [],
    });

    const items = (
      resolvedOrder.order_items ?? []
    ).map<IntegrationSyncOrderItem>((item) => {
      const itemId = toOptionalString(item.item?.id);
      const variationId = toOptionalString(
        item.item?.variation_id ?? item.variation_id,
      );
      const externalProductId =
        itemId && variationId ? `${itemId}:${variationId}` : itemId;
      const fallbackSku =
        itemId && variationId
          ? `ML-${itemId}-${variationId}`
          : itemId
            ? `ML-${itemId}`
            : null;
      const sku =
        normalizeMercadoLivreManualSku(item.item?.seller_sku) ||
        normalizeMercadoLivreManualSku(item.item?.seller_custom_field) ||
        normalizeMercadoLivreSku(item.item?.seller_sku) ||
        (externalProductId
          ? resolvedSkuByExternalProductId.get(externalProductId)
          : null) ||
        fallbackSku ||
        null;

      if (externalProductId) {
        skuByExternalProductId[externalProductId] = sku;
        titleByExternalProductId[externalProductId] = item.item?.title ?? null;
      }

      const returnedQuantity = resolveMercadoLivreReturnQuantity(item);

      if (sku && returnedQuantity > 0) {
        returnQuantityBySku[sku] =
          (returnQuantityBySku[sku] ?? 0) + returnedQuantity;
      }

      const quantity =
        typeof item.quantity === "number" && item.quantity > 0
          ? item.quantity
          : 1;
      const unitPrice = toDecimalString(item.unit_price);

      return {
        externalProductId,
        metadata:
          returnedQuantity > 0
            ? {
                returnQuantity: returnedQuantity,
              }
            : {},
        quantity,
        sku,
        totalPrice: toDecimalString((Number(unitPrice) || 0) * quantity),
        title: item.item?.title ?? null,
        unitPrice,
        variationId,
      };
    });

    const { fees, operationId, refundBonusAdjustment, refundBonusStatus } =
      await this.resolveOrderFees(order, input, detailedOrder);
    const financialAdjustment = refundBonusAdjustment;
    const refundBonusAmount = financialAdjustment
      ? toDecimalString(financialAdjustment.amount)
      : "0.00";
    const orderFees = financialAdjustment
      ? [
          ...fees,
          {
            amount: toDecimalString(financialAdjustment.amount),
            currency: resolvedOrder.currency_id ?? "BRL",
            feeType: "refund_bonus",
            metadata: {
              ...(financialAdjustment.componentAmounts
                ? {
                    componentAmounts: Object.fromEntries(
                      Object.entries(financialAdjustment.componentAmounts).map(
                        ([key, value]) => [key, toDecimalString(value)],
                      ),
                    ),
                  }
                : {}),
              ...(financialAdjustment.movementKeys
                ? { movementKeys: financialAdjustment.movementKeys }
                : {}),
              operationId: financialAdjustment.operationId,
              originalDescription: financialAdjustment.originalDescription,
              originalType: financialAdjustment.originalType,
              rawPayload: financialAdjustment.rawPayload,
              source: financialAdjustment.source,
            },
          },
        ]
      : fees;
    const mercadoLivreBillingTotalAmount =
      readMercadoLivreBillingTotalAmountFromFees(orderFees);

    return {
      currency: resolvedOrder.currency_id ?? "BRL",
      externalOrderId,
      fees: orderFees,
      items,
      metadata: {
        ...(toOptionalString(resolvedOrder.pack_id)
          ? { packId: String(resolvedOrder.pack_id) }
          : {}),
        ...(operationId ? { operationId } : {}),
        ...(mercadoLivreBillingTotalAmount
          ? { mercadoLivreBillingTotalAmount }
          : {}),
        refundBonusAmount,
        refundBonusComponentAmounts: financialAdjustment?.componentAmounts
          ? Object.fromEntries(
              Object.entries(financialAdjustment.componentAmounts).map(
                ([key, value]) => [key, toDecimalString(value)],
              ),
            )
          : {},
        refundBonusMovementKeys: financialAdjustment?.movementKeys ?? [],
        refundBonusMovements: financialAdjustment?.movements ?? [],
        refundBonusSource: financialAdjustment?.source ?? null,
        refundBonusStatus,
        returnQuantityBySku,
        skuByExternalProductId,
        tags: resolvedOrder.tags ?? [],
        titleByExternalProductId,
      },
      orderedAt: this.resolveSaleTimestamp(resolvedOrder),
      status: resolvedOrder.status ?? "imported",
      totalAmount: toDecimalString(resolvedOrder.total_amount),
    };
  }

  private async resolveOrderFees(
    order: MercadoLivreOrderResponse,
    input: {
      accessToken: string;
      sellerAccountId: string;
    },
    detailedOrderOverride?: MercadoLivreOrderDetailResponse | null,
  ) {
    const hasShipmentLookup = Boolean(order.shipping?.id);
    const initialFeeCollection = await this.collectOrderFees(order, input);
    const initialFees = initialFeeCollection.fees;

    if (!order.id) {
      const initialAdjustment = mergeBillingFinancialAdjustments(
        [
          initialFeeCollection.refundBonusAdjustment,
          readMercadoLivreBillingRefundBonusAdjustmentFromFees(initialFees),
        ].filter(
          (value): value is MercadoLivreFinancialAdjustment =>
            value !== null && value !== undefined,
        ),
      );
      return {
        fees: initialFees,
        operationId: null,
        refundBonusAdjustment: initialAdjustment,
        refundBonusStatus: initialAdjustment ? "RESOLVED" : "RESOLVED_ZERO",
      };
    }

    const shouldResolveDetailedFees = hasMercadoLivreShippingBonus(
      initialFeeCollection.refundBonusAdjustment,
    );

    if (
      this.hasCompleteFeeCoverage(initialFees) &&
      !shouldResolveDetailedFees
    ) {
      const billingResolution = await this.resolveMercadoLivreRefundBonus({
        accessToken: input.accessToken,
        fallbackDate: order.date_closed ?? order.date_created,
        order,
      });
      const initialAdjustment = mergeBillingFinancialAdjustments(
        [
          initialFeeCollection.refundBonusAdjustment,
          readMercadoLivreBillingRefundBonusAdjustmentFromFees(initialFees),
        ].filter(
          (value): value is MercadoLivreFinancialAdjustment =>
            value !== null && value !== undefined,
        ),
      );
      const financialAdjustment = mergeBillingFinancialAdjustments(
        [initialAdjustment, billingResolution.resolution.adjustment].filter(
          (value): value is MercadoLivreFinancialAdjustment =>
            value !== null && value !== undefined,
        ),
      );
      return {
        fees: initialFees,
        operationId:
          billingResolution.orderDetailsFeeBreakdown?.operationId ?? null,
        refundBonusAdjustment: financialAdjustment,
        refundBonusStatus: financialAdjustment
          ? "RESOLVED"
          : billingResolution.resolution.status,
      };
    }

    // The search payload can omit fee fields for some orders, so hydrate the
    // order detail once before giving up on commission/fixed/shipping data.
    const detailedOrder =
      detailedOrderOverride ??
      (await this.fetchOrderDetails({
        accessToken: input.accessToken,
        orderId: String(order.id),
      }));

    if (!detailedOrder) {
      const billingResolution = await this.resolveMercadoLivreRefundBonus({
        accessToken: input.accessToken,
        fallbackDate: order.date_closed ?? order.date_created,
        order,
      });
      const initialAdjustment = mergeBillingFinancialAdjustments(
        [
          initialFeeCollection.refundBonusAdjustment,
          readMercadoLivreBillingRefundBonusAdjustmentFromFees(initialFees),
        ].filter(
          (value): value is MercadoLivreFinancialAdjustment =>
            value !== null && value !== undefined,
        ),
      );
      return {
        fees: initialFees,
        operationId:
          billingResolution.orderDetailsFeeBreakdown?.operationId ?? null,
        refundBonusAdjustment: mergeBillingFinancialAdjustments(
          [initialAdjustment, billingResolution.resolution.adjustment].filter(
            (value): value is MercadoLivreFinancialAdjustment =>
              value !== null && value !== undefined,
          ),
        ),
        refundBonusStatus: billingResolution.resolution.status,
      };
    }

    const detailedOrderForFees = this.mergeOrderWithDetails(
      order,
      detailedOrder,
    );
    const detailedFeeCollection = await this.collectOrderFees(
      detailedOrderForFees,
      input,
      {
        skipShipmentLookup: hasShipmentLookup,
      },
    );
    const detailedFees = detailedFeeCollection.fees;
    const mergedDetailedFees = this.hasFeeType(detailedFees, "shipping_cost")
      ? detailedFees
      : [
          ...detailedFees,
          ...initialFees.filter((fee) => fee.feeType === "shipping_cost"),
        ];

    const hasGrossSourceCommission = mergedDetailedFees.some((fee) => {
      if (fee.feeType !== "marketplace_commission") {
        return false;
      }

      return (
        fee.metadata &&
        typeof fee.metadata === "object" &&
        "source" in fee.metadata &&
        (fee.metadata.source === "order_items.sale_fee" ||
          fee.metadata.source === "payment.marketplace_fee")
      );
    });
    const billingResolution = await this.resolveMercadoLivreRefundBonus({
      accessToken: input.accessToken,
      fallbackDate: detailedOrder.date_closed ?? detailedOrder.date_created,
      order: detailedOrderForFees,
    });
    const orderDetailsGrossAmount =
      billingResolution.orderDetailsFeeBreakdown?.grossAmount ?? null;
    const orderDetailsFixedFee =
      billingResolution.orderDetailsFeeBreakdown?.fixedFee ?? null;
    const billingFeeBreakdown =
      hasGrossSourceCommission && orderDetailsFixedFee === null
        ? await this.fetchBillingFeeBreakdown({
            accessToken: input.accessToken,
            fallbackDate:
              detailedOrder.date_closed ?? detailedOrder.date_created,
            order: detailedOrderForFees,
            documentType: "BILL",
          })
        : null;
    const listingPriceFeeBreakdown = hasGrossSourceCommission
      ? await this.fetchListingPriceFeeBreakdown({
          accessToken: input.accessToken,
          order: detailedOrderForFees,
        })
      : null;
    const listingGrossMatchesOrder =
      listingPriceFeeBreakdown !== null &&
      (orderDetailsGrossAmount === null ||
        (listingPriceFeeBreakdown.grossAmount !== null &&
          isAlmostEqualMoney(
            orderDetailsGrossAmount,
            listingPriceFeeBreakdown.grossAmount,
          )));
    const validatedListingPriceFeeBreakdown = listingGrossMatchesOrder
      ? listingPriceFeeBreakdown
      : null;
    const feeBreakdown =
      validatedListingPriceFeeBreakdown ??
      (billingFeeBreakdown &&
      (billingFeeBreakdown.marketplaceCommission !== null ||
        billingFeeBreakdown.fixedFee !== null)
        ? billingFeeBreakdown
        : null);
    const resolvedFixedFee =
      orderDetailsFixedFee ??
      validatedListingPriceFeeBreakdown?.fixedFee ??
      billingFeeBreakdown?.fixedFee ??
      null;

    const adjustedFees = mergedDetailedFees.map((fee) => {
      if (
        fee.feeType !== "marketplace_commission" ||
        !feeBreakdown ||
        feeBreakdown.marketplaceCommission === null
      ) {
        return fee;
      }

      const source =
        fee.metadata &&
        typeof fee.metadata === "object" &&
        "source" in fee.metadata &&
        (fee.metadata.source === "order_items.sale_fee" ||
          fee.metadata.source === "payment.marketplace_fee");
      if (!source) {
        return fee;
      }

      return {
        ...fee,
        amount: toDecimalString(feeBreakdown.marketplaceCommission),
        metadata: {
          ...fee.metadata,
          source:
            feeBreakdown === billingFeeBreakdown
              ? "billing.sale_fee.net"
              : "listing_prices.sale_fee_details",
        },
      };
    });

    const completedFees = [...adjustedFees];
    const orderDetailsRefundBonusAdjustment =
      readMercadoLivreBillingRefundBonusAdjustmentFromFees(completedFees);
    const financialAdjustment = mergeBillingFinancialAdjustments(
      [
        initialFeeCollection.refundBonusAdjustment,
        detailedFeeCollection.refundBonusAdjustment,
        orderDetailsRefundBonusAdjustment,
        billingResolution.resolution.adjustment,
      ].filter(
        (value): value is MercadoLivreFinancialAdjustment =>
          value !== null && value !== undefined,
      ),
    );
    const refundBonusStatus = financialAdjustment
      ? "RESOLVED"
      : billingResolution.resolution.status;

    if (!feeBreakdown || resolvedFixedFee === null) {
      return {
        fees: completedFees,
        operationId:
          billingResolution.orderDetailsFeeBreakdown?.operationId ??
          billingFeeBreakdown?.operationId ??
          null,
        refundBonusAdjustment: financialAdjustment,
        refundBonusStatus,
      };
    }

    const feesWithoutStaleFees = completedFees.filter((fee) => {
      return fee.feeType !== "fixed_fee";
    });

    if (resolvedFixedFee <= 0) {
      return {
        fees: feesWithoutStaleFees,
        operationId:
          billingResolution.orderDetailsFeeBreakdown?.operationId ??
          billingFeeBreakdown?.operationId ??
          null,
        refundBonusAdjustment: financialAdjustment,
        refundBonusStatus,
      };
    }

    return {
      fees: [
        ...feesWithoutStaleFees,
        {
          amount: toDecimalString(resolvedFixedFee),
          currency: order.currency_id ?? detailedOrder.currency_id ?? "BRL",
          feeType: "fixed_fee",
          metadata: {
            source:
              orderDetailsFixedFee !== null
                ? "billing/integration/group/ML/order/details.sale_fee.fixed_fee"
                : feeBreakdown === billingFeeBreakdown
                  ? "billing/integration/periods"
                  : "listing_prices.sale_fee_details.fixed_fee",
          },
        },
      ],
      operationId:
        billingResolution.orderDetailsFeeBreakdown?.operationId ??
        billingFeeBreakdown?.operationId ??
        null,
      refundBonusAdjustment: financialAdjustment,
      refundBonusStatus,
    };
  }

  private mergeOrderWithDetails(
    order: MercadoLivreOrderResponse,
    detailedOrder: MercadoLivreOrderDetailResponse,
  ): MercadoLivreOrderResponse {
    return {
      ...order,
      currency_id: detailedOrder.currency_id ?? order.currency_id,
      date_closed: detailedOrder.date_closed ?? order.date_closed,
      date_created: detailedOrder.date_created ?? order.date_created,
      order_items: detailedOrder.order_items ?? order.order_items,
      pack_id: detailedOrder.pack_id ?? order.pack_id,
      payments: detailedOrder.payments ?? order.payments,
      seller: detailedOrder.seller ?? order.seller,
      shipping: detailedOrder.shipping ?? order.shipping,
      shipping_cost:
        detailedOrder.shipping_cost !== undefined
          ? detailedOrder.shipping_cost
          : order.shipping_cost,
      status: detailedOrder.status ?? order.status,
      tags: detailedOrder.tags ?? order.tags,
      total_amount:
        detailedOrder.total_amount !== undefined
          ? detailedOrder.total_amount
          : order.total_amount,
    };
  }

  private async collectOrderFees(
    order: MercadoLivreOrderResponse,
    input: {
      accessToken: string;
      sellerAccountId: string;
    },
    options: {
      skipShipmentLookup?: boolean;
    } = {},
  ): Promise<MercadoLivreCollectedFees> {
    const fees: IntegrationSyncFee[] = [];

    const paymentMarketplaceFee = (order.payments ?? []).reduce(
      (sum, payment) => {
        return (
          sum +
          (typeof payment.marketplace_fee === "number"
            ? payment.marketplace_fee
            : 0)
        );
      },
      0,
    );
    const itemSaleFee = (order.order_items ?? []).reduce((sum, item) => {
      const quantity =
        typeof item.quantity === "number" && item.quantity > 0
          ? item.quantity
          : 1;
      const saleFee = typeof item.sale_fee === "number" ? item.sale_fee : 0;

      return sum + saleFee * quantity;
    }, 0);
    const marketplaceCommission =
      paymentMarketplaceFee > 0
        ? paymentMarketplaceFee
        : itemSaleFee > 0
          ? itemSaleFee
          : 0;

    if (marketplaceCommission > 0) {
      fees.push({
        amount: toDecimalString(marketplaceCommission),
        currency: order.currency_id ?? "BRL",
        feeType: "marketplace_commission",
        metadata: {
          source:
            paymentMarketplaceFee > 0
              ? "payment.marketplace_fee"
              : "order_items.sale_fee",
        },
      });
    }

    for (const payment of order.payments ?? []) {
      if (typeof payment.fee_amount === "number" && payment.fee_amount > 0) {
        fees.push({
          amount: toDecimalString(payment.fee_amount),
          currency: order.currency_id ?? "BRL",
          feeType: "fixed_fee",
          metadata: {
            source: "payments.fee_amount",
          },
        });
      }
    }

    const shippingCost = await this.resolveShippingCostWithSource(
      order,
      input,
      options,
    );

    if (shippingCost && !isAlmostEqualMoney(shippingCost.amount, 0)) {
      fees.push({
        amount: toDecimalString(shippingCost.amount),
        currency: order.currency_id ?? "BRL",
        feeType: "shipping_cost",
        metadata: {
          ...shippingCost.metadata,
          shipmentId: order.shipping?.id ? String(order.shipping.id) : null,
          source: shippingCost.source,
        },
      });
    }

    return {
      fees,
      refundBonusAdjustment: shippingCost?.refundBonusAdjustment ?? null,
    };
  }

  private hasCompleteFeeCoverage(fees: IntegrationSyncFee[]) {
    return (
      this.hasFeeType(fees, "marketplace_commission") &&
      this.hasFeeType(fees, "fixed_fee") &&
      this.hasFeeType(fees, "shipping_cost")
    );
  }

  private hasFeeType(
    fees: IntegrationSyncFee[],
    feeType: IntegrationSyncFee["feeType"],
  ) {
    return fees.some((fee) => fee.feeType === feeType);
  }

  private async resolveShippingCost(
    order: MercadoLivreOrderResponse,
    input: {
      accessToken: string;
      sellerAccountId: string;
    },
    options: {
      skipShipmentLookup?: boolean;
    } = {},
  ) {
    const shippingCost = await this.resolveShippingCostWithSource(
      order,
      input,
      options,
    );

    return shippingCost?.amount ?? 0;
  }

  private async resolveShippingCostWithSource(
    order: MercadoLivreOrderResponse,
    input: {
      accessToken: string;
      sellerAccountId: string;
    },
    options: {
      skipShipmentLookup?: boolean;
    } = {},
  ): Promise<MercadoLivreShippingCostResolution | null> {
    const shipmentId = order.shipping?.id ? String(order.shipping.id) : null;
    if (options.skipShipmentLookup) {
      return null;
    }

    if (shipmentId) {
      const shipmentCost = await this.fetchShipmentCosts({
        accessToken: input.accessToken,
        sellerAccountId: input.sellerAccountId,
        shipmentId,
      });

      if (shipmentCost.sellerCost !== null) {
        return shipmentCost.sellerCost;
      }

      if (shipmentCost.lookupStatus === "missing_seller") {
        this.logger.warn(
          `Shipment seller cost missing in /shipments/${shipmentId}/costs for seller ${input.sellerAccountId}.`,
        );
      }
    }

    if (order.id !== undefined && order.id !== null) {
      const billingShippingCost = await this.fetchBillingOrderShippingCost({
        accessToken: input.accessToken,
        orderId: String(order.id),
      });

      if (billingShippingCost !== null) {
        return billingShippingCost;
      }
    }
    return null;
  }

  private async fetchBillingOrderShippingCost(input: {
    accessToken: string;
    orderId: string;
  }): Promise<MercadoLivreShippingCostResolution | null> {
    const payload = await this.fetchBillingOrderDetailsPayload(input);

    if (!payload) {
      return null;
    }

    return readMercadoLivreBillingOrderShippingCost({
      orderId: input.orderId,
      payload,
    });
  }

  private async prefetchBillingOrderDetails(input: {
    accessToken: string;
    orderIds: string[];
  }) {
    const orderIds = Array.from(new Set(input.orderIds.filter(Boolean)));

    if (orderIds.length <= 1) {
      return;
    }

    for (let offset = 0; offset < orderIds.length; offset += 60) {
      const batch = orderIds.slice(offset, offset + 60);
      const missing = batch.filter(
        (orderId) =>
          !this.billingOrderDetailCache.has(`${input.accessToken}:${orderId}`),
      );

      if (missing.length === 0) {
        continue;
      }

      const url = new URL(
        "https://api.mercadolibre.com/billing/integration/group/ML/order/details",
      );
      url.searchParams.set("order_ids", missing.join(","));

      const response = await this.fetchWithRetry(url, {
        headers: {
          Authorization: `Bearer ${input.accessToken}`,
          accept: "application/json",
          "x-version": "2",
        },
        method: "GET",
      });
      const payload = (await parseProviderResponse(response)) as
        | MercadoLivreBillingOrderDetailsResponse
        | string;

      for (const orderId of missing) {
        const available =
          response.ok && response.status !== 206 && typeof payload !== "string";
        this.billingOrderDetailCache.set(
          `${input.accessToken}:${orderId}`,
          Promise.resolve({
            available,
            permanentError:
              !available &&
              (typeof payload === "string" ||
                (response.status >= 400 &&
                  response.status < 500 &&
                  response.status !== 429)),
            payload: available ? payload : null,
          }),
        );
      }
    }
  }

  private async fetchBillingOrderDetailsPayload(input: {
    accessToken: string;
    orderId: string;
  }): Promise<MercadoLivreBillingOrderDetailsResponse | null> {
    return (await this.fetchBillingOrderDetailsResolution(input)).payload;
  }

  private async fetchBillingOrderDetailsResolution(input: {
    accessToken: string;
    orderId: string;
  }) {
    const cacheKey = `${input.accessToken}:${input.orderId}`;
    let payloadPromise = this.billingOrderDetailCache.get(cacheKey);

    if (!payloadPromise) {
      payloadPromise = (async () => {
        const url = new URL(
          "https://api.mercadolibre.com/billing/integration/group/ML/order/details",
        );
        url.searchParams.set("order_ids", input.orderId);

        const response = await this.fetchWithRetry(url, {
          headers: {
            Authorization: `Bearer ${input.accessToken}`,
            accept: "application/json",
            "x-version": "2",
          },
          method: "GET",
        });
        const payload = (await parseProviderResponse(response)) as
          | MercadoLivreBillingOrderDetailsResponse
          | string;
        const available =
          response.ok && response.status !== 206 && typeof payload !== "string";

        return {
          available,
          permanentError:
            !available &&
            (typeof payload === "string" ||
              (response.status >= 400 &&
                response.status < 500 &&
                response.status !== 429)),
          payload: available ? payload : null,
        };
      })();
      this.billingOrderDetailCache.set(cacheKey, payloadPromise);
    }

    return payloadPromise;
  }

  private async fetchOrderDetails(input: {
    accessToken: string;
    orderId: string;
  }) {
    const url = new URL(
      `https://api.mercadolibre.com/orders/${encodeURIComponent(input.orderId)}`,
    );

    const response = await this.fetchWithRetry(url, {
      headers: {
        Authorization: `Bearer ${input.accessToken}`,
        accept: "application/json",
      },
      method: "GET",
    });

    const payload = (await parseProviderResponse(response)) as
      | MercadoLivreOrderDetailResponse
      | string;

    if (!response.ok || typeof payload === "string") {
      return null;
    }

    return payload;
  }

  private async fetchSpreadsheetOrderDetails(input: {
    accessToken: string;
    orderId: string;
  }) {
    const cacheKey = `${input.accessToken}:${input.orderId}`;
    let orderPromise = this.spreadsheetOrderCache.get(cacheKey);

    if (!orderPromise) {
      orderPromise = this.fetchOrderDetails(input);
      this.spreadsheetOrderCache.set(cacheKey, orderPromise);
    }

    return orderPromise;
  }

  private async resolveSpreadsheetOrderIds(input: {
    accessToken: string;
    saleId: string;
  }) {
    const cacheKey = `${input.accessToken}:${input.saleId}`;
    let orderIdsPromise = this.spreadsheetOrderIdCache.get(cacheKey);

    if (!orderIdsPromise) {
      orderIdsPromise = (async () => {
        const packUrl = new URL(
          `https://api.mercadolibre.com/packs/${encodeURIComponent(input.saleId)}`,
        );
        const packResponse = await this.fetchWithRetry(packUrl, {
          headers: {
            Authorization: `Bearer ${input.accessToken}`,
            accept: "application/json",
          },
          method: "GET",
        });
        const packPayload = (await parseProviderResponse(packResponse)) as
          | MercadoLivrePackResponse
          | string;
        const packOrderIds =
          packResponse.ok &&
          typeof packPayload !== "string" &&
          packPayload &&
          Array.isArray(packPayload.orders)
            ? packPayload.orders
                .map((order) =>
                  order.id !== undefined && order.id !== null
                    ? String(order.id)
                    : null,
                )
                .filter((orderId): orderId is string => orderId !== null)
            : [];

        if (packOrderIds.length > 0) {
          return Array.from(new Set(packOrderIds));
        }

        const directOrder = await this.fetchSpreadsheetOrderDetails({
          accessToken: input.accessToken,
          orderId: input.saleId,
        });
        if (directOrder?.id !== undefined && directOrder.id !== null) {
          return [String(directOrder.id)];
        }

        return [];
      })();
      this.spreadsheetOrderIdCache.set(cacheKey, orderIdsPromise);
    }

    return orderIdsPromise;
  }

  private async fetchBillingFeeBreakdown(input: {
    accessToken: string;
    fallbackDate: string | null | undefined;
    order: MercadoLivreOrderResponse;
    documentType?: MercadoLivreBillingDocumentType;
  }): Promise<MercadoLivreBillingFeeBreakdown | null> {
    const documentType = input.documentType ?? "BILL";
    const periodKey = toBillingPeriodKey(
      input.fallbackDate ?? input.order.date_closed ?? input.order.date_created,
    );

    if (!periodKey || !input.order.id) {
      return null;
    }

    const cacheKey = `${input.accessToken}:${periodKey}:ML:${documentType}:${String(input.order.id)}`;
    let payloadPromise = this.billingDetailCache.get(cacheKey);

    if (!payloadPromise) {
      payloadPromise = (async () => {
        const mergedResults: NonNullable<
          MercadoLivreBillingDetailResponse["results"]
        > = [];
        let fromId = "0";
        let pageCount = 0;

        while (pageCount < 100) {
          const url = new URL(
            `https://api.mercadolibre.com/billing/integration/periods/key/${encodeURIComponent(periodKey)}/group/ML/details`,
          );
          url.searchParams.set("document_type", documentType);
          url.searchParams.set("limit", "1000");
          url.searchParams.set("from_id", fromId);
          url.searchParams.set("order_ids", String(input.order.id));

          const response = await this.fetchWithRetry(url, {
            headers: {
              Authorization: `Bearer ${input.accessToken}`,
              accept: "application/json",
              "x-version": "2",
            },
            method: "GET",
          });

          const payload = (await parseProviderResponse(response)) as
            | MercadoLivreBillingDetailResponse
            | string;

          if (response.status === 206) {
            return { available: false, permanentError: false, payload: null };
          }

          if (!response.ok || typeof payload === "string") {
            return {
              available: false,
              permanentError:
                typeof payload === "string" ||
                (response.status >= 400 &&
                  response.status < 500 &&
                  response.status !== 429),
              payload: null,
            };
          }

          mergedResults.push(...(payload.results ?? []));
          pageCount += 1;

          const total =
            typeof payload.total === "number" && Number.isFinite(payload.total)
              ? payload.total
              : null;
          const nextFromId =
            payload.last_id !== undefined && payload.last_id !== null
              ? String(payload.last_id)
              : null;
          const hasMore =
            nextFromId !== null &&
            nextFromId.length > 0 &&
            nextFromId !== fromId &&
            (total === null || mergedResults.length < total);

          if (!hasMore) {
            return {
              available: true,
              permanentError: false,
              payload: {
                ...payload,
                results: mergedResults,
              },
            };
          }

          fromId = nextFromId;
        }

        return { available: false, permanentError: false, payload: null };
      })();
      this.billingDetailCache.set(cacheKey, payloadPromise);
    }

    const billingResponse = await payloadPromise;

    if (!billingResponse.payload) {
      return {
        available: billingResponse.available,
        permanentError: billingResponse.permanentError,
        fixedFee: null,
        grossAmount: null,
        marketplaceCommission: null,
        operationId: null,
        refundBonus: null,
        refundBonusAdjustment: null,
      };
    }

    const matchedResults = selectBillingResultsForOrder(
      billingResponse.payload.results ?? [],
      input.order,
    );
    const operationResult =
      matchedResults.find(
        (result) => readBillingResultOperationIds(result).size > 0,
      ) ?? null;
    const matchedResult = operationResult ?? matchedResults[0] ?? null;

    const fixedFee = readBillingFixedFee(matchedResult);
    const marketplaceCommission =
      readBillingMarketplaceCommission(matchedResult);
    const grossAmount =
      typeof matchedResult?.sale_fee?.gross === "number" &&
      matchedResult.sale_fee.gross > 0
        ? matchedResult.sale_fee.gross
        : null;

    const operationId = matchedResult
      ? ([...readBillingResultOperationIds(matchedResult)][0] ?? null)
      : null;

    const refundBonusAdjustment = mergeBillingFinancialAdjustments(
      matchedResults
        .map((result) =>
          readBillingFinancialAdjustment(
            result,
            documentType === "CREDIT_NOTE"
              ? "billing/credit_note"
              : "billing/integration/periods",
          ),
        )
        .filter(
          (value): value is MercadoLivreFinancialAdjustment =>
            value !== null && value !== undefined,
        ),
    );

    if (
      fixedFee === null &&
      marketplaceCommission === null &&
      grossAmount === null &&
      operationId === null &&
      refundBonusAdjustment === null
    ) {
      return {
        available: billingResponse.available,
        permanentError: billingResponse.permanentError,
        fixedFee: null,
        grossAmount: null,
        marketplaceCommission: null,
        operationId: null,
        refundBonus: null,
        refundBonusAdjustment: null,
      };
    }

    return {
      available: billingResponse.available,
      permanentError: billingResponse.permanentError,
      fixedFee: fixedFee !== null && fixedFee > 0 ? fixedFee : null,
      grossAmount,
      marketplaceCommission,
      operationId,
      refundBonus: refundBonusAdjustment?.amount ?? null,
      refundBonusAdjustment,
    };
  }

  private shouldFetchMercadoLivreCreditNote(order: MercadoLivreOrderResponse) {
    const status = normalizeBillingText(order.status);
    if (
      status.includes("refund") ||
      status.includes("return") ||
      status.includes("cancel")
    ) {
      return true;
    }

    return (order.order_items ?? []).some(
      (item) => resolveMercadoLivreReturnQuantity(item) > 0,
    );
  }

  private async resolveMercadoLivreRefundBonus(input: {
    accessToken: string;
    fallbackDate: string | null | undefined;
    order: MercadoLivreOrderResponse;
  }): Promise<{
    bill: MercadoLivreBillingFeeBreakdown | null;
    creditNote: MercadoLivreBillingFeeBreakdown | null;
    orderDetailsFeeBreakdown: MercadoLivreBillingOrderFeeBreakdown | null;
    resolution: MercadoLivreRefundBonusResolution;
  }> {
    const orderDetailsResolution = input.order.id
      ? await this.fetchBillingOrderDetailsResolution({
          accessToken: input.accessToken,
          orderId: String(input.order.id),
        })
      : null;
    const orderDetailsAdjustment = orderDetailsResolution?.payload
      ? readMercadoLivreBillingOrderRefundBonus({
          orderId: String(input.order.id),
          payload: orderDetailsResolution.payload,
        })
      : null;
    const orderDetailsRebate = orderDetailsResolution?.payload
      ? readBillingOrderSaleFeeRebate({
          orderId: String(input.order.id),
          payload: orderDetailsResolution.payload,
        })
      : null;
    const orderDetailsFeeBreakdown = orderDetailsResolution?.payload
      ? readMercadoLivreBillingOrderFeeBreakdown({
          orderId: String(input.order.id),
          payload: orderDetailsResolution.payload,
        })
      : null;
    // Refund/bonus is authoritative only in the order billing details. Period
    // documents can contain unrelated provisions and must not change this value.
    const bill = null;
    const creditNote = null;
    const adjustment = orderDetailsAdjustment;
    const billingError = orderDetailsResolution?.permanentError === true;
    const billingUnavailable =
      orderDetailsResolution === null || !orderDetailsResolution.available;

    return {
      bill,
      creditNote,
      orderDetailsFeeBreakdown,
      resolution: {
        adjustment,
        status: billingError
          ? "ERROR"
          : billingUnavailable
            ? "PENDING"
            : orderDetailsRebate === null
              ? "PENDING"
              : orderDetailsRebate > 0
                ? "RESOLVED"
                : "RESOLVED_ZERO",
      },
    };
  }

  private async fetchListingPriceFeeBreakdown(input: {
    accessToken: string;
    order: MercadoLivreOrderResponse;
    useSaleFeeAsFixedFeeFallback?: boolean;
  }) {
    const shipmentId = input.order.shipping?.id
      ? String(input.order.shipping.id)
      : null;
    const shipment = shipmentId
      ? await this.fetchShipmentDetails({
          accessToken: input.accessToken,
          shipmentId,
        })
      : null;
    const logisticType = shipment?.logistic?.type?.trim() || null;
    const shippingMode = shipment?.logistic?.mode?.trim() || null;
    const cache = new Map<
      string,
      {
        fixedFee: number | null;
        grossAmount: number | null;
        marketplaceCommission: number | null;
      } | null
    >();
    let grossAmount = 0;
    let fixedFee = 0;
    let marketplaceCommission = 0;
    let hasBreakdown = false;

    for (const item of input.order.order_items ?? []) {
      const quantity =
        typeof item.quantity === "number" && item.quantity > 0
          ? item.quantity
          : 1;
      const grossSaleFee =
        typeof item.sale_fee === "number" && item.sale_fee > 0
          ? item.sale_fee
          : null;
      const unitPrice =
        typeof item.unit_price === "number" && item.unit_price > 0
          ? item.unit_price
          : null;
      const listingTypeId = item.listing_type_id?.trim();
      const categoryId = item.item?.category_id?.trim();
      const siteId = deriveMercadoLivreSiteId(item.item?.id);

      if (
        grossSaleFee === null ||
        unitPrice === null ||
        !listingTypeId ||
        !categoryId ||
        !siteId
      ) {
        continue;
      }

      const cacheKey = `${siteId}:${listingTypeId}:${categoryId}:${unitPrice.toFixed(2)}:${logisticType ?? ""}:${shippingMode ?? ""}`;
      if (!cache.has(cacheKey)) {
        cache.set(
          cacheKey,
          await this.fetchListingPriceBreakdown({
            accessToken: input.accessToken,
            categoryId,
            currencyId: input.order.currency_id ?? "BRL",
            logisticType,
            listingTypeId,
            price: unitPrice,
            shippingMode,
            siteId,
          }),
        );
      }

      const listingPriceBreakdown = cache.get(cacheKey) ?? null;
      if (!listingPriceBreakdown?.marketplaceCommission) {
        continue;
      }

      const unitMarketplaceCommission =
        listingPriceBreakdown.marketplaceCommission;
      const unitFixedFee =
        listingPriceBreakdown.fixedFee !== null &&
        listingPriceBreakdown.fixedFee > 0
          ? listingPriceBreakdown.fixedFee
          : input.useSaleFeeAsFixedFeeFallback !== false &&
              grossSaleFee > unitMarketplaceCommission
            ? grossSaleFee - unitMarketplaceCommission
            : 0;

      hasBreakdown = true;
      grossAmount +=
        (listingPriceBreakdown.grossAmount ?? grossSaleFee) * quantity;
      marketplaceCommission += unitMarketplaceCommission * quantity;
      fixedFee += unitFixedFee * quantity;
    }

    if (!hasBreakdown) {
      return null;
    }

    return {
      fixedFee: fixedFee > 0 ? fixedFee : null,
      grossAmount: grossAmount > 0 ? grossAmount : null,
      marketplaceCommission:
        marketplaceCommission > 0 ? marketplaceCommission : null,
      refundBonus: null,
    };
  }

  private async fetchListingPriceBreakdown(input: {
    accessToken: string;
    categoryId: string;
    currencyId: string;
    logisticType: string | null;
    listingTypeId: string;
    price: number;
    shippingMode: string | null;
    siteId: string;
  }) {
    const url = new URL(
      `https://api.mercadolibre.com/sites/${encodeURIComponent(input.siteId)}/listing_prices`,
    );
    url.searchParams.set("price", String(input.price));
    url.searchParams.set("listing_type_id", input.listingTypeId);
    url.searchParams.set("category_id", input.categoryId);
    url.searchParams.set("currency_id", input.currencyId);
    if (input.logisticType) {
      url.searchParams.set("logistic_type", input.logisticType);
    }
    if (input.shippingMode) {
      url.searchParams.set("shipping_mode", input.shippingMode);
    }

    const response = await this.fetchWithRetry(url, {
      headers: {
        Authorization: `Bearer ${input.accessToken}`,
        accept: "application/json",
      },
      method: "GET",
    });

    const payload = (await parseProviderResponse(response)) as
      | MercadoLivreListingPriceResponse
      | string;

    if (!response.ok || typeof payload === "string") {
      return null;
    }

    const marketplaceCommission =
      readListingPriceMarketplaceCommission(payload);
    const fixedFee =
      typeof payload.sale_fee_details?.fixed_fee === "number" &&
      payload.sale_fee_details.fixed_fee > 0
        ? payload.sale_fee_details.fixed_fee
        : null;

    if (marketplaceCommission === null && fixedFee === null) {
      return null;
    }

    return {
      fixedFee,
      grossAmount:
        typeof payload.sale_fee_details?.gross_amount === "number" &&
        payload.sale_fee_details.gross_amount > 0
          ? payload.sale_fee_details.gross_amount
          : typeof payload.sale_fee_amount === "number" &&
              payload.sale_fee_amount > 0
            ? payload.sale_fee_amount
            : null,
      marketplaceCommission,
    };
  }

  private async fetchOrderNetReceivedAmount(input: {
    accessToken: string;
    order: MercadoLivreOrderResponse;
  }) {
    for (const payment of input.order.payments ?? []) {
      if (payment.id === undefined || payment.id === null) {
        continue;
      }

      const paymentDetail = await this.fetchPaymentDetails({
        accessToken: input.accessToken,
        paymentId: String(payment.id),
      });

      if (!paymentDetail) {
        continue;
      }

      const amount = readPaymentNetReceivedAmount(paymentDetail);
      if (amount !== null) {
        const sanitizedPayload = sanitizeProviderPayload(paymentDetail);

        return {
          amount,
          rawPayload:
            sanitizedPayload && typeof sanitizedPayload === "object"
              ? sanitizedPayload
              : null,
        };
      }
    }

    return null;
  }

  private async fetchPaymentDetails(input: {
    accessToken: string;
    paymentId: string;
  }) {
    const cacheKey = input.paymentId;
    let payloadPromise = this.paymentDetailCache.get(cacheKey);

    if (!payloadPromise) {
      payloadPromise = (async () => {
        const response = await this.fetchWithRetry(
          `https://api.mercadopago.com/v1/payments/${encodeURIComponent(input.paymentId)}`,
          {
            headers: {
              Authorization: `Bearer ${input.accessToken}`,
              accept: "application/json",
            },
            method: "GET",
          },
        );

        const payload = (await parseProviderResponse(response)) as
          | MercadoLivrePaymentResponse
          | string;

        if (!response.ok || typeof payload === "string") {
          return null;
        }

        return payload;
      })();
      this.paymentDetailCache.set(cacheKey, payloadPromise);
    }

    return payloadPromise;
  }

  private async fetchShipmentDetails(input: {
    accessToken: string;
    shipmentId: string;
  }) {
    const cacheKey = `${input.accessToken}:${input.shipmentId}`;
    let payloadPromise = this.shipmentDetailCache.get(cacheKey);

    if (!payloadPromise) {
      payloadPromise = (async () => {
        try {
          const response = await this.fetchWithRetry(
            `https://api.mercadolibre.com/shipments/${encodeURIComponent(input.shipmentId)}`,
            {
              headers: {
                Authorization: `Bearer ${input.accessToken}`,
                accept: "application/json",
                "x-format-new": "true",
              },
              method: "GET",
            },
          );
          const payload = (await parseProviderResponse(response)) as
            | MercadoLivreShipmentResponse
            | string;

          return response.ok && typeof payload !== "string" ? payload : null;
        } catch {
          return null;
        }
      })();
      this.shipmentDetailCache.set(cacheKey, payloadPromise);
    }

    return payloadPromise;
  }

  private async fetchShipmentSellerCost(input: {
    accessToken: string;
    sellerAccountId: string;
    shipmentId: string;
  }): Promise<MercadoLivreShippingCostResolution | null> {
    return (
      await this.fetchShipmentCosts({
        accessToken: input.accessToken,
        sellerAccountId: input.sellerAccountId,
        shipmentId: input.shipmentId,
      })
    ).sellerCost;
  }

  private async fetchShipmentCosts(input: {
    accessToken: string;
    sellerAccountId: string;
    shipmentId: string;
  }): Promise<MercadoLivreShipmentCostLookup> {
    const response = await this.fetchWithRetry(
      `https://api.mercadolibre.com/shipments/${input.shipmentId}/costs`,
      {
        headers: {
          Authorization: `Bearer ${input.accessToken}`,
          accept: "application/json",
          "x-format-new": "true",
        },
        method: "GET",
      },
    );

    const payload = (await parseProviderResponse(response)) as
      | MercadoLivreShipmentCostsResponse
      | string;

    if (response.ok && typeof payload !== "string") {
      const buyerShippingAmount =
        readBillingMoneyNumber(payload.receiver?.cost) ?? 0;
      const senders = payload.senders ?? [];
      const matchedSender = senders.find(
        (sender) =>
          String(sender.user_id ?? "").trim() === input.sellerAccountId.trim(),
      );
      const sellerCost = readBillingMoneyNumber(matchedSender?.cost) ?? 0;

      if (matchedSender) {
        const roundedBuyerShipping = roundMoneyNumber(
          Math.max(0, buyerShippingAmount),
        );
        const roundedSellerCost = roundMoneyNumber(Math.max(0, sellerCost));

        return {
          buyerShippingAmount: roundedBuyerShipping,
          lookupStatus: "resolved",
          sellerCost: {
            amount: roundedSellerCost,
            refundBonusAdjustment: null,
            metadata: {
              buyerShippingAmount: roundedBuyerShipping,
              grossShippingTariffAmount: roundedSellerCost,
              shipping_buyer_paid: toDecimalString(roundedBuyerShipping),
              shipping_net_amount: toDecimalString(-roundedSellerCost),
              shipping_seller_fee: toDecimalString(roundedSellerCost),
            },
            source: "shipment_costs.senders",
          },
        };
      }

      return {
        buyerShippingAmount: Math.max(0, roundMoneyNumber(buyerShippingAmount)),
        lookupStatus: "missing_seller",
        sellerCost: null,
      };
    }

    return {
      buyerShippingAmount: 0,
      lookupStatus: "request_failed",
      sellerCost: null,
    };
  }

  private getRedirectUri() {
    const apiBaseUrl =
      this.env.API_PUBLIC_BASE_URL ??
      this.env.BETTER_AUTH_URL ??
      "http://localhost:4000";

    return (
      this.env.MERCADOLIVRE_REDIRECT_URI ??
      `${apiBaseUrl.replace(/\/$/, "")}/integrations/mercadolivre/callback`
    );
  }
}
