import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
} from "@nestjs/common";
import { and, eq, isNotNull, isNull } from "drizzle-orm";
import type { DatabaseClient } from "@lucreii/database";
import {
  BILLING_PLAN_BY_CODE,
  isBillingPlanCode,
  type BillingPlanCode,
} from "@lucreii/types";
import {
  billingCustomers,
  billingTrials,
  pendingCheckouts,
  subscriptionEvents,
  subscriptions,
} from "@lucreii/database";
import Stripe from "stripe";
import type { ApiRuntimeEnv } from "@/common/config/api-env";
import {
  API_RUNTIME_ENV,
  DATABASE_CLIENT,
  STRIPE_CLIENT,
} from "@/common/tokens";
import type { AuthenticatedRequestContext } from "@/modules/auth/auth.types";
import type { BillingInterval } from "./billing.types";

const CHECKOUT_TRIAL_MINIMUM_MS = 48 * 60 * 60 * 1000;
const BILLING_PRICE_CONFIG_LABEL = "Stripe billing configuration";

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);
  private readonly validatedPriceIds = new Set<string>();

  constructor(
    @Inject(DATABASE_CLIENT)
    private readonly db: DatabaseClient,
    @Inject(STRIPE_CLIENT)
    private readonly stripe: Stripe,
    @Inject(API_RUNTIME_ENV)
    private readonly env: ApiRuntimeEnv,
  ) {}

  async createCheckoutSession(
    authContext: AuthenticatedRequestContext,
    planCode: BillingPlanCode,
    interval: BillingInterval,
  ) {
    const organization = this.requireBillingOwner(authContext);
    const billingTrial = await this.findBillingTrial(authContext.user.id);

    if (!billingTrial || billingTrial.organizationId !== organization.id) {
      throw new BadRequestException("Internal trial was not found for this workspace.");
    }

    const priceId = this.resolvePriceId(planCode, interval);
    await this.validateConfiguredPrice(planCode, interval, priceId);
    const reusableCheckout = await this.findReusableOpenCheckout({
      organizationId: organization.id,
      userId: authContext.user.id,
    });

    if (reusableCheckout) {
      return reusableCheckout;
    }

    const customerId = await this.ensureCheckoutCustomer(authContext);

    const activeSubscription = await this.db.query.subscriptions.findFirst({
      where: (table, { and, eq }) =>
        and(
          eq(table.organizationId, organization.id),
          eq(table.provider, "stripe"),
          isNotNull(table.externalSubscriptionId),
        ),
      orderBy: (table, { desc }) => [desc(table.updatedAt)],
    });

    if (
      activeSubscription &&
      new Set(["active", "trialing", "past_due"]).has(activeSubscription.status)
    ) {
      throw new BadRequestException(
        "This workspace already has a Stripe subscription. Manage it in the billing portal.",
      );
    }

    const successUrl = `${this.env.WEB_APP_ORIGIN}/app/billing?checkout=success&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${this.env.WEB_APP_ORIGIN}/app/billing?checkout=cancelled`;
    const now = Date.now();
    const isTrialActive = billingTrial.trialEndsAt.getTime() > now;
    const remainingTrialMs = billingTrial.trialEndsAt.getTime() - now;
    const usesSetupCheckout =
      isTrialActive && remainingTrialMs <= CHECKOUT_TRIAL_MINIMUM_MS;
    const metadata = {
      interval,
      organizationId: organization.id,
      planCode,
      userId: authContext.user.id,
    };
    let session: Stripe.Checkout.Session;

    try {
      session = usesSetupCheckout
        ? await this.stripe.checkout.sessions.create({
            cancel_url: cancelUrl,
            customer: customerId,
            metadata,
            mode: "setup",
            payment_method_types: ["card"],
            success_url: successUrl,
          })
        : await this.stripe.checkout.sessions.create({
            cancel_url: cancelUrl,
            customer: customerId,
            line_items: [{ price: priceId, quantity: 1 }],
            metadata,
            mode: "subscription",
            payment_method_collection: "always",
            subscription_data: {
              metadata,
              ...(isTrialActive
                ? { trial_end: Math.floor(billingTrial.trialEndsAt.getTime() / 1000) }
                : {}),
            },
            success_url: successUrl,
          });
    } catch (error: unknown) {
      this.rethrowStripePriceConfigurationError(error, {
        interval,
        planCode,
        priceId,
      });
      throw error;
    }

    if (!session.url) {
      throw new BadRequestException(
        "Stripe checkout session did not return a redirect URL.",
      );
    }

    await this.upsertPendingCheckoutRecord({
      checkoutSessionId: session.id,
      interval,
      organizationId: organization.id,
      planCode,
      stripeCustomerId: customerId,
      stripeSubscriptionId: null,
      userId: authContext.user.id,
      status: "created",
    });

    return {
      checkoutUrl: session.url,
      sessionId: session.id,
    };
  }

  async confirmCheckoutSession(
    authContext: AuthenticatedRequestContext,
    sessionId: string,
  ) {
    this.requireBillingOwner(authContext);
    const session = await this.stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["subscription"],
    });

    const sessionUserId = session.metadata?.userId;
    if (!sessionUserId || sessionUserId !== authContext.user.id) {
      throw new BadRequestException(
        "Checkout session does not belong to this user.",
      );
    }

    if (session.status !== "complete") {
      throw new BadRequestException("Checkout session is not complete yet.");
    }

    const customerId = this.readStripeCustomerIdFromSession(session.customer);
    const sessionOrganizationId = this.normalizeNullableString(
      session.metadata?.organizationId,
    );
    const interval = this.resolveIntervalFromCheckoutSession(session);
    const planCode = this.resolvePlanCodeFromCheckoutSession(session);
    const externalSubscriptionId =
      session.mode === "setup"
        ? await this.finalizeSetupCheckoutSubscription(session)
        : this.readStripeSubscriptionIdFromSession(session.subscription);

    if (!sessionOrganizationId) {
      throw new BadRequestException("Checkout session is missing a workspace.");
    }

    await this.upsertPendingCheckoutRecord({
      checkoutSessionId: session.id,
      interval,
      organizationId: sessionOrganizationId,
      planCode,
      stripeCustomerId: customerId,
      stripeSubscriptionId: externalSubscriptionId,
      userId: authContext.user.id,
      status: "completed",
    });
    await this.syncSubscriptionByExternalId(
      externalSubscriptionId,
      sessionOrganizationId,
      customerId,
    );
  }

  async reconcileOrganizationSubscriptionWithStripe(organizationId: string) {
    const subscription = await this.db.query.subscriptions.findFirst({
      where: (table, { and, eq }) =>
        and(
          eq(table.organizationId, organizationId),
          eq(table.provider, "stripe"),
          isNotNull(table.billingCustomerId),
        ),
      orderBy: (table, { desc }) => [desc(table.updatedAt)],
    });

    if (!subscription?.externalSubscriptionId) {
      return;
    }

    // Sincronizar também para subscriptions inativas/canceladas para manter dados atualizados
    const syncableStatuses = new Set([
      "active",
      "trialing",
      "past_due",
      "unpaid",
      "paused",
    ]);
    if (!syncableStatuses.has(subscription.status)) {
      return;
    }

    try {
      const live = await this.stripe.subscriptions.retrieve(
        subscription.externalSubscriptionId,
      );
      const customerId = this.getStripeCustomerId(live.customer);
      await this.syncSubscriptionObject(live, organizationId, customerId);
    } catch (error: unknown) {
      if (
        error instanceof Stripe.errors.StripeInvalidRequestError &&
        error.code === "resource_missing"
      ) {
        await this.db
          .update(subscriptions)
          .set({
            cancelAtPeriodEnd: false,
            status: "canceled",
            updatedAt: new Date(),
          })
          .where(eq(subscriptions.id, subscription.id));

        return;
      }

      throw error;
    }
  }

  async assignTrialToOrganizationTx(
    tx: DatabaseClient,
    input: {
      organizationId: string;
      userId: string;
    },
  ) {
    const [assignedTrial] = await tx
      .update(billingTrials)
      .set({
        organizationId: input.organizationId,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(billingTrials.userId, input.userId),
          isNull(billingTrials.organizationId),
        ),
      )
      .returning({ id: billingTrials.id });

    if (assignedTrial) {
      return assignedTrial.id;
    }

    const existingTrial = await tx.query.billingTrials.findFirst({
      where: (table, { eq }) => eq(table.userId, input.userId),
    });

    if (existingTrial?.organizationId === input.organizationId) {
      return existingTrial.id;
    }

    throw new BadRequestException("Internal trial was not found for this user.");
  }

  async processWebhook(
    rawBody: Buffer | undefined,
    signature: string | string[] | undefined,
  ) {
    if (!rawBody) {
      throw new BadRequestException("Stripe webhook raw body is required.");
    }

    if (typeof signature !== "string") {
      throw new BadRequestException("Stripe signature header is required.");
    }

    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        this.env.STRIPE_WEBHOOK_SECRET,
      );
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error
          ? error.message
          : "Stripe webhook signature verification failed.",
      );
    }

    switch (event.type) {
      case "checkout.session.completed": {
        await this.handleCheckoutSessionCompleted(event);
        break;
      }
      case "checkout.session.expired": {
        await this.handleCheckoutSessionExpired(event);
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        await this.handleSubscriptionEvent(event);
        break;
      }
      default:
        break;
    }

    return event;
  }

  private async handleCheckoutSessionCompleted(event: Stripe.Event) {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.userId;

    if (!userId) {
      throw new BadRequestException(
        "Unable to resolve user for checkout webhook.",
      );
    }

    const customerId = this.readStripeCustomerIdFromSession(session.customer);
    const organizationId = this.normalizeNullableString(
      session.metadata?.organizationId,
    );
    if (!organizationId) {
      throw new BadRequestException("Checkout webhook is missing a workspace.");
    }
    const interval = this.resolveIntervalFromCheckoutSession(session);
    const planCode = this.resolvePlanCodeFromCheckoutSession(session);
    const externalSubscriptionId =
      session.mode === "setup"
        ? await this.finalizeSetupCheckoutSubscription(session)
        : this.readStripeSubscriptionIdFromSession(session.subscription);

    await this.upsertPendingCheckoutRecord({
      checkoutSessionId: session.id,
      interval,
      organizationId,
      planCode,
      stripeCustomerId: customerId,
      stripeSubscriptionId: externalSubscriptionId,
      userId,
      status: "completed",
    });
    const localSubscriptionId = await this.syncSubscriptionByExternalId(
      externalSubscriptionId,
      organizationId,
      customerId,
    );

    await this.recordSubscriptionEvent({
      event,
      organizationId,
      subscriptionId: localSubscriptionId,
    });
  }

  private async handleCheckoutSessionExpired(event: Stripe.Event) {
    const session = event.data.object as Stripe.Checkout.Session;
    await this.db
      .update(pendingCheckouts)
      .set({
        status: "expired",
        updatedAt: new Date(),
      })
      .where(eq(pendingCheckouts.checkoutSessionId, session.id));
  }

  private async handleSubscriptionEvent(event: Stripe.Event) {
    const subscription = event.data.object as Stripe.Subscription;
    const customerId = this.getStripeCustomerId(subscription.customer);
    const organizationId = await this.findOrganizationIdByCustomer(customerId);

    if (organizationId) {
      const localSubscriptionId = await this.syncSubscriptionObject(
        subscription,
        organizationId,
        customerId,
      );

      await this.recordSubscriptionEvent({
        event,
        organizationId,
        subscriptionId: localSubscriptionId,
      });
      return;
    }

    await this.syncPendingCheckoutSubscriptionStatus(subscription, customerId);
  }

  private async syncPendingCheckoutSubscriptionStatus(
    subscription: Stripe.Subscription,
    externalCustomerId: string,
  ) {
    const pendingCheckout = await this.db.query.pendingCheckouts.findFirst({
      where: (table, { and, eq, or }) =>
        and(
          eq(table.stripeCustomerId, externalCustomerId),
          or(
            eq(table.stripeSubscriptionId, subscription.id),
            eq(
              table.checkoutSessionId,
              subscription.metadata?.checkoutSessionId ?? "",
            ),
          ),
        ),
      orderBy: (table, { desc }) => [desc(table.updatedAt)],
    });

    if (!pendingCheckout) {
      return;
    }

    await this.db
      .update(pendingCheckouts)
      .set({
        planCode: this.resolvePlanCode(subscription),
        stripeCustomerId: externalCustomerId,
        stripeSubscriptionId: subscription.id,
        status:
          subscription.status === "active" || subscription.status === "trialing"
            ? pendingCheckout.organizationId
              ? "completed"
              : "confirmed"
            : pendingCheckout.status,
        updatedAt: new Date(),
      })
      .where(eq(pendingCheckouts.id, pendingCheckout.id));
  }

  private async syncSubscriptionByExternalId(
    externalSubscriptionId: string,
    organizationId: string,
    externalCustomerId: string | null,
  ) {
    const subscription = await this.stripe.subscriptions.retrieve(
      externalSubscriptionId,
    );

    return this.syncSubscriptionObjectDb(
      this.db,
      subscription,
      organizationId,
      externalCustomerId,
    );
  }

  private async syncSubscriptionObject(
    subscription: Stripe.Subscription,
    organizationId: string,
    externalCustomerId: string | null,
  ) {
    return this.syncSubscriptionObjectDb(
      this.db,
      subscription,
      organizationId,
      externalCustomerId,
    );
  }

  private async syncSubscriptionObjectDb(
    db: DatabaseClient,
    subscription: Stripe.Subscription,
    organizationId: string,
    externalCustomerId: string | null,
  ) {
    const customerId =
      externalCustomerId ?? this.getStripeCustomerId(subscription.customer);
    const billingCustomer = await this.upsertOrganizationBillingCustomerDb(db, {
      externalCustomerId: customerId,
      organizationId,
    });
    const interval = this.resolveInterval(subscription);
    const planCode = this.resolvePlanCode(subscription);
    // Stripe.Subscription já inclui current_period_start e current_period_end como timestamps
    const currentPeriodStart = this.toDate(
      subscription.items.data[0]?.current_period_start,
    );
    const currentPeriodEnd = this.toDate(
      subscription.items.data[0]?.current_period_end,
    );
    const existingSubscription = await db.query.subscriptions.findFirst({
      where: (table, { eq }) =>
        eq(table.externalSubscriptionId, subscription.id),
    });

    const values = {
      billingCustomerId: billingCustomer.id,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      currentPeriodEnd,
      currentPeriodStart,
      externalSubscriptionId: subscription.id,
      interval,
      organizationId,
      planCode,
      provider: "stripe" as const,
      status: subscription.status,
      trialEnd: this.toDate(subscription.trial_end),
      trialStart: this.toDate(subscription.trial_start),
    };

    if (existingSubscription) {
      const [updated] = await db
        .update(subscriptions)
        .set(values)
        .where(eq(subscriptions.id, existingSubscription.id))
        .returning({ id: subscriptions.id });

      return updated.id;
    }

    const [created] = await db
      .insert(subscriptions)
      .values(values)
      .returning({ id: subscriptions.id });

    return created.id;
  }

  private findBillingTrial(userId: string) {
    return this.db.query.billingTrials.findFirst({
      where: (table, { eq }) => eq(table.userId, userId),
    });
  }

  private requireBillingOwner(authContext: AuthenticatedRequestContext) {
    if (!authContext.organization || authContext.organization.role !== "owner") {
      throw new ForbiddenException("Only workspace owners can manage billing.");
    }

    return authContext.organization;
  }

  private async finalizeSetupCheckoutSubscription(
    session: Stripe.Checkout.Session,
  ) {
    const organizationId = this.normalizeNullableString(
      session.metadata?.organizationId,
    );
    const userId = this.normalizeNullableString(session.metadata?.userId);
    const setupIntentId = this.readStripeSetupIntentIdFromSession(session.setup_intent);

    if (!organizationId || !userId) {
      throw new BadRequestException("Setup checkout is missing billing metadata.");
    }

    const setupIntent = await this.stripe.setupIntents.retrieve(setupIntentId);
    const paymentMethodId = this.readStripePaymentMethodId(
      setupIntent.payment_method,
    );
    const trial = await this.findBillingTrial(userId);
    const planCode = this.resolvePlanCodeFromCheckoutSession(session);
    const interval = this.resolveIntervalFromCheckoutSession(session);
    const priceId = this.resolvePriceId(planCode, interval);
    const stillInTrial =
      trial?.organizationId === organizationId &&
      trial.trialEndsAt.getTime() > Date.now();
    const subscription = await this.stripe.subscriptions.create(
      {
        customer: this.readStripeCustomerIdFromSession(session.customer),
        default_payment_method: paymentMethodId,
        items: [{ price: priceId }],
        metadata: {
          checkoutSessionId: session.id,
          interval,
          organizationId,
          planCode,
          userId,
        },
        payment_settings: {
          save_default_payment_method: "on_subscription",
        },
        ...(stillInTrial
          ? { trial_end: Math.floor(trial.trialEndsAt.getTime() / 1000) }
          : {}),
      },
      { idempotencyKey: `setup-checkout-subscription:${session.id}` },
    );

    return subscription.id;
  }

  private async ensureCheckoutCustomer(
    authContext: AuthenticatedRequestContext,
  ) {
    if (authContext.organization?.id) {
      const existingOrganizationCustomer =
        await this.db.query.billingCustomers.findFirst({
          where: (table, { and, eq }) =>
            and(
              eq(table.organizationId, authContext.organization!.id),
              eq(table.provider, "stripe"),
            ),
        });

      if (existingOrganizationCustomer) {
        try {
          await this.stripe.customers.retrieve(
            existingOrganizationCustomer.externalCustomerId,
          );
          return existingOrganizationCustomer.externalCustomerId;
        } catch (error: unknown) {
          if (
            !(error instanceof Stripe.errors.StripeInvalidRequestError) ||
            error.code !== "resource_missing"
          ) {
            throw error;
          }
        }
      }
    }

    const existingPendingCheckout =
      await this.db.query.pendingCheckouts.findFirst({
        where: (table, { and, eq }) =>
          and(
            eq(table.userId, authContext.user.id),
            isNotNull(table.stripeCustomerId),
          ),
        orderBy: (table, { desc }) => [desc(table.updatedAt)],
      });

    if (existingPendingCheckout?.stripeCustomerId) {
      try {
        await this.stripe.customers.retrieve(
          existingPendingCheckout.stripeCustomerId,
        );
        return existingPendingCheckout.stripeCustomerId;
      } catch (error: unknown) {
        if (
          !(error instanceof Stripe.errors.StripeInvalidRequestError) ||
          error.code !== "resource_missing"
        ) {
          throw error;
        }
      }
    }

    const customer = await this.stripe.customers.create({
      email: authContext.user.email,
      metadata: {
        organizationId: authContext.organization?.id ?? "",
        userId: authContext.user.id,
      },
      name: authContext.organization?.name ?? authContext.user.name,
    });

    return customer.id;
  }

  private async upsertOrganizationBillingCustomerDb(
    db: DatabaseClient,
    input: {
      externalCustomerId: string;
      organizationId: string;
    },
  ) {
    const byOrganization = await db.query.billingCustomers.findFirst({
      where: (table, { and, eq }) =>
        and(
          eq(table.organizationId, input.organizationId),
          eq(table.provider, "stripe"),
        ),
    });

    if (byOrganization) {
      if (byOrganization.externalCustomerId === input.externalCustomerId) {
        return byOrganization;
      }

      const [updated] = await db
        .update(billingCustomers)
        .set({
          externalCustomerId: input.externalCustomerId,
        })
        .where(eq(billingCustomers.id, byOrganization.id))
        .returning();

      return updated;
    }

    const [created] = await db
      .insert(billingCustomers)
      .values({
        externalCustomerId: input.externalCustomerId,
        organizationId: input.organizationId,
        provider: "stripe",
      })
      .returning();

    return created;
  }

  private async upsertPendingCheckoutRecord(input: {
    checkoutSessionId: string;
    interval: string;
    organizationId: string | null;
    planCode: BillingPlanCode;
    stripeCustomerId: string | null;
    stripeSubscriptionId: string | null;
    userId: string;
    status: string;
  }) {
    const existingPendingCheckout =
      await this.db.query.pendingCheckouts.findFirst({
        where: (table, { eq }) =>
          eq(table.checkoutSessionId, input.checkoutSessionId),
      });

    const values = {
      interval: input.interval,
      metadata: {},
      organizationId: input.organizationId,
      planCode: input.planCode,
      status: input.status,
      stripeCustomerId: input.stripeCustomerId,
      stripeSubscriptionId: input.stripeSubscriptionId,
      userId: input.userId,
    };

    if (existingPendingCheckout) {
      const [updated] = await this.db
        .update(pendingCheckouts)
        .set({
          ...values,
          updatedAt: new Date(),
        })
        .where(eq(pendingCheckouts.id, existingPendingCheckout.id))
        .returning();

      return updated;
    }

    const [created] = await this.db
      .insert(pendingCheckouts)
      .values({
        ...values,
        checkoutSessionId: input.checkoutSessionId,
      })
      .returning();

    return created;
  }

  private async findReusableOpenCheckout(input: {
    organizationId: string;
    userId: string;
  }) {
    const pendingCheckout = await this.db.query.pendingCheckouts.findFirst({
      where: (table, { and, eq }) =>
        and(
          eq(table.organizationId, input.organizationId),
          eq(table.status, "created"),
          eq(table.userId, input.userId),
        ),
      orderBy: (table, { desc }) => [desc(table.updatedAt)],
    });

    if (!pendingCheckout) {
      return null;
    }

    const session = await this.stripe.checkout.sessions.retrieve(
      pendingCheckout.checkoutSessionId,
    );

    if (session.status === "open" && session.url) {
      return {
        checkoutUrl: session.url,
        sessionId: session.id,
      };
    }

    await this.db
      .update(pendingCheckouts)
      .set({
        status: session.status === "complete" ? "completed" : "expired",
        updatedAt: new Date(),
      })
      .where(eq(pendingCheckouts.id, pendingCheckout.id));

    if (session.status === "complete") {
      throw new BadRequestException(
        "Checkout was completed. Return to the application to confirm the subscription.",
      );
    }

    return null;
  }

  private async recordSubscriptionEvent(input: {
    event: Stripe.Event;
    organizationId: string;
    subscriptionId: string | null;
  }) {
    await this.db.insert(subscriptionEvents).values({
      eventType: input.event.type,
      occurredAt: this.toDate(input.event.created) ?? new Date(),
      organizationId: input.organizationId,
      payload: input.event as unknown as Record<string, unknown>,
      provider: "stripe",
      subscriptionId: input.subscriptionId,
    });
  }

  private async findOrganizationIdByCustomer(externalCustomerId: string) {
    const billingCustomer = await this.db.query.billingCustomers.findFirst({
      where: (table, { and, eq }) =>
        and(
          eq(table.externalCustomerId, externalCustomerId),
          eq(table.provider, "stripe"),
        ),
    });

    return billingCustomer?.organizationId ?? null;
  }

  private resolvePriceId(planCode: BillingPlanCode, interval: BillingInterval) {
    const envPriceIds = this.readConfiguredPriceIdMap();
    const priceId = envPriceIds[planCode][interval]?.trim();

    if (priceId) {
      return priceId;
    }

    this.logger.error(`${BILLING_PRICE_CONFIG_LABEL} missing price id.`, {
      interval,
      keyPrefix: this.readStripeKeyPrefix(),
      planCode,
    });
    throw new InternalServerErrorException(
      `Missing Stripe price configuration for plan ${planCode} (${interval}).`,
    );
  }

  private resolvePlanByPriceId(priceId: string) {
    for (const [code, intervals] of Object.entries(
      this.readConfiguredPriceIdMap(),
    ) as [BillingPlanCode, Record<BillingInterval, string>][]) {
      if (intervals.monthly === priceId) {
        return BILLING_PLAN_BY_CODE[code];
      }
    }

    return null;
  }

  private resolvePlanCode(subscription: Stripe.Subscription): BillingPlanCode {
    const metadataPlanCode = subscription.metadata?.planCode;

    if (metadataPlanCode && isBillingPlanCode(metadataPlanCode)) {
      return metadataPlanCode;
    }

    const firstItem = subscription.items.data[0];
    const priceId = firstItem?.price?.id;

    if (priceId) {
      const plan = this.resolvePlanByPriceId(priceId);
      if (plan) {
        return plan.code;
      }
    }

    return "start";
  }

  private resolveInterval(subscription: Stripe.Subscription): BillingInterval {
    return "monthly";
  }

  private resolveIntervalFromCheckoutSession(session: Stripe.Checkout.Session) {
    return "monthly" as const;
  }

  private resolvePlanCodeFromCheckoutSession(
    session: Stripe.Checkout.Session,
  ): BillingPlanCode {
    const planCode = session.metadata?.planCode;

    return planCode && isBillingPlanCode(planCode) ? planCode : "start";
  }

  private getStripeCustomerId(
    customer: string | Stripe.Customer | Stripe.DeletedCustomer | null,
  ) {
    if (!customer) {
      throw new BadRequestException("Stripe customer reference is missing.");
    }

    return typeof customer === "string" ? customer : customer.id;
  }

  private readStripeCustomerIdFromSession(
    customer: string | Stripe.Customer | Stripe.DeletedCustomer | null,
  ) {
    return this.getStripeCustomerId(customer);
  }

  private readStripeSubscriptionIdFromSession(
    subscription: string | Stripe.Subscription | null,
  ) {
    if (typeof subscription === "string") {
      return subscription;
    }

    if (
      subscription &&
      typeof subscription === "object" &&
      "id" in subscription
    ) {
      return subscription.id;
    }

    throw new BadRequestException(
      "Checkout session did not attach a subscription.",
    );
  }

  private normalizeNullableString(value: string | null | undefined) {
    if (!value) {
      return null;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  private toDate(value: number | null | undefined) {
    return typeof value === "number" ? new Date(value * 1000) : null;
  }

  private readStripeSetupIntentIdFromSession(
    setupIntent: string | Stripe.SetupIntent | null,
  ) {
    if (typeof setupIntent === "string") {
      return setupIntent;
    }

    if (setupIntent && typeof setupIntent === "object" && "id" in setupIntent) {
      return setupIntent.id;
    }

    throw new BadRequestException("Checkout session did not attach a setup intent.");
  }

  private readStripePaymentMethodId(
    paymentMethod: string | Stripe.PaymentMethod | null,
  ) {
    if (typeof paymentMethod === "string") {
      return paymentMethod;
    }

    if (paymentMethod && typeof paymentMethod === "object" && "id" in paymentMethod) {
      return paymentMethod.id;
    }

    throw new BadRequestException("Setup checkout did not collect a payment method.");
  }

  private readConfiguredPriceIdMap(): Record<
    BillingPlanCode,
    Record<BillingInterval, string>
  > {
    return {
      business: {
        monthly: this.env.STRIPE_PRICE_BUSINESS_MONTHLY,
      },
      essencial: {
        monthly: this.env.STRIPE_PRICE_ESSENCIAL_MONTHLY ?? "",
      },
      pro: {
        monthly: this.env.STRIPE_PRICE_PRO_MONTHLY,
      },
      start: {
        monthly: this.env.STRIPE_PRICE_START_MONTHLY,
      },
    };
  }

  private async validateConfiguredPrice(
    planCode: BillingPlanCode,
    interval: BillingInterval,
    priceId: string,
  ) {
    if (this.validatedPriceIds.has(priceId) || this.shouldSkipPriceValidation()) {
      return;
    }

    try {
      const price = await this.stripe.prices.retrieve(priceId);

      if (!price.active) {
        this.logger.error(`${BILLING_PRICE_CONFIG_LABEL} points to inactive price.`, {
          interval,
          keyPrefix: this.readStripeKeyPrefix(),
          planCode,
          priceId,
        });
        throw new InternalServerErrorException(
          `Stripe billing configuration is invalid for plan ${planCode} (${interval}).`,
        );
      }

      this.validatedPriceIds.add(priceId);
    } catch (error: unknown) {
      this.rethrowStripePriceConfigurationError(error, {
        interval,
        planCode,
        priceId,
      });
      throw error;
    }
  }

  private shouldSkipPriceValidation() {
    return this.env.STRIPE_SECRET_KEY.startsWith("rk_");
  }

  private rethrowStripePriceConfigurationError(
    error: unknown,
    input: {
      interval: BillingInterval;
      planCode: BillingPlanCode;
      priceId: string;
    },
  ): never | void {
    if (
      error instanceof Stripe.errors.StripeInvalidRequestError &&
      error.code === "resource_missing"
    ) {
      this.logger.error(`${BILLING_PRICE_CONFIG_LABEL} rejected by Stripe.`, {
        interval: input.interval,
        keyPrefix: this.readStripeKeyPrefix(),
        param: error.param ?? null,
        planCode: input.planCode,
        priceId: input.priceId,
      });
      throw new InternalServerErrorException(
        `Stripe billing configuration is invalid for plan ${input.planCode} (${input.interval}).`,
      );
    }
  }

  private readStripeKeyPrefix() {
    const match = this.env.STRIPE_SECRET_KEY.match(/^[a-z]+(?:_[a-z]+)?/i);
    return match?.[0] ?? "unknown";
  }

  async createCustomerPortalSession(authContext: AuthenticatedRequestContext) {
    this.requireBillingOwner(authContext);
    // Buscar o customer ID da organização ou do pending checkout
    let customerId: string | null = null;

    if (authContext.organization?.id) {
      const billingCustomer = await this.db.query.billingCustomers.findFirst({
        where: (table, { and, eq }) =>
          and(
            eq(table.organizationId, authContext.organization!.id),
            eq(table.provider, "stripe"),
          ),
      });

      if (billingCustomer) {
        customerId = billingCustomer.externalCustomerId;
      }
    }

    // Se não encontrou na organização, busca no pending checkout
    if (!customerId) {
      const pendingCheckout = await this.db.query.pendingCheckouts.findFirst({
        where: (table, { and, eq, or }) =>
          and(
            eq(table.userId, authContext.user.id),
            or(eq(table.status, "confirmed"), eq(table.status, "completed")),
          ),
        orderBy: (table, { desc }) => [desc(table.updatedAt)],
      });

      if (pendingCheckout?.stripeCustomerId) {
        customerId = pendingCheckout.stripeCustomerId;
      }
    }

    if (!customerId) {
      throw new BadRequestException("No Stripe customer found for this user.");
    }

    const session = await this.stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${this.env.WEB_APP_ORIGIN}/app/billing/manage`,
    });

    if (!session.url) {
      throw new BadRequestException(
        "Stripe portal session did not return a redirect URL.",
      );
    }

    return {
      portalUrl: session.url,
    };
  }
}
