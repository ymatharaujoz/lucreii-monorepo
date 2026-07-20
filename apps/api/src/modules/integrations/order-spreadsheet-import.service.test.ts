import { existsSync, readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  externalFees,
  externalOrderItems,
  externalOrders,
  externalProducts,
} from "@lucreii/database";
import { utils, write } from "xlsx";
import {
  OrderSpreadsheetImportService,
  parseMercadoLivreSpreadsheet,
} from "./order-spreadsheet-import.service";

const statuses = [
  "Entregue",
  "Venda entregue",
  "Mediação finalizada. Te demos o dinheiro.",
  "Devolução solicitada",
  "Devolução concluída",
  "Reembolso parcial",
  "Reembolso total",
  "Mediação com reembolso",
  "Atraso na entrega",
  "Pacote não entregue",
  "Cancelada pelo comprador",
  "Pacote cancelado pelo Mercado Livre",
  "Pacote de 2 produtos",
];

function makeWorkbookBuffer(rows: unknown[][]) {
  const sheet = utils.aoa_to_sheet([
    ["Relatório de vendas exportado pelo marketplace"],
    ["Período: histórico completo"],
    [],
    ["Não altere este arquivo"],
    [],
    [
      "N.º de venda",
      "Estado",
      "Data da venda",
      "Total (BRL)",
      "Título do anúncio",
      "SKU",
      "Preço unitário de venda do anúncio (BRL)",
      "Unidades",
      "Tarifa de venda e impostos (BRL)",
      "Descontos e bônus",
      "Tarifas de envio (BRL)",
      "Receita por envio (BRL)",
      "Receita por produtos (BRL)",
    ],
    ...rows,
  ]);
  const workbook = utils.book_new();
  utils.book_append_sheet(workbook, sheet, "Vendas");
  return Buffer.from(write(workbook, { bookType: "xlsx", type: "buffer" }));
}

function createPersistenceDb(connection: unknown) {
  const orderInsert = {
    onConflictDoUpdate: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([{ id: "order-db-id" }]),
    values: vi.fn().mockReturnThis(),
  };
  const productInsert = {
    onConflictDoUpdate: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([{ id: "product-db-id" }]),
    values: vi.fn().mockReturnThis(),
  };
  const itemInsert = { values: vi.fn().mockResolvedValue(undefined) };
  const feeInsert = { values: vi.fn().mockResolvedValue(undefined) };
  const tx = {
    delete: vi.fn(() => ({ where: vi.fn().mockResolvedValue(undefined) })),
    insert: vi.fn((table: unknown) => {
      if (table === externalOrders) return orderInsert;
      if (table === externalProducts) return productInsert;
      if (table === externalOrderItems) return itemInsert;
      if (table === externalFees) return feeInsert;
      throw new Error("Unexpected insert table");
    }),
    query: {
      externalOrders: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
    },
  };
  return {
    db: {
      query: {
        marketplaceConnections: {
          findFirst: vi.fn().mockResolvedValue(connection),
        },
      },
      transaction: vi.fn(async (callback: (value: typeof tx) => unknown) =>
        callback(tx),
      ),
    },
  };
}

function makeFlexImportInput() {
  return {
    buffer: makeWorkbookBuffer([
      [
        "sale-flex",
        "Entregue",
        "18 de julho de 2026 13:24",
        "R$ 100,00",
        "Produto Flex",
        "SKU-FLEX",
        "R$ 100,00",
        1,
        "R$ -10,00",
        "R$ 5,00",
        "",
        "",
      ],
    ]),
    companyId: "company-id",
    organizationId: "organization-id",
  };
}

describe("Mercado Livre spreadsheet order import", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("detects a shifted header and parses all 13 marketplace statuses", () => {
    const rows = Array.from({ length: 607 }, (_, index) => [
      String(100000 + index),
      statuses[index % statuses.length],
      "18 de julho de 2026 13:24",
      "R$ 1.234,56",
      `Produto ${index}`,
      `SKU-${index}`,
      "R$ 123,45",
      1,
      "R$ -12,34",
      "",
      "R$ -20,00",
      "R$ 0,00",
    ]);
    const result = parseMercadoLivreSpreadsheet(makeWorkbookBuffer(rows));

    expect(result.errors).toEqual([]);
    expect(result.totalRows).toBe(607);
    expect(result.orders).toHaveLength(607);
    expect(new Set(result.orders.map((order) => order.status))).toEqual(
      new Set(statuses),
    );
  });

  it("groups repeated sale lines, normalizes money and identifies ENVIO FLEX", () => {
    const result = parseMercadoLivreSpreadsheet(
      makeWorkbookBuffer([
        [
          "sale-1",
          "Entregue",
          "18 de julho de 2026 13:24",
          "R$ 100,00",
          "Kit azul",
          "SKU-1",
          "R$ 60,00",
          1,
          "R$ -10,00",
          "R$ 5,00",
          "",
          "",
        ],
        [
          "sale-1",
          "Entregue",
          "18 de julho de 2026 13:24",
          "R$ 100,00",
          "Refil azul",
          "SKU-2",
          "R$ 40,00",
          1,
          "R$ -10,00",
          "R$ 5,00",
          "",
          "",
        ],
        [
          "sale-2",
          "Venda entregue",
          "18 de julho de 2026 13:24",
          "R$ 200,00",
          "Produto verde",
          "SKU-3",
          "R$ 200,00",
          1,
          "R$ -20,00",
          "",
          "R$ -15,00",
          "R$ 5,00",
        ],
        [
          "sale-invalid",
          "Entregue",
          "data inválida",
          "R$ inválido",
          "Produto inválido",
          "SKU-X",
          "R$ 10,00",
          1,
          "",
          "",
          "",
          "",
        ],
      ]),
    );

    expect(result.orders).toHaveLength(2);
    expect(result.orders[0]).toMatchObject({
      commissionAmount: 10,
      discountAmount: 5,
      flex: true,
      saleId: "sale-1",
      totalAmount: 100,
    });
    expect(result.orders[0]?.items).toHaveLength(2);
    expect(result.orders[1]).toMatchObject({
      flex: false,
      shippingAmount: 10,
      saleId: "sale-2",
    });
    expect(result.errors).toHaveLength(2);
    expect(result.errors.map((error) => error.message)).toEqual(
      expect.arrayContaining([
        "Data da venda inválida.",
        "Total (BRL) inválido.",
      ]),
    );
  });

  it("consolidates package child rows into the canonical parent order", () => {
    const result = parseMercadoLivreSpreadsheet(
      makeWorkbookBuffer([
        [
          "package-parent",
          "Pacote de 2 produtos",
          "18 de julho de 2026 13:24",
          "R$ 100,00",
          "",
          "",
          "",
          "",
          "R$ -10,00",
          "",
          "R$ -20,00",
          "R$ 5,00",
        ],
        [
          "package-child-1",
          "Entregue",
          "18 de julho de 2026 13:24",
          "",
          "Produto azul",
          "SKU-1",
          "R$ 50,00",
          1,
          "",
          "",
          "",
          "",
        ],
        [
          "package-child-2",
          "Entregue",
          "18 de julho de 2026 13:24",
          "",
          "Produto verde",
          "SKU-2",
          "R$ 50,00",
          1,
          "",
          "",
          "",
          "",
        ],
        [
          "normal-order",
          "Entregue",
          "18 de julho de 2026 13:24",
          "R$ 40,00",
          "Produto normal",
          "SKU-3",
          "R$ 40,00",
          1,
          "R$ -4,00",
          "",
          "",
          "",
        ],
      ]),
    );

    expect(result.errors).toEqual([]);
    expect(result.orders).toHaveLength(2);
    expect(result.orders.map((order) => order.saleId)).toEqual([
      "package-parent",
      "normal-order",
    ]);
    expect(result.orders[0]).toMatchObject({
      packageInfo: {
        childSaleIds: ["package-child-1", "package-child-2"],
        declaredItemCount: 2,
      },
      totalAmount: 100,
    });
    expect(result.orders[0]?.items.map((item) => item.sku)).toEqual([
      "SKU-1",
      "SKU-2",
    ]);
  });

  it("keeps incomplete package imports best effort without consuming the next order", () => {
    const result = parseMercadoLivreSpreadsheet(
      makeWorkbookBuffer([
        [
          "package-parent",
          "Pacote de 2 produtos",
          "18 de julho de 2026 13:24",
          "R$ 100,00",
          "",
          "",
          "",
          "",
          "R$ -10,00",
          "",
          "",
          "",
        ],
        [
          "package-child-1",
          "Entregue",
          "18 de julho de 2026 13:24",
          "",
          "Produto azul",
          "SKU-1",
          "R$ 100,00",
          1,
          "",
          "",
          "",
          "",
        ],
        [
          "normal-order",
          "Entregue",
          "18 de julho de 2026 13:24",
          "R$ 40,00",
          "Produto normal",
          "SKU-2",
          "R$ 40,00",
          1,
          "R$ -4,00",
          "",
          "",
          "",
        ],
      ]),
    );

    expect(result.orders).toHaveLength(2);
    expect(result.orders[0]?.items).toHaveLength(1);
    expect(result.orders[1]?.saleId).toBe("normal-order");
    expect(result.errors).toEqual([
      expect.objectContaining({
        message:
          "Pacote declara 2 produtos, mas apenas 1 linha(s) filha(s) foram encontrada(s).",
        saleId: "package-parent",
      }),
    ]);
  });

  it("persists package provenance in parent metadata", async () => {
    let existingOrder: {
      id: string;
      metadata: Record<string, unknown>;
    } | null = null;
    const orderInsert = {
      onConflictDoUpdate: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([{ id: "order-db-id" }]),
      values: vi.fn((input: { metadata: Record<string, unknown> }) => {
        existingOrder = { id: "order-db-id", metadata: input.metadata };
        return orderInsert;
      }),
    };
    const productInsert = {
      onConflictDoUpdate: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([{ id: "product-db-id" }]),
      values: vi.fn().mockReturnThis(),
    };
    const itemInsert = { values: vi.fn().mockResolvedValue(undefined) };
    const feeInsert = { values: vi.fn().mockResolvedValue(undefined) };
    const tx = {
      delete: vi.fn(() => ({ where: vi.fn().mockResolvedValue(undefined) })),
      insert: vi.fn((table: unknown) => {
        if (table === externalOrders) return orderInsert;
        if (table === externalProducts) return productInsert;
        if (table === externalOrderItems) return itemInsert;
        if (table === externalFees) return feeInsert;
        throw new Error("Unexpected insert table");
      }),
      query: {
        externalOrders: {
          findFirst: vi.fn().mockImplementation(() => existingOrder),
        },
      },
    };
    const db = {
      query: {
        marketplaceConnections: {
          findFirst: vi.fn().mockResolvedValue(null),
        },
      },
      transaction: vi.fn(async (callback: (value: typeof tx) => unknown) =>
        callback(tx),
      ),
    };
    const service = new OrderSpreadsheetImportService(db as never, {} as never);

    const input = {
      buffer: makeWorkbookBuffer([
        [
          "package-parent",
          "Pacote de 2 produtos",
          "18 de julho de 2026 13:24",
          "R$ 100,00",
          "",
          "",
          "",
          "",
          "R$ -10,00",
          "",
          "",
          "",
        ],
        [
          "package-child-1",
          "Entregue",
          "18 de julho de 2026 13:24",
          "",
          "Produto azul",
          "SKU-1",
          "R$ 50,00",
          1,
          "",
          "",
          "",
          "",
        ],
        [
          "package-child-2",
          "Entregue",
          "18 de julho de 2026 13:24",
          "",
          "Produto verde",
          "SKU-2",
          "R$ 50,00",
          1,
          "",
          "",
          "",
          "",
        ],
      ]),
      companyId: "company-id",
      organizationId: "organization-id",
    };
    const firstImport = await service.importMercadoLivreOrders(input);
    const secondImport = await service.importMercadoLivreOrders(input);

    expect(firstImport).toMatchObject({ created: 1, imported: 1, updated: 0 });
    expect(secondImport).toMatchObject({ created: 0, imported: 1, updated: 1 });

    const orderValues = orderInsert.values.mock.calls[0]?.[0] as {
      metadata: Record<string, unknown>;
    };
    expect(orderValues.metadata.package).toEqual({
      childSaleIds: ["package-child-1", "package-child-2"],
      declaredItemCount: 2,
      kind: "mercadolivre_package",
      parentSaleId: "package-parent",
    });
  });

  it.skipIf(
    !existsSync(
      "C:/Users/ymath/Downloads/20260718_Vendas_BR_Mercado_Libre_y_Mercado_Shops_2026-07-18_13-24hs_204174912.xlsx",
    ),
  )("accepts the attached Mercado Livre export", () => {
    const result = parseMercadoLivreSpreadsheet(
      readFileSync(
        "C:/Users/ymath/Downloads/20260718_Vendas_BR_Mercado_Libre_y_Mercado_Shops_2026-07-18_13-24hs_204174912.xlsx",
      ),
    );
    expect(result.totalRows).toBe(607);
    expect(result.orders).toHaveLength(601);
    expect(result.errors).toEqual([]);

    const packageOrder = result.orders.find(
      (order) => order.saleId === "2000013762862251",
    );
    expect(packageOrder).toMatchObject({
      packageInfo: {
        childSaleIds: ["2000017170311872", "2000017170313512"],
        declaredItemCount: 2,
      },
      totalAmount: 26.46,
    });
    const firstImportedOrder = result.orders.find(
      (order) => order.saleId === "2000013516715241",
    );
    const secondImportedOrder = result.orders.find(
      (order) => order.saleId === "2000013480723293",
    );
    expect(firstImportedOrder?.productRevenueAmount).toBe(38);
    expect(secondImportedOrder?.productRevenueAmount).toBe(39.9);
    expect(packageOrder?.items).toHaveLength(2);
    expect(
      result.orders.some((order) => order.saleId === "2000017170311872"),
    ).toBe(false);
  });

  it("resolves Flex fixed cost through canonical order IDs and stores the mapping", async () => {
    let existingOrder: {
      id: string;
      metadata: Record<string, unknown>;
    } | null = null;
    let importedOrderValues: Record<string, unknown> = {};
    const orderInsert = {
      onConflictDoUpdate: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([{ id: "order-db-id" }]),
      values: vi.fn((input: Record<string, unknown>) => {
        importedOrderValues = input;
        existingOrder = {
          id: "order-db-id",
          metadata: (input.metadata ?? {}) as Record<string, unknown>,
        };
        return orderInsert;
      }),
    };
    const productInsert = {
      onConflictDoUpdate: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([{ id: "product-db-id" }]),
      values: vi.fn().mockReturnThis(),
    };
    const itemInsert = { values: vi.fn().mockResolvedValue(undefined) };
    const feeInsert = { values: vi.fn().mockResolvedValue(undefined) };
    const tx = {
      delete: vi.fn(() => ({ where: vi.fn().mockResolvedValue(undefined) })),
      insert: vi.fn((table: unknown) => {
        if (table === externalOrders) return orderInsert;
        if (table === externalProducts) return productInsert;
        if (table === externalOrderItems) return itemInsert;
        if (table === externalFees) return feeInsert;
        throw new Error("Unexpected insert table");
      }),
      query: {
        externalOrders: {
          findFirst: vi.fn().mockImplementation(() => existingOrder),
        },
      },
    };
    const connection = {
      accessToken: "access-token",
      companyId: "company-id",
      externalAccountId: "seller-id",
      id: "connection-id",
      organizationId: "organization-id",
      provider: "mercadolivre" as const,
      refreshToken: null,
      status: "connected" as const,
      tokenExpiresAt: new Date("2030-01-01T00:00:00.000Z"),
    };
    const db = {
      query: {
        marketplaceConnections: {
          findFirst: vi.fn().mockResolvedValue(connection),
        },
      },
      transaction: vi.fn(async (callback: (value: typeof tx) => unknown) =>
        callback(tx),
      ),
    };
    const service = new OrderSpreadsheetImportService(db as never, {} as never);
    const fetchMock = vi.fn().mockImplementation((request: unknown) => {
      const url = new URL(String(request));

      if (url.pathname === "/packs/sale-flex") {
        return Promise.resolve(
          new Response(JSON.stringify({ orders: [{ id: "order-1" }] }), {
            headers: { "content-type": "application/json" },
            status: 200,
          }),
        );
      }

      if (url.pathname === "/orders/order-1") {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              currency_id: "BRL",
              id: "order-1",
              order_items: [
                {
                  item: {
                    category_id: "MLB272132",
                    id: "MLB4626083209",
                  },
                  listing_type_id: "gold_special",
                  quantity: 1,
                  sale_fee: 4.37,
                  unit_price: 38,
                },
              ],
              shipping: { id: "shipment-order-1" },
            }),
            {
              headers: { "content-type": "application/json" },
              status: 200,
            },
          ),
        );
      }

      if (url.pathname === "/shipments/shipment-order-1") {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              logistic: { mode: "me2", type: "self_service" },
            }),
            {
              headers: { "content-type": "application/json" },
              status: 200,
            },
          ),
        );
      }

      if (url.pathname === "/sites/MLB/listing_prices") {
        expect(url.searchParams.get("logistic_type")).toBe("self_service");
        expect(url.searchParams.get("shipping_mode")).toBe("me2");
        return Promise.resolve(
          new Response(
            JSON.stringify({
              sale_fee_amount: 11.02,
              sale_fee_details: {
                fixed_fee: 6.65,
                gross_amount: 11.02,
              },
            }),
            {
              headers: { "content-type": "application/json" },
              status: 200,
            },
          ),
        );
      }

      return Promise.reject(new Error(`Unexpected URL: ${url}`));
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await service.importMercadoLivreOrders({
      buffer: makeWorkbookBuffer([
        [
          "sale-flex",
          "Entregue",
          "18 de julho de 2026 13:24",
          "R$ 37,78",
          "Produto Flex",
          "SKU-FLEX",
          "R$ 38,00",
          1,
          "R$ -11,02",
          "R$ 10,80",
          "",
          "",
          "R$ 38,00",
        ],
      ]),
      companyId: "company-id",
      organizationId: "organization-id",
    });

    expect(result).toMatchObject({
      errors: [],
      imported: 1,
      pendingFlex: 0,
    });
    expect(importedOrderValues.metadata).toEqual(
      expect.objectContaining({
        compositionOverrides: {
          marketplaceCommissionAmount: "4.37",
        },
        fixedCostAmount: "6.65",
        mercadoLivreOrderIds: ["order-1"],
        spreadsheetProductRevenueAmount: "38.00",
      }),
    );
    expect(importedOrderValues.metadata).not.toHaveProperty(
      "importedTaxAmount",
    );
    expect(feeInsert.values).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ amount: "6.65", feeType: "fixed_fee" }),
      ]),
    );
  });

  it.each([
    [
      null,
      "Custo Fixo pendente: Mercado Livre não está conectado para a empresa selecionada.",
    ],
    [
      {
        accessToken: "access-token",
        companyId: "company-id",
        id: "connection-id",
        organizationId: "organization-id",
        provider: "mercadolivre",
        status: "disconnected",
      },
      "Custo Fixo pendente: a conexão do Mercado Livre está desconectada.",
    ],
  ])(
    "distinguishes unavailable Mercado Livre connection state",
    async (connection, message) => {
      const { db } = createPersistenceDb(connection);
      const service = new OrderSpreadsheetImportService(
        db as never,
        {} as never,
      );

      const result = await service.importMercadoLivreOrders(
        makeFlexImportInput(),
      );

      expect(result.pendingFlex).toBe(1);
      expect(result.errors).toEqual([expect.objectContaining({ message })]);
    },
  );

  it("reports expired token refresh failure separately from missing connection", async () => {
    const { db } = createPersistenceDb({
      accessToken: "expired-token",
      companyId: "company-id",
      id: "connection-id",
      organizationId: "organization-id",
      provider: "mercadolivre",
      refreshToken: "refresh-token",
      status: "connected",
      tokenExpiresAt: new Date("2020-01-01T00:00:00.000Z"),
    });
    const service = new OrderSpreadsheetImportService(db as never, {} as never);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("refresh failed")),
    );

    const result = await service.importMercadoLivreOrders(
      makeFlexImportInput(),
    );

    expect(result.pendingFlex).toBe(1);
    expect(result.errors).toEqual([
      expect.objectContaining({
        message:
          "Custo Fixo pendente: o token do Mercado Livre expirou e não pôde ser renovado.",
      }),
    ]);
  });
});
