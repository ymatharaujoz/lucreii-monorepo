import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  breakEvenRoasSimulations,
  type DatabaseClient,
} from "@lucreii/database";
import {
  BREAK_EVEN_ROAS_FORMULA_VERSION,
  calculateBreakEvenRoas,
} from "@lucreii/domain";
import type {
  BreakEvenRoasSimulation,
  BreakEvenRoasSimulationList,
} from "@lucreii/types";
import type {
  BreakEvenRoasSimulationFormInput,
  BreakEvenRoasSimulationListQueryInput,
  BreakEvenRoasSimulationUpdateInput,
} from "@lucreii/validation";
import { and, asc, count, desc, eq, ilike, inArray } from "drizzle-orm";
import { DATABASE_CLIENT } from "@/common/tokens";

type TenantContext = {
  organizationId: string;
  selectedCompanyId?: string | null;
  userId: string;
};

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 100;

function toNumber(value: string) {
  return Number(value);
}

function toDecimal(value: number) {
  return value.toFixed(6);
}

function requiredIdentifier(value: string | null) {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) {
    throw new BadRequestException(
      "Informe o Nome do Produto ou SKU antes de salvar.",
    );
  }

  return trimmed;
}

@Injectable()
export class BreakEvenRoasSimulationsService {
  constructor(
    @Inject(DATABASE_CLIENT)
    private readonly db: DatabaseClient,
  ) {}

  async list(
    context: TenantContext,
    query: BreakEvenRoasSimulationListQueryInput,
  ): Promise<BreakEvenRoasSimulationList> {
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
        ilike(breakEvenRoasSimulations.productIdentifier, `%${search}%`),
      );
    }

    const where = and(...conditions);
    const [{ totalItems }] = await this.db
      .select({ totalItems: count() })
      .from(breakEvenRoasSimulations)
      .where(where);
    const sortColumn = this.getSortColumn(query.sortBy);
    const sortOrder =
      query.sortDirection === "asc" ? asc(sortColumn) : desc(sortColumn);
    const rows = await this.db
      .select()
      .from(breakEvenRoasSimulations)
      .where(where)
      .orderBy(sortOrder, desc(breakEvenRoasSimulations.id))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    const total = Number(totalItems);

    return {
      items: rows.map((row) => this.toRecord(row)),
      page,
      pageSize,
      totalItems: total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  }

  async get(
    context: TenantContext,
    simulationId: string,
  ): Promise<BreakEvenRoasSimulation> {
    const companyId = this.requireSelectedCompany(context);
    await this.ensureCompanyAccess(context, companyId);
    const simulation = await this.ensureSimulationAccess(
      context,
      simulationId,
      companyId,
    );

    return this.toRecord(simulation);
  }

  async create(
    context: TenantContext,
    input: BreakEvenRoasSimulationFormInput,
  ): Promise<BreakEvenRoasSimulation> {
    const companyId = this.requireSelectedCompany(context);
    await this.ensureCompanyAccess(context, companyId);
    const calculation = this.calculate(input);

    const [created] = await this.db
      .insert(breakEvenRoasSimulations)
      .values({
        breakEvenRoas: toDecimal(calculation.breakEvenRoas),
        calculationVersion: BREAK_EVEN_ROAS_FORMULA_VERSION,
        companyId,
        contributionMarginRate: toDecimal(calculation.contributionMarginRate),
        organizationId: context.organizationId,
        productIdentifier: requiredIdentifier(input.productIdentifier),
        userId: context.userId,
      })
      .returning();

    return this.toRecord(created);
  }

  async update(
    context: TenantContext,
    simulationId: string,
    input: BreakEvenRoasSimulationUpdateInput,
  ): Promise<BreakEvenRoasSimulation> {
    const companyId = this.requireSelectedCompany(context);
    await this.ensureCompanyAccess(context, companyId);
    await this.ensureSimulationAccess(context, simulationId, companyId);
    const calculation = this.calculate(input);

    const [updated] = await this.db
      .update(breakEvenRoasSimulations)
      .set({
        breakEvenRoas: toDecimal(calculation.breakEvenRoas),
        calculationVersion: BREAK_EVEN_ROAS_FORMULA_VERSION,
        contributionMarginRate: toDecimal(calculation.contributionMarginRate),
        productIdentifier: requiredIdentifier(input.productIdentifier),
      })
      .where(
        and(
          eq(breakEvenRoasSimulations.id, simulationId),
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
      .delete(breakEvenRoasSimulations)
      .where(
        and(
          eq(breakEvenRoasSimulations.id, simulationId),
          ...this.buildScopeConditions(context, companyId),
        ),
      )
      .returning({ id: breakEvenRoasSimulations.id });

    if (!deleted) {
      throw new NotFoundException("Simulação não encontrada.");
    }

    return deleted;
  }

  async removeMany(context: TenantContext, simulationIds: string[]) {
    const companyId = this.requireSelectedCompany(context);
    await this.ensureCompanyAccess(context, companyId);

    const ids = [...new Set(simulationIds.map((id) => id.trim()))].filter(
      Boolean,
    );

    if (ids.length === 0) {
      throw new BadRequestException("Selecione ao menos uma simulação.");
    }

    const deleted = await this.db
      .delete(breakEvenRoasSimulations)
      .where(
        and(
          inArray(breakEvenRoasSimulations.id, ids),
          ...this.buildScopeConditions(context, companyId),
        ),
      )
      .returning({ id: breakEvenRoasSimulations.id });

    return {
      ids: deleted.map((row) => row.id),
      totalDeleted: deleted.length,
    };
  }

  private calculate(
    input:
      | BreakEvenRoasSimulationFormInput
      | BreakEvenRoasSimulationUpdateInput,
  ) {
    const contributionMarginRate = toNumber(input.contributionMarginRate);
    const breakEvenRoas = calculateBreakEvenRoas(contributionMarginRate);

    if (breakEvenRoas === null) {
      throw new BadRequestException(
        "A Margem de Contribuição deve ficar entre 0% e 100%.",
      );
    }

    return { breakEvenRoas, contributionMarginRate };
  }

  private requireSelectedCompany(context: TenantContext) {
    if (!context.selectedCompanyId) {
      throw new BadRequestException("Selecione uma empresa antes de salvar.");
    }

    return context.selectedCompanyId;
  }

  private buildScopeConditions(context: TenantContext, companyId: string) {
    return [
      eq(breakEvenRoasSimulations.organizationId, context.organizationId),
      eq(breakEvenRoasSimulations.userId, context.userId),
      eq(breakEvenRoasSimulations.companyId, companyId),
    ];
  }

  private getSortColumn(
    sortBy: BreakEvenRoasSimulationListQueryInput["sortBy"],
  ) {
    switch (sortBy) {
      case "productIdentifier":
        return breakEvenRoasSimulations.productIdentifier;
      case "contributionMarginRate":
        return breakEvenRoasSimulations.contributionMarginRate;
      case "breakEvenRoas":
        return breakEvenRoasSimulations.breakEvenRoas;
      case "updatedAt":
        return breakEvenRoasSimulations.updatedAt;
      default:
        return breakEvenRoasSimulations.updatedAt;
    }
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
    const simulation = await this.db.query.breakEvenRoasSimulations.findFirst({
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
    row: typeof breakEvenRoasSimulations.$inferSelect,
  ): BreakEvenRoasSimulation {
    return {
      breakEvenRoas: row.breakEvenRoas,
      calculationVersion: row.calculationVersion,
      companyId: row.companyId,
      contributionMarginRate: row.contributionMarginRate,
      createdAt: row.createdAt.toISOString(),
      id: row.id,
      productIdentifier: row.productIdentifier,
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
