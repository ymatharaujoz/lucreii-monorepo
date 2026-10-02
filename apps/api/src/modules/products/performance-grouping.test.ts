import type {
  ProductListItem,
  ProductPerformanceListItem,
} from "@lucreii/types";
import { describe, expect, it } from "vitest";
import { groupPerformanceRows } from "./performance-grouping";

function buildRow(
  overrides: Partial<ProductPerformanceListItem> = {},
): ProductPerformanceListItem {
  return {
    actualRoas: null,
    adSpend: 0,
    advertisingCost: 0,
    catalogGroupKey: null,
    catalogRole: "standalone",
    channelLabel: "mercadolivre",
    children: [],
    commissionPct: 10,
    contributionMarginRatio: null,
    coverImageUrl: null,
    displayName: "Produto",
    id: "product_1",
    isActive: true,
    isSyntheticParent: false,
    minimumRoas: null,
    name: "Produto",
    netLiquidSales: 0,
    packagingCost: 2,
    parentProductId: null,
    performanceId: "perf_1",
    productId: "product_1",
    referenceMonth: "2026-06-01",
    returns: 0,
    revenue: 0,
    roiRatio: null,
    sales: 0,
    sellingPrice: 0,
    shipping: 0,
    sku: "SKU-1",
    taxPct: 10,
    totalCommission: 0,
    totalPackagingCost: 0,
    totalProductCost: 0,
    totalProfit: 0,
    unitCost: 10,
    unitProfit: null,
    variationLabel: null,
    ...overrides,
  };
}

const syntheticParent = {
  children: [],
  coverImageUrl: "https://example.com/pai.png",
  id: "synthetic-parent:mercadolivre:MLB1",
  isSyntheticParent: true,
  name: "Suporte Teclado",
  sku: "ML-MLB1",
} as unknown as ProductListItem;

const white = buildRow({
  catalogGroupKey: "mercadolivre:MLB1",
  catalogRole: "child",
  id: "product_white",
  netLiquidSales: 25,
  parentProductId: syntheticParent.id,
  performanceId: "perf_white",
  productId: "product_white",
  returns: 0,
  revenue: 500,
  sales: 25,
  sellingPrice: 20,
  sku: "Suporte 02 Branco",
  totalCommission: 50,
  totalProductCost: 250,
  totalProfit: 200,
  variationLabel: "Cor: Branco",
});
const black = buildRow({
  catalogGroupKey: "mercadolivre:MLB1",
  catalogRole: "child",
  id: "product_black",
  netLiquidSales: 50,
  parentProductId: syntheticParent.id,
  performanceId: "perf_black",
  productId: "product_black",
  returns: 2,
  revenue: 1000,
  sales: 52,
  sellingPrice: 20,
  sku: "Suporte 02 Preto",
  totalCommission: 100,
  totalProductCost: 500,
  totalProfit: 350,
  variationLabel: "Cor: Preto",
});

describe("groupPerformanceRows", () => {
  it("collapses variations of the same listing into one parent row with summed metrics", () => {
    const [parent, ...rest] = groupPerformanceRows([black, white], [
      syntheticParent,
    ]);

    expect(rest).toHaveLength(0);
    expect(parent).toMatchObject({
      catalogRole: "parent",
      channelLabel: "mercadolivre",
      id: syntheticParent.id,
      isSyntheticParent: true,
      name: "Suporte Teclado",
      netLiquidSales: 75,
      productId: null,
      returns: 2,
      revenue: 1500,
      sales: 77,
      sku: "ML-MLB1",
      totalProfit: 550,
      variationLabel: null,
    });
    expect(parent!.children.map((child) => child.variationLabel)).toEqual([
      "Cor: Branco",
      "Cor: Preto",
    ]);
    // revenue-weighted margin, not an average of child margins
    expect(parent!.contributionMarginRatio).toBeCloseTo((550 / 1500) * 100);
    // web shows sellingPrice * sales as revenue
    expect(parent!.sellingPrice * parent!.sales).toBeCloseTo(
      20 * 25 + 20 * 52,
    );
  });

  it("keeps standalone rows and single-variation groups untouched", () => {
    const standalone = buildRow({ performanceId: "perf_alone" });
    const lonely = buildRow({
      catalogGroupKey: "mercadolivre:MLB2",
      performanceId: "perf_lonely",
    });

    expect(
      groupPerformanceRows([standalone, lonely], [syntheticParent]),
    ).toEqual([standalone, lonely]);
  });

  it("does not merge variations from different channels or months", () => {
    const otherMonth = { ...white, referenceMonth: "2026-05-01" };

    const grouped = groupPerformanceRows([white, otherMonth, black], [
      syntheticParent,
    ]);

    expect(grouped).toHaveLength(2);
    expect(grouped[0]!.children).toHaveLength(2);
    expect(grouped[1]).toBe(otherMonth);
  });

  it("keeps the position of the first group member among other rows", () => {
    const standalone = buildRow({ performanceId: "perf_alone" });

    const grouped = groupPerformanceRows([white, standalone, black], [
      syntheticParent,
    ]);

    expect(grouped.map((row) => row.performanceId)).toEqual([
      "group:mercadolivre:MLB1::mercadolivre::2026-06-01",
      "perf_alone",
    ]);
  });
});
