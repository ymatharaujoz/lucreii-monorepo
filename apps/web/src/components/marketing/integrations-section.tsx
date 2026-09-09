"use client";

import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  Check,
  Clock3,
  LayoutDashboard,
  Megaphone,
  Package,
  ReceiptText,
  RotateCcw,
  Settings2,
  Share2,
  ShoppingCart,
  TrendingUp,
} from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import {
  MercadoLivreIcon,
  SheinIcon,
  ShopeeIcon,
  TiktokIcon,
} from "./marketplace-icons";

const easeOut = [0.16, 1, 0.3, 1] as const;

function createRevealVariants(reduceMotion: boolean | null) {
  return {
    hidden: { opacity: 0, y: 22 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: reduceMotion ? 0 : 0.65,
        ease: easeOut,
      },
    },
  };
}

function hasIntersectionObserver() {
  return typeof window !== "undefined" && "IntersectionObserver" in window;
}

function getRevealInitial(reduceMotion: boolean | null) {
  return reduceMotion || !hasIntersectionObserver() ? false : "hidden";
}

function getChecklistInitial(reduceMotion: boolean | null) {
  return reduceMotion || !hasIntersectionObserver()
    ? false
    : { opacity: 0, x: -8 };
}

const integrationCards = [
  {
    name: "Mercado Livre",
    description:
      "Conecte sua conta e deixe a Lucreii organizar automaticamente os dados da sua operação.",
    icon: <MercadoLivreIcon className="h-16 w-24" />,
    status: "available" as const,
    features: [
      "Pedidos e vendas",
      "Produtos e SKUs",
      "Tarifas e custos da venda",
      "Devoluções",
      "Dados de publicidade",
    ],
  },
  {
    name: "Shopee",
    description:
      "Centralize seus dados da Shopee na Lucreii e acompanhe o resultado real da sua operação.",
    icon: <ShopeeIcon className="h-16 w-16" />,
    status: "available" as const,
    features: [
      "Pedidos e vendas",
      "Produtos e SKUs",
      "Taxas da plataforma",
      "Devoluções",
      "Indicadores financeiros",
    ],
  },
  {
    name: "TikTok Shop",
    description: "Estamos preparando a integração com o TikTok Shop.",
    icon: <TiktokIcon className="h-16 w-16" />,
    status: "coming-soon" as const,
    features: [
      "Pedidos e vendas",
      "Produtos e SKUs",
      "Taxas da plataforma",
      "Devoluções",
      "Dados de publicidade",
    ],
  },
  {
    name: "Shein",
    description: "Estamos preparando a integração com a Shein.",
    icon: <SheinIcon className="h-16 w-16" />,
    status: "coming-soon" as const,
    features: [
      "Pedidos e vendas",
      "Produtos e SKUs",
      "Taxas da plataforma",
      "Devoluções",
      "Indicadores financeiros",
    ],
  },
] as const;

const dashboardNav = [
  { label: "Dashboard", icon: LayoutDashboard },
  { label: "Vendas", icon: ShoppingCart },
  { label: "Produtos", icon: Package },
  { label: "Publicidade", icon: Megaphone },
  { label: "Custos", icon: ReceiptText },
  { label: "Devoluções", icon: RotateCcw },
  { label: "Relatórios", icon: BarChart3 },
  { label: "Marketplaces", icon: Share2 },
  { label: "Configurações", icon: Settings2 },
] as const;

function IntegrationBackdrop() {
  const reduceMotion = useReducedMotion();

  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden="true"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.96),transparent_45%),linear-gradient(180deg,#f5fbfa_0%,#e4f5f2_100%)] dark:bg-[linear-gradient(180deg,#102522_0%,#0e1e1d_100%)]" />
      <motion.div
        className="absolute -left-48 top-12 h-[460px] w-[460px] rounded-full bg-accent/10 blur-3xl"
        animate={
          reduceMotion === false
            ? { y: [0, -14, 0], scale: [1, 1.03, 1] }
            : undefined
        }
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -right-48 top-24 h-[500px] w-[500px] rounded-full bg-white/60 blur-3xl dark:bg-accent/10"
        animate={
          reduceMotion === false
            ? { y: [0, 12, 0], x: [0, -10, 0] }
            : undefined
        }
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />
      <svg
        className="absolute inset-0 h-full w-full opacity-60 dark:opacity-20"
        viewBox="0 0 1600 1120"
        fill="none"
        preserveAspectRatio="none"
      >
        <motion.path
          d="M-40 680C230 610 120 330 318 112"
          stroke="#8bd5cc"
          strokeWidth="1.5"
          strokeDasharray="5 12"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: reduceMotion ? 0 : 1.8, ease: easeOut }}
        />
        <motion.path
          d="M1640 420C1390 418 1486 190 1304 -30"
          stroke="#8bd5cc"
          strokeWidth="1.5"
          strokeDasharray="5 12"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{
            duration: reduceMotion ? 0 : 1.8,
            delay: reduceMotion ? 0 : 0.2,
            ease: easeOut,
          }}
        />
        <circle cx="122" cy="348" r="5" fill="#82bcb5" />
        <circle cx="1468" cy="236" r="5" fill="#82bcb5" />
        <circle cx="240" cy="812" r="3" fill="#82bcb5" />
        <circle cx="1374" cy="760" r="3" fill="#82bcb5" />
      </svg>
    </div>
  );
}

function IntegrationCard({
  name,
  description,
  icon,
  status,
  features,
  index,
}: (typeof integrationCards)[number] & { index: number }) {
  const reduceMotion = useReducedMotion();
  const isAvailable = status === "available";

  return (
    <motion.article
      initial={getRevealInitial(reduceMotion)}
      whileInView="visible"
      viewport={{ once: true, margin: "-80px" }}
      variants={createRevealVariants(reduceMotion)}
      transition={{ delay: reduceMotion ? 0 : index * 0.08 }}
      whileHover={
        reduceMotion
          ? undefined
          : {
              y: -5,
              transition: {
                type: "spring",
                stiffness: 220,
                damping: 22,
              },
            }
      }
      className="group relative flex min-h-[424px] flex-col overflow-hidden rounded-[20px] border border-white/90 bg-white/85 p-7 shadow-[0_14px_36px_rgba(18,83,76,0.08)] backdrop-blur-sm transition-shadow duration-300 hover:shadow-[0_20px_44px_rgba(18,83,76,0.14)] dark:border-white/10 dark:bg-surface/85 sm:min-h-[438px] sm:p-8"
    >
      <div className="absolute right-6 top-6">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold ${
            isAvailable
              ? "bg-accent text-white"
              : "bg-[#929897] text-white dark:bg-white/30"
          }`}
        >
          {isAvailable ? (
            <Check
              className="h-3.5 w-3.5"
              strokeWidth={2.6}
              aria-hidden="true"
            />
          ) : (
            <Clock3
              className="h-3.5 w-3.5"
              strokeWidth={2}
              aria-hidden="true"
            />
          )}
          {isAvailable ? "Disponível" : "Em breve"}
        </span>
      </div>

      <motion.div
        className="flex h-16 items-center"
        animate={reduceMotion === false ? { y: [0, -2, 0] } : undefined}
        transition={{
          duration: 4.5,
          repeat: Infinity,
          ease: "easeInOut",
          delay: index * 0.18,
        }}
      >
        {icon}
      </motion.div>

      <h3 className="mt-5 text-[22px] font-bold tracking-[-0.04em] text-foreground">
        {name}
      </h3>
      <p className="mt-2 max-w-[270px] text-[15px] leading-[1.5] text-foreground-soft">
        {description}
      </p>

      <div className="mt-5 flex flex-1 flex-col border-t border-border/70 pt-5">
        <ul className="space-y-2.5">
          {features.map((feature, featureIndex) => (
            <motion.li
              key={feature}
              initial={getChecklistInitial(reduceMotion)}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{
                duration: reduceMotion ? 0 : 0.35,
                delay: reduceMotion ? 0 : 0.2 + featureIndex * 0.04,
              }}
              className="flex items-center gap-3 text-[15px] leading-tight text-foreground-soft"
            >
              <span
                className={`flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full ${
                  isAvailable
                    ? "bg-accent text-white"
                    : "bg-[#b5bbba] text-white dark:bg-white/35"
                }`}
              >
                <Check
                  className="h-3.5 w-3.5"
                  strokeWidth={2.7}
                  aria-hidden="true"
                />
              </span>
              <span>{feature}</span>
            </motion.li>
          ))}
        </ul>

        {status === "coming-soon" && (
          <a
            href="#demo"
            className="mt-auto inline-flex items-center gap-2 pt-6 text-[15px] font-bold text-[#126e66] transition-colors hover:text-accent-strong hover:underline dark:text-accent"
          >
            Ser notificado quando lançar
            <ArrowRight
              className="h-4 w-4"
              strokeWidth={2.2}
              aria-hidden="true"
            />
          </a>
        )}
      </div>
    </motion.article>
  );
}

function ProfitMiniChart({ gradientId = "integrationsChartFill" }: { gradientId?: string }) {
  const reduceMotion = useReducedMotion();
  const points = [
    [8, 74],
    [42, 58],
    [72, 66],
    [104, 44],
    [138, 53],
    [168, 34],
    [201, 44],
    [230, 20],
    [268, 28],
  ] as const;

  return (
    <svg viewBox="0 0 280 92" className="h-full w-full" aria-hidden="true">
      <defs>
        <linearGradient
          id={gradientId}
          x1="0"
          y1="0"
          x2="0"
          y2="1"
        >
          <stop offset="0" stopColor="#0e7a6f" stopOpacity="0.24" />
          <stop offset="1" stopColor="#0e7a6f" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d="M8 74L42 58L72 66L104 44L138 53L168 34L201 44L230 20L268 28V86H8Z"
        fill={`url(#${gradientId})`}
      />
      <motion.path
        d="M8 74L42 58L72 66L104 44L138 53L168 34L201 44L230 20L268 28"
        fill="none"
        stroke="#0e7a6f"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: reduceMotion ? 0 : 1.3, ease: easeOut }}
      />
      {points.map(([x, y], index) => (
        <motion.circle
          key={x}
          cx={x}
          cy={y}
          r="3"
          fill="#0e7a6f"
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{
            duration: reduceMotion ? 0 : 0.25,
            delay: reduceMotion ? 0 : 0.7 + index * 0.05,
          }}
        />
      ))}
    </svg>
  );
}

function IntegrationDashboard({
  chartId = "integrations-chart",
}: {
  chartId?: string;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={createRevealVariants(reduceMotion)}
      className="relative w-full max-w-[540px]"
    >
      <div
        className="absolute -inset-4 rounded-[28px] bg-accent/10 blur-3xl"
        aria-hidden="true"
      />
      <div className="relative overflow-hidden rounded-[20px] border border-white/80 bg-white shadow-[0_24px_55px_rgba(20,83,76,0.18)] dark:border-white/10 dark:bg-surface">
        <div className="grid grid-cols-[78px_minmax(0,1fr)] sm:grid-cols-[104px_minmax(0,1fr)]">
          <aside className="bg-[#102226] px-2 py-4 text-white sm:px-3 sm:py-5">
            <div className="flex items-center gap-1.5 px-1 text-[10px] font-bold sm:text-xs">
              <span className="flex h-5 w-5 items-center justify-center rounded-md bg-accent text-white">
                <TrendingUp
                  className="h-3 w-3"
                  strokeWidth={2.6}
                  aria-hidden="true"
                />
              </span>
              Lucreii
            </div>
            <nav className="mt-6 space-y-1" aria-label="Prévia do dashboard">
              {dashboardNav.map(({ label, icon: Icon }, index) => (
                <div
                  key={label}
                  className={`flex items-center gap-1.5 rounded-md px-1.5 py-1.5 text-[7px] sm:gap-2 sm:px-2 sm:text-[8px] ${index === 0 ? "bg-accent text-white" : "text-white/70"}`}
                >
                  <Icon
                    className="h-3 w-3 shrink-0"
                    strokeWidth={1.8}
                    aria-hidden="true"
                  />
                  <span className="truncate">{label}</span>
                </div>
              ))}
            </nav>
          </aside>

          <div className="min-w-0 p-3 sm:p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[8px] text-muted-foreground sm:text-[9px]">
                  Dashboard atualizado
                </p>
                <h4 className="mt-1 text-sm font-bold tracking-tight text-foreground sm:text-base">
                  Visão geral do negócio
                </h4>
              </div>
              <div className="flex items-center gap-1 rounded-md border border-border px-1.5 py-1 text-[7px] text-muted-foreground sm:px-2 sm:text-[8px]">
                <CalendarDays className="h-3 w-3" aria-hidden="true" />
                Setembro 2026
              </div>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-1.5 sm:gap-2">
              {[
                ["Faturamento", "R$ 124.560"],
                ["Lucro líquido", "R$ 18.760"],
                ["Margem", "32,4%"],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-md border border-border/70 bg-surface-soft p-2"
                >
                  <p className="truncate text-[7px] uppercase text-muted-foreground">
                    {label}
                  </p>
                  <p className="mt-1 truncate text-[10px] font-bold text-foreground sm:text-xs">
                    {value}
                  </p>
                  <p className="mt-0.5 text-[7px] font-semibold text-accent">
                    +12,5%
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-2 rounded-md border border-border/70 p-2">
              <div className="flex items-center justify-between">
                <p className="text-[8px] font-semibold uppercase text-muted-foreground">
                  Evolução do lucro
                </p>
                <BarChart3 className="h-3 w-3 text-accent" aria-hidden="true" />
              </div>
              <div className="mt-1 h-[92px]">
                <ProfitMiniChart gradientId={chartId} />
              </div>
              <div className="flex justify-between text-[7px] text-muted-foreground">
                <span>Mai</span>
                <span>Jun</span>
                <span>Jul</span>
                <span>Ago</span>
                <span>Set</span>
              </div>
            </div>

            <div className="mt-2 grid grid-cols-2 gap-2">
              <div className="rounded-md border border-border/70 p-2">
                <p className="text-[8px] font-semibold uppercase text-muted-foreground">
                  Performance por canal
                </p>
                <div className="mt-2 space-y-1.5 text-[8px] text-foreground-soft">
                  <div className="flex items-center justify-between">
                    <span>Mercado Livre</span>
                    <strong>R$ 7.840</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Shopee</span>
                    <strong>R$ 2.940</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>TikTok Shop</span>
                    <strong>R$ 1.260</strong>
                  </div>
                </div>
              </div>
              <div className="rounded-md border border-accent/20 bg-accent/[0.045] p-2">
                <p className="text-[8px] font-semibold text-accent">
                  Insights da Lucreii
                </p>
                <p className="mt-2 text-[8px] leading-snug text-muted-foreground">
                  3 produtos com alta margem podem receber mais investimento.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function IntegrationCallout() {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={getRevealInitial(reduceMotion)}
      whileInView="visible"
      viewport={{ once: true, margin: "-70px" }}
      variants={createRevealVariants(reduceMotion)}
      className="relative mt-10 overflow-hidden rounded-[28px] border border-white/80 bg-[#e0f4f1]/90 shadow-[0_18px_46px_rgba(20,91,82,0.08)] dark:border-white/10 dark:bg-surface/80"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(255,255,255,0.7),transparent_38%)] dark:bg-[radial-gradient(circle_at_70%_20%,rgba(14,122,111,0.12),transparent_38%)]" />

      <div className="relative z-10 px-5 py-6 sm:px-8 sm:py-8 lg:min-h-[292px] lg:pl-[35%] lg:pr-10">
        <div className="mb-7 lg:hidden">
          <IntegrationDashboard chartId="integrations-chart-mobile" />
        </div>

        <div className="grid items-center gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="text-center">
            <h3 className="text-[clamp(1.35rem,2.4vw,2rem)] font-bold tracking-[-0.04em] text-foreground">
              Já vende no Mercado Livre ou Shopee?
            </h3>
            <p className="mt-2 text-sm text-foreground-soft sm:text-base">
              Conecte sua conta e veja seus próprios números na Lucreii.
            </p>
            <Link
              href="/sign-in"
              className="group mt-5 inline-flex h-14 items-center justify-center gap-3 rounded-full bg-accent px-8 text-base font-bold text-white shadow-[0_12px_26px_rgba(14,122,111,0.2)] transition-all hover:bg-accent-strong hover:shadow-[0_16px_32px_rgba(14,122,111,0.28)] active:scale-[0.98]"
            >
              Testar grátis por 7 dias
              <ArrowRight
                className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1"
                strokeWidth={2.2}
                aria-hidden="true"
              />
            </Link>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-3 text-xs text-foreground-soft sm:gap-5 sm:text-sm">
              <span className="inline-flex items-center gap-1.5">
                <Check className="h-4 w-4 text-accent" strokeWidth={2.4} />
                Sem cartão de crédito
              </span>
              <span className="hidden h-5 w-px bg-border sm:block" />
              <span className="inline-flex items-center gap-1.5">
                <Clock3 className="h-4 w-4 text-accent" />
                Cancele quando quiser
              </span>
            </div>
          </div>

          <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
            <div className="hidden items-start gap-2 text-accent sm:flex">
              <svg
                className="mt-1 h-12 w-14 shrink-0"
                viewBox="0 0 56 48"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M52 5C42 7 35 14 35 26c0 8-8 14-27 14"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                />
                <path
                  d="m10 34-4 6 7 2"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <p className="max-w-[180px] font-['Segoe_Print','Comic_Sans_MS',cursive] text-base leading-tight text-foreground/75">
                Seus dados organizados e seu lucro no controle.
              </p>
            </div>
            <motion.div
              className="mt-4 grid grid-cols-4 gap-2"
              animate={reduceMotion === false ? { y: [0, -3, 0] } : undefined}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            >
              {integrationCards.map(({ name, icon }, index) => (
                <motion.div
                  key={name}
                  className="flex h-14 w-14 items-center justify-center rounded-xl border border-white bg-white/90 p-2 shadow-sm dark:border-white/10 dark:bg-surface-strong/80"
                  animate={
                    reduceMotion === false
                      ? { rotate: [0, index % 2 === 0 ? 1 : -1, 0] }
                      : undefined
                  }
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: index * 0.2,
                  }}
                >
                  {icon}
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute -left-24 bottom-[-34px] hidden w-[520px] rotate-[-10deg] lg:block">
        <IntegrationDashboard chartId="integrations-chart-desktop" />
      </div>
    </motion.div>
  );
}

export function IntegrationsSection() {
  const reduceMotion = useReducedMotion();

  return (
    <section
      id="integracoes"
      className="relative scroll-mt-28 overflow-hidden py-16 sm:py-20 md:py-24"
    >
      <IntegrationBackdrop />
      <div className="relative z-10 mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-10">
        <motion.header
          initial={getRevealInitial(reduceMotion)}
          whileInView="visible"
          viewport={{ once: true, margin: "-70px" }}
          variants={{
            hidden: {},
            visible: {
              transition: { staggerChildren: reduceMotion ? 0 : 0.1 },
            },
          }}
          className="mx-auto max-w-5xl text-center"
        >
          <motion.span
            variants={createRevealVariants(reduceMotion)}
            className="inline-flex items-center rounded-full border border-[#167e73] bg-white/35 px-5 py-2 text-sm font-semibold uppercase tracking-[0.08em] text-[#176c65] dark:border-accent/60 dark:bg-accent/10 dark:text-accent"
          >
            Integrações
          </motion.span>
          <motion.h2
            variants={createRevealVariants(reduceMotion)}
            className="mt-5 text-[clamp(2.45rem,5vw,4.15rem)] font-extrabold leading-[0.98] tracking-[-0.065em] text-foreground"
          >
            Conecte seus marketplaces.
            <br />
            <span className="text-accent">A Lucreii cuida dos números.</span>
          </motion.h2>
          <motion.p
            variants={createRevealVariants(reduceMotion)}
            className="mx-auto mt-5 max-w-5xl text-lg leading-[1.35] text-foreground-soft sm:text-[1.35rem]"
          >
            Integre seus canais de venda e acompanhe os resultados da sua operação em um só lugar.
          </motion.p>
        </motion.header>

        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:mt-10 lg:grid-cols-4 lg:gap-4">
          {integrationCards.map((card, index) => (
            <IntegrationCard key={card.name} {...card} index={index} />
          ))}
        </div>

        <motion.div
          initial={getRevealInitial(reduceMotion)}
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          variants={createRevealVariants(reduceMotion)}
          className="mt-10 text-center sm:mt-12"
        >
          <div className="flex items-center justify-center gap-4 sm:gap-8">
            <span className="h-px w-14 bg-accent sm:w-16" />
            <h3 className="text-[clamp(1.3rem,2.2vw,1.8rem)] font-bold tracking-[-0.04em] text-foreground">
              Vários marketplaces. Uma única visão do seu negócio.
            </h3>
            <span className="h-px w-14 bg-accent sm:w-16" />
          </div>
          <p className="mt-1.5 text-base text-foreground-soft sm:text-lg">
            Conecte os canais disponíveis sem pagar adicional por marketplace.
          </p>
        </motion.div>

        <IntegrationCallout />
      </div>
    </section>
  );
}
