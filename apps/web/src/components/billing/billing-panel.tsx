"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  Building2,
  Check,
  Crown,
  Database,
  Headphones,
  Leaf,
  RefreshCcw,
  ShieldCheck,
  Star,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@lucreii/ui";
import { BILLING_PLANS, type BillingPlan, type BillingPlanCode } from "@lucreii/types";
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

const STATUS_BADGE_TONES = {
  accent: "border-accent/20 bg-accent/5 text-accent",
  neutral: "border-border bg-surface text-muted-foreground",
  warning: "border-warning/30 bg-warning/10 text-warning",
} as const;

const PLAN_ICONS: Record<BillingPlanCode, { className: string; icon: LucideIcon }> = {
  business: {
    className: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
    icon: Building2,
  },
  essencial: { className: "bg-sky-500/10 text-sky-600 dark:text-sky-400", icon: BarChart3 },
  pro: { className: "bg-amber-400/15 text-amber-500", icon: Crown },
  start: {
    className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    icon: Leaf,
  },
};

const TRUST_ITEMS: readonly { description: string; icon: LucideIcon; title: string }[] = [
  { description: "Processado pela Stripe", icon: ShieldCheck, title: "Pagamento seguro" },
  { description: "Troque ou cancele quando quiser", icon: RefreshCcw, title: "Sem fidelidade" },
  { description: "Atendimento em português", icon: Headphones, title: "Suporte especializado" },
];

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
  const statusBadge = !canManageBilling
    ? { label: "Acesso restrito ao proprietário", tone: "neutral" as const }
    : trialIsActive
      ? {
          label: `Teste grátis ativo · ${trial.remainingDays} ${
            trial.remainingDays === 1 ? "dia restante" : "dias restantes"
          }`,
          tone: "accent" as const,
        }
      : { label: "Período de teste encerrado", tone: "warning" as const };
  const title = !canManageBilling
    ? "Planos da Lucreii"
    : trialIsActive
      ? "Escolha seu plano"
      : "Seu teste terminou";
  const subtitle = !canManageBilling
    ? "Somente o proprietário deste workspace pode contratar ou alterar o plano."
    : trialIsActive
      ? `Seu cartão será cobrado em ${formatTrialEnd(trial.endsAt)}. Nenhum novo período grátis será criado.`
      : "Seus pedidos, produtos e configurações continuam salvos. Escolha um plano para retomar de onde parou. A cobrança é imediata.";
  const contactUrl =
    getWhatsappDemoUrl(getClientPublicEnv()) ?? "mailto:suporte@lucreii.com";

  return (
    <div className="mx-auto w-full max-w-6xl">
      <header className="mx-auto max-w-2xl text-center">
        <span
          className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1 text-xs font-semibold ${STATUS_BADGE_TONES[statusBadge.tone]}`}
        >
          <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />
          {statusBadge.label}
        </span>
        <h1 className="mt-5 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          {title}
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-muted-foreground">
          {subtitle}
        </p>
        <p className="mt-3 text-xs font-medium text-muted-foreground">
          Workspace <span className="text-foreground">{organizationName}</span>
        </p>
      </header>

      {message ? (
        <p
          className="mx-auto mt-8 max-w-2xl rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-foreground"
          role="status"
        >
          {message}
        </p>
      ) : null}

      <div className="mt-14 grid items-stretch gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {BILLING_PLANS.map((plan) => (
          <PlanCard
            canManageBilling={canManageBilling}
            disabled={isSubmitting !== null || needsClientConfirm}
            key={plan.code}
            loading={isSubmitting === plan.code}
            onSelect={() => void handleCheckout(plan.code)}
            plan={plan}
          />
        ))}
      </div>

      <ul className="mt-8 grid gap-4 rounded-2xl border border-border/80 bg-surface/70 p-5 sm:grid-cols-3 sm:gap-0 sm:divide-x sm:divide-border/80 sm:p-0">
        {TRUST_ITEMS.map(({ description, icon: Icon, title: itemTitle }) => (
          <li className="flex items-center gap-3 sm:px-5 sm:py-4" key={itemTitle}>
            <Icon aria-hidden className="h-5 w-5 shrink-0 text-accent" strokeWidth={1.8} />
            <div>
              <p className="text-sm font-semibold leading-5 text-foreground">{itemTitle}</p>
              <p className="text-xs leading-4 text-muted-foreground">{description}</p>
            </div>
          </li>
        ))}
      </ul>

      <section className="mt-5 flex flex-col gap-4 rounded-2xl border border-border/80 bg-surface p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-400/15 text-amber-500">
            <Star aria-hidden className="h-5 w-5" strokeWidth={1.8} />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">Enterprise</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Mais de 5 CNPJs ou acima de 7.500 pedidos/mês? Montamos um plano sob medida.
            </p>
          </div>
        </div>
        <a
          className="inline-flex h-10 shrink-0 items-center justify-center rounded-xl border border-border px-4 text-sm font-semibold text-foreground transition-colors hover:border-accent/60 hover:text-accent"
          href={contactUrl}
          rel="noreferrer"
          target="_blank"
        >
          Falar com especialista
        </a>
      </section>
    </div>
  );
}

type PlanCardProps = {
  canManageBilling: boolean;
  disabled: boolean;
  loading: boolean;
  onSelect: () => void;
  plan: BillingPlan;
};

function PlanCard({ canManageBilling, disabled, loading, onSelect, plan }: PlanCardProps) {
  const { className: iconClassName, icon: PlanIcon } = PLAN_ICONS[plan.code];

  return (
    <article
      className={`relative flex h-full flex-col rounded-2xl border p-6 transition-shadow duration-300 ${
        plan.featured
          ? "border-accent bg-gradient-to-b from-surface-elevated to-accent/[0.06] shadow-[var(--shadow-glow)] ring-1 ring-accent/25"
          : "border-border/80 bg-surface shadow-[var(--shadow-card)] hover:shadow-lg"
      }`}
    >
      {plan.featured ? (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-accent px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-white shadow-md">
          Mais escolhido
        </span>
      ) : null}

      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconClassName}`}>
          <PlanIcon aria-hidden className="h-5 w-5" strokeWidth={1.8} />
        </div>
        <h2 className="text-xl font-bold tracking-tight text-foreground">{plan.name}</h2>
      </div>

      <p className="mt-3 min-h-10 text-sm leading-5 text-muted-foreground">{plan.description}</p>

      <p className="mt-5 flex items-baseline gap-1">
        <span className="whitespace-nowrap text-[2rem] font-bold leading-none tracking-tight text-foreground">
          {plan.monthlyPrice}
        </span>
        <span className="text-sm text-muted-foreground">{plan.monthlySuffix}</span>
      </p>

      {canManageBilling ? (
        <Button
          className="mt-6 w-full"
          disabled={disabled}
          loading={loading}
          onClick={onSelect}
          size="lg"
          variant={plan.featured ? "primary" : "secondary"}
        >
          Escolher {plan.name}
        </Button>
      ) : null}

      <div className="mt-6 space-y-2.5 border-t border-border/80 pt-5">
        <PlanLimit icon={Building2}>{plan.cnpjLimitLabel}</PlanLimit>
        <PlanLimit icon={Database}>{plan.ordersLimit}</PlanLimit>
      </div>

      <ul className="mt-5 flex-1 space-y-2.5 border-t border-border/80 pt-5">
        {plan.features.map((feature) => (
          <li
            className="flex items-start gap-2.5 text-sm leading-5 text-muted-foreground"
            key={feature}
          >
            <Check aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-accent" strokeWidth={2.5} />
            <span>{feature}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}

function PlanLimit({ children, icon: Icon }: { children: React.ReactNode; icon: LucideIcon }) {
  return (
    <div className="flex items-center gap-2.5 text-sm font-medium text-foreground">
      <Icon aria-hidden className="h-4 w-4 shrink-0 text-foreground/60" strokeWidth={1.8} />
      <span>{children}</span>
    </div>
  );
}
