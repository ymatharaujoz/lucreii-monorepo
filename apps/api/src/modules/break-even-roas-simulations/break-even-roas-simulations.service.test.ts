import { describe, expect, it, vi } from "vitest";
import type { DatabaseClient } from "@lucreii/database";
import { BreakEvenRoasSimulationsService } from "./break-even-roas-simulations.service";

const companyId = "11111111-1111-4111-8111-111111111111";
const simulationId = "22222222-2222-4222-8222-222222222222";
const context = {
  organizationId: "org_123",
  selectedCompanyId: companyId,
  userId: "user_123",
};
const input = {
  contributionMarginRate: "0.150000",
  productIdentifier: "CAM-01",
};

function createRow() {
  return {
    breakEvenRoas: "6.666667",
    calculationVersion: "1",
    companyId,
    contributionMarginRate: "0.150000",
    createdAt: new Date("2026-08-19T12:00:00.000Z"),
    id: simulationId,
    organizationId: "org_123",
    productIdentifier: "CAM-01",
    updatedAt: new Date("2026-08-19T12:00:00.000Z"),
    userId: "user_123",
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
  const db = {
    delete: vi.fn().mockReturnValue({
      returning,
      where: vi.fn().mockReturnThis(),
    }),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({ returning }),
    }),
    query: {
      breakEvenRoasSimulations: {
        findFirst: vi.fn().mockResolvedValue(row),
      },
      companies: {
        findFirst: vi.fn().mockResolvedValue({ id: companyId }),
      },
    },
    select: vi
      .fn()
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({ where: countWhere }),
      })
      .mockReturnValue({
        from: vi.fn().mockReturnValue({ where: listWhere }),
      }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({ returning }),
    }),
  };

  return db as unknown as DatabaseClient;
}

describe("BreakEvenRoasSimulationsService", () => {
  it("normalizes the margin and stores the calculated ROAS", async () => {
    const db = createDatabaseMock();
    const service = new BreakEvenRoasSimulationsService(db);

    const result = await service.create(context, input);
    const insertMock = db as unknown as { insert: ReturnType<typeof vi.fn> };
    const values =
      insertMock.insert.mock.results[0]?.value.values.mock.calls[0]?.[0];

    expect(result.breakEvenRoas).toBe("6.666667");
    expect(values).toEqual(
      expect.objectContaining({
        breakEvenRoas: "6.666667",
        contributionMarginRate: "0.150000",
        productIdentifier: "CAM-01",
      }),
    );
  });

  it("lists using the requested server-side ordering", async () => {
    const db = createDatabaseMock();
    const service = new BreakEvenRoasSimulationsService(db);

    await expect(
      service.list(context, {
        page: 2,
        pageSize: 10,
        sortBy: "breakEvenRoas",
        sortDirection: "asc",
      }),
    ).resolves.toMatchObject({ page: 2, totalItems: 1 });
  });

  it("deduplicates IDs and executes one scoped bulk delete", async () => {
    const db = createDatabaseMock();
    const service = new BreakEvenRoasSimulationsService(db);

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
