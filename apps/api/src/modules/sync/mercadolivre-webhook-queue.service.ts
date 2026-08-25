import {
  Inject,
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from "@nestjs/common";
import {
  marketplaceWebhookEvents,
  type DatabaseClient,
  type MarketplaceWebhookEvent,
} from "@lucreii/database";
import { and, asc, eq, lt, lte, or, sql } from "drizzle-orm";
import { createHash } from "node:crypto";
import type { ApiRuntimeEnv } from "@/common/config/api-env";
import { API_RUNTIME_ENV, DATABASE_CLIENT } from "@/common/tokens";
import { SyncService } from "./sync.service";

const POLL_INTERVAL_MS = 1_000;
const PROCESSING_STALE_MS = 15 * 60 * 1_000;
const MAX_ATTEMPTS = 8;
const MAX_EVENTS_PER_TICK = 5;
const RETRY_DELAYS_MS = [
  1_000,
  5_000,
  30_000,
  5 * 60 * 1_000,
  15 * 60 * 1_000,
  30 * 60 * 1_000,
  60 * 60 * 1_000,
];

type MercadoLivreWebhookPayload = {
  _id?: string;
  application_id?: string | number;
  attempts?: number;
  resource?: string;
  sent?: string;
  topic?: string;
  user_id?: string | number;
  [key: string]: unknown;
};

type MercadoLivreWebhookSummary = {
  applicationId: string | null;
  attempts: number | null;
  notificationId: string | null;
  resource: string | null;
  sent: string | null;
  topic: string | null;
  userId: string | null;
};

export type MercadoLivreWebhookEnqueueResult = {
  accepted: true;
  reason: "duplicate" | "queued";
  status: "duplicate" | "queued";
  summary: MercadoLivreWebhookSummary;
};

function normalizeString(value: unknown) {
  if (typeof value !== "string" && typeof value !== "number") {
    return null;
  }

  const normalized = String(value).trim();
  return normalized || null;
}

function summarizePayload(
  payload: MercadoLivreWebhookPayload,
): MercadoLivreWebhookSummary {
  return {
    applicationId: normalizeString(payload.application_id),
    attempts:
      typeof payload.attempts === "number" && Number.isFinite(payload.attempts)
        ? payload.attempts
        : null,
    notificationId: normalizeString(payload._id),
    resource: normalizeString(payload.resource),
    sent: normalizeString(payload.sent),
    topic: normalizeString(payload.topic),
    userId: normalizeString(payload.user_id),
  };
}

function buildDeduplicationKey(
  payload: MercadoLivreWebhookPayload,
  summary: MercadoLivreWebhookSummary,
) {
  if (summary.notificationId) {
    return summary.notificationId;
  }

  const stablePayload = Object.fromEntries(
    Object.entries(payload).filter(([key]) => key !== "attempts"),
  );

  return createHash("sha256")
    .update(
      JSON.stringify({
        applicationId: summary.applicationId,
        payload: stablePayload,
        resource: summary.resource,
        sent: summary.sent,
        topic: summary.topic,
        userId: summary.userId,
      }),
    )
    .digest("hex");
}

function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Unknown webhook processing error.";
}

@Injectable()
export class MercadoLivreWebhookQueueService
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(MercadoLivreWebhookQueueService.name);
  private interval: ReturnType<typeof setInterval> | null = null;
  private running = false;

  constructor(
    @Inject(DATABASE_CLIENT) private readonly db: DatabaseClient,
    @Inject(API_RUNTIME_ENV) private readonly env: ApiRuntimeEnv,
    private readonly syncService: SyncService,
  ) {}

  onApplicationBootstrap() {
    if (this.env.NODE_ENV === "test") {
      return;
    }

    void this.runSafely();
    this.interval = setInterval(() => {
      void this.runSafely();
    }, POLL_INTERVAL_MS);
  }

  onApplicationShutdown() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  async enqueue(payload: object): Promise<MercadoLivreWebhookEnqueueResult> {
    const webhookPayload = payload as MercadoLivreWebhookPayload;
    const summary = summarizePayload(webhookPayload);
    const deduplicationKey = buildDeduplicationKey(webhookPayload, summary);
    const [event] = await this.db
      .insert(marketplaceWebhookEvents)
      .values({
        applicationId: summary.applicationId,
        deduplicationKey,
        externalAccountId: summary.userId,
        notificationId: summary.notificationId,
        payload: webhookPayload,
        provider: "mercadolivre",
        resource: summary.resource,
        sent: summary.sent,
        topic: summary.topic,
      })
      .onConflictDoNothing({
        target: [
          marketplaceWebhookEvents.provider,
          marketplaceWebhookEvents.deduplicationKey,
        ],
      })
      .returning();

    return {
      accepted: true,
      reason: event ? "queued" : "duplicate",
      status: event ? "queued" : "duplicate",
      summary,
    };
  }

  async processPendingEvents() {
    if (this.running) {
      return;
    }

    this.running = true;
    try {
      for (let processed = 0; processed < MAX_EVENTS_PER_TICK; processed += 1) {
        const event = await this.claimNextEvent();
        if (!event) {
          break;
        }

        await this.processEvent(event);
      }
    } finally {
      this.running = false;
    }
  }

  private async runSafely() {
    try {
      await this.processPendingEvents();
    } catch (error) {
      this.logger.error(
        "Mercado Livre webhook queue poll failed.",
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  private async claimNextEvent(): Promise<MarketplaceWebhookEvent | null> {
    const now = new Date();
    const staleBefore = new Date(now.getTime() - PROCESSING_STALE_MS);
    const candidate = await this.db.query.marketplaceWebhookEvents.findFirst({
      orderBy: (table) => [asc(table.availableAt), asc(table.createdAt)],
      where: (table) =>
        and(
          lte(table.availableAt, now),
          lt(table.attempts, MAX_ATTEMPTS),
          or(
            eq(table.status, "pending"),
            and(eq(table.status, "processing"), lt(table.updatedAt, staleBefore)),
          ),
        ),
    });

    if (!candidate) {
      return null;
    }

    const [claimed] = await this.db
      .update(marketplaceWebhookEvents)
      .set({
        attempts: sql<number>`${marketplaceWebhookEvents.attempts} + 1`,
        status: "processing",
        updatedAt: now,
      })
      .where(
        and(
          eq(marketplaceWebhookEvents.id, candidate.id),
          lt(marketplaceWebhookEvents.attempts, MAX_ATTEMPTS),
          or(
            eq(marketplaceWebhookEvents.status, "pending"),
            and(
              eq(marketplaceWebhookEvents.status, "processing"),
              lt(marketplaceWebhookEvents.updatedAt, staleBefore),
            ),
          ),
        ),
      )
      .returning();

    return claimed ?? null;
  }

  private async processEvent(event: MarketplaceWebhookEvent) {
    const summary = summarizePayload(
      event.payload as MercadoLivreWebhookPayload,
    );

    try {
      const result = await this.syncService.handleMercadoLivreNotification({
        applicationId: summary.applicationId ?? undefined,
        attempts: summary.attempts ?? undefined,
        notificationId: summary.notificationId ?? undefined,
        resource: summary.resource ?? undefined,
        sent: summary.sent ?? undefined,
        topic: summary.topic ?? undefined,
        userId: summary.userId ?? undefined,
      });

      if (
        result.reason === "connection_not_found" ||
        result.reason === "provider_unavailable"
      ) {
        await this.reschedule(event, result.reason);
        return;
      }

      await this.markCompleted(event.id);
      this.logger.log(
        `Mercado Livre webhook processed: eventId=${event.id} notificationId=${summary.notificationId ?? "unknown"} status=${result.status} reason=${result.reason}`,
      );
    } catch (error) {
      await this.reschedule(event, errorMessage(error));
    }
  }

  private async markCompleted(eventId: string) {
    const now = new Date();
    await this.db
      .update(marketplaceWebhookEvents)
      .set({
        lastError: null,
        processedAt: now,
        status: "completed",
        updatedAt: now,
      })
      .where(
        and(
          eq(marketplaceWebhookEvents.id, eventId),
          eq(marketplaceWebhookEvents.status, "processing"),
        ),
      );
  }

  private async reschedule(event: MarketplaceWebhookEvent, reason: string) {
    const now = new Date();
    const exhausted = event.attempts >= MAX_ATTEMPTS;
    const delay =
      RETRY_DELAYS_MS[Math.min(event.attempts - 1, RETRY_DELAYS_MS.length - 1)] ??
      RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1];

    await this.db
      .update(marketplaceWebhookEvents)
      .set({
        availableAt: exhausted ? now : new Date(now.getTime() + delay),
        lastError: reason,
        status: exhausted ? "failed" : "pending",
        updatedAt: now,
      })
      .where(
        and(
          eq(marketplaceWebhookEvents.id, event.id),
          eq(marketplaceWebhookEvents.status, "processing"),
        ),
      );

    if (exhausted) {
      this.logger.error(
        `Mercado Livre webhook permanently failed: eventId=${event.id} attempts=${event.attempts} reason=${reason}`,
      );
    } else {
      this.logger.warn(
        `Mercado Livre webhook retry scheduled: eventId=${event.id} attempt=${event.attempts} reason=${reason}`,
      );
    }
  }
}
