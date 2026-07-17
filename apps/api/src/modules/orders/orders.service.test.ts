import { afterEach, describe, expect, it, vi } from "vitest";
import { read, utils } from "xlsx";
import { OrdersService } from "./orders.service";

describe("OrdersService", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("treats a matched zero shipment sender cost as resolved", async () => {
    const service = new OrdersService({} as never);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            receiver: {
              cost: 0,
              discounts: [{ promoted_amount: 8.9 }],
            },
            senders: [{ cost: 0, user_id: "204174912" }],
          }),
          {
            headers: { "content-type": "application/json" },
            status: 200,
          },
        ),
      ),
    );

    const result = await (
      service as unknown as {
        fetchMercadoLivreShipmentBreakdown(input: {
          accessToken: string;
          sellerAccountId: string | null;
          shipmentId: string;
        }): Promise<{
          sellerCostAmount: number;
          sellerMatched: boolean;
          shippingBonusAmount: number;
        }>;
      }
    ).fetchMercadoLivreShipmentBreakdown({
      accessToken: "token",
      sellerAccountId: "204174912",
      shipmentId: "47299177413",
    });

    expect(result).toEqual(
      expect.objectContaining({
        sellerCostAmount: 0,
        sellerMatched: true,
        shippingBonusAmount: 8.9,
      }),
    );
  });

  it("backfills Mercado Livre sale id on order details when metadata is still missing", async () => {
    const updateWhereMock = vi.fn().mockResolvedValue([]);
    const updateSetMock = vi.fn().mockReturnValue({
      where: updateWhereMock,
    });
    const fetchMock = vi.fn().mockImplementation((input: string | URL) => {
      const url = String(input);

      if (url.includes("/orders/search")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              paging: { limit: 50, offset: 0, total: 0 },
              results: [],
            }),
            {
              headers: { "content-type": "application/json" },
              status: 200,
            },
          ),
        );
      }

      return Promise.resolve(
        new Response(
          JSON.stringify({
            results: [
              {
                operation_id: 2000013674359901,
                order_id: 2000017085667456,
              },
            ],
          }),
          {
            headers: { "content-type": "application/json" },
            status: 200,
          },
        ),
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const db = {
      query: {
        companies: {
          findFirst: vi.fn().mockResolvedValue({
            id: "company_123",
            taxRateDefault: "0.100000",
          }),
        },
        externalOrders: {
          findFirst: vi.fn().mockResolvedValue({
            id: "order_row_1",
            companyId: "company_123",
            createdAt: new Date("2026-06-24T12:00:00.000Z"),
            currency: "BRL",
            externalOrderId: "2000017085667456",
            marketplaceConnectionId: "conn_1",
            metadata: {},
            orderedAt: new Date("2026-06-24T10:15:00.000Z"),
            organizationId: "org_123",
            provider: "mercadolivre",
            status: "paid",
            syncRunId: null,
            updatedAt: new Date("2026-06-24T12:00:00.000Z"),
            totalAmount: "200.00",
            items: [],
            fees: [],
          }),
        },
        marketplaceConnections: {
          findMany: vi.fn().mockResolvedValue([
            {
              accessToken: "token_123",
              companyId: "company_123",
              externalAccountId: "seller_1",
              id: "conn_1",
              metadata: {},
              organizationId: "org_123",
              provider: "mercadolivre",
              refreshToken: null,
              status: "connected",
              tokenExpiresAt: new Date("2030-01-01T00:00:00.000Z"),
            },
          ]),
        },
        products: {
          findMany: vi.fn().mockResolvedValue([]),
        },
      },
      update: vi.fn().mockReturnValue({
        set: updateSetMock,
      }),
    };

    const service = new OrdersService(db as never, {
      API_DB_POOL_MAX: 5,
      API_HOST: "127.0.0.1",
      API_PORT: 4000,
      BETTER_AUTH_SECRET: "secret",
      BETTER_AUTH_URL: "http://localhost:4000",
      DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/lucreii",
      MERCADOLIVRE_CLIENT_ID: "ml-client-id",
      MERCADOLIVRE_CLIENT_SECRET: "ml-client-secret",
      MERCADOLIVRE_REDIRECT_URI:
        "http://localhost:4000/integrations/mercadolivre/callback",
      NODE_ENV: "test",
      STRIPE_PRICE_START_MONTHLY: "price_start_monthly",
      STRIPE_PRICE_START_ANNUAL: "price_start_annual",
      STRIPE_PRICE_PRO_MONTHLY: "price_pro_monthly",
      STRIPE_PRICE_PRO_ANNUAL: "price_pro_annual",
      STRIPE_PRICE_BUSINESS_MONTHLY: "price_business_monthly",
      STRIPE_PRICE_BUSINESS_ANNUAL: "price_business_annual",
      STRIPE_SECRET_KEY: "stripe",
      STRIPE_WEBHOOK_SECRET: "webhook",
      SYNC_RELAX_GUARDS: false,
      WEB_APP_ORIGIN: "http://localhost:3000",
    });

    const result = await service.getOrderDetails(
      {
        organizationId: "org_123",
        selectedCompanyId: "company_123",
        userId: "user_123",
      },
      "order_row_1",
    );

    expect(result.order.displayOrderId).toBe("2000013674359901");
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(updateSetMock).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          operationId: "2000013674359901",
        }),
      }),
    );
  });

  it("refreshes an expired Mercado Livre token before backfilling the sale id", async () => {
    const updateWhereMock = vi.fn().mockResolvedValue([]);
    const updateSetMock = vi.fn().mockReturnValue({
      where: updateWhereMock,
    });
    const fetchMock = vi.fn().mockImplementation((input: string | URL) => {
      const url = String(input);

      if (url.includes("/oauth/token")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              access_token: "refreshed-token",
              expires_in: 21600,
              refresh_token: "refresh-2",
              token_type: "bearer",
            }),
            {
              headers: { "content-type": "application/json" },
              status: 200,
            },
          ),
        );
      }

      if (url.includes("/orders/search")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              paging: { limit: 50, offset: 0, total: 0 },
              results: [],
            }),
            {
              headers: { "content-type": "application/json" },
              status: 200,
            },
          ),
        );
      }

      return Promise.resolve(
        new Response(
          JSON.stringify({
            results: [
              {
                operation_id: 2000013674359901,
                order_id: 2000017085667456,
              },
            ],
          }),
          {
            headers: { "content-type": "application/json" },
            status: 200,
          },
        ),
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const db = {
      query: {
        companies: {
          findFirst: vi.fn().mockResolvedValue({
            id: "company_123",
            taxRateDefault: "0.100000",
          }),
        },
        externalOrders: {
          findFirst: vi.fn().mockResolvedValue({
            id: "order_row_1",
            companyId: "company_123",
            createdAt: new Date("2026-06-24T12:00:00.000Z"),
            currency: "BRL",
            externalOrderId: "2000017085667456",
            marketplaceConnectionId: "conn_1",
            metadata: {},
            orderedAt: new Date("2026-06-24T10:15:00.000Z"),
            organizationId: "org_123",
            provider: "mercadolivre",
            status: "paid",
            syncRunId: null,
            updatedAt: new Date("2026-06-24T12:00:00.000Z"),
            totalAmount: "200.00",
            items: [],
            fees: [],
          }),
        },
        marketplaceConnections: {
          findMany: vi.fn().mockResolvedValue([
            {
              accessToken: "expired-token",
              companyId: "company_123",
              externalAccountId: "seller_1",
              id: "conn_1",
              metadata: {},
              organizationId: "org_123",
              provider: "mercadolivre",
              refreshToken: "refresh-1",
              status: "connected",
              tokenExpiresAt: new Date("2020-01-01T00:00:00.000Z"),
            },
          ]),
        },
        products: {
          findMany: vi.fn().mockResolvedValue([]),
        },
      },
      update: vi.fn().mockReturnValue({
        set: updateSetMock,
      }),
    };

    const service = new OrdersService(db as never, {
      API_DB_POOL_MAX: 5,
      API_HOST: "127.0.0.1",
      API_PORT: 4000,
      BETTER_AUTH_SECRET: "secret",
      BETTER_AUTH_URL: "http://localhost:4000",
      DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/lucreii",
      MERCADOLIVRE_CLIENT_ID: "ml-client-id",
      MERCADOLIVRE_CLIENT_SECRET: "ml-client-secret",
      MERCADOLIVRE_REDIRECT_URI:
        "http://localhost:4000/integrations/mercadolivre/callback",
      NODE_ENV: "test",
      STRIPE_PRICE_START_MONTHLY: "price_start_monthly",
      STRIPE_PRICE_START_ANNUAL: "price_start_annual",
      STRIPE_PRICE_PRO_MONTHLY: "price_pro_monthly",
      STRIPE_PRICE_PRO_ANNUAL: "price_pro_annual",
      STRIPE_PRICE_BUSINESS_MONTHLY: "price_business_monthly",
      STRIPE_PRICE_BUSINESS_ANNUAL: "price_business_annual",
      STRIPE_SECRET_KEY: "stripe",
      STRIPE_WEBHOOK_SECRET: "webhook",
      SYNC_RELAX_GUARDS: false,
      WEB_APP_ORIGIN: "http://localhost:3000",
    });

    const result = await service.getOrderDetails(
      {
        organizationId: "org_123",
        selectedCompanyId: "company_123",
        userId: "user_123",
      },
      "order_row_1",
    );

    expect(result.order.displayOrderId).toBe("2000013674359901");
    expect(fetchMock).toHaveBeenCalledTimes(5);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("/oauth/token");
    expect(
      fetchMock.mock.calls.some((call) =>
        String(call[0]).includes("/billing/integration/periods/"),
      ),
    ).toBe(true);
  });

  it("backfills Mercado Livre sale id when billing details require pagination", async () => {
    const updateWhereMock = vi.fn().mockResolvedValue([]);
    const updateSetMock = vi.fn().mockReturnValue({
      where: updateWhereMock,
    });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            paging: { limit: 50, offset: 0, total: 0 },
            results: [],
          }),
          {
            headers: { "content-type": "application/json" },
            status: 200,
          },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            paging: { limit: 50, offset: 0, total: 0 },
            results: [],
          }),
          {
            headers: { "content-type": "application/json" },
            status: 200,
          },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            last_id: "cursor-1",
            limit: 1000,
            offset: 0,
            results: [],
            total: 1001,
          }),
          {
            headers: { "content-type": "application/json" },
            status: 200,
          },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            last_id: "cursor-2",
            limit: 1000,
            offset: 1000,
            results: [
              {
                operation_id: 2000013674359901,
                order_id: 2000017085667456,
              },
            ],
            total: 1001,
          }),
          {
            headers: { "content-type": "application/json" },
            status: 200,
          },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            limit: 1000,
            offset: 1001,
            results: [],
            total: 1001,
          }),
          {
            headers: { "content-type": "application/json" },
            status: 200,
          },
        ),
      );
    vi.stubGlobal("fetch", fetchMock);

    const db = {
      query: {
        companies: {
          findFirst: vi.fn().mockResolvedValue({
            id: "company_123",
            taxRateDefault: "0.100000",
          }),
        },
        externalOrders: {
          findFirst: vi.fn().mockResolvedValue({
            id: "order_row_1",
            companyId: "company_123",
            createdAt: new Date("2026-06-24T12:00:00.000Z"),
            currency: "BRL",
            externalOrderId: "2000017085667456",
            marketplaceConnectionId: "conn_1",
            metadata: {},
            orderedAt: new Date("2026-06-24T10:15:00.000Z"),
            organizationId: "org_123",
            provider: "mercadolivre",
            status: "paid",
            syncRunId: null,
            updatedAt: new Date("2026-06-24T12:00:00.000Z"),
            totalAmount: "200.00",
            items: [],
            fees: [],
          }),
        },
        marketplaceConnections: {
          findMany: vi.fn().mockResolvedValue([
            {
              accessToken: "token_123",
              companyId: "company_123",
              externalAccountId: "seller_1",
              id: "conn_1",
              metadata: {},
              organizationId: "org_123",
              provider: "mercadolivre",
              refreshToken: null,
              status: "connected",
              tokenExpiresAt: new Date("2030-01-01T00:00:00.000Z"),
            },
          ]),
        },
        products: {
          findMany: vi.fn().mockResolvedValue([]),
        },
      },
      update: vi.fn().mockReturnValue({
        set: updateSetMock,
      }),
    };

    const service = new OrdersService(db as never, {
      API_DB_POOL_MAX: 5,
      API_HOST: "127.0.0.1",
      API_PORT: 4000,
      BETTER_AUTH_SECRET: "secret",
      BETTER_AUTH_URL: "http://localhost:4000",
      DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/lucreii",
      MERCADOLIVRE_CLIENT_ID: "ml-client-id",
      MERCADOLIVRE_CLIENT_SECRET: "ml-client-secret",
      MERCADOLIVRE_REDIRECT_URI:
        "http://localhost:4000/integrations/mercadolivre/callback",
      NODE_ENV: "test",
      STRIPE_PRICE_START_MONTHLY: "price_start_monthly",
      STRIPE_PRICE_START_ANNUAL: "price_start_annual",
      STRIPE_PRICE_PRO_MONTHLY: "price_pro_monthly",
      STRIPE_PRICE_PRO_ANNUAL: "price_pro_annual",
      STRIPE_PRICE_BUSINESS_MONTHLY: "price_business_monthly",
      STRIPE_PRICE_BUSINESS_ANNUAL: "price_business_annual",
      STRIPE_SECRET_KEY: "stripe",
      STRIPE_WEBHOOK_SECRET: "webhook",
      SYNC_RELAX_GUARDS: false,
      WEB_APP_ORIGIN: "http://localhost:3000",
    });

    const result = await service.getOrderDetails(
      {
        organizationId: "org_123",
        selectedCompanyId: "company_123",
        userId: "user_123",
      },
      "order_row_1",
    );

    expect(result.order.displayOrderId).toBe("2000013674359901");
    expect(fetchMock).toHaveBeenCalledTimes(5);
    expect(String(fetchMock.mock.calls[3]?.[0])).toContain("from_id=cursor-1");
  });

  it("backfills Mercado Livre sale id when billing returns multiple rows for the same order_id", async () => {
    const updateWhereMock = vi.fn().mockResolvedValue([]);
    const updateSetMock = vi.fn().mockReturnValue({
      where: updateWhereMock,
    });
    const fetchMock = vi.fn().mockImplementation((input: string | URL) => {
      const url = String(input);

      if (url.includes("/orders/search")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              paging: { limit: 50, offset: 0, total: 0 },
              results: [],
            }),
            {
              headers: { "content-type": "application/json" },
              status: 200,
            },
          ),
        );
      }

      return Promise.resolve(
        new Response(
          JSON.stringify({
            limit: 1000,
            offset: 0,
            results: [
              {
                order_id: 2000017085667456,
              },
              {
                operation_id: 2000013674359901,
                order_id: 2000017085667456,
              },
            ],
            total: 2,
          }),
          {
            headers: { "content-type": "application/json" },
            status: 200,
          },
        ),
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const db = {
      query: {
        companies: {
          findFirst: vi.fn().mockResolvedValue({
            id: "company_123",
            taxRateDefault: "0.100000",
          }),
        },
        externalOrders: {
          findFirst: vi.fn().mockResolvedValue({
            id: "order_row_1",
            companyId: "company_123",
            createdAt: new Date("2026-06-24T12:00:00.000Z"),
            currency: "BRL",
            externalOrderId: "2000017085667456",
            marketplaceConnectionId: "conn_1",
            metadata: {},
            orderedAt: new Date("2026-06-24T10:15:00.000Z"),
            organizationId: "org_123",
            provider: "mercadolivre",
            status: "paid",
            syncRunId: null,
            updatedAt: new Date("2026-06-24T12:00:00.000Z"),
            totalAmount: "200.00",
            items: [],
            fees: [],
          }),
        },
        marketplaceConnections: {
          findMany: vi.fn().mockResolvedValue([
            {
              accessToken: "token_123",
              companyId: "company_123",
              externalAccountId: "seller_1",
              id: "conn_1",
              metadata: {},
              organizationId: "org_123",
              provider: "mercadolivre",
              refreshToken: null,
              status: "connected",
              tokenExpiresAt: new Date("2030-01-01T00:00:00.000Z"),
            },
          ]),
        },
        products: {
          findMany: vi.fn().mockResolvedValue([]),
        },
      },
      update: vi.fn().mockReturnValue({
        set: updateSetMock,
      }),
    };

    const service = new OrdersService(db as never, {
      API_DB_POOL_MAX: 5,
      API_HOST: "127.0.0.1",
      API_PORT: 4000,
      BETTER_AUTH_SECRET: "secret",
      BETTER_AUTH_URL: "http://localhost:4000",
      DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/lucreii",
      MERCADOLIVRE_CLIENT_ID: "ml-client-id",
      MERCADOLIVRE_CLIENT_SECRET: "ml-client-secret",
      MERCADOLIVRE_REDIRECT_URI:
        "http://localhost:4000/integrations/mercadolivre/callback",
      NODE_ENV: "test",
      STRIPE_PRICE_START_MONTHLY: "price_start_monthly",
      STRIPE_PRICE_START_ANNUAL: "price_start_annual",
      STRIPE_PRICE_PRO_MONTHLY: "price_pro_monthly",
      STRIPE_PRICE_PRO_ANNUAL: "price_pro_annual",
      STRIPE_PRICE_BUSINESS_MONTHLY: "price_business_monthly",
      STRIPE_PRICE_BUSINESS_ANNUAL: "price_business_annual",
      STRIPE_SECRET_KEY: "stripe",
      STRIPE_WEBHOOK_SECRET: "webhook",
      SYNC_RELAX_GUARDS: false,
      WEB_APP_ORIGIN: "http://localhost:3000",
    });

    const result = await service.getOrderDetails(
      {
        organizationId: "org_123",
        selectedCompanyId: "company_123",
        userId: "user_123",
      },
      "order_row_1",
    );

    expect(result.order.displayOrderId).toBe("2000013674359901");
    expect(updateSetMock).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          operationId: "2000013674359901",
        }),
      }),
    );
  });

  it("backfills Mercado Livre shipment seller cost on order details using order shipping id", async () => {
    const updateWhereMock = vi.fn().mockResolvedValue([]);
    const updateSetMock = vi.fn().mockReturnValue({
      where: updateWhereMock,
    });
    const fetchMock = vi.fn().mockImplementation((input: string | URL) => {
      const url = String(input);

      if (url.includes("/billing/integration/group/ML/order/details")) {
        return Promise.resolve(
          new Response(JSON.stringify({ results: [] }), {
            headers: { "content-type": "application/json" },
            status: 200,
          }),
        );
      }

      if (url.includes("/orders/2000016982042646")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              id: 2000016982042646,
              shipping: {
                id: 47320221685,
              },
            }),
            {
              headers: { "content-type": "application/json" },
              status: 200,
            },
          ),
        );
      }

      if (url.includes("/shipments/47320221685/costs")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              receiver: {
                cost: 0,
              },
              senders: [{ cost: 6.55, user_id: "seller_1" }],
            }),
            {
              headers: { "content-type": "application/json" },
              status: 200,
            },
          ),
        );
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const db = {
      query: {
        companies: {
          findFirst: vi.fn().mockResolvedValue({
            id: "company_123",
            taxRateDefault: "0.120000",
          }),
        },
        externalOrders: {
          findFirst: vi.fn().mockResolvedValue({
            id: "order_row_1",
            companyId: "company_123",
            createdAt: new Date("2026-07-04T12:00:00.000Z"),
            currency: "BRL",
            externalOrderId: "2000016982042646",
            marketplaceConnectionId: "conn_1",
            metadata: {
              operationId: "2000013674359901",
              packId: "2000009999999999",
            },
            orderedAt: new Date("2026-07-04T10:15:00.000Z"),
            organizationId: "org_123",
            provider: "mercadolivre",
            status: "paid",
            syncRunId: null,
            updatedAt: new Date("2026-07-04T12:00:00.000Z"),
            totalAmount: "200.00",
            items: [
              {
                id: "item_1",
                quantity: 1,
                totalPrice: "200.00",
                unitPrice: "200.00",
                externalProduct: {
                  id: "ext_prod_1",
                  linkedProductId: null,
                  sku: "SKU-1",
                  title: "Produto 1",
                },
              },
            ],
            fees: [
              {
                amount: "20.00",
                currency: "BRL",
                feeType: "shipping_cost",
                id: "fee_ship",
                metadata: {},
              },
              {
                amount: "3.00",
                currency: "BRL",
                feeType: "fixed_fee",
                id: "fee_fixed",
                metadata: {},
              },
            ],
          }),
        },
        marketplaceConnections: {
          findMany: vi.fn().mockResolvedValue([
            {
              accessToken: "token_123",
              companyId: "company_123",
              externalAccountId: "seller_1",
              id: "conn_1",
              metadata: {},
              organizationId: "org_123",
              provider: "mercadolivre",
              refreshToken: null,
              status: "connected",
              tokenExpiresAt: new Date("2030-01-01T00:00:00.000Z"),
            },
          ]),
        },
        products: {
          findMany: vi.fn().mockResolvedValue([]),
        },
      },
      update: vi.fn().mockReturnValue({
        set: updateSetMock,
      }),
    };

    const service = new OrdersService(db as never, {
      API_DB_POOL_MAX: 5,
      API_HOST: "127.0.0.1",
      API_PORT: 4000,
      BETTER_AUTH_SECRET: "secret",
      BETTER_AUTH_URL: "http://localhost:4000",
      DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/lucreii",
      MERCADOLIVRE_CLIENT_ID: "ml-client-id",
      MERCADOLIVRE_CLIENT_SECRET: "ml-client-secret",
      MERCADOLIVRE_REDIRECT_URI:
        "http://localhost:4000/integrations/mercadolivre/callback",
      NODE_ENV: "test",
      STRIPE_PRICE_START_MONTHLY: "price_start_monthly",
      STRIPE_PRICE_START_ANNUAL: "price_start_annual",
      STRIPE_PRICE_PRO_MONTHLY: "price_pro_monthly",
      STRIPE_PRICE_PRO_ANNUAL: "price_pro_annual",
      STRIPE_PRICE_BUSINESS_MONTHLY: "price_business_monthly",
      STRIPE_PRICE_BUSINESS_ANNUAL: "price_business_annual",
      STRIPE_SECRET_KEY: "stripe",
      STRIPE_WEBHOOK_SECRET: "webhook",
      SYNC_RELAX_GUARDS: false,
      WEB_APP_ORIGIN: "http://localhost:3000",
    });

    const result = await service.getOrderDetails(
      {
        organizationId: "org_123",
        selectedCompanyId: "company_123",
        userId: "user_123",
      },
      "order_row_1",
    );

    expect(result.order).toEqual(
      expect.objectContaining({
        fixedCostAmount: "3.00",
        shippingAmount: "6.55",
      }),
    );
    expect(result.composition).toEqual(
      expect.objectContaining({
        shippingOrFixedFeeAmount: "6.55",
      }),
    );
    expect(updateSetMock).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: "6.55",
        metadata: expect.objectContaining({
          shipmentId: "47320221685",
          shipping_buyer_paid: "0.00",
          shipping_net_amount: "-6.55",
          shipping_seller_fee: "6.55",
          source: "shipment_costs.senders",
        }),
      }),
    );
  });

  it("uses Mercado Livre shipment seller cost in composition when fixed fee is absent", async () => {
    const updateWhereMock = vi.fn().mockResolvedValue([]);
    const updateSetMock = vi.fn().mockReturnValue({
      where: updateWhereMock,
    });
    const fetchMock = vi.fn().mockImplementation((input: string | URL) => {
      const url = String(input);

      if (url.includes("/billing/integration/group/ML/order/details")) {
        return Promise.resolve(
          new Response(JSON.stringify({ results: [] }), {
            headers: { "content-type": "application/json" },
            status: 200,
          }),
        );
      }

      if (url.includes("/orders/2000016982042646")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              id: 2000016982042646,
              shipping: {
                id: 47320221685,
              },
            }),
            {
              headers: { "content-type": "application/json" },
              status: 200,
            },
          ),
        );
      }

      if (url.includes("/shipments/47320221685/costs")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              receiver: {
                cost: 0,
              },
              senders: [{ cost: 6.55, user_id: "seller_1" }],
            }),
            {
              headers: { "content-type": "application/json" },
              status: 200,
            },
          ),
        );
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const db = {
      query: {
        companies: {
          findFirst: vi.fn().mockResolvedValue({
            id: "company_123",
            taxRateDefault: "0.120000",
          }),
        },
        externalOrders: {
          findFirst: vi.fn().mockResolvedValue({
            id: "order_row_1",
            companyId: "company_123",
            createdAt: new Date("2026-07-04T12:00:00.000Z"),
            currency: "BRL",
            externalOrderId: "2000016982042646",
            marketplaceConnectionId: "conn_1",
            metadata: {
              operationId: "2000013674359901",
              packId: "2000009999999999",
            },
            orderedAt: new Date("2026-07-04T10:15:00.000Z"),
            organizationId: "org_123",
            provider: "mercadolivre",
            status: "paid",
            syncRunId: null,
            updatedAt: new Date("2026-07-04T12:00:00.000Z"),
            totalAmount: "200.00",
            items: [
              {
                id: "item_1",
                quantity: 1,
                totalPrice: "200.00",
                unitPrice: "200.00",
                externalProduct: {
                  id: "ext_prod_1",
                  linkedProductId: null,
                  sku: "SKU-1",
                  title: "Produto 1",
                },
              },
            ],
            fees: [
              {
                amount: "20.00",
                currency: "BRL",
                feeType: "shipping_cost",
                id: "fee_ship",
                metadata: {},
              },
            ],
          }),
        },
        marketplaceConnections: {
          findMany: vi.fn().mockResolvedValue([
            {
              accessToken: "token_123",
              companyId: "company_123",
              externalAccountId: "seller_1",
              id: "conn_1",
              metadata: {},
              organizationId: "org_123",
              provider: "mercadolivre",
              refreshToken: null,
              status: "connected",
              tokenExpiresAt: new Date("2030-01-01T00:00:00.000Z"),
            },
          ]),
        },
        products: {
          findMany: vi.fn().mockResolvedValue([]),
        },
      },
      update: vi.fn().mockReturnValue({
        set: updateSetMock,
      }),
    };

    const service = new OrdersService(db as never, {
      API_DB_POOL_MAX: 5,
      API_HOST: "127.0.0.1",
      API_PORT: 4000,
      BETTER_AUTH_SECRET: "secret",
      BETTER_AUTH_URL: "http://localhost:4000",
      DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/lucreii",
      MERCADOLIVRE_CLIENT_ID: "ml-client-id",
      MERCADOLIVRE_CLIENT_SECRET: "ml-client-secret",
      MERCADOLIVRE_REDIRECT_URI:
        "http://localhost:4000/integrations/mercadolivre/callback",
      NODE_ENV: "test",
      STRIPE_PRICE_START_MONTHLY: "price_start_monthly",
      STRIPE_PRICE_START_ANNUAL: "price_start_annual",
      STRIPE_PRICE_PRO_MONTHLY: "price_pro_monthly",
      STRIPE_PRICE_PRO_ANNUAL: "price_pro_annual",
      STRIPE_PRICE_BUSINESS_MONTHLY: "price_business_monthly",
      STRIPE_PRICE_BUSINESS_ANNUAL: "price_business_annual",
      STRIPE_SECRET_KEY: "stripe",
      STRIPE_WEBHOOK_SECRET: "webhook",
      SYNC_RELAX_GUARDS: false,
      WEB_APP_ORIGIN: "http://localhost:3000",
    });

    const result = await service.getOrderDetails(
      {
        organizationId: "org_123",
        selectedCompanyId: "company_123",
        userId: "user_123",
      },
      "order_row_1",
    );

    expect(result.order).toEqual(
      expect.objectContaining({
        shippingAmount: "6.55",
      }),
    );
    expect(result.composition).toEqual(
      expect.objectContaining({
        shippingOrFixedFeeAmount: "6.55",
      }),
    );
  });

  it("preserves billing shipping cost in composition without refreshing shipment data", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const db = {
      query: {
        companies: {
          findFirst: vi.fn().mockResolvedValue({
            id: "company_123",
            taxRateDefault: "0.120000",
          }),
        },
        externalOrders: {
          findFirst: vi.fn().mockResolvedValue({
            id: "order_row_1",
            companyId: "company_123",
            createdAt: new Date("2026-07-04T12:00:00.000Z"),
            currency: "BRL",
            externalOrderId: "2000016982042646",
            marketplaceConnectionId: "conn_1",
            metadata: {
              operationId: "164510652070",
              packId: "2000013564480079",
            },
            orderedAt: new Date("2026-07-04T10:15:00.000Z"),
            organizationId: "org_123",
            provider: "mercadolivre",
            status: "paid",
            syncRunId: null,
            updatedAt: new Date("2026-07-04T12:00:00.000Z"),
            totalAmount: "18.96",
            items: [
              {
                id: "item_1",
                quantity: 1,
                totalPrice: "18.96",
                unitPrice: "18.96",
                externalProduct: {
                  id: "ext_prod_1",
                  linkedProductId: null,
                  sku: "SKU-1",
                  title: "Produto 1",
                },
              },
            ],
            fees: [
              {
                amount: "5.65",
                currency: "BRL",
                feeType: "shipping_cost",
                id: "fee_ship",
                metadata: {
                  buyerShippingAmount: 10.99,
                  grossShippingTariffAmount: 16.64,
                  shipmentId: "47320221685",
                  shipping_buyer_paid: "10.99",
                  shipping_net_amount: "-5.65",
                  shipping_seller_fee: "16.64",
                  source: "billing/integration/group/ML/order/details",
                },
              },
              {
                amount: "2.46",
                currency: "BRL",
                feeType: "marketplace_commission",
                id: "fee_commission",
                metadata: {},
              },
            ],
          }),
        },
        marketplaceConnections: {
          findMany: vi.fn().mockResolvedValue([
            {
              accessToken: "token_123",
              companyId: "company_123",
              externalAccountId: "seller_1",
              id: "conn_1",
              metadata: {},
              organizationId: "org_123",
              provider: "mercadolivre",
              refreshToken: null,
              status: "connected",
              tokenExpiresAt: new Date("2030-01-01T00:00:00.000Z"),
            },
          ]),
        },
        products: {
          findMany: vi.fn().mockResolvedValue([]),
        },
      },
      update: vi.fn(),
    };

    const service = new OrdersService(db as never, {
      API_DB_POOL_MAX: 5,
      API_HOST: "127.0.0.1",
      API_PORT: 4000,
      BETTER_AUTH_SECRET: "secret",
      BETTER_AUTH_URL: "http://localhost:4000",
      DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/lucreii",
      MERCADOLIVRE_CLIENT_ID: "ml-client-id",
      MERCADOLIVRE_CLIENT_SECRET: "ml-client-secret",
      MERCADOLIVRE_REDIRECT_URI:
        "http://localhost:4000/integrations/mercadolivre/callback",
      NODE_ENV: "test",
      STRIPE_PRICE_START_MONTHLY: "price_start_monthly",
      STRIPE_PRICE_START_ANNUAL: "price_start_annual",
      STRIPE_PRICE_PRO_MONTHLY: "price_pro_monthly",
      STRIPE_PRICE_PRO_ANNUAL: "price_pro_annual",
      STRIPE_PRICE_BUSINESS_MONTHLY: "price_business_monthly",
      STRIPE_PRICE_BUSINESS_ANNUAL: "price_business_annual",
      STRIPE_SECRET_KEY: "stripe",
      STRIPE_WEBHOOK_SECRET: "webhook",
      SYNC_RELAX_GUARDS: false,
      WEB_APP_ORIGIN: "http://localhost:3000",
    });

    const result = await service.getOrderDetails(
      {
        organizationId: "org_123",
        selectedCompanyId: "company_123",
        userId: "user_123",
      },
      "order_row_1",
    );

    expect(result.order).toEqual(
      expect.objectContaining({
        shippingAmount: "5.65",
      }),
    );
    expect(result.composition).toEqual(
      expect.objectContaining({
        shippingBreakdown: {
          buyerShippingPaymentAmount: "10.99",
          grossShippingTariffAmount: "16.64",
          netShippingAmount: "-5.65",
          source: "billing/integration/group/ML/order/details",
        },
        shippingOrFixedFeeAmount: "5.65",
      }),
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("backfills persisted Mercado Livre shipment list cost with billing shipping cost in order details", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          results: [
            {
              order_id: 2000016982042646,
              details: [
                {
                  charge_info: {
                    detail_sub_type: "CVVPRC",
                  },
                  detail_amount: 0.01,
                  marketplace_info: {
                    marketplace: "CORE",
                  },
                  shipping_info: {
                    receiver_shipping_cost: 10.99,
                    shipping_id: "47320221685",
                  },
                },
                {
                  charge_info: {
                    detail_amount: 16.64,
                    detail_sub_type: "CFFE",
                  },
                  marketplace_info: {
                    marketplace: "SHIPPING",
                  },
                  shipping_info: {
                    receiver_shipping_cost: 10.99,
                    shipping_id: "47320221685",
                  },
                },
              ],
            },
          ],
        }),
        {
          headers: {
            "content-type": "application/json",
          },
          status: 200,
        },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const updateWhereMock = vi.fn().mockResolvedValue(undefined);
    const updateSetMock = vi.fn().mockReturnValue({
      where: updateWhereMock,
    });
    const db = {
      query: {
        companies: {
          findFirst: vi.fn().mockResolvedValue({
            id: "company_123",
            taxRateDefault: "0.120000",
          }),
        },
        externalOrders: {
          findFirst: vi.fn().mockResolvedValue({
            id: "order_row_1",
            companyId: "company_123",
            createdAt: new Date("2026-07-04T12:00:00.000Z"),
            currency: "BRL",
            externalOrderId: "2000016982042646",
            marketplaceConnectionId: "conn_1",
            metadata: {
              operationId: "164510652070",
              packId: "2000013564480079",
            },
            orderedAt: new Date("2026-07-04T10:15:00.000Z"),
            organizationId: "org_123",
            provider: "mercadolivre",
            status: "paid",
            syncRunId: null,
            updatedAt: new Date("2026-07-04T12:00:00.000Z"),
            totalAmount: "18.96",
            items: [
              {
                id: "item_1",
                quantity: 1,
                totalPrice: "18.96",
                unitPrice: "18.96",
                externalProduct: {
                  id: "ext_prod_1",
                  linkedProductId: null,
                  sku: "SKU-1",
                  title: "Produto 1",
                },
              },
            ],
            fees: [
              {
                amount: "16.64",
                currency: "BRL",
                feeType: "shipping_cost",
                id: "fee_ship",
                metadata: {
                  shipmentId: "47320221685",
                  source: "shipment_detail.shipping_option.list_cost",
                },
              },
              {
                amount: "2.46",
                currency: "BRL",
                feeType: "marketplace_commission",
                id: "fee_commission",
                metadata: {},
              },
            ],
          }),
        },
        marketplaceConnections: {
          findMany: vi.fn().mockResolvedValue([
            {
              accessToken: "token_123",
              companyId: "company_123",
              externalAccountId: "seller_1",
              id: "conn_1",
              metadata: {},
              organizationId: "org_123",
              provider: "mercadolivre",
              refreshToken: null,
              status: "connected",
              tokenExpiresAt: new Date("2030-01-01T00:00:00.000Z"),
            },
          ]),
        },
        products: {
          findMany: vi.fn().mockResolvedValue([]),
        },
      },
      update: vi.fn().mockReturnValue({
        set: updateSetMock,
      }),
    };

    const service = new OrdersService(db as never, {
      API_DB_POOL_MAX: 5,
      API_HOST: "127.0.0.1",
      API_PORT: 4000,
      BETTER_AUTH_SECRET: "secret",
      BETTER_AUTH_URL: "http://localhost:4000",
      DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/lucreii",
      MERCADOLIVRE_CLIENT_ID: "ml-client-id",
      MERCADOLIVRE_CLIENT_SECRET: "ml-client-secret",
      MERCADOLIVRE_REDIRECT_URI:
        "http://localhost:4000/integrations/mercadolivre/callback",
      NODE_ENV: "test",
      STRIPE_PRICE_START_MONTHLY: "price_start_monthly",
      STRIPE_PRICE_START_ANNUAL: "price_start_annual",
      STRIPE_PRICE_PRO_MONTHLY: "price_pro_monthly",
      STRIPE_PRICE_PRO_ANNUAL: "price_pro_annual",
      STRIPE_PRICE_BUSINESS_MONTHLY: "price_business_monthly",
      STRIPE_PRICE_BUSINESS_ANNUAL: "price_business_annual",
      STRIPE_SECRET_KEY: "stripe",
      STRIPE_WEBHOOK_SECRET: "webhook",
      SYNC_RELAX_GUARDS: false,
      WEB_APP_ORIGIN: "http://localhost:3000",
    });

    const result = await service.getOrderDetails(
      {
        organizationId: "org_123",
        selectedCompanyId: "company_123",
        userId: "user_123",
      },
      "order_row_1",
    );

    expect(result.order).toEqual(
      expect.objectContaining({
        shippingAmount: "5.65",
      }),
    );
    expect(result.composition).toEqual(
      expect.objectContaining({
        shippingOrFixedFeeAmount: "5.65",
      }),
    );
    expect(updateSetMock).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: "5.65",
        metadata: expect.objectContaining({
          shipmentId: "47320221685",
          shipping_buyer_paid: "10.99",
          shipping_net_amount: "-5.65",
          shipping_seller_fee: "16.64",
          source: "billing/integration/group/ML/order/details",
        }),
      }),
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain(
      "order_ids=2000016982042646",
    );
  });

  it("recomputes incomplete Mercado Livre billing shipping from shipment costs in order details", async () => {
    const fetchMock = vi.fn().mockImplementation((input: string | URL) => {
      const url = String(input);

      if (url.includes("/billing/integration/group/ML/order/details")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              results: [
                {
                  order_id: 2000017277947006,
                  details: [
                    {
                      charge_info: {
                        detail_amount: 2.3,
                        detail_sub_type: "CVVML",
                      },
                      shipping_info: {
                        receiver_shipping_cost: 1.99,
                        shipping_id: "47459283017",
                      },
                    },
                  ],
                },
              ],
            }),
            {
              headers: {
                "content-type": "application/json",
              },
              status: 200,
            },
          ),
        );
      }

      if (url.includes("/shipments/47459283017/costs")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              receiver: {
                cost: 1.99,
              },
              senders: [{ cost: 6.55, user_id: "204174912" }],
            }),
            {
              headers: {
                "content-type": "application/json",
              },
              status: 200,
            },
          ),
        );
      }

      return Promise.reject(new Error(`Unexpected URL: ${url}`));
    });
    vi.stubGlobal("fetch", fetchMock);

    const updateWhereMock = vi.fn().mockResolvedValue(undefined);
    const updateSetMock = vi.fn().mockReturnValue({
      where: updateWhereMock,
    });
    const db = {
      query: {
        companies: {
          findFirst: vi.fn().mockResolvedValue({
            id: "company_123",
            taxRateDefault: "0.120000",
          }),
        },
        externalOrders: {
          findFirst: vi.fn().mockResolvedValue({
            id: "order_row_1",
            companyId: "company_123",
            createdAt: new Date("2026-07-06T22:22:30.000Z"),
            currency: "BRL",
            externalOrderId: "2000017277947006",
            marketplaceConnectionId: "conn_1",
            metadata: {
              operationId: "166653977021",
              packId: "2000013875559285",
            },
            orderedAt: new Date("2026-07-06T19:22:30.000Z"),
            organizationId: "org_123",
            provider: "mercadolivre",
            status: "paid",
            syncRunId: null,
            updatedAt: new Date("2026-07-06T22:24:13.000Z"),
            totalAmount: "27.59",
            items: [],
            fees: [
              {
                amount: "1.99",
                currency: "BRL",
                feeType: "shipping_cost",
                id: "fee_ship",
                metadata: {
                  shipmentId: "47459283017",
                  shipping_buyer_paid: "1.99",
                  shipping_seller_fee: "0.00",
                  source: "billing/integration/group/ML/order/details",
                },
              },
              {
                amount: "3.17",
                currency: "BRL",
                feeType: "marketplace_commission",
                id: "fee_commission",
                metadata: {},
              },
            ],
          }),
        },
        marketplaceConnections: {
          findMany: vi.fn().mockResolvedValue([
            {
              accessToken: "token_123",
              companyId: "company_123",
              externalAccountId: "204174912",
              id: "conn_1",
              metadata: {},
              organizationId: "org_123",
              provider: "mercadolivre",
              refreshToken: null,
              status: "connected",
              tokenExpiresAt: new Date("2030-01-01T00:00:00.000Z"),
            },
          ]),
        },
        products: {
          findMany: vi.fn().mockResolvedValue([]),
        },
      },
      update: vi.fn().mockReturnValue({
        set: updateSetMock,
      }),
    };

    const service = new OrdersService(db as never, {
      API_DB_POOL_MAX: 5,
      API_HOST: "127.0.0.1",
      API_PORT: 4000,
      BETTER_AUTH_SECRET: "secret",
      BETTER_AUTH_URL: "http://localhost:4000",
      DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/lucreii",
      MERCADOLIVRE_CLIENT_ID: "ml-client-id",
      MERCADOLIVRE_CLIENT_SECRET: "ml-client-secret",
      MERCADOLIVRE_REDIRECT_URI:
        "http://localhost:4000/integrations/mercadolivre/callback",
      NODE_ENV: "test",
      STRIPE_PRICE_START_MONTHLY: "price_start_monthly",
      STRIPE_PRICE_START_ANNUAL: "price_start_annual",
      STRIPE_PRICE_PRO_MONTHLY: "price_pro_monthly",
      STRIPE_PRICE_PRO_ANNUAL: "price_pro_annual",
      STRIPE_PRICE_BUSINESS_MONTHLY: "price_business_monthly",
      STRIPE_PRICE_BUSINESS_ANNUAL: "price_business_annual",
      STRIPE_SECRET_KEY: "stripe",
      STRIPE_WEBHOOK_SECRET: "webhook",
      SYNC_RELAX_GUARDS: false,
      WEB_APP_ORIGIN: "http://localhost:3000",
    });

    const result = await service.getOrderDetails(
      {
        organizationId: "org_123",
        selectedCompanyId: "company_123",
        userId: "user_123",
      },
      "order_row_1",
    );

    expect(result.order).toEqual(
      expect.objectContaining({
        shippingAmount: "6.55",
      }),
    );
    expect(result.composition).toEqual(
      expect.objectContaining({
        shippingBreakdown: {
          buyerShippingPaymentAmount: "1.99",
          grossShippingTariffAmount: "6.55",
          netShippingAmount: "-6.55",
          source: "shipment_costs.senders",
        },
        shippingOrFixedFeeAmount: "6.55",
      }),
    );
    expect(updateSetMock).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: "6.55",
        metadata: expect.objectContaining({
          shipmentId: "47459283017",
          shipping_buyer_paid: "1.99",
          shipping_net_amount: "-6.55",
          shipping_seller_fee: "6.55",
          source: "shipment_costs.senders",
        }),
      }),
    );
  });

  it("backfills persisted Mercado Livre shipment list cost with billing shipping cost in order list", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          results: [
            {
              order_id: 2000016982042646,
              details: [
                {
                  charge_info: {
                    detail_sub_type: "CVVPRC",
                  },
                  detail_amount: 0.01,
                  marketplace_info: {
                    marketplace: "CORE",
                  },
                  shipping_info: {
                    receiver_shipping_cost: 10.99,
                    shipping_id: "47320221685",
                  },
                },
                {
                  charge_info: {
                    detail_amount: 16.64,
                    detail_sub_type: "CFFE",
                  },
                  marketplace_info: {
                    marketplace: "SHIPPING",
                  },
                  shipping_info: {
                    receiver_shipping_cost: 10.99,
                    shipping_id: "47320221685",
                  },
                },
              ],
            },
          ],
        }),
        {
          headers: {
            "content-type": "application/json",
          },
          status: 200,
        },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const updateWhereMock = vi.fn().mockResolvedValue(undefined);
    const updateSetMock = vi.fn().mockReturnValue({
      where: updateWhereMock,
    });
    const db = {
      query: {
        companies: {
          findFirst: vi.fn().mockResolvedValue({
            id: "company_123",
            taxRateDefault: "0.120000",
          }),
        },
        externalOrders: {
          findMany: vi.fn().mockResolvedValue([
            {
              id: "order_row_1",
              companyId: "company_123",
              createdAt: new Date("2026-07-04T12:00:00.000Z"),
              currency: "BRL",
              externalOrderId: "2000016982042646",
              marketplaceConnectionId: "conn_1",
              metadata: {
                operationId: "164510652070",
                packId: "2000013564480079",
              },
              orderedAt: new Date("2026-07-04T10:15:00.000Z"),
              organizationId: "org_123",
              provider: "mercadolivre",
              status: "paid",
              syncRunId: null,
              updatedAt: new Date("2026-07-04T12:00:00.000Z"),
              totalAmount: "18.96",
              items: [],
              fees: [
                {
                  amount: "16.64",
                  currency: "BRL",
                  feeType: "shipping_cost",
                  id: "fee_ship",
                  metadata: {
                    shipmentId: "47320221685",
                    source: "shipment_detail.shipping_option.list_cost",
                  },
                },
              ],
            },
          ]),
        },
        marketplaceConnections: {
          findMany: vi.fn().mockResolvedValue([
            {
              accessToken: "token_123",
              companyId: "company_123",
              externalAccountId: "seller_1",
              id: "conn_1",
              metadata: {},
              organizationId: "org_123",
              provider: "mercadolivre",
              refreshToken: null,
              status: "connected",
              tokenExpiresAt: new Date("2030-01-01T00:00:00.000Z"),
            },
          ]),
        },
        products: {
          findMany: vi.fn().mockResolvedValue([]),
        },
      },
      update: vi.fn().mockReturnValue({
        set: updateSetMock,
      }),
    };

    const service = new OrdersService(db as never, {
      API_DB_POOL_MAX: 5,
      API_HOST: "127.0.0.1",
      API_PORT: 4000,
      BETTER_AUTH_SECRET: "secret",
      BETTER_AUTH_URL: "http://localhost:4000",
      DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/lucreii",
      MERCADOLIVRE_CLIENT_ID: "ml-client-id",
      MERCADOLIVRE_CLIENT_SECRET: "ml-client-secret",
      MERCADOLIVRE_REDIRECT_URI:
        "http://localhost:4000/integrations/mercadolivre/callback",
      NODE_ENV: "test",
      STRIPE_PRICE_START_MONTHLY: "price_start_monthly",
      STRIPE_PRICE_START_ANNUAL: "price_start_annual",
      STRIPE_PRICE_PRO_MONTHLY: "price_pro_monthly",
      STRIPE_PRICE_PRO_ANNUAL: "price_pro_annual",
      STRIPE_PRICE_BUSINESS_MONTHLY: "price_business_monthly",
      STRIPE_PRICE_BUSINESS_ANNUAL: "price_business_annual",
      STRIPE_SECRET_KEY: "stripe",
      STRIPE_WEBHOOK_SECRET: "webhook",
      SYNC_RELAX_GUARDS: false,
      WEB_APP_ORIGIN: "http://localhost:3000",
    });

    const result = await service.listOrders(
      {
        organizationId: "org_123",
        selectedCompanyId: "company_123",
        userId: "user_123",
      },
      {
        page: 1,
        pageSize: 10,
      },
    );

    expect(result.items[0]).toEqual(
      expect.objectContaining({
        shippingAmount: "5.65",
      }),
    );
    expect(updateSetMock).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: "5.65",
        metadata: expect.objectContaining({
          source: "billing/integration/group/ML/order/details",
        }),
      }),
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("falls back to fixed fee in composition when shipment list cost is unavailable", async () => {
    const db = {
      query: {
        companies: {
          findFirst: vi.fn().mockResolvedValue({
            id: "company_123",
            taxRateDefault: "0.120000",
          }),
        },
        products: {
          findMany: vi.fn().mockResolvedValue([]),
        },
        externalOrders: {
          findMany: vi.fn().mockResolvedValue([
            {
              id: "order_row_1",
              companyId: "company_123",
              createdAt: new Date("2026-07-04T12:00:00.000Z"),
              currency: "BRL",
              externalOrderId: "2000013565643849",
              metadata: {},
              orderedAt: new Date("2026-07-04T10:15:00.000Z"),
              organizationId: "org_123",
              provider: "mercadolivre",
              status: "paid",
              syncRunId: null,
              updatedAt: new Date("2026-07-04T12:00:00.000Z"),
              totalAmount: "200.00",
              items: [],
              fees: [
                {
                  amount: "0.00",
                  currency: "BRL",
                  feeType: "shipping_cost",
                  id: "fee_ship",
                  metadata: {},
                },
                {
                  amount: "2.79",
                  currency: "BRL",
                  feeType: "fixed_fee",
                  id: "fee_fixed",
                  metadata: {},
                },
              ],
            },
          ]),
        },
      },
    };

    const service = new OrdersService(db as never);
    const result = await service.listOrders(
      {
        organizationId: "org_123",
        selectedCompanyId: "company_123",
        userId: "user_123",
      },
      {
        page: 1,
        pageSize: 10,
      },
    );

    expect(result.items[0]).toEqual(
      expect.objectContaining({
        fixedCostAmount: "2.79",
        shippingAmount: "0.00",
      }),
    );
    expect(result.items[0]?.totalFees).toBe("2.79");
  });

  it("prefers linked catalog sku over external marketplace sku in order details", async () => {
    const db = {
      query: {
        companies: {
          findFirst: vi.fn().mockResolvedValue({
            id: "company_123",
            taxRateDefault: "0.100000",
          }),
        },
        externalOrders: {
          findFirst: vi.fn().mockResolvedValue({
            id: "order_row_1",
            companyId: "company_123",
            createdAt: new Date("2026-06-24T12:00:00.000Z"),
            currency: "BRL",
            externalOrderId: "2000017085667456",
            marketplaceConnectionId: "conn_1",
            metadata: {},
            orderedAt: new Date("2026-06-24T10:15:00.000Z"),
            organizationId: "org_123",
            provider: "mercadolivre",
            status: "paid",
            syncRunId: null,
            updatedAt: new Date("2026-06-24T12:00:00.000Z"),
            totalAmount: "120.00",
            items: [
              {
                id: "item_1",
                quantity: 1,
                totalPrice: "120.00",
                unitPrice: "120.00",
                externalProduct: {
                  id: "ext_prod_1",
                  linkedProductId: "product_1",
                  sku: "ML-9238238958323",
                  title: "Produto 1",
                },
              },
            ],
            fees: [],
          }),
        },
        marketplaceConnections: {
          findMany: vi.fn().mockResolvedValue([]),
        },
        products: {
          findMany: vi.fn().mockResolvedValue([
            {
              financeDefaults: {
                packagingCost: "0.00",
              },
              id: "product_1",
              images: [],
              name: "Produto 1",
              productCosts: [
                {
                  amount: "50.00",
                  createdAt: new Date("2026-06-01T00:00:00.000Z"),
                  effectiveFrom: new Date("2026-06-01T00:00:00.000Z"),
                },
              ],
              sku: "CALCAPRETA39",
            },
          ]),
        },
      },
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      }),
    };

    const service = new OrdersService(db as never, {
      API_DB_POOL_MAX: 5,
      API_HOST: "127.0.0.1",
      API_PORT: 4000,
      BETTER_AUTH_SECRET: "secret",
      BETTER_AUTH_URL: "http://localhost:4000",
      DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/lucreii",
      MERCADOLIVRE_CLIENT_ID: "ml-client-id",
      MERCADOLIVRE_CLIENT_SECRET: "ml-client-secret",
      MERCADOLIVRE_REDIRECT_URI:
        "http://localhost:4000/integrations/mercadolivre/callback",
      NODE_ENV: "test",
      STRIPE_PRICE_START_MONTHLY: "price_start_monthly",
      STRIPE_PRICE_START_ANNUAL: "price_start_annual",
      STRIPE_PRICE_PRO_MONTHLY: "price_pro_monthly",
      STRIPE_PRICE_PRO_ANNUAL: "price_pro_annual",
      STRIPE_PRICE_BUSINESS_MONTHLY: "price_business_monthly",
      STRIPE_PRICE_BUSINESS_ANNUAL: "price_business_annual",
      STRIPE_SECRET_KEY: "stripe",
      STRIPE_WEBHOOK_SECRET: "webhook",
      SYNC_RELAX_GUARDS: false,
      WEB_APP_ORIGIN: "http://localhost:3000",
    });

    const result = await service.getOrderDetails(
      {
        organizationId: "org_123",
        selectedCompanyId: "company_123",
        userId: "user_123",
      },
      "order_row_1",
    );

    expect(result.order.skus).toEqual(["CALCAPRETA39"]);
    expect(result.items).toEqual([
      expect.objectContaining({
        linkedProductId: "product_1",
        sku: "CALCAPRETA39",
      }),
    ]);
  });

  it("refreshes Mercado Livre sale id when stored operationId is incorrectly equal to externalOrderId", async () => {
    const updateWhereMock = vi.fn().mockResolvedValue([]);
    const updateSetMock = vi.fn().mockReturnValue({
      where: updateWhereMock,
    });
    const fetchMock = vi.fn().mockImplementation((input: string | URL) => {
      const url = String(input);

      if (url.includes("/orders/search")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              paging: { limit: 50, offset: 0, total: 0 },
              results: [],
            }),
            {
              headers: { "content-type": "application/json" },
              status: 200,
            },
          ),
        );
      }

      return Promise.resolve(
        new Response(
          JSON.stringify({
            limit: 1000,
            offset: 0,
            results: [
              {
                order_id: 2000017085667456,
              },
              {
                operation_id: 2000013674359901,
                order_id: 2000017085667456,
              },
            ],
            total: 2,
          }),
          {
            headers: { "content-type": "application/json" },
            status: 200,
          },
        ),
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const db = {
      query: {
        companies: {
          findFirst: vi.fn().mockResolvedValue({
            id: "company_123",
            taxRateDefault: "0.100000",
          }),
        },
        externalOrders: {
          findFirst: vi.fn().mockResolvedValue({
            id: "order_row_1",
            companyId: "company_123",
            createdAt: new Date("2026-06-24T12:00:00.000Z"),
            currency: "BRL",
            externalOrderId: "2000017085667456",
            marketplaceConnectionId: "conn_1",
            metadata: {
              operationId: "2000017085667456",
            },
            orderedAt: new Date("2026-06-24T10:15:00.000Z"),
            organizationId: "org_123",
            provider: "mercadolivre",
            status: "paid",
            syncRunId: null,
            updatedAt: new Date("2026-06-24T12:00:00.000Z"),
            totalAmount: "200.00",
            items: [],
            fees: [],
          }),
        },
        marketplaceConnections: {
          findMany: vi.fn().mockResolvedValue([
            {
              accessToken: "token_123",
              companyId: "company_123",
              externalAccountId: "seller_1",
              id: "conn_1",
              metadata: {},
              organizationId: "org_123",
              provider: "mercadolivre",
              refreshToken: null,
              status: "connected",
              tokenExpiresAt: new Date("2030-01-01T00:00:00.000Z"),
            },
          ]),
        },
        products: {
          findMany: vi.fn().mockResolvedValue([]),
        },
      },
      update: vi.fn().mockReturnValue({
        set: updateSetMock,
      }),
    };

    const service = new OrdersService(db as never, {
      API_DB_POOL_MAX: 5,
      API_HOST: "127.0.0.1",
      API_PORT: 4000,
      BETTER_AUTH_SECRET: "secret",
      BETTER_AUTH_URL: "http://localhost:4000",
      DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/lucreii",
      MERCADOLIVRE_CLIENT_ID: "ml-client-id",
      MERCADOLIVRE_CLIENT_SECRET: "ml-client-secret",
      MERCADOLIVRE_REDIRECT_URI:
        "http://localhost:4000/integrations/mercadolivre/callback",
      NODE_ENV: "test",
      STRIPE_PRICE_START_MONTHLY: "price_start_monthly",
      STRIPE_PRICE_START_ANNUAL: "price_start_annual",
      STRIPE_PRICE_PRO_MONTHLY: "price_pro_monthly",
      STRIPE_PRICE_PRO_ANNUAL: "price_pro_annual",
      STRIPE_PRICE_BUSINESS_MONTHLY: "price_business_monthly",
      STRIPE_PRICE_BUSINESS_ANNUAL: "price_business_annual",
      STRIPE_SECRET_KEY: "stripe",
      STRIPE_WEBHOOK_SECRET: "webhook",
      SYNC_RELAX_GUARDS: false,
      WEB_APP_ORIGIN: "http://localhost:3000",
    });

    const result = await service.getOrderDetails(
      {
        organizationId: "org_123",
        selectedCompanyId: "company_123",
        userId: "user_123",
      },
      "order_row_1",
    );

    expect(result.order.displayOrderId).toBe("2000013674359901");
    expect(updateSetMock).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          operationId: "2000013674359901",
        }),
      }),
    );
  });

  it("prefers Mercado Livre operation_id as displayed order id", async () => {
    const db = {
      query: {
        companies: {
          findFirst: vi.fn().mockResolvedValue({
            id: "company_123",
            taxRateDefault: "0.100000",
          }),
        },
        externalOrders: {
          findMany: vi.fn().mockResolvedValue([
            {
              id: "order_row_1",
              companyId: "company_123",
              createdAt: new Date("2026-06-20T12:00:00.000Z"),
              currency: "BRL",
              externalOrderId: "MLB-ORDER-1001",
              metadata: {
                operationId: "MLB-SALE-9001",
              },
              orderedAt: new Date("2026-06-20T10:15:00.000Z"),
              organizationId: "org_123",
              provider: "mercadolivre",
              status: "paid",
              syncRunId: null,
              updatedAt: new Date("2026-06-20T12:00:00.000Z"),
              totalAmount: "200.00",
              items: [],
              fees: [],
            },
          ]),
        },
        products: {
          findMany: vi.fn().mockResolvedValue([]),
        },
      },
    };

    const service = new OrdersService(db as never);
    const result = await service.listOrders(
      {
        organizationId: "org_123",
        selectedCompanyId: "company_123",
        userId: "user_123",
      },
      {},
    );

    expect(result.items[0]).toEqual(
      expect.objectContaining({
        displayOrderId: "MLB-SALE-9001",
        orderId: "MLB-ORDER-1001",
      }),
    );
  });

  it("backfills Mercado Livre pack_id in listOrders when marketplaceConnectionId is missing", async () => {
    const updateWhereMock = vi.fn().mockResolvedValue([]);
    const updateSetMock = vi.fn().mockReturnValue({
      where: updateWhereMock,
    });
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          paging: { limit: 50, offset: 0, total: 1 },
          results: [
            {
              id: 2000017022360746,
              pack_id: 2000013607301987,
            },
          ],
        }),
        {
          headers: { "content-type": "application/json" },
          status: 200,
        },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const db = {
      query: {
        companies: {
          findFirst: vi.fn().mockResolvedValue({
            id: "company_123",
            taxRateDefault: "0.100000",
          }),
        },
        externalOrders: {
          findMany: vi.fn().mockResolvedValue([
            {
              id: "order_row_1",
              companyId: "company_123",
              createdAt: new Date("2026-06-19T20:35:00.000Z"),
              currency: "BRL",
              externalOrderId: "2000017022360746",
              marketplaceConnectionId: null,
              metadata: {},
              orderedAt: new Date("2026-06-19T20:35:00.000Z"),
              organizationId: "org_123",
              provider: "mercadolivre",
              status: "paid",
              syncRunId: null,
              updatedAt: new Date("2026-06-19T20:35:00.000Z"),
              totalAmount: "59.80",
              items: [],
              fees: [],
            },
          ]),
        },
        marketplaceConnections: {
          findMany: vi.fn().mockResolvedValue([
            {
              accessToken: "token_123",
              companyId: "company_123",
              externalAccountId: "seller_1",
              id: "conn_1",
              metadata: {},
              organizationId: "org_123",
              provider: "mercadolivre",
              refreshToken: null,
              status: "connected",
              tokenExpiresAt: new Date("2030-01-01T00:00:00.000Z"),
            },
          ]),
        },
        products: {
          findMany: vi.fn().mockResolvedValue([]),
        },
      },
      update: vi.fn().mockReturnValue({
        set: updateSetMock,
      }),
    };

    const service = new OrdersService(db as never, {
      API_DB_POOL_MAX: 5,
      API_HOST: "127.0.0.1",
      API_PORT: 4000,
      BETTER_AUTH_SECRET: "secret",
      BETTER_AUTH_URL: "http://localhost:4000",
      DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/lucreii",
      MERCADOLIVRE_CLIENT_ID: "ml-client-id",
      MERCADOLIVRE_CLIENT_SECRET: "ml-client-secret",
      MERCADOLIVRE_REDIRECT_URI:
        "http://localhost:4000/integrations/mercadolivre/callback",
      NODE_ENV: "test",
      STRIPE_PRICE_START_MONTHLY: "price_start_monthly",
      STRIPE_PRICE_START_ANNUAL: "price_start_annual",
      STRIPE_PRICE_PRO_MONTHLY: "price_pro_monthly",
      STRIPE_PRICE_PRO_ANNUAL: "price_pro_annual",
      STRIPE_PRICE_BUSINESS_MONTHLY: "price_business_monthly",
      STRIPE_PRICE_BUSINESS_ANNUAL: "price_business_annual",
      STRIPE_SECRET_KEY: "stripe",
      STRIPE_WEBHOOK_SECRET: "webhook",
      SYNC_RELAX_GUARDS: false,
      WEB_APP_ORIGIN: "http://localhost:3000",
    });

    const result = await service.listOrders(
      {
        organizationId: "org_123",
        selectedCompanyId: "company_123",
        userId: "user_123",
      },
      {},
    );

    expect(result.items[0]).toEqual(
      expect.objectContaining({
        displayOrderId: "2000013607301987",
        orderId: "2000017022360746",
      }),
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(updateSetMock).toHaveBeenCalledWith(
      expect.objectContaining({
        marketplaceConnectionId: "conn_1",
        metadata: expect.objectContaining({
          packId: "2000013607301987",
        }),
      }),
    );
  });

  it("refreshes cached Mercado Livre pack map when a previous miss omitted the sale id", async () => {
    const updateWhereMock = vi.fn().mockResolvedValue([]);
    const updateSetMock = vi.fn().mockReturnValue({
      where: updateWhereMock,
    });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            paging: { limit: 50, offset: 0, total: 0 },
            results: [],
            total: 0,
          }),
          {
            headers: { "content-type": "application/json" },
            status: 200,
          },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            paging: { limit: 50, offset: 0, total: 1 },
            results: [
              {
                id: 2000017022360746,
                pack_id: 2000013607301987,
              },
            ],
            total: 1,
          }),
          {
            headers: { "content-type": "application/json" },
            status: 200,
          },
        ),
      );
    vi.stubGlobal("fetch", fetchMock);

    const db = {
      query: {
        companies: {
          findFirst: vi.fn().mockResolvedValue({
            id: "company_123",
            taxRateDefault: "0.100000",
          }),
        },
        externalOrders: {
          findMany: vi.fn().mockResolvedValue([
            {
              id: "order_row_1",
              companyId: "company_123",
              createdAt: new Date("2026-06-19T20:35:00.000Z"),
              currency: "BRL",
              externalOrderId: "2000017022360746",
              marketplaceConnectionId: "conn_1",
              metadata: {},
              orderedAt: new Date("2026-06-19T20:35:00.000Z"),
              organizationId: "org_123",
              provider: "mercadolivre",
              status: "paid",
              syncRunId: null,
              updatedAt: new Date("2026-06-19T20:35:00.000Z"),
              totalAmount: "59.80",
              items: [],
              fees: [],
            },
          ]),
        },
        marketplaceConnections: {
          findMany: vi.fn().mockResolvedValue([
            {
              accessToken: "token_123",
              companyId: "company_123",
              externalAccountId: "seller_1",
              id: "conn_1",
              metadata: {},
              organizationId: "org_123",
              provider: "mercadolivre",
              refreshToken: null,
              status: "connected",
              tokenExpiresAt: new Date("2030-01-01T00:00:00.000Z"),
            },
          ]),
        },
        products: {
          findMany: vi.fn().mockResolvedValue([]),
        },
      },
      update: vi.fn().mockReturnValue({
        set: updateSetMock,
      }),
    };

    const service = new OrdersService(db as never, {
      API_DB_POOL_MAX: 5,
      API_HOST: "127.0.0.1",
      API_PORT: 4000,
      BETTER_AUTH_SECRET: "secret",
      BETTER_AUTH_URL: "http://localhost:4000",
      DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/lucreii",
      MERCADOLIVRE_CLIENT_ID: "ml-client-id",
      MERCADOLIVRE_CLIENT_SECRET: "ml-client-secret",
      MERCADOLIVRE_REDIRECT_URI:
        "http://localhost:4000/integrations/mercadolivre/callback",
      NODE_ENV: "test",
      STRIPE_PRICE_START_MONTHLY: "price_start_monthly",
      STRIPE_PRICE_START_ANNUAL: "price_start_annual",
      STRIPE_PRICE_PRO_MONTHLY: "price_pro_monthly",
      STRIPE_PRICE_PRO_ANNUAL: "price_pro_annual",
      STRIPE_PRICE_BUSINESS_MONTHLY: "price_business_monthly",
      STRIPE_PRICE_BUSINESS_ANNUAL: "price_business_annual",
      STRIPE_SECRET_KEY: "stripe",
      STRIPE_WEBHOOK_SECRET: "webhook",
      SYNC_RELAX_GUARDS: false,
      WEB_APP_ORIGIN: "http://localhost:3000",
    });

    const first = await service.listOrders(
      {
        organizationId: "org_123",
        selectedCompanyId: "company_123",
        userId: "user_123",
      },
      {},
    );

    const second = await service.listOrders(
      {
        organizationId: "org_123",
        selectedCompanyId: "company_123",
        userId: "user_123",
      },
      {},
    );

    expect(first.items[0]).toEqual(
      expect.objectContaining({
        displayOrderId: "2000013607301987",
      }),
    );
    expect(second.items[0]).toEqual(
      expect.objectContaining({
        displayOrderId: "2000013607301987",
      }),
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("prefers Mercado Livre pack_id over operationId when both are present", async () => {
    const db = {
      query: {
        companies: {
          findFirst: vi.fn().mockResolvedValue({
            id: "company_123",
            taxRateDefault: "0.100000",
          }),
        },
        externalOrders: {
          findMany: vi.fn().mockResolvedValue([
            {
              id: "order_row_1",
              companyId: "company_123",
              createdAt: new Date("2026-06-19T20:35:00.000Z"),
              currency: "BRL",
              externalOrderId: "2000017022360746",
              marketplaceConnectionId: "conn_1",
              metadata: {
                operationId: "2000013674359901",
                packId: "2000013607301987",
              },
              orderedAt: new Date("2026-06-19T20:35:00.000Z"),
              organizationId: "org_123",
              provider: "mercadolivre",
              status: "paid",
              syncRunId: null,
              updatedAt: new Date("2026-06-19T20:35:00.000Z"),
              totalAmount: "59.80",
              items: [],
              fees: [],
            },
          ]),
        },
        products: {
          findMany: vi.fn().mockResolvedValue([]),
        },
      },
    };

    const service = new OrdersService(db as never);
    const result = await service.listOrders(
      {
        organizationId: "org_123",
        selectedCompanyId: "company_123",
        userId: "user_123",
      },
      {},
    );

    expect(result.items[0]).toEqual(
      expect.objectContaining({
        displayOrderId: "2000013607301987",
        orderId: "2000017022360746",
      }),
    );
  });

  it("persists composition overrides and recalculates derived metrics", async () => {
    const updateSetMock = vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([
          {
            id: "order_row_1",
          },
        ]),
      }),
    });
    const db = {
      query: {
        companies: {
          findFirst: vi.fn().mockResolvedValue({
            id: "company_123",
            taxRateDefault: "0.120000",
          }),
        },
        products: {
          findMany: vi.fn().mockResolvedValue([
            {
              financeDefaults: {
                packagingCost: "4.00",
              },
              id: "product_1",
              images: [],
              name: "Produto 1",
              productCosts: [
                {
                  amount: "21.50",
                  createdAt: new Date("2026-06-01T00:00:00.000Z"),
                  effectiveFrom: new Date("2026-06-01T00:00:00.000Z"),
                },
              ],
            },
          ]),
        },
        externalOrders: {
          findFirst: vi
            .fn()
            .mockResolvedValueOnce({
              id: "order_row_1",
              companyId: "company_123",
              createdAt: new Date("2026-06-20T12:00:00.000Z"),
              currency: "BRL",
              externalOrderId: "MLB-1001",
              metadata: {},
              orderedAt: new Date("2026-06-20T10:15:00.000Z"),
              organizationId: "org_123",
              provider: "mercadolivre",
              status: "paid",
              syncRunId: null,
              updatedAt: new Date("2026-06-20T12:00:00.000Z"),
              totalAmount: "200.00",
              items: [
                {
                  id: "item_1",
                  quantity: 2,
                  totalPrice: "120.00",
                  unitPrice: "60.00",
                  externalProduct: {
                    id: "ext_prod_1",
                    linkedProductId: "product_1",
                    sku: "SKU-1",
                    title: "Produto 1",
                  },
                },
              ],
              fees: [
                {
                  amount: "20.00",
                  feeType: "shipping_cost",
                  id: "fee_ship",
                  metadata: {},
                },
                {
                  amount: "3.00",
                  feeType: "fixed_fee",
                  id: "fee_fixed",
                  metadata: {},
                },
                {
                  amount: "10.00",
                  feeType: "marketplace_commission",
                  id: "fee_commission",
                  metadata: {},
                },
              ],
            })
            .mockResolvedValueOnce({
              id: "order_row_1",
              companyId: "company_123",
              createdAt: new Date("2026-06-20T12:00:00.000Z"),
              currency: "BRL",
              externalOrderId: "SHP-1001",
              metadata: {
                compositionOverrides: {
                  marketplaceCommissionAmount: "15.00",
                  packagingCostAmount: "12.00",
                  productCostAmount: "80.00",
                  refundBonusAmount: "5.00",
                  shippingOrFixedFeeAmount: "30.00",
                },
              },
              orderedAt: new Date("2026-06-20T10:15:00.000Z"),
              organizationId: "org_123",
              provider: "mercadolivre",
              status: "paid",
              syncRunId: null,
              updatedAt: new Date("2026-06-20T12:00:00.000Z"),
              totalAmount: "200.00",
              items: [
                {
                  id: "item_1",
                  quantity: 2,
                  totalPrice: "120.00",
                  unitPrice: "60.00",
                  externalProduct: {
                    id: "ext_prod_1",
                    linkedProductId: "product_1",
                    sku: "SKU-1",
                    title: "Produto 1",
                  },
                },
              ],
              fees: [
                {
                  amount: "20.00",
                  feeType: "shipping_cost",
                  id: "fee_ship",
                  metadata: {},
                },
                {
                  amount: "3.00",
                  feeType: "fixed_fee",
                  id: "fee_fixed",
                  metadata: {},
                },
                {
                  amount: "10.00",
                  feeType: "marketplace_commission",
                  id: "fee_commission",
                  metadata: {},
                },
              ],
            }),
        },
      },
      update: vi.fn().mockReturnValue({
        set: updateSetMock,
      }),
    };

    const service = new OrdersService(db as never);
    const result = await service.updateOrderComposition(
      {
        organizationId: "org_123",
        selectedCompanyId: "company_123",
        userId: "user_123",
      },
      "order_row_1",
      {
        marketplaceCommissionAmount: "15.00",
        packagingCostAmount: "12.00",
        productCostAmount: "80.00",
        refundBonusAmount: "5.00",
        shippingOrFixedFeeAmount: "30.00",
      },
    );

    expect(updateSetMock).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          compositionOverrides: {
            marketplaceCommissionAmount: "15.00",
            packagingCostAmount: "12.00",
            productCostAmount: "80.00",
            refundBonusAmount: "5.00",
            shippingOrFixedFeeAmount: "30.00",
          },
        }),
      }),
    );
    expect(result.composition).toEqual(
      expect.objectContaining({
        marketplaceCommissionAmount: "15.00",
        packagingCostAmount: "12.00",
        productCostAmount: "80.00",
        refundBonusAmount: "5.00",
        shippingOrFixedFeeAmount: "30.00",
        taxAmount: "24.00",
      }),
    );
    expect(result.order).toEqual(
      expect.objectContaining({
        contributionMarginPercent: "22.00",
        totalProfitAmount: "44.00",
      }),
    );
  });

  it("lists only orders from selected company and derives table totals", async () => {
    const db = {
      query: {
        products: {
          findMany: vi.fn().mockResolvedValue([
            {
              financeDefaults: {
                packagingCost: "4.00",
              },
              id: "product_1",
              images: [],
              name: "Produto 1",
              productCosts: [
                {
                  amount: "21.50",
                  createdAt: new Date("2026-06-01T00:00:00.000Z"),
                  effectiveFrom: new Date("2026-06-01T00:00:00.000Z"),
                },
              ],
            },
          ]),
        },
        externalOrders: {
          findMany: vi.fn().mockResolvedValue([
            {
              id: "order_row_1",
              companyId: "company_123",
              createdAt: new Date("2026-06-20T12:00:00.000Z"),
              currency: "BRL",
              externalOrderId: "MLB-1001",
              metadata: {},
              orderedAt: new Date("2026-06-20T10:15:00.000Z"),
              organizationId: "org_123",
              provider: "mercadolivre",
              status: "paid",
              syncRunId: null,
              updatedAt: new Date("2026-06-20T12:00:00.000Z"),
              totalAmount: "200.00",
              items: [
                {
                  id: "item_1",
                  quantity: 2,
                  totalPrice: "120.00",
                  unitPrice: "60.00",
                  externalProduct: {
                    id: "ext_prod_1",
                    linkedProductId: "product_1",
                    sku: "SKU-1",
                    title: "Produto 1",
                  },
                },
                {
                  id: "item_2",
                  quantity: 1,
                  totalPrice: "80.00",
                  unitPrice: "80.00",
                  externalProduct: {
                    id: "ext_prod_2",
                    linkedProductId: null,
                    sku: "SKU-2",
                    title: "Produto 2",
                  },
                },
              ],
              fees: [
                {
                  amount: "20.00",
                  feeType: "shipping_cost",
                  id: "fee_ship",
                  metadata: {},
                },
                {
                  amount: "3.00",
                  feeType: "fixed_fee",
                  id: "fee_fixed",
                  metadata: {},
                },
                {
                  amount: "10.00",
                  feeType: "marketplace_commission",
                  id: "fee_commission",
                  metadata: {},
                },
              ],
            },
          ]),
        },
        companies: {
          findFirst: vi.fn().mockResolvedValue({
            id: "company_123",
            taxRateDefault: "0.120000",
          }),
        },
      },
    };

    const service = new OrdersService(db as never);

    await expect(
      service.listOrders(
        {
          organizationId: "org_123",
          selectedCompanyId: "company_123",
          userId: "user_123",
        },
        {
          page: 1,
          pageSize: 10,
          provider: undefined,
          search: undefined,
          status: undefined,
        },
      ),
    ).resolves.toEqual({
      summary: {
        averageMargin: "0.5800",
        grossProfit: "116.0000",
        grossRevenue: "200.0000",
        ordersCount: 1,
        unitsSold: 3,
      },
      availableStatuses: expect.arrayContaining([
        { label: "Pagamento pendente", value: "confirmed" },
        { label: "Pagamento aprovado", value: "paid" },
        { label: "Cancelado", value: "cancelled" },
      ]),
        items: [
          expect.objectContaining({
            contributionMarginPercent: null,
            fixedCostAmount: "3.00",
            itemsSold: 3,
            orderId: "MLB-1001",
            shippingAmount: "20.00",
            sourceStatus: "paid",
            tariffAmount: "10.00",
            status: "paid",
            statusLabel: "Pagamento aprovado",
            totalFees: "33.00",
            totalProfitAmount: null,
            totalWithFees: "200.00",
            totalWithoutFees: "167.00",
          }),
        ],
      page: 1,
      pageSize: 10,
      totalItems: 1,
      totalPages: 1,
    });
  });

  it("returns order detail with products table rows", async () => {
    const db = {
      query: {
        companies: {
          findFirst: vi.fn().mockResolvedValue({
            id: "company_123",
            taxRateDefault: "0.120000",
          }),
        },
        products: {
          findMany: vi.fn().mockResolvedValue([
            {
              id: "product_1",
              name: "Produto Pai",
              financeDefaults: {
                packagingCost: "4.00",
              },
              images: [
                {
                  position: 1,
                  url: "https://cdn.example.com/product-1-secondary.jpg",
                },
                {
                  position: 0,
                  url: "https://cdn.example.com/product-1-cover.jpg",
                },
              ],
              productCosts: [
                {
                  amount: "21.50",
                  createdAt: new Date("2026-06-01T00:00:00.000Z"),
                  effectiveFrom: new Date("2026-06-01T00:00:00.000Z"),
                },
              ],
            },
          ]),
        },
        externalOrders: {
          findFirst: vi.fn().mockResolvedValue({
            id: "order_row_1",
            companyId: "company_123",
            createdAt: new Date("2026-06-20T12:00:00.000Z"),
            currency: "BRL",
            externalOrderId: "SHP-1001",
            metadata: {},
            orderedAt: new Date("2026-06-20T10:15:00.000Z"),
            organizationId: "org_123",
            provider: "shopee",
            status: "completed",
            syncRunId: null,
            updatedAt: new Date("2026-06-20T12:00:00.000Z"),
            totalAmount: "200.00",
            items: [
              {
                id: "item_1",
                quantity: 2,
                totalPrice: "120.00",
                unitPrice: "60.00",
                externalProduct: {
                  id: "ext_prod_1",
                  linkedProductId: "product_1",
                  externalProductId: "MLB123:VAR1",
                  linkedProduct: {
                    id: "product_1",
                    name: "Produto Pai",
                  },
                  metadata: {
                    itemId: "MLB123",
                    variationId: "VAR1",
                },
                provider: "mercadolivre",
                sku: "SKU-1",
                title: "Cor: Azul",
              },
              },
              {
                id: "item_2",
                quantity: 1,
                totalPrice: "80.00",
                unitPrice: "80.00",
                externalProduct: {
                  id: "ext_prod_2",
                  linkedProductId: null,
                  externalProductId: "EXT-2",
                  linkedProduct: null,
                  metadata: {},
                  provider: "shopee",
                  sku: "SKU-2",
                  title: "Produto 2",
                },
              },
            ],
            fees: [
              {
                amount: "20.00",
                feeType: "shipping_cost",
                id: "fee_ship",
                metadata: {},
              },
              {
                amount: "3.00",
                feeType: "fixed_fee",
                id: "fee_fixed",
                metadata: {},
              },
            ],
          }),
        },
      },
    };

    const service = new OrdersService(db as never);

    await expect(
      service.getOrderDetails(
        {
          organizationId: "org_123",
          selectedCompanyId: "company_123",
          userId: "user_123",
        },
        "order_row_1",
      ),
    ).resolves.toEqual(
      expect.objectContaining({
        composition: {
          hasIncompleteCostData: true,
          marketplaceCommissionAmount: "0.00",
          missingCostItemsCount: 1,
          missingLinkedItemsCount: 1,
          netRevenueAmount: "177.00",
          packagingCostAmount: "8.00",
          productCostAmount: "43.00",
          refundBonusAmount: "0.00",
          revenueAmount: "200.00",
          shippingOrFixedFeeAmount: "23.00",
          taxAmount: "24.00",
          taxRateDefault: "0.120000",
        },
        items: expect.arrayContaining([
          expect.objectContaining({
            channel: "shopee",
            contributionMarginPercent: "46.00",
            displayName: "Cor: Azul | Produto Pai",
            imageUrl: "https://cdn.example.com/product-1-cover.jpg",
            netRevenueAmount: "106.20",
            orderedAt: "2026-06-20T10:15:00.000Z",
            productName: "Cor: Azul",
            quantity: 2,
            sku: "SKU-1",
            totalProfitAmount: "55.20",
            totalPrice: "120.00",
            unitPrice: "60.00",
          }),
          expect.objectContaining({
            channel: "shopee",
            contributionMarginPercent: null,
            netRevenueAmount: "70.80",
            totalProfitAmount: null,
          }),
        ]),
        order: expect.objectContaining({
          contributionMarginPercent: null,
          sourceStatus: "completed",
          tariffAmount: "0.00",
          orderId: "SHP-1001",
          provider: "shopee",
          status: "paid",
          statusLabel: "Pagamento aprovado",
          totalProfitAmount: null,
        }),
      }),
    );
  });

  it("returns Mercado Livre MLBU items with parent plus variation display name", async () => {
    const db = {
      query: {
        companies: {
          findFirst: vi.fn().mockResolvedValue({
            id: "company_123",
            taxRateDefault: "0.120000",
          }),
        },
        products: {
          findMany: vi.fn().mockResolvedValue([
            {
              id: "product_1",
              name: "Bota Feminina Via Uno",
              financeDefaults: {
                packagingCost: "4.00",
              },
              images: [],
              productCosts: [
                {
                  amount: "21.50",
                  createdAt: new Date("2026-06-01T00:00:00.000Z"),
                  effectiveFrom: new Date("2026-06-01T00:00:00.000Z"),
                },
              ],
            },
          ]),
        },
        externalOrders: {
          findFirst: vi.fn().mockResolvedValue({
            id: "order_row_1",
            companyId: "company_123",
            createdAt: new Date("2026-06-20T12:00:00.000Z"),
            currency: "BRL",
            externalOrderId: "ML-1001",
            metadata: {},
            orderedAt: new Date("2026-06-20T10:15:00.000Z"),
            organizationId: "org_123",
            provider: "mercadolivre",
            status: "paid",
            syncRunId: null,
            updatedAt: new Date("2026-06-20T12:00:00.000Z"),
            totalAmount: "120.00",
            items: [
              {
                id: "item_1",
                quantity: 2,
                totalPrice: "120.00",
                unitPrice: "60.00",
                externalProduct: {
                  id: "ext_prod_child",
                  linkedProductId: "product_1",
                  externalProductId: "MLBU3845002628",
                  linkedProduct: {
                    id: "product_1",
                    name: "Bota Feminina Via Uno",
                  },
                  metadata: {
                    itemId: "840907750180115",
                    source: "mercadolivre-user-product",
                    userProductId: "MLBU3845002628",
                    variationId: "MLBU3845002628",
                  },
                  provider: "mercadolivre",
                  sku: "828011Preta37",
                  title: "Cor: Preto, Tamanho: 37 BR",
                },
              },
            ],
            fees: [],
          }),
        },
      },
    };

    const service = new OrdersService(db as never);

    await expect(
      service.getOrderDetails(
        {
          organizationId: "org_123",
          selectedCompanyId: "company_123",
          userId: "user_123",
        },
        "order_row_1",
      ),
    ).resolves.toEqual(
      expect.objectContaining({
        items: expect.arrayContaining([
          expect.objectContaining({
            displayName: "Cor: Preto, Tamanho: 37 BR | Bota Feminina Via Uno",
            productName: "Cor: Preto, Tamanho: 37 BR",
            sku: "828011Preta37",
          }),
        ]),
      }),
    );
  });

  it("rates fees proportionally across multiple items in order details", async () => {
    const db = {
      query: {
        companies: {
          findFirst: vi.fn().mockResolvedValue({
            id: "company_123",
            taxRateDefault: "0.120000",
          }),
        },
        products: {
          findMany: vi.fn().mockResolvedValue([
            {
              id: "product_1",
              financeDefaults: {
                packagingCost: "5.00",
              },
              images: [],
              name: "Produto A",
              productCosts: [
                {
                  amount: "50.00",
                  createdAt: new Date("2026-06-01T00:00:00.000Z"),
                  effectiveFrom: new Date("2026-06-01T00:00:00.000Z"),
                },
              ],
            },
            {
              id: "product_2",
              financeDefaults: {
                packagingCost: "1.00",
              },
              images: [],
              name: "Produto B",
              productCosts: [
                {
                  amount: "10.00",
                  createdAt: new Date("2026-06-01T00:00:00.000Z"),
                  effectiveFrom: new Date("2026-06-01T00:00:00.000Z"),
                },
              ],
            },
          ]),
        },
        externalOrders: {
          findFirst: vi.fn().mockResolvedValue({
            id: "order_row_2",
            companyId: "company_123",
            createdAt: new Date("2026-06-20T12:00:00.000Z"),
            currency: "BRL",
            externalOrderId: "MLB-2001",
            metadata: {},
            orderedAt: new Date("2026-06-20T10:15:00.000Z"),
            organizationId: "org_123",
            provider: "mercadolivre",
            refundBonusAmount: "4.00",
            status: "paid",
            syncRunId: null,
            updatedAt: new Date("2026-06-20T12:00:00.000Z"),
            totalAmount: "200.00",
            items: [
              {
                id: "item_1",
                quantity: 1,
                totalPrice: "150.00",
                unitPrice: "150.00",
                externalProduct: {
                  id: "ext_prod_1",
                  linkedProductId: "product_1",
                  externalProductId: "MLB-A",
                  linkedProduct: {
                    id: "product_1",
                    name: "Produto A",
                  },
                  metadata: {},
                  provider: "mercadolivre",
                  sku: "SKU-A",
                  title: "Produto A",
                },
              },
              {
                id: "item_2",
                quantity: 1,
                totalPrice: "50.00",
                unitPrice: "50.00",
                externalProduct: {
                  id: "ext_prod_2",
                  linkedProductId: "product_2",
                  externalProductId: "MLB-B",
                  linkedProduct: {
                    id: "product_2",
                    name: "Produto B",
                  },
                  metadata: {},
                  provider: "mercadolivre",
                  sku: "SKU-B",
                  title: "Produto B",
                },
              },
            ],
            fees: [
              {
                amount: "20.00",
                feeType: "shipping_cost",
                id: "fee_ship",
                metadata: {},
              },
              {
                amount: "10.00",
                feeType: "fixed_fee",
                id: "fee_fixed",
                metadata: {},
              },
              {
                amount: "40.00",
                feeType: "marketplace_commission",
                id: "fee_commission",
                metadata: {},
              },
            ],
          }),
        },
      },
    };

    const service = new OrdersService(db as never);

    await expect(
      service.getOrderDetails(
        {
          organizationId: "org_123",
          selectedCompanyId: "company_123",
          userId: "user_123",
        },
        "order_row_2",
      ),
    ).resolves.toEqual(
      expect.objectContaining({
        items: [
          expect.objectContaining({
            contributionMarginPercent: "30.33",
            netRevenueAmount: "100.50",
            totalProfitAmount: "45.50",
          }),
          expect.objectContaining({
            contributionMarginPercent: "45.00",
            netRevenueAmount: "33.50",
            totalProfitAmount: "22.50",
          }),
        ],
      }),
    );
  });

  it("adds refund bonus to order composition and proportional item net revenue", async () => {
    const db = {
      query: {
        companies: {
          findFirst: vi.fn().mockResolvedValue({
            id: "company_123",
            taxRateDefault: "0.120000",
          }),
        },
        products: {
          findMany: vi.fn().mockResolvedValue([
            {
              id: "product_1",
              financeDefaults: {
                packagingCost: "5.00",
              },
              images: [],
              name: "Produto A",
              productCosts: [
                {
                  amount: "50.00",
                  createdAt: new Date("2026-06-01T00:00:00.000Z"),
                  effectiveFrom: new Date("2026-06-01T00:00:00.000Z"),
                },
              ],
            },
            {
              id: "product_2",
              financeDefaults: {
                packagingCost: "1.00",
              },
              images: [],
              name: "Produto B",
              productCosts: [
                {
                  amount: "10.00",
                  createdAt: new Date("2026-06-01T00:00:00.000Z"),
                  effectiveFrom: new Date("2026-06-01T00:00:00.000Z"),
                },
              ],
            },
          ]),
        },
        externalOrders: {
          findFirst: vi.fn().mockResolvedValue({
            id: "order_row_2",
            companyId: "company_123",
            createdAt: new Date("2026-06-20T12:00:00.000Z"),
            currency: "BRL",
            externalOrderId: "MLB-2001",
            metadata: {},
            orderedAt: new Date("2026-06-20T10:15:00.000Z"),
            organizationId: "org_123",
            provider: "mercadolivre",
            refundBonusAmount: "4.00",
            status: "paid",
            syncRunId: null,
            updatedAt: new Date("2026-06-20T12:00:00.000Z"),
            totalAmount: "200.00",
            items: [
              {
                id: "item_1",
                quantity: 1,
                totalPrice: "150.00",
                unitPrice: "150.00",
                externalProduct: {
                  id: "ext_prod_1",
                  linkedProductId: "product_1",
                  externalProductId: "MLB-A",
                  linkedProduct: {
                    id: "product_1",
                    name: "Produto A",
                  },
                  metadata: {},
                  provider: "mercadolivre",
                  sku: "SKU-A",
                  title: "Produto A",
                },
              },
              {
                id: "item_2",
                quantity: 1,
                totalPrice: "50.00",
                unitPrice: "50.00",
                externalProduct: {
                  id: "ext_prod_2",
                  linkedProductId: "product_2",
                  externalProductId: "MLB-B",
                  linkedProduct: {
                    id: "product_2",
                    name: "Produto B",
                  },
                  metadata: {},
                  provider: "mercadolivre",
                  sku: "SKU-B",
                  title: "Produto B",
                },
              },
            ],
            fees: [
              {
                amount: "20.00",
                feeType: "shipping_cost",
                id: "fee_ship",
                metadata: {},
              },
              {
                amount: "10.00",
                feeType: "fixed_fee",
                id: "fee_fixed",
                metadata: {},
              },
              {
                amount: "40.00",
                feeType: "marketplace_commission",
                id: "fee_commission",
                metadata: {},
              },
            ],
          }),
        },
      },
    };

    const service = new OrdersService(db as never);

    await expect(
      service.getOrderDetails(
        {
          organizationId: "org_123",
          selectedCompanyId: "company_123",
          userId: "user_123",
        },
        "order_row_2",
      ),
    ).resolves.toEqual(
      expect.objectContaining({
        composition: expect.objectContaining({
          netRevenueAmount: "144.00",
          refundBonusAmount: "4.00",
        }),
        items: [
          expect.objectContaining({
            contributionMarginPercent: "30.33",
            netRevenueAmount: "100.50",
            totalProfitAmount: "45.50",
          }),
          expect.objectContaining({
            contributionMarginPercent: "45.00",
            netRevenueAmount: "33.50",
            totalProfitAmount: "22.50",
          }),
        ],
      }),
    );
  });

  it("formats negative contribution margin percent as valid decimal string", async () => {
    const db = {
      query: {
        companies: {
          findFirst: vi.fn().mockResolvedValue({
            id: "company_123",
            taxRateDefault: "0.120000",
          }),
        },
        products: {
          findMany: vi.fn().mockResolvedValue([
            {
              id: "product_1",
              financeDefaults: {
                packagingCost: "2.50",
              },
              images: [],
              name: "Cor: Transparente",
              productCosts: [
                {
                  amount: "20.00",
                  createdAt: new Date("2026-06-01T00:00:00.000Z"),
                  effectiveFrom: new Date("2026-06-01T00:00:00.000Z"),
                },
              ],
            },
          ]),
        },
        externalOrders: {
          findFirst: vi.fn().mockResolvedValue({
            id: "order_row_neg",
            companyId: "company_123",
            createdAt: new Date("2026-06-24T04:00:31.954Z"),
            currency: "BRL",
            externalOrderId: "2000017026965252",
            metadata: {},
            orderedAt: new Date("2026-06-20T02:55:39.000Z"),
            organizationId: "org_123",
            provider: "mercadolivre",
            status: "paid",
            syncRunId: null,
            updatedAt: new Date("2026-06-24T04:00:31.954Z"),
            totalAmount: "29.90",
            items: [
              {
                id: "item_neg",
                quantity: 1,
                totalPrice: "29.90",
                unitPrice: "29.90",
                externalProduct: {
                  externalProductId: "MLBNEG:VAR1",
                  id: "ext_prod_neg",
                  linkedProductId: "product_1",
                  linkedProduct: {
                    id: "product_1",
                    name: "Cor: Transparente",
                  },
                  metadata: {
                    itemId: "MLBNEG",
                    variationId: "VAR1",
                  },
                  provider: "mercadolivre",
                  sku: "ACESSORIO-TRANSPARENTE",
                  title: "Acessório De Unha - Não Ofertar",
                },
              },
            ],
            fees: [
              {
                amount: "3.89",
                feeType: "marketplace_commission",
                id: "fee_commission",
                metadata: {},
              },
              {
                amount: "6.65",
                feeType: "fixed_fee",
                id: "fee_fixed",
                metadata: {},
              },
            ],
          }),
        },
      },
    };

    const service = new OrdersService(db as never);

    await expect(
      service.getOrderDetails(
        {
          organizationId: "org_123",
          selectedCompanyId: "company_123",
          userId: "user_123",
        },
        "order_row_neg",
      ),
    ).resolves.toEqual(
      expect.objectContaining({
        items: [
          expect.objectContaining({
            displayName: "Acessório De Unha - Não Ofertar | Cor: Transparente",
            contributionMarginPercent: "-10.50",
            netRevenueAmount: "19.36",
            totalProfitAmount: "-3.14",
          }),
        ],
      }),
    );
  });

  it("maps MELI statuses canonically and preserves raw status", async () => {
    const db = {
      query: {
        companies: {
          findFirst: vi.fn().mockResolvedValue({
            id: "company_123",
            taxRateDefault: "0.100000",
          }),
        },
        externalOrders: {
          findMany: vi.fn().mockResolvedValue([
            {
              id: "order_row_1",
              companyId: "company_123",
              createdAt: new Date("2026-06-20T12:00:00.000Z"),
              currency: "BRL",
              externalOrderId: "MLB-1002",
              metadata: {},
              orderedAt: new Date("2026-06-20T10:15:00.000Z"),
              organizationId: "org_123",
              provider: "mercadolivre",
              status: "payment_in_process",
              syncRunId: null,
              updatedAt: new Date("2026-06-20T12:00:00.000Z"),
              totalAmount: "200.00",
              items: [],
              fees: [],
            },
          ]),
        },
      },
    };

    const service = new OrdersService(db as never);
    const result = await service.listOrders(
      {
        organizationId: "org_123",
        selectedCompanyId: "company_123",
        userId: "user_123",
      },
      {},
    );

    expect(result.items[0]).toEqual(
      expect.objectContaining({
        sourceStatus: "payment_in_process",
        status: "payment_in_process",
        statusLabel: "Pagamento em processamento",
      }),
    );
  });

  it("filters orders by inclusive ordered date range before pagination", async () => {
    const db = {
      query: {
        companies: {
          findFirst: vi.fn().mockResolvedValue({
            id: "company_123",
            taxRateDefault: "0.100000",
          }),
        },
        externalOrders: {
          findMany: vi.fn().mockResolvedValue([
            {
              id: "order_row_1",
              companyId: "company_123",
              createdAt: new Date("2026-06-20T12:00:00.000Z"),
              currency: "BRL",
              externalOrderId: "MLB-1001",
              metadata: {},
              orderedAt: new Date("2026-06-20T10:15:00.000Z"),
              organizationId: "org_123",
              provider: "mercadolivre",
              status: "paid",
              syncRunId: null,
              updatedAt: new Date("2026-06-20T12:00:00.000Z"),
              totalAmount: "200.00",
              items: [],
              fees: [],
            },
            {
              id: "order_row_2",
              companyId: "company_123",
              createdAt: new Date("2026-07-02T12:00:00.000Z"),
              currency: "BRL",
              externalOrderId: "MLB-1002",
              metadata: {},
              orderedAt: new Date("2026-07-02T10:15:00.000Z"),
              organizationId: "org_123",
              provider: "mercadolivre",
              status: "paid",
              syncRunId: null,
              updatedAt: new Date("2026-07-02T12:00:00.000Z"),
              totalAmount: "150.00",
              items: [],
              fees: [],
            },
          ]),
        },
        products: {
          findMany: vi.fn().mockResolvedValue([]),
        },
      },
    };

    const service = new OrdersService(db as never);
    const result = await service.listOrders(
      {
        organizationId: "org_123",
        selectedCompanyId: "company_123",
        userId: "user_123",
      },
      {
        orderedFrom: "2026-06-01",
        orderedTo: "2026-06-30",
        page: 1,
        pageSize: 10,
      },
    );

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.orderId).toBe("MLB-1001");
    expect(result.totalItems).toBe(1);
  });

  it("derives order-level profit and contribution margin from aggregated composition", async () => {
    const db = {
      query: {
        companies: {
          findFirst: vi.fn().mockResolvedValue({
            id: "company_123",
            taxRateDefault: "0.120000",
          }),
        },
        products: {
          findMany: vi.fn().mockResolvedValue([
            {
              financeDefaults: {
                packagingCost: "4.00",
              },
              id: "product_1",
              images: [],
              name: "Produto 1",
              productCosts: [
                {
                  amount: "21.50",
                  createdAt: new Date("2026-06-01T00:00:00.000Z"),
                  effectiveFrom: new Date("2026-06-01T00:00:00.000Z"),
                },
              ],
            },
          ]),
        },
        externalOrders: {
          findMany: vi.fn().mockResolvedValue([
            {
              id: "order_row_1",
              companyId: "company_123",
              createdAt: new Date("2026-06-20T12:00:00.000Z"),
              currency: "BRL",
              externalOrderId: "MLB-1001",
              metadata: {},
              orderedAt: new Date("2026-06-20T10:15:00.000Z"),
              organizationId: "org_123",
              provider: "mercadolivre",
              status: "paid",
              syncRunId: null,
              updatedAt: new Date("2026-06-20T12:00:00.000Z"),
              totalAmount: "200.00",
              items: [
                {
                  id: "item_1",
                  quantity: 2,
                  totalPrice: "120.00",
                  unitPrice: "60.00",
                  externalProduct: {
                    id: "ext_prod_1",
                    linkedProductId: "product_1",
                    sku: "SKU-1",
                    title: "Produto 1",
                  },
                },
              ],
              fees: [
                {
                  amount: "20.00",
                  feeType: "shipping_cost",
                  id: "fee_ship",
                  metadata: {},
                },
                {
                  amount: "3.00",
                  feeType: "fixed_fee",
                  id: "fee_fixed",
                  metadata: {},
                },
                {
                  amount: "10.00",
                  feeType: "marketplace_commission",
                  id: "fee_commission",
                  metadata: {},
                },
              ],
            },
          ]),
        },
      },
    };

    const service = new OrdersService(db as never);
    const result = await service.listOrders(
      {
        organizationId: "org_123",
        selectedCompanyId: "company_123",
        userId: "user_123",
      },
      {
        page: 1,
        pageSize: 10,
      },
    );

    expect(result.items[0]).toEqual(
      expect.objectContaining({
        contributionMarginPercent: "46.00",
        totalProfitAmount: "92.00",
      }),
    );
  });

  it("uses corrected shipping cost amount plus fixed fee in composition totals", async () => {
    const db = {
      query: {
        companies: {
          findFirst: vi.fn().mockResolvedValue({
            id: "company_123",
            taxRateDefault: "0.120000",
          }),
        },
        products: {
          findMany: vi.fn().mockResolvedValue([
            {
              financeDefaults: {
                packagingCost: "4.00",
              },
              id: "product_1",
              images: [],
              name: "Produto 1",
              productCosts: [
                {
                  amount: "21.50",
                  createdAt: new Date("2026-06-01T00:00:00.000Z"),
                  effectiveFrom: new Date("2026-06-01T00:00:00.000Z"),
                },
              ],
            },
          ]),
        },
        externalOrders: {
          findMany: vi.fn().mockResolvedValue([
            {
              id: "order_row_1",
              companyId: "company_123",
              createdAt: new Date("2026-06-20T12:00:00.000Z"),
              currency: "BRL",
              externalOrderId: "MLB-1001",
              metadata: {},
              orderedAt: new Date("2026-06-20T10:15:00.000Z"),
              organizationId: "org_123",
              provider: "mercadolivre",
              status: "paid",
              syncRunId: null,
              updatedAt: new Date("2026-06-20T12:00:00.000Z"),
              totalAmount: "200.00",
              items: [
                {
                  id: "item_1",
                  quantity: 2,
                  totalPrice: "120.00",
                  unitPrice: "60.00",
                  externalProduct: {
                    id: "ext_prod_1",
                    linkedProductId: "product_1",
                    sku: "SKU-1",
                    title: "Produto 1",
                  },
                },
              ],
              fees: [
                {
                  amount: "6.55",
                  feeType: "shipping_cost",
                  id: "fee_ship",
                  metadata: {
                    ratioAmount: 6.55,
                    shipmentId: "47320221685",
                    source: "shipment_detail.cost_components.ratio",
                  },
                },
                {
                  amount: "3.00",
                  feeType: "fixed_fee",
                  id: "fee_fixed",
                  metadata: {},
                },
                {
                  amount: "10.00",
                  feeType: "marketplace_commission",
                  id: "fee_commission",
                  metadata: {},
                },
              ],
            },
          ]),
        },
      },
    };

    const service = new OrdersService(db as never);
    const result = await service.listOrders(
      {
        organizationId: "org_123",
        selectedCompanyId: "company_123",
        userId: "user_123",
      },
      {
        page: 1,
        pageSize: 10,
      },
    );

    expect(result.items[0]).toEqual(
      expect.objectContaining({
        contributionMarginPercent: "52.73",
        shippingAmount: "6.55",
        fixedCostAmount: "3.00",
        totalProfitAmount: "105.45",
      }),
    );
  });

  it("returns second page of orders instead of repeating first page", async () => {
    const db = {
      query: {
        companies: {
          findFirst: vi.fn().mockResolvedValue({
            id: "company_123",
            taxRateDefault: "0.100000",
          }),
        },
        externalOrders: {
          findMany: vi.fn().mockResolvedValue([
            {
              id: "order_row_1",
              companyId: "company_123",
              createdAt: new Date("2026-06-20T12:00:00.000Z"),
              currency: "BRL",
              externalOrderId: "MLB-1001",
              metadata: {},
              orderedAt: new Date("2026-06-20T10:15:00.000Z"),
              organizationId: "org_123",
              provider: "mercadolivre",
              status: "paid",
              syncRunId: null,
              updatedAt: new Date("2026-06-20T12:00:00.000Z"),
              totalAmount: "200.00",
              items: [],
              fees: [],
            },
            {
              id: "order_row_2",
              companyId: "company_123",
              createdAt: new Date("2026-06-21T12:00:00.000Z"),
              currency: "BRL",
              externalOrderId: "MLB-1002",
              metadata: {},
              orderedAt: new Date("2026-06-21T10:15:00.000Z"),
              organizationId: "org_123",
              provider: "mercadolivre",
              status: "paid",
              syncRunId: null,
              updatedAt: new Date("2026-06-21T12:00:00.000Z"),
              totalAmount: "150.00",
              items: [],
              fees: [],
            },
          ]),
        },
        products: {
          findMany: vi.fn().mockResolvedValue([]),
        },
      },
    };

    const service = new OrdersService(db as never);
    const result = await service.listOrders(
      {
        organizationId: "org_123",
        selectedCompanyId: "company_123",
        userId: "user_123",
      },
      {
        page: 2,
        pageSize: 1,
      },
    );

    expect(result.page).toBe(2);
    expect(result.totalPages).toBe(2);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.orderId).toBe("SHP-1001");
  });

  it("coerces string pagination filters before slicing results", async () => {
    const db = {
      query: {
        companies: {
          findFirst: vi.fn().mockResolvedValue({
            id: "company_123",
            taxRateDefault: "0.100000",
          }),
        },
        externalOrders: {
          findMany: vi.fn().mockResolvedValue([
            {
              id: "order_row_1",
              companyId: "company_123",
              createdAt: new Date("2026-06-20T12:00:00.000Z"),
              currency: "BRL",
              externalOrderId: "MLB-1001",
              metadata: {},
              orderedAt: new Date("2026-06-20T10:15:00.000Z"),
              organizationId: "org_123",
              provider: "mercadolivre",
              status: "paid",
              syncRunId: null,
              updatedAt: new Date("2026-06-20T12:00:00.000Z"),
              totalAmount: "200.00",
              items: [],
              fees: [],
            },
            {
              id: "order_row_2",
              companyId: "company_123",
              createdAt: new Date("2026-06-21T12:00:00.000Z"),
              currency: "BRL",
              externalOrderId: "MLB-1002",
              metadata: {},
              orderedAt: new Date("2026-06-21T10:15:00.000Z"),
              organizationId: "org_123",
              provider: "mercadolivre",
              status: "paid",
              syncRunId: null,
              updatedAt: new Date("2026-06-21T12:00:00.000Z"),
              totalAmount: "150.00",
              items: [],
              fees: [],
            },
          ]),
        },
        products: {
          findMany: vi.fn().mockResolvedValue([]),
        },
      },
    };

    const service = new OrdersService(db as never);
    const result = await service.listOrders(
      {
        organizationId: "org_123",
        selectedCompanyId: "company_123",
        userId: "user_123",
      },
      {
        page: "2",
        pageSize: "1",
      } as never,
    );

    expect(result.page).toBe(2);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.orderId).toBe("MLB-1001");
  });

  it("uses a stable id tie-breaker when orders share timestamps before pagination", async () => {
    const sharedOrderedAt = new Date("2026-06-21T10:15:00.000Z");
    const sharedCreatedAt = new Date("2026-06-21T12:00:00.000Z");
    const db = {
      query: {
        companies: {
          findFirst: vi.fn().mockResolvedValue({
            id: "company_123",
            taxRateDefault: "0.100000",
          }),
        },
        externalOrders: {
          findMany: vi.fn().mockResolvedValue([
            {
              id: "order_row_1",
              companyId: "company_123",
              createdAt: sharedCreatedAt,
              currency: "BRL",
              externalOrderId: "MLB-1001",
              metadata: {},
              orderedAt: sharedOrderedAt,
              organizationId: "org_123",
              provider: "mercadolivre",
              status: "paid",
              syncRunId: null,
              updatedAt: sharedCreatedAt,
              totalAmount: "200.00",
              items: [],
              fees: [],
            },
            {
              id: "order_row_2",
              companyId: "company_123",
              createdAt: sharedCreatedAt,
              currency: "BRL",
              externalOrderId: "MLB-1002",
              metadata: {},
              orderedAt: sharedOrderedAt,
              organizationId: "org_123",
              provider: "mercadolivre",
              status: "paid",
              syncRunId: null,
              updatedAt: sharedCreatedAt,
              totalAmount: "150.00",
              items: [],
              fees: [],
            },
          ]),
        },
        products: {
          findMany: vi.fn().mockResolvedValue([]),
        },
      },
    };

    const service = new OrdersService(db as never);
    const result = await service.listOrders(
      {
        organizationId: "org_123",
        selectedCompanyId: "company_123",
        userId: "user_123",
      },
      {
        page: 1,
        pageSize: 1,
      },
    );

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.orderId).toBe("MLB-1002");
  });

  it("uses offset and a stable id tie-breaker in optimized database pagination", async () => {
    const countWhereMock = vi.fn().mockResolvedValue([{ count: 2 }]);
    const countFromMock = vi.fn().mockReturnValue({ where: countWhereMock });
    const pageOffsetMock = vi
      .fn()
      .mockResolvedValue([{ logicalGroupKey: "order_row_1", provider: "shopee" }]);
    const pageLimitMock = vi.fn().mockReturnValue({ offset: pageOffsetMock });
    const pageOrderByMock = vi.fn().mockReturnValue({ limit: pageLimitMock });
    const pageGroupByMock = vi.fn().mockReturnValue({ orderBy: pageOrderByMock });
    const pageWhereMock = vi.fn().mockReturnValue({ groupBy: pageGroupByMock });
    const pageFromMock = vi.fn().mockReturnValue({ where: pageWhereMock });
    const selectMock = vi
      .fn()
      .mockReturnValueOnce({ from: countFromMock })
      .mockReturnValueOnce({ from: pageFromMock });
    const db = {
      select: selectMock,
      query: {
        companies: {
          findFirst: vi.fn().mockResolvedValue({
            id: "company_123",
            taxRateDefault: "0.100000",
          }),
        },
        externalOrders: {
          findMany: vi.fn().mockResolvedValue([
            {
              id: "order_row_1",
              companyId: "company_123",
              createdAt: new Date("2026-06-21T12:00:00.000Z"),
              currency: "BRL",
              externalOrderId: "SHP-1001",
              metadata: {},
              orderedAt: new Date("2026-06-21T10:15:00.000Z"),
              organizationId: "org_123",
              provider: "shopee",
              status: "paid",
              syncRunId: null,
              updatedAt: new Date("2026-06-21T12:00:00.000Z"),
              totalAmount: "200.00",
              items: [],
              fees: [],
            },
          ]),
        },
        products: {
          findMany: vi.fn().mockResolvedValue([]),
        },
      },
    };

    const service = new OrdersService(db as never);
    const result = await service.listOrders(
      {
        organizationId: "org_123",
        selectedCompanyId: "company_123",
        userId: "user_123",
      },
      {
        includeSummary: false,
        page: 2,
        pageSize: 1,
        provider: "shopee",
      },
    );

    expect(pageOffsetMock).toHaveBeenCalledWith(1);
    expect(pageOrderByMock.mock.calls[0]).toHaveLength(3);
    expect(result.items[0]?.orderId).toBe("SHP-1001");
  });

  it("uses optimized database pagination for Mercado Livre logical orders", async () => {
    const countWhereMock = vi.fn().mockResolvedValue([{ count: 2 }]);
    const countFromMock = vi.fn().mockReturnValue({ where: countWhereMock });
    const pageOffsetMock = vi.fn().mockResolvedValue([
      {
        logicalGroupKey: "2000013650735359",
        provider: "mercadolivre",
      },
    ]);
    const pageLimitMock = vi.fn().mockReturnValue({ offset: pageOffsetMock });
    const pageOrderByMock = vi.fn().mockReturnValue({ limit: pageLimitMock });
    const pageGroupByMock = vi.fn().mockReturnValue({ orderBy: pageOrderByMock });
    const pageWhereMock = vi.fn().mockReturnValue({ groupBy: pageGroupByMock });
    const pageFromMock = vi.fn().mockReturnValue({ where: pageWhereMock });
    const selectMock = vi
      .fn()
      .mockReturnValueOnce({ from: countFromMock })
      .mockReturnValueOnce({ from: pageFromMock });
    const findManyMock = vi
      .fn()
      .mockResolvedValue([
        {
          id: "order_row_1",
          companyId: "company_123",
          createdAt: new Date("2026-06-22T18:10:00.000Z"),
          currency: "BRL",
          externalOrderId: "MLB-ORDER-1",
          metadata: { operationId: "2000013650735359" },
          orderedAt: new Date("2026-06-22T18:10:00.000Z"),
          organizationId: "org_123",
          provider: "mercadolivre",
          status: "paid",
          syncRunId: null,
          updatedAt: new Date("2026-06-22T18:10:00.000Z"),
          totalAmount: "37.92",
          items: [],
          fees: [],
        },
        {
          id: "order_row_2",
          companyId: "company_123",
          createdAt: new Date("2026-06-22T18:10:00.000Z"),
          currency: "BRL",
          externalOrderId: "MLB-ORDER-2",
          metadata: { operationId: "2000013650735359" },
          orderedAt: new Date("2026-06-22T18:10:00.000Z"),
          organizationId: "org_123",
          provider: "mercadolivre",
          status: "paid",
          syncRunId: null,
          updatedAt: new Date("2026-06-22T18:10:00.000Z"),
          totalAmount: "37.92",
          items: [],
          fees: [],
        },
      ]);
    const db = {
      select: selectMock,
      query: {
        companies: {
          findFirst: vi.fn().mockResolvedValue({
            id: "company_123",
            taxRateDefault: "0.100000",
          }),
        },
        externalOrders: {
          findMany: findManyMock,
        },
        products: {
          findMany: vi.fn().mockResolvedValue([]),
        },
      },
    };

    const service = new OrdersService(db as never);
    const result = await service.listOrders(
      {
        organizationId: "org_123",
        selectedCompanyId: "company_123",
        userId: "user_123",
      },
      {
        includeSummary: false,
        page: 1,
        pageSize: 1,
      },
    );

    expect(selectMock).toHaveBeenCalledTimes(2);
    expect(pageOffsetMock).toHaveBeenCalledWith(0);
    expect(String(findManyMock.mock.calls[0]?.[0]?.where ?? "")).toContain(
      "operationId",
    );
    expect(result.totalItems).toBe(2);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.id).toBe("group__mercadolivre__2000013650735359");
  });

  it("keeps single Mercado Livre orders visible in optimized database pagination", async () => {
    const countWhereMock = vi.fn().mockResolvedValue([{ count: 1 }]);
    const countFromMock = vi.fn().mockReturnValue({ where: countWhereMock });
    const pageOffsetMock = vi.fn().mockResolvedValue([
      {
        logicalGroupKey: "MLB-1001",
        provider: "mercadolivre",
      },
    ]);
    const pageLimitMock = vi.fn().mockReturnValue({ offset: pageOffsetMock });
    const pageOrderByMock = vi.fn().mockReturnValue({ limit: pageLimitMock });
    const pageGroupByMock = vi.fn().mockReturnValue({ orderBy: pageOrderByMock });
    const pageWhereMock = vi.fn().mockReturnValue({ groupBy: pageGroupByMock });
    const pageFromMock = vi.fn().mockReturnValue({ where: pageWhereMock });
    const selectMock = vi
      .fn()
      .mockReturnValueOnce({ from: countFromMock })
      .mockReturnValueOnce({ from: pageFromMock });
    const db = {
      select: selectMock,
      query: {
        companies: {
          findFirst: vi.fn().mockResolvedValue({
            id: "company_123",
            taxRateDefault: "0.100000",
          }),
        },
        externalOrders: {
          findMany: vi.fn().mockResolvedValue([
            {
              id: "order_row_1",
              companyId: "company_123",
              createdAt: new Date("2026-06-20T12:00:00.000Z"),
              currency: "BRL",
              externalOrderId: "MLB-1001",
              metadata: {},
              orderedAt: new Date("2026-06-20T10:15:00.000Z"),
              organizationId: "org_123",
              provider: "mercadolivre",
              status: "paid",
              syncRunId: null,
              updatedAt: new Date("2026-06-20T12:00:00.000Z"),
              totalAmount: "200.00",
              items: [],
              fees: [],
            },
          ]),
        },
        products: {
          findMany: vi.fn().mockResolvedValue([]),
        },
      },
    };

    const service = new OrdersService(db as never);
    const result = await service.listOrders(
      {
        organizationId: "org_123",
        selectedCompanyId: "company_123",
        userId: "user_123",
      },
      {
        includeSummary: false,
        page: 1,
        pageSize: 20,
      },
    );

    expect(result.totalItems).toBe(1);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.id).toBe("group__mercadolivre__MLB-1001");
  });

  it("aggregates unique order skus on list rows", async () => {
    const db = {
      query: {
        companies: {
          findFirst: vi.fn().mockResolvedValue({
            id: "company_123",
            taxRateDefault: "0.120000",
          }),
        },
        products: {
          findMany: vi.fn().mockResolvedValue([]),
        },
        externalOrders: {
          findMany: vi.fn().mockResolvedValue([
            {
              id: "order_row_1",
              companyId: "company_123",
              createdAt: new Date("2026-06-20T12:00:00.000Z"),
              currency: "BRL",
              externalOrderId: "MLB-1001",
              metadata: {},
              orderedAt: new Date("2026-06-20T10:15:00.000Z"),
              organizationId: "org_123",
              provider: "mercadolivre",
              status: "paid",
              syncRunId: null,
              updatedAt: new Date("2026-06-20T12:00:00.000Z"),
              totalAmount: "200.00",
              items: [
                {
                  id: "item_1",
                  quantity: 1,
                  totalPrice: "120.00",
                  unitPrice: "120.00",
                  externalProduct: {
                    id: "ext_prod_1",
                    linkedProductId: null,
                    sku: "SKU-1",
                    title: "Produto 1",
                  },
                },
                {
                  id: "item_2",
                  quantity: 1,
                  totalPrice: "80.00",
                  unitPrice: "80.00",
                  externalProduct: {
                    id: "ext_prod_2",
                    linkedProductId: null,
                    sku: "SKU-1",
                    title: "Produto 2",
                  },
                },
                {
                  id: "item_3",
                  quantity: 1,
                  totalPrice: "40.00",
                  unitPrice: "40.00",
                  externalProduct: {
                    id: "ext_prod_3",
                    linkedProductId: null,
                    sku: "SKU-2",
                    title: "Produto 3",
                  },
                },
              ],
              fees: [],
            },
          ]),
        },
      },
    };

    const service = new OrdersService(db as never);
    const result = await service.listOrders(
      {
        organizationId: "org_123",
        selectedCompanyId: "company_123",
        userId: "user_123",
      },
      {},
    );

    expect(result.items[0]?.skus).toEqual(["SKU-1", "SKU-2"]);
  });

  it("filters orders by sku match in any order item", async () => {
    const db = {
      query: {
        companies: {
          findFirst: vi.fn().mockResolvedValue({
            id: "company_123",
            taxRateDefault: "0.120000",
          }),
        },
        products: {
          findMany: vi.fn().mockResolvedValue([]),
        },
        externalOrders: {
          findMany: vi.fn().mockResolvedValue([
            {
              id: "order_row_1",
              companyId: "company_123",
              createdAt: new Date("2026-06-20T12:00:00.000Z"),
              currency: "BRL",
              externalOrderId: "MLB-1001",
              metadata: { operationId: "MLB-SALE-9001" },
              orderedAt: new Date("2026-06-20T10:15:00.000Z"),
              organizationId: "org_123",
              provider: "mercadolivre",
              status: "paid",
              syncRunId: null,
              updatedAt: new Date("2026-06-20T12:00:00.000Z"),
              totalAmount: "200.00",
              items: [
                {
                  id: "item_1",
                  quantity: 1,
                  totalPrice: "120.00",
                  unitPrice: "120.00",
                  externalProduct: {
                    id: "ext_prod_1",
                    linkedProductId: null,
                    sku: "SKU-1",
                    title: "Produto 1",
                  },
                },
                {
                  id: "item_2",
                  quantity: 1,
                  totalPrice: "80.00",
                  unitPrice: "80.00",
                  externalProduct: {
                    id: "ext_prod_2",
                    linkedProductId: null,
                    sku: "SKU-2",
                    title: "Produto 2",
                  },
                },
              ],
              fees: [],
            },
            {
              id: "order_row_2",
              companyId: "company_123",
              createdAt: new Date("2026-06-21T12:00:00.000Z"),
              currency: "BRL",
              externalOrderId: "SHP-1002",
              metadata: {},
              orderedAt: new Date("2026-06-21T10:15:00.000Z"),
              organizationId: "org_123",
              provider: "shopee",
              status: "paid",
              syncRunId: null,
              updatedAt: new Date("2026-06-21T12:00:00.000Z"),
              totalAmount: "80.00",
              items: [
                {
                  id: "item_3",
                  quantity: 1,
                  totalPrice: "80.00",
                  unitPrice: "80.00",
                  externalProduct: {
                    id: "ext_prod_3",
                    linkedProductId: null,
                    sku: "SKU-9",
                    title: "Produto 9",
                  },
                },
              ],
              fees: [],
            },
          ]),
        },
      },
    };

    const service = new OrdersService(db as never);
    const result = await service.listOrders(
      {
        organizationId: "org_123",
        selectedCompanyId: "company_123",
        userId: "user_123",
      },
      {
        search: "SKU-2",
      },
    );

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.id).toBe("group__mercadolivre__MLB-SALE-9001");
    expect(result.items[0]?.skus).toEqual(["SKU-1", "SKU-2"]);
  });

  it("filters by displayOrderId in memory when search is active", async () => {
    const selectMock = vi.fn();
    const db = {
      select: selectMock,
      query: {
        companies: {
          findFirst: vi.fn().mockResolvedValue({
            id: "company_123",
            taxRateDefault: "0.120000",
          }),
        },
        products: {
          findMany: vi.fn().mockResolvedValue([]),
        },
        externalOrders: {
          findMany: vi.fn().mockResolvedValue([
            {
              id: "order_row_1",
              companyId: "company_123",
              createdAt: new Date("2026-06-20T12:00:00.000Z"),
              currency: "BRL",
              externalOrderId: "MLB-ORDER-1001",
              metadata: { operationId: "MLB-SALE-9001" },
              orderedAt: new Date("2026-06-20T10:15:00.000Z"),
              organizationId: "org_123",
              provider: "mercadolivre",
              status: "paid",
              syncRunId: null,
              updatedAt: new Date("2026-06-20T12:00:00.000Z"),
              totalAmount: "200.00",
              items: [
                {
                  id: "item_1",
                  quantity: 1,
                  totalPrice: "120.00",
                  unitPrice: "120.00",
                  externalProduct: {
                    id: "ext_prod_1",
                    linkedProductId: null,
                    sku: "SKU-1",
                    title: "Produto 1",
                  },
                },
              ],
              fees: [],
            },
            {
              id: "order_row_2",
              companyId: "company_123",
              createdAt: new Date("2026-06-21T12:00:00.000Z"),
              currency: "BRL",
              externalOrderId: "SHP-ORDER-1002",
              metadata: { operationId: "SHP-SALE-9002" },
              orderedAt: new Date("2026-06-21T10:15:00.000Z"),
              organizationId: "org_123",
              provider: "shopee",
              status: "paid",
              syncRunId: null,
              updatedAt: new Date("2026-06-21T12:00:00.000Z"),
              totalAmount: "80.00",
              items: [
                {
                  id: "item_2",
                  quantity: 1,
                  totalPrice: "80.00",
                  unitPrice: "80.00",
                  externalProduct: {
                    id: "ext_prod_2",
                    linkedProductId: null,
                    sku: "SKU-9",
                    title: "Produto 9",
                  },
                },
              ],
              fees: [],
            },
          ]),
        },
      },
    };

    const service = new OrdersService(db as never);
    const result = await service.listOrders(
      {
        organizationId: "org_123",
        selectedCompanyId: "company_123",
        userId: "user_123",
      },
      {
        search: "SALE-9001",
      },
    );

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.id).toBe("group__mercadolivre__MLB-SALE-9001");
    expect(result.items[0]?.displayOrderId).toBe("MLB-SALE-9001");
    expect(result.items[0]?.orderId).toBe("MLB-ORDER-1001");
    expect(selectMock).not.toHaveBeenCalled();
  });

  it("filters orders by saleId using dedicated filter", async () => {
    const db = {
      query: {
        companies: {
          findFirst: vi.fn().mockResolvedValue({
            id: "company_123",
            taxRateDefault: "0.120000",
          }),
        },
        products: {
          findMany: vi.fn().mockResolvedValue([]),
        },
        externalOrders: {
          findMany: vi.fn().mockResolvedValue([
            {
              id: "order_row_1",
              companyId: "company_123",
              createdAt: new Date("2026-06-20T12:00:00.000Z"),
              currency: "BRL",
              externalOrderId: "MLB-ORDER-1001",
              metadata: { operationId: "MLB-SALE-9001" },
              orderedAt: new Date("2026-06-20T10:15:00.000Z"),
              organizationId: "org_123",
              provider: "mercadolivre",
              status: "paid",
              syncRunId: null,
              updatedAt: new Date("2026-06-20T12:00:00.000Z"),
              totalAmount: "200.00",
              items: [],
              fees: [],
            },
            {
              id: "order_row_2",
              companyId: "company_123",
              createdAt: new Date("2026-06-21T12:00:00.000Z"),
              currency: "BRL",
              externalOrderId: "SHP-ORDER-1002",
              metadata: {},
              orderedAt: new Date("2026-06-21T10:15:00.000Z"),
              organizationId: "org_123",
              provider: "shopee",
              status: "paid",
              syncRunId: null,
              updatedAt: new Date("2026-06-21T12:00:00.000Z"),
              totalAmount: "80.00",
              items: [],
              fees: [],
            },
          ]),
        },
      },
    };

    const service = new OrdersService(db as never);
    const result = await service.listOrders(
      {
        organizationId: "org_123",
        selectedCompanyId: "company_123",
        userId: "user_123",
      },
      {
        saleId: "SALE-9001",
      },
    );

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.displayOrderId).toBe("MLB-SALE-9001");
  });

  it("filters orders by dedicated sku filter", async () => {
    const db = {
      query: {
        companies: {
          findFirst: vi.fn().mockResolvedValue({
            id: "company_123",
            taxRateDefault: "0.120000",
          }),
        },
        products: {
          findMany: vi.fn().mockResolvedValue([]),
        },
        externalOrders: {
          findMany: vi.fn().mockResolvedValue([
            {
              id: "order_row_1",
              companyId: "company_123",
              createdAt: new Date("2026-06-20T12:00:00.000Z"),
              currency: "BRL",
              externalOrderId: "MLB-ORDER-1001",
              metadata: { operationId: "MLB-SALE-9001" },
              orderedAt: new Date("2026-06-20T10:15:00.000Z"),
              organizationId: "org_123",
              provider: "mercadolivre",
              status: "paid",
              syncRunId: null,
              updatedAt: new Date("2026-06-20T12:00:00.000Z"),
              totalAmount: "200.00",
              items: [
                {
                  id: "item_1",
                  quantity: 1,
                  totalPrice: "120.00",
                  unitPrice: "120.00",
                  externalProduct: {
                    id: "ext_prod_1",
                    linkedProductId: null,
                    sku: "SKU-1",
                    title: "Produto 1",
                  },
                },
                {
                  id: "item_2",
                  quantity: 1,
                  totalPrice: "80.00",
                  unitPrice: "80.00",
                  externalProduct: {
                    id: "ext_prod_2",
                    linkedProductId: null,
                    sku: "SKU-2",
                    title: "Produto 2",
                  },
                },
              ],
              fees: [],
            },
            {
              id: "order_row_2",
              companyId: "company_123",
              createdAt: new Date("2026-06-21T12:00:00.000Z"),
              currency: "BRL",
              externalOrderId: "SHP-1002",
              metadata: {},
              orderedAt: new Date("2026-06-21T10:15:00.000Z"),
              organizationId: "org_123",
              provider: "shopee",
              status: "paid",
              syncRunId: null,
              updatedAt: new Date("2026-06-21T12:00:00.000Z"),
              totalAmount: "80.00",
              items: [
                {
                  id: "item_3",
                  quantity: 1,
                  totalPrice: "80.00",
                  unitPrice: "80.00",
                  externalProduct: {
                    id: "ext_prod_3",
                    linkedProductId: null,
                    sku: "SKU-9",
                    title: "Produto 9",
                  },
                },
              ],
              fees: [],
            },
          ]),
        },
      },
    };

    const service = new OrdersService(db as never);
    const result = await service.listOrders(
      {
        organizationId: "org_123",
        selectedCompanyId: "company_123",
        userId: "user_123",
      },
      {
        sku: "SKU-2",
      },
    );

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.id).toBe("group__mercadolivre__MLB-SALE-9001");
    expect(result.items[0]?.skus).toEqual(["SKU-1", "SKU-2"]);
  });

  it("exports filtered orders as xlsx rows and restricts export to selected ids", async () => {
    const db = {
      query: {
        companies: {
          findFirst: vi.fn().mockResolvedValue({
            id: "company_123",
            taxRateDefault: "0.120000",
          }),
        },
        products: {
          findMany: vi.fn().mockResolvedValue([]),
        },
        externalOrders: {
          findMany: vi.fn().mockResolvedValue([
            {
              id: "order_row_1",
              companyId: "company_123",
              createdAt: new Date("2026-06-20T12:00:00.000Z"),
              currency: "BRL",
              externalOrderId: "MLB-1001",
              metadata: { operationId: "MLB-SALE-9001" },
              orderedAt: new Date("2026-06-20T10:15:00.000Z"),
              organizationId: "org_123",
              provider: "mercadolivre",
              status: "paid",
              syncRunId: null,
              updatedAt: new Date("2026-06-20T12:00:00.000Z"),
              totalAmount: "200.00",
              items: [
                {
                  id: "item_1",
                  quantity: 1,
                  totalPrice: "120.00",
                  unitPrice: "120.00",
                  externalProduct: {
                    id: "ext_prod_1",
                    linkedProductId: null,
                    sku: "SKU-1",
                    title: "Produto 1",
                  },
                },
              ],
              fees: [],
            },
            {
              id: "order_row_2",
              companyId: "company_123",
              createdAt: new Date("2026-06-21T12:00:00.000Z"),
              currency: "BRL",
              externalOrderId: "SHP-1002",
              metadata: {},
              orderedAt: new Date("2026-06-21T10:15:00.000Z"),
              organizationId: "org_123",
              provider: "shopee",
              status: "paid",
              syncRunId: null,
              updatedAt: new Date("2026-06-21T12:00:00.000Z"),
              totalAmount: "80.00",
              items: [
                {
                  id: "item_2",
                  quantity: 1,
                  totalPrice: "80.00",
                  unitPrice: "80.00",
                  externalProduct: {
                    id: "ext_prod_2",
                    linkedProductId: null,
                    sku: "SKU-9",
                    title: "Produto 9",
                  },
                },
              ],
              fees: [],
            },
          ]),
        },
      },
    };

    const service = new OrdersService(db as never);
    const fileBuffer = await service.exportOrdersSpreadsheet(
      {
        organizationId: "org_123",
        selectedCompanyId: "company_123",
        userId: "user_123",
      },
      {
        ids: ["group__mercadolivre__MLB-SALE-9001"],
        provider: "mercadolivre",
        search: "SALE-9001",
      },
    );

    const workbook = read(fileBuffer, { type: "buffer" });
    const rows = utils.sheet_to_json<Record<string, unknown>>(
      workbook.Sheets[workbook.SheetNames[0]!],
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]?.["ID da Venda"]).toBe("MLB-SALE-9001");
    expect(rows[0]?.["SKUs"]).toBe("SKU-1");
  });

  it("exports filtered orders by sku match", async () => {
    const db = {
      query: {
        companies: {
          findFirst: vi.fn().mockResolvedValue({
            id: "company_123",
            taxRateDefault: "0.120000",
          }),
        },
        products: {
          findMany: vi.fn().mockResolvedValue([]),
        },
        externalOrders: {
          findMany: vi.fn().mockResolvedValue([
            {
              id: "order_row_1",
              companyId: "company_123",
              createdAt: new Date("2026-06-20T12:00:00.000Z"),
              currency: "BRL",
              externalOrderId: "MLB-1001",
              metadata: { operationId: "MLB-SALE-9001" },
              orderedAt: new Date("2026-06-20T10:15:00.000Z"),
              organizationId: "org_123",
              provider: "mercadolivre",
              status: "paid",
              syncRunId: null,
              updatedAt: new Date("2026-06-20T12:00:00.000Z"),
              totalAmount: "200.00",
              items: [
                {
                  id: "item_1",
                  quantity: 1,
                  totalPrice: "120.00",
                  unitPrice: "120.00",
                  externalProduct: {
                    id: "ext_prod_1",
                    linkedProductId: null,
                    sku: "SKU-1",
                    title: "Produto 1",
                  },
                },
                {
                  id: "item_2",
                  quantity: 1,
                  totalPrice: "80.00",
                  unitPrice: "80.00",
                  externalProduct: {
                    id: "ext_prod_2",
                    linkedProductId: null,
                    sku: "SKU-2",
                    title: "Produto 2",
                  },
                },
              ],
              fees: [],
            },
            {
              id: "order_row_2",
              companyId: "company_123",
              createdAt: new Date("2026-06-21T12:00:00.000Z"),
              currency: "BRL",
              externalOrderId: "SHP-1002",
              metadata: {},
              orderedAt: new Date("2026-06-21T10:15:00.000Z"),
              organizationId: "org_123",
              provider: "shopee",
              status: "paid",
              syncRunId: null,
              updatedAt: new Date("2026-06-21T12:00:00.000Z"),
              totalAmount: "80.00",
              items: [
                {
                  id: "item_3",
                  quantity: 1,
                  totalPrice: "80.00",
                  unitPrice: "80.00",
                  externalProduct: {
                    id: "ext_prod_3",
                    linkedProductId: null,
                    sku: "SKU-9",
                    title: "Produto 9",
                  },
                },
              ],
              fees: [],
            },
          ]),
        },
      },
    };

    const service = new OrdersService(db as never);
    const fileBuffer = await service.exportOrdersSpreadsheet(
      {
        organizationId: "org_123",
        selectedCompanyId: "company_123",
        userId: "user_123",
      },
      {
        search: "SKU-2",
      },
    );

    const workbook = read(fileBuffer, { type: "buffer" });
    const rows = utils.sheet_to_json<Record<string, unknown>>(
      workbook.Sheets[workbook.SheetNames[0]!],
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]?.["ID da Venda"]).toBe("MLB-SALE-9001");
    expect(rows[0]?.["SKUs"]).toBe("SKU-1\nSKU-2");
  });

  it("groups Mercado Livre rows with same displayOrderId into one logical list order", async () => {
    const db = {
      query: {
        companies: {
          findFirst: vi.fn().mockResolvedValue({
            id: "company_123",
            taxRateDefault: "0.100000",
          }),
        },
        products: {
          findMany: vi.fn().mockResolvedValue([]),
        },
        externalOrders: {
          findMany: vi.fn().mockResolvedValue([
            {
              id: "order_row_1",
              companyId: "company_123",
              createdAt: new Date("2026-06-22T18:10:00.000Z"),
              currency: "BRL",
              externalOrderId: "MLB-ORDER-1",
              metadata: { operationId: "2000013650735359" },
              orderedAt: new Date("2026-06-22T18:10:00.000Z"),
              organizationId: "org_123",
              provider: "mercadolivre",
              status: "paid",
              syncRunId: null,
              updatedAt: new Date("2026-06-22T18:10:00.000Z"),
              totalAmount: "37.92",
              items: [
                {
                  id: "item_1",
                  quantity: 2,
                  totalPrice: "37.92",
                  unitPrice: "18.96",
                  externalProduct: {
                    id: "ext_prod_1",
                    linkedProductId: null,
                    sku: "SUPORTE-02-PRETO",
                    title: "SUPORTE 02 PRETO",
                  },
                },
              ],
              fees: [
                {
                  amount: "4.00",
                  feeType: "shipping_cost",
                  id: "fee_ship_1",
                  metadata: {},
                },
                {
                  amount: "3.79",
                  feeType: "marketplace_commission",
                  id: "fee_comm_1",
                  metadata: {},
                },
              ],
            },
            {
              id: "order_row_2",
              companyId: "company_123",
              createdAt: new Date("2026-06-22T18:10:00.000Z"),
              currency: "BRL",
              externalOrderId: "MLB-ORDER-2",
              metadata: { operationId: "2000013650735359" },
              orderedAt: new Date("2026-06-22T18:10:00.000Z"),
              organizationId: "org_123",
              provider: "mercadolivre",
              status: "paid",
              syncRunId: null,
              updatedAt: new Date("2026-06-22T18:10:00.000Z"),
              totalAmount: "37.92",
              items: [
                {
                  id: "item_2",
                  quantity: 2,
                  totalPrice: "37.92",
                  unitPrice: "18.96",
                  externalProduct: {
                    id: "ext_prod_2",
                    linkedProductId: null,
                    sku: "SUPORTE-02-BRANCO",
                    title: "SUPORTE 02 BRANCO",
                  },
                },
              ],
              fees: [
                {
                  amount: "4.00",
                  feeType: "shipping_cost",
                  id: "fee_ship_2",
                  metadata: {},
                },
                {
                  amount: "3.79",
                  feeType: "marketplace_commission",
                  id: "fee_comm_2",
                  metadata: {},
                },
              ],
            },
          ]),
        },
      },
    };

    const service = new OrdersService(db as never);
    const result = await service.listOrders(
      {
        organizationId: "org_123",
        selectedCompanyId: "company_123",
        userId: "user_123",
      },
      {
        page: 1,
        pageSize: 20,
      },
    );

    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toEqual(
      expect.objectContaining({
        displayOrderId: "2000013650735359",
        id: "group__mercadolivre__2000013650735359",
        itemsSold: 4,
        orderId: "MLB-ORDER-1",
        shippingAmount: "8.00",
        skus: ["SUPORTE-02-PRETO", "SUPORTE-02-BRANCO"],
        tariffAmount: "7.58",
        totalWithFees: "75.84",
      }),
    );
    expect(result.summary.ordersCount).toBe(1);
    expect(result.summary.unitsSold).toBe(4);
  });

  it("returns grouped Mercado Livre detail rows for synthetic list ids", async () => {
    const orders = [
      {
        id: "order_row_1",
        companyId: "company_123",
        createdAt: new Date("2026-06-22T18:10:00.000Z"),
        currency: "BRL",
        externalOrderId: "MLB-ORDER-1",
        metadata: { operationId: "2000013650735359" },
        orderedAt: new Date("2026-06-22T18:10:00.000Z"),
        organizationId: "org_123",
        provider: "mercadolivre",
        status: "paid",
        syncRunId: null,
        updatedAt: new Date("2026-06-22T18:10:00.000Z"),
        totalAmount: "37.92",
        items: [
          {
            id: "item_1",
            quantity: 2,
            totalPrice: "37.92",
            unitPrice: "18.96",
            externalProduct: {
              id: "ext_prod_1",
              linkedProductId: null,
              sku: "SUPORTE-02-PRETO",
              title: "SUPORTE 02 PRETO",
            },
          },
        ],
        fees: [
          {
            amount: "4.00",
            feeType: "shipping_cost",
            id: "fee_ship_1",
            metadata: {},
          },
          {
            amount: "3.79",
            feeType: "marketplace_commission",
            id: "fee_comm_1",
            metadata: {},
          },
        ],
      },
      {
        id: "order_row_2",
        companyId: "company_123",
        createdAt: new Date("2026-06-22T18:10:00.000Z"),
        currency: "BRL",
        externalOrderId: "MLB-ORDER-2",
        metadata: { operationId: "2000013650735359" },
        orderedAt: new Date("2026-06-22T18:10:00.000Z"),
        organizationId: "org_123",
        provider: "mercadolivre",
        status: "paid",
        syncRunId: null,
        updatedAt: new Date("2026-06-22T18:10:00.000Z"),
        totalAmount: "37.92",
        items: [
          {
            id: "item_2",
            quantity: 2,
            totalPrice: "37.92",
            unitPrice: "18.96",
            externalProduct: {
              id: "ext_prod_2",
              linkedProductId: null,
              sku: "SUPORTE-02-BRANCO",
              title: "SUPORTE 02 BRANCO",
            },
          },
        ],
        fees: [
          {
            amount: "4.00",
            feeType: "shipping_cost",
            id: "fee_ship_2",
            metadata: {},
          },
          {
            amount: "3.79",
            feeType: "marketplace_commission",
            id: "fee_comm_2",
            metadata: {},
          },
        ],
      },
    ];
    const db = {
      query: {
        companies: {
          findFirst: vi.fn().mockResolvedValue({
            id: "company_123",
            taxRateDefault: "0.100000",
          }),
        },
        products: {
          findMany: vi.fn().mockResolvedValue([]),
        },
        externalOrders: {
          findFirst: vi.fn().mockResolvedValue(orders[0]),
          findMany: vi.fn().mockResolvedValue(orders),
        },
      },
    };

    const service = new OrdersService(db as never);
    const result = await service.getOrderDetails(
      {
        organizationId: "org_123",
        selectedCompanyId: "company_123",
        userId: "user_123",
      },
      "group__mercadolivre__2000013650735359",
    );

    expect(result.order.id).toBe("group__mercadolivre__2000013650735359");
    expect(result.order.totalWithFees).toBe("75.84");
    expect(result.composition.revenueAmount).toBe("75.84");
    expect(result.items).toHaveLength(2);
    expect(result.items.map((item) => item.sku)).toEqual([
      "SUPORTE-02-PRETO",
      "SUPORTE-02-BRANCO",
    ]);
  });

  it("deduplicates shared Mercado Livre shipping totals in grouped sale composition", async () => {
    const shippingMetadata = {
      shipmentId: "shipment_123",
      shipping_buyer_paid: "0.00",
      shipping_net_amount: "-22.60",
      shipping_seller_fee: "22.60",
      source: "billing/integration/group/ML/order/details",
    };
    const orders = [
      {
        id: "order_row_1",
        companyId: "company_123",
        createdAt: new Date("2026-06-22T18:10:00.000Z"),
        currency: "BRL",
        externalOrderId: "MLB-ORDER-1",
        metadata: { operationId: "2000013650735359" },
        orderedAt: new Date("2026-06-22T18:10:00.000Z"),
        organizationId: "org_123",
        provider: "mercadolivre",
        status: "paid",
        syncRunId: null,
        updatedAt: new Date("2026-06-22T18:10:00.000Z"),
        totalAmount: "37.92",
        items: [],
        fees: [
          {
            amount: "22.60",
            feeType: "shipping_cost",
            id: "fee_ship_1",
            metadata: shippingMetadata,
          },
          {
            amount: "3.79",
            feeType: "marketplace_commission",
            id: "fee_comm_1",
            metadata: {},
          },
        ],
      },
      {
        id: "order_row_2",
        companyId: "company_123",
        createdAt: new Date("2026-06-22T18:10:00.000Z"),
        currency: "BRL",
        externalOrderId: "MLB-ORDER-2",
        metadata: { operationId: "2000013650735359" },
        orderedAt: new Date("2026-06-22T18:10:00.000Z"),
        organizationId: "org_123",
        provider: "mercadolivre",
        status: "paid",
        syncRunId: null,
        updatedAt: new Date("2026-06-22T18:10:00.000Z"),
        totalAmount: "37.92",
        items: [],
        fees: [
          {
            amount: "22.60",
            feeType: "shipping_cost",
            id: "fee_ship_2",
            metadata: shippingMetadata,
          },
          {
            amount: "3.79",
            feeType: "marketplace_commission",
            id: "fee_comm_2",
            metadata: {},
          },
        ],
      },
    ];
    const db = {
      query: {
        companies: {
          findFirst: vi.fn().mockResolvedValue({
            id: "company_123",
            taxRateDefault: "0.100000",
          }),
        },
        products: {
          findMany: vi.fn().mockResolvedValue([]),
        },
        externalOrders: {
          findFirst: vi.fn().mockResolvedValue(orders[0]),
          findMany: vi.fn().mockResolvedValue(orders),
        },
      },
    };

    const service = new OrdersService(db as never);
    const result = await service.getOrderDetails(
      {
        organizationId: "org_123",
        selectedCompanyId: "company_123",
        userId: "user_123",
      },
      "group__mercadolivre__2000013650735359",
    );

    expect(result.composition).toEqual(
      expect.objectContaining({
        shippingBreakdown: expect.objectContaining({
          netShippingAmount: "-22.60",
        }),
        shippingOrFixedFeeAmount: "22.60",
      }),
    );
  });

  it("does not infer grouped Mercado Livre refund bonus from billing total", async () => {
    const shippingMetadata = {
      mercadoLivreBillingTotalAmount: "49.44",
      shipmentId: "shipment_123",
      shipping_buyer_paid: "0.00",
      shipping_net_amount: "-22.60",
      shipping_seller_fee: "22.60",
      source: "billing/integration/group/ML/order/details",
    };
    const orders = [
      {
        id: "order_row_1",
        companyId: "company_123",
        createdAt: new Date("2026-06-22T18:10:00.000Z"),
        currency: "BRL",
        externalOrderId: "MLB-ORDER-1",
        metadata: {
          mercadoLivreBillingTotalAmount: "49.44",
          operationId: "2000013650735359",
        },
        orderedAt: new Date("2026-06-22T18:10:00.000Z"),
        organizationId: "org_123",
        provider: "mercadolivre",
        status: "paid",
        syncRunId: null,
        updatedAt: new Date("2026-06-22T18:10:00.000Z"),
        totalAmount: "37.92",
        items: [],
        fees: [
          {
            amount: "22.60",
            feeType: "shipping_cost",
            id: "fee_ship_1",
            metadata: shippingMetadata,
          },
          {
            amount: "4.92",
            feeType: "marketplace_commission",
            id: "fee_comm_1",
            metadata: {},
          },
        ],
      },
      {
        id: "order_row_2",
        companyId: "company_123",
        createdAt: new Date("2026-06-22T18:10:00.000Z"),
        currency: "BRL",
        externalOrderId: "MLB-ORDER-2",
        metadata: {
          mercadoLivreBillingTotalAmount: "49.44",
          operationId: "2000013650735359",
        },
        orderedAt: new Date("2026-06-22T18:10:00.000Z"),
        organizationId: "org_123",
        provider: "mercadolivre",
        status: "paid",
        syncRunId: null,
        updatedAt: new Date("2026-06-22T18:10:00.000Z"),
        totalAmount: "37.92",
        items: [],
        fees: [
          {
            amount: "22.60",
            feeType: "shipping_cost",
            id: "fee_ship_2",
            metadata: shippingMetadata,
          },
          {
            amount: "4.92",
            feeType: "marketplace_commission",
            id: "fee_comm_2",
            metadata: {},
          },
        ],
      },
    ];
    const db = {
      query: {
        companies: {
          findFirst: vi.fn().mockResolvedValue({
            id: "company_123",
            taxRateDefault: "0.100000",
          }),
        },
        products: {
          findMany: vi.fn().mockResolvedValue([]),
        },
        externalOrders: {
          findFirst: vi.fn().mockResolvedValue(orders[0]),
          findMany: vi.fn().mockResolvedValue(orders),
        },
      },
    };

    const service = new OrdersService(db as never);
    const result = await service.getOrderDetails(
      {
        organizationId: "org_123",
        selectedCompanyId: "company_123",
        userId: "user_123",
      },
      "group__mercadolivre__2000013650735359",
    );

    expect(result.composition).toEqual(
      expect.objectContaining({
        marketplaceCommissionAmount: "9.84",
        netRevenueAmount: "43.40",
        refundBonusAmount: "0.00",
        revenueAmount: "75.84",
        shippingOrFixedFeeAmount: "22.60",
      }),
    );
  });

  it("uses explicit Mercado Livre billing rebate instead of inflated net-total refund fallback", async () => {
    const orders = [
      {
        id: "order_row_1",
        companyId: "company_123",
        createdAt: new Date("2026-06-22T18:10:00.000Z"),
        currency: "BRL",
        externalOrderId: "2000017063392030",
        metadata: { packId: "2000013650735359", refundBonusAmount: "3.02" },
        orderedAt: new Date("2026-06-22T18:10:00.000Z"),
        organizationId: "org_123",
        provider: "mercadolivre",
        refundBonusAmount: "3.02",
        status: "paid",
        syncRunId: null,
        updatedAt: new Date("2026-06-22T18:10:00.000Z"),
        totalAmount: "37.92",
        items: [],
        fees: [
          {
            amount: "4.92",
            feeType: "marketplace_commission",
            id: "fee_comm_1",
            metadata: { source: "listing_prices.sale_fee_amount" },
          },
          {
            amount: "3.02",
            feeType: "refund_bonus",
            id: "fee_refund_1",
            metadata: {
              originalType: "net_total_difference",
              source: "payment.transaction_details.net_received_amount",
            },
          },
          {
            amount: "22.60",
            feeType: "shipping_cost",
            id: "fee_ship_1",
            metadata: {
              shipmentId: "47358700157",
              shipping_seller_fee: "22.60",
              source: "shipment_detail.shipping_option.list_cost",
            },
          },
        ],
      },
      {
        id: "order_row_2",
        companyId: "company_123",
        createdAt: new Date("2026-06-22T18:10:00.000Z"),
        currency: "BRL",
        externalOrderId: "2000017063392034",
        metadata: { packId: "2000013650735359", refundBonusAmount: "25.62" },
        orderedAt: new Date("2026-06-22T18:10:00.000Z"),
        organizationId: "org_123",
        provider: "mercadolivre",
        refundBonusAmount: "25.62",
        status: "paid",
        syncRunId: null,
        updatedAt: new Date("2026-06-22T18:10:00.000Z"),
        totalAmount: "37.92",
        items: [],
        fees: [
          {
            amount: "4.92",
            feeType: "marketplace_commission",
            id: "fee_comm_2",
            metadata: { source: "listing_prices.sale_fee_amount" },
          },
          {
            amount: "25.62",
            feeType: "refund_bonus",
            id: "fee_refund_2",
            metadata: {
              originalType: "net_total_difference",
              source: "payment.transaction_details.net_received_amount",
            },
          },
          {
            amount: "22.60",
            feeType: "shipping_cost",
            id: "fee_ship_2",
            metadata: {
              mercadoLivreRefundBonusAmount: "3.02",
              shipmentId: "47358700157",
              shipping_seller_fee: "22.60",
              source: "billing/integration/group/ML/order/details",
            },
          },
        ],
      },
    ];
    const db = {
      query: {
        companies: {
          findFirst: vi.fn().mockResolvedValue({
            id: "company_123",
            taxRateDefault: "0.100000",
          }),
        },
        products: {
          findMany: vi.fn().mockResolvedValue([]),
        },
        externalOrders: {
          findFirst: vi.fn().mockResolvedValue(orders[0]),
          findMany: vi.fn().mockResolvedValue(orders),
        },
      },
    };

    const service = new OrdersService(db as never);
    const result = await service.getOrderDetails(
      {
        organizationId: "org_123",
        selectedCompanyId: "company_123",
        userId: "user_123",
      },
      "group__mercadolivre__2000013650735359",
    );

    expect(result.composition).toEqual(
      expect.objectContaining({
        netRevenueAmount: "49.44",
        refundBonusAmount: "6.04",
        shippingOrFixedFeeAmount: "22.60",
      }),
    );
  });

  it("does not backfill unrelated Mercado Livre orders when loading grouped sale details", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const groupedDisplayOrderId = "2000013650735359";
    const findGroupedOrdersMock = vi.fn();
    const orders = [
      {
        id: "order_row_1",
        companyId: "company_123",
        createdAt: new Date("2026-06-22T18:10:00.000Z"),
        currency: "BRL",
        externalOrderId: "MLB-ORDER-1",
        marketplaceConnectionId: "conn_1",
        metadata: { packId: groupedDisplayOrderId },
        orderedAt: new Date("2026-06-22T18:10:00.000Z"),
        organizationId: "org_123",
        provider: "mercadolivre",
        status: "paid",
        syncRunId: null,
        updatedAt: new Date("2026-06-22T18:10:00.000Z"),
        totalAmount: "37.92",
        items: [],
        fees: [],
      },
      {
        id: "order_row_2",
        companyId: "company_123",
        createdAt: new Date("2026-06-22T18:10:00.000Z"),
        currency: "BRL",
        externalOrderId: "MLB-ORDER-2",
        marketplaceConnectionId: "conn_1",
        metadata: { packId: groupedDisplayOrderId },
        orderedAt: new Date("2026-06-22T18:10:00.000Z"),
        organizationId: "org_123",
        provider: "mercadolivre",
        status: "paid",
        syncRunId: null,
        updatedAt: new Date("2026-06-22T18:10:00.000Z"),
        totalAmount: "37.92",
        items: [],
        fees: [],
      },
      {
        id: "order_row_3",
        companyId: "company_123",
        createdAt: new Date("2026-06-18T09:00:00.000Z"),
        currency: "BRL",
        externalOrderId: "MLB-UNRELATED-3",
        marketplaceConnectionId: "conn_1",
        metadata: {},
        orderedAt: new Date("2026-06-18T09:00:00.000Z"),
        organizationId: "org_123",
        provider: "mercadolivre",
        status: "paid",
        syncRunId: null,
        updatedAt: new Date("2026-06-18T09:00:00.000Z"),
        totalAmount: "12.00",
        items: [],
        fees: [],
      },
    ];
    const db = {
      query: {
        companies: {
          findFirst: vi.fn().mockResolvedValue({
            id: "company_123",
            taxRateDefault: "0.100000",
          }),
        },
        marketplaceConnections: {
          findMany: vi.fn().mockResolvedValue([
            {
              accessToken: "token_123",
              companyId: "company_123",
              externalAccountId: "seller_1",
              id: "conn_1",
              metadata: {},
              organizationId: "org_123",
              provider: "mercadolivre",
              refreshToken: null,
              status: "connected",
              tokenExpiresAt: new Date("2030-01-01T00:00:00.000Z"),
            },
          ]),
        },
        products: {
          findMany: vi.fn().mockResolvedValue([]),
        },
        externalOrders: {
          findMany: findGroupedOrdersMock.mockResolvedValue(orders.slice(0, 2)),
        },
      },
    };

    const service = new OrdersService(db as never, {
      API_DB_POOL_MAX: 5,
      API_HOST: "127.0.0.1",
      API_PORT: 4000,
      BETTER_AUTH_SECRET: "secret",
      BETTER_AUTH_URL: "http://localhost:4000",
      DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/lucreii",
      MERCADOLIVRE_CLIENT_ID: "ml-client-id",
      MERCADOLIVRE_CLIENT_SECRET: "ml-client-secret",
      MERCADOLIVRE_REDIRECT_URI:
        "http://localhost:4000/integrations/mercadolivre/callback",
      NODE_ENV: "test",
      STRIPE_PRICE_START_MONTHLY: "price_start_monthly",
      STRIPE_PRICE_START_ANNUAL: "price_start_annual",
      STRIPE_PRICE_PRO_MONTHLY: "price_pro_monthly",
      STRIPE_PRICE_PRO_ANNUAL: "price_pro_annual",
      STRIPE_PRICE_BUSINESS_MONTHLY: "price_business_monthly",
      STRIPE_PRICE_BUSINESS_ANNUAL: "price_business_annual",
      STRIPE_SECRET_KEY: "sk_test_123",
      STRIPE_WEBHOOK_SECRET: "whsec_test_123",
      SYNC_RELAX_GUARDS: false,
      WEB_APP_ORIGIN: "http://localhost:3000",
    });

    await service.getOrderDetails(
      {
        organizationId: "org_123",
        selectedCompanyId: "company_123",
        userId: "user_123",
      },
      `group__mercadolivre__${groupedDisplayOrderId}`,
    );

    expect(
      String(findGroupedOrdersMock.mock.calls[0]?.[0]?.where ?? ""),
    ).toContain("buildExactMercadoLivreGroupedOrderWhere");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("paginates Mercado Livre grouped sale as one logical row", async () => {
    const sharedOrderPayload = [
      {
        id: "order_row_1",
        companyId: "company_123",
        createdAt: new Date("2026-06-22T18:10:00.000Z"),
        currency: "BRL",
        externalOrderId: "MLB-ORDER-1",
        metadata: { operationId: "2000013650735359" },
        orderedAt: new Date("2026-06-22T18:10:00.000Z"),
        organizationId: "org_123",
        provider: "mercadolivre",
        status: "paid",
        syncRunId: null,
        updatedAt: new Date("2026-06-22T18:10:00.000Z"),
        totalAmount: "37.92",
        items: [],
        fees: [],
      },
      {
        id: "order_row_2",
        companyId: "company_123",
        createdAt: new Date("2026-06-22T18:10:00.000Z"),
        currency: "BRL",
        externalOrderId: "MLB-ORDER-2",
        metadata: { operationId: "2000013650735359" },
        orderedAt: new Date("2026-06-22T18:10:00.000Z"),
        organizationId: "org_123",
        provider: "mercadolivre",
        status: "paid",
        syncRunId: null,
        updatedAt: new Date("2026-06-22T18:10:00.000Z"),
        totalAmount: "37.92",
        items: [],
        fees: [],
      },
      {
        id: "order_row_3",
        companyId: "company_123",
        createdAt: new Date("2026-06-21T12:00:00.000Z"),
        currency: "BRL",
        externalOrderId: "SHP-ORDER-3",
        metadata: {},
        orderedAt: new Date("2026-06-21T12:00:00.000Z"),
        organizationId: "org_123",
        provider: "shopee",
        status: "paid",
        syncRunId: null,
        updatedAt: new Date("2026-06-21T12:00:00.000Z"),
        totalAmount: "20.00",
        items: [],
        fees: [],
      },
    ];
    const db = {
      query: {
        companies: {
          findFirst: vi.fn().mockResolvedValue({
            id: "company_123",
            taxRateDefault: "0.100000",
          }),
        },
        products: {
          findMany: vi.fn().mockResolvedValue([]),
        },
        externalOrders: {
          findMany: vi.fn().mockResolvedValue(sharedOrderPayload),
        },
      },
    };

    const service = new OrdersService(db as never);
    const result = await service.listOrders(
      {
        organizationId: "org_123",
        selectedCompanyId: "company_123",
        userId: "user_123",
      },
      {
        page: 1,
        pageSize: 1,
      },
    );

    expect(result.totalItems).toBe(2);
    expect(result.totalPages).toBe(2);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.id).toBe("group__mercadolivre__2000013650735359");
  });

  it("exports grouped Mercado Livre sales as one spreadsheet row", async () => {
    const db = {
      query: {
        companies: {
          findFirst: vi.fn().mockResolvedValue({
            id: "company_123",
            taxRateDefault: "0.100000",
          }),
        },
        products: {
          findMany: vi.fn().mockResolvedValue([]),
        },
        externalOrders: {
          findMany: vi.fn().mockResolvedValue([
            {
              id: "order_row_1",
              companyId: "company_123",
              createdAt: new Date("2026-06-22T18:10:00.000Z"),
              currency: "BRL",
              externalOrderId: "MLB-ORDER-1",
              metadata: { operationId: "2000013650735359" },
              orderedAt: new Date("2026-06-22T18:10:00.000Z"),
              organizationId: "org_123",
              provider: "mercadolivre",
              status: "paid",
              syncRunId: null,
              updatedAt: new Date("2026-06-22T18:10:00.000Z"),
              totalAmount: "37.92",
              items: [
                {
                  id: "item_1",
                  quantity: 2,
                  totalPrice: "37.92",
                  unitPrice: "18.96",
                  externalProduct: {
                    id: "ext_prod_1",
                    linkedProductId: null,
                    sku: "SUPORTE-02-PRETO",
                    title: "SUPORTE 02 PRETO",
                  },
                },
              ],
              fees: [],
            },
            {
              id: "order_row_2",
              companyId: "company_123",
              createdAt: new Date("2026-06-22T18:10:00.000Z"),
              currency: "BRL",
              externalOrderId: "MLB-ORDER-2",
              metadata: { operationId: "2000013650735359" },
              orderedAt: new Date("2026-06-22T18:10:00.000Z"),
              organizationId: "org_123",
              provider: "mercadolivre",
              status: "paid",
              syncRunId: null,
              updatedAt: new Date("2026-06-22T18:10:00.000Z"),
              totalAmount: "37.92",
              items: [
                {
                  id: "item_2",
                  quantity: 2,
                  totalPrice: "37.92",
                  unitPrice: "18.96",
                  externalProduct: {
                    id: "ext_prod_2",
                    linkedProductId: null,
                    sku: "SUPORTE-02-BRANCO",
                    title: "SUPORTE 02 BRANCO",
                  },
                },
              ],
              fees: [],
            },
          ]),
        },
      },
    };

    const service = new OrdersService(db as never);
    const fileBuffer = await service.exportOrdersSpreadsheet(
      {
        organizationId: "org_123",
        selectedCompanyId: "company_123",
        userId: "user_123",
      },
      {
        ids: ["group__mercadolivre__2000013650735359"],
      },
    );

    const workbook = read(fileBuffer, { type: "buffer" });
    const rows = utils.sheet_to_json<Record<string, unknown>>(
      workbook.Sheets[workbook.SheetNames[0]!],
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]?.["ID da Venda"]).toBe("2000013650735359");
    expect(rows[0]?.["SKUs"]).toBe("SUPORTE-02-PRETO\nSUPORTE-02-BRANCO");
  });
});
