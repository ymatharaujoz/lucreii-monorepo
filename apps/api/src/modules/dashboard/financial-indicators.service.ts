import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { DatabaseClient } from "@lucreii/database";
import {
  calculateFinancialIndicatorsFromTotals,
  sumMoneyValues,
} from "@lucreii/domain";
import type {
  DashboardFinancialIndicators,
  IntegrationProviderSlug,
} from "@lucreii/types";
import { and, eq } from "drizzle-orm";
import { DATABASE_CLIENT } from "@/common/tokens";
import { OrdersService } from "@/modules/orders/orders.service";
import type { DashboardDateRange } from "./dashboard.service";

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
    const monthlyFinance = await this.db.query.companyMonthlyFinance?.findFirst({
      where: (table) =>
        and(
          eq(table.organizationId, organizationId),
          eq(table.companyId, companyId),
          eq(table.referenceMonth, referenceMonth),
        ),
    });
    const hasMonthlyFixedCosts = monthlyFixedCosts.length > 0;
    const fixedCostOverride = monthlyFinance?.fixedCost ?? null;
    const fixedCost =
      fixedCostOverride !== null
        ? fixedCostOverride
        : hasMonthlyFixedCosts
          ? sumMoneyValues(monthlyFixedCosts.map((row) => row.amount))
          : company.fixedCostDefault;
    const taxRate = monthlyFinance?.taxRate ?? company.taxRateDefault;
    const fixedCostSource =
      fixedCostOverride !== null
        ? "monthly_override"
        : hasMonthlyFixedCosts
          ? "monthly"
          : "company_default";
    // Advertising is entered per listing on the products performance screen;
    // the dashboard always uses the full month, regardless of the date range.
    const savedListingAdvertising =
      await this.db.query.productListingAdvertising.findMany({
        where: (table) =>
          and(
            eq(table.organizationId, organizationId),
            eq(table.companyId, companyId),
            eq(table.referenceMonth, referenceMonth),
            ...(provider ? [eq(table.provider, provider)] : []),
          ),
      });
    const monthlyAdvertising = sumMoneyValues(
      savedListingAdvertising.map((row) => row.amount),
    );
    const advertising = monthlyAdvertising;
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
      couponDiscount: ordersSummary.couponDiscount,
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
      fixedCostSource,
      grossSales: ordersSummary.grossSales,
      monthlyAdvertising,
      taxRate: String(taxRate),
    };
  }
}
