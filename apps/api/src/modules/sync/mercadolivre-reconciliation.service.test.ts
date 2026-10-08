import { afterEach, describe, expect, it, vi } from "vitest";
import { MercadoLivreReconciliationService } from "./mercadolivre-reconciliation.service";

function createService(input: {
  connections: unknown[];
  nodeEnv?: string;
  reconcile?: ReturnType<typeof vi.fn>;
}) {
  const db = {
    query: {
      marketplaceConnections: {
        findMany: vi.fn().mockResolvedValue(input.connections),
      },
    },
  };
  const syncService = {
    reconcileMercadoLivreConnection:
      input.reconcile ?? vi.fn().mockResolvedValue(true),
  };
  const service = new MercadoLivreReconciliationService(
    db as never,
    { NODE_ENV: input.nodeEnv ?? "production" } as never,
    syncService as never,
  );

  return { db, service, syncService };
}

describe("MercadoLivreReconciliationService", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("reconciles every connected connection and isolates failures", async () => {
    const connections = [{ id: "connection-1" }, { id: "connection-2" }];
    const reconcile = vi
      .fn()
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValueOnce(true);
    const { service, syncService } = createService({ connections, reconcile });

    await service.runReconciliation();

    expect(syncService.reconcileMercadoLivreConnection).toHaveBeenCalledTimes(2);
    expect(syncService.reconcileMercadoLivreConnection).toHaveBeenNthCalledWith(
      2,
      connections[1],
    );
  });

  it("runs every 5 minutes and clears the timer on shutdown", async () => {
    vi.useFakeTimers();
    const { service } = createService({ connections: [] });
    const runReconciliation = vi.spyOn(service, "runReconciliation");

    service.onApplicationBootstrap();
    await vi.advanceTimersByTimeAsync(10 * 60 * 1000);
    service.onApplicationShutdown();
    await vi.advanceTimersByTimeAsync(10 * 60 * 1000);

    expect(runReconciliation).toHaveBeenCalledTimes(2);
  });

  it("does not schedule in test environment", async () => {
    vi.useFakeTimers();
    const { service } = createService({ connections: [], nodeEnv: "test" });
    const runReconciliation = vi.spyOn(service, "runReconciliation");

    service.onApplicationBootstrap();
    await vi.advanceTimersByTimeAsync(10 * 60 * 1000);

    expect(runReconciliation).not.toHaveBeenCalled();
  });
});
