import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import {
  type DatabaseClient,
} from "@lucreii/database";
import {
  calculateFinancialIndicators,
  sumMoneyValues,
} from "@lucreii/domain";
import type { FinanceSnapshot } from "@lucreii/domain";
import type {
  DashboardFinancialIndicators,
  IntegrationProviderSlug,
} from "@lucreii/types";
import { and, eq } from "drizzle-orm";
import { DATABASE_CLIENT } from "@/common/tokens";
import { FinanceService } from "@/modules/finance/finance.service";

function normalizeSku(value: string | null | undefined) {
  const normalized = value?.trim().toUpperCase();
  return normalized ? normalized : null;
}

function buildSalesLookup(orders: FinanceSnapshot["orders"]) {
  const byProductId = new Map<string, number>();
  const bySku = new Map<string, number>();

  for (const order of orders) {
    const orderWithPayment = order as typeof order & {
      metadata?: unknown;
      status?: string;
    };
    if (
      !order.orderedAt ||
      order.items.length === 0 ||
      orderWithPayment.status?.trim().toLowerCase() === "unpaid" ||
      (orderWithPayment.metadata &&
        typeof orderWithPayment.metadata === "object" &&
        "paid" in orderWithPayment.metadata &&
        orderWithPayment.metadata.paid === false)
    ) {
      continue;
    }

    for (const item of order.items) {
      if (item.productId) {
        const key = `${order.provider}::${item.productId}`;
        byProductId.set(key, (byProductId.get(key) ?? 0) + item.quantity);
      }

      const sku = normalizeSku(item.sku);
      if (sku) {
        const key = `${order.provider}::${sku}`;
        bySku.set(key, (bySku.get(key) ?? 0) + item.quantity);
      }
    }
  }

  return { byProductId, bySku };
}

@Injectable()
export class FinancialIndicatorsService {
  constructor(
    @Inject(DATABASE_CLIENT)
    private readonly db: DatabaseClient,
    @Inject(FinanceService)
    private readonly financeService: FinanceService,
  ) {}

  async read(
    organizationId: string,
    userId: string,
    companyId: string,
    provider: IntegrationProviderSlug | undefined,
    referenceMonth: string,
  ): Promise<DashboardFinancialIndicators> {
    const company = await this.db.query.companies.findFirst({
      where: (table) =>
        and(
          eq(table.id, companyId),
          eq(table.organizationId, organizationId),
          eq(table.userId, userId),
        ),
    });

    if (!company) {
      throw new NotFoundException("Company not found.");
    }

    const lines = await this.db.query.productMonthlyPerformance.findMany({
      where: (table) =>
        and(
          eq(table.organizationId, organizationId),
          eq(table.userId, userId),
          eq(table.companyId, companyId),
          eq(table.referenceMonth, referenceMonth),
          ...(provider ? [eq(table.channel, provider)] : []),
        ),
    });
    const financeSnapshot = await this.financeService.buildFinanceSnapshot(
      organizationId,
      companyId,
      provider,
      referenceMonth,
    );
    const salesLookup = buildSalesLookup(financeSnapshot.orders);
    const monthlyFixedCosts = await this.db.query.fixedCosts.findMany({
      where: (table) =>
        and(
          eq(table.organizationId, organizationId),
          eq(table.userId, userId),
          eq(table.companyId, companyId),
          eq(table.referenceMonth, referenceMonth),
        ),
    });
    const hasMonthlyFixedCosts = monthlyFixedCosts.length > 0;
    const fixedCost = hasMonthlyFixedCosts
      ? sumMoneyValues(monthlyFixedCosts.map((row) => row.amount))
      : company.fixedCostDefault;
    const result = calculateFinancialIndicators({
      fixedCost,
      lines: lines.map((line) => {
        const productSales = line.productId
          ? salesLookup.byProductId.get(`${line.channel}::${line.productId}`)
          : undefined;
        const sku = normalizeSku(line.sku);
        const skuSales = sku
          ? salesLookup.bySku.get(`${line.channel}::${sku}`)
          : undefined;
        const salesQuantity = productSales ?? skuSales ?? line.salesQuantity;

        return {
          advertisingCost: line.advertisingCost,
          commissionRate: line.commissionRate,
          packagingCost: line.packagingCost,
          returnsQuantity: line.returnsQuantity,
          salePrice: line.salePrice,
          salesQuantity,
          shippingFee: line.shippingFee,
          unitCost: line.unitCost,
        };
      }),
      taxRate: company.taxRateDefault,
    });

    return {
      ...result,
      fixedCostSource: hasMonthlyFixedCosts ? "monthly" : "company_default",
    };
  }
}
