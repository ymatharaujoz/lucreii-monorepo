import type { ExternalOrder } from "@lucreii/database";
import type { OrderCanonicalStatus } from "@lucreii/types";

const CANONICAL_STATUS_SET = new Set<OrderCanonicalStatus>([
  "confirmed",
  "payment_required",
  "payment_in_process",
  "partially_paid",
  "paid",
  "partially_refunded",
  "pending_cancel",
  "cancelled",
]);

export type FinancialEligibilityOrder = Pick<
  ExternalOrder,
  "metadata" | "provider" | "status"
> & {
  items?: ReadonlyArray<unknown>;
};

function normalizeStatusSignal(value: unknown) {
  return (typeof value === "string" ? value : "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function readMetadata(order: FinancialEligibilityOrder) {
  return order.metadata && typeof order.metadata === "object"
    ? order.metadata
    : {};
}

function readStatusSignals(order: FinancialEligibilityOrder) {
  const metadata = readMetadata(order);
  const tags = Array.isArray(metadata.tags)
    ? metadata.tags.filter((tag): tag is string => typeof tag === "string")
    : [];
  const signals = [
    order.status,
    metadata.sourceStatus,
    metadata.status,
    metadata.status_detail,
    ...tags,
  ];

  return signals
    .filter((signal): signal is string => typeof signal === "string")
    .map(normalizeStatusSignal);
}

function hasPositiveReturnQuantity(value: unknown) {
  if (typeof value === "number") {
    return Number.isFinite(value) && value > 0;
  }

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  return Object.values(value).some(
    (quantity) =>
      typeof quantity === "number" && Number.isFinite(quantity) && quantity > 0,
  );
}

export function hasOrderCancellationMarker(order: FinancialEligibilityOrder) {
  const metadata = readMetadata(order);

  return (
    metadata.cancelled === true ||
    metadata.canceled === true ||
    readStatusSignals(order).some((signal) => signal.includes("cancel"))
  );
}

export function hasOrderReturnMarker(order: FinancialEligibilityOrder) {
  const metadata = readMetadata(order);

  if (
    metadata.returned === true ||
    hasPositiveReturnQuantity(metadata.returnQuantityBySku)
  ) {
    return true;
  }

  if (order.items) {
    for (const item of order.items) {
      if (!item || typeof item !== "object" || !("metadata" in item)) {
        continue;
      }

      const itemMetadata = item.metadata;
      if (
        itemMetadata &&
        typeof itemMetadata === "object" &&
        "returnQuantity" in itemMetadata &&
        hasPositiveReturnQuantity(itemMetadata.returnQuantity)
      ) {
        return true;
      }
    }
  }

  return readStatusSignals(order).some(
    (signal) => signal.includes("return") || signal.includes("devol"),
  );
}

export function normalizeOrderStatus(
  provider: string,
  status: string,
  metadata: Record<string, unknown>,
): OrderCanonicalStatus {
  const normalized = normalizeStatusSignal(status);
  const detail = normalizeStatusSignal(String(metadata.status_detail ?? ""));
  const returned =
    metadata.returned === true ||
    metadata.refunded === true ||
    detail.includes("refund") ||
    detail.includes("reembols") ||
    detail.includes("return") ||
    detail.includes("devol");

  if (
    returned ||
    normalized.includes("refund") ||
    normalized.includes("reembols") ||
    normalized.includes("devol")
  ) {
    return "partially_refunded";
  }

  if (CANONICAL_STATUS_SET.has(normalized as OrderCanonicalStatus)) {
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
    normalized.includes("entreg") ||
    normalized.includes("ship")
  ) {
    return "paid";
  }

  if (
    ["payment_required", "unpaid", "pending"].includes(normalized) ||
    normalized.includes("pagamento obrig") ||
    normalized.includes("nao pago") ||
    normalized.includes("nao recebido")
  ) {
    return "payment_required";
  }

  if (
    ["payment_in_process", "processing_payment"].includes(normalized) ||
    normalized.includes("payment processing") ||
    normalized.includes("pagamento em processamento")
  ) {
    return "payment_in_process";
  }

  if (normalized === "partially_paid" || normalized.includes("pagamento parcial")) {
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

  if (
    ["confirmed", "created"].includes(normalized) ||
    normalized.includes("confirm") ||
    normalized.includes("criad")
  ) {
    return "confirmed";
  }

  if (
    normalized.includes("paid") ||
    normalized.includes("approved") ||
    normalized.includes("aprovad") ||
    normalized.includes("pago")
  ) {
    return "paid";
  }

  return "confirmed";
}

export function isFinanciallyEligibleOrder(order: FinancialEligibilityOrder) {
  const metadata = readMetadata(order);

  if (
    metadata.paid === false ||
    hasOrderCancellationMarker(order) ||
    hasOrderReturnMarker(order)
  ) {
    return false;
  }

  const canonicalStatus = normalizeOrderStatus(
    order.provider,
    order.status,
    metadata,
  );

  return canonicalStatus === "paid" || canonicalStatus === "partially_refunded";
}

export function areOrderRowsFinanciallyEligible(
  rows: readonly FinancialEligibilityOrder[],
) {
  return rows.length > 0 && rows.every(isFinanciallyEligibleOrder);
}
