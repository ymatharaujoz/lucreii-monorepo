import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import type { DatabaseClient } from "@lucreii/database";
import type {
  ExternalFee,
  ExternalOrder,
  ExternalOrderItem,
  ExternalProduct,
  MarketplaceConnection,
  Product,
  ProductCost,
  ProductFinanceDefaults,
  ProductImage,
} from "@lucreii/database";
import {
  externalFees,
  externalOrderItems,
  externalOrders,
  externalProducts,
  marketplaceConnections,
  products,
} from "@lucreii/database";
import type {
  OrderCanonicalStatus,
  OrderComposition,
  OrderCompositionUpdateInput,
  OrderDetails,
  OrderExportFilters,
  OrderImportPendingFinancialField,
  OrderImportTag,
  OrderLineItem,
  OrderListFilters,
  OrderListItem,
  OrdersListSummary,
  OrdersListResponse,
  OrderStatusLabel,
  OrderStatusOption,
} from "@lucreii/types";
import { orderExportQuerySchema } from "@lucreii/validation";
import { and, asc, desc, eq, inArray, or, sql } from "drizzle-orm";
import { utils, write } from "xlsx";
import type { ApiRuntimeEnv } from "@/common/config/api-env";
import { API_RUNTIME_ENV, DATABASE_CLIENT } from "@/common/tokens";
import {
  MercadoLivreProvider,
  readMercadoLivreBillingOrderShippingCost,
  type MercadoLivreBillingOrderDetailsResponse,
} from "@/modules/integrations/providers/mercadolivre.provider";

type TenantContext = {
  organizationId: string;
  selectedCompanyId: string | null | undefined;
  userId: string;
};

type LinkedProductRecord = Product & {
  financeDefaults: ProductFinanceDefaults | null;
  images: ProductImage[];
  latestCost?: ProductCost | null;
  productCosts?: ProductCost[];
};

type OrderRow = ExternalOrder & {
  fees: ExternalFee[];
  items: Array<
    ExternalOrderItem & {
      externalProduct:
        | (ExternalProduct & {
            linkedProduct?: LinkedProductRecord | null;
          })
        | null;
    }
  >;
};

type OrderRowShallow = ExternalOrder & {
  fees: ExternalFee[];
  items: Array<
    ExternalOrderItem & {
      externalProduct: ExternalProduct | null;
    }
  >;
};

type LogicalOrder = {
  composition: OrderComposition;
  items: OrderLineItem[];
  order: OrderListItem;
  rows: OrderRow[];
};

type MercadoLivreOrderDetailResponse = {
  shipping?: {
    id?: number | string;
  };
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

type MercadoLivreShipmentSellerCost = {
  buyerPaidAmount: number;
  sellerCostAmount: number;
  sellerMatched: boolean;
  shipmentId: string;
  source: "shipment_costs.senders";
};

type OrderSortKey = NonNullable<OrderListFilters["sortBy"]>;
type OrderCompositionOverrides = Partial<
  Pick<
    OrderComposition,
    | "refundBonusAmount"
    | "productCostAmount"
    | "marketplaceCommissionAmount"
    | "shippingOrFixedFeeAmount"
    | "packagingCostAmount"
  >
>;

const ORDER_STATUS_OPTIONS: OrderStatusOption[] = [
  { value: "confirmed", label: "Pagamento pendente" },
  { value: "payment_required", label: "Pagamento obrigatório" },
  { value: "payment_in_process", label: "Pagamento em processamento" },
  { value: "partially_paid", label: "Pagamento parcial" },
  { value: "paid", label: "Pagamento aprovado" },
  { value: "partially_refunded", label: "Reembolso parcial" },
  { value: "pending_cancel", label: "Cancelamento pendente" },
  { value: "cancelled", label: "Cancelado" },
];

const MELI_STATUS_SET = new Set<OrderCanonicalStatus>(
  ORDER_STATUS_OPTIONS.map((option) => option.value),
);
const MERCADOLIVRE_GROUP_ID_PREFIX = "group__mercadolivre__";

function toIsoString(value: Date | string | null | undefined) {
  if (!value) {
    return null;
  }

  return value instanceof Date ? value.toISOString() : value;
}

function toDateOnly(value: Date | string | null | undefined) {
  const iso = toIsoString(value);
  return iso ? iso.slice(0, 10) : null;
}

function toNumber(value: string | number | null | undefined) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function toMoney(value: string | number | null | undefined) {
  return toNumber(value).toFixed(2);
}

function roundMoneyNumber(value: number) {
  return Math.round(value * 100) / 100;
}

function parseMoneyToCents(value: string | number | null | undefined) {
  return BigInt(Math.round(toNumber(value) * 100));
}

function formatCents(value: bigint) {
  const sign = value < 0n ? "-" : "";
  const absolute = value < 0n ? value * -1n : value;
  const whole = absolute / 100n;
  const cents = absolute % 100n;
  return `${sign}${whole.toString()}.${cents.toString().padStart(2, "0")}`;
}

function allocateCentsByWeights(totalCents: bigint, weights: bigint[]) {
  if (totalCents === 0n || weights.length === 0) {
    return weights.map(() => 0n);
  }

  const weightsTotal = weights.reduce((sum, value) => sum + value, 0n);
  if (weightsTotal === 0n) {
    return weights.map(() => 0n);
  }

  const allocations: bigint[] = [];
  let remaining = totalCents;

  for (let index = 0; index < weights.length; index += 1) {
    if (index === weights.length - 1) {
      allocations.push(remaining);
      break;
    }

    const allocation = (totalCents * weights[index]) / weightsTotal;
    allocations.push(allocation);
    remaining -= allocation;
  }

  return allocations;
}

function toPercentString(numeratorCents: bigint, denominatorCents: bigint) {
  if (denominatorCents <= 0n) {
    return null;
  }

  const sign = numeratorCents < 0n ? "-" : "";
  const absoluteNumerator =
    numeratorCents < 0n ? numeratorCents * -1n : numeratorCents;
  const scale = 10000n;
  const scaled = absoluteNumerator * scale;
  const quotient = scaled / denominatorCents;
  const remainder = scaled % denominatorCents;
  const rounded = remainder * 2n >= denominatorCents ? quotient + 1n : quotient;
  const whole = rounded / 100n;
  const fraction = rounded % 100n;

  return `${sign}${whole.toString()}.${fraction.toString().padStart(2, "0")}`;
}

function includesIgnoreCase(
  haystack: string | null | undefined,
  needle: string,
) {
  if (!haystack) {
    return false;
  }

  return haystack.toLowerCase().includes(needle.toLowerCase());
}

function matchesOrderSearch(
  order: Pick<OrderListItem, "orderId" | "displayOrderId" | "skus">,
  needle: string,
) {
  return (
    includesIgnoreCase(order.orderId, needle) ||
    includesIgnoreCase(order.displayOrderId, needle) ||
    order.skus.some((sku) => includesIgnoreCase(sku, needle))
  );
}

function matchesSaleIdFilter(
  order: Pick<OrderListItem, "orderId" | "displayOrderId">,
  needle: string,
) {
  return (
    includesIgnoreCase(order.orderId, needle) ||
    includesIgnoreCase(order.displayOrderId, needle)
  );
}

function matchesSkuFilter(order: Pick<OrderListItem, "skus">, needle: string) {
  return order.skus.some((sku) => includesIgnoreCase(sku, needle));
}

function buildSaleIdWhere(needle: string) {
  const pattern = `%${needle}%`;

  return sql`(
    ${externalOrders.externalOrderId} ilike ${pattern}
    or coalesce(${externalOrders.metadata}->>'operationId', '') ilike ${pattern}
    or coalesce(${externalOrders.metadata}->>'packId', '') ilike ${pattern}
  )`;
}

function buildExactMercadoLivreGroupedOrderWhere(displayOrderId: string) {
  return sql`(
    ${externalOrders.externalOrderId} = ${displayOrderId}
    or coalesce(${externalOrders.metadata}->>'operationId', '') = ${displayOrderId}
    or coalesce(${externalOrders.metadata}->>'packId', '') = ${displayOrderId}
  )`;
}

function buildLogicalOrderGroupKeySql() {
  return sql<string>`case
    when ${externalOrders.provider} = 'mercadolivre'
      then coalesce(
        nullif(${externalOrders.metadata}->>'packId', ''),
        nullif(${externalOrders.metadata}->>'operationId', ''),
        ${externalOrders.externalOrderId}
      )
    else ${externalOrders.id}::text
  end`;
}

function buildSkuWhere(needle: string) {
  const pattern = `%${needle}%`;

  return sql`exists (
    select 1
    from ${externalOrderItems} as order_items
    left join ${externalProducts} as synced_products
      on synced_products.id = order_items.external_product_id
    left join ${products} as linked_products
      on linked_products.id = synced_products.linked_product_id
    where order_items.external_order_id = ${externalOrders.id}
      and (
        coalesce(linked_products.sku, '') ilike ${pattern}
        or coalesce(synced_products.sku, '') ilike ${pattern}
      )
  )`;
}

function isOrderWithinRange(
  orderedAt: string | null,
  orderedFrom?: string,
  orderedTo?: string,
) {
  if (!orderedAt) {
    return false;
  }

  const orderDate = orderedAt.slice(0, 10);

  if (orderedFrom && orderDate < orderedFrom) {
    return false;
  }

  if (orderedTo && orderDate > orderedTo) {
    return false;
  }

  return true;
}

function getOrderStatusLabel(status: OrderCanonicalStatus): OrderStatusLabel {
  return (
    ORDER_STATUS_OPTIONS.find((option) => option.value === status)?.label ??
    status
  );
}

function normalizeOrderStatus(
  provider: string,
  status: string,
  metadata: Record<string, unknown>,
): OrderCanonicalStatus {
  const normalized = status.trim().toLowerCase();
  const detail = String(metadata.status_detail ?? "")
    .trim()
    .toLowerCase();
  const returned =
    metadata.returned === true ||
    metadata.refunded === true ||
    includesIgnoreCase(detail, "refund") ||
    includesIgnoreCase(detail, "return");

  if (returned || normalized.includes("refund")) {
    return "partially_refunded";
  }

  if (MELI_STATUS_SET.has(normalized as OrderCanonicalStatus)) {
    return normalized as OrderCanonicalStatus;
  }

  if (
    [
      "completed",
      "delivered",
      "ready_to_ship",
      "shipped",
      "processing",
      "invoice_pending",
      "to_be_agreed",
      "to_be_arranged",
      "packed",
      "pickup_ready",
    ].includes(normalized) ||
    normalized.includes("deliver") ||
    normalized.includes("ship")
  ) {
    return "paid";
  }

  if (["payment_required", "unpaid", "pending"].includes(normalized)) {
    return "payment_required";
  }

  if (["payment_in_process", "processing_payment"].includes(normalized)) {
    return "payment_in_process";
  }

  if (["partially_paid"].includes(normalized)) {
    return "partially_paid";
  }

  if (
    ["cancelled", "canceled", "cancel"].includes(normalized) ||
    normalized.includes("cancel")
  ) {
    return provider === "mercadolivre" && normalized === "pending_cancel"
      ? "pending_cancel"
      : "cancelled";
  }

  if (["confirmed", "created"].includes(normalized)) {
    return "confirmed";
  }

  if (normalized.includes("paid") || normalized.includes("approved")) {
    return "paid";
  }

  return "confirmed";
}

function sumFeesByPredicate(
  fees: ExternalFee[],
  predicate: (fee: ExternalFee) => boolean,
) {
  return fees.reduce((total, fee) => {
    return predicate(fee) ? total + toNumber(fee.amount) : total;
  }, 0);
}

function readMercadoLivreExplicitRefundBonusFromShippingFees(
  fees: ExternalFee[],
) {
  let total = 0;
  let found = false;

  for (const fee of fees) {
    if (fee.feeType !== "shipping_cost") {
      continue;
    }

    const metadata =
      fee.metadata && typeof fee.metadata === "object"
        ? (fee.metadata as Record<string, unknown>)
        : null;
    const refundBonusAmount = readMetadataMoney(
      metadata ?? {},
      "mercadoLivreRefundBonusAmount",
    );
    const amount = refundBonusAmount;
    if (amount <= 0) {
      continue;
    }

    total += amount;
    found = true;
  }

  return found ? total : null;
}

function getPrimaryImageUrl(
  images:
    | Array<{
        position: number;
        url: string;
      }>
    | null
    | undefined,
) {
  return (
    images?.slice().sort((left, right) => left.position - right.position)[0]
      ?.url ?? null
  );
}

function readMetadataMoney(metadata: Record<string, unknown>, key: string) {
  const value = metadata[key];

  if (typeof value === "string" || typeof value === "number") {
    return toNumber(value);
  }

  return 0;
}

function readMetadataMoneyString(
  metadata: Record<string, unknown>,
  key: string,
) {
  const value = metadata[key];

  if (typeof value !== "string" && typeof value !== "number") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed.toFixed(2) : null;
}

function isSpreadsheetImportedOrder(order: Pick<OrderRowShallow, "metadata">) {
  const metadata =
    order.metadata && typeof order.metadata === "object"
      ? (order.metadata as Record<string, unknown>)
      : {};
  return (
    metadata.importSource === "spreadsheet" ||
    metadata.spreadsheetImport === true
  );
}

function readSpreadsheetProductRevenueAmount(
  order: Pick<OrderRowShallow, "metadata" | "provider">,
) {
  if (order.provider !== "mercadolivre" || !isSpreadsheetImportedOrder(order)) {
    return null;
  }

  const metadata =
    order.metadata && typeof order.metadata === "object"
      ? (order.metadata as Record<string, unknown>)
      : {};
  const amount = readMetadataMoneyString(
    metadata,
    "spreadsheetProductRevenueAmount",
  );

  return amount === null ? null : toNumber(amount);
}

function readOrderImportTags(
  order: Pick<OrderRow, "metadata">,
): OrderImportTag[] {
  const metadata =
    order.metadata && typeof order.metadata === "object"
      ? (order.metadata as Record<string, unknown>)
      : {};
  const rawTags = Array.isArray(metadata.tags) ? metadata.tags : [];
  const tags = rawTags.filter(
    (tag): tag is OrderImportTag => tag === "ENVIO FLEX",
  );
  return tags;
}

function readOrderPendingFinancialFields(
  order: Pick<OrderRow, "metadata">,
): OrderImportPendingFinancialField[] {
  const metadata =
    order.metadata && typeof order.metadata === "object"
      ? (order.metadata as Record<string, unknown>)
      : {};
  const rawFields = Array.isArray(metadata.pendingFinancialFields)
    ? metadata.pendingFinancialFields
    : [];
  return rawFields.filter(
    (field): field is OrderImportPendingFinancialField =>
      field === "shippingOrFixedFeeAmount" || field === "taxAmount",
  );
}

function readOrderSourceStatus(order: Pick<OrderRow, "status" | "metadata">) {
  const metadata =
    order.metadata && typeof order.metadata === "object"
      ? (order.metadata as Record<string, unknown>)
      : {};
  return typeof metadata.sourceStatus === "string" &&
    metadata.sourceStatus.trim()
    ? metadata.sourceStatus.trim()
    : order.status;
}

function buildOrderShippingBreakdown(
  fees: ExternalFee[],
): OrderComposition["shippingBreakdown"] {
  const shippingFee = fees.find((fee) => fee.feeType === "shipping_cost");
  const metadata =
    shippingFee?.metadata && typeof shippingFee.metadata === "object"
      ? (shippingFee.metadata as Record<string, unknown>)
      : null;

  if (!metadata) {
    return null;
  }

  const buyerShippingPaymentAmount =
    readMetadataMoneyString(metadata, "shipping_buyer_paid") ??
    readMetadataMoneyString(metadata, "buyerShippingAmount");
  const grossShippingTariffAmount =
    readMetadataMoneyString(metadata, "shipping_seller_fee") ??
    readMetadataMoneyString(metadata, "grossShippingTariffAmount");
  const netShippingAmount = readMetadataMoneyString(
    metadata,
    "shipping_net_amount",
  );
  const source =
    typeof metadata.source === "string" && metadata.source.trim().length > 0
      ? metadata.source.trim()
      : null;

  if (
    !buyerShippingPaymentAmount ||
    !grossShippingTariffAmount ||
    !netShippingAmount
  ) {
    return null;
  }

  return {
    buyerShippingPaymentAmount,
    grossShippingTariffAmount,
    netShippingAmount,
    source,
  };
}

function toCatalogGroupKey(itemId: string) {
  return `mercadolivre:${itemId}`;
}

function extractMercadoLivreItemId(externalProductId: string) {
  const [itemId] = externalProductId.split(":");
  return itemId?.trim() ? itemId.trim() : null;
}

function readMercadoLivreSyncMetadata(
  metadata: Record<string, unknown> | null | undefined,
) {
  if (!metadata || typeof metadata !== "object") {
    return {
      itemId: null,
      variationId: null,
    };
  }

  const itemId =
    typeof metadata.itemId === "string" && metadata.itemId.trim().length > 0
      ? metadata.itemId.trim()
      : null;
  const variationId =
    typeof metadata.variationId === "string" &&
    metadata.variationId.trim().length > 0
      ? metadata.variationId.trim()
      : null;

  return {
    itemId,
    variationId,
  };
}

function resolveLatestCostAmount(
  product: LinkedProductRecord | null | undefined,
) {
  if (!product) {
    return null;
  }

  if (product.latestCost) {
    return toNumber(product.latestCost.amount);
  }

  const latestCost =
    product.productCosts?.slice().sort((left, right) => {
      const leftDate = toIsoString(left.effectiveFrom ?? left.createdAt) ?? "";
      const rightDate =
        toIsoString(right.effectiveFrom ?? right.createdAt) ?? "";
      return rightDate.localeCompare(leftDate);
    })[0] ?? null;

  return latestCost ? toNumber(latestCost.amount) : null;
}

function buildOrderBaseMetrics(order: OrderRow) {
  const metadata = (order.metadata ?? {}) as Record<string, unknown>;
  const totalWithFees = toNumber(order.totalAmount);
  const shippingAmount =
    sumFeesByPredicate(order.fees, (fee) => fee.feeType === "shipping_cost") ||
    readMetadataMoney(metadata, "shippingCostAmount");
  const tariffAmount = sumFeesByPredicate(
    order.fees,
    (fee) => fee.feeType === "marketplace_commission",
  );
  const fixedCostAmount =
    sumFeesByPredicate(order.fees, (fee) => fee.feeType === "fixed_fee") ||
    readMetadataMoney(metadata, "fixedCostAmount");
  const explicitMercadoLivreRefundBonusAmount =
    order.provider === "mercadolivre"
      ? readMercadoLivreExplicitRefundBonusFromShippingFees(order.fees)
      : null;
  const persistedRefundBonusAmount =
    order.refundBonusAmount !== null && order.refundBonusAmount !== undefined
      ? toNumber(order.refundBonusAmount)
      : 0;
  const persistedRefundBonusStatus =
    typeof order.refundBonusStatus === "string"
      ? order.refundBonusStatus
      : null;
  const hasPersistedResolution =
    persistedRefundBonusStatus === "RESOLVED" ||
    persistedRefundBonusStatus === "RESOLVED_ZERO";
  const refundBonusAmount = hasPersistedResolution
    ? persistedRefundBonusAmount
    : explicitMercadoLivreRefundBonusAmount !== null
      ? explicitMercadoLivreRefundBonusAmount
      : persistedRefundBonusAmount > 0
        ? persistedRefundBonusAmount
        : sumFeesByPredicate(
            order.fees,
            (fee) => fee.feeType === "refund_bonus",
          );
  const totalFees =
    shippingAmount + tariffAmount + fixedCostAmount - refundBonusAmount;
  const totalWithoutFees = Math.max(0, totalWithFees - totalFees);
  const itemsSold = order.items.reduce(
    (total, item) => total + item.quantity,
    0,
  );
  const canonicalStatus = normalizeOrderStatus(
    order.provider,
    order.status,
    metadata,
  );

  return {
    canonicalStatus,
    fixedCostAmount,
    itemsSold,
    metadata,
    refundBonusAmount,
    shippingAmount,
    tariffAmount,
    totalFees,
    totalWithFees,
    totalWithoutFees,
  };
}

function buildOrderFinancialMetrics(
  order: OrderRow,
  taxRateDefault: string | number | null | undefined,
) {
  const baseMetrics = buildOrderBaseMetrics(order);
  const revenueAmount =
    readSpreadsheetProductRevenueAmount(order) ?? baseMetrics.totalWithFees;
  const compositionOverrides = readOrderCompositionOverrides(
    (order.metadata ?? {}) as Record<string, unknown>,
  );
  const hasAuthoritativeMercadoLivreComposition =
    order.provider === "mercadolivre";
  const shippingOrFixedFeeAmount = readOverrideMoney(
    hasAuthoritativeMercadoLivreComposition
      ? undefined
      : compositionOverrides.shippingOrFixedFeeAmount,
    baseMetrics.shippingAmount > 0
      ? baseMetrics.shippingAmount
      : baseMetrics.fixedCostAmount,
  );
  const marketplaceCommissionAmount = readOverrideMoney(
    compositionOverrides.marketplaceCommissionAmount,
    baseMetrics.tariffAmount,
  );
  const refundBonusAmount = readOverrideMoney(
    hasAuthoritativeMercadoLivreComposition
      ? undefined
      : compositionOverrides.refundBonusAmount,
    baseMetrics.refundBonusAmount,
  );
  const netRevenueAmount =
    revenueAmount -
    marketplaceCommissionAmount -
    shippingOrFixedFeeAmount +
    refundBonusAmount;
  const parsedTaxRate = toNumber(taxRateDefault);
  const taxRateValue = Number.isFinite(parsedTaxRate) ? parsedTaxRate : 0;
  const pendingFinancialFields = readOrderPendingFinancialFields(order);
  const importedTaxAmount =
    order.provider === "mercadolivre" && isSpreadsheetImportedOrder(order)
      ? null
      : readMetadataMoneyString(baseMetrics.metadata, "importedTaxAmount");
  const taxAmount =
    importedTaxAmount !== null
      ? toNumber(importedTaxAmount)
      : pendingFinancialFields.includes("taxAmount")
        ? 0
        : revenueAmount * taxRateValue;

  let productCostAmount = 0;
  let packagingCostAmount = 0;
  let missingLinkedItemsCount = 0;
  let missingCostItemsCount = 0;

  for (const item of order.items) {
    const linkedProduct = item.externalProduct?.linkedProduct;
    if (!linkedProduct || !item.externalProduct?.linkedProductId) {
      missingLinkedItemsCount += 1;
      missingCostItemsCount += 1;
      continue;
    }

    const latestCostAmount = resolveLatestCostAmount(linkedProduct);
    if (latestCostAmount === null) {
      missingCostItemsCount += 1;
    } else {
      productCostAmount += latestCostAmount * item.quantity;
    }

    packagingCostAmount +=
      toNumber(linkedProduct.financeDefaults?.packagingCost) * item.quantity;
  }

  productCostAmount = readOverrideMoney(
    compositionOverrides.productCostAmount,
    productCostAmount,
  );
  packagingCostAmount = readOverrideMoney(
    compositionOverrides.packagingCostAmount,
    packagingCostAmount,
  );

  const hasIncompleteCostData =
    missingLinkedItemsCount > 0 ||
    missingCostItemsCount > 0 ||
    pendingFinancialFields.length > 0;
  const totalProfitAmount = hasIncompleteCostData
    ? null
    : netRevenueAmount - productCostAmount - packagingCostAmount - taxAmount;
  const contributionMarginPercent =
    totalProfitAmount === null || revenueAmount <= 0
      ? null
      : (totalProfitAmount / revenueAmount) * 100;
  const shippingBreakdown = buildOrderShippingBreakdown(order.fees);

  return {
    composition: {
      hasIncompleteCostData,
      marketplaceCommissionAmount: marketplaceCommissionAmount.toFixed(2),
      missingCostItemsCount,
      missingLinkedItemsCount,
      netRevenueAmount: netRevenueAmount.toFixed(2),
      packagingCostAmount: packagingCostAmount.toFixed(2),
      productCostAmount: productCostAmount.toFixed(2),
      refundBonusAmount: refundBonusAmount.toFixed(2),
      revenueAmount: revenueAmount.toFixed(2),
      ...(shippingBreakdown ? { shippingBreakdown } : {}),
      shippingOrFixedFeeAmount: shippingOrFixedFeeAmount.toFixed(2),
      taxAmount: taxAmount.toFixed(2),
      taxRateDefault:
        taxRateDefault === null || taxRateDefault === undefined
          ? null
          : String(taxRateDefault),
      ...(pendingFinancialFields.length > 0 ? { pendingFinancialFields } : {}),
    } satisfies OrderComposition,
    contributionMarginPercent:
      contributionMarginPercent === null
        ? null
        : contributionMarginPercent.toFixed(2),
    totalProfitAmount:
      totalProfitAmount === null ? null : totalProfitAmount.toFixed(2),
  };
}

function readOverrideMoney(value: string | undefined, fallback: number) {
  if (typeof value !== "string") {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getDisplayOrderId(
  order: Pick<OrderRow, "externalOrderId" | "metadata" | "provider">,
) {
  if (order.provider !== "mercadolivre") {
    return order.externalOrderId;
  }

  const metadata =
    order.metadata && typeof order.metadata === "object"
      ? (order.metadata as Record<string, unknown>)
      : null;
  const packId = readMercadoLivrePackId(metadata);
  const operationId = readMercadoLivreOperationId(metadata);

  if (packId) {
    return packId;
  }

  return operationId && operationId.length > 0
    ? operationId
    : order.externalOrderId;
}

function readMercadoLivrePackId(
  metadata: Record<string, unknown> | null | undefined,
) {
  const packId =
    metadata && typeof metadata.packId === "string"
      ? metadata.packId.trim()
      : null;

  return packId && packId.length > 0 ? packId : null;
}

function readMercadoLivreOperationId(
  metadata: Record<string, unknown> | null | undefined,
) {
  const operationId =
    metadata && typeof metadata.operationId === "string"
      ? metadata.operationId.trim()
      : null;

  return operationId && operationId.length > 0 ? operationId : null;
}

function readMercadoLivreShipmentId(
  metadata: Record<string, unknown> | null | undefined,
) {
  const shipmentId =
    metadata && typeof metadata.shipmentId === "string"
      ? metadata.shipmentId.trim()
      : null;

  return shipmentId && shipmentId.length > 0 ? shipmentId : null;
}

function shouldRefreshMercadoLivrePackId(
  order: Pick<OrderRowShallow, "metadata">,
) {
  if (isSpreadsheetImportedOrder(order)) {
    return false;
  }

  const metadata =
    order.metadata && typeof order.metadata === "object"
      ? (order.metadata as Record<string, unknown>)
      : null;

  return readMercadoLivrePackId(metadata) === null;
}

function shouldRefreshMercadoLivreOperationId(
  order: Pick<OrderRowShallow, "externalOrderId" | "metadata">,
) {
  if (isSpreadsheetImportedOrder(order)) {
    return false;
  }

  const metadata =
    order.metadata && typeof order.metadata === "object"
      ? (order.metadata as Record<string, unknown>)
      : null;
  const operationId = readMercadoLivreOperationId(metadata);

  if (operationId === null) {
    return true;
  }

  return operationId === order.externalOrderId;
}

function shouldRefreshMercadoLivreShippingRatio(
  order: Pick<OrderRowShallow, "fees" | "provider" | "metadata">,
) {
  if (order.provider !== "mercadolivre") {
    return false;
  }

  if (isSpreadsheetImportedOrder(order)) {
    return false;
  }

  const shippingFee = order.fees.find((fee) => fee.feeType === "shipping_cost");
  if (!shippingFee) {
    return false;
  }

  const metadata =
    shippingFee.metadata && typeof shippingFee.metadata === "object"
      ? (shippingFee.metadata as Record<string, unknown>)
      : null;

  if (!metadata) {
    return true;
  }

  const source =
    typeof metadata.source === "string" && metadata.source.trim().length > 0
      ? metadata.source.trim()
      : null;

  if (source === null) {
    return true;
  }

  if (source === "billing/integration/group/ML/order/details") {
    return readMetadataMoney(metadata, "shipping_seller_fee") <= 0;
  }

  if (source === "shipment_costs.senders") {
    return readMetadataMoney(metadata, "shipping_seller_fee") <= 0;
  }

  return source === "shipment_detail.shipping_option.list_cost";
}

function toBillingPeriodKey(value: Date | string | null | undefined) {
  const iso = toIsoString(value);
  if (!iso) {
    return null;
  }

  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

function toMercadoLivreSearchRange(periodKey: string) {
  const startAt = new Date(`${periodKey}T00:00:00.000Z`);
  if (Number.isNaN(startAt.getTime())) {
    return null;
  }

  const endAt = new Date(startAt);
  endAt.setUTCMonth(endAt.getUTCMonth() + 1);

  return {
    from: startAt.toISOString(),
    to: endAt.toISOString(),
  };
}

function isExpired(value: Date | string | null | undefined) {
  if (!value) {
    return false;
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isFinite(date.getTime()) && date.getTime() <= Date.now();
}

function readOrderCompositionOverrides(
  metadata: Record<string, unknown> | null | undefined,
): OrderCompositionOverrides {
  if (!metadata || typeof metadata !== "object") {
    return {};
  }

  const rawOverrides =
    metadata.compositionOverrides &&
    typeof metadata.compositionOverrides === "object"
      ? (metadata.compositionOverrides as Record<string, unknown>)
      : null;

  if (!rawOverrides) {
    return {};
  }

  return {
    marketplaceCommissionAmount:
      typeof rawOverrides.marketplaceCommissionAmount === "string"
        ? rawOverrides.marketplaceCommissionAmount
        : undefined,
    packagingCostAmount:
      typeof rawOverrides.packagingCostAmount === "string"
        ? rawOverrides.packagingCostAmount
        : undefined,
    productCostAmount:
      typeof rawOverrides.productCostAmount === "string"
        ? rawOverrides.productCostAmount
        : undefined,
    refundBonusAmount:
      typeof rawOverrides.refundBonusAmount === "string"
        ? rawOverrides.refundBonusAmount
        : undefined,
    shippingOrFixedFeeAmount:
      typeof rawOverrides.shippingOrFixedFeeAmount === "string"
        ? rawOverrides.shippingOrFixedFeeAmount
        : undefined,
  };
}

function buildOrderDisplayNameMaps(order: OrderRow) {
  const parentNameByGroupKey = new Map<string, string>();
  const displayNameByItemId = new Map<string, string>();
  const linkedItems = order.items.filter(
    (item) => item.externalProduct?.linkedProductId && item.externalProduct,
  );

  for (const item of linkedItems) {
    const externalProduct = item.externalProduct!;
    if (externalProduct.provider !== "mercadolivre") {
      continue;
    }

    const metadata = readMercadoLivreSyncMetadata(
      (externalProduct.metadata ?? {}) as Record<string, unknown>,
    );
    const itemId =
      metadata.itemId ??
      extractMercadoLivreItemId(externalProduct.externalProductId);
    if (!itemId) {
      continue;
    }

    const groupKey = toCatalogGroupKey(itemId);
    const isVariation =
      metadata.variationId !== null ||
      externalProduct.externalProductId.includes(":");
    const trimmedTitle = externalProduct.title?.trim() || null;

    if (!isVariation && trimmedTitle) {
      parentNameByGroupKey.set(groupKey, trimmedTitle);
    }
  }

  for (const item of linkedItems) {
    const externalProduct = item.externalProduct!;
    const fallbackName = externalProduct.title?.trim() || "Produto sem titulo";

    if (externalProduct.provider !== "mercadolivre") {
      displayNameByItemId.set(item.id, fallbackName);
      continue;
    }

    const metadata = readMercadoLivreSyncMetadata(
      (externalProduct.metadata ?? {}) as Record<string, unknown>,
    );
    const itemId =
      metadata.itemId ??
      extractMercadoLivreItemId(externalProduct.externalProductId);
    if (!itemId) {
      displayNameByItemId.set(item.id, fallbackName);
      continue;
    }

    const groupKey = toCatalogGroupKey(itemId);
    const isVariation =
      metadata.variationId !== null ||
      externalProduct.externalProductId.includes(":");

    if (!isVariation) {
      displayNameByItemId.set(item.id, fallbackName);
      continue;
    }

    const parentName = parentNameByGroupKey.get(groupKey);
    const linkedProductName =
      externalProduct.linkedProduct?.name?.trim() || null;
    displayNameByItemId.set(
      item.id,
      parentName || linkedProductName
        ? `${fallbackName} | ${parentName ?? linkedProductName}`
        : fallbackName,
    );
  }

  return displayNameByItemId;
}

function toOrderListItem(
  order: OrderRow,
  financialMetrics?: {
    contributionMarginPercent: string | null;
    totalProfitAmount: string | null;
  },
): OrderListItem {
  const baseMetrics = buildOrderBaseMetrics(order);
  const imported = isSpreadsheetImportedOrder(order);
  const spreadsheetProductRevenueAmount =
    readSpreadsheetProductRevenueAmount(order);
  const sourceStatus = readOrderSourceStatus(order);

  return {
    createdAt: toIsoString(order.createdAt)!,
    currency: order.currency,
    displayOrderId: getDisplayOrderId(order),
    fixedCostAmount: baseMetrics.fixedCostAmount.toFixed(2),
    id: order.id,
    itemsSold: baseMetrics.itemsSold,
    orderDate: toDateOnly(order.orderedAt),
    orderId: order.externalOrderId,
    orderedAt: toIsoString(order.orderedAt),
    provider: order.provider as "mercadolivre" | "shopee" | "shein",
    skus: collectOrderSkus(order),
    shippingAmount: baseMetrics.shippingAmount.toFixed(2),
    sourceStatus,
    status: baseMetrics.canonicalStatus,
    statusLabel: imported
      ? sourceStatus
      : getOrderStatusLabel(baseMetrics.canonicalStatus),
    tags: readOrderImportTags(order),
    tariffAmount: baseMetrics.tariffAmount.toFixed(2),
    totalFees: baseMetrics.totalFees.toFixed(2),
    totalWithFees: (
      spreadsheetProductRevenueAmount ?? baseMetrics.totalWithFees
    ).toFixed(2),
    totalWithoutFees: baseMetrics.totalWithoutFees.toFixed(2),
    contributionMarginPercent:
      financialMetrics?.contributionMarginPercent ?? null,
    totalProfitAmount: financialMetrics?.totalProfitAmount ?? null,
  };
}

function collectOrderSkus(order: Pick<OrderRow, "items">): string[] {
  const uniqueSkus = new Set<string>();
  const skus: string[] = [];

  for (const item of order.items) {
    const sku =
      item.externalProduct?.linkedProduct?.sku?.trim() ??
      item.externalProduct?.sku?.trim() ??
      "";
    if (!sku || uniqueSkus.has(sku)) {
      continue;
    }

    uniqueSkus.add(sku);
    skus.push(sku);
  }

  return skus;
}

function toOrderLineItems(order: OrderRow): OrderLineItem[] {
  const orderRow = toOrderListItem(order);
  const baseMetrics = buildOrderBaseMetrics(order);
  const displayNameByItemId = buildOrderDisplayNameMaps(order);
  const itemTotalsCents = order.items.map((item) =>
    parseMoneyToCents(item.totalPrice),
  );
  const commissionTotalCents = parseMoneyToCents(orderRow.tariffAmount);
  const shippingOrFixedFeeTotalCents =
    parseMoneyToCents(orderRow.shippingAmount) +
    parseMoneyToCents(orderRow.fixedCostAmount);
  const refundBonusTotalCents = parseMoneyToCents(
    baseMetrics.refundBonusAmount.toFixed(2),
  );
  const commissionAllocations = allocateCentsByWeights(
    commissionTotalCents,
    itemTotalsCents,
  );
  const shippingOrFixedFeeAllocations = allocateCentsByWeights(
    shippingOrFixedFeeTotalCents,
    itemTotalsCents,
  );
  const refundBonusAllocations = allocateCentsByWeights(
    refundBonusTotalCents,
    itemTotalsCents,
  );

  return order.items.map((item, index) => {
    const linkedProduct = item.externalProduct?.linkedProduct;
    const revenueCents = itemTotalsCents[index] ?? 0n;
    const commissionCents = commissionAllocations[index] ?? 0n;
    const shippingOrFixedFeeCents = shippingOrFixedFeeAllocations[index] ?? 0n;
    const refundBonusCents = refundBonusAllocations[index] ?? 0n;
    const netRevenueCents =
      revenueCents -
      commissionCents -
      shippingOrFixedFeeCents +
      refundBonusCents;
    const packagingCostCents = linkedProduct
      ? parseMoneyToCents(linkedProduct.financeDefaults?.packagingCost) *
        BigInt(item.quantity)
      : 0n;
    const latestCostAmount = resolveLatestCostAmount(linkedProduct);
    const productCostCents =
      latestCostAmount === null
        ? null
        : parseMoneyToCents(latestCostAmount) * BigInt(item.quantity);
    const totalProfitCents =
      linkedProduct && productCostCents !== null
        ? netRevenueCents - productCostCents - packagingCostCents
        : null;

    return {
      channel: orderRow.provider,
      contributionMarginPercent:
        totalProfitCents === null
          ? null
          : toPercentString(totalProfitCents, revenueCents),
      displayName:
        displayNameByItemId.get(item.id) ??
        item.externalProduct?.title?.trim() ??
        "Produto sem titulo",
      id: item.id,
      imageUrl: getPrimaryImageUrl(item.externalProduct?.linkedProduct?.images),
      linkedProductId: item.externalProduct?.linkedProductId ?? null,
      netRevenueAmount: formatCents(netRevenueCents),
      orderedAt: orderRow.orderedAt,
      productName: item.externalProduct?.title?.trim() || "Produto sem titulo",
      quantity: item.quantity,
      sku:
        item.externalProduct?.linkedProduct?.sku?.trim() ??
        item.externalProduct?.sku?.trim() ??
        null,
      totalPrice: toMoney(item.totalPrice),
      totalProfitAmount:
        totalProfitCents === null ? null : formatCents(totalProfitCents),
      unitPrice: toMoney(item.unitPrice),
    };
  });
}

function buildOrderComposition(
  order: OrderRow,
  taxRateDefault: string | number | null | undefined,
): OrderComposition {
  return buildOrderFinancialMetrics(order, taxRateDefault).composition;
}

function isMercadoLivreGroupedOrderId(orderId: string) {
  return orderId.startsWith(MERCADOLIVRE_GROUP_ID_PREFIX);
}

function toMercadoLivreGroupedOrderId(displayOrderId: string) {
  return `${MERCADOLIVRE_GROUP_ID_PREFIX}${displayOrderId}`;
}

function readMercadoLivreGroupedDisplayOrderId(orderId: string) {
  return isMercadoLivreGroupedOrderId(orderId)
    ? orderId.slice(MERCADOLIVRE_GROUP_ID_PREFIX.length)
    : null;
}

function buildLogicalOrderId(rows: OrderRow[], displayOrderId: string) {
  const [firstRow] = rows;
  if (!firstRow) {
    throw new Error("Cannot build logical order id without rows.");
  }

  if (firstRow.provider === "mercadolivre") {
    return toMercadoLivreGroupedOrderId(displayOrderId);
  }

  return firstRow.id;
}

function sumMoneyStrings(values: Array<string | null | undefined>) {
  return values.reduce((total, value) => total + toNumber(value), 0).toFixed(2);
}

function deriveOrderProfitMetricsFromComposition(
  composition: OrderComposition,
) {
  const revenueAmount = toNumber(composition.revenueAmount);
  const totalProfitAmount = composition.hasIncompleteCostData
    ? null
    : toNumber(composition.netRevenueAmount) -
      toNumber(composition.productCostAmount) -
      toNumber(composition.packagingCostAmount) -
      toNumber(composition.taxAmount);
  const contributionMarginPercent =
    totalProfitAmount === null || revenueAmount <= 0
      ? null
      : ((totalProfitAmount / revenueAmount) * 100).toFixed(2);

  return {
    contributionMarginPercent,
    totalProfitAmount:
      totalProfitAmount === null ? null : totalProfitAmount.toFixed(2),
  };
}

function aggregateShippingBreakdown(compositions: OrderComposition[]) {
  const breakdowns = compositions
    .map((composition) => composition.shippingBreakdown)
    .filter(
      (value): value is NonNullable<OrderComposition["shippingBreakdown"]> =>
        Boolean(value),
    );

  return aggregateShippingBreakdowns(breakdowns);
}

function aggregateShippingBreakdowns(
  breakdowns: Array<NonNullable<OrderComposition["shippingBreakdown"]>>,
) {
  if (breakdowns.length === 0) {
    return undefined;
  }

  const source = breakdowns[0]?.source ?? null;
  const hasMixedSource = breakdowns.some(
    (breakdown) => (breakdown.source ?? null) !== source,
  );

  return {
    buyerShippingPaymentAmount: sumMoneyStrings(
      breakdowns.map((breakdown) => breakdown.buyerShippingPaymentAmount),
    ),
    grossShippingTariffAmount: sumMoneyStrings(
      breakdowns.map((breakdown) => breakdown.grossShippingTariffAmount),
    ),
    netShippingAmount: sumMoneyStrings(
      breakdowns.map((breakdown) => breakdown.netShippingAmount),
    ),
    source: hasMixedSource ? null : source,
  };
}

function buildGroupedShippingDeduplicationKey(
  row: Pick<OrderRow, "fees">,
  shippingAmount: number,
) {
  const shippingFee = row.fees.find((fee) => fee.feeType === "shipping_cost");
  const metadata =
    shippingFee?.metadata && typeof shippingFee.metadata === "object"
      ? (shippingFee.metadata as Record<string, unknown>)
      : null;
  const shipmentId = readMercadoLivreShipmentId(metadata);

  if (!shipmentId) {
    return null;
  }

  const breakdown = buildOrderShippingBreakdown(row.fees);
  return breakdown
    ? `${shipmentId}:${shippingAmount.toFixed(2)}:${breakdown.buyerShippingPaymentAmount}:${breakdown.grossShippingTariffAmount}:${breakdown.netShippingAmount}`
    : `${shipmentId}:${shippingAmount.toFixed(2)}`;
}

function aggregateGroupedShipping(
  rows: OrderRow[],
  baseMetricsByRow: ReturnType<typeof buildOrderBaseMetrics>[],
) {
  let shippingAmount = 0;
  const breakdowns: Array<NonNullable<OrderComposition["shippingBreakdown"]>> =
    [];
  const seenShippingKeys = new Set<string>();

  rows.forEach((row, index) => {
    const baseMetrics = baseMetricsByRow[index];
    if (!baseMetrics) {
      return;
    }

    const shippingKey = buildGroupedShippingDeduplicationKey(
      row,
      baseMetrics.shippingAmount,
    );
    const shouldDeduplicate =
      shippingKey !== null && seenShippingKeys.has(shippingKey);

    if (!shouldDeduplicate) {
      shippingAmount += baseMetrics.shippingAmount;
      if (shippingKey) {
        seenShippingKeys.add(shippingKey);
      }
    }

    const shippingBreakdown = buildOrderShippingBreakdown(row.fees);
    if (!shippingBreakdown || shouldDeduplicate) {
      return;
    }

    breakdowns.push(shippingBreakdown);
  });

  return {
    shippingAmount,
    shippingBreakdown: aggregateShippingBreakdowns(breakdowns),
  };
}

function aggregateOrderComposition(
  compositions: OrderComposition[],
  shippingAmount: number,
  shippingBreakdown?: NonNullable<OrderComposition["shippingBreakdown"]>,
  options: {
    refundBonusAmount?: number | null;
  } = {},
) {
  const marketplaceCommissionAmount = sumMoneyStrings(
    compositions.map((composition) => composition.marketplaceCommissionAmount),
  );
  const refundBonusAmount =
    options.refundBonusAmount !== undefined &&
    options.refundBonusAmount !== null
      ? options.refundBonusAmount.toFixed(2)
      : sumMoneyStrings(
          compositions.map((composition) => composition.refundBonusAmount),
        );
  const revenueAmount = sumMoneyStrings(
    compositions.map((composition) => composition.revenueAmount),
  );
  const shippingOrFixedFeeAmount = shippingAmount.toFixed(2);
  const netRevenueAmount = (
    toNumber(revenueAmount) -
    toNumber(marketplaceCommissionAmount) -
    shippingAmount +
    toNumber(refundBonusAmount)
  ).toFixed(2);
  const pendingFinancialFields = Array.from(
    new Set(
      compositions.flatMap(
        (composition) => composition.pendingFinancialFields ?? [],
      ),
    ),
  ) as OrderImportPendingFinancialField[];

  return {
    hasIncompleteCostData: compositions.some(
      (composition) => composition.hasIncompleteCostData,
    ),
    marketplaceCommissionAmount,
    missingCostItemsCount: compositions.reduce(
      (total, composition) => total + composition.missingCostItemsCount,
      0,
    ),
    missingLinkedItemsCount: compositions.reduce(
      (total, composition) => total + composition.missingLinkedItemsCount,
      0,
    ),
    netRevenueAmount,
    packagingCostAmount: sumMoneyStrings(
      compositions.map((composition) => composition.packagingCostAmount),
    ),
    productCostAmount: sumMoneyStrings(
      compositions.map((composition) => composition.productCostAmount),
    ),
    refundBonusAmount,
    revenueAmount,
    ...(shippingBreakdown ? { shippingBreakdown } : {}),
    shippingOrFixedFeeAmount,
    taxAmount: sumMoneyStrings(
      compositions.map((composition) => composition.taxAmount),
    ),
    taxRateDefault:
      compositions.find((composition) => composition.taxRateDefault !== null)
        ?.taxRateDefault ?? null,
    ...(pendingFinancialFields.length > 0 ? { pendingFinancialFields } : {}),
  } satisfies OrderComposition;
}

function sumUniqueRefundBonusMovements(
  rows: OrderRow[],
  baseMetricsByRow: ReturnType<typeof buildOrderBaseMetrics>[],
) {
  if (rows.every((row) => row.provider === "mercadolivre")) {
    return baseMetricsByRow.reduce(
      (total, metrics) => total + metrics.refundBonusAmount,
      0,
    );
  }

  const seenMovementKeys = new Set<string>();
  let total = 0;

  rows.forEach((row, index) => {
    const metadata =
      row.metadata && typeof row.metadata === "object"
        ? (row.metadata as Record<string, unknown>)
        : {};
    const manualOverride =
      readOrderCompositionOverrides(metadata).refundBonusAmount;
    if (manualOverride !== undefined) {
      const overrideAmount = toNumber(manualOverride);
      if (Number.isFinite(overrideAmount)) {
        total += overrideAmount;
      }
      return;
    }
    const movements = Array.isArray(metadata.refundBonusMovements)
      ? metadata.refundBonusMovements
      : [];
    let hasValidMovement = false;

    for (const movement of movements) {
      if (!movement || typeof movement !== "object") {
        continue;
      }

      const record = movement as Record<string, unknown>;
      const key = typeof record.key === "string" ? record.key.trim() : "";
      const documentType =
        record.documentType === "CREDIT_NOTE" ? "CREDIT_NOTE" : "BILL";
      const deduplicationKey = `${documentType}:${key}`;
      const amount = Number(record.amount);
      if (!key || !Number.isFinite(amount) || amount <= 0) {
        continue;
      }

      hasValidMovement = true;
      if (seenMovementKeys.has(deduplicationKey)) {
        continue;
      }

      seenMovementKeys.add(deduplicationKey);
      total += amount;
    }

    if (!hasValidMovement) {
      total += baseMetricsByRow[index]?.refundBonusAmount ?? 0;
    }
  });

  return total;
}

function buildLogicalOrder(
  rows: OrderRow[],
  taxRateDefault: string | number | null | undefined,
): LogicalOrder {
  const [firstRow] = rows;
  if (!firstRow) {
    throw new Error("Cannot build logical order without rows.");
  }

  const displayOrderId = getDisplayOrderId(firstRow);
  const baseMetricsByRow = rows.map((row) => buildOrderBaseMetrics(row));
  const compositions = rows.map((row) =>
    buildOrderComposition(row, taxRateDefault),
  );
  const totalRefundBonusAmount = sumUniqueRefundBonusMovements(
    rows,
    baseMetricsByRow,
  );
  const groupedShipping =
    rows.length === 1
      ? {
          shippingAmount: baseMetricsByRow[0]?.shippingAmount ?? 0,
          shippingBreakdown: compositions[0]?.shippingBreakdown ?? undefined,
        }
      : aggregateGroupedShipping(rows, baseMetricsByRow);
  const composition =
    rows.length === 1
      ? compositions[0]!
      : aggregateOrderComposition(
          compositions,
          groupedShipping.shippingAmount,
          groupedShipping.shippingBreakdown,
          { refundBonusAmount: totalRefundBonusAmount },
        );
  const financialMetrics = deriveOrderProfitMetricsFromComposition(composition);
  const uniqueSkus = new Set<string>();
  const skus: string[] = [];

  for (const row of rows) {
    for (const sku of collectOrderSkus(row)) {
      if (uniqueSkus.has(sku)) {
        continue;
      }

      uniqueSkus.add(sku);
      skus.push(sku);
    }
  }

  const items = rows.flatMap((row) => toOrderLineItems(row));
  const firstMetrics = baseMetricsByRow[0]!;
  const totalShippingAmount = groupedShipping.shippingAmount;
  const totalFixedCostAmount = baseMetricsByRow.reduce(
    (total, metrics) => total + metrics.fixedCostAmount,
    0,
  );
  const totalTariffAmount = baseMetricsByRow.reduce(
    (total, metrics) => total + metrics.tariffAmount,
    0,
  );
  const totalWithFeesAmount = rows.reduce(
    (total, row, index) =>
      total +
      (readSpreadsheetProductRevenueAmount(row) ??
        baseMetricsByRow[index]?.totalWithFees ??
        0),
    0,
  );
  const totalFeesAmount =
    totalShippingAmount +
    totalTariffAmount +
    totalFixedCostAmount -
    totalRefundBonusAmount;
  const totalWithoutFeesAmount = Math.max(
    0,
    totalWithFeesAmount - totalFeesAmount,
  );
  const tags = Array.from(
    new Set(rows.flatMap((row) => readOrderImportTags(row))),
  ) as OrderImportTag[];

  return {
    composition,
    items,
    order: {
      createdAt: toIsoString(firstRow.createdAt)!,
      currency: firstRow.currency,
      displayOrderId,
      fixedCostAmount: totalFixedCostAmount.toFixed(2),
      id: buildLogicalOrderId(rows, displayOrderId),
      itemsSold: baseMetricsByRow.reduce(
        (total, metrics) => total + metrics.itemsSold,
        0,
      ),
      orderDate: toDateOnly(firstRow.orderedAt),
      orderId: firstRow.externalOrderId,
      orderedAt: toIsoString(firstRow.orderedAt),
      provider: firstRow.provider as "mercadolivre" | "shopee" | "shein",
      shippingAmount: totalShippingAmount.toFixed(2),
      skus,
      sourceStatus: readOrderSourceStatus(firstRow),
      status: firstMetrics.canonicalStatus,
      statusLabel: isSpreadsheetImportedOrder(firstRow)
        ? readOrderSourceStatus(firstRow)
        : getOrderStatusLabel(firstMetrics.canonicalStatus),
      tags,
      tariffAmount: totalTariffAmount.toFixed(2),
      totalFees: totalFeesAmount.toFixed(2),
      totalWithFees: totalWithFeesAmount.toFixed(2),
      totalWithoutFees: totalWithoutFeesAmount.toFixed(2),
      ...financialMetrics,
    },
    rows,
  };
}

function buildLogicalOrders(
  rows: OrderRow[],
  taxRateDefault: string | number | null | undefined,
) {
  const groupedRows = new Map<string, OrderRow[]>();

  for (const row of rows) {
    const groupKey =
      row.provider === "mercadolivre"
        ? `mercadolivre:${getDisplayOrderId(row)}`
        : `row:${row.id}`;
    const existing = groupedRows.get(groupKey);

    if (existing) {
      existing.push(row);
      continue;
    }

    groupedRows.set(groupKey, [row]);
  }

  return Array.from(groupedRows.values()).map((group) =>
    buildLogicalOrder(group, taxRateDefault),
  );
}

function buildEmptyOrdersSummary(): OrdersListSummary {
  return {
    averageMargin: "0.00",
    grossProfit: "0.00",
    grossRevenue: "0.00",
    ordersCount: 0,
    unitsSold: 0,
  };
}

function buildOrdersSummary(logicalOrders: LogicalOrder[]): OrdersListSummary {
  if (logicalOrders.length === 0) {
    return buildEmptyOrdersSummary();
  }

  let grossRevenue = 0;
  let grossProfit = 0;
  let unitsSold = 0;

  for (const logicalOrder of logicalOrders) {
    const order = logicalOrder.order;
    const composition = logicalOrder.composition;
    const orderGrossProfit =
      toNumber(composition.netRevenueAmount) -
      toNumber(composition.productCostAmount) -
      toNumber(composition.packagingCostAmount);

    grossRevenue += toNumber(order.totalWithFees);
    grossProfit += orderGrossProfit;
    unitsSold += order.itemsSold;
  }

  const averageMargin = grossRevenue > 0 ? grossProfit / grossRevenue : 0;

  return {
    averageMargin: averageMargin.toFixed(4),
    grossProfit: grossProfit.toFixed(4),
    grossRevenue: grossRevenue.toFixed(4),
    ordersCount: logicalOrders.length,
    unitsSold,
  };
}

function getOrderListSortValue(row: OrderListItem, key: OrderSortKey) {
  switch (key) {
    case "provider":
      return row.provider;
    case "orderId":
      return row.displayOrderId;
    case "statusLabel":
      return row.statusLabel;
    case "orderedAt":
      return row.orderedAt ?? "";
    case "itemsSold":
      return row.itemsSold;
    case "contributionMarginPercent":
      return row.contributionMarginPercent === null
        ? null
        : Number(row.contributionMarginPercent);
    case "shippingAmount":
      return Number(row.shippingAmount);
    case "tariffAmount":
      return Number(row.tariffAmount);
    case "fixedCostAmount":
      return Number(row.fixedCostAmount);
    case "totalProfitAmount":
      return row.totalProfitAmount === null
        ? null
        : Number(row.totalProfitAmount);
    case "totalWithFees":
      return Number(row.totalWithFees);
  }
}

function compareOrderListItems(
  left: OrderListItem,
  right: OrderListItem,
  key: OrderSortKey,
  direction: "asc" | "desc",
) {
  const leftValue = getOrderListSortValue(left, key);
  const rightValue = getOrderListSortValue(right, key);

  const primaryResult = compareOrderSortValues(
    leftValue,
    rightValue,
    direction,
  );
  if (primaryResult !== 0) {
    return primaryResult;
  }

  const orderedAtResult = compareOrderSortValues(
    left.orderedAt ?? "",
    right.orderedAt ?? "",
    "desc",
  );
  if (orderedAtResult !== 0) {
    return orderedAtResult;
  }

  const createdAtResult = compareOrderSortValues(
    left.createdAt,
    right.createdAt,
    "desc",
  );
  if (createdAtResult !== 0) {
    return createdAtResult;
  }

  return right.id.localeCompare(left.id);
}

function compareOrderSortValues(
  leftValue: string | number | null | undefined,
  rightValue: string | number | null | undefined,
  direction: "asc" | "desc",
) {
  const leftNull = leftValue === null || leftValue === undefined;
  const rightNull = rightValue === null || rightValue === undefined;

  if (leftNull && rightNull) {
    return 0;
  }
  if (leftNull) {
    return 1;
  }
  if (rightNull) {
    return -1;
  }

  if (typeof leftValue === "string" && typeof rightValue === "string") {
    return direction === "asc"
      ? leftValue.localeCompare(rightValue)
      : rightValue.localeCompare(leftValue);
  }

  const leftNumber = Number(leftValue);
  const rightNumber = Number(rightValue);
  return direction === "asc"
    ? leftNumber - rightNumber
    : rightNumber - leftNumber;
}

function readPositiveInteger(value: unknown, fallback: number) {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim().length > 0
        ? Number(value)
        : fallback;

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  const integer = Math.trunc(parsed);
  return integer > 0 ? integer : fallback;
}

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);
  private readonly mercadoLivrePackIdCache = new Map<
    string,
    Promise<Map<string, string>>
  >();
  private readonly billingOperationIdCache = new Map<
    string,
    Promise<Map<string, string>>
  >();
  private readonly billingOrderShippingDetailCache = new Map<
    string,
    Promise<MercadoLivreBillingOrderDetailsResponse | null>
  >();

  constructor(
    @Inject(DATABASE_CLIENT)
    private readonly db: DatabaseClient,
    @Inject(API_RUNTIME_ENV)
    private readonly env?: ApiRuntimeEnv,
  ) {}

  async listOrders(
    authContext: TenantContext,
    filters: OrderListFilters = {},
  ): Promise<OrdersListResponse> {
    const companyId = this.requireSelectedCompanyId(authContext);
    const page = readPositiveInteger(filters.page, 1);
    const pageSize = readPositiveInteger(filters.pageSize, 20);
    const includeSummary = filters.includeSummary ?? true;
    const sortBy = filters.sortBy ?? "orderedAt";
    const sortDirection = filters.sortDirection ?? "desc";
    const searchNeedle = filters.search?.trim();
    const saleIdNeedle = filters.saleId?.trim();
    const skuNeedle = filters.sku?.trim();
    const baseWhereConditions = [
      eq(externalOrders.organizationId, authContext.organizationId),
      eq(externalOrders.companyId, companyId),
      ...(saleIdNeedle ? [buildSaleIdWhere(saleIdNeedle)] : []),
      ...(skuNeedle ? [buildSkuWhere(skuNeedle)] : []),
      ...(filters.provider
        ? [eq(externalOrders.provider, filters.provider)]
        : []),
      ...(filters.orderedFrom
        ? [sql`${externalOrders.orderedAt}::date >= ${filters.orderedFrom}`]
        : []),
      ...(filters.orderedTo
        ? [sql`${externalOrders.orderedAt}::date <= ${filters.orderedTo}`]
        : []),
    ];
    const baseWhere = and(...baseWhereConditions);
    const canPageInDatabase =
      !searchNeedle &&
      !saleIdNeedle &&
      !skuNeedle &&
      !filters.status &&
      ["orderedAt", "provider"].includes(sortBy);
    const [company] = await Promise.all([
      this.db.query.companies.findFirst({
        where: (table) =>
          and(
            eq(table.id, companyId),
            eq(table.organizationId, authContext.organizationId),
          ),
      }),
    ]);

    if (
      canPageInDatabase &&
      typeof (this.db as { select?: unknown }).select === "function"
    ) {
      const logicalGroupKeySql = buildLogicalOrderGroupKeySql();
      const groupedOrderedAtSql = sql<Date>`max(${externalOrders.orderedAt})`;
      const groupedCreatedAtSql = sql<Date>`max(${externalOrders.createdAt})`;
      const groupedRowIdSql = sql<string>`max(${externalOrders.id}::text)`;
      const groupedOrderByClause =
        sortBy === "provider"
          ? sortDirection === "asc"
            ? [
                asc(externalOrders.provider),
                desc(groupedOrderedAtSql),
                desc(groupedCreatedAtSql),
                desc(groupedRowIdSql),
              ]
            : [
                desc(externalOrders.provider),
                desc(groupedOrderedAtSql),
                desc(groupedCreatedAtSql),
                desc(groupedRowIdSql),
              ]
          : sortDirection === "asc"
            ? [
                asc(groupedOrderedAtSql),
                desc(groupedCreatedAtSql),
                desc(groupedRowIdSql),
              ]
            : [
                desc(groupedOrderedAtSql),
                desc(groupedCreatedAtSql),
                desc(groupedRowIdSql),
              ];
      const [{ count: totalItems }] = await this.db
        .select({
          count: sql<number>`count(distinct (${externalOrders.provider} || ':' || ${logicalGroupKeySql}))`,
        })
        .from(externalOrders)
        .where(baseWhere);
      const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
      const safePage = Math.min(page, totalPages);
      const pagedGroups = await this.db
        .select({
          logicalGroupKey: logicalGroupKeySql,
          provider: externalOrders.provider,
        })
        .from(externalOrders)
        .where(baseWhere)
        .groupBy(externalOrders.provider, logicalGroupKeySql)
        .orderBy(...groupedOrderByClause)
        .limit(pageSize)
        .offset((safePage - 1) * pageSize);
      const shallowGroupRows =
        pagedGroups.length === 0
          ? []
          : await this.db.query.externalOrders.findMany({
              where: (table) =>
                and(
                  ...baseWhereConditions,
                  or(
                    ...pagedGroups.map((group) =>
                      group.provider === "mercadolivre"
                        ? and(
                            eq(table.provider, "mercadolivre"),
                            sql`(
                              ${table.externalOrderId} = ${group.logicalGroupKey}
                              or coalesce(${table.metadata}->>'operationId', '') = ${group.logicalGroupKey}
                              or coalesce(${table.metadata}->>'packId', '') = ${group.logicalGroupKey}
                            )`,
                          )
                        : eq(table.id, group.logicalGroupKey),
                    ),
                  ),
                ),
              with: {
                fees: true,
                items: {
                  with: {
                    externalProduct: true,
                  },
                },
              },
            });
      const operationBackfilledRows =
        await this.backfillMercadoLivreOperationIds(
          authContext,
          companyId,
          shallowGroupRows as OrderRowShallow[],
        );
      const shippingBillingBackfilledRows =
        await this.backfillMercadoLivreBillingShippingCosts(
          authContext,
          companyId,
          operationBackfilledRows,
        );
      const hydratedRows = await this.hydrateLinkedProducts(
        authContext,
        companyId,
        shippingBillingBackfilledRows,
      );
      const hydratedLogicalOrdersById = new Map(
        buildLogicalOrders(hydratedRows, company?.taxRateDefault).map(
          (logicalOrder) => [logicalOrder.order.id, logicalOrder] as const,
        ),
      );
      const orderedLogicalOrders = pagedGroups
        .map((group) => {
          const logicalOrderId =
            group.provider === "mercadolivre"
              ? toMercadoLivreGroupedOrderId(group.logicalGroupKey)
              : group.logicalGroupKey;
          return hydratedLogicalOrdersById.get(logicalOrderId) ?? null;
        })
        .filter(
          (logicalOrder): logicalOrder is LogicalOrder => logicalOrder !== null,
        );

      return {
        availableStatuses: ORDER_STATUS_OPTIONS,
        items: orderedLogicalOrders.map((logicalOrder) => logicalOrder.order),
        page: safePage,
        pageSize,
        summary: includeSummary
          ? await this.buildOrdersSummaryForFilters(
              authContext,
              companyId,
              company?.taxRateDefault,
              filters,
            )
          : buildEmptyOrdersSummary(),
        totalItems,
        totalPages,
      };
    }

    const rows = await this.db.query.externalOrders.findMany({
      orderBy: (table) => [desc(table.orderedAt), desc(table.createdAt)],
      where: () => baseWhere,
      with: {
        fees: true,
        items: {
          with: {
            externalProduct: true,
          },
        },
      },
    });
    const operationBackfilledRows = await this.backfillMercadoLivreOperationIds(
      authContext,
      companyId,
      rows as OrderRowShallow[],
    );
    const shippingBillingBackfilledRows =
      await this.backfillMercadoLivreBillingShippingCosts(
        authContext,
        companyId,
        operationBackfilledRows,
      );
    const hydratedRows = await this.hydrateLinkedProducts(
      authContext,
      companyId,
      shippingBillingBackfilledRows,
    );
    const mapped = buildLogicalOrders(
      hydratedRows,
      company?.taxRateDefault,
    ).filter(({ order: item }) => {
      if (filters.search && !matchesOrderSearch(item, filters.search)) {
        return false;
      }

      if (filters.saleId && !matchesSaleIdFilter(item, filters.saleId)) {
        return false;
      }

      if (filters.sku && !matchesSkuFilter(item, filters.sku)) {
        return false;
      }

      if (filters.status && item.status !== filters.status) {
        return false;
      }

      if (
        (filters.orderedFrom || filters.orderedTo) &&
        !isOrderWithinRange(
          item.orderDate,
          filters.orderedFrom,
          filters.orderedTo,
        )
      ) {
        return false;
      }

      return true;
    });
    mapped.sort((left, right) =>
      compareOrderListItems(left.order, right.order, sortBy, sortDirection),
    );
    const totalItems = mapped.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * pageSize;
    const paged = mapped.slice(start, start + pageSize);

    return {
      availableStatuses: ORDER_STATUS_OPTIONS,
      items: paged.map(({ order }) => order),
      page: safePage,
      pageSize,
      summary: includeSummary
        ? buildOrdersSummary(mapped)
        : buildEmptyOrdersSummary(),
      totalItems,
      totalPages,
    };
  }

  async exportOrdersSpreadsheet(
    authContext: TenantContext,
    filters: OrderExportFilters = {},
  ): Promise<Buffer> {
    const companyId = this.requireSelectedCompanyId(authContext);
    const normalizedFilters = orderExportQuerySchema.parse(filters);
    const sortBy = "orderedAt" satisfies NonNullable<
      OrderListFilters["sortBy"]
    >;
    const sortDirection = "desc" as const;
    const saleIdNeedle = normalizedFilters.saleId?.trim();
    const skuNeedle = normalizedFilters.sku?.trim();
    const baseWhereConditions = [
      eq(externalOrders.organizationId, authContext.organizationId),
      eq(externalOrders.companyId, companyId),
      ...(saleIdNeedle ? [buildSaleIdWhere(saleIdNeedle)] : []),
      ...(skuNeedle ? [buildSkuWhere(skuNeedle)] : []),
      ...(normalizedFilters.provider
        ? [eq(externalOrders.provider, normalizedFilters.provider)]
        : []),
      ...(normalizedFilters.orderedFrom
        ? [
            sql`${externalOrders.orderedAt}::date >= ${normalizedFilters.orderedFrom}`,
          ]
        : []),
      ...(normalizedFilters.orderedTo
        ? [
            sql`${externalOrders.orderedAt}::date <= ${normalizedFilters.orderedTo}`,
          ]
        : []),
    ];
    const baseWhere = and(...baseWhereConditions);
    const [company] = await Promise.all([
      this.db.query.companies.findFirst({
        where: (table) =>
          and(
            eq(table.id, companyId),
            eq(table.organizationId, authContext.organizationId),
          ),
      }),
    ]);
    const rows = await this.db.query.externalOrders.findMany({
      orderBy: (table) => [desc(table.orderedAt), desc(table.createdAt)],
      where: () => baseWhere,
      with: {
        fees: true,
        items: {
          with: {
            externalProduct: true,
          },
        },
      },
    });
    const backfilledRows = await this.backfillMercadoLivreOperationIds(
      authContext,
      companyId,
      rows as OrderRowShallow[],
    );
    const shippingBillingBackfilledRows =
      await this.backfillMercadoLivreBillingShippingCosts(
        authContext,
        companyId,
        backfilledRows,
      );
    const hydratedRows = await this.hydrateLinkedProducts(
      authContext,
      companyId,
      shippingBillingBackfilledRows,
    );
    const selectedIds = new Set(normalizedFilters.ids ?? []);
    const mapped = buildLogicalOrders(
      hydratedRows,
      company?.taxRateDefault,
    ).filter(({ order: item }) => {
      if (selectedIds.size > 0 && !selectedIds.has(item.id)) {
        return false;
      }

      if (
        normalizedFilters.search &&
        !matchesOrderSearch(item, normalizedFilters.search)
      ) {
        return false;
      }

      if (
        normalizedFilters.saleId &&
        !matchesSaleIdFilter(item, normalizedFilters.saleId)
      ) {
        return false;
      }

      if (
        normalizedFilters.sku &&
        !matchesSkuFilter(item, normalizedFilters.sku)
      ) {
        return false;
      }

      if (
        normalizedFilters.status &&
        item.status !== normalizedFilters.status
      ) {
        return false;
      }

      if (
        (normalizedFilters.orderedFrom || normalizedFilters.orderedTo) &&
        !isOrderWithinRange(
          item.orderDate,
          normalizedFilters.orderedFrom,
          normalizedFilters.orderedTo,
        )
      ) {
        return false;
      }

      return true;
    });
    mapped.sort((left, right) =>
      compareOrderListItems(left.order, right.order, sortBy, sortDirection),
    );

    const worksheet = utils.json_to_sheet(
      mapped.map(({ order: item }) => ({
        Canal: item.provider,
        "Data do Pedido": item.orderDate ?? "",
        Faturamento: item.totalWithFees,
        "ID da Venda": item.displayOrderId,
        "Lucro Total": item.totalProfitAmount ?? "",
        "Margem de Contribuição": item.contributionMarginPercent ?? "",
        SKUs: item.skus.join("\n"),
        Status: item.statusLabel,
      })),
    );
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, "Pedidos");

    return Buffer.from(write(workbook, { bookType: "xlsx", type: "buffer" }));
  }

  async getOrderDetails(
    authContext: TenantContext,
    orderRecordId: string,
  ): Promise<OrderDetails> {
    const companyId = this.requireSelectedCompanyId(authContext);
    const company = await this.db.query.companies.findFirst({
      where: (table) =>
        and(
          eq(table.id, companyId),
          eq(table.organizationId, authContext.organizationId),
        ),
    });
    const groupedDisplayOrderId =
      readMercadoLivreGroupedDisplayOrderId(orderRecordId);
    const rows = groupedDisplayOrderId
      ? await this.db.query.externalOrders.findMany({
          orderBy: (table) => [desc(table.orderedAt), desc(table.createdAt)],
          where: (table) =>
            and(
              eq(table.organizationId, authContext.organizationId),
              eq(table.companyId, companyId),
              eq(table.provider, "mercadolivre"),
              buildExactMercadoLivreGroupedOrderWhere(groupedDisplayOrderId),
            ),
          with: {
            fees: true,
            items: {
              with: {
                externalProduct: true,
              },
            },
          },
        })
      : await (async () => {
          const row = await this.db.query.externalOrders.findFirst({
            where: (table) =>
              and(
                eq(table.id, orderRecordId),
                eq(table.organizationId, authContext.organizationId),
                eq(table.companyId, companyId),
              ),
            with: {
              fees: true,
              items: {
                with: {
                  externalProduct: true,
                },
              },
            },
          });

          return row ? [row] : [];
        })();

    if (rows.length === 0) {
      throw new NotFoundException("Order not found.");
    }

    const operationBackfilledRows = await this.backfillMercadoLivreOperationIds(
      authContext,
      companyId,
      rows as OrderRowShallow[],
    );
    const shippingBillingBackfilledRows =
      await this.backfillMercadoLivreBillingShippingCosts(
        authContext,
        companyId,
        operationBackfilledRows,
      );
    const shippingBackfilledRows =
      await this.backfillMercadoLivreShippingRatios(
        authContext,
        companyId,
        shippingBillingBackfilledRows,
      );
    const hydratedRows = await this.hydrateLinkedProducts(
      authContext,
      companyId,
      shippingBackfilledRows,
    );
    const logicalOrders = buildLogicalOrders(
      hydratedRows,
      company?.taxRateDefault,
    );
    const logicalOrder = groupedDisplayOrderId
      ? (logicalOrders.find(
          (candidate) => candidate.order.id === orderRecordId,
        ) ?? null)
      : (logicalOrders[0] ?? null);

    if (!logicalOrder) {
      throw new NotFoundException("Order not found.");
    }

    return {
      composition: logicalOrder.composition,
      items: logicalOrder.items,
      order: logicalOrder.order,
      pendingFinancialFields:
        logicalOrder.composition.pendingFinancialFields ?? [],
      tags: logicalOrder.order.tags ?? [],
    };
  }

  async updateOrderComposition(
    authContext: TenantContext,
    orderRecordId: string,
    input: OrderCompositionUpdateInput,
  ): Promise<OrderDetails> {
    const companyId = this.requireSelectedCompanyId(authContext);
    const row = await this.db.query.externalOrders.findFirst({
      where: (table) =>
        and(
          eq(table.id, orderRecordId),
          eq(table.organizationId, authContext.organizationId),
          eq(table.companyId, companyId),
        ),
      with: {
        fees: true,
        items: {
          with: {
            externalProduct: true,
          },
        },
      },
    });

    if (!row) {
      throw new NotFoundException("Order not found.");
    }

    const metadata =
      row.metadata && typeof row.metadata === "object"
        ? { ...(row.metadata as Record<string, unknown>) }
        : {};
    const compositionOverrides: OrderCompositionOverrides = {
      marketplaceCommissionAmount: input.marketplaceCommissionAmount,
      packagingCostAmount: input.packagingCostAmount,
      productCostAmount: input.productCostAmount,
    };
    if (row.provider !== "mercadolivre") {
      compositionOverrides.refundBonusAmount = input.refundBonusAmount;
      compositionOverrides.shippingOrFixedFeeAmount =
        input.shippingOrFixedFeeAmount;
    }
    metadata.compositionOverrides = compositionOverrides;

    await this.db
      .update(externalOrders)
      .set({
        metadata,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(externalOrders.id, orderRecordId),
          eq(externalOrders.organizationId, authContext.organizationId),
          eq(externalOrders.companyId, companyId),
        ),
      )
      .returning({
        id: externalOrders.id,
      });

    return this.getOrderDetails(authContext, orderRecordId);
  }

  private async buildOrdersSummaryForFilters(
    authContext: TenantContext,
    companyId: string,
    taxRateDefault: string | number | null | undefined,
    filters: OrderListFilters,
  ) {
    const rows = await this.db.query.externalOrders.findMany({
      orderBy: (table) => [desc(table.orderedAt), desc(table.createdAt)],
      where: (table) =>
        and(
          eq(table.organizationId, authContext.organizationId),
          eq(table.companyId, companyId),
          ...(filters.saleId?.trim()
            ? [buildSaleIdWhere(filters.saleId.trim())]
            : []),
          ...(filters.sku?.trim() ? [buildSkuWhere(filters.sku.trim())] : []),
          ...(filters.provider ? [eq(table.provider, filters.provider)] : []),
        ),
      with: {
        fees: true,
        items: {
          with: {
            externalProduct: true,
          },
        },
      },
    });
    const hydratedRows = await this.hydrateLinkedProducts(
      authContext,
      companyId,
      rows as OrderRowShallow[],
    );
    const filteredLogicalOrders = buildLogicalOrders(
      hydratedRows,
      taxRateDefault,
    ).filter(({ order: listItem }) => {
      if (filters.search && !matchesOrderSearch(listItem, filters.search)) {
        return false;
      }

      if (filters.saleId && !matchesSaleIdFilter(listItem, filters.saleId)) {
        return false;
      }

      if (filters.sku && !matchesSkuFilter(listItem, filters.sku)) {
        return false;
      }

      if (filters.status && listItem.status !== filters.status) {
        return false;
      }

      if (
        (filters.orderedFrom || filters.orderedTo) &&
        !isOrderWithinRange(
          listItem.orderDate,
          filters.orderedFrom,
          filters.orderedTo,
        )
      ) {
        return false;
      }

      return true;
    });

    return buildOrdersSummary(filteredLogicalOrders);
  }

  private requireSelectedCompanyId(context: TenantContext) {
    if (!context.selectedCompanyId) {
      throw new BadRequestException("Selected company required.");
    }

    return context.selectedCompanyId;
  }

  private async hydrateLinkedProducts(
    authContext: TenantContext,
    companyId: string,
    rows: OrderRowShallow[],
  ): Promise<OrderRow[]> {
    const linkedProductIds = [
      ...new Set(
        rows
          .flatMap((row) =>
            row.items.map(
              (item) => item.externalProduct?.linkedProductId ?? null,
            ),
          )
          .filter((value): value is string => value !== null),
      ),
    ];
    const linkedProducts =
      linkedProductIds.length === 0
        ? []
        : await this.db.query.products.findMany({
            where: (table) =>
              and(
                eq(table.organizationId, authContext.organizationId),
                eq(table.companyId, companyId),
                inArray(table.id, linkedProductIds),
              ),
            with: {
              financeDefaults: true,
              images: true,
              productCosts: true,
            },
          });
    const linkedProductById = new Map(
      linkedProducts.map(
        (product) => [product.id, product as LinkedProductRecord] as const,
      ),
    );

    return rows.map((row) => ({
      ...row,
      items: row.items.map((item) => ({
        ...item,
        externalProduct: item.externalProduct
          ? {
              ...item.externalProduct,
              linkedProduct: item.externalProduct.linkedProductId
                ? (linkedProductById.get(
                    item.externalProduct.linkedProductId,
                  ) ?? null)
                : null,
            }
          : null,
      })),
    }));
  }

  private async backfillMercadoLivreOperationIds(
    authContext: TenantContext,
    companyId: string,
    rows: OrderRowShallow[],
  ): Promise<OrderRowShallow[]> {
    if (!this.env || rows.length === 0) {
      return rows;
    }

    const mercadoLivreRows = rows.filter(
      (row) =>
        row.provider === "mercadolivre" &&
        Boolean(row.orderedAt) &&
        !isSpreadsheetImportedOrder(row),
    );

    if (mercadoLivreRows.length === 0) {
      return rows;
    }

    const connections = await this.db.query.marketplaceConnections.findMany({
      where: (table) =>
        and(
          eq(table.organizationId, authContext.organizationId),
          eq(table.companyId, companyId),
          eq(table.provider, "mercadolivre"),
        ),
    });
    const connectionById = new Map(
      connections.map((connection) => [connection.id, connection] as const),
    );
    const fallbackConnection =
      connections.find(
        (connection) =>
          connection.provider === "mercadolivre" &&
          connection.status === "connected" &&
          Boolean(connection.accessToken),
      ) ?? null;
    const requests = new Map<
      string,
      {
        connection: MarketplaceConnection;
        orderIds: string[];
        periodKey: string;
      }
    >();
    const resolvedConnectionIdByRowId = new Map<string, string>();
    const buildRequests = (targets: OrderRowShallow[]) => {
      const nextRequests = new Map<
        string,
        {
          connection: MarketplaceConnection;
          orderIds: string[];
          periodKey: string;
        }
      >();

      for (const row of targets) {
        const connection =
          (row.marketplaceConnectionId
            ? connectionById.get(row.marketplaceConnectionId)
            : null) ?? fallbackConnection;
        if (
          !connection ||
          connection.provider !== "mercadolivre" ||
          connection.status !== "connected" ||
          !connection.accessToken
        ) {
          continue;
        }

        resolvedConnectionIdByRowId.set(row.id, connection.id);

        const periodKey = toBillingPeriodKey(row.orderedAt);
        if (!periodKey) {
          continue;
        }

        const requestKey = `${connection.id}:${periodKey}`;
        const current = nextRequests.get(requestKey);
        if (current) {
          current.orderIds.push(row.externalOrderId);
          continue;
        }

        nextRequests.set(requestKey, {
          connection,
          orderIds: [row.externalOrderId],
          periodKey,
        });
      }

      return nextRequests;
    };
    const persistRows = async (changedRows: OrderRowShallow[]) => {
      await Promise.all(
        changedRows.map((row) =>
          this.db
            .update(externalOrders)
            .set({
              marketplaceConnectionId:
                row.marketplaceConnectionId ??
                resolvedConnectionIdByRowId.get(row.id) ??
                null,
              metadata:
                row.metadata && typeof row.metadata === "object"
                  ? (row.metadata as Record<string, unknown>)
                  : {},
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(externalOrders.id, row.id),
                eq(externalOrders.organizationId, authContext.organizationId),
                eq(externalOrders.companyId, companyId),
              ),
            ),
        ),
      );
    };

    let updatedRows = rows;
    const packTargets = mercadoLivreRows.filter((row) =>
      shouldRefreshMercadoLivrePackId(row),
    );

    if (packTargets.length > 0) {
      const packRequests = buildRequests(packTargets);
      const packIdByOrderId = new Map<string, string>();

      for (const request of packRequests.values()) {
        const connection = await this.refreshMercadoLivreConnectionIfNeeded(
          request.connection,
        );
        let packIds = await this.fetchMercadoLivrePackIds({
          accessToken: connection.accessToken!,
          periodKey: request.periodKey,
          sellerAccountId: connection.externalAccountId,
        });
        const unresolvedOrderIds = request.orderIds.filter(
          (orderId) => !packIds.has(orderId),
        );
        if (unresolvedOrderIds.length > 0) {
          packIds = await this.fetchMercadoLivrePackIds({
            accessToken: connection.accessToken!,
            forceRefresh: true,
            periodKey: request.periodKey,
            sellerAccountId: connection.externalAccountId,
          });
        }

        for (const orderId of request.orderIds) {
          const packId = packIds.get(orderId);
          if (packId) {
            packIdByOrderId.set(orderId, packId);
          }
        }
      }

      if (packIdByOrderId.size > 0) {
        const changedRows: OrderRowShallow[] = [];
        updatedRows = updatedRows.map((row) => {
          const packId = packIdByOrderId.get(row.externalOrderId);
          if (!packId) {
            return row;
          }

          const metadata =
            row.metadata && typeof row.metadata === "object"
              ? { ...(row.metadata as Record<string, unknown>) }
              : {};
          metadata.packId = packId;

          const nextRow = {
            ...row,
            marketplaceConnectionId:
              row.marketplaceConnectionId ??
              resolvedConnectionIdByRowId.get(row.id) ??
              null,
            metadata,
          };
          changedRows.push(nextRow);
          return nextRow;
        });

        await persistRows(changedRows);
      }
    }

    const operationTargets = updatedRows.filter((row) => {
      if (row.provider !== "mercadolivre" || !row.orderedAt) {
        return false;
      }

      return (
        shouldRefreshMercadoLivrePackId(row) &&
        shouldRefreshMercadoLivreOperationId(row)
      );
    });

    if (operationTargets.length === 0) {
      return updatedRows;
    }

    const operationRequests = buildRequests(operationTargets);
    if (operationRequests.size === 0) {
      return updatedRows;
    }

    const operationIdByOrderId = new Map<string, string>();
    for (const request of operationRequests.values()) {
      const connection = await this.refreshMercadoLivreConnectionIfNeeded(
        request.connection,
      );
      let operationIds = await this.fetchMercadoLivreOperationIds({
        accessToken: connection.accessToken!,
        periodKey: request.periodKey,
      });
      const unresolvedOrderIds = request.orderIds.filter(
        (orderId) => !operationIds.has(orderId),
      );
      if (unresolvedOrderIds.length > 0) {
        operationIds = await this.fetchMercadoLivreOperationIds({
          accessToken: connection.accessToken!,
          forceRefresh: true,
          periodKey: request.periodKey,
        });
      }
      for (const orderId of request.orderIds) {
        const operationId = operationIds.get(orderId);
        if (operationId) {
          operationIdByOrderId.set(orderId, operationId);
        }
      }
    }

    if (operationIdByOrderId.size === 0) {
      return updatedRows;
    }

    const changedRows: OrderRowShallow[] = [];
    updatedRows = updatedRows.map((row) => {
      const operationId = operationIdByOrderId.get(row.externalOrderId);
      if (!operationId) {
        return row;
      }

      const metadata =
        row.metadata && typeof row.metadata === "object"
          ? { ...(row.metadata as Record<string, unknown>) }
          : {};
      metadata.operationId = operationId;

      const nextRow = {
        ...row,
        marketplaceConnectionId:
          row.marketplaceConnectionId ??
          resolvedConnectionIdByRowId.get(row.id) ??
          null,
        metadata,
      };
      changedRows.push(nextRow);
      return nextRow;
    });

    await persistRows(changedRows);

    return updatedRows;
  }

  private async backfillMercadoLivreShippingRatios(
    authContext: TenantContext,
    companyId: string,
    rows: OrderRowShallow[],
  ): Promise<OrderRowShallow[]> {
    if (!this.env || rows.length === 0) {
      return rows;
    }

    const targets = rows.filter((row) =>
      shouldRefreshMercadoLivreShippingRatio(row),
    );
    if (targets.length === 0) {
      return rows;
    }

    const connections = await this.db.query.marketplaceConnections.findMany({
      where: (table) =>
        and(
          eq(table.organizationId, authContext.organizationId),
          eq(table.companyId, companyId),
          eq(table.provider, "mercadolivre"),
        ),
    });
    const connectionById = new Map(
      connections.map((connection) => [connection.id, connection] as const),
    );
    const fallbackConnection =
      connections.find(
        (connection) =>
          connection.provider === "mercadolivre" &&
          connection.status === "connected" &&
          Boolean(connection.accessToken),
      ) ?? null;

    const refreshedConnectionById = new Map<string, MarketplaceConnection>();
    const getConnectionForRow = async (row: OrderRowShallow) => {
      const rawConnection =
        (row.marketplaceConnectionId
          ? connectionById.get(row.marketplaceConnectionId)
          : null) ?? fallbackConnection;
      if (
        !rawConnection ||
        rawConnection.provider !== "mercadolivre" ||
        rawConnection.status !== "connected" ||
        !rawConnection.accessToken
      ) {
        return null;
      }

      const cached = refreshedConnectionById.get(rawConnection.id);
      if (cached) {
        return cached;
      }

      const refreshed =
        await this.refreshMercadoLivreConnectionIfNeeded(rawConnection);
      refreshedConnectionById.set(rawConnection.id, refreshed);
      return refreshed;
    };

    const ratioByRowId = new Map<
      string,
      {
        buyerPaidAmount: number;
        grossTariffAmount: number;
        netAmount: number;
        shipmentId: string;
      }
    >();

    for (const row of targets) {
      const connection = await getConnectionForRow(row);
      if (!connection) {
        continue;
      }

      const shippingFee = row.fees.find(
        (fee) => fee.feeType === "shipping_cost",
      );
      if (!shippingFee) {
        continue;
      }

      const feeMetadata =
        shippingFee.metadata && typeof shippingFee.metadata === "object"
          ? { ...(shippingFee.metadata as Record<string, unknown>) }
          : {};
      let shipmentId = readMercadoLivreShipmentId(feeMetadata);
      if (!shipmentId) {
        shipmentId = await this.fetchMercadoLivreShipmentId({
          accessToken: connection.accessToken!,
          orderId: row.externalOrderId,
        });
      }

      if (!shipmentId) {
        continue;
      }

      const shipmentBreakdown = await this.fetchMercadoLivreShipmentBreakdown({
        accessToken: connection.accessToken!,
        sellerAccountId: connection.externalAccountId,
        shipmentId,
      });
      if (shipmentBreakdown === null) {
        continue;
      }

      const buyerPaidAmount = roundMoneyNumber(
        shipmentBreakdown.buyerPaidAmount,
      );
      const netAmount = roundMoneyNumber(shipmentBreakdown.sellerCostAmount);

      if (!shipmentBreakdown.sellerMatched) {
        this.logger.warn(
          `Shipment seller cost missing in /shipments/${shipmentId}/costs for seller ${connection.externalAccountId}. Using 0.`,
        );
      }

      ratioByRowId.set(row.id, {
        buyerPaidAmount,
        grossTariffAmount: shipmentBreakdown.sellerCostAmount,
        netAmount,
        shipmentId,
      });
    }

    if (ratioByRowId.size === 0) {
      return rows;
    }

    const updatedRows = await Promise.all(
      rows.map(async (row) => {
        const shippingRatio = ratioByRowId.get(row.id);
        if (!shippingRatio) {
          return row;
        }

        const nextFees = await Promise.all(
          row.fees.map(async (fee) => {
            if (fee.feeType !== "shipping_cost") {
              return fee;
            }

            const metadata =
              fee.metadata && typeof fee.metadata === "object"
                ? { ...(fee.metadata as Record<string, unknown>) }
                : {};
            delete metadata.listCostAmount;
            metadata.shipmentId = shippingRatio.shipmentId;
            delete metadata.mercadoLivreShippingBonusAmount;
            metadata.shipping_buyer_paid = toMoney(
              shippingRatio.buyerPaidAmount,
            );
            metadata.shipping_net_amount = toMoney(-shippingRatio.netAmount);
            metadata.shipping_seller_fee = toMoney(
              shippingRatio.grossTariffAmount,
            );
            metadata.source = "shipment_costs.senders";

            await this.db
              .update(externalFees)
              .set({
                amount: shippingRatio.netAmount.toFixed(2),
                metadata,
                updatedAt: new Date(),
              })
              .where(
                and(
                  eq(externalFees.id, fee.id),
                  eq(externalFees.organizationId, authContext.organizationId),
                ),
              );

            return {
              ...fee,
              amount: shippingRatio.netAmount.toFixed(2),
              metadata,
              updatedAt: new Date(),
            };
          }),
        );

        return {
          ...row,
          fees: nextFees,
        };
      }),
    );

    return updatedRows;
  }

  private async backfillMercadoLivreBillingShippingCosts(
    authContext: TenantContext,
    companyId: string,
    rows: OrderRowShallow[],
  ): Promise<OrderRowShallow[]> {
    if (!this.env || rows.length === 0) {
      return rows;
    }

    const targets = rows.filter((row) => {
      if (row.provider !== "mercadolivre") {
        return false;
      }

      if (isSpreadsheetImportedOrder(row)) {
        return false;
      }

      const shippingFee = row.fees.find(
        (fee) => fee.feeType === "shipping_cost",
      );
      if (!shippingFee) {
        return false;
      }

      const metadata =
        shippingFee.metadata && typeof shippingFee.metadata === "object"
          ? (shippingFee.metadata as Record<string, unknown>)
          : null;

      if (metadata?.source !== "billing/integration/group/ML/order/details") {
        return true;
      }

      return (
        readMetadataMoney(metadata, "shipping_buyer_paid") > 0 &&
        readMetadataMoney(metadata, "shipping_seller_fee") <= 0
      );
    });

    if (targets.length === 0) {
      return rows;
    }

    const connections = await this.db.query.marketplaceConnections.findMany({
      where: (table) =>
        and(
          eq(table.organizationId, authContext.organizationId),
          eq(table.companyId, companyId),
          eq(table.provider, "mercadolivre"),
        ),
    });
    const connectionById = new Map(
      connections.map((connection) => [connection.id, connection] as const),
    );
    const fallbackConnection =
      connections.find(
        (connection) =>
          connection.provider === "mercadolivre" &&
          connection.status === "connected" &&
          Boolean(connection.accessToken),
      ) ?? null;

    const refreshedConnectionById = new Map<string, MarketplaceConnection>();
    const getConnectionForRow = async (row: OrderRowShallow) => {
      const rawConnection =
        (row.marketplaceConnectionId
          ? connectionById.get(row.marketplaceConnectionId)
          : null) ?? fallbackConnection;
      if (
        !rawConnection ||
        rawConnection.provider !== "mercadolivre" ||
        rawConnection.status !== "connected" ||
        !rawConnection.accessToken
      ) {
        return null;
      }

      const cached = refreshedConnectionById.get(rawConnection.id);
      if (cached) {
        return cached;
      }

      const refreshed =
        await this.refreshMercadoLivreConnectionIfNeeded(rawConnection);
      refreshedConnectionById.set(rawConnection.id, refreshed);
      return refreshed;
    };

    const billingShippingByRowId = new Map<
      string,
      {
        amount: string;
        metadata: Record<string, unknown>;
        orderMetadata: Record<string, unknown> | null;
      }
    >();

    for (const row of targets) {
      const connection = await getConnectionForRow(row);
      if (!connection) {
        continue;
      }

      const shippingFee = row.fees.find(
        (fee) => fee.feeType === "shipping_cost",
      );
      if (!shippingFee) {
        continue;
      }

      const billingShippingCost =
        await this.fetchMercadoLivreBillingOrderShippingCost({
          accessToken: connection.accessToken!,
          orderId: row.externalOrderId,
        });

      if (!billingShippingCost) {
        continue;
      }

      const existingMetadata =
        shippingFee.metadata && typeof shippingFee.metadata === "object"
          ? { ...(shippingFee.metadata as Record<string, unknown>) }
          : {};
      const existingOrderMetadata =
        row.metadata && typeof row.metadata === "object"
          ? { ...(row.metadata as Record<string, unknown>) }
          : {};
      const mercadoLivreBillingTotalAmount = readMetadataMoneyString(
        (billingShippingCost.metadata ?? {}) as Record<string, unknown>,
        "mercadoLivreBillingTotalAmount",
      );

      billingShippingByRowId.set(row.id, {
        amount: billingShippingCost.amount.toFixed(2),
        metadata: {
          ...existingMetadata,
          ...billingShippingCost.metadata,
          shipmentId:
            readMercadoLivreShipmentId(existingMetadata) ??
            existingMetadata.shipmentId ??
            null,
          source: billingShippingCost.source,
        },
        orderMetadata: mercadoLivreBillingTotalAmount
          ? {
              ...existingOrderMetadata,
              mercadoLivreBillingTotalAmount,
            }
          : null,
      });
    }

    if (billingShippingByRowId.size === 0) {
      return rows;
    }

    const updatedRows = await Promise.all(
      rows.map(async (row) => {
        const billingShipping = billingShippingByRowId.get(row.id);
        if (!billingShipping) {
          return row;
        }

        const nextFees = await Promise.all(
          row.fees.map(async (fee) => {
            if (fee.feeType !== "shipping_cost") {
              return fee;
            }

            await this.db
              .update(externalFees)
              .set({
                amount: billingShipping.amount,
                metadata: billingShipping.metadata,
                updatedAt: new Date(),
              })
              .where(
                and(
                  eq(externalFees.id, fee.id),
                  eq(externalFees.organizationId, authContext.organizationId),
                ),
              );

            return {
              ...fee,
              amount: billingShipping.amount,
              metadata: billingShipping.metadata,
              updatedAt: new Date(),
            };
          }),
        );

        if (billingShipping.orderMetadata) {
          await this.db
            .update(externalOrders)
            .set({
              metadata: billingShipping.orderMetadata,
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(externalOrders.id, row.id),
                eq(externalOrders.organizationId, authContext.organizationId),
              ),
            );
        }

        return {
          ...row,
          fees: nextFees,
          metadata: billingShipping.orderMetadata ?? row.metadata,
        };
      }),
    );

    return updatedRows;
  }

  private async fetchMercadoLivrePackIds(input: {
    accessToken: string;
    forceRefresh?: boolean;
    periodKey: string;
    sellerAccountId: string | null;
  }) {
    if (!input.sellerAccountId) {
      return new Map<string, string>();
    }

    const range = toMercadoLivreSearchRange(input.periodKey);
    if (!range) {
      return new Map<string, string>();
    }

    const cacheKey = `${input.accessToken}:${input.sellerAccountId}:${input.periodKey}`;
    let cachedPromise = input.forceRefresh
      ? undefined
      : this.mercadoLivrePackIdCache.get(cacheKey);

    if (!cachedPromise) {
      cachedPromise = (async () => {
        const packIdMap = new Map<string, string>();
        const limit = 50;
        let offset = 0;
        let total = Number.POSITIVE_INFINITY;

        while (offset < total) {
          const url = new URL("https://api.mercadolibre.com/orders/search");
          url.searchParams.set("limit", String(limit));
          url.searchParams.set("offset", String(offset));
          url.searchParams.set("seller", input.sellerAccountId!);
          url.searchParams.set("sort", "date_desc");
          url.searchParams.set("order.date_created.from", range.from);
          url.searchParams.set("order.date_created.to", range.to);

          let response: Response | null = null;
          for (let attempt = 0; attempt < 3; attempt += 1) {
            response = await fetch(url, {
              headers: {
                Authorization: `Bearer ${input.accessToken}`,
                accept: "application/json",
              },
              method: "GET",
            });

            if (response.status !== 429 && response.status < 500) {
              break;
            }
          }

          if (!response?.ok) {
            return new Map<string, string>();
          }

          const contentType = response.headers.get("content-type") ?? "";
          if (!contentType.includes("application/json")) {
            return new Map<string, string>();
          }

          const payload = (await response.json()) as {
            paging?: {
              limit?: number;
              offset?: number;
              total?: number;
            };
            results?: Array<{
              id?: number | string;
              pack_id?: number | string;
            }>;
          };
          const pageResults = payload.results ?? [];

          for (const result of pageResults) {
            if (
              result.id === undefined ||
              result.id === null ||
              result.pack_id === undefined ||
              result.pack_id === null
            ) {
              continue;
            }

            packIdMap.set(String(result.id), String(result.pack_id));
          }

          total =
            typeof payload.paging?.total === "number" &&
            Number.isFinite(payload.paging.total)
              ? payload.paging.total
              : pageResults.length;
          const pageSize =
            typeof payload.paging?.limit === "number" &&
            Number.isFinite(payload.paging.limit) &&
            payload.paging.limit > 0
              ? payload.paging.limit
              : limit;
          offset += pageSize;

          if (pageResults.length === 0) {
            break;
          }
        }

        return packIdMap;
      })();

      this.mercadoLivrePackIdCache.set(cacheKey, cachedPromise);
    }

    return cachedPromise;
  }

  private async fetchMercadoLivreOperationIds(input: {
    accessToken: string;
    forceRefresh?: boolean;
    periodKey: string;
  }) {
    const cacheKey = `${input.accessToken}:${input.periodKey}`;
    let cachedPromise = input.forceRefresh
      ? undefined
      : this.billingOperationIdCache.get(cacheKey);

    if (!cachedPromise) {
      cachedPromise = (async () => {
        const operationIdMap = new Map<string, string>();
        let fetchedResultsCount = 0;
        let fromId = "0";

        while (true) {
          const url = new URL(
            `https://api.mercadolibre.com/billing/integration/periods/key/${encodeURIComponent(input.periodKey)}/group/MP/details`,
          );
          url.searchParams.set("document_type", "BILL");
          url.searchParams.set("limit", "1000");
          url.searchParams.set("from_id", fromId);

          let response: Response | null = null;
          for (let attempt = 0; attempt < 3; attempt += 1) {
            response = await fetch(url, {
              headers: {
                Authorization: `Bearer ${input.accessToken}`,
                accept: "application/json",
                "x-version": "2",
              },
              method: "GET",
            });

            if (response.status !== 429 && response.status < 500) {
              break;
            }
          }

          if (!response?.ok) {
            return new Map<string, string>();
          }

          const contentType = response.headers.get("content-type") ?? "";
          if (!contentType.includes("application/json")) {
            return new Map<string, string>();
          }

          const payload = (await response.json()) as {
            last_id?: number | string;
            results?: Array<{
              operation_id?: number | string;
              order_id?: number | string;
            }>;
            total?: number;
          };
          const pageResults = payload.results ?? [];
          fetchedResultsCount += pageResults.length;

          for (const result of pageResults) {
            if (
              result.order_id === undefined ||
              result.order_id === null ||
              result.operation_id === undefined ||
              result.operation_id === null
            ) {
              continue;
            }

            operationIdMap.set(
              String(result.order_id),
              String(result.operation_id),
            );
          }

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
            fetchedResultsCount < total;

          if (!hasMore) {
            return operationIdMap;
          }

          fromId = nextFromId;
        }
      })();

      this.billingOperationIdCache.set(cacheKey, cachedPromise);
    }

    return cachedPromise;
  }

  private async fetchMercadoLivreShipmentId(input: {
    accessToken: string;
    orderId: string;
  }) {
    const response = await fetch(
      `https://api.mercadolibre.com/orders/${encodeURIComponent(input.orderId)}`,
      {
        headers: {
          Authorization: `Bearer ${input.accessToken}`,
          accept: "application/json",
        },
        method: "GET",
      },
    );

    if (!response.ok) {
      return null;
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) {
      return null;
    }

    const payload = (await response.json()) as MercadoLivreOrderDetailResponse;
    const shipmentId = payload.shipping?.id;

    return shipmentId !== undefined && shipmentId !== null
      ? String(shipmentId)
      : null;
  }

  private async fetchMercadoLivreShipmentBreakdown(input: {
    accessToken: string;
    sellerAccountId: string | null;
    shipmentId: string;
  }): Promise<MercadoLivreShipmentSellerCost | null> {
    const response = await fetch(
      `https://api.mercadolibre.com/shipments/${encodeURIComponent(input.shipmentId)}/costs`,
      {
        headers: {
          Authorization: `Bearer ${input.accessToken}`,
          accept: "application/json",
          "x-format-new": "true",
        },
        method: "GET",
      },
    );

    if (!response.ok) {
      return null;
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) {
      return null;
    }

    const payload =
      (await response.json()) as MercadoLivreShipmentCostsResponse;
    const rawBuyerPaid = payload.receiver?.cost;
    const buyerPaid =
      typeof rawBuyerPaid === "number"
        ? rawBuyerPaid
        : typeof rawBuyerPaid === "string"
          ? Number(rawBuyerPaid)
          : 0;
    const matchedSender =
      input.sellerAccountId === null
        ? null
        : ((payload.senders ?? []).find(
            (sender) =>
              String(sender.user_id ?? "").trim() ===
              String(input.sellerAccountId ?? "").trim(),
          ) ?? null);
    const rawSellerCost = matchedSender?.cost;
    const sellerCost =
      typeof rawSellerCost === "number"
        ? rawSellerCost
        : typeof rawSellerCost === "string"
          ? Number(rawSellerCost)
          : 0;
    const normalizedSellerCost =
      Number.isFinite(sellerCost) && sellerCost > 0 ? sellerCost : 0;
    return {
      buyerPaidAmount:
        Number.isFinite(buyerPaid) && buyerPaid > 0 ? buyerPaid : 0,
      sellerCostAmount: normalizedSellerCost,
      sellerMatched: input.sellerAccountId !== null && matchedSender !== null,
      shipmentId: input.shipmentId,
      source: "shipment_costs.senders",
    };
  }

  private async fetchMercadoLivreBillingOrderShippingCost(input: {
    accessToken: string;
    orderId: string;
  }) {
    const cacheKey = `${input.accessToken}:${input.orderId}`;
    let payloadPromise = this.billingOrderShippingDetailCache.get(cacheKey);

    if (!payloadPromise) {
      payloadPromise = (async () => {
        const url = new URL(
          "https://api.mercadolibre.com/billing/integration/group/ML/order/details",
        );
        url.searchParams.set("order_ids", input.orderId);

        let response: Response | null = null;
        for (let attempt = 0; attempt < 3; attempt += 1) {
          response = await fetch(url, {
            headers: {
              Authorization: `Bearer ${input.accessToken}`,
              accept: "application/json",
              "x-version": "2",
            },
            method: "GET",
          });

          if (response.status !== 429 && response.status < 500) {
            break;
          }
        }

        if (!response?.ok) {
          return null;
        }

        const contentType = response.headers.get("content-type") ?? "";
        if (!contentType.includes("application/json")) {
          return null;
        }

        return (await response.json()) as MercadoLivreBillingOrderDetailsResponse;
      })();
      this.billingOrderShippingDetailCache.set(cacheKey, payloadPromise);
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

  private async refreshMercadoLivreConnectionIfNeeded(
    connection: MarketplaceConnection,
  ) {
    if (
      !this.env ||
      !connection.accessToken ||
      !isExpired(connection.tokenExpiresAt) ||
      !connection.refreshToken
    ) {
      return connection;
    }

    const provider = new MercadoLivreProvider(this.env);
    const refreshed = await provider.refreshAccessToken(connection);
    const updatedConnection = {
      ...connection,
      accessToken: refreshed.accessToken,
      refreshToken: refreshed.refreshToken,
      tokenExpiresAt: refreshed.tokenExpiresAt,
      updatedAt: new Date(),
    };

    await this.db
      .update(marketplaceConnections)
      .set({
        accessToken: refreshed.accessToken,
        refreshToken: refreshed.refreshToken,
        status: "connected",
        tokenExpiresAt: refreshed.tokenExpiresAt,
        updatedAt: updatedConnection.updatedAt,
      })
      .where(eq(marketplaceConnections.id, connection.id));

    return updatedConnection;
  }
}
