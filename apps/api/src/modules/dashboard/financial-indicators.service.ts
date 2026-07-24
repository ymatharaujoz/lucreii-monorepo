import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import {
  type DatabaseClient,
} from "@lucreii/database";
import {
  calculateFinancialIndicators,
  sumMoneyValues,
} from "@lucreii/domain";
import type {
  DashboardFinancialIndicators,
  IntegrationProviderSlug,
} from "@lucreii/types";
import { and, eq } from "drizzle-orm";
import { DATABASE_CLIENT } from "@/common/tokens";

@Injectable()
export class FinancialIndicatorsService {
  constructor(
    @Inject(DATABASE_CLIENT)
    private readonly db: DatabaseClient,
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
      lines: lines.map((line) => ({
        advertisingCost: line.advertisingCost,
        commissionRate: line.commissionRate,
        packagingCost: line.packagingCost,
        returnsQuantity: line.returnsQuantity,
        salePrice: line.salePrice,
        salesQuantity: line.salesQuantity,
        shippingFee: line.shippingFee,
        unitCost: line.unitCost,
      })),
      taxRate: company.taxRateDefault,
    });

    return {
      ...result,
      fixedCostSource: hasMonthlyFixedCosts ? "monthly" : "company_default",
    };
  }
}
