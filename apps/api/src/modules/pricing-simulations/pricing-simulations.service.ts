import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { pricingSimulations, type DatabaseClient } from "@lucreii/database";
import {
  calculatePricing,
  PRICING_FORMULA_VERSION,
  type PricingInputs,
} from "@lucreii/domain";
import type {
  PricingSimulation,
  PricingSimulationList,
  PricingSimulationMode,
} from "@lucreii/types";
import type {
  PricingSimulationFormInput,
  PricingSimulationListQueryInput,
  PricingSimulationUpdateInput,
} from "@lucreii/validation";
import { and, count, desc, eq, ilike, or } from "drizzle-orm";
import { DATABASE_CLIENT } from "@/common/tokens";

type TenantContext = {
  organizationId: string;
  selectedCompanyId?: string | null;
  userId: string;
};

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

function toNumber(value: string) {
  return Number(value);
}

function toDecimal(value: number) {
  return value.toFixed(6);
}

function emptyToNull(value: string | null) {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
}

@Injectable()
export class PricingSimulationsService {
  constructor(
    @Inject(DATABASE_CLIENT)
    private readonly db: DatabaseClient,
  ) {}

  async list(
    context: TenantContext,
    query: PricingSimulationListQueryInput,
  ): Promise<PricingSimulationList> {
    const companyId = this.requireSelectedCompany(context);
    await this.ensureCompanyAccess(context, companyId);

    const page = query.page ?? DEFAULT_PAGE;
    const pageSize = Math.min(
      query.pageSize ?? DEFAULT_PAGE_SIZE,
      MAX_PAGE_SIZE,
    );
    const conditions = this.buildScopeConditions(context, companyId);
    const search = query.search?.trim();

    if (search) {
      conditions.push(
        or(
          ilike(pricingSimulations.productSku, `%${search}%`),
          ilike(pricingSimulations.productName, `%${search}%`),
        )!,
      );
    }

    const where = and(...conditions);
    const [{ totalItems }] = await this.db
      .select({ totalItems: count() })
      .from(pricingSimulations)
      .where(where);
    const rows = await this.db.query.pricingSimulations.findMany({
      limit: pageSize,
      offset: (page - 1) * pageSize,
      orderBy: (table) => [desc(table.createdAt), desc(table.id)],
      where: () => where,
    });

    const total = Number(totalItems);

    return {
      items: rows.map((row) => this.toRecord(row)),
      page,
      pageSize,
      totalItems: total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  }

  async create(
    context: TenantContext,
    input: PricingSimulationFormInput,
  ): Promise<PricingSimulation> {
    const companyId = this.requireSelectedCompany(context);
    await this.ensureCompanyAccess(context, companyId);
    const calculation = this.calculate(input);

    const [created] = await this.db
      .insert(pricingSimulations)
      .values({
        affiliateCommissionRate: toDecimal(
          calculation.inputs.affiliateCommissionRate,
        ),
        calculationVersion: PRICING_FORMULA_VERSION,
        companyId,
        contributionMargin: toDecimal(calculation.result.contributionMargin),
        fixedCostsTotal: toDecimal(calculation.result.fixedCosts),
        grossProfit: toDecimal(calculation.result.grossProfit),
        marketplaceCommissionRate: toDecimal(
          calculation.inputs.marketplaceCommissionRate,
        ),
        mode: input.mode,
        organizationId: context.organizationId,
        otherFixedCosts: toDecimal(calculation.inputs.otherFixedCosts),
        otherVariableCostRate: toDecimal(
          calculation.inputs.otherVariableCostRate,
        ),
        packagingCost: toDecimal(calculation.inputs.packagingCost),
        productCost: toDecimal(calculation.inputs.productCost),
        productName: emptyToNull(input.productName),
        productSku: emptyToNull(input.productSku),
        recommendedSalePrice: toDecimal(
          calculation.result.recommendedSalePrice,
        ),
        shippingFee: toDecimal(calculation.inputs.shippingFee),
        storeCouponRate: toDecimal(calculation.inputs.storeCouponRate),
        target: toDecimal(calculation.inputs.target),
        taxRate: toDecimal(calculation.inputs.taxRate),
        userId: context.userId,
        variableRatesTotal: toDecimal(calculation.result.variableRates),
      })
      .returning();

    return this.toRecord(created);
  }

  async update(
    context: TenantContext,
    simulationId: string,
    input: PricingSimulationUpdateInput,
  ): Promise<PricingSimulation> {
    const companyId = this.requireSelectedCompany(context);
    await this.ensureCompanyAccess(context, companyId);
    await this.ensureSimulationAccess(context, simulationId, companyId);
    const calculation = this.calculate(input);

    const [updated] = await this.db
      .update(pricingSimulations)
      .set({
        affiliateCommissionRate: toDecimal(
          calculation.inputs.affiliateCommissionRate,
        ),
        calculationVersion: PRICING_FORMULA_VERSION,
        contributionMargin: toDecimal(calculation.result.contributionMargin),
        fixedCostsTotal: toDecimal(calculation.result.fixedCosts),
        grossProfit: toDecimal(calculation.result.grossProfit),
        marketplaceCommissionRate: toDecimal(
          calculation.inputs.marketplaceCommissionRate,
        ),
        mode: input.mode,
        otherFixedCosts: toDecimal(calculation.inputs.otherFixedCosts),
        otherVariableCostRate: toDecimal(
          calculation.inputs.otherVariableCostRate,
        ),
        packagingCost: toDecimal(calculation.inputs.packagingCost),
        productCost: toDecimal(calculation.inputs.productCost),
        productName: emptyToNull(input.productName),
        productSku: emptyToNull(input.productSku),
        recommendedSalePrice: toDecimal(
          calculation.result.recommendedSalePrice,
        ),
        shippingFee: toDecimal(calculation.inputs.shippingFee),
        storeCouponRate: toDecimal(calculation.inputs.storeCouponRate),
        target: toDecimal(calculation.inputs.target),
        taxRate: toDecimal(calculation.inputs.taxRate),
        variableRatesTotal: toDecimal(calculation.result.variableRates),
      })
      .where(
        and(
          eq(pricingSimulations.id, simulationId),
          ...this.buildScopeConditions(context, companyId),
        ),
      )
      .returning();

    if (!updated) {
      throw new NotFoundException("Simulação não encontrada.");
    }

    return this.toRecord(updated);
  }

  async remove(context: TenantContext, simulationId: string) {
    const companyId = this.requireSelectedCompany(context);
    await this.ensureCompanyAccess(context, companyId);
    const [deleted] = await this.db
      .delete(pricingSimulations)
      .where(
        and(
          eq(pricingSimulations.id, simulationId),
          ...this.buildScopeConditions(context, companyId),
        ),
      )
      .returning({ id: pricingSimulations.id });

    if (!deleted) {
      throw new NotFoundException("Simulação não encontrada.");
    }

    return deleted;
  }

  private calculate(
    input: PricingSimulationFormInput | PricingSimulationUpdateInput,
  ) {
    const inputs: PricingInputs = {
      affiliateCommissionRate: toNumber(input.affiliateCommissionRate),
      marketplaceCommissionRate: toNumber(input.marketplaceCommissionRate),
      otherFixedCosts: toNumber(input.otherFixedCosts),
      otherVariableCostRate: toNumber(input.otherVariableCostRate),
      packagingCost: toNumber(input.packagingCost),
      productCost: toNumber(input.productCost),
      shippingFee: toNumber(input.shippingFee),
      storeCouponRate: toNumber(input.storeCouponRate),
      target: toNumber(input.target),
      taxRate: toNumber(input.taxRate),
    };
    const result = calculatePricing(input.mode, inputs);

    if (!result.ok) {
      throw new BadRequestException(
        result.errors[0]?.message ?? "Simulação inválida.",
      );
    }

    return { inputs, result: result.result };
  }

  private requireSelectedCompany(context: TenantContext) {
    if (!context.selectedCompanyId) {
      throw new BadRequestException("Selecione uma empresa antes de salvar.");
    }

    return context.selectedCompanyId;
  }

  private buildScopeConditions(context: TenantContext, companyId: string) {
    return [
      eq(pricingSimulations.organizationId, context.organizationId),
      eq(pricingSimulations.userId, context.userId),
      eq(pricingSimulations.companyId, companyId),
    ];
  }

  private async ensureCompanyAccess(context: TenantContext, companyId: string) {
    const company = await this.db.query.companies.findFirst({
      where: (table) =>
        and(
          eq(table.id, companyId),
          eq(table.organizationId, context.organizationId),
          eq(table.userId, context.userId),
        ),
    });

    if (!company) {
      throw new ForbiddenException(
        "A empresa selecionada não está disponível.",
      );
    }

    return company;
  }

  private async ensureSimulationAccess(
    context: TenantContext,
    simulationId: string,
    companyId: string,
  ) {
    const simulation = await this.db.query.pricingSimulations.findFirst({
      where: (table) =>
        and(
          eq(table.id, simulationId),
          ...this.buildScopeConditions(context, companyId),
        ),
    });

    if (!simulation) {
      throw new NotFoundException("Simulação não encontrada.");
    }

    return simulation;
  }

  private toRecord(
    row: typeof pricingSimulations.$inferSelect,
  ): PricingSimulation {
    return {
      affiliateCommissionRate: row.affiliateCommissionRate,
      calculationVersion: row.calculationVersion,
      companyId: row.companyId,
      contributionMargin: row.contributionMargin,
      createdAt: row.createdAt.toISOString(),
      fixedCosts: row.fixedCostsTotal,
      grossProfit: row.grossProfit,
      id: row.id,
      marketplaceCommissionRate: row.marketplaceCommissionRate,
      mode: row.mode as PricingSimulationMode,
      otherFixedCosts: row.otherFixedCosts,
      otherVariableCostRate: row.otherVariableCostRate,
      packagingCost: row.packagingCost,
      productCost: row.productCost,
      productName: row.productName,
      productSku: row.productSku,
      recommendedSalePrice: row.recommendedSalePrice,
      shippingFee: row.shippingFee,
      storeCouponRate: row.storeCouponRate,
      target: row.target,
      taxRate: row.taxRate,
      updatedAt: row.updatedAt.toISOString(),
      variableRates: row.variableRatesTotal,
    };
  }
}
