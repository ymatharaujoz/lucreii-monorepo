import { ForbiddenException } from "@nestjs/common";
import {
  billingCustomers,
  billingTrials,
  pendingCheckouts,
  subscriptions,
} from "@lucreii/database";
import Stripe from "stripe";
import { describe, expect, it, vi } from "vitest";
import { BillingService } from "./billing.service";

const env = {
  API_DB_POOL_MAX: 5,
  API_HOST: "127.0.0.1",
  API_PORT: 4000,
  DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/lucreii",
  NODE_ENV: "test",
  STRIPE_PRICE_BUSINESS_MONTHLY: "price_business_monthly",
  STRIPE_PRICE_ESSENCIAL_MONTHLY: "price_essencial_monthly",
  STRIPE_PRICE_PRO_MONTHLY: "price_pro_monthly",
  STRIPE_PRICE_START_MONTHLY: "price_start_monthly",
  STRIPE_SECRET_KEY: "rk_test",
  STRIPE_WEBHOOK_SECRET: "webhook",
  SYNC_RELAX_GUARDS: false,
  WEB_APP_ORIGIN: "http://localhost:3000",
} as const;

const owner = {
  organization: { id: "org_123", name: "Org", role: "owner", slug: "org" },
  session: { expiresAt: new Date("2030-01-01"), id: "session_123" },
  user: {
    email: "owner@lucreii.local",
    emailVerified: true,
    id: "user_123",
    image: null,
    name: "Owner",
  },
} as const;

function createService() {
  const insertReturning = vi.fn().mockResolvedValue([{ id: "local_123" }]);
  const insertValues = vi.fn().mockReturnValue({ returning: insertReturning });
  const db = {
    insert: vi.fn((table: unknown) => {
      if (
        table === billingCustomers ||
        table === pendingCheckouts ||
        table === subscriptions
      ) {
        return { values: insertValues };
      }
      throw new Error("Unexpected insert target");
    }),
    query: {
      billingCustomers: { findFirst: vi.fn().mockResolvedValue(null) },
      billingTrials: { findFirst: vi.fn() },
      pendingCheckouts: { findFirst: vi.fn().mockResolvedValue(null) },
      subscriptions: { findFirst: vi.fn().mockResolvedValue(null) },
    },
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: "trial_123" }]),
        }),
      }),
    }),
  };
  const stripe = {
    checkout: {
      sessions: { create: vi.fn(), retrieve: vi.fn() },
    },
    customers: { create: vi.fn(), retrieve: vi.fn() },
    prices: { retrieve: vi.fn() },
    setupIntents: { retrieve: vi.fn() },
    subscriptions: { create: vi.fn(), retrieve: vi.fn() },
    webhooks: { constructEvent: vi.fn() },
  };

  return {
    db,
    insertValues,
    service: new BillingService(db as never, stripe as never, env),
    stripe,
  };
}

function trial(endsAt: Date) {
  return {
    email: "owner@lucreii.local",
    id: "trial_123",
    organizationId: "org_123",
    trialEndsAt: endsAt,
    trialStartedAt: new Date(endsAt.getTime() - 7 * 86_400_000),
    userId: "user_123",
  };
}

describe("BillingService", () => {
  it("creates a Stripe subscription checkout with the original trial end above 48 hours", async () => {
    const { db, service, stripe } = createService();
    const endsAt = new Date(Date.now() + 3 * 86_400_000);
    db.query.billingTrials.findFirst.mockResolvedValue(trial(endsAt));
    stripe.customers.create.mockResolvedValue({ id: "cus_123" });
    stripe.checkout.sessions.create.mockResolvedValue({
      id: "cs_123",
      url: "https://checkout.stripe.test/session",
    });

    await expect(service.createCheckoutSession(owner, "pro", "monthly")).resolves.toEqual({
      checkoutUrl: "https://checkout.stripe.test/session",
      sessionId: "cs_123",
    });

    expect(stripe.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: "subscription",
        payment_method_collection: "always",
        subscription_data: expect.objectContaining({
          trial_end: Math.floor(endsAt.getTime() / 1000),
        }),
      }),
    );
  });

  it("uses setup checkout inside the 48-hour Checkout limit", async () => {
    const { db, service, stripe } = createService();
    db.query.billingTrials.findFirst.mockResolvedValue(
      trial(new Date(Date.now() + 47 * 60 * 60 * 1000)),
    );
    stripe.customers.create.mockResolvedValue({ id: "cus_123" });
    stripe.checkout.sessions.create.mockResolvedValue({
      id: "cs_setup_123",
      url: "https://checkout.stripe.test/setup",
    });

    await service.createCheckoutSession(owner, "start", "monthly");

    expect(stripe.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: "setup",
        payment_method_types: ["card"],
      }),
    );
  });

  it("reuses an open checkout when the owner retries before completing it", async () => {
    const { db, service, stripe } = createService();
    db.query.billingTrials.findFirst.mockResolvedValue(
      trial(new Date(Date.now() + 3 * 86_400_000)),
    );
    db.query.pendingCheckouts.findFirst.mockResolvedValue({
      checkoutSessionId: "cs_open_123",
      id: "pending_123",
    });
    stripe.checkout.sessions.retrieve.mockResolvedValue({
      id: "cs_open_123",
      status: "open",
      url: "https://checkout.stripe.test/open",
    });

    await expect(service.createCheckoutSession(owner, "start", "monthly")).resolves.toEqual({
      checkoutUrl: "https://checkout.stripe.test/open",
      sessionId: "cs_open_123",
    });
    expect(stripe.checkout.sessions.create).not.toHaveBeenCalled();
  });

  it("creates an immediately billed checkout after the trial has expired", async () => {
    const { db, service, stripe } = createService();
    db.query.billingTrials.findFirst.mockResolvedValue(
      trial(new Date(Date.now() - 1)),
    );
    stripe.customers.create.mockResolvedValue({ id: "cus_123" });
    stripe.checkout.sessions.create.mockResolvedValue({
      id: "cs_paid_123",
      url: "https://checkout.stripe.test/paid",
    });

    await service.createCheckoutSession(owner, "business", "monthly");

    expect(stripe.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: "subscription",
        subscription_data: expect.not.objectContaining({
          trial_end: expect.anything(),
        }),
      }),
    );
  });

  it("rejects checkout attempts by workspace members", async () => {
    const { service } = createService();

    await expect(
      service.createCheckoutSession(
        { ...owner, organization: { ...owner.organization, role: "member" } },
        "start",
        "monthly",
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("associates the signup trial with the workspace during onboarding", async () => {
    const { db, service } = createService();

    await expect(
      service.assignTrialToOrganizationTx(db as never, {
        organizationId: "org_123",
        userId: "user_123",
      }),
    ).resolves.toBe("trial_123");
  });

  it("creates an idempotent direct subscription after setup checkout", async () => {
    const { db, service, stripe } = createService();
    const endsAt = new Date(Date.now() + 60 * 60 * 1000);
    db.query.billingTrials.findFirst.mockResolvedValue(trial(endsAt));
    stripe.checkout.sessions.retrieve.mockResolvedValue({
      customer: "cus_123",
      id: "cs_setup_123",
      metadata: {
        interval: "monthly",
        organizationId: "org_123",
        planCode: "essencial",
        userId: "user_123",
      },
      mode: "setup",
      setup_intent: "seti_123",
      status: "complete",
    } as unknown as Stripe.Checkout.Session);
    stripe.setupIntents.retrieve.mockResolvedValue({ payment_method: "pm_123" });
    stripe.subscriptions.create.mockResolvedValue({ id: "sub_123" });
    stripe.subscriptions.retrieve.mockResolvedValue({
      cancel_at_period_end: false,
      customer: "cus_123",
      id: "sub_123",
      items: { data: [{ current_period_end: 0, current_period_start: 0, price: { id: "price_essencial_monthly" } }] },
      metadata: { planCode: "essencial" },
      status: "trialing",
      trial_end: Math.floor(endsAt.getTime() / 1000),
      trial_start: Math.floor(Date.now() / 1000),
    });

    await service.confirmCheckoutSession(owner, "cs_setup_123");

    expect(stripe.subscriptions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        default_payment_method: "pm_123",
        trial_end: Math.floor(endsAt.getTime() / 1000),
      }),
      { idempotencyKey: "setup-checkout-subscription:cs_setup_123" },
    );
  });
});
