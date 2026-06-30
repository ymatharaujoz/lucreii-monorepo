import { describe, expect, it } from "vitest";
import { deriveRowFinancials } from "./product-insights";
import type { ProductMonthlyPerformanceDisplayRow } from "@lucreii/types";

function buildRow(
  overrides: Partial<ProductMonthlyPerformanceDisplayRow> = {},
): ProductMonthlyPerformanceDisplayRow {
  return {
    advertisingCost: "0.00",
    channel: "mercadolivre",
    commissionRate: "0.135000",
    fixedFeeUnit: "24.65",
    id: "perf_1",
    marketplaceCommission: "27.00",
    marketplaceCommissionUnit: "27.00",
    packagingCost: "1.50",
    productId: null,
    productName: "Produto Exemplo",
    referenceMonth: "2026-05-01",
    returnsQuantity: 0,
    salePrice: "200.00",
    salesQuantity: 1,
    shippingFee: "0.00",
    shippingOrFixedFeeUnit: "24.65",
    sku: "SKU-1",
    unitCost: "50.00",
    ...overrides,
  };
}

describe("deriveRowFinancials", () => {
  it("uses the resolved fixed fee and tax rate when calculating contribution margin", () => {
    const result = deriveRowFinancials(buildRow(), 0.1);

    expect(result.totalProfit).toBeCloseTo(76.85, 6);
    expect(result.contributionMarginRatio).toBeCloseTo(38.425, 6);
    expect(result.minimumRoas).toBeCloseTo(2.602472, 6);
  });

  it("returns no contribution margin when sales or price are missing", () => {
    const zeroSales = deriveRowFinancials(
      buildRow({
        salesQuantity: 0,
      }),
      0.1,
    );
    const zeroPrice = deriveRowFinancials(
      buildRow({
        salePrice: "0.00",
      }),
      0.1,
    );

    expect(zeroSales.contributionMarginRatio).toBeNull();
    expect(zeroPrice.contributionMarginRatio).toBeNull();
  });
});
