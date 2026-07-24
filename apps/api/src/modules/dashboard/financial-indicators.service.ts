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
  ProductPerformanceListItem,
} from "@lucreii/types";
import { and, eq } from "drizzle-orm";
import { DATABASE_CLIENT } from "@/common/tokens";
import { ProductsService } from "@/modules/products/products.service";

@Injectable()
export class FinancialIndicatorsService {
  constructor(
    @Inject(DATABASE_CLIENT)
    private readonly db: DatabaseClient,
    @Inject(ProductsService)
    private readonly productsService: ProductsService,
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
    const result = calculateFinancialIndicators({
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

    return {
      ...result,
      fixedCostSource: hasMonthlyFixedCosts ? "monthly" : "company_default",
    };
  }
}
