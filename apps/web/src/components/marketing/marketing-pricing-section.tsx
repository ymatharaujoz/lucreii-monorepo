"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import {
  BarChart3,
  Building2,
  Check,
  Crown,
  Database,
  Headphones,
  HelpCircle,
  Infinity as InfinityIcon,
  Leaf,
  ShieldCheck,
  Star,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ScheduleDemoLink } from "./schedule-demo-link";

const ALL_PLAN_FEATURES = [
  "Dashboard financeiro",
  "Rentabilidade e ROI por produto",
  "Taxa e impacto das devoluções",
  "Calculadora de precificação",
  "Ponto de equilíbrio",
  "Integração com marketplaces",
] as const;

type MarketingPricingPlan = {
  code: string;
  name: string;
  description: string;
  price: string;
  monthly?: boolean;
  cnpjLimit: string;
  ordersLimit: string;
  ordersNote?: string;
  icon: LucideIcon;
  iconClassName: string;
  featured?: boolean;
  enterprise?: boolean;
};

export const marketingPricingPlans: readonly MarketingPricingPlan[] = [
  {
    code: "start",
    name: "Start",
    description: "O primeiro passo para mais lucro.",
    price: "R$ 49,90",
    monthly: true,
    cnpjLimit: "1 CNPJ",
    ordersLimit: "Até 200 pedidos/mês",
    ordersNote: "(média dos últimos 3 meses)",
    icon: Leaf,
    iconClassName: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
  {
    code: "essencial",
    name: "Essencial",
    description: "Mais controle para o seu negócio.",
    price: "R$ 99,90",
    monthly: true,
    cnpjLimit: "1 CNPJ",
    ordersLimit: "Até 1.000 pedidos/mês",
    ordersNote: "(média dos últimos 3 meses)",
    icon: BarChart3,
    iconClassName: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  },
  {
    code: "pro",
    name: "Pro",
    description: "Para quem já vende em maior escala.",
    price: "R$ 179,90",
    monthly: true,
    cnpjLimit: "Até 3 CNPJs",
    ordersLimit: "Até 3.500 pedidos/mês",
    ordersNote: "(média dos últimos 3 meses)",
    icon: Crown,
    iconClassName: "bg-amber-400/15 text-amber-500",
    featured: true,
  },
  {
    code: "business",
    name: "Business",
    description: "Estrutura para ir ainda mais longe.",
    price: "R$ 249,90",
    monthly: true,
    cnpjLimit: "Até 5 CNPJs",
    ordersLimit: "Até 7.500 pedidos/mês",
    ordersNote: "(média dos últimos 3 meses)",
    icon: Building2,
    iconClassName: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  },
  {
    code: "enterprise",
    name: "Enterprise",
    description: "Soluções sob medida para grandes operações.",
    price: "Sob consulta",
    cnpjLimit: "6+ CNPJs",
    ordersLimit: "Acima de 7.500 pedidos/mês",
    icon: Star,
    iconClassName: "bg-amber-400/15 text-amber-500",
    enterprise: true,
  },
] as const;

const generalBenefits: readonly {
  icon: LucideIcon;
  title: string;
  description: string;
}[] = [
  {
    icon: InfinityIcon,
    title: "Todas as funcionalidades",
    description: "em todos os planos",
  },
  {
    icon: Database,
    title: "Vários marketplaces",
    description: "sem custo adicional",
  },
  {
    icon: BarChart3,
    title: "Dados reais",
    description: "para decisões mais lucrativas",
  },
  {
    icon: Headphones,
    title: "Suporte especializado",
    description: "em português",
  },
  {
    icon: ShieldCheck,
    title: "Seus dados sempre seguros",
    description: "e protegidos",
  },
];

function PlanLimit({
  icon: Icon,
  children,
}: {
  icon: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2.5 text-sm text-muted-foreground">
      <Icon
        aria-hidden
        className="mt-0.5 h-4 w-4 shrink-0 text-foreground/75"
        strokeWidth={1.8}
      />
      <span>{children}</span>
    </div>
  );
}

function PricingCard({
  plan,
  index,
}: {
  plan: MarketingPricingPlan;
  index: number;
}) {
  const reduceMotion = useReducedMotion();
  const PlanIcon = plan.icon;

  return (
    <motion.article
      initial={reduceMotion ? false : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{
        duration: 0.55,
        delay: reduceMotion ? 0 : index * 0.07,
        ease: [0.16, 1, 0.3, 1],
      }}
      whileHover={
        reduceMotion ? undefined : { y: -4, transition: { duration: 0.2 } }
      }
      className={`relative flex h-full flex-col rounded-2xl border p-5 shadow-sm transition-shadow duration-300 hover:shadow-xl sm:p-6 ${
        plan.featured
          ? "border-accent bg-gradient-to-b from-surface-elevated to-accent/[0.06] shadow-[var(--shadow-glow)] ring-1 ring-accent/25 before:absolute before:inset-x-8 before:top-0 before:h-1 before:rounded-b-full before:bg-accent"
          : "border-border/80 bg-surface/95 shadow-[var(--shadow-card)] backdrop-blur-sm"
      }`}
    >
      {plan.featured && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-accent px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-white shadow-md">
          Mais escolhido
        </span>
      )}

      <div className="flex items-start justify-between gap-3">
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-2xl ring-1 ring-black/5 ${plan.iconClassName}`}
        >
          <PlanIcon aria-hidden className="h-6 w-6" strokeWidth={1.8} />
        </div>
        {plan.featured && (
          <span className="mt-1 h-2 w-2 rounded-full bg-accent shadow-[0_0_0_4px] shadow-accent/10" />
        )}
      </div>

      <div className="mt-6 min-h-[6.5rem]">
        <h3 className="text-[1.65rem] font-bold tracking-tight text-foreground">
          {plan.name}
        </h3>
        <p className="mt-1.5 text-sm leading-5 text-muted-foreground">
          {plan.description}
        </p>
      </div>

      <div className="mt-2 flex min-h-14 items-end gap-1.5">
        <span
          className={`whitespace-nowrap font-bold tracking-tight text-foreground ${plan.enterprise ? "text-2xl" : "text-[2rem]"}`}
        >
          {plan.price}
        </span>
        {plan.monthly && (
          <span className="pb-1 text-xs text-muted-foreground">/mês</span>
        )}
      </div>

      <div className="mt-5">
        {plan.enterprise ? (
          <ScheduleDemoLink
            label="Falar com um especialista"
            className="inline-flex h-12 w-full items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-accent bg-transparent px-3 text-center text-xs font-bold text-accent transition-colors hover:bg-accent/[0.06]"
          />
        ) : (
          <Link
            href="/sign-in"
            className={`inline-flex h-12 w-full items-center justify-center rounded-xl px-3 text-center text-sm font-bold transition-all ${
              plan.featured
                ? "bg-accent text-white shadow-md hover:bg-accent-strong hover:shadow-lg"
                : "border border-accent/70 bg-transparent text-accent hover:bg-accent/[0.06]"
            }`}
          >
            Começar agora
          </Link>
        )}
      </div>

      <div className="mt-7 border-t border-border/80 pt-5">
        <h4 className="text-[0.7rem] font-bold uppercase tracking-[0.08em] text-foreground">
          Limites do plano
        </h4>
        <div className="mt-3 space-y-2.5">
          <PlanLimit icon={Building2}>{plan.cnpjLimit}</PlanLimit>
          <PlanLimit icon={Database}>
            <span className="font-medium text-foreground">
              {plan.ordersLimit}
            </span>
            {plan.ordersNote && (
              <span className="mt-0.5 block text-xs">{plan.ordersNote}</span>
            )}
          </PlanLimit>
        </div>
      </div>

      <ul className="mt-6 flex-1 space-y-3 border-t border-border/80 pt-5">
        {ALL_PLAN_FEATURES.map((feature) => (
          <li
            key={feature}
            className="flex items-start gap-2.5 text-sm leading-5 text-muted-foreground"
          >
            <Check
              aria-hidden
              className="mt-0.5 h-4 w-4 shrink-0 text-accent"
              strokeWidth={2.5}
            />
            <span>{feature}</span>
          </li>
        ))}
        {plan.enterprise && (
          <>
            <li className="flex items-start gap-2.5 text-sm leading-5 text-muted-foreground">
              <Check
                aria-hidden
                className="mt-0.5 h-4 w-4 shrink-0 text-accent"
                strokeWidth={2.5}
              />
              <span>Suporte prioritário</span>
            </li>
            <li className="flex items-start gap-2.5 text-sm leading-5 text-muted-foreground">
              <Check
                aria-hidden
                className="mt-0.5 h-4 w-4 shrink-0 text-accent"
                strokeWidth={2.5}
              />
              <span>Condições personalizadas</span>
            </li>
          </>
        )}
      </ul>
    </motion.article>
  );
}

export function MarketingPricingSection() {
  const reduceMotion = useReducedMotion();

  return (
    <section id="planos" className="scroll-mt-28 py-24 md:py-32">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto mb-12 max-w-3xl text-center"
        >
          <span className="inline-flex items-center rounded-full border border-accent/20 bg-accent/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-accent">
            Planos
          </span>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground md:text-4xl lg:text-5xl">
            Um plano para cada etapa
            <br />
            do <span className="text-accent">seu crescimento.</span>
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg">
            Todos os planos têm acesso a todas as funcionalidades da Lucreii.
            Escolha o plano de acordo com o tamanho da sua operação.
          </p>
        </motion.div>

        <div className="grid items-stretch gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {marketingPricingPlans.map((plan, index) => (
            <PricingCard key={plan.code} plan={plan} index={index} />
          ))}
        </div>

        <div className="mt-8 grid overflow-hidden rounded-2xl border border-border bg-surface/70 shadow-sm md:grid-cols-5 md:divide-x md:divide-border">
          {generalBenefits.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="flex items-center gap-3 border-b border-border p-4 last:border-b-0 md:border-b-0 md:p-5"
            >
              <Icon
                aria-hidden
                className="h-8 w-8 shrink-0 text-accent"
                strokeWidth={1.8}
              />
              <div>
                <p className="text-sm font-semibold leading-5 text-foreground">
                  {title}
                </p>
                <p className="text-xs leading-4 text-muted-foreground">
                  {description}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <div className="rounded-2xl border border-accent/10 bg-gradient-to-br from-accent/10 via-accent/[0.04] to-transparent p-6 sm:p-7">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent/10 text-accent">
                <BarChart3 aria-hidden className="h-6 w-6" strokeWidth={1.8} />
              </div>
              <div>
                <h3 className="text-xl font-bold leading-tight text-foreground">
                  Seu negócio cresce.
                  <br />
                  Seu plano acompanha.
                </h3>
                <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
                  Na Lucreii, você não precisa pagar mais para desbloquear
                  funcionalidades. Você escolhe o plano conforme o tamanho da
                  sua operação, e nós cuidamos do resto.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-surface p-6 sm:p-7">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-foreground text-background">
                <HelpCircle aria-hidden className="h-5 w-5" strokeWidth={2} />
              </div>
              <div>
                <h3 className="text-xl font-bold leading-tight text-foreground">
                  Como funciona o cálculo de pedidos?
                </h3>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  Utilizamos a média dos últimos 3 meses completos disponíveis
                  na Lucreii. Você pode importar pedidos anteriores via planilha
                  ou integrar diretamente com os marketplaces.
                </p>
                <Link
                  href="#planos"
                  className="mt-4 inline-flex text-sm font-semibold text-accent underline-offset-4 hover:underline"
                >
                  Saiba mais sobre os planos{" "}
                  <span aria-hidden className="ml-1">
                    →
                  </span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
