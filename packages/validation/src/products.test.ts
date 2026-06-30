import { describe, expect, it } from "vitest";
import {
  productPerformanceListQuerySchema,
  productCatalogExportQuerySchema,
  productImportRowSchema,
  productManualCreateSchema,
  productPerformanceListResponseSchema,
  productSpreadsheetUpdateRowSchema,
} from "./products";

describe("@lucreii/validation product schemas", () => {
  it("accepts manual product creation without tax rate", () => {
    const result = productManualCreateSchema.safeParse({
      initialFinance: {
        packagingCost: "3.00",
        unitCost: "80.00",
      },
      product: {
        isActive: true,
        name: "Kit Mercado Livre",
        sellingPrice: "149.90",
        sku: "ML-001",
      },
    });

    expect(result.success).toBe(true);
  });

  it("accepts product import rows without IMPOSTO column", () => {
    const result = productImportRowSchema.safeParse({
      EMBALAGEM: 3,
      "CUSTO UNITÁRIO": 80,
      "PREÇO DE VENDA": 149.9,
      PRODUTO: "Kit Mercado Livre",
      SKU: "ML-001",
      STATUS: 1,
    });

    expect(result.success).toBe(true);
  });

  it("accepts spreadsheet update rows with optional empty finance fields", () => {
    const result = productSpreadsheetUpdateRowSchema.safeParse({
      EMBALAGEM: "",
      ID: "550e8400-e29b-41d4-a716-446655440000",
    });

    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      EMBALAGEM: undefined,
      ID: "550e8400-e29b-41d4-a716-446655440000",
    });
  });

  it("parses export query marketplaces from comma separated string", () => {
    const result = productCatalogExportQuerySchema.safeParse({
      marketplaces: "mercadolivre,shopee",
      search: " kit ",
    });

    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      marketplaces: ["mercadolivre", "shopee"],
      search: "kit",
    });
  });

  it("parses performance list query with pagination and ordering", () => {
    const result = productPerformanceListQuerySchema.safeParse({
      marketplaces: "mercadolivre,shopee",
      page: "2",
      pageSize: "25",
      referenceMonth: "2026-06-01",
      search: " kit ",
      sortBy: "totalProfit",
      sortDirection: "desc",
    });

    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      marketplaces: ["mercadolivre", "shopee"],
      page: 2,
      pageSize: 25,
      referenceMonth: "2026-06-01",
      search: "kit",
      sortBy: "totalProfit",
      sortDirection: "desc",
    });
  });

  it("accepts paginated performance list responses", () => {
    const result = productPerformanceListResponseSchema.safeParse({
      items: [
        {
          actualRoas: 2.5,
          adSpend: 10,
          advertisingCost: 10,
          catalogGroupKey: null,
          catalogRole: "standalone",
          channelLabel: "mercadolivre",
          children: [],
          commissionPct: 10,
          contributionMarginRatio: 0.22,
          coverImageUrl: null,
          displayName: "Kit",
          fixedFeeUnit: 0,
          id: "perf_1",
          isActive: true,
          isSyntheticParent: false,
          marketplaceCommissionUnit: 10,
          minimumRoas: 4.5,
          name: "Kit",
          netLiquidSales: 2,
          packagingCost: 3,
          parentProductId: null,
          performanceId: "perf_1",
          productId: "550e8400-e29b-41d4-a716-446655440000",
          referenceMonth: "2026-06-01",
          returns: 0,
          revenue: 200,
          roiRatio: 0.4,
          sales: 2,
          sellingPrice: 100,
          shipping: 5,
          shippingOrFixedFeeSource: "shipping",
          shippingOrFixedFeeUnit: 5,
          shippingUnit: 5,
          sku: "KIT-1",
          taxPct: 12,
          totalCommission: 20,
          totalPackagingCost: 6,
          totalProductCost: 100,
          totalProfit: 44,
          unitCost: 50,
          unitProfit: 22,
          variationLabel: null,
        },
      ],
      page: 1,
      pageSize: 10,
      totalItems: 1,
      totalPages: 1,
    });

    expect(result.success).toBe(true);
  });

  it("rejects spreadsheet update rows with non-numeric EMBALAGEM using a friendly message", () => {
    const result = productSpreadsheetUpdateRowSchema.safeParse({
      ID: "550e8400-e29b-41d4-a716-446655440000",
      EMBALAGEM: "abc",
    });

    expect(result.success).toBe(false);
    const issue = result.error!.issues.find(
      (current) => current.path.join(".") === "EMBALAGEM",
    );
    expect(issue?.message).toBe("Embalagem deve ser um número válido");
  });

  it("rejects spreadsheet update rows with negative EMBALAGEM using a friendly message", () => {
    const result = productSpreadsheetUpdateRowSchema.safeParse({
      ID: "550e8400-e29b-41d4-a716-446655440000",
      EMBALAGEM: -1,
    });

    expect(result.success).toBe(false);
    const issue = result.error!.issues.find(
      (current) => current.path.join(".") === "EMBALAGEM",
    );
    expect(issue?.message).toBe("Embalagem deve ser maior ou igual a zero");
  });

  it("rejects spreadsheet update rows with invalid UUID using a friendly message", () => {
    const result = productSpreadsheetUpdateRowSchema.safeParse({
      ID: "not-a-uuid",
      EMBALAGEM: 1,
    });

    expect(result.success).toBe(false);
    const issue = result.error!.issues.find(
      (current) => current.path.join(".") === "ID",
    );
    expect(issue?.message).toBe("ID deve ser um identificador válido (UUID)");
  });

  it("rejects product import rows with invalid STATUS using a friendly message", () => {
    const result = productImportRowSchema.safeParse({
      EMBALAGEM: 1,
      "CUSTO UNITÁRIO": 10,
      "PREÇO DE VENDA": 100,
      PRODUTO: "Teste",
      SKU: "SKU-1",
      STATUS: 5,
    });

    expect(result.success).toBe(false);
    const issue = result.error!.issues.find(
      (current) => current.path.join(".") === "STATUS",
    );
    expect(issue?.message).toBe(
      "STATUS deve ser 0 (inativo) ou 1 (ativo)",
    );
  });
});
