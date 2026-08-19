import { describe, expect, it, vi } from "vitest";
import type { DatabaseClient } from "@lucreii/database";
import { PricingSimulationsService } from "./pricing-simulations.service";

const companyId = "11111111-1111-4111-8111-111111111111";

const context = {
  organizationId: "org_123",
  selectedCompanyId: companyId,
  userId: "user_123",
};

const input = {
  affiliateCommissionRate: "0.080000",
  marketplaceCommissionRate: "0.120000",
  mode: "contribution-margin" as const,
  otherFixedCosts: "1.000000",
  otherVariableCostRate: "0.000000",
  packagingCost: "0.500000",
  productCost: "2.140000",
  productIdentifier: "SKU-1",
  shippingFee: "6.550000",
  storeCouponRate: "0.030000",
  target: "0.360000",
  taxRate: "0.040000",
};

function createRow() {
  return {
    affiliateCommissionRate: "0.080000",
    calculationVersion: "1",
    companyId,
    contributionMargin: "0.360000",
    createdAt: new Date("2026-08-19T12:00:00.000Z"),
    fixedCostsTotal: "10.190000",
    grossProfit: "9.914400",
    id: "22222222-2222-4222-8222-222222222222",
    marketplaceCommissionRate: "0.120000",
    mode: "contribution-margin",
    organizationId: "org_123",
    otherFixedCosts: "1.000000",
    otherVariableCostRate: "0.000000",
    packagingCost: "0.500000",
    productCost: "2.140000",
    productIdentifier: "SKU-1",
    recommendedSalePrice: "27.540000",
    shippingFee: "6.550000",
    storeCouponRate: "0.030000",
    target: "0.360000",
    taxRate: "0.040000",
    updatedAt: new Date("2026-08-19T12:00:00.000Z"),
    userId: "user_123",
    variableRatesTotal: "0.270000",
  };
}

function createDatabaseMock() {
  const row = createRow();
  const returning = vi.fn().mockResolvedValue([row]);
  const db = {
    delete: vi.fn().mockReturnValue({
      returning,
      where: vi.fn().mockReturnThis(),
    }),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({ returning }),
    }),
    query: {
      companies: {
        findFirst: vi.fn().mockResolvedValue({ id: companyId }),
      },
      pricingSimulations: {
        findFirst: vi.fn().mockResolvedValue(row),
        findMany: vi.fn().mockResolvedValue([row]),
      },
    },
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ totalItems: 1 }]),
      }),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({ returning }),
    }),
  };

  return db as unknown as DatabaseClient;
}

describe("PricingSimulationsService", () => {
  it("calculates and stores a complete snapshot", async () => {
    const db = createDatabaseMock();
    const service = new PricingSimulationsService(db);

    const result = await service.create(context, input);
    const insertMock = db as unknown as {
      insert: ReturnType<typeof vi.fn>;
    };
    const values =
      insertMock.insert.mock.results[0]?.value.values.mock.calls[0]?.[0];

    expect(result.recommendedSalePrice).toBe("27.540000");
    expect(result.contributionMargin).toBe("0.360000");
    expect(values).toEqual(
      expect.objectContaining({
        calculationVersion: "1",
        companyId,
        productIdentifier: "SKU-1",
        recommendedSalePrice: "27.540541",
        target: "0.360000",
      }),
    );
  });

  it("rejects a denominator that cannot produce a valid price", async () => {
    const db = createDatabaseMock();
    const service = new PricingSimulationsService(db);

    await expect(
      service.create(context, {
        ...input,
        marketplaceCommissionRate: "1.000000",
      }),
    ).rejects.toThrow("A soma da margem e dos custos percentuais");
  });
});
