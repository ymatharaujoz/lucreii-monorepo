import { Body, Controller, Get, Inject, Patch, Query, UseGuards } from "@nestjs/common";
import { z } from "zod";
import { CurrentAuthContext } from "@/modules/auth/current-auth-context";
import { requireSelectedCompanyId } from "@/modules/auth/selected-company";
import type { AuthenticatedRequestContext } from "@/modules/auth/auth.types";
import { EntitlementGuard } from "@/modules/billing/entitlement.guard";
import { DashboardService } from "./dashboard.service";
import { UpdateDashboardMarketplaceAdvertisingRequestDto } from "./dashboard.dto";

const referenceMonthSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-01$/);
const isoDateSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const date = new Date(`${value}T12:00:00.000Z`);
    return date.toISOString().slice(0, 10) === value;
  }, "Invalid calendar date.");

function getSaoPauloCurrentDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/Sao_Paulo",
    year: "numeric",
  }).formatToParts(now);
  const day = parts.find((part) => part.type === "day")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const year = parts.find((part) => part.type === "year")?.value;

  return year && month && day
    ? `${year}-${month}-${day}`
    : now.toISOString().slice(0, 10);
}

function createDashboardQuerySchema(
  referenceMonth: z.ZodType<string | undefined>,
) {
  return z
    .object({
      dateFrom: isoDateSchema.optional(),
      dateTo: isoDateSchema.optional(),
      provider: z.enum(["mercadolivre", "shopee", "shein"]).optional(),
      referenceMonth,
    })
    .superRefine((value, context) => {
      const hasDateFrom = value.dateFrom !== undefined;
      const hasDateTo = value.dateTo !== undefined;

      if (hasDateFrom !== hasDateTo) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "dateFrom and dateTo must be provided together.",
          path: hasDateFrom ? ["dateTo"] : ["dateFrom"],
        });
        return;
      }

      if (!value.dateFrom || !value.dateTo) {
        return;
      }

      if (!value.referenceMonth) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "referenceMonth is required when filtering by date.",
          path: ["referenceMonth"],
        });
      }

      if (value.dateFrom > value.dateTo) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "dateFrom must be on or before dateTo.",
          path: ["dateFrom"],
        });
      }

      if (
        value.referenceMonth &&
        (value.dateFrom.slice(0, 7) !== value.referenceMonth.slice(0, 7) ||
          value.dateTo.slice(0, 7) !== value.referenceMonth.slice(0, 7))
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Selected dates must belong to referenceMonth.",
          path: ["dateFrom"],
        });
      }

      const today = getSaoPauloCurrentDate();
      if (value.dateFrom > today || value.dateTo > today) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Selected dates cannot be in the future.",
          path: value.dateFrom > today ? ["dateFrom"] : ["dateTo"],
        });
      }
    });
}

class DashboardProviderQueryDto {
  static schema = createDashboardQuerySchema(referenceMonthSchema.optional());

  dateFrom?: string;
  dateTo?: string;
  provider?: "mercadolivre" | "shopee" | "shein";
  referenceMonth?: string;
}

class DashboardFinancialIndicatorsQueryDto {
  static schema = createDashboardQuerySchema(referenceMonthSchema);

  dateFrom?: string;
  dateTo?: string;
  provider?: "mercadolivre" | "shopee" | "shein";
  referenceMonth!: string;
}

function getDashboardDateRange(query: {
  dateFrom?: string;
  dateTo?: string;
}) {
  return query.dateFrom && query.dateTo
    ? { dateFrom: query.dateFrom, dateTo: query.dateTo }
    : undefined;
}

@Controller("dashboard")
@UseGuards(EntitlementGuard)
export class DashboardController {
  constructor(
    @Inject(DashboardService)
    private readonly dashboardService: DashboardService,
  ) {}

  @Get("summary")
  async getSummary(
    @CurrentAuthContext() authContext: AuthenticatedRequestContext,
    @Query() query: DashboardProviderQueryDto,
  ) {
    const companyId = requireSelectedCompanyId(authContext);
    return {
      data: await this.dashboardService.readSummary(
        authContext.organization!.id,
        companyId,
        query.provider,
        query.referenceMonth,
        getDashboardDateRange(query),
      ),
      error: null,
    };
  }

  @Get("charts")
  async getCharts(
    @CurrentAuthContext() authContext: AuthenticatedRequestContext,
    @Query() query: DashboardProviderQueryDto,
  ) {
    const companyId = requireSelectedCompanyId(authContext);
    return {
      data: await this.dashboardService.readCharts(
        authContext.organization!.id,
        companyId,
        query.provider,
        query.referenceMonth,
        getDashboardDateRange(query),
      ),
      error: null,
    };
  }

  @Get("recent-sync")
  async getRecentSync(
    @CurrentAuthContext() authContext: AuthenticatedRequestContext,
    @Query() query: DashboardProviderQueryDto,
  ) {
    const companyId = requireSelectedCompanyId(authContext);
    return {
      data: await this.dashboardService.readRecentSync(
        authContext.organization!.id,
        companyId,
        query.provider,
      ),
      error: null,
    };
  }

  @Get("profitability")
  async getProfitability(
    @CurrentAuthContext() authContext: AuthenticatedRequestContext,
    @Query() query: DashboardProviderQueryDto,
  ) {
    const companyId = requireSelectedCompanyId(authContext);
    return {
      data: await this.dashboardService.readProfitability(
        authContext.organization!.id,
        companyId,
        query.provider,
        query.referenceMonth,
        getDashboardDateRange(query),
      ),
      error: null,
    };
  }

  @Get("financial-indicators")
  async getFinancialIndicators(
    @CurrentAuthContext() authContext: AuthenticatedRequestContext,
    @Query() query: DashboardFinancialIndicatorsQueryDto,
  ) {
    const companyId = requireSelectedCompanyId(authContext);
    return {
      data: await this.dashboardService.readFinancialIndicators(
        authContext.organization!.id,
        authContext.user.id,
        companyId,
        query.provider,
        query.referenceMonth,
        getDashboardDateRange(query),
      ),
      error: null,
    };
  }

  @Patch("marketplace-advertising")
  async updateMarketplaceAdvertising(
    @CurrentAuthContext() authContext: AuthenticatedRequestContext,
    @Body() body: UpdateDashboardMarketplaceAdvertisingRequestDto,
  ) {
    const companyId = requireSelectedCompanyId(authContext);
    return {
      data: await this.dashboardService.updateMarketplaceAdvertising(
        authContext.organization!.id,
        authContext.user.id,
        companyId,
        body,
      ),
      error: null,
    };
  }
}
