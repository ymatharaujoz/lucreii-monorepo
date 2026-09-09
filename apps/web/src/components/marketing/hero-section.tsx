"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  Check,
  Clock3,
  Hand,
  Headphones,
  LayoutDashboard,
  Megaphone,
  Package,
  Percent,
  ReceiptText,
  RotateCcw,
  Settings2,
  ShieldCheck,
  Share2,
  ShoppingCart,
  Target,
  Tag,
  TrendingUp,
} from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { ScheduleDemoLink } from "./schedule-demo-link";
import {
  MercadoLivreMiniIcon,
  SheinMiniIcon,
  ShopeeMiniIcon,
  TiktokMiniIcon,
} from "./marketplace-icons";

const easeOut = [0.16, 1, 0.3, 1] as const;

export function getDashboardGreeting(hour: number) {
  if (hour >= 5 && hour < 12) return "Bom dia";
  if (hour >= 12 && hour < 18) return "Boa tarde";
  return "Boa noite";
}

function subscribeToDashboardClock(onChange: () => void) {
  const interval = window.setInterval(onChange, 60_000);
  return () => window.clearInterval(interval);
}

function getCurrentDashboardGreeting() {
  return getDashboardGreeting(new Date().getHours());
}

function createRevealVariants(reduceMotion: boolean | null) {
  return {
    hidden: { opacity: 0, y: 18 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: reduceMotion ? 0 : 0.65, ease: easeOut },
    },
  };
}

const featureCards = [
  {
    title: "Lucro real",
    description: "Saiba quanto realmente sobra.",
    icon: BarChart3,
  },
  {
    title: "Por produto",
    description: "Identifique seus SKUs mais lucrativos.",
    icon: Tag,
  },
  {
    title: "Publicidade",
    description: "Veja o impacto dos anúncios no lucro.",
    icon: Megaphone,
  },
  {
    title: "Multi-marketplace",
    description: "Analise seus canais de venda em um só lugar.",
    icon: Share2,
  },
] as const;

const marketplaceCards = [
  { name: "Mercado Livre", icon: MercadoLivreMiniIcon, comingSoon: false },
  { name: "Shopee", icon: ShopeeMiniIcon, comingSoon: false },
  { name: "TikTok Shop", icon: TiktokMiniIcon, comingSoon: true },
  { name: "Shein", icon: SheinMiniIcon, comingSoon: true },
] as const;

function HeroBackdrop() {
  const reduceMotion = useReducedMotion();

  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden="true"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(122,211,198,0.19),transparent_28%),radial-gradient(circle_at_82%_30%,rgba(255,255,255,0.88),transparent_34%),linear-gradient(135deg,#f1fbfa_0%,#e4f6f3_52%,#f3fbfa_100%)] dark:bg-[linear-gradient(135deg,#0f211f_0%,#102a27_52%,#10201f_100%)]" />
      <motion.div
        className="absolute -left-40 top-24 h-[420px] w-[420px] rounded-full bg-accent/10 blur-3xl"
        animate={
          reduceMotion === false
            ? { y: [0, -12, 0], scale: [1, 1.04, 1] }
            : undefined
        }
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -right-36 top-16 h-[420px] w-[420px] rounded-full bg-white/70 blur-3xl dark:bg-accent/10"
        animate={
          reduceMotion === false
            ? { y: [0, 14, 0], x: [0, -8, 0] }
            : undefined
        }
        transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }}
      />
      <svg
        className="absolute inset-0 h-full w-full opacity-35 dark:opacity-20"
        viewBox="0 0 1600 920"
        fill="none"
        preserveAspectRatio="none"
      >
        <path
          d="M0 116C126 170 116 286 42 354S-5 548 116 582"
          stroke="#75cfc2"
          strokeWidth="1"
        />
        <path
          d="M1600 128C1506 198 1492 286 1558 360S1609 548 1502 626"
          stroke="#75cfc2"
          strokeWidth="1"
        />
        <path
          d="M0 698C148 628 176 710 254 804"
          stroke="#75cfc2"
          strokeWidth="1"
        />
        <path
          d="M1600 676C1502 606 1460 712 1364 826"
          stroke="#75cfc2"
          strokeWidth="1"
        />
        <path
          d="M32 354L116 582M1558 360L1502 626"
          stroke="#75cfc2"
          strokeDasharray="3 8"
          strokeWidth="1"
        />
        <circle cx="35" cy="354" r="5" fill="#8cb6b1" />
        <circle cx="116" cy="582" r="4" fill="#8cb6b1" />
        <circle cx="1558" cy="360" r="5" fill="#8cb6b1" />
        <circle cx="1502" cy="626" r="4" fill="#8cb6b1" />
        <circle cx="254" cy="804" r="3" fill="#8cb6b1" />
        <circle cx="1364" cy="826" r="3" fill="#8cb6b1" />
      </svg>
    </div>
  );
}

function MarketplaceStrip() {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      variants={createRevealVariants(reduceMotion)}
      whileHover={reduceMotion ? undefined : { y: -2 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col gap-3 rounded-2xl border border-white/80 bg-white/80 px-4 py-3 shadow-[0_12px_30px_rgba(17,92,83,0.07)] backdrop-blur-sm dark:border-white/10 dark:bg-surface/80 sm:flex-row sm:items-center"
    >
      <p className="max-w-[14rem] text-base font-semibold leading-tight tracking-tight text-foreground sm:text-lg">
        Conecte seus canais de venda em um só lugar.
      </p>
      <div className="hidden h-14 w-px bg-border sm:block" />
      <div className="grid flex-1 grid-cols-4 items-start gap-2 sm:gap-3">
        {marketplaceCards.map(({ name, icon: Icon, comingSoon }, index) => (
          <motion.div
            key={name}
            initial={
              { opacity: 0, scale: 0.92 }
            }
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              duration: 0.35,
              delay: reduceMotion ? 0 : 0.65 + index * 0.08,
              ease: easeOut,
            }}
            className="flex min-w-0 flex-col items-center gap-1 text-center"
          >
            <span className="flex h-8 items-center justify-center sm:h-9">
              <Icon className="h-7 w-auto max-w-12 object-contain sm:h-8" />
            </span>
            <span className="w-full truncate text-[10px] font-medium text-foreground sm:text-[11px]">
              {name}
            </span>
            {comingSoon && (
              <span className="text-[9px] text-muted-foreground">Em breve</span>
            )}
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

function FeatureCards() {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className="grid grid-cols-2 gap-3 xl:grid-cols-4"
      variants={{
        hidden: {},
        visible: {
          transition: { staggerChildren: reduceMotion ? 0 : 0.08 },
        },
      }}
    >
      {featureCards.map(({ title, description, icon: Icon }) => (
        <motion.div
          key={title}
          variants={createRevealVariants(reduceMotion)}
          whileHover={
            reduceMotion ? undefined : { y: -4, transition: { duration: 0.2 } }
          }
          className="group rounded-2xl border border-white/80 bg-white/85 p-3 shadow-[0_12px_30px_rgba(17,92,83,0.07)] backdrop-blur-sm transition-shadow hover:shadow-[0_18px_36px_rgba(17,92,83,0.12)] dark:border-white/10 dark:bg-surface/85"
        >
          <Icon
            className="h-7 w-7 text-accent transition-transform duration-300 group-hover:scale-105"
            strokeWidth={1.8}
            aria-hidden="true"
          />
          <h2 className="mt-2 text-[13px] font-bold tracking-tight text-foreground sm:text-sm">
            {title}
          </h2>
          <p className="mt-1 text-[10px] leading-snug text-muted-foreground sm:text-[11px]">
            {description}
          </p>
        </motion.div>
      ))}
    </motion.div>
  );
}

function DashboardSidebar() {
  const navItems = [
    { label: "Dashboard", icon: LayoutDashboard, active: true },
    { label: "Vendas", icon: ShoppingCart },
    { label: "Produtos", icon: Package },
    { label: "Publicidade", icon: Megaphone },
    { label: "Custos", icon: ReceiptText },
    { label: "Devoluções", icon: RotateCcw },
    { label: "Relatórios", icon: BarChart3 },
    { label: "Marketplaces", icon: Share2 },
    { label: "Configurações", icon: Settings2 },
  ];

  return (
    <aside className="hidden bg-[#102226] px-3 py-5 text-white sm:block">
      <div className="flex items-center gap-2 px-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-white/95 text-lg font-black leading-none text-[#102226]">
          ↗
        </span>
        <span className="text-lg font-bold tracking-tight">Lucreii</span>
      </div>
      <nav
        className="mt-7 space-y-1"
        aria-label="Prévia da navegação do dashboard"
      >
        {navItems.map(({ label, icon: Icon, active }) => (
          <div
            key={label}
            className={`flex items-center gap-2 rounded-lg px-2.5 py-2 text-[10px] ${active ? "bg-accent text-white shadow-[0_7px_18px_rgba(14,122,111,0.26)]" : "text-white/75"}`}
          >
            <Icon
              className="h-3.5 w-3.5 shrink-0"
              strokeWidth={1.8}
              aria-hidden="true"
            />
            <span className="truncate">{label}</span>
          </div>
        ))}
      </nav>
    </aside>
  );
}

function MetricCard({
  label,
  value,
  change,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  change?: string;
  icon: typeof ShoppingCart;
  tone: "green" | "blue" | "purple";
}) {
  const toneClass = {
    green:
      "bg-emerald-50 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-300",
    blue: "bg-blue-50 text-blue-600 dark:bg-blue-400/10 dark:text-blue-300",
    purple:
      "bg-purple-50 text-purple-600 dark:bg-purple-400/10 dark:text-purple-300",
  }[tone];

  return (
    <div className="relative min-w-0 rounded-xl border border-border/70 bg-white/80 p-3 shadow-[0_3px_12px_rgba(17,40,38,0.04)] dark:bg-surface-strong/80">
      <div className="flex items-start justify-between gap-2">
        <p className="truncate text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <span
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${toneClass}`}
        >
          <Icon className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
        </span>
      </div>
      <p className="mt-1 text-base font-bold tracking-tight text-foreground sm:text-lg">
        {value}
      </p>
      {change && (
        <p className="mt-0.5 text-[9px] font-medium text-emerald-600 dark:text-emerald-300">
          ↑ {change}
        </p>
      )}
    </div>
  );
}

function ProfitChart() {
  const reduceMotion = useReducedMotion();
  const points = [30, 35, 43, 51, 54, 66, 73, 74, 86];
  const path =
    "M12 90C35 84 35 77 57 72S85 56 105 52S132 44 150 34S177 32 198 18";

  return (
    <div className="rounded-xl border border-border/70 bg-white/80 p-3 dark:bg-surface-strong/80">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Evolução do lucro líquido
        </p>
        <TrendingUp className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
      </div>
      <div className="relative mt-3 h-28">
        <svg
          viewBox="0 0 210 108"
          className="h-full w-full overflow-visible"
          aria-label="Gráfico demonstrativo de evolução do lucro líquido"
        >
          <defs>
            <linearGradient id="heroProfitArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0e7a6f" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#0e7a6f" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={`${path} L198 104 L12 104Z`} fill="url(#heroProfitArea)" />
          <motion.path
            d={path}
            fill="none"
            stroke="#0e7a6f"
            strokeWidth="2.5"
            strokeLinecap="round"
            initial={
              { pathLength: 0 }
            }
            animate={{ pathLength: 1 }}
            transition={{ duration: reduceMotion ? 0 : 1.2, ease: easeOut }}
          />
          {points.map((point, index) => {
            const x = 12 + (index / (points.length - 1)) * 186;
            const y = 104 - point;
            return (
              <motion.circle
                key={`${x}-${y}`}
                cx={x}
                cy={y}
                r="3"
                fill="#0e7a6f"
                initial={
                  { opacity: 0, scale: 0 }
                }
                animate={{ opacity: 1, scale: 1 }}
                transition={{
                  duration: reduceMotion ? 0 : 0.25,
                  delay: reduceMotion ? 0 : 0.75 + index * 0.06,
                }}
              />
            );
          })}
        </svg>
        <div className="absolute bottom-0 left-1 right-1 flex justify-between text-[9px] text-muted-foreground">
          <span>Mai</span>
          <span>Jun</span>
          <span>Jul</span>
          <span>Ago</span>
          <span>Set</span>
        </div>
      </div>
    </div>
  );
}

function ChannelPerformance() {
  const rows = [
    {
      name: "Mercado Livre",
      icon: MercadoLivreMiniIcon,
      revenue: "R$ 24.800,00",
      profit: "R$ 7.840,00",
    },
    {
      name: "Shopee",
      icon: ShopeeMiniIcon,
      revenue: "R$ 11.300,00",
      profit: "R$ 2.940,00",
    },
    {
      name: "TikTok Shop",
      icon: TiktokMiniIcon,
      revenue: "R$ 4.980,00",
      profit: "R$ 1.260,00",
    },
    {
      name: "Shein",
      icon: SheinMiniIcon,
      revenue: "R$ 1.500,00",
      profit: "R$ 140,00",
    },
  ];

  return (
    <div className="rounded-xl border border-border/70 bg-white/80 p-3 dark:bg-surface-strong/80">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        Performance por canal
      </p>
      <div className="mt-3 grid grid-cols-[1.3fr_1fr_1fr] gap-2 border-b border-border pb-2 text-[8px] font-semibold uppercase text-muted-foreground">
        <span>Marketplace</span>
        <span>Faturamento</span>
        <span>Lucro</span>
      </div>
      <div className="mt-2 space-y-2.5">
        {rows.map(({ name, icon: Icon, revenue, profit }) => (
          <div
            key={name}
            className="grid grid-cols-[1.3fr_1fr_1fr] items-center gap-2 text-[9px] text-foreground"
          >
            <span className="flex min-w-0 items-center gap-1.5 font-medium">
              <Icon className="h-4 w-5 shrink-0 object-contain" />
              <span className="truncate">{name}</span>
            </span>
            <span className="truncate">{revenue}</span>
            <span className="truncate font-semibold text-accent">{profit}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function InsightsPanel() {
  return (
    <div className="rounded-xl border border-accent/20 bg-accent/[0.045] p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-1.5 text-[10px] font-semibold text-accent">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent/10">
            ✦
          </span>
          Insights da Lucreii
        </p>
        <span className="text-[9px] font-semibold text-accent">
          Ver mais insights →
        </span>
      </div>
      <ul className="mt-2 space-y-1 text-[9px] leading-snug text-muted-foreground">
        <li className="flex gap-1.5">
          <Check className="mt-px h-3 w-3 shrink-0 text-accent" />
          Seu lucro líquido cresceu 18% em relação ao mês anterior.
        </li>
        <li className="flex gap-1.5">
          <Check className="mt-px h-3 w-3 shrink-0 text-accent" />3 produtos com
          alta margem podem receber mais investimento em anúncios.
        </li>
        <li className="flex gap-1.5">
          <Check className="mt-px h-3 w-3 shrink-0 text-accent" />
          Seu faturamento está 49,8% acima do ponto de equilíbrio.
        </li>
      </ul>
    </div>
  );
}

function DashboardPreview() {
  const reduceMotion = useReducedMotion();
  const greeting = useSyncExternalStore(
    subscribeToDashboardClock,
    getCurrentDashboardGreeting,
    () => "Boa tarde",
  );

  return (
    <motion.div
      variants={createRevealVariants(reduceMotion)}
      initial="hidden"
      animate="visible"
      className="relative"
    >
      <div
        className="absolute -inset-5 rounded-[30px] bg-accent/10 blur-3xl"
        aria-hidden="true"
      />
      <div className="relative overflow-hidden rounded-[22px] border border-white/90 bg-white shadow-[0_28px_80px_rgba(13,66,59,0.18)] dark:border-white/10 dark:bg-surface">
        <div className="grid sm:grid-cols-[138px_minmax(0,1fr)]">
          <DashboardSidebar />
          <div className="min-w-0 p-3 sm:p-4">
            <header className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-bold tracking-tight text-foreground sm:text-lg">
                  {greeting}, vendedor!{" "}
                  <Hand
                    className="inline-block h-4 w-4 text-accent sm:h-[18px] sm:w-[18px]"
                    strokeWidth={1.8}
                    aria-hidden="true"
                  />
                </h2>
                <p className="mt-0.5 text-[9px] text-muted-foreground sm:text-[10px]">
                  Aqui está um resumo do seu negócio.
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-white px-2.5 py-2 text-[9px] font-medium text-foreground dark:bg-surface-strong sm:px-3">
                <CalendarDays
                  className="h-3.5 w-3.5 text-muted-foreground"
                  aria-hidden="true"
                />
                <span className="hidden sm:inline">Setembro de 2026</span>
                <span className="sm:hidden">Set/26</span>
                <span className="text-muted-foreground">⌄</span>
              </div>
            </header>

            <div className="mt-4 grid grid-cols-2 gap-2.5">
              <MetricCard
                label="Faturamento"
                value="R$ 42.580,00"
                change="12,5% vs. mês anterior"
                icon={ShoppingCart}
                tone="green"
              />
              <MetricCard
                label="Margem de contribuição"
                value="28,6%"
                change="4,2 p.p. vs. mês anterior"
                icon={Percent}
                tone="blue"
              />
              <MetricCard
                label="Ponto de equilíbrio"
                value="R$ 28.430,00"
                icon={Target}
                tone="purple"
              />
              <MetricCard
                label="Lucro líquido"
                value="R$ 12.180,00"
                change="28,6% do faturamento"
                icon={BarChart3}
                tone="green"
              />
            </div>

            <div className="mt-2.5 grid gap-2.5 md:grid-cols-[1.03fr_0.97fr]">
              <ProfitChart />
              <ChannelPerformance />
            </div>

            <div className="mt-2.5">
              <InsightsPanel />
            </div>
          </div>
        </div>
      </div>

    </motion.div>
  );
}

function TrustBar() {
  const trustItems = [
    {
      label: "Seus dados seguros",
      detail: "Conexão oficial com os marketplaces",
      icon: ShieldCheck,
    },
    {
      label: "Comece em poucos minutos",
      detail: "Sem burocracia",
      icon: Clock3,
    },
    {
      label: "Suporte em português",
      detail: "Conte com a nossa equipe",
      icon: Headphones,
    },
  ];

  return (
    <div className="relative border-t border-white/80 bg-white/90 backdrop-blur-md dark:border-white/10 dark:bg-surface/90">
      <div className="mx-auto grid max-w-[1440px] sm:grid-cols-3">
        {trustItems.map(({ label, detail, icon: Icon }) => (
          <div
            key={label}
            className="flex items-center gap-4 border-b border-border/50 px-6 py-4 last:border-b-0 sm:border-b-0 sm:border-r sm:px-8 sm:py-5 sm:last:border-r-0 lg:px-12"
          >
            <Icon
              className="h-8 w-8 shrink-0 text-accent"
              strokeWidth={1.7}
              aria-hidden="true"
            />
            <div>
              <p className="text-sm font-semibold text-foreground">{label}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {detail}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function MarketingHero() {
  const reduceMotion = useReducedMotion();

  return (
    <section id="inicio" className="relative overflow-hidden pt-5 sm:pt-8">
      <HeroBackdrop />
      <div className="relative z-10 mx-auto max-w-[1440px] px-5 pb-14 sm:px-8 lg:px-10 lg:pb-16">
        <div className="grid items-start gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(560px,1.03fr)] lg:gap-10 xl:gap-14">
          <motion.div
            className="max-w-2xl pt-3 lg:pt-3"
            initial={false}
            animate="visible"
            variants={{
              visible: {
                transition: { staggerChildren: reduceMotion ? 0 : 0.1 },
              },
            }}
          >
            <motion.p
              variants={createRevealVariants(reduceMotion)}
              className="text-xs font-bold uppercase tracking-[0.16em] text-accent sm:text-sm"
            >
              7 DIAS GRÁTIS PARA CONHECER A LUCREII
            </motion.p>
            <motion.h1
              variants={createRevealVariants(reduceMotion)}
              className="mt-5 max-w-[680px] text-[clamp(3rem,4.6vw,4.5rem)] font-extrabold leading-[0.98] tracking-[-0.065em] text-foreground"
            >
              Veja o lucro que
              <br />
              <span className="text-accent">realmente importa.</span>
            </motion.h1>
            <motion.p
              variants={createRevealVariants(reduceMotion)}
              className="mt-6 max-w-[620px] text-lg leading-[1.3] text-foreground-soft sm:text-[1.35rem]"
            >
              Descubra quanto realmente sobra das suas vendas. A Lucreii reúne
              custos, taxas, impostos, publicidade e devoluções para mostrar seu
              lucro real por produto e marketplace.
            </motion.p>

            <motion.div
              variants={createRevealVariants(reduceMotion)}
              className="mt-7 flex flex-wrap items-center gap-3"
            >
              <Link
                href="/sign-in"
                className="group inline-flex h-14 items-center justify-center gap-3 rounded-full bg-accent px-6 text-base font-bold text-white shadow-[0_12px_24px_rgba(14,122,111,0.22)] transition-all hover:bg-accent-strong hover:shadow-[0_16px_32px_rgba(14,122,111,0.3)] active:scale-[0.98] sm:px-7"
              >
                Testar grátis por 7 dias
                <ArrowRight
                  className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1"
                  strokeWidth={2.2}
                  aria-hidden="true"
                />
              </Link>
              <ScheduleDemoLink
                allowDemoFallback
                className="inline-flex h-14 items-center justify-center gap-2 rounded-full border border-border bg-white/90 px-6 text-base font-semibold text-foreground shadow-sm transition-all hover:border-accent/30 hover:bg-white hover:shadow-md active:scale-[0.98] dark:bg-surface/90 dark:hover:bg-surface"
              />
            </motion.div>

            <motion.p
              variants={createRevealVariants(reduceMotion)}
              className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground"
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent text-white">
                <Check className="h-3.5 w-3.5" strokeWidth={3} />
              </span>
              7 dias grátis&nbsp; • &nbsp;Sem cartão de crédito&nbsp; •
              &nbsp;Cancele quando quiser
            </motion.p>

            <motion.div
              variants={createRevealVariants(reduceMotion)}
              className="mt-5"
            >
              <FeatureCards />
            </motion.div>
            <motion.div
              variants={createRevealVariants(reduceMotion)}
              className="mt-3"
            >
              <MarketplaceStrip />
            </motion.div>
          </motion.div>

          <div className="pt-2 lg:pt-3 xl:pt-4">
            <DashboardPreview />
          </div>
        </div>
      </div>
      <TrustBar />
    </section>
  );
}
