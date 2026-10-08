import {
  Inject,
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from "@nestjs/common";
import type { DatabaseClient } from "@lucreii/database";
import { and, eq, isNotNull } from "drizzle-orm";
import type { ApiRuntimeEnv } from "@/common/config/api-env";
import { API_RUNTIME_ENV, DATABASE_CLIENT } from "@/common/tokens";
import { SyncService } from "./sync.service";

const RECONCILIATION_INTERVAL_MS = 5 * 60 * 1000;

/**
 * Webhooks are the fast path for new Mercado Livre orders, but they can be
 * dropped or fail. This periodic incremental sweep guarantees convergence.
 */
@Injectable()
export class MercadoLivreReconciliationService
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(MercadoLivreReconciliationService.name);
  private interval: ReturnType<typeof setInterval> | null = null;
  private running = false;

  constructor(
    @Inject(DATABASE_CLIENT) private readonly db: DatabaseClient,
    @Inject(API_RUNTIME_ENV) private readonly env: ApiRuntimeEnv,
    @Inject(SyncService)
    private readonly syncService: SyncService,
  ) {}

  onApplicationBootstrap() {
    if (this.env.NODE_ENV === "test") {
      return;
    }

    this.interval = setInterval(() => {
      void this.runSafely();
    }, RECONCILIATION_INTERVAL_MS);
  }

  onApplicationShutdown() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  async runReconciliation() {
    if (this.running) {
      return;
    }

    this.running = true;
    try {
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
          await this.syncService.reconcileMercadoLivreConnection(connection);
        } catch (error) {
          this.logger.warn(
            `Mercado Livre reconciliation failed for connection ${connection.id}: ${error instanceof Error ? error.message : "unknown error"}`,
          );
        }
      }
    } finally {
      this.running = false;
    }
  }

  private async runSafely() {
    try {
      await this.runReconciliation();
    } catch (error) {
      this.logger.error(
        "Mercado Livre reconciliation failed.",
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}
