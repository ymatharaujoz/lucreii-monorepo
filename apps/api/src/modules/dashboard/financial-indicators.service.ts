import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import {
  marketplaceAdvertising,
  type DatabaseClient,
} from "@lucreii/database";
import {
  calculateFinancialIndicators,
  calculateFinancialIndicatorsFromTotals,
  sumMoneyValues,
} from "@lucreii/domain";
import type {
  DashboardFinancialIndicators,
  DashboardMarketplaceAdvertising,
  IntegrationProviderSlug,
  ProductPerformanceListItem,
} from "@lucreii/types";
import type { DashboardMarketplaceAdvertisingUpdateInput } from "@lucreii/validation";
import { and, eq } from "drizzle-orm";
import { DATABASE_CLIENT } from "@/common/tokens";
import { OrdersService } from "@/modules/orders/orders.service";
import { ProductsService } from "@/modules/products/products.service";
import type { DashboardDateRange } from "./dashboard.service";

function prorateMonthlyAmount(
  amount: string,
  referenceMonth: string,
  dateRange?: DashboardDateRange,
) {
  if (!dateRange) {
    return amount;
  }

  const [startYear, startMonth, startDay] = dateRange.dateFrom
    .split("-")
    .map(Number);
  const [endYear, endMonth, endDay] = dateRange.dateTo.split("-").map(Number);
  const [monthYear, monthNumber] = referenceMonth.slice(0, 7).split("-").map(Number);
  const selectedDays =
    (Date.UTC(endYear, endMonth - 1, endDay) -
      Date.UTC(startYear, startMonth - 1, startDay)) /
      86_400_000 +
    1;
  const daysInMonth = new Date(Date.UTC(monthYear, monthNumber, 0)).getUTCDate();
  const parsedAmount = Number(amount);

  return Number.isFinite(parsedAmount)
    ? (parsedAmount * (selectedDays / daysInMonth)).toFixed(2)
    : "0.00";
}

@Injectable()
export class FinancialIndicatorsService {
  constructor(
    @Inject(DATABASE_CLIENT)
    private readonly db: DatabaseClient,
    @Inject(ProductsService)
    private readonly productsService: ProductsService,
    @Inject(OrdersService)
    private readonly ordersService: OrdersService,
  ) {}

  private async readPerformanceRows(
    organizationId: string,
    userId: string,
    companyId: string,
    provider: IntegrationProviderSlug | undefined,
    referenceMonth: string,
  ): Promise<ProductPerformanceListItem[]> {
    const rows: ProductPerformanceListItem[] = [];
    let page = 1;
    let totalPages = 1;

    while (page <= totalPages) {
      const response = await this.productsService.listPerformanceRows(
        {
          organizationId,
          selectedCompanyId: companyId,
          userId,
        },
        {
          marketplaces: provider ? [provider] : undefined,
          page,
          pageSize: 100,
          referenceMonth,
        },
      );

      rows.push(...response.items);
      totalPages = response.totalPages;
      page += 1;
    }

    return rows;
  }

  async read(
    organizationId: string,
    userId: string,
    companyId: string,
    provider: IntegrationProviderSlug | undefined,
    referenceMonth: string,
    dateRange?: DashboardDateRange,
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

    const performanceRows = await this.readPerformanceRows(
      organizationId,
      userId,
      companyId,
      provider,
      referenceMonth,
    );
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
    const performanceIndicators = calculateFinancialIndicators({
      fixedCost,
      lines: performanceRows.map((row) => ({
        advertisingCost: row.advertisingCost,
        commissionRate: (row.commissionPct / 100).toFixed(6),
        packagingCost: row.packagingCost,
        returnsQuantity: row.returns,
        salePrice: row.sellingPrice,
        salesQuantity: row.sales,
        shippingFee: row.shipping,
        unitCost: row.unitCost,
      })),
      taxRate: company.taxRateDefault,
    });
    const savedMarketplaceAdvertising = provider
      ? await this.db.query.marketplaceAdvertising.findFirst({
          where: (table) =>
            and(
              eq(table.organizationId, organizationId),
              eq(table.userId, userId),
              eq(table.companyId, companyId),
              eq(table.provider, provider),
              eq(table.referenceMonth, referenceMonth),
            ),
        })
      : null;
    const monthlyAdvertising = provider
      ? savedMarketplaceAdvertising?.amount ?? "0.00"
      : performanceIndicators.advertising;
    const advertising = prorateMonthlyAmount(
      monthlyAdvertising,
      referenceMonth,
      dateRange,
    );
    const ordersSummary = await this.ordersService.readExportedFinancialSummary(
      {
        organizationId,
        selectedCompanyId: companyId,
        userId,
      },
      {
        ...(dateRange ?? {}),
        provider,
        referenceMonth,
      },
    );
    const result = calculateFinancialIndicatorsFromTotals({
      advertising,
      fixedCost,
      marketplaceCommission: ordersSummary.marketplaceCommission,
      netSales: ordersSummary.netSales,
      packagingCost: ordersSummary.packagingCost,
      productCost: ordersSummary.productCost,
      refundBonus: ordersSummary.refundBonus,
      revenue: ordersSummary.revenue,
      shippingCost: ordersSummary.shippingCost,
      taxAmount: ordersSummary.taxAmount,
    });

    return {
      ...result,
      excludedRevenue: ordersSummary.excludedRevenue,
      excludedSales: ordersSummary.excludedSales,
      fixedCostSource: hasMonthlyFixedCosts ? "monthly" : "company_default",
      grossSales: ordersSummary.grossSales,
      monthlyAdvertising,
    };
  }

  async updateMarketplaceAdvertising(
    organizationId: string,
    userId: string,
    companyId: string,
    input: DashboardMarketplaceAdvertisingUpdateInput,
  ): Promise<DashboardMarketplaceAdvertising> {
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

    const [row] = await this.db
      .insert(marketplaceAdvertising)
      .values({
        amount: input.amount,
        companyId,
        organizationId,
        provider: input.provider,
        referenceMonth: input.referenceMonth,
        userId,
      })
      .onConflictDoUpdate({
        target: [
          marketplaceAdvertising.organizationId,
          marketplaceAdvertising.companyId,
          marketplaceAdvertising.provider,
          marketplaceAdvertising.referenceMonth,
        ],
        set: {
          amount: input.amount,
          updatedAt: new Date(),
          userId,
        },
      })
      .returning();

    return {
      amount: String(row.amount),
      provider: row.provider as IntegrationProviderSlug,
      referenceMonth: row.referenceMonth,
    };
  }
}
