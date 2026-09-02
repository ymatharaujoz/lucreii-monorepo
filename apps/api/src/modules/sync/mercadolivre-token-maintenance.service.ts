import {
  Inject,
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from "@nestjs/common";
import { marketplaceConnections, type DatabaseClient } from "@lucreii/database";
import { and, eq, isNotNull, lte } from "drizzle-orm";
import { DATABASE_CLIENT } from "@/common/tokens";
import { MercadoLivreTokenRefreshService } from "./mercadolivre-token-refresh.service";
import { SyncService } from "./sync.service";

const MAINTENANCE_INTERVAL_MS = 15 * 60 * 1000;
const REFRESH_WINDOW_MS = 30 * 60 * 1000;

@Injectable()
export class MercadoLivreTokenMaintenanceService
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(
    MercadoLivreTokenMaintenanceService.name,
  );
  private interval: ReturnType<typeof setInterval> | null = null;
  private running = false;

  constructor(
    @Inject(DATABASE_CLIENT) private readonly db: DatabaseClient,
    @Inject(MercadoLivreTokenRefreshService)
    private readonly tokenRefreshService: MercadoLivreTokenRefreshService,
    @Inject(SyncService)
    private readonly syncService: SyncService,
  ) {}

  onApplicationBootstrap() {
    void this.runSafely();
    this.interval = setInterval(() => {
      void this.runSafely();
    }, MAINTENANCE_INTERVAL_MS);
  }

  onApplicationShutdown() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  async runMaintenance() {
    if (this.running) {
      return;
    }

    this.running = true;
    try {
      const dueConnections =
        await this.db.query.marketplaceConnections.findMany({
          where: (table) =>
            and(
              eq(table.provider, "mercadolivre"),
              eq(table.status, "connected"),
              isNotNull(table.tokenExpiresAt),
              lte(
                table.tokenExpiresAt,
                new Date(Date.now() + REFRESH_WINDOW_MS),
              ),
            ),
        });

      for (const connection of dueConnections) {
        try {
          const refreshResult =
            await this.tokenRefreshService.refreshIfNeeded(connection);
          if (
            refreshResult.refreshed &&
            refreshResult.wasExpired &&
            !refreshResult.needsReconnect
          ) {
            await this.syncService.recoverMercadoLivreConnection(
              refreshResult.connection,
            );
          }
        } catch (error) {
          this.logger.warn(
            `Mercado Livre maintenance failed for connection ${connection.id}: ${error instanceof Error ? error.message : "unknown error"}`,
          );
        }
      }
    } finally {
      this.running = false;
    }
  }

  private async runSafely() {
    try {
      await this.runMaintenance();
    } catch (error) {
      this.logger.error(
        "Mercado Livre token maintenance failed.",
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}
