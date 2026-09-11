import { describe, expect, it, vi } from "vitest";
import { EntitlementsService } from "./entitlements.service";

function createService({
  billingTrial = null,
  subscription = null,
}: {
  billingTrial?: unknown;
  subscription?: unknown;
} = {}) {
  const db = {
    query: {
      billingCustomers: { findFirst: vi.fn().mockResolvedValue(null) },
      billingTrials: { findFirst: vi.fn().mockResolvedValue(billingTrial) },
      pendingCheckouts: { findFirst: vi.fn().mockResolvedValue(null) },
      subscriptions: { findFirst: vi.fn().mockResolvedValue(subscription) },
    },
  };

  return new EntitlementsService(db as never);
}

describe("EntitlementsService", () => {
  it("authorizes a workspace during its internal trial", async () => {
    const service = createService({
      billingTrial: {
        organizationId: "org_123",
        trialEndsAt: new Date(Date.now() + 6 * 86_400_000),
        trialStartedAt: new Date(Date.now() - 86_400_000),
      },
    });

    await expect(
      service.getBillingSnapshot({ organizationId: "org_123", userId: "user_123" }),
    ).resolves.toMatchObject({
      entitled: true,
      status: "active",
      trial: {
        organizationId: "org_123",
        remainingDays: 5,
        status: "active",
      },
    });
  });

  it("expires the trial exactly at its end and returns an inactive entitlement", async () => {
    const end = new Date(Date.now());
    const service = createService({
      billingTrial: {
        organizationId: "org_123",
        trialEndsAt: end,
        trialStartedAt: new Date(end.getTime() - 7 * 86_400_000),
      },
    });

    await expect(
      service.requireActiveEntitlement({ organizationId: "org_123", userId: "user_123" }),
    ).rejects.toMatchObject({ status: 402 });
  });

  it("keeps a valid paid Stripe subscription entitled after the internal trial ends", async () => {
    const service = createService({
      billingTrial: {
        organizationId: "org_123",
        trialEndsAt: new Date(Date.now() - 1),
        trialStartedAt: new Date(Date.now() - 7 * 86_400_000),
      },
      subscription: {
        billingCustomerId: "billing_customer_123",
        cancelAtPeriodEnd: false,
        currentPeriodEnd: null,
        currentPeriodStart: null,
        externalSubscriptionId: "sub_123",
        id: "subscription_123",
        interval: "monthly",
        planCode: "start",
        status: "active",
        trialEnd: null,
        trialStart: null,
      },
    });

    await expect(service.isOrganizationEntitled("org_123")).resolves.toBe(true);
  });

  it("blocks failed Stripe payments", async () => {
    const service = createService({
      subscription: {
        billingCustomerId: "billing_customer_123",
        cancelAtPeriodEnd: false,
        currentPeriodEnd: null,
        currentPeriodStart: null,
        externalSubscriptionId: "sub_123",
        id: "subscription_123",
        interval: "monthly",
        planCode: "start",
        status: "past_due",
        trialEnd: null,
        trialStart: null,
      },
    });

    await expect(service.isOrganizationEntitled("org_123")).resolves.toBe(false);
  });
});
