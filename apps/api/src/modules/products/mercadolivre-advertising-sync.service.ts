import {
  BadGatewayException,
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from "@nestjs/common";
import type { DatabaseClient, MarketplaceConnection } from "@lucreii/database";
import type {
  ProductListingAdvertisingSyncResult,
  ProductListingAdvertisingSyncStatus,
} from "@lucreii/types";
import { and, eq, isNotNull } from "drizzle-orm";
import type { ApiRuntimeEnv } from "@/common/config/api-env";
import { API_RUNTIME_ENV, DATABASE_CLIENT } from "@/common/tokens";
import { IntegrationProviderError } from "@/modules/integrations/integrations.types";
import { MercadoLivreAdsClient } from "@/modules/integrations/providers/mercadolivre-ads.client";
import { MercadoLivreTokenRefreshService } from "@/modules/sync/mercadolivre-token-refresh.service";
import {
  allocateAdGroupCostsToListings,
  centsToDecimalString,
} from "./listing-advertising-allocation";
import { ProductsService } from "./products.service";

/** Mercado Livre refreshes Product Ads metrics once a day (~10:00 BRT). */
const SCHEDULED_SYNC_INTERVAL_MS = 6 * 60 * 60 * 1000;
/** First run shortly after boot so deploys do not postpone it for hours. */
const SCHEDULED_SYNC_INITIAL_DELAY_MS = 2 * 60 * 1000;
/** Days into a new month during which the previous month is still refreshed. */
const PREVIOUS_MONTH_GRACE_DAYS = 2;
/** Product Ads metrics are only available for the last 90 days. */
const METRICS_RETENTION_DAYS = 90;
const SAO_PAULO_TIME_ZONE = "America/Sao_Paulo";

type TenantContext = {
  organizationId: string;
  selectedCompanyId?: string | null;
  userId: string;
};

type MonthSyncOutcome = {
  amounts: Map<string, string>;
  status: Exclude<ProductListingAdvertisingSyncStatus, "no_ads">;
};

function getSaoPauloDate(now: Date) {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: SAO_PAULO_TIME_ZONE,
    year: "numeric",
  }).format(now);
}

function shiftIsoDate(isoDate: string, days: number) {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function lastDayOfMonth(referenceMonth: string) {
  const date = new Date(`${referenceMonth}T00:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + 1, 0);
  return date.toISOString().slice(0, 10);
}

function previousReferenceMonth(referenceMonth: string) {
  const date = new Date(`${referenceMonth}T00:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() - 1, 1);
  return date.toISOString().slice(0, 10);
}

/**
 * Date range of `referenceMonth` that Mercado Livre can report on: from the
 * first day of the month up to today (São Paulo) or the end of the month.
 */
export function resolveAdvertisingDateRange(
  referenceMonth: string,
  now = new Date(),
) {
  const today = getSaoPauloDate(now);

  if (referenceMonth > today) {
    throw new BadRequestException(
      "Não é possível sincronizar a publicidade de um mês futuro.",
    );
  }

  if (referenceMonth < shiftIsoDate(today, -METRICS_RETENTION_DAYS)) {
    throw new BadRequestException(
      "O Mercado Livre só disponibiliza a publicidade dos últimos 90 dias.",
    );
  }

  const monthEnd = lastDayOfMonth(referenceMonth);

  return {
    dateFrom: referenceMonth,
    dateTo: monthEnd < today ? monthEnd : today,
  };
}

/** Months refreshed by the scheduled sync: current, plus the previous one at the start of a month. */
export function resolveScheduledReferenceMonths(now = new Date()) {
  const today = getSaoPauloDate(now);
  const currentMonth = `${today.slice(0, 7)}-01`;
  const dayOfMonth = Number(today.slice(8, 10));

  return dayOfMonth <= PREVIOUS_MONTH_GRACE_DAYS
    ? [currentMonth, previousReferenceMonth(currentMonth)]
    : [currentMonth];
}

/**
 * Fills the monthly advertising of Mercado Livre listings with the spend
 * reported by Product Ads, both on a schedule (every 6 hours) and on demand
 * from the performance screen. Synced values overwrite manual entries;
 * listings without Product Ads data keep their current value.
 */
@Injectable()
export class MercadoLivreAdvertisingSyncService
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(MercadoLivreAdvertisingSyncService.name);
  private readonly adsClient = new MercadoLivreAdsClient();
  private initialTimeout: ReturnType<typeof setTimeout> | null = null;
  private interval: ReturnType<typeof setInterval> | null = null;
  private running = false;

  constructor(
    @Inject(DATABASE_CLIENT) private readonly db: DatabaseClient,
    @Inject(API_RUNTIME_ENV) private readonly env: ApiRuntimeEnv,
    @Inject(ProductsService) private readonly productsService: ProductsService,
    @Inject(MercadoLivreTokenRefreshService)
    private readonly tokenRefreshService: MercadoLivreTokenRefreshService,
  ) {}

  onApplicationBootstrap() {
    if (this.env.NODE_ENV === "test") {
      return;
    }

    this.initialTimeout = setTimeout(() => {
      void this.runScheduledSyncSafely();
    }, SCHEDULED_SYNC_INITIAL_DELAY_MS);
    this.interval = setInterval(() => {
      void this.runScheduledSyncSafely();
    }, SCHEDULED_SYNC_INTERVAL_MS);
  }

  onApplicationShutdown() {
    if (this.initialTimeout) {
      clearTimeout(this.initialTimeout);
      this.initialTimeout = null;
    }

    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  async runScheduledSync(now = new Date()) {
    if (this.running) {
      return;
    }

    this.running = true;
    try {
      const referenceMonths = resolveScheduledReferenceMonths(now);
      const connections = await this.db.query.marketplaceConnections.findMany({
        where: (table) =>
          and(
            eq(table.provider, "mercadolivre"),
            eq(table.status, "connected"),
            isNotNull(table.accessToken),
          ),
      });

      for (const connection of connections) {
        try {
          await this.syncConnection(connection, referenceMonths, now);
        } catch (error) {
          this.logger.warn(
            `Mercado Livre advertising sync failed for connection ${connection.id}: ${error instanceof Error ? error.message : "unknown error"}`,
          );
        }
      }
    } finally {
      this.running = false;
    }
  }

  /** On-demand sync of one listing, triggered from the performance modal. */
  async syncListing(
    context: TenantContext,
    input: { advertisingKey: string; referenceMonth: string },
    now = new Date(),
  ): Promise<ProductListingAdvertisingSyncResult> {
    if (!context.selectedCompanyId) {
      throw new BadRequestException("Selected company required.");
    }

    // Validate the month before any remote call.
    resolveAdvertisingDateRange(input.referenceMonth, now);

    const companyId = context.selectedCompanyId;
    const connection = await this.db.query.marketplaceConnections.findFirst({
      where: (table) =>
        and(
          eq(table.organizationId, context.organizationId),
          eq(table.companyId, companyId),
          eq(table.provider, "mercadolivre"),
        ),
    });

    if (
      !connection ||
      connection.status !== "connected" ||
      !connection.accessToken
    ) {
      throw new BadRequestException(
        "Conecte sua conta do Mercado Livre para sincronizar a publicidade.",
      );
    }

    let outcome: MonthSyncOutcome;
    try {
      outcome = await this.syncMonth({
        connection,
        context: { ...context, selectedCompanyId: companyId },
        now,
        onlyAdvertisingKey: input.advertisingKey,
        referenceMonth: input.referenceMonth,
      });
    } catch (error) {
      if (error instanceof IntegrationProviderError) {
        this.logger.warn(
          `Mercado Livre advertising sync failed for connection ${connection.id}: ${error.message}`,
        );
        throw new BadGatewayException(
          "Não foi possível consultar a publicidade no Mercado Livre. Tente novamente.",
        );
      }

      throw error;
    }

    const amount = outcome.amounts.get(input.advertisingKey) ?? null;

    return {
      advertisingKey: input.advertisingKey,
      amount,
      channel: "mercadolivre",
      referenceMonth: input.referenceMonth,
      status:
        outcome.status === "not_advertiser"
          ? "not_advertiser"
          : amount === null
            ? "no_ads"
            : "synced",
    };
  }

  private async syncConnection(
    connection: MarketplaceConnection,
    referenceMonths: string[],
    now: Date,
  ) {
    const company = await this.db.query.companies.findFirst({
      where: (table) =>
        and(
          eq(table.id, connection.companyId),
          eq(table.organizationId, connection.organizationId),
        ),
    });

    if (!company?.isActive) {
      return;
    }

    for (const referenceMonth of referenceMonths) {
      const outcome = await this.syncMonth({
        connection,
        context: {
          organizationId: connection.organizationId,
          selectedCompanyId: company.id,
          userId: company.userId,
        },
        now,
        referenceMonth,
      });

      if (outcome.status === "not_advertiser") {
        return;
      }
    }
  }

  private async syncMonth(input: {
    connection: MarketplaceConnection;
    context: TenantContext & { selectedCompanyId: string };
    now: Date;
    onlyAdvertisingKey?: string;
    referenceMonth: string;
  }): Promise<MonthSyncOutcome> {
    const { dateFrom, dateTo } = resolveAdvertisingDateRange(
      input.referenceMonth,
      input.now,
    );
    const refreshResult = await this.tokenRefreshService.refreshIfNeeded(
      input.connection,
    );
    const accessToken = refreshResult.connection.accessToken;

    if (refreshResult.needsReconnect || !accessToken) {
      throw new BadRequestException(
        "Reconecte sua conta do Mercado Livre para sincronizar a publicidade.",
      );
    }

    const advertiser =
      await this.adsClient.findProductAdsAdvertiser(accessToken);

    if (!advertiser) {
      return { amounts: new Map(), status: "not_advertiser" };
    }

    const [adGroupCosts, { companyId, targets }] = await Promise.all([
      this.adsClient.listAdGroupCostsInCents({
        accessToken,
        advertiser,
        dateFrom,
        dateTo,
      }),
      this.productsService.listMercadoLivreAdvertisingTargets(
        input.context,
        input.referenceMonth,
      ),
    ]);
    const allocation = allocateAdGroupCostsToListings(adGroupCosts, targets);
    const amounts = new Map<string, string>();

    for (const [advertisingKey, cents] of allocation) {
      if (
        input.onlyAdvertisingKey === undefined ||
        input.onlyAdvertisingKey === advertisingKey
      ) {
        amounts.set(advertisingKey, centsToDecimalString(cents));
      }
    }

    await this.productsService.saveSyncedListingAdvertising({
      amounts,
      channel: "mercadolivre",
      companyId,
      organizationId: input.context.organizationId,
      referenceMonth: input.referenceMonth,
      userId: input.context.userId,
    });

    return { amounts, status: "synced" };
  }

  private async runScheduledSyncSafely() {
    try {
      await this.runScheduledSync();
    } catch (error) {
      this.logger.error(
        "Mercado Livre advertising sync failed.",
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}
