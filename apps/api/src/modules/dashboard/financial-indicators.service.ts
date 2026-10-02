import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import {
  marketplaceAdvertising,
  type DatabaseClient,
} from "@lucreii/database";
import {
  calculateFinancialIndicatorsFromTotals,
  sumMoneyValues,
} from "@lucreii/domain";
import type {
  DashboardFinancialIndicators,
  DashboardMarketplaceAdvertising,
  IntegrationProviderSlug,
} from "@lucreii/types";
import type { DashboardMarketplaceAdvertisingUpdateInput } from "@lucreii/validation";
import { and, eq } from "drizzle-orm";
import { DATABASE_CLIENT } from "@/common/tokens";
import { OrdersService } from "@/modules/orders/orders.service";
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
    @Inject(OrdersService)
    private readonly ordersService: OrdersService,
  ) {}

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
    const savedMarketplaceAdvertising = await this.db.query.marketplaceAdvertising.findMany(
      {
        where: (table) =>
          and(
            eq(table.organizationId, organizationId),
            eq(table.userId, userId),
            eq(table.companyId, companyId),
            eq(table.referenceMonth, referenceMonth),
            ...(provider ? [eq(table.provider, provider)] : []),
          ),
      },
    );
    const monthlyAdvertising = sumMoneyValues(
      savedMarketplaceAdvertising.map((row) => row.amount),
    );
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
      monthlyAdvertising,
      netSales: ordersSummary.netSales,
      packagingCost: ordersSummary.packagingCost,
      productCost: ordersSummary.productCost,
      refundBonus: ordersSummary.refundBonus,
      revenue: ordersSummary.revenue,
      shippingCost: ordersSummary.shippingCost,
      taxAmount: ordersSummary.taxAmount,
      totalProfit: ordersSummary.totalProfit,
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
