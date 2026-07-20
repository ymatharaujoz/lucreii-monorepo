import { HttpException, UnauthorizedException } from "@nestjs/common";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { buildApp } from "@/app";
import { AuthService } from "@/modules/auth/auth.service";
import { BillingService } from "@/modules/billing/billing.service";
import { EntitlementsService } from "@/modules/billing/entitlements.service";
import { OrdersService } from "./orders.service";

describe("orders controller", () => {
  let app: NestFastifyApplication;
  let authService: AuthService;
  let billingService: BillingService;
  let entitlementsService: EntitlementsService;
  let ordersService: OrdersService;

  beforeAll(async () => {
    app = await buildApp({
      API_DB_POOL_MAX: 5,
      API_HOST: "127.0.0.1",
      API_PORT: 4000,
      AUTH_TRUSTED_ORIGINS: "http://localhost:3000",
      BETTER_AUTH_SECRET: "secret",
      BETTER_AUTH_URL: "http://localhost:4000",
      DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/lucreii",
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
    authService = app.get(AuthService);
    billingService = app.get(BillingService);
    entitlementsService = app.get(EntitlementsService);
    ordersService = app.get(OrdersService);
    vi.spyOn(billingService, "reconcileOrganizationSubscriptionWithStripe").mockResolvedValue(undefined);
  });

  afterAll(async () => {
    await app.close();
  });

  it("lists orders for authenticated entitled requests", async () => {
    vi.spyOn(authService, "requireRequestContext").mockResolvedValueOnce({
      organization: { id: "org_123", name: "Org", role: "owner", slug: "org" },
      selectedCompanyId: "company_123",
      session: { expiresAt: new Date("2026-06-20T00:00:00.000Z"), id: "session_123" },
      user: {
        email: "owner@lucreii.local",
        emailVerified: true,
        id: "user_123",
        image: null,
        name: "Mateus",
      },
    });
    vi.spyOn(entitlementsService, "requireActiveEntitlement").mockResolvedValueOnce({
      customer: null,
      entitled: true,
      organizationId: "org_123",
      subscription: null,
    });
    vi.spyOn(ordersService, "listOrders").mockResolvedValueOnce({
      summary: {
        averageMargin: "0.00",
        grossProfit: "0.00",
        grossRevenue: "0.00",
        ordersCount: 0,
        unitsSold: 0,
      },
      availableStatuses: [],
      items: [],
      page: 1,
      pageSize: 10,
      totalItems: 0,
      totalPages: 1,
    });

    const response = await app.inject({
      method: "GET",
      url: "/orders?page=1&pageSize=10&provider=mercadolivre&saleId=SALE-9001&sku=SKU-2",
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toContain("application/json");
    expect(response.json()).toEqual({
      data: {
        summary: {
          averageMargin: "0.00",
          grossProfit: "0.00",
          grossRevenue: "0.00",
          ordersCount: 0,
          unitsSold: 0,
        },
        availableStatuses: [],
        items: [],
        page: 1,
        pageSize: 10,
        totalItems: 0,
        totalPages: 1,
      },
      error: null,
    });
    expect(ordersService.listOrders).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org_123",
        selectedCompanyId: "company_123",
        userId: "user_123",
      }),
      expect.objectContaining({
        page: 1,
        pageSize: 10,
        provider: "mercadolivre",
        saleId: "SALE-9001",
        sku: "SKU-2",
      }),
    );
  });

  it("returns order detail for authenticated entitled requests", async () => {
    vi.spyOn(authService, "requireRequestContext").mockResolvedValueOnce({
      organization: { id: "org_123", name: "Org", role: "owner", slug: "org" },
      selectedCompanyId: "company_123",
      session: { expiresAt: new Date("2026-06-20T00:00:00.000Z"), id: "session_123" },
      user: {
        email: "owner@lucreii.local",
        emailVerified: true,
        id: "user_123",
        image: null,
        name: "Mateus",
      },
    });
    vi.spyOn(entitlementsService, "requireActiveEntitlement").mockResolvedValueOnce({
      customer: null,
      entitled: true,
      organizationId: "org_123",
      subscription: null,
    });
    vi.spyOn(ordersService, "getOrderDetails").mockResolvedValueOnce({
      composition: {
        hasIncompleteCostData: false,
        marketplaceCommissionAmount: "0.00",
        missingCostItemsCount: 0,
        missingLinkedItemsCount: 0,
        netRevenueAmount: "0.00",
        packagingCostAmount: "0.00",
        productCostAmount: "0.00",
        refundBonusAmount: "0.00",
        revenueAmount: "0.00",
        shippingOrFixedFeeAmount: "0.00",
        taxAmount: "0.00",
        taxRateDefault: null,
      },
      items: [],
      pendingFinancialFields: [],
      order: {
        contributionMarginPercent: null,
        createdAt: "2026-06-20T12:00:00.000Z",
        currency: "BRL",
        displayOrderId: "MLB-SALE-1001",
        fixedCostAmount: "0.00",
        id: "order_row_1",
        itemsSold: 0,
        orderDate: "2026-06-20",
        orderId: "MLB-1001",
        orderedAt: "2026-06-20T10:15:00.000Z",
        provider: "mercadolivre",
        skus: [],
        shippingAmount: "0.00",
        sourceStatus: "paid",
        tariffAmount: "0.00",
        status: "paid",
        statusLabel: "Pagamento aprovado",
        totalFees: "0.00",
        totalProfitAmount: null,
        totalWithFees: "0.00",
        totalWithoutFees: "0.00",
      },
      tags: [],
    });

    const response = await app.inject({
      method: "GET",
      url: "/orders/order_row_1",
    });

    expect(response.statusCode).toBe(200);
    expect(ordersService.getOrderDetails).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org_123",
        selectedCompanyId: "company_123",
        userId: "user_123",
      }),
      "order_row_1",
    );
  });

  it("updates order composition for authenticated entitled requests", async () => {
    vi.spyOn(authService, "requireRequestContext").mockResolvedValueOnce({
      organization: { id: "org_123", name: "Org", role: "owner", slug: "org" },
      selectedCompanyId: "company_123",
      session: { expiresAt: new Date("2026-06-20T00:00:00.000Z"), id: "session_123" },
      user: {
        email: "owner@lucreii.local",
        emailVerified: true,
        id: "user_123",
        image: null,
        name: "Mateus",
      },
    });
    vi.spyOn(entitlementsService, "requireActiveEntitlement").mockResolvedValueOnce({
      customer: null,
      entitled: true,
      organizationId: "org_123",
      subscription: null,
    });
    vi.spyOn(ordersService, "updateOrderComposition").mockResolvedValueOnce({
      composition: {
        hasIncompleteCostData: false,
        marketplaceCommissionAmount: "15.00",
        missingCostItemsCount: 0,
        missingLinkedItemsCount: 0,
        netRevenueAmount: "160.00",
        packagingCostAmount: "12.00",
        productCostAmount: "80.00",
        refundBonusAmount: "5.00",
        revenueAmount: "200.00",
        shippingOrFixedFeeAmount: "30.00",
        taxAmount: "24.00",
        taxRateDefault: "0.120000",
      },
      items: [],
      pendingFinancialFields: [],
      order: {
        contributionMarginPercent: "21.50",
        createdAt: "2026-06-20T12:00:00.000Z",
        currency: "BRL",
        displayOrderId: "MLB-SALE-9001",
        fixedCostAmount: "3.00",
        id: "order_row_1",
        itemsSold: 2,
        orderDate: "2026-06-20",
        orderId: "MLB-1001",
        orderedAt: "2026-06-20T10:15:00.000Z",
        provider: "mercadolivre",
        skus: [],
        shippingAmount: "20.00",
        sourceStatus: "paid",
        status: "paid",
        statusLabel: "Pagamento aprovado",
        tariffAmount: "10.00",
        totalFees: "33.00",
        totalProfitAmount: "43.00",
        totalWithFees: "200.00",
        totalWithoutFees: "167.00",
      },
      tags: [],
    });

    const response = await app.inject({
      method: "PATCH",
      url: "/orders/order_row_1/composition",
      payload: {
        marketplaceCommissionAmount: "15.00",
        packagingCostAmount: "12.00",
        productCostAmount: "80.00",
        refundBonusAmount: "5.00",
        shippingOrFixedFeeAmount: "30.00",
      },
    });

    expect(response.statusCode).toBe(200);
    expect(ordersService.updateOrderComposition).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org_123",
        selectedCompanyId: "company_123",
        userId: "user_123",
      }),
      "order_row_1",
      expect.objectContaining({
        marketplaceCommissionAmount: "15.00",
        packagingCostAmount: "12.00",
        productCostAmount: "80.00",
        refundBonusAmount: "5.00",
        shippingOrFixedFeeAmount: "30.00",
      }),
    );
  });

  it("exports orders spreadsheet as xlsx attachment", async () => {
    vi.spyOn(authService, "requireRequestContext").mockResolvedValueOnce({
      organization: { id: "org_123", name: "Org", role: "owner", slug: "org" },
      selectedCompanyId: "company_123",
      session: { expiresAt: new Date("2026-06-20T00:00:00.000Z"), id: "session_123" },
      user: {
        email: "owner@lucreii.local",
        emailVerified: true,
        id: "user_123",
        image: null,
        name: "Mateus",
      },
    });
    vi.spyOn(entitlementsService, "requireActiveEntitlement").mockResolvedValueOnce({
      customer: null,
      entitled: true,
      organizationId: "org_123",
      subscription: null,
    });
    vi.spyOn(ordersService, "exportOrdersSpreadsheet").mockResolvedValueOnce(
      Buffer.from("xlsx"),
    );

    const response = await app.inject({
      method: "GET",
      url: "/orders/export?provider=mercadolivre&ids=order_1,order_2&saleId=SALE-9001&sku=SKU-2",
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toContain(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    expect(response.headers["content-disposition"]).toContain(
      'attachment; filename="pedidos-',
    );
    expect(ordersService.exportOrdersSpreadsheet).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org_123",
        selectedCompanyId: "company_123",
        userId: "user_123",
      }),
      expect.objectContaining({
        ids: ["order_1", "order_2"],
        provider: "mercadolivre",
        saleId: "SALE-9001",
        sku: "SKU-2",
      }),
    );
  });

  it("returns page 2 payload as json instead of no-content", async () => {
    vi.spyOn(authService, "requireRequestContext").mockResolvedValueOnce({
      organization: { id: "org_123", name: "Org", role: "owner", slug: "org" },
      selectedCompanyId: "company_123",
      session: { expiresAt: new Date("2026-06-20T00:00:00.000Z"), id: "session_123" },
      user: {
        email: "owner@lucreii.local",
        emailVerified: true,
        id: "user_123",
        image: null,
        name: "Mateus",
      },
    });
    vi.spyOn(entitlementsService, "requireActiveEntitlement").mockResolvedValueOnce({
      customer: null,
      entitled: true,
      organizationId: "org_123",
      subscription: null,
    });
    vi.spyOn(ordersService, "listOrders").mockResolvedValueOnce({
      summary: {
        averageMargin: "0.00",
        grossProfit: "0.00",
        grossRevenue: "0.00",
        ordersCount: 0,
        unitsSold: 0,
      },
      availableStatuses: [],
      items: [
        {
          contributionMarginPercent: null,
          createdAt: "2026-06-21T12:00:00.000Z",
          currency: "BRL",
          displayOrderId: "MLB-SALE-1002",
          fixedCostAmount: "0.00",
          id: "order_row_2",
          itemsSold: 1,
          orderDate: "2026-06-21",
          orderId: "MLB-1002",
          orderedAt: "2026-06-21T10:15:00.000Z",
          provider: "mercadolivre",
          skus: [],
          shippingAmount: "0.00",
          sourceStatus: "paid",
          status: "paid",
          statusLabel: "Pagamento aprovado",
          tariffAmount: "0.00",
          totalFees: "0.00",
          totalProfitAmount: null,
          totalWithFees: "150.00",
          totalWithoutFees: "150.00",
        },
      ],
      page: 2,
      pageSize: 20,
      totalItems: 21,
      totalPages: 2,
    });

    const response = await app.inject({
      method: "GET",
      url: "/orders?page=2&pageSize=20&includeSummary=false",
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toContain("application/json");
    expect(response.json()).toEqual({
      data: {
        summary: {
          averageMargin: "0.00",
          grossProfit: "0.00",
          grossRevenue: "0.00",
          ordersCount: 0,
          unitsSold: 0,
        },
        availableStatuses: [],
        items: [
          expect.objectContaining({
            displayOrderId: "MLB-SALE-1002",
            id: "order_row_2",
          }),
        ],
        page: 2,
        pageSize: 20,
        totalItems: 21,
        totalPages: 2,
      },
      error: null,
    });
  });

  it("returns empty out-of-range pages as json instead of 204", async () => {
    vi.spyOn(authService, "requireRequestContext").mockResolvedValueOnce({
      organization: { id: "org_123", name: "Org", role: "owner", slug: "org" },
      selectedCompanyId: "company_123",
      session: { expiresAt: new Date("2026-06-20T00:00:00.000Z"), id: "session_123" },
      user: {
        email: "owner@lucreii.local",
        emailVerified: true,
        id: "user_123",
        image: null,
        name: "Mateus",
      },
    });
    vi.spyOn(entitlementsService, "requireActiveEntitlement").mockResolvedValueOnce({
      customer: null,
      entitled: true,
      organizationId: "org_123",
      subscription: null,
    });
    vi.spyOn(ordersService, "listOrders").mockResolvedValueOnce({
      summary: {
        averageMargin: "0.00",
        grossProfit: "0.00",
        grossRevenue: "0.00",
        ordersCount: 0,
        unitsSold: 0,
      },
      availableStatuses: [],
      items: [],
      page: 2,
      pageSize: 20,
      totalItems: 21,
      totalPages: 2,
    });

    const response = await app.inject({
      method: "GET",
      url: "/orders?page=99&pageSize=20&includeSummary=false",
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toContain("application/json");
    expect(response.json()).toEqual({
      data: {
        summary: {
          averageMargin: "0.00",
          grossProfit: "0.00",
          grossRevenue: "0.00",
          ordersCount: 0,
          unitsSold: 0,
        },
        availableStatuses: [],
        items: [],
        page: 2,
        pageSize: 20,
        totalItems: 21,
        totalPages: 2,
      },
      error: null,
    });
  });

  it("fails loudly when service omits orders payload", async () => {
    vi.spyOn(authService, "requireRequestContext").mockResolvedValueOnce({
      organization: { id: "org_123", name: "Org", role: "owner", slug: "org" },
      selectedCompanyId: "company_123",
      session: { expiresAt: new Date("2026-06-20T00:00:00.000Z"), id: "session_123" },
      user: {
        email: "owner@lucreii.local",
        emailVerified: true,
        id: "user_123",
        image: null,
        name: "Mateus",
      },
    });
    vi.spyOn(entitlementsService, "requireActiveEntitlement").mockResolvedValueOnce({
      customer: null,
      entitled: true,
      organizationId: "org_123",
      subscription: null,
    });
    vi.spyOn(ordersService, "listOrders").mockResolvedValueOnce(undefined as never);

    const response = await app.inject({
      method: "GET",
      url: "/orders?page=2&pageSize=20&includeSummary=false",
    });

    expect(response.statusCode).toBe(500);
    expect(response.json()).toEqual(
      expect.objectContaining({
        error: expect.objectContaining({
          message: "Orders list response payload is missing.",
          statusCode: 500,
        }),
      }),
    );
  });

  it("rejects unauthenticated requests", async () => {
    vi.spyOn(authService, "requireRequestContext").mockRejectedValueOnce(
      new UnauthorizedException("Authentication required."),
    );

    const response = await app.inject({
      method: "GET",
      url: "/orders",
    });

    expect(response.statusCode).toBe(401);
  });

  it("rejects non-entitled requests", async () => {
    vi.spyOn(authService, "requireRequestContext").mockResolvedValueOnce({
      organization: { id: "org_123", name: "Org", role: "owner", slug: "org" },
      selectedCompanyId: "company_123",
      session: { expiresAt: new Date("2026-06-20T00:00:00.000Z"), id: "session_123" },
      user: {
        email: "owner@lucreii.local",
        emailVerified: true,
        id: "user_123",
        image: null,
        name: "Mateus",
      },
    });
    vi.spyOn(entitlementsService, "requireActiveEntitlement").mockRejectedValueOnce(
      new HttpException("Active subscription required.", 402),
    );

    const response = await app.inject({
      method: "GET",
      url: "/orders",
    });

    expect(response.statusCode).toBe(402);
  });
});
