import { createHash } from "node:crypto";
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

type MercadoLivreShipmentCostsResponse = {
  receiver?: {
    cost?: number;
  };
  senders?: Array<{
    cost?: number;
    user_id?: number;
  }>;
};

type MercadoLivreShipmentDetailResponse = {
  order_cost?: number;
  shipping_option?: {
    cost?: number;
  };
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

type MercadoLivreBillingDetailResult = Record<string, unknown> & {
  fixed_fee?: number;
  fee_amount?: number;
  operation_id?: number | string;
  order_id?: number | string;
  sale_fee?: MercadoLivreBillingDetailFeeResponse;
};

type MercadoLivreBillingAdjustmentResult = Record<string, unknown> & {
  operation_id?: number | string;
  sale_fee?: MercadoLivreBillingDetailFeeResponse | null;
};

type MercadoLivreFinancialAdjustment = {
  amount: number;
  operationId: string | null;
  originalDescription: string | null;
  originalType: string | null;
  rawPayload: Record<string, unknown> | null;
  source:
    | "billing/integration/group/ML/order/details"
    | "billing/integration/periods"
    | "payment.transaction_details.net_received_amount";
};

type MercadoLivreBillingDetailResponse = {
  last_id?: number | string;
  limit?: number;
  offset?: number;
  results?: MercadoLivreBillingDetailResult[];
  total?: number;
  errors?: unknown[];
};

type MercadoLivreBillingOrderShippingDetail = Record<string, unknown> & {
  charge_info?: Record<string, unknown> & {
    detail_amount?: number | string | null;
    detail_sub_type?: string | null;
    transaction_detail?: string | null;
  };
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
  operation_id?: number | string;
  sale_fee?: MercadoLivreBillingDetailFeeResponse | null;
  total?: number | string;
  total_amount?: number | string;
};

export type MercadoLivreBillingOrderDetailsResponse = Record<string, unknown> & {
  details?: MercadoLivreBillingOrderShippingDetail[];
  results?: MercadoLivreBillingOrderResult[];
};

type MercadoLivreBillingOrderAdjustmentMetadata = {
  mercadoLivreRefundBonusAmount?: string;
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
        sale_fee?: MercadoLivreBillingDetailFeeResponse;
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
        sale_fee?: MercadoLivreBillingDetailFeeResponse;
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

function readBillingRefundBonus(
  result: MercadoLivreBillingDetailResult | null | undefined,
) {
  return readBillingFinancialAdjustment(result)?.amount ?? null;
}

function normalizeBillingText(value: unknown) {
  return typeof value === "string"
    ? value
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .toLowerCase()
    : "";
}

function readFirstBillingText(
  result: MercadoLivreBillingAdjustmentResult,
  keys: string[],
) {
  for (const key of keys) {
    const value = result[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }
  }

  return null;
}

function hasBillingAdjustmentText(result: MercadoLivreBillingAdjustmentResult) {
  const text = [
    result.type,
    result.description,
    result.detail,
    result.name,
    result.reason,
    result.concept,
    result.detail_type,
    result.event_type,
    result.charge_type,
    result.sale_fee?.discount_reason,
  ]
    .map(normalizeBillingText)
    .join(" ");

  return (
    text.includes("estorno") ||
    text.includes("rebate") ||
    text.includes("bonus")
  );
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

function readMercadoLivreBillingTotalAmountFromFees(fees: IntegrationSyncFee[]) {
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
  return (input.payload.results ?? []).find(
    (result) =>
      result.order_id !== undefined &&
      result.order_id !== null &&
      String(result.order_id) === input.orderId,
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

function readBillingOrderFinancialAdjustment(input: {
  orderId: string;
  payload: MercadoLivreBillingOrderDetailsResponse;
}) {
  const matchingResult = findBillingOrderResult(input);

  return readBillingFinancialAdjustment(
    matchingResult,
    "billing/integration/group/ML/order/details",
  );
}

function readMercadoLivreBillingRefundBonusAdjustmentFromFees(
  fees: IntegrationSyncFee[],
): MercadoLivreFinancialAdjustment | null {
  for (const fee of fees) {
    const metadata =
      fee.metadata && typeof fee.metadata === "object"
        ? (fee.metadata as MercadoLivreBillingOrderAdjustmentMetadata &
            Record<string, unknown>)
        : null;
    const amount = readBillingMoneyNumber(metadata?.mercadoLivreRefundBonusAmount);

    if (amount !== null && amount > 0) {
      return {
        amount: roundMoneyNumber(amount),
        operationId:
          typeof metadata?.mercadoLivreRefundBonusOperationId === "string"
            ? metadata.mercadoLivreRefundBonusOperationId
            : null,
        originalDescription:
          typeof metadata?.mercadoLivreRefundBonusOriginalDescription === "string"
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
      };
    }
  }

  return null;
}

function readBillingReceiverShippingCost(
  details: MercadoLivreBillingOrderShippingDetail[],
) {
  const detail = details.find(
    detail => detail.shipping_info?.receiver_shipping_cost != null,
  );

  return readBillingMoneyNumber(
    detail?.shipping_info?.receiver_shipping_cost,
  );
}

function readBillingCffeAmount(
  details: MercadoLivreBillingOrderShippingDetail[],
) {
  return details.reduce((sum, detail) => {
    if (detail.charge_info?.detail_sub_type !== "CFFE") {
      return sum;
    }

    return sum + (readBillingMoneyNumber(detail.charge_info.detail_amount) ?? 0);
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
    billingTotalAmount === null
  ) {
    return null;
  }

  const sanitizedPayload = sanitizeProviderPayload(input.payload);

  return {
    amount: sellerShippingCost,
    metadata: {
      buyerShippingAmount: roundedBuyerPaid,
      grossShippingTariffAmount: roundedSellerFee,
      raw_billing_payload: sanitizedPayload,
      ...(billingTotalAmount !== null
        ? { mercadoLivreBillingTotalAmount: toDecimalString(billingTotalAmount) }
        : {}),
      ...(financialAdjustment
        ? {
            mercadoLivreRefundBonusAmount: toDecimalString(
              financialAdjustment.amount,
            ),
            mercadoLivreRefundBonusOperationId: financialAdjustment.operationId,
            mercadoLivreRefundBonusOriginalDescription:
              financialAdjustment.originalDescription,
            mercadoLivreRefundBonusOriginalType: financialAdjustment.originalType,
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

  const hasAdjustmentText = hasBillingAdjustmentText(result);
  const amountCandidates = hasAdjustmentText
    ? [
        result.sale_fee?.rebate,
        result.sale_fee?.discount,
        result.amount,
        result.value,
        result.adjustment_amount,
      ]
    : [result.sale_fee?.rebate, result.sale_fee?.discount];

  for (const candidate of amountCandidates) {
    const amount = readPositiveBillingNumber(candidate);
    if (amount !== null) {
      const sanitizedPayload = sanitizeProviderPayload(result);
      const operationId =
        result.operation_id !== undefined && result.operation_id !== null
          ? String(result.operation_id)
          : null;

      return {
        amount,
        operationId,
        originalDescription:
          result.sale_fee?.discount_reason ??
          readFirstBillingText(result, [
            "description",
            "detail",
            "name",
            "reason",
            "concept",
          ]),
        originalType: readFirstBillingText(result, [
          "type",
          "detail_type",
          "event_type",
          "charge_type",
        ]),
        rawPayload:
          sanitizedPayload && typeof sanitizedPayload === "object"
            ? sanitizedPayload
            : null,
        source,
      };
    }
  }

  return null;
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

function sumFeeAmountsByType(
  fees: IntegrationSyncFee[],
  feeType: IntegrationSyncFee["feeType"],
) {
  return fees.reduce((sum, fee) => {
    if (fee.feeType !== feeType) {
      return sum;
    }

    const amount = Number(fee.amount);
    return Number.isFinite(amount) ? sum + amount : sum;
  }, 0);
}

function deriveNetTotalRefundBonus(input: {
  fees: IntegrationSyncFee[];
  netReceivedAmount: number;
  operationId: string | null;
  rawPayload: Record<string, unknown> | null;
  totalAmount: number;
}): MercadoLivreFinancialAdjustment | null {
  const marketplaceCommissionAmount = sumFeeAmountsByType(
    input.fees,
    "marketplace_commission",
  );
  const shippingAmount = sumFeeAmountsByType(input.fees, "shipping_cost");
  const expectedNetWithoutShippingAmount = roundMoneyNumber(
    input.totalAmount - marketplaceCommissionAmount,
  );

  if (
    shippingAmount > 0 &&
    isAlmostEqualMoney(input.netReceivedAmount, expectedNetWithoutShippingAmount)
  ) {
    return null;
  }

  const expectedNetAmount = roundMoneyNumber(
    input.totalAmount - marketplaceCommissionAmount - shippingAmount,
  );
  const refundBonusAmount = roundMoneyNumber(
    input.netReceivedAmount - expectedNetAmount,
  );

  if (refundBonusAmount < 0.01) {
    return null;
  }

  return {
    amount: refundBonusAmount,
    operationId: input.operationId,
    originalDescription: "Derived from Mercado Livre net total",
    originalType: "net_total_difference",
    rawPayload: input.rawPayload,
    source: "payment.transaction_details.net_received_amount",
  };
}

function roundMoneyNumber(value: number) {
  return Math.round(value * 100) / 100;
}

function isAlmostEqualMoney(left: number, right: number) {
  return Math.abs(left - right) < 0.01;
}

function readPaymentFinancialDetailAmount(
  detail: MercadoLivrePaymentFinancialDetail,
) {
  const candidates = [
    detail.amount,
    detail.value,
    detail.amounts?.original,
    detail.amounts?.paid,
    detail.amounts?.total,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "number" && Number.isFinite(candidate)) {
      return Math.abs(candidate);
    }
  }

  return null;
}

function readPositivePaymentFinancialDetailAmount(
  detail: MercadoLivrePaymentFinancialDetail,
) {
  const amount = readPaymentFinancialDetailAmount(detail);

  return amount === null ? null : Math.abs(amount);
}

function normalizeFinancialDetailText(
  detail: MercadoLivrePaymentFinancialDetail,
) {
  return [
    detail.collector,
    detail.description,
    detail.detail,
    detail.fee_payer,
    detail.name,
    detail.reason,
    detail.type,
  ]
    .filter((value): value is string => typeof value === "string")
    .join(" ")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

function isShippingFinancialDetail(detail: MercadoLivrePaymentFinancialDetail) {
  const text = normalizeFinancialDetailText(detail);

  return (
    text.includes("shipping") ||
    text.includes("shipment") ||
    text.includes("envio") ||
    text.includes("envios") ||
    text.includes("frete") ||
    text.includes("mercado_envios") ||
    text.includes("mercado envios")
  );
}

function isBuyerShippingFinancialDetail(
  detail: MercadoLivrePaymentFinancialDetail,
) {
  const text = normalizeFinancialDetailText(detail);

  if (
    text.includes("tarifa") ||
    text.includes("tariff") ||
    text.includes("fee")
  ) {
    return false;
  }

  return (
    text.includes("pagamento") ||
    text.includes("payment") ||
    text.includes("buyer") ||
    text.includes("buyer_shipping") ||
    text.includes("paid_by_buyer")
  );
}

function readPaymentShippingCostBreakdown(
  payload: MercadoLivrePaymentResponse,
  paymentId: string,
  fallbackBuyerShippingAmount = 0,
): MercadoLivreShippingCostResolution | null {
  const sources = [
    {
      details: payload.charges_details ?? [],
      source: "payment.charges_details.shipping" as const,
    },
    {
      details: payload.fee_details ?? [],
      source: "payment.fee_details.shipping" as const,
    },
  ];

  for (const source of sources) {
    let buyerShippingAmount = 0;
    let grossShippingTariffAmount = 0;

    for (const detail of source.details) {
      if (!isShippingFinancialDetail(detail)) {
        continue;
      }

      const amount = readPositivePaymentFinancialDetailAmount(detail);
      if (amount === null || amount <= 0) {
        continue;
      }

      if (isBuyerShippingFinancialDetail(detail)) {
        buyerShippingAmount += amount;
      } else {
        grossShippingTariffAmount += amount;
      }
    }

    if (
      buyerShippingAmount <= 0 &&
      fallbackBuyerShippingAmount > 0 &&
      grossShippingTariffAmount > fallbackBuyerShippingAmount
    ) {
      buyerShippingAmount = fallbackBuyerShippingAmount;
    }

    const amount = roundMoneyNumber(
      Math.max(0, grossShippingTariffAmount - buyerShippingAmount),
    );

    if (amount > 0) {
      return {
        amount,
        metadata: {
          buyerShippingAmount: roundMoneyNumber(buyerShippingAmount),
          grossShippingTariffAmount: roundMoneyNumber(
            grossShippingTariffAmount,
          ),
          paymentId,
        },
        source: source.source,
      };
    }
  }

  return null;
}

function readListingPriceMarketplaceCommission(
  payload: MercadoLivreListingPriceResponse | null | undefined,
) {
  if (!payload) {
    return null;
  }

  if (
    typeof payload.sale_fee_amount === "number" &&
    payload.sale_fee_amount > 0
  ) {
    return payload.sale_fee_amount;
  }

  const grossAmount = payload.sale_fee_details?.gross_amount;
  const fixedFee = payload.sale_fee_details?.fixed_fee;
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
  private readonly billingDetailCache = new Map<
    string,
    Promise<MercadoLivreBillingDetailResponse | null>
  >();
  private readonly billingOrderDetailCache = new Map<
    string,
    Promise<MercadoLivreBillingOrderDetailsResponse | null>
  >();
  private readonly paymentDetailCache = new Map<
    string,
    Promise<MercadoLivrePaymentResponse | null>
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
        ? await this.normalizeOrder(detail, {
            accessToken: input.connection.accessToken,
            sellerAccountId: accountId,
          }, detail)
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
          (targetUserProductId && resolvedUserProductId === targetUserProductId) ||
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
      const title = buildMercadoLivreUserProductLabel(attributes) ?? userProductId;
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

  private resolveUserProductOrderSku(userProduct: MercadoLivreUserProductResponse) {
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
      response = await fetch(input, init);
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

      const pageOrders = await Promise.all(
        (payload.results ?? []).map((order) =>
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

    const items = (resolvedOrder.order_items ?? []).map<IntegrationSyncOrderItem>(
      (item) => {
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
          titleByExternalProductId[externalProductId] =
            item.item?.title ?? null;
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
      },
    );

    const { fees, operationId, refundBonusAdjustment } = await this.resolveOrderFees(
      order,
      input,
      detailedOrder,
    );
    const netReceivedAmount = await this.fetchOrderNetReceivedAmount({
      accessToken: input.accessToken,
      order: resolvedOrder,
    });
    const financialAdjustment =
      refundBonusAdjustment ??
      (netReceivedAmount && typeof resolvedOrder.total_amount === "number"
        ? deriveNetTotalRefundBonus({
            fees,
            netReceivedAmount: netReceivedAmount.amount,
            operationId,
            rawPayload: netReceivedAmount.rawPayload,
            totalAmount: resolvedOrder.total_amount,
          })
        : null);
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
    const initialFees = await this.collectOrderFees(order, input);

    if (!order.id) {
      return {
        fees: initialFees,
        operationId: null,
        refundBonusAdjustment:
          readMercadoLivreBillingRefundBonusAdjustmentFromFees(initialFees),
      };
    }

    if (this.hasCompleteFeeCoverage(initialFees)) {
      const billingFeeBreakdown = await this.fetchBillingFeeBreakdown({
        accessToken: input.accessToken,
        fallbackDate: order.date_closed ?? order.date_created,
        order,
      });
      return {
        fees: initialFees,
        operationId: billingFeeBreakdown?.operationId ?? null,
        refundBonusAdjustment:
          billingFeeBreakdown?.refundBonusAdjustment ??
          readMercadoLivreBillingRefundBonusAdjustmentFromFees(initialFees),
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
      return {
        fees: initialFees,
        operationId: null,
        refundBonusAdjustment:
          readMercadoLivreBillingRefundBonusAdjustmentFromFees(initialFees),
      };
    }

    const detailedOrderForFees = this.mergeOrderWithDetails(order, detailedOrder);
    const detailedFees = await this.collectOrderFees(detailedOrderForFees, input, {
      skipShipmentLookup: hasShipmentLookup,
    });
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
    const needsBillingBreakdown =
      hasGrossSourceCommission ||
      !this.hasFeeType(mergedDetailedFees, "fixed_fee");
    const billingFeeBreakdown = needsBillingBreakdown
      ? await this.fetchBillingFeeBreakdown({
          accessToken: input.accessToken,
          order,
          fallbackDate: detailedOrder.date_closed ?? detailedOrder.date_created,
        })
      : null;
    const listingPriceFeeBreakdown =
      hasGrossSourceCommission &&
      (!billingFeeBreakdown ||
        billingFeeBreakdown.marketplaceCommission === null ||
        billingFeeBreakdown.fixedFee === null)
        ? await this.fetchListingPriceFeeBreakdown({
            accessToken: input.accessToken,
            order: detailedOrderForFees,
          })
        : null;
    const feeBreakdown =
      billingFeeBreakdown &&
      (billingFeeBreakdown.marketplaceCommission !== null ||
        billingFeeBreakdown.fixedFee !== null)
        ? billingFeeBreakdown
        : listingPriceFeeBreakdown;

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
      const feeAmount = Number(fee.amount);
      const grossMatchesBilling =
        source &&
        typeof feeBreakdown.grossAmount === "number" &&
        Math.abs(feeAmount - feeBreakdown.grossAmount) < 0.01;

      if (!grossMatchesBilling) {
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
              : "listing_prices.sale_fee_amount",
        },
      };
    });

    const completedFees = [...adjustedFees];
    const orderDetailsRefundBonusAdjustment =
      readMercadoLivreBillingRefundBonusAdjustmentFromFees(completedFees);

    if (!feeBreakdown || feeBreakdown.fixedFee === null) {
      return {
        fees: completedFees,
        operationId: billingFeeBreakdown?.operationId ?? null,
        refundBonusAdjustment:
          billingFeeBreakdown?.refundBonusAdjustment ??
          orderDetailsRefundBonusAdjustment,
      };
    }

    if (this.hasFeeType(completedFees, "fixed_fee")) {
      return {
        fees: completedFees,
        operationId: billingFeeBreakdown?.operationId ?? null,
        refundBonusAdjustment:
          billingFeeBreakdown?.refundBonusAdjustment ??
          orderDetailsRefundBonusAdjustment,
      };
    }

    return {
      fees: [
        ...completedFees,
        {
          amount: toDecimalString(feeBreakdown.fixedFee),
          currency: order.currency_id ?? detailedOrder.currency_id ?? "BRL",
          feeType: "fixed_fee",
          metadata: {
            source:
              feeBreakdown === billingFeeBreakdown
                ? "billing/integration/periods"
                : "listing_prices.fixed_fee_fallback",
          },
        },
      ],
      operationId: billingFeeBreakdown?.operationId ?? null,
      refundBonusAdjustment:
        billingFeeBreakdown?.refundBonusAdjustment ??
        orderDetailsRefundBonusAdjustment,
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
  ) {
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

    return fees;
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
    let buyerShippingAmount = this.readBuyerShippingAmount(order);

    if (
      order.id !== undefined &&
      order.id !== null
    ) {
      const billingShippingCost = await this.fetchBillingOrderShippingCost({
        accessToken: input.accessToken,
        orderId: String(order.id),
      });

      if (billingShippingCost !== null) {
        return billingShippingCost;
      }
    }

    if (shipmentId && !options.skipShipmentLookup) {
      const shipmentCost = await this.fetchShipmentCosts({
        accessToken: input.accessToken,
        sellerAccountId: input.sellerAccountId,
        shipmentId,
      });

      buyerShippingAmount = Math.max(
        buyerShippingAmount,
        shipmentCost.buyerShippingAmount,
      );

      if (shipmentCost.sellerCost !== null) {
        return shipmentCost.sellerCost;
      }
    }

    const paymentShippingCost = await this.fetchPaymentShippingCost({
      accessToken: input.accessToken,
      fallbackBuyerShippingAmount: buyerShippingAmount,
      order,
    });

    if (paymentShippingCost !== null) {
      return paymentShippingCost;
    }

    return shipmentId && !options.skipShipmentLookup
      ? await this.fetchShipmentDetailSellerCost({
          accessToken: input.accessToken,
          buyerShippingAmount,
          shipmentId,
        })
      : null;
  }

  private async fetchBillingOrderShippingCost(input: {
    accessToken: string;
    orderId: string;
  }): Promise<MercadoLivreShippingCostResolution | null> {
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

        if (!response.ok || typeof payload === "string") {
          return null;
        }

        return payload;
      })();
      this.billingOrderDetailCache.set(cacheKey, payloadPromise);
    }

    const payload = await payloadPromise;

    if (!payload) {
      return null;
    }

    return readMercadoLivreBillingOrderShippingCost({
      orderId: input.orderId,
      payload,
    });
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

  private async fetchBillingFeeBreakdown(input: {
    accessToken: string;
    fallbackDate: string | null | undefined;
    order: MercadoLivreOrderResponse;
  }) {
    const periodKey = toBillingPeriodKey(
      input.fallbackDate ?? input.order.date_closed ?? input.order.date_created,
    );

    if (!periodKey || !input.order.id) {
      return null;
    }

    const cacheKey = `${input.accessToken}:${periodKey}`;
    let payloadPromise = this.billingDetailCache.get(cacheKey);

    if (!payloadPromise) {
      payloadPromise = (async () => {
        const mergedResults: NonNullable<
          MercadoLivreBillingDetailResponse["results"]
        > = [];
        let fromId = "0";

        while (true) {
          const url = new URL(
            `https://api.mercadolibre.com/billing/integration/periods/key/${encodeURIComponent(periodKey)}/group/MP/details`,
          );
          url.searchParams.set("document_type", "BILL");
          url.searchParams.set("limit", "1000");
          url.searchParams.set("from_id", fromId);

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

          if (!response.ok || typeof payload === "string") {
            return null;
          }

          mergedResults.push(...(payload.results ?? []));

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
            total !== null &&
            mergedResults.length < total;

          if (!hasMore) {
            return {
              ...payload,
              results: mergedResults,
            };
          }

          fromId = nextFromId;
        }
      })();
      this.billingDetailCache.set(cacheKey, payloadPromise);
    }

    const payload = await payloadPromise;

    if (!payload) {
      return null;
    }

    const orderId = String(input.order.id);
    const matchedResults =
      payload.results?.filter((result) => {
        const candidateIds = [
          result.order_id !== undefined ? String(result.order_id) : null,
          result.operation_id !== undefined
            ? String(result.operation_id)
            : null,
        ].filter((value): value is string => Boolean(value));

        return candidateIds.includes(orderId);
      }) ?? [];
    const operationResult =
      matchedResults.find(
        (result) =>
          result.operation_id !== undefined && result.operation_id !== null,
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

    const operationId =
      matchedResult?.operation_id !== undefined &&
      matchedResult.operation_id !== null
        ? String(matchedResult.operation_id)
        : null;

    if (
      fixedFee === null &&
      marketplaceCommission === null &&
      grossAmount === null &&
      operationId === null
    ) {
      return null;
    }

    return {
      fixedFee: fixedFee !== null && fixedFee > 0 ? fixedFee : null,
      grossAmount,
      marketplaceCommission,
      operationId,
      refundBonus: readBillingRefundBonus(matchedResult),
      refundBonusAdjustment: readBillingFinancialAdjustment(matchedResult),
    };
  }

  private async fetchListingPriceFeeBreakdown(input: {
    accessToken: string;
    order: MercadoLivreOrderResponse;
  }) {
    const cache = new Map<
      string,
      {
        fixedFee: number | null;
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

      const cacheKey = `${siteId}:${listingTypeId}:${categoryId}:${unitPrice.toFixed(2)}`;
      if (!cache.has(cacheKey)) {
        cache.set(
          cacheKey,
          await this.fetchListingPriceBreakdown({
            accessToken: input.accessToken,
            categoryId,
            listingTypeId,
            price: unitPrice,
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
          : grossSaleFee > unitMarketplaceCommission
            ? grossSaleFee - unitMarketplaceCommission
            : 0;

      hasBreakdown = true;
      grossAmount += grossSaleFee * quantity;
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
    listingTypeId: string;
    price: number;
    siteId: string;
  }) {
    const url = new URL(
      `https://api.mercadolibre.com/sites/${encodeURIComponent(input.siteId)}/listing_prices`,
    );
    url.searchParams.set("price", String(input.price));
    url.searchParams.set("listing_type_id", input.listingTypeId);
    url.searchParams.set("category_id", input.categoryId);

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
      marketplaceCommission,
    };
  }

  private readBuyerShippingAmount(order: MercadoLivreOrderResponse) {
    return (order.payments ?? []).reduce((sum, payment) => {
      return (
        sum +
        (typeof payment.shipping_cost === "number" ? payment.shipping_cost : 0)
      );
    }, 0);
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

  private async fetchPaymentShippingCost(input: {
    accessToken: string;
    fallbackBuyerShippingAmount: number;
    order: MercadoLivreOrderResponse;
  }): Promise<MercadoLivreShippingCostResolution | null> {
    for (const payment of input.order.payments ?? []) {
      if (payment.id === undefined || payment.id === null) {
        continue;
      }

      const paymentId = String(payment.id);
      const paymentDetail = await this.fetchPaymentDetails({
        accessToken: input.accessToken,
        paymentId,
      });

      if (!paymentDetail) {
        continue;
      }

      const shippingCost = readPaymentShippingCostBreakdown(
        paymentDetail,
        paymentId,
        Math.max(
          input.fallbackBuyerShippingAmount,
          typeof payment.shipping_cost === "number" ? payment.shipping_cost : 0,
        ),
      );

      if (shippingCost !== null) {
        return shippingCost;
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
        typeof payload.receiver?.cost === "number" && payload.receiver.cost > 0
          ? payload.receiver.cost
          : 0;
      const senders = payload.senders ?? [];
      const matchedSender = senders.find(
        (sender) => String(sender.user_id ?? "") === input.sellerAccountId,
      );

      if (typeof matchedSender?.cost === "number" && matchedSender.cost > 0) {
        return {
          buyerShippingAmount,
          sellerCost: {
            amount: matchedSender.cost,
            source: "shipment_costs.senders",
          },
        };
      }

      const hasSenderUserIds = senders.some(
        (sender) => sender.user_id !== undefined && sender.user_id !== null,
      );
      const firstSender = senders[0] ?? null;

      if (
        !hasSenderUserIds &&
        typeof firstSender?.cost === "number" &&
        firstSender.cost > 0
      ) {
        return {
          buyerShippingAmount,
          sellerCost: {
            amount: firstSender.cost,
            source: "shipment_costs.senders",
          },
        };
      }

      return {
        buyerShippingAmount,
        sellerCost: null,
      };
    }

    return {
      buyerShippingAmount: 0,
      sellerCost: null,
    };
  }

  private async fetchShipmentDetailSellerCost(input: {
    accessToken: string;
    buyerShippingAmount: number;
    shipmentId: string;
  }): Promise<MercadoLivreShippingCostResolution | null> {
    const shipmentDetailResponse = await this.fetchWithRetry(
      `https://api.mercadolibre.com/shipments/${input.shipmentId}`,
      {
        headers: {
          Authorization: `Bearer ${input.accessToken}`,
          accept: "application/json",
        },
        method: "GET",
      },
    );

    const shipmentDetail = (await parseProviderResponse(
      shipmentDetailResponse,
    )) as MercadoLivreShipmentDetailResponse | string;

    if (!shipmentDetailResponse.ok || typeof shipmentDetail === "string") {
      return null;
    }

    if (
      typeof shipmentDetail.order_cost === "number" &&
      shipmentDetail.order_cost > 0 &&
      !isAlmostEqualMoney(shipmentDetail.order_cost, input.buyerShippingAmount)
    ) {
      return {
        amount: shipmentDetail.order_cost,
        source: "shipment_detail.order_cost",
      };
    }

    return typeof shipmentDetail.shipping_option?.cost === "number" &&
      shipmentDetail.shipping_option.cost > 0 &&
      !isAlmostEqualMoney(
        shipmentDetail.shipping_option.cost,
        input.buyerShippingAmount,
      )
      ? {
          amount: shipmentDetail.shipping_option.cost,
          source: "shipment_detail.shipping_option.cost",
        }
      : null;
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
