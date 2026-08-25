import { beforeEach, describe, expect, it, vi } from "vitest";
import { MercadoLivreWebhookQueueService } from "./mercadolivre-webhook-queue.service";

function createService() {
  const findFirst = vi.fn();
  const db = {
    insert: vi.fn(),
    query: {
      marketplaceWebhookEvents: { findFirst },
    },
    update: vi.fn(),
  };
  const syncService = {
    handleMercadoLivreNotification: vi.fn(),
  };
  const env = { NODE_ENV: "test" };

  return {
    db,
    env,
    findFirst,
    service: new MercadoLivreWebhookQueueService(
      db as never,
      env as never,
      syncService as never,
    ),
    syncService,
  };
}

function createEvent(overrides: Record<string, unknown> = {}) {
  return {
    applicationId: "app_1",
    attempts: 1,
    availableAt: new Date("2026-08-25T12:00:00.000Z"),
    createdAt: new Date("2026-08-25T12:00:00.000Z"),
    deduplicationKey: "notification_1",
    externalAccountId: "seller_1",
    id: "event_1",
    lastError: null,
    notificationId: "notification_1",
    payload: {
      _id: "notification_1",
      resource: "/orders/1",
      topic: "orders_v2",
      user_id: "seller_1",
    },
    processedAt: null,
    provider: "mercadolivre",
    resource: "/orders/1",
    sent: null,
    status: "processing",
    topic: "orders_v2",
    updatedAt: new Date("2026-08-25T12:00:00.000Z"),
    ...overrides,
  };
}

describe("MercadoLivreWebhookQueueService", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("persists a webhook and deduplicates repeated notification ids", async () => {
    const { db, service } = createService();
    const values = vi.fn().mockReturnValue({
      onConflictDoNothing: vi.fn().mockReturnValue({
        returning: vi
          .fn()
          .mockResolvedValueOnce([createEvent()])
          .mockResolvedValueOnce([]),
      }),
    });
    db.insert.mockReturnValue({ values });
    const payload = {
      _id: "notification_1",
      application_id: 123,
      resource: "/orders/1",
      topic: "orders_v2",
      user_id: 456,
    };

    await expect(service.enqueue(payload)).resolves.toEqual(
      expect.objectContaining({ reason: "queued", status: "queued" }),
    );
    await expect(service.enqueue(payload)).resolves.toEqual(
      expect.objectContaining({ reason: "duplicate", status: "duplicate" }),
    );
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({
        deduplicationKey: "notification_1",
        provider: "mercadolivre",
      }),
    );
  });

  it("processes a claimed event and marks it completed", async () => {
    const { db, findFirst, service, syncService } = createService();
    const candidate = createEvent({ status: "pending", attempts: 0 });
    const claimed = createEvent({ attempts: 1 });
    findFirst.mockResolvedValueOnce(candidate).mockResolvedValueOnce(null);
    syncService.handleMercadoLivreNotification.mockResolvedValue({
      accepted: true,
      reason: "started",
      status: "started",
    });

    const claimWhere = vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue([claimed]),
    });
    const completedWhere = vi.fn().mockResolvedValue(undefined);
    const claimSet = vi.fn().mockReturnValue({ where: claimWhere });
    const completedSet = vi.fn().mockReturnValue({ where: completedWhere });
    db.update
      .mockReturnValueOnce({ set: claimSet })
      .mockReturnValueOnce({ set: completedSet });

    await service.processPendingEvents();

    expect(syncService.handleMercadoLivreNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        notificationId: "notification_1",
        resource: "/orders/1",
        topic: "orders_v2",
        userId: "seller_1",
      }),
    );
    expect(completedSet).toHaveBeenCalledWith(
      expect.objectContaining({ status: "completed", lastError: null }),
    );
  });

  it("reschedules failed processing with a retry delay", async () => {
    const { db, findFirst, service, syncService } = createService();
    const candidate = createEvent({ status: "pending", attempts: 0 });
    const claimed = createEvent({ attempts: 1 });
    findFirst.mockResolvedValueOnce(candidate).mockResolvedValueOnce(null);
    syncService.handleMercadoLivreNotification.mockRejectedValue(
      new Error("MELI unavailable"),
    );

    const claimWhere = vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue([claimed]),
    });
    const retryWhere = vi.fn().mockResolvedValue(undefined);
    const claimSet = vi.fn().mockReturnValue({ where: claimWhere });
    const retrySet = vi.fn().mockReturnValue({ where: retryWhere });
    db.update
      .mockReturnValueOnce({ set: claimSet })
      .mockReturnValueOnce({ set: retrySet });

    await service.processPendingEvents();

    expect(retrySet).toHaveBeenCalledWith(
      expect.objectContaining({
        lastError: "MELI unavailable",
        status: "pending",
      }),
    );
  });
});
