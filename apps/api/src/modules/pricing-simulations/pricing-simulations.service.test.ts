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
  const countWhere = vi.fn().mockResolvedValue([{ totalItems: 1 }]);
  const listOffset = vi.fn().mockResolvedValue([row]);
  const listLimit = vi.fn().mockReturnValue({ offset: listOffset });
  const listOrderBy = vi.fn().mockReturnValue({ limit: listLimit });
  const listWhere = vi.fn().mockReturnValue({ orderBy: listOrderBy });
  const countQuery = {
    from: vi.fn().mockReturnValue({ where: countWhere }),
  };
  const listQuery = {
    from: vi.fn().mockReturnValue({ where: listWhere }),
  };
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
    select: vi.fn().mockReturnValueOnce(countQuery).mockReturnValue(listQuery),
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

  it("lists a scoped page using the requested server-side ordering", async () => {
    const db = createDatabaseMock();
    const service = new PricingSimulationsService(db);

    const result = await service.list(context, {
      page: 2,
      pageSize: 10,
      sortBy: "grossProfit",
      sortDirection: "asc",
    });

    expect(result).toMatchObject({
      page: 2,
      pageSize: 10,
      totalItems: 1,
      totalPages: 1,
    });

    const selectMock = (db as unknown as { select: ReturnType<typeof vi.fn> })
      .select;
    const listQuery = selectMock.mock.results[1]?.value;
    const listWhere = listQuery.from.mock.results[0]?.value.where;
    const listOrderBy = listWhere.mock.results[0]?.value.orderBy;

    expect(listOrderBy).toHaveBeenCalledTimes(1);
  });

  it("returns an individual simulation through the same tenant scope", async () => {
    const db = createDatabaseMock();
    const service = new PricingSimulationsService(db);

    await expect(service.get(context, createRow().id)).resolves.toMatchObject({
      id: createRow().id,
      productIdentifier: "SKU-1",
    });
  });

  it("deletes deduplicated IDs in one scoped query", async () => {
    const db = createDatabaseMock();
    const service = new PricingSimulationsService(db);
    const simulationId = createRow().id;

    await expect(
      service.removeMany(context, [simulationId, simulationId]),
    ).resolves.toEqual({
      ids: [simulationId],
      totalDeleted: 1,
    });

    const deleteMock = (db as unknown as { delete: ReturnType<typeof vi.fn> })
      .delete;
    expect(deleteMock).toHaveBeenCalledTimes(1);
  });
});
