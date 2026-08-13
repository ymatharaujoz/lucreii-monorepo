import { afterEach, describe, expect, it, vi } from "vitest";
import { MercadoLivreTokenRefreshService } from "./mercadolivre-token-refresh.service";

function createConnection(overrides: Record<string, unknown> = {}) {
  return {
    accessToken: "access-old",
    companyId: "company-1",
    createdAt: new Date("2026-08-13T10:00:00.000Z"),
    externalAccountId: "seller-1",
    id: "connection-1",
    lastSyncedAt: null,
    metadata: {},
    organizationId: "organization-1",
    provider: "mercadolivre",
    refreshToken: "refresh-old",
    status: "connected",
    tokenExpiresAt: new Date("2026-08-13T10:10:00.000Z"),
    tokenRefreshLeaseExpiresAt: null,
    tokenRefreshLeaseId: null,
    updatedAt: new Date("2026-08-13T10:00:00.000Z"),
    ...overrides,
  };
}

function createUpdateMock(returningRows: unknown[]) {
  return {
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue(returningRows),
      }),
    }),
  };
}

function createService(updateResults: unknown[][]) {
  const db = {
    query: {
      marketplaceConnections: {
        findFirst: vi.fn(),
      },
    },
    update: vi.fn(() => createUpdateMock(updateResults.shift() ?? [])),
  };
  const service = new MercadoLivreTokenRefreshService(
    db as never,
    {
      MERCADOLIVRE_CLIENT_ID: "ml-client-id",
      MERCADOLIVRE_CLIENT_SECRET: "ml-client-secret",
    } as never,
  );

  return { db, service };
}

describe("MercadoLivreTokenRefreshService", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("rotates and persists both Mercado Livre tokens under a connection lease", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-13T10:00:00.000Z"));
    const leased = createConnection({ tokenRefreshLeaseId: "lease-1" });
    const stored = createConnection({
      accessToken: "access-new",
      refreshToken: "refresh-new",
      tokenExpiresAt: new Date("2026-08-13T16:00:00.000Z"),
    });
    const { db, service } = createService([[leased], [stored]]);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            access_token: "access-new",
            expires_in: 21600,
            refresh_token: "refresh-new",
          }),
          { headers: { "content-type": "application/json" }, status: 200 },
        ),
      ),
    );

    await expect(
      service.refreshIfNeeded(createConnection() as never),
    ).resolves.toEqual(
      expect.objectContaining({
        connection: expect.objectContaining({
          accessToken: "access-new",
          refreshToken: "refresh-new",
        }),
        needsReconnect: false,
        refreshed: true,
      }),
    );

    expect(db.update).toHaveBeenCalledTimes(2);
    expect(db.update.mock.results[1]?.value.set).toHaveBeenCalledWith(
      expect.objectContaining({
        accessToken: "access-new",
        refreshToken: "refresh-new",
        tokenRefreshLeaseExpiresAt: null,
        tokenRefreshLeaseId: null,
      }),
    );
  });

  it("uses the token persisted by the lease owner instead of refreshing twice", async () => {
    const current = createConnection({
      accessToken: "access-new",
      refreshToken: "refresh-new",
      tokenExpiresAt: new Date("2030-01-01T00:00:00.000Z"),
    });
    const { db, service } = createService([[]]);
    db.query.marketplaceConnections.findFirst.mockResolvedValue(current);
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      service.refreshIfNeeded(createConnection() as never),
    ).resolves.toEqual(
      expect.objectContaining({
        connection: current,
        refreshed: true,
      }),
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shares a single refresh attempt between concurrent API requests", async () => {
    const leased = createConnection({ tokenRefreshLeaseId: "lease-1" });
    const stored = createConnection({
      accessToken: "access-new",
      refreshToken: "refresh-new",
      tokenExpiresAt: new Date("2030-01-01T00:00:00.000Z"),
    });
    const { db, service } = createService([[leased], [stored]]);
    let resolveResponse: (response: Response) => void;
    const fetchMock = vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          resolveResponse = resolve;
        }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const first = service.refreshIfNeeded(createConnection() as never);
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const second = service.refreshIfNeeded(createConnection() as never);
    resolveResponse!(
      new Response(
        JSON.stringify({
          access_token: "access-new",
          expires_in: 21600,
          refresh_token: "refresh-new",
        }),
        { headers: { "content-type": "application/json" }, status: 200 },
      ),
    );

    await expect(Promise.all([first, second])).resolves.toHaveLength(2);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(db.update).toHaveBeenCalledTimes(2);
  });

  it("marks the connection for OAuth when Mercado Livre rejects the refresh token", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-13T10:00:00.000Z"));
    const leased = createConnection({ tokenRefreshLeaseId: "lease-1" });
    const disconnected = createConnection({
      accessToken: null,
      refreshToken: null,
      status: "needs_reconnect",
      tokenExpiresAt: null,
    });
    const { db, service } = createService([[leased], [disconnected]]);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: "invalid_grant" }), {
          headers: { "content-type": "application/json" },
          status: 400,
        }),
      ),
    );

    await expect(
      service.refreshIfNeeded(createConnection() as never),
    ).resolves.toEqual(
      expect.objectContaining({
        needsReconnect: true,
        refreshed: false,
      }),
    );
    expect(db.update.mock.results[1]?.value.set).toHaveBeenCalledWith(
      expect.objectContaining({
        accessToken: null,
        refreshToken: null,
        status: "needs_reconnect",
      }),
    );
  });
});
