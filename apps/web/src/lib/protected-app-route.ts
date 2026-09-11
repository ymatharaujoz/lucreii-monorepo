import type { ServerAuthState } from "@/lib/server-auth";
import type { ServerBillingState } from "@/lib/server-billing";

/**
 * Entitlement válido para usar a área /app: assinatura Stripe ativa ou trial
 * interno ainda vigente.
 */
export function hasSubscriptionForProtectedApp(
  billingState: ServerBillingState | null,
) {
  return (
    billingState?.status === "active" ||
    billingState?.status === "pending_onboarding"
  );
}

const MANAGEABLE_SUBSCRIPTION_STATUSES = new Set([
  "active",
  "past_due",
  "paused",
  "trialing",
  "unpaid",
]);

export function hasManageableBillingSubscription(
  billingState: ServerBillingState | null,
) {
  const subscription = billingState?.subscription;

  return Boolean(
    subscription?.externalSubscriptionId &&
    MANAGEABLE_SUBSCRIPTION_STATUSES.has(subscription.status),
  );
}

/**
 * Fluxo: sem workspace → onboarding; sem entitlement → planos; caso contrário segue.
 */
export function resolveProtectedAppRedirect(
  authState: ServerAuthState | null,
  billingState: ServerBillingState | null,
) {
  if (!authState) {
    return "/sign-in";
  }

  if (!authState.organization) {
    return "/app/onboarding";
  }

  if (!hasSubscriptionForProtectedApp(billingState)) {
    return "/app/billing";
  }

  return null;
}
