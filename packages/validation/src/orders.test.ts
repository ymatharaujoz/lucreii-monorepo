import { describe, expect, it } from "vitest";
import {
  orderDetailsApiResponseSchema,
  orderCompositionUpdateSchema,
  orderExportQuerySchema,
  ordersListSummarySchema,
  ordersListApiResponseSchema,
} from "./orders";

describe("orders validation schemas", () => {
  it("accepts paginated orders list responses", () => {
    const result = ordersListApiResponseSchema.parse({
      data: {
        summary: {
          averageMargin: "0.25",
          grossProfit: "50.00",
          grossRevenue: "200.00",
          marginRevenue: "600.00",
          totalProfit: "42.00",
          ordersCount: 1,
          unitsSold: 3,
        },
        availableStatuses: [
          { label: "Pagamento aprovado", value: "paid" },
          { label: "Cancelado", value: "cancelled" },
        ],
        items: [
          {
            createdAt: "2026-06-20T12:00:00.000Z",
            currency: "BRL",
            displayOrderId: "MLB-SALE-9001",
            fixedCostAmount: "0.00",
            id: "order_row_1",
            itemsSold: 3,
            orderDate: "2026-06-20",
            orderId: "MLB-1001",
            orderedAt: "2026-06-20T10:15:00.000Z",
            provider: "mercadolivre",
            contributionMarginPercent: "46.00",
            skus: ["SKU-1", "SKU-2"],
            sourceStatus: "paid",
            shippingAmount: "20.00",
            tariffAmount: "10.00",
            status: "paid",
            statusLabel: "Pagamento aprovado",
            totalFees: "30.00",
            totalProfitAmount: "92.00",
            totalWithFees: "200.00",
            totalWithoutFees: "170.00",
          },
        ],
        page: "1",
        pageSize: "20",
        totalItems: "1",
        totalPages: "1",
      },
      error: null,
    });

    expect(result.data.items[0]?.orderId).toBe("MLB-1001");
    expect(result.data.items[0]?.displayOrderId).toBe("MLB-SALE-9001");
    expect(result.data.items[0]?.skus).toEqual(["SKU-1", "SKU-2"]);
    expect(result.data.summary.grossRevenue).toBe("200.00");
    expect(result.data.summary.grossProfit).toBe("50.00");
    expect(result.data.summary.marginRevenue).toBe("600.00");
    expect(result.data.summary.totalProfit).toBe("42.00");
  });

  it("accepts the monthly margin audit breakdown", () => {
    const result = ordersListSummarySchema.parse({
      averageMargin: "0.5950",
      grossProfit: "119.0000",
      grossRevenue: "25362.8200",
      marginRevenue: "894.48",
      totalProfit: "202.51",
      ordersCount: 28,
      unitsSold: 29,
      marginAudit: {
        aggregateRevenue: "894.48",
        compositionCount: 28,
        eligiblePerformanceRows: 4,
        grossRevenue: "25362.8200",
        lineRevenue: "894.48",
        marginRevenue: "894.48",
        marketplaceCommissionTotal: "89.45",
        netLiquidSalesTotal: 29,
        packagingTotal: "94.91",
        pdvTotal: "894.48",
        productCostTotal: "298.16",
        shippingOrFixedFeeTotal: "120.00",
        taxTotal: "89.45",
        totalPerformanceRows: 10,
        totalProfit: "202.51",
        unitPdvTotal: "298.16",
      },
    });

    expect(result.marginAudit?.aggregateRevenue).toBe("894.48");
    expect(result.marginAudit?.grossRevenue).toBe("25362.8200");
  });

  it("accepts order detail responses with line items", () => {
    const result = orderDetailsApiResponseSchema.parse({
      data: {
        composition: {
          hasIncompleteCostData: true,
          marketplaceCommissionAmount: "12.00",
          missingCostItemsCount: 1,
          missingLinkedItemsCount: 1,
          netRevenueAmount: "165.00",
          packagingCostAmount: "8.00",
          pendingFinancialFields: ["taxAmount"],
          productCostAmount: "60.00",
          refundBonusAmount: "0.00",
          revenueAmount: "200.00",
          shippingOrFixedFeeAmount: "23.00",
          taxAmount: "24.00",
          taxRateDefault: "0.120000",
        },
        items: [
          {
            channel: "shopee",
            contributionMarginPercent: "17.50",
            displayName: "Produto Pai | Cor: Azul",
            id: "item_1",
            imageUrl: "https://cdn.example.com/product-1-cover.jpg",
            linkedProductId: "product_1",
            netRevenueAmount: "108.00",
            orderedAt: "2026-06-20T10:15:00.000Z",
            productName: "Produto 1",
            quantity: 2,
            sku: "SKU-1",
            totalProfitAmount: "21.00",
            totalPrice: "120.00",
            unitPrice: "60.00",
          },
        ],
        order: {
          createdAt: "2026-06-20T12:00:00.000Z",
          currency: "BRL",
          displayOrderId: "SHP-1001",
          fixedCostAmount: "0.00",
          id: "order_row_1",
          itemsSold: 2,
          orderDate: "2026-06-20",
          orderId: "SHP-1001",
          orderedAt: "2026-06-20T10:15:00.000Z",
          provider: "shopee",
          contributionMarginPercent: null,
          skus: ["SKU-1"],
          sourceStatus: "completed",
          shippingAmount: "20.00",
          tariffAmount: "0.00",
          status: "paid",
          statusLabel: "Pagamento aprovado",
          totalFees: "20.00",
          totalProfitAmount: null,
          totalWithFees: "200.00",
          totalWithoutFees: "180.00",
          tags: ["ENVIO FLEX"],
        },
        pendingFinancialFields: ["taxAmount"],
        tags: ["ENVIO FLEX"],
      },
      error: null,
    });

    expect(result.data.items[0]?.sku).toBe("SKU-1");
    expect(result.data.composition.shippingOrFixedFeeAmount).toBe("23.00");
    expect(result.data.items[0]?.displayName).toBe("Produto Pai | Cor: Azul");
    expect(result.data.composition.netRevenueAmount).toBe("165.00");
    expect(result.data.order.skus).toEqual(["SKU-1"]);
  });

  it("accepts composition update payloads without tax fields", () => {
    const result = orderCompositionUpdateSchema.parse({
      marketplaceCommissionAmount: "15.00",
      packagingCostAmount: "12.00",
      productCostAmount: "80.00",
      refundBonusAmount: "5.00",
      shippingOrFixedFeeAmount: "30.00",
    });

    expect(result.marketplaceCommissionAmount).toBe("15.00");
  });

  it("accepts negative contribution margin percentages in order details", () => {
    const result = orderDetailsApiResponseSchema.parse({
      data: {
        composition: {
          hasIncompleteCostData: false,
          marketplaceCommissionAmount: "3.89",
          missingCostItemsCount: 0,
          missingLinkedItemsCount: 0,
          netRevenueAmount: "19.36",
          packagingCostAmount: "2.50",
          productCostAmount: "20.00",
          refundBonusAmount: "0.00",
          revenueAmount: "29.90",
          shippingOrFixedFeeAmount: "6.65",
          taxAmount: "3.59",
          taxRateDefault: "0.120000",
        },
        items: [
          {
            channel: "mercadolivre",
            contributionMarginPercent: "-10.50",
            displayName: "Cor: Transparente | Acessório De Unha - Não Ofertar",
            id: "item_1",
            imageUrl: "https://cdn.example.com/product-1-cover.jpg",
            linkedProductId: "product_1",
            netRevenueAmount: "19.36",
            orderedAt: "2026-06-20T10:15:00.000Z",
            productName: "Acessório De Unha - Não Ofertar",
            quantity: 1,
            sku: "ACESSORIO-TRANSPARENTE",
            totalPrice: "29.90",
            totalProfitAmount: "-3.14",
            unitPrice: "29.90",
          },
        ],
        order: {
          createdAt: "2026-06-20T12:00:00.000Z",
          currency: "BRL",
          displayOrderId: "MLB-1001",
          fixedCostAmount: "6.65",
          id: "order_row_1",
          itemsSold: 1,
          orderDate: "2026-06-20",
          orderId: "MLB-1001",
          orderedAt: "2026-06-20T10:15:00.000Z",
          provider: "mercadolivre",
          contributionMarginPercent: "-10.50",
          skus: ["ACESSORIO-TRANSPARENTE"],
          sourceStatus: "paid",
          shippingAmount: "0.00",
          tariffAmount: "3.89",
          status: "paid",
          statusLabel: "Pagamento aprovado",
          totalFees: "10.54",
          totalProfitAmount: "-3.14",
          totalWithFees: "29.90",
          totalWithoutFees: "19.36",
        },
        pendingFinancialFields: [],
        tags: [],
      },
      error: null,
    });

    expect(result.data.items[0]?.contributionMarginPercent).toBe("-10.50");
  });

  it("accepts order export ids as CSV query input", () => {
    const result = orderExportQuerySchema.parse({
      ids: "order_1,order_2",
      orderedFrom: "2026-06-01",
      provider: "mercadolivre",
      search: "MLB",
    });

    expect(result.ids).toEqual(["order_1", "order_2"]);
    expect(result.provider).toBe("mercadolivre");
  });
});
