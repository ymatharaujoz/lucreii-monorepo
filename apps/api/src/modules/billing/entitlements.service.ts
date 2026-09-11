import { HttpException, Inject, Injectable } from "@nestjs/common";
import { isNotNull } from "drizzle-orm";
import type { DatabaseClient } from "@lucreii/database";
import { DATABASE_CLIENT } from "@/common/tokens";
import type { BillingSnapshot } from "./billing.types";

const ENTITLED_SUBSCRIPTION_STATUSES = new Set(["active", "trialing"]);

@Injectable()
export class EntitlementsService {
  constructor(
    @Inject(DATABASE_CLIENT)
    private readonly db: DatabaseClient,
  ) {}

  async getBillingSnapshot(
    input:
      | {
          organizationId: string | null;
          userId: string;
        }
      | string,
  ): Promise<BillingSnapshot> {
    if (typeof input === "string") {
      return this.getOrganizationSnapshot(input);
    }

    return this.loadSnapshot({
      organizationId: input.organizationId,
      userId: input.userId,
    });
  }

  async isOrganizationEntitled(organizationId: string) {
    const snapshot = await this.getOrganizationSnapshot(organizationId);
    return snapshot.entitled;
  }

  async requireActiveEntitlement(input: {
    organizationId: string;
    userId: string;
  }) {
    const snapshot = await this.loadSnapshot(input);

    if (!snapshot.entitled) {
      throw new HttpException("Active subscription or trial required.", 402);
    }

    return snapshot;
  }

  private async getOrganizationSnapshot(
    organizationId: string,
  ): Promise<BillingSnapshot> {
    return this.loadSnapshot({ organizationId, userId: null });
  }

  private async loadSnapshot(input: {
    organizationId: string | null;
    userId: string | null;
  }): Promise<BillingSnapshot> {
    const [customer, subscription, billingTrial, pendingCheckout] =
      await Promise.all([
        input.organizationId
          ? this.db.query.billingCustomers.findFirst({
              where: (table, { and, eq }) =>
                and(
                  eq(table.organizationId, input.organizationId!),
                  eq(table.provider, "stripe"),
                ),
            })
          : Promise.resolve(null),
        input.organizationId
          ? this.db.query.subscriptions.findFirst({
              where: (table, { and, eq }) =>
                and(
                  eq(table.organizationId, input.organizationId!),
                  eq(table.provider, "stripe"),
                  isNotNull(table.billingCustomerId),
                ),
              orderBy: (table, { desc }) => [desc(table.updatedAt)],
            })
          : Promise.resolve(null),
        input.organizationId
          ? this.db.query.billingTrials.findFirst({
              where: (table, { eq }) =>
                eq(table.organizationId, input.organizationId!),
            })
          : input.userId
            ? this.db.query.billingTrials.findFirst({
                where: (table, { eq }) => eq(table.userId, input.userId!),
              })
            : Promise.resolve(null),
        input.userId
          ? this.db.query.pendingCheckouts.findFirst({
              where: (table, { eq }) => eq(table.userId, input.userId!),
              orderBy: (table, { desc }) => [desc(table.updatedAt)],
            })
          : Promise.resolve(null),
      ]);

    const now = Date.now();
    const trial = billingTrial
      ? {
          endsAt: billingTrial.trialEndsAt.toISOString(),
          organizationId: billingTrial.organizationId,
          remainingDays: Math.max(
            0,
            Math.floor((billingTrial.trialEndsAt.getTime() - now) / 86_400_000),
          ),
          startedAt: billingTrial.trialStartedAt.toISOString(),
          status:
            billingTrial.trialEndsAt.getTime() > now
              ? ("active" as const)
              : ("expired" as const),
        }
      : null;
    const entitledBySubscription =
      subscription != null && ENTITLED_SUBSCRIPTION_STATUSES.has(subscription.status);
    const entitledByTrial = trial?.status === "active";
    const entitled = entitledBySubscription || entitledByTrial;

    const status = input.organizationId
      ? entitled
        ? "active"
        : "inactive"
      : entitledByTrial
        ? "pending_onboarding"
        : "no_checkout";

    return {
      organizationId: input.organizationId,
      entitled,
      trial,
      status,
      customer: customer
        ? {
            externalCustomerId: customer.externalCustomerId,
            id: customer.id,
          }
        : null,
      subscription: subscription
        ? {
            cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
            currentPeriodEnd: this.toIsoString(subscription.currentPeriodEnd),
            currentPeriodStart: this.toIsoString(subscription.currentPeriodStart),
            externalSubscriptionId: subscription.externalSubscriptionId,
            id: subscription.id,
            interval: subscription.interval,
            planCode: subscription.planCode,
            status: subscription.status,
            trialEnd: this.toIsoString(subscription.trialEnd),
            trialStart: this.toIsoString(subscription.trialStart),
          }
        : null,
      pendingCheckout: pendingCheckout
        ? {
            id: pendingCheckout.id,
            checkoutSessionId: pendingCheckout.checkoutSessionId,
            stripeCustomerId: pendingCheckout.stripeCustomerId,
            stripeSubscriptionId: pendingCheckout.stripeSubscriptionId,
            interval: pendingCheckout.interval,
            planCode: pendingCheckout.planCode,
            status: pendingCheckout.status,
          }
        : null,
    };
  }

  private toIsoString(value: Date | null) {
    return value ? value.toISOString() : null;
  }
}
