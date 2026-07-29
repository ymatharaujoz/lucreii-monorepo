import { describe, expect, it } from "vitest";
import {
  areOrderRowsFinanciallyEligible,
  isFinanciallyEligibleOrder,
  normalizeOrderStatus,
} from "./order-financial-eligibility";

function buildOrder(
  overrides: Partial<{
    metadata: Record<string, unknown>;
    provider: string;
    status: string;
    items: Array<{ metadata?: Record<string, unknown> }>;
  }> = {},
) {
  return {
    metadata: {},
    provider: "mercadolivre",
    status: "paid",
    ...overrides,
  };
}

describe("order financial eligibility", () => {
  it.each([
    ["paid", "paid"],
    ["delivered", "paid"],
    ["Pagamento aprovado", "paid"],
    ["Entregue", "paid"],
    ["partially_refunded", "partially_refunded"],
  ])("normalizes %s as %s", (status, expected) => {
    expect(normalizeOrderStatus("mercadolivre", status, {})).toBe(expected);
  });

  it.each([
    "confirmed",
    "payment_required",
    "payment_in_process",
    "partially_paid",
    "pending_cancel",
    "cancelled",
    "UNKNOWN",
  ])("excludes non-settled status %s", (status) => {
    expect(isFinanciallyEligibleOrder(buildOrder({ status }))).toBe(false);
  });

  it("keeps financial partial refunds without physical-return markers", () => {
    expect(
      isFinanciallyEligibleOrder(
        buildOrder({
          metadata: { refunded: true },
          status: "paid",
        }),
      ),
    ).toBe(true);
    expect(isFinanciallyEligibleOrder(buildOrder({ status: "partially_refunded" }))).toBe(
      true,
    );
  });

  it.each([
    { metadata: { returned: true }, status: "paid" },
    { metadata: { returnQuantityBySku: { "SKU-1": 1 } }, status: "paid" },
    { metadata: { sourceStatus: "Devolução concluída" }, status: "paid" },
    { metadata: { tags: ["return_pending"] }, status: "paid" },
    { metadata: {}, status: "cancelled" },
    { metadata: { sourceStatus: "Cancelado" }, status: "paid" },
    { metadata: { paid: false }, status: "ready_to_ship" },
  ])("excludes return/cancellation marker %j", (order) => {
    expect(isFinanciallyEligibleOrder(buildOrder(order))).toBe(false);
  });

  it("excludes positive return quantity carried by item metadata", () => {
    expect(
      isFinanciallyEligibleOrder(
        buildOrder({ items: [{ metadata: { returnQuantity: 1 } }] }),
      ),
    ).toBe(false);
  });

  it("requires every row in a grouped logical order to be eligible", () => {
    expect(
      areOrderRowsFinanciallyEligible([
        buildOrder({ status: "paid" }),
        buildOrder({ status: "delivered" }),
      ]),
    ).toBe(true);
    expect(
      areOrderRowsFinanciallyEligible([
        buildOrder({ status: "paid" }),
        buildOrder({ status: "cancelled" }),
      ]),
    ).toBe(false);
  });
});
