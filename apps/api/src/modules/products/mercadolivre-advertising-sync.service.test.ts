import { BadRequestException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import {
  MercadoLivreAdvertisingSyncService,
  resolveAdvertisingDateRange,
  resolveScheduledReferenceMonths,
} from "./mercadolivre-advertising-sync.service";

// 2026-11-17 12:00 in São Paulo (UTC-3).
const NOW = new Date("2026-11-17T15:00:00.000Z");

describe("resolveAdvertisingDateRange", () => {
  it("stops the current month at today (São Paulo)", () => {
    expect(resolveAdvertisingDateRange("2026-11-01", NOW)).toEqual({
      dateFrom: "2026-11-01",
      dateTo: "2026-11-17",
    });
  });

  it("covers a whole past month", () => {
    expect(resolveAdvertisingDateRange("2026-10-01", NOW)).toEqual({
      dateFrom: "2026-10-01",
      dateTo: "2026-10-31",
    });
  });

  it("rejects future months and months beyond Mercado Livre retention", () => {
    expect(() => resolveAdvertisingDateRange("2026-12-01", NOW)).toThrow(
      BadRequestException,
    );
    expect(() => resolveAdvertisingDateRange("2026-07-01", NOW)).toThrow(
      BadRequestException,
    );
  });
});

describe("resolveScheduledReferenceMonths", () => {
  it("syncs only the current month mid-month", () => {
    expect(resolveScheduledReferenceMonths(NOW)).toEqual(["2026-11-01"]);
  });

  it("also refreshes the previous month during the first days", () => {
    // 2026-12-01 01:00 in São Paulo, still Nov 30 in some zones but Dec in SP.
    expect(
      resolveScheduledReferenceMonths(new Date("2026-12-01T04:00:00.000Z")),
    ).toEqual(["2026-12-01", "2026-11-01"]);
  });
});

function createService(input: { connection?: unknown } = {}) {
  const db = {
    query: {
      companies: { findFirst: vi.fn() },
      marketplaceConnections: {
        findFirst: vi.fn().mockResolvedValue(input.connection),
        findMany: vi.fn().mockResolvedValue([]),
      },
    },
  };
  const productsService = {
    listMercadoLivreAdvertisingTargets: vi.fn().mockResolvedValue({
      companyId: "company-1",
      targets: [
        { advertisingKey: "mercadolivre:MLB1", marketplaceIds: ["MLB1"], sales: 2 },
      ],
    }),
    saveSyncedListingAdvertising: vi.fn().mockResolvedValue(undefined),
  };
  const tokenRefreshService = {
    refreshIfNeeded: vi.fn(async (connection: unknown) => ({
      connection,
      needsReconnect: false,
      refreshed: false,
      wasExpired: false,
    })),
  };
  const service = new MercadoLivreAdvertisingSyncService(
    db as never,
    { NODE_ENV: "test" } as never,
    productsService as never,
    tokenRefreshService as never,
  );

  return { db, productsService, service };
}

const CONTEXT = {
  organizationId: "org-1",
  selectedCompanyId: "company-1",
  userId: "user-1",
};

describe("MercadoLivreAdvertisingSyncService.syncListing", () => {
  it("requires a connected Mercado Livre account", async () => {
    const { service } = createService({ connection: undefined });

    await expect(
      service.syncListing(
        CONTEXT,
        { advertisingKey: "mercadolivre:MLB1", referenceMonth: "2026-11-01" },
        NOW,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("saves only the requested listing's Product Ads cost", async () => {
    const { productsService, service } = createService({
      connection: { accessToken: "token", id: "conn-1", status: "connected" },
    });
    const adsClient = (service as unknown as {
      adsClient: {
        findProductAdsAdvertiser: unknown;
        listAdGroupCostsInCents: unknown;
      };
    }).adsClient;
    adsClient.findProductAdsAdvertiser = vi
      .fn()
      .mockResolvedValue({ advertiserId: "42", siteId: "MLB" });
    adsClient.listAdGroupCostsInCents = vi.fn().mockResolvedValue(
      new Map([
        ["MLB1", 4_590],
        ["MLB2", 100],
      ]),
    );

    const result = await service.syncListing(
      CONTEXT,
      { advertisingKey: "mercadolivre:MLB1", referenceMonth: "2026-11-01" },
      NOW,
    );

    expect(result).toEqual({
      advertisingKey: "mercadolivre:MLB1",
      amount: "45.90",
      channel: "mercadolivre",
      referenceMonth: "2026-11-01",
      status: "synced",
    });
    expect(productsService.saveSyncedListingAdvertising).toHaveBeenCalledWith(
      expect.objectContaining({
        amounts: new Map([["mercadolivre:MLB1", "45.90"]]),
        companyId: "company-1",
        referenceMonth: "2026-11-01",
      }),
    );
  });

  it("reports sellers without Product Ads without writing anything", async () => {
    const { productsService, service } = createService({
      connection: { accessToken: "token", id: "conn-1", status: "connected" },
    });
    (
      service as unknown as { adsClient: { findProductAdsAdvertiser: unknown } }
    ).adsClient.findProductAdsAdvertiser = vi.fn().mockResolvedValue(null);

    const result = await service.syncListing(
      CONTEXT,
      { advertisingKey: "mercadolivre:MLB1", referenceMonth: "2026-11-01" },
      NOW,
    );

    expect(result.status).toBe("not_advertiser");
    expect(result.amount).toBeNull();
    expect(productsService.saveSyncedListingAdvertising).not.toHaveBeenCalled();
  });
});
