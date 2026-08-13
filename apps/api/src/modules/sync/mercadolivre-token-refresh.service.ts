import { randomUUID } from "node:crypto";
import { Inject, Injectable, Logger } from "@nestjs/common";
import {
  marketplaceConnections,
  type DatabaseClient,
  type MarketplaceConnection,
} from "@lucreii/database";
import { and, eq, isNull, lt, or } from "drizzle-orm";
import type { ApiRuntimeEnv } from "@/common/config/api-env";
import { API_RUNTIME_ENV, DATABASE_CLIENT } from "@/common/tokens";
import { IntegrationProviderError } from "@/modules/integrations/integrations.types";
import { MercadoLivreProvider } from "@/modules/integrations/providers/mercadolivre.provider";

const REFRESH_WINDOW_MS = 30 * 60 * 1000;
const REFRESH_LEASE_DURATION_MS = 2 * 60 * 1000;

export type MercadoLivreTokenRefreshResult = {
  connection: MarketplaceConnection;
  needsReconnect: boolean;
  refreshed: boolean;
  wasExpired: boolean;
};

function getExpiryMs(connection: MarketplaceConnection) {
  if (!connection.tokenExpiresAt) {
    return null;
  }

  const expiresAt = new Date(connection.tokenExpiresAt).getTime();
  return Number.isNaN(expiresAt) ? null : expiresAt;
}

@Injectable()
export class MercadoLivreTokenRefreshService {
  private readonly logger = new Logger(MercadoLivreTokenRefreshService.name);
  private readonly provider: MercadoLivreProvider;
  private readonly refreshesInFlight = new Map<
    string,
    Promise<MercadoLivreTokenRefreshResult>
  >();

  constructor(
    @Inject(DATABASE_CLIENT) private readonly db: DatabaseClient,
    @Inject(API_RUNTIME_ENV) env: ApiRuntimeEnv,
  ) {
    this.provider = new MercadoLivreProvider(env);
  }

  isRefreshDue(connection: MarketplaceConnection, now = Date.now()) {
    const expiresAt = getExpiryMs(connection);
    return expiresAt !== null && expiresAt <= now + REFRESH_WINDOW_MS;
  }

  async refreshIfNeeded(
    connection: MarketplaceConnection,
  ): Promise<MercadoLivreTokenRefreshResult> {
    const inFlight = this.refreshesInFlight.get(connection.id);
    if (inFlight) {
      return inFlight;
    }

    let refreshAttempt: Promise<MercadoLivreTokenRefreshResult>;
    refreshAttempt = this.refreshWithLease(connection).finally(() => {
      if (this.refreshesInFlight.get(connection.id) === refreshAttempt) {
        this.refreshesInFlight.delete(connection.id);
      }
    });
    this.refreshesInFlight.set(connection.id, refreshAttempt);

    return refreshAttempt;
  }

  private async refreshWithLease(
    connection: MarketplaceConnection,
  ): Promise<MercadoLivreTokenRefreshResult> {
    const now = Date.now();
    const expiresAt = getExpiryMs(connection);
    const wasExpired = expiresAt !== null && expiresAt <= now;

    if (connection.status !== "connected") {
      return {
        connection,
        needsReconnect: connection.status === "needs_reconnect",
        refreshed: false,
        wasExpired,
      };
    }

    if (!connection.accessToken || !connection.refreshToken) {
      return this.markNeedsReconnect(connection, wasExpired);
    }

    if (!this.isRefreshDue(connection, now)) {
      return {
        connection,
        needsReconnect: false,
        refreshed: false,
        wasExpired,
      };
    }

    const leaseId = randomUUID();
    const leaseExpiresAt = new Date(now + REFRESH_LEASE_DURATION_MS);
    const [leasedConnection] = await this.db
      .update(marketplaceConnections)
      .set({
        tokenRefreshLeaseExpiresAt: leaseExpiresAt,
        tokenRefreshLeaseId: leaseId,
        updatedAt: new Date(now),
      })
      .where(
        and(
          eq(marketplaceConnections.id, connection.id),
          eq(marketplaceConnections.status, "connected"),
          eq(marketplaceConnections.refreshToken, connection.refreshToken),
          or(
            isNull(marketplaceConnections.tokenRefreshLeaseExpiresAt),
            lt(
              marketplaceConnections.tokenRefreshLeaseExpiresAt,
              new Date(now),
            ),
          ),
        ),
      )
      .returning();

    if (!leasedConnection) {
      return this.resolveContendedRefresh(connection, wasExpired);
    }

    try {
      const refreshed =
        await this.provider.refreshAccessToken(leasedConnection);
      const [updatedConnection] = await this.db
        .update(marketplaceConnections)
        .set({
          accessToken: refreshed.accessToken,
          refreshToken: refreshed.refreshToken,
          status: "connected",
          tokenExpiresAt: refreshed.tokenExpiresAt,
          tokenRefreshLeaseExpiresAt: null,
          tokenRefreshLeaseId: null,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(marketplaceConnections.id, connection.id),
            eq(marketplaceConnections.refreshToken, connection.refreshToken),
            eq(marketplaceConnections.tokenRefreshLeaseId, leaseId),
          ),
        )
        .returning();

      if (updatedConnection) {
        return {
          connection: updatedConnection,
          needsReconnect: false,
          refreshed: true,
          wasExpired,
        };
      }

      return this.resolveContendedRefresh(connection, wasExpired);
    } catch (error) {
      if (
        error instanceof IntegrationProviderError &&
        error.code === "token_refresh_invalid"
      ) {
        return this.markNeedsReconnect(connection, wasExpired, leaseId);
      }

      await this.releaseLease(connection.id, leaseId);
      this.logger.warn(
        `Mercado Livre token refresh failed for connection ${connection.id}; will retry before the next sync.`,
      );
      throw error;
    }
  }

  private async resolveContendedRefresh(
    originalConnection: MarketplaceConnection,
    wasExpired: boolean,
  ): Promise<MercadoLivreTokenRefreshResult> {
    const current = await this.db.query.marketplaceConnections.findFirst({
      where: (table) => eq(table.id, originalConnection.id),
    });

    if (!current || current.status === "needs_reconnect") {
      return {
        connection: current ?? originalConnection,
        needsReconnect: true,
        refreshed: false,
        wasExpired,
      };
    }

    if (!this.isRefreshDue(current)) {
      return {
        connection: current,
        needsReconnect: false,
        refreshed: current.refreshToken !== originalConnection.refreshToken,
        wasExpired,
      };
    }

    throw new IntegrationProviderError(
      "Mercado Livre token refresh is already in progress for this connection.",
      "remote_request_failed",
    );
  }

  private async markNeedsReconnect(
    connection: MarketplaceConnection,
    wasExpired: boolean,
    leaseId?: string,
  ): Promise<MercadoLivreTokenRefreshResult> {
    const where = leaseId
      ? and(
          eq(marketplaceConnections.id, connection.id),
          eq(marketplaceConnections.tokenRefreshLeaseId, leaseId),
        )
      : eq(marketplaceConnections.id, connection.id);
    const [updatedConnection] = await this.db
      .update(marketplaceConnections)
      .set({
        accessToken: null,
        refreshToken: null,
        status: "needs_reconnect",
        tokenExpiresAt: null,
        tokenRefreshLeaseExpiresAt: null,
        tokenRefreshLeaseId: null,
        updatedAt: new Date(),
      })
      .where(where)
      .returning();

    return {
      connection: updatedConnection ?? connection,
      needsReconnect: true,
      refreshed: false,
      wasExpired,
    };
  }

  private async releaseLease(connectionId: string, leaseId: string) {
    await this.db
      .update(marketplaceConnections)
      .set({
        tokenRefreshLeaseExpiresAt: null,
        tokenRefreshLeaseId: null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(marketplaceConnections.id, connectionId),
          eq(marketplaceConnections.tokenRefreshLeaseId, leaseId),
        ),
      );
  }
}
