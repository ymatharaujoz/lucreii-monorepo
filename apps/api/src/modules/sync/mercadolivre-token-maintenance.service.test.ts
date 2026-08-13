import { afterEach, describe, expect, it, vi } from "vitest";
import { MercadoLivreTokenMaintenanceService } from "./mercadolivre-token-maintenance.service";

describe("MercadoLivreTokenMaintenanceService", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("refreshes expired connections and triggers incremental recovery", async () => {
    const connection = {
      companyId: "company-1",
      id: "connection-1",
      organizationId: "organization-1",
    };
    const db = {
      query: {
        marketplaceConnections: {
          findMany: vi.fn().mockResolvedValue([connection]),
        },
      },
    };
    const tokenRefreshService = {
      refreshIfNeeded: vi.fn().mockResolvedValue({
        connection,
        needsReconnect: false,
        refreshed: true,
        wasExpired: true,
      }),
    };
    const syncService = {
      recoverMercadoLivreConnection: vi.fn().mockResolvedValue(undefined),
    };
    const service = new MercadoLivreTokenMaintenanceService(
      db as never,
      tokenRefreshService as never,
      syncService as never,
    );

    await service.runMaintenance();

    expect(tokenRefreshService.refreshIfNeeded).toHaveBeenCalledWith(
      connection,
    );
    expect(syncService.recoverMercadoLivreConnection).toHaveBeenCalledWith(
      connection,
    );
  });

  it("runs maintenance inside the API every 15 minutes and clears the timer on shutdown", async () => {
    vi.useFakeTimers();
    const service = new MercadoLivreTokenMaintenanceService(
      {
        query: {
          marketplaceConnections: {
            findMany: vi.fn().mockResolvedValue([]),
          },
        },
      } as never,
      { refreshIfNeeded: vi.fn() } as never,
      { recoverMercadoLivreConnection: vi.fn() } as never,
    );
    const runMaintenance = vi.spyOn(service, "runMaintenance");

    service.onApplicationBootstrap();
    await vi.advanceTimersByTimeAsync(15 * 60 * 1000);
    service.onApplicationShutdown();
    await vi.advanceTimersByTimeAsync(15 * 60 * 1000);

    expect(runMaintenance).toHaveBeenCalledTimes(2);
  });
});
