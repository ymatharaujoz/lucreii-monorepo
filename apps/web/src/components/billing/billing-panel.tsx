"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card } from "@lucreii/ui";
import { BILLING_PLANS, type BillingPlanCode } from "@lucreii/types";
import { apiClient, ApiClientError } from "@/lib/api/client";
import type { ServerBillingState } from "@/lib/server-billing";
import { getClientPublicEnv } from "@/lib/env";
import { getWhatsappDemoUrl } from "@/lib/site";

type BillingPanelProps = {
  canManageBilling: boolean;
  checkoutSessionId: string | null;
  checkoutState: string | null;
  organizationName: string;
  trial: ServerBillingState["trial"];
};

function formatTrialEnd(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function BillingPanel({
  canManageBilling,
  checkoutSessionId,
  checkoutState,
  organizationName,
  trial,
}: BillingPanelProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState<BillingPlanCode | null>(null);
  const [message, setMessage] = useState<string | null>(
    checkoutState === "cancelled" ? "Checkout cancelado. Você pode tentar novamente." : null,
  );
  const needsClientConfirm =
    checkoutState === "success" && Boolean(checkoutSessionId);

  useEffect(() => {
    if (!needsClientConfirm || !checkoutSessionId) {
      return;
    }

    void (async () => {
      try {
        await apiClient.post<{ data: ServerBillingState; error: null }>(
          "/billing/checkout/confirm",
          { body: { sessionId: checkoutSessionId } },
        );
        router.replace("/app");
        router.refresh();
      } catch (error) {
        setMessage(
          error instanceof ApiClientError || error instanceof Error
            ? error.message
            : "Não foi possível confirmar o checkout. Tente novamente.",
        );
      }
    })();
  }, [checkoutSessionId, needsClientConfirm, router]);

  async function handleCheckout(planCode: BillingPlanCode) {
    setIsSubmitting(planCode);
    setMessage(null);

    try {
      const response = await apiClient.post<{
        data: { checkoutUrl: string; sessionId: string };
        error: null;
      }>("/billing/checkout", { body: { interval: "monthly", planCode } });
      window.location.assign(response.data.checkoutUrl);
    } catch (error) {
      setMessage(
        error instanceof ApiClientError || error instanceof Error
          ? error.message
          : "Não foi possível iniciar o checkout. Tente novamente.",
      );
      setIsSubmitting(null);
    }
  }

  const trialIsActive = trial?.status === "active";
  const title = !canManageBilling
    ? "Planos da Lucreii"
    : trialIsActive
      ? "Escolha seu plano"
      : "Seu teste terminou";
  const subtitle = !canManageBilling
    ? "Somente o proprietário deste workspace pode contratar ou alterar o plano."
    : trialIsActive
      ? `Seu cartão será cobrado em ${formatTrialEnd(trial.endsAt)}. Nenhum novo período grátis será criado.`
      : "Escolha um plano para desbloquear novamente sua operação. A cobrança é imediata.";
  const contactUrl =
    getWhatsappDemoUrl(getClientPublicEnv()) ?? "mailto:suporte@lucreii.com";

  return (
    <div className="mx-auto w-full max-w-6xl py-4 sm:py-8">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">
          {organizationName}
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-foreground">
          {title}
        </h1>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground">
          {subtitle}
        </p>
      </div>

      {message ? (
        <p
          className="mx-auto mt-8 max-w-2xl rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-foreground"
          role="status"
        >
          {message}
        </p>
      ) : null}

      <div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {BILLING_PLANS.map((plan) => (
          <Card
            key={plan.code}
            className={plan.featured ? "border-accent shadow-lg shadow-accent/10" : ""}
            padding="lg"
          >
            {plan.featured ? (
              <p className="text-xs font-semibold uppercase tracking-wider text-accent">
                Mais popular
              </p>
            ) : null}
            <h2 className="mt-2 text-xl font-semibold text-foreground">{plan.name}</h2>
            <p className="mt-3 text-3xl font-bold tracking-tight text-foreground">
              {plan.monthlyPrice}
              <span className="ml-1 text-sm font-medium text-muted-foreground">
                {plan.monthlySuffix}
              </span>
            </p>
            <p className="mt-3 min-h-10 text-sm text-muted-foreground">
              {plan.description}
            </p>
            <ul className="mt-6 space-y-3 text-sm text-muted-foreground">
              <li>{plan.cnpjLimitLabel}</li>
              <li>{plan.ordersLimit}</li>
              {plan.features.slice(0, 2).map((feature) => (
                <li key={feature}>✓ {feature}</li>
              ))}
            </ul>
            {canManageBilling ? (
              <Button
                className="mt-8 w-full"
                disabled={isSubmitting !== null || needsClientConfirm}
                loading={isSubmitting === plan.code}
                onClick={() => void handleCheckout(plan.code)}
              >
                Escolher {plan.name}
              </Button>
            ) : null}
          </Card>
        ))}
      </div>

      <Card className="mt-6 text-center" padding="lg">
        <h2 className="text-xl font-semibold text-foreground">Enterprise</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Precisa de uma estrutura personalizada? Fale com um especialista.
        </p>
        <a
          className="mt-5 inline-flex text-sm font-semibold text-accent hover:underline"
          href={contactUrl}
          rel="noreferrer"
          target="_blank"
        >
          Falar com especialista
        </a>
      </Card>
    </div>
  );
}
