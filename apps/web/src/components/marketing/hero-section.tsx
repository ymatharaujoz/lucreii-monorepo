"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  Calculator,
  Check,
  ChevronDown,
  Clock3,
  CreditCard,
  Headphones,
  LayoutDashboard,
  Megaphone,
  Package,
  Plug2,
  Settings2,
  ShieldCheck,
  Share2,
  ShoppingCart,
  Target,
  Tag,
  TrendingUp,
  Undo2,
} from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { BrandLogoLight } from "@/components/brand-logo-light";
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
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_35%,rgba(130,219,207,0.2),transparent_30%),radial-gradient(circle_at_83%_28%,rgba(255,255,255,0.88),transparent_38%),linear-gradient(135deg,#f1fcfa_0%,#dff7f3_55%,#effbf9_100%)]" />
      <motion.div
        className="absolute -left-44 top-28 h-[440px] w-[440px] rounded-full bg-[#9be3d8]/35 blur-3xl"
        animate={
          reduceMotion === false
            ? { y: [0, -14, 0], scale: [1, 1.04, 1] }
            : undefined
        }
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -right-40 top-16 h-[460px] w-[460px] rounded-full bg-white/75 blur-3xl"
        animate={
          reduceMotion === false ? { y: [0, 16, 0], x: [0, -10, 0] } : undefined
        }
        transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }}
      />
      <svg
        className="absolute inset-0 h-full w-full opacity-45"
        viewBox="0 0 1600 850"
        fill="none"
        preserveAspectRatio="none"
      >
        <path
          d="M0 130C142 172 117 278 43 358S-4 545 112 590"
          stroke="#79d3c8"
          strokeWidth="1"
        />
        <path
          d="M1600 100C1488 174 1507 290 1570 352S1608 549 1495 636"
          stroke="#79d3c8"
          strokeWidth="1"
        />
        <path
          d="M10 548 112 590 228 714M1590 538 1495 636 1388 736"
          stroke="#79d3c8"
          strokeDasharray="3 8"
          strokeWidth="1"
        />
        <circle cx="43" cy="358" r="5" fill="#83beb7" />
        <circle cx="112" cy="590" r="4" fill="#83beb7" />
        <circle cx="228" cy="714" r="3" fill="#83beb7" />
        <circle cx="1570" cy="352" r="5" fill="#83beb7" />
        <circle cx="1495" cy="636" r="4" fill="#83beb7" />
        <circle cx="1388" cy="736" r="3" fill="#83beb7" />
      </svg>
    </div>
  );
}

function FeatureCards() {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className="grid grid-cols-2 gap-2.5 xl:grid-cols-4"
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: reduceMotion ? 0 : 0.08 } },
      }}
    >
      {featureCards.map(({ title, description, icon: Icon }) => (
        <motion.div
          key={title}
          variants={createRevealVariants(reduceMotion)}
          whileHover={
            reduceMotion ? undefined : { y: -4, transition: { duration: 0.2 } }
          }
          className="group rounded-[15px] border border-white/90 bg-white/90 px-3 py-3.5 shadow-[0_10px_24px_rgba(17,92,83,0.06)] transition-shadow hover:shadow-[0_16px_30px_rgba(17,92,83,0.12)] sm:px-3.5"
        >
          <Icon
            className="h-8 w-8 text-accent transition-transform duration-300 group-hover:scale-105"
            strokeWidth={1.8}
            aria-hidden="true"
          />
          <h2 className="mt-2 text-[13px] font-bold tracking-tight text-foreground sm:text-[15px]">
            {title}
          </h2>
          <p className="mt-1 text-[10px] leading-[1.25] text-muted-foreground sm:text-[11px]">
            {description}
          </p>
        </motion.div>
      ))}
    </motion.div>
  );
}

function MarketplaceStrip() {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      variants={createRevealVariants(reduceMotion)}
      className="flex flex-col gap-3 rounded-[15px] border border-white/90 bg-white/90 px-4 py-3 shadow-[0_10px_24px_rgba(17,92,83,0.06)] sm:flex-row sm:items-center"
    >
      <p className="max-w-[15rem] text-[15px] font-bold leading-[1.15] tracking-tight text-foreground sm:text-base">
        Conecte seus canais de venda em um só lugar.
      </p>
      <div className="hidden h-14 w-px bg-[#d9e9e6] sm:block" />
      <div className="grid flex-1 grid-cols-4 items-start gap-2 sm:gap-3">
        {marketplaceCards.map(({ name, icon: Icon, comingSoon }, index) => (
          <motion.div
            key={name}
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              duration: reduceMotion ? 0 : 0.35,
              delay: reduceMotion ? 0 : 0.65 + index * 0.08,
              ease: easeOut,
            }}
            className="flex min-w-0 flex-col items-center gap-0.5 text-center"
          >
            <span className="flex h-8 items-center justify-center sm:h-9">
              <Icon className="h-7 w-auto max-w-10 object-contain sm:h-8" />
            </span>
            <span className="w-full truncate text-[9px] font-medium text-foreground sm:text-[10px]">
              {name}
            </span>
            {comingSoon && (
              <span className="text-[8px] text-muted-foreground">Em breve</span>
            )}
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

const dashboardNavItems: Array<{
  label: string;
  icon: LucideIcon;
  active?: boolean;
  children?: readonly string[];
}> = [
  { label: "Painel", icon: LayoutDashboard, active: true },
  { label: "Produtos", icon: Package, children: ["Catálogo", "Performance"] },
  { label: "Pedidos", icon: ShoppingCart },
  {
    label: "Calculadora",
    icon: Calculator,
    children: ["Precificação", "ROAS de Equilíbrio"],
  },
  { label: "Integrações", icon: Plug2 },
  { label: "Assinatura", icon: CreditCard },
] as const;

function DashboardSidebar() {
  return (
    <aside className="hidden bg-[#102c31] px-3 py-5 text-white sm:block">
      <div className="flex items-center gap-2 px-2">
        <BrandLogoLight className="h-7 w-7 rounded-[7px] bg-white p-1" />
        <span className="text-[17px] font-bold tracking-tight">Lucreii</span>
      </div>

      <nav
        className="mt-7 space-y-1.5"
        aria-label="Prévia da navegação do dashboard"
      >
        {dashboardNavItems.map(({ label, icon: Icon, active, children }) => (
          <div key={label}>
            <div
              className={`flex min-h-8 items-center gap-2 rounded-lg px-2.5 py-1.5 text-[10px] ${active ? "bg-accent text-white shadow-[0_7px_18px_rgba(14,122,111,0.26)]" : "text-white/80"}`}
            >
              <Icon
                className="h-3.5 w-3.5 shrink-0"
                strokeWidth={1.8}
                aria-hidden="true"
              />
              <span className="truncate">{label}</span>
              {children && (
                <ChevronDown className="ml-auto h-3 w-3" aria-hidden="true" />
              )}
            </div>
            {children && (
              <div className="ml-6 mt-1 space-y-1 border-l border-white/15 pl-2 text-[9px] text-white/70">
                {children.map((child) => (
                  <p
                    key={child}
                    className="flex items-center gap-1.5 whitespace-nowrap"
                  >
                    <span className="text-white/75" aria-hidden="true">
                      •
                    </span>
                    {child}
                  </p>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>
    </aside>
  );
}

type MetricTone = "neutral" | "rose" | "mint";

function MetricCard({
  label,
  value,
  detail,
  status,
  tone,
  icon: Icon,
}: {
  label: string;
  value: string;
  detail: string;
  status?: string;
  tone: MetricTone;
  icon: typeof ShoppingCart;
}) {
  const toneClass = {
    neutral: "border-[#dce8ea] bg-white",
    rose: "border-[#f0dfe1] bg-[#fff9f9]",
    mint: "border-[#cce8e4] bg-[#f5fcfb]",
  }[tone];

  return (
    <div className={`h-[104px] min-w-0 rounded-[14px] border p-3 ${toneClass}`}>
      <div className="flex items-start gap-2">
        <Icon
          className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${tone === "rose" ? "text-[#ef777d]" : "text-accent"}`}
          strokeWidth={2}
          aria-hidden="true"
        />
        <p className="truncate text-[8px] font-semibold uppercase tracking-[0.05em] text-[#677e83]">
          {label}
        </p>
      </div>
      <p className="mt-1.5 truncate text-[16px] font-bold tracking-tight text-[#12292d] sm:text-[18px]">
        {value}
      </p>
      <p className="mt-0.5 min-h-5 line-clamp-2 text-[9px] leading-[1.2] text-[#74898e]">
        {detail}
      </p>
      {status && (
        <p className="mt-1 text-[9px] font-semibold text-accent">↗ {status}</p>
      )}
    </div>
  );
}

function FinancialChart() {
  const reduceMotion = useReducedMotion();
  const revenuePath =
    "M10 108 C24 108 28 54 42 61 S58 72 69 52 S81 80 94 74 S108 86 119 65 S132 78 143 49 S156 105 170 83 S184 95 201 91 S214 96 226 92";
  const profitPath =
    "M10 116 C24 112 30 104 43 110 S58 95 70 108 S84 101 97 104 S112 95 124 103 S138 99 151 102 S170 97 183 105 S206 101 226 106";

  return (
    <div className="rounded-[14px] border border-[#dfe9ea] bg-white p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.03em] text-[#263c40]">
            <TrendingUp
              className="h-3.5 w-3.5 text-accent"
              aria-hidden="true"
            />
            Evolução financeira
          </p>
          <p className="ml-5 text-[8px] text-[#87999d]">RECEITA VS LUCRO</p>
        </div>
        <div className="flex items-center gap-3 text-[8px] text-[#819398]">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-accent" />
            Receita
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-[#8ba4b4]" />
            Lucro
          </span>
        </div>
      </div>
      <div className="relative mt-2 h-[132px]">
        <svg
          viewBox="0 0 236 132"
          className="h-full w-full overflow-visible"
          aria-label="Gráfico demonstrativo de receita e lucro"
          role="img"
        >
          {[18, 48, 78, 108].map((y) => (
            <line
              key={y}
              x1="10"
              x2="226"
              y1={y}
              y2={y}
              stroke="#edf2f2"
              strokeWidth="1"
            />
          ))}
          <motion.path
            d={revenuePath}
            fill="none"
            stroke="#0e9f91"
            strokeWidth="2.4"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: reduceMotion ? 0 : 1.2, ease: easeOut }}
          />
          <motion.path
            d={profitPath}
            fill="none"
            stroke="#8ba4b4"
            strokeWidth="1.8"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{
              duration: reduceMotion ? 0 : 1.1,
              delay: reduceMotion ? 0 : 0.15,
              ease: easeOut,
            }}
          />
        </svg>
        <div className="absolute bottom-0 left-1 right-1 flex justify-between text-[7px] text-[#819398]">
          <span>1 de ago.</span>
          <span>5 de ago.</span>
          <span>9 de ago.</span>
          <span>13 de ago.</span>
          <span>17 de ago.</span>
          <span>22 de ago.</span>
          <span>28 de ago.</span>
          <span>31 de ago.</span>
        </div>
        <div className="absolute bottom-5 left-0 flex flex-col justify-between text-[7px] text-[#819398]">
          <span>R$750</span>
          <span>R$500</span>
          <span>R$250</span>
          <span>R$0</span>
          <span>-R$250</span>
        </div>
      </div>
    </div>
  );
}

const dashboardMarketplaces = [
  {
    name: "Mercado Livre",
    icon: MercadoLivreMiniIcon,
    status: "Conectado",
    connected: true,
  },
  {
    name: "Shopee",
    icon: ShopeeMiniIcon,
    status: "Desconectado",
    connected: false,
  },
  {
    name: "Shein",
    icon: SheinMiniIcon,
    status: "Desconectado",
    connected: false,
  },
] as const;

function MarketplaceStatus() {
  return (
    <div className="rounded-[14px] border border-[#dfe9ea] bg-white p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-bold text-[#263c40]">Marketplaces</p>
          <p className="text-[8px] text-[#87999d]">Integrações ativas</p>
        </div>
        <span className="text-[8px] font-semibold text-accent">
          Gerenciar ↗
        </span>
      </div>
      <div className="mt-3 space-y-2">
        {dashboardMarketplaces.map(
          ({ name, icon: Icon, status, connected }) => (
            <div
              key={name}
              className="flex items-center gap-2 rounded-lg border border-[#edf2f2] px-2 py-1.5"
            >
              <Icon className="h-7 w-7 shrink-0 object-contain" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[9px] font-semibold text-[#334b50]">
                  {name}
                </p>
                <p
                  className={`mt-0.5 inline-flex rounded-full px-1.5 py-0.5 text-[7px] font-semibold ${connected ? "bg-[#dff7ee] text-[#0b9d7a]" : "bg-[#fff0f1] text-[#e46c74]"}`}
                >
                  {connected ? "✓" : "○"} {status}
                </p>
              </div>
            </div>
          ),
        )}
      </div>
    </div>
  );
}

export function DashboardGreeting({
  greeting,
  companyName = "vendedor!",
}: {
  greeting: string;
  companyName?: string;
}) {
  return (
    <h2 className="text-[16px] font-bold tracking-tight text-[#12292d] sm:text-[19px]">
      {greeting}, {companyName}
    </h2>
  );
}

function DashboardPreview() {
  const reduceMotion = useReducedMotion();
  const metrics = [
    {
      label: "Faturamento",
      value: "R$ 16.581,25",
      detail: "467 Vendas Líquidas",
      icon: ShoppingCart,
      tone: "neutral" as const,
    },
    {
      label: "Devoluções",
      value: "R$ 3.094,33",
      detail: "69 Vendas Devolvidas, Canceladas ou Pendentes",
      icon: Undo2,
      tone: "rose" as const,
    },
    {
      label: "Margem média",
      value: "42,19%",
      detail: "Lucro Total: R$ 6.996,01",
      status: "Lucrativo",
      icon: TrendingUp,
      tone: "mint" as const,
    },
    {
      label: "Ponto de equilíbrio",
      value: "R$ 4.250,63",
      detail: "Custo Fixo: R$ 1.793,34",
      status: "Meta atingida",
      icon: Target,
      tone: "mint" as const,
    },
    {
      label: "Lucro líquido",
      value: "R$ 5.202,67",
      detail: "Lucro Total - Custo Fixo",
      status: "Resultado positivo",
      icon: BarChart3,
      tone: "mint" as const,
    },
    {
      label: "Margem líquida",
      value: "31,38%",
      detail: "Lucro Líquido / Faturamento",
      status: "Margem positiva",
      icon: TrendingUp,
      tone: "mint" as const,
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 26, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: reduceMotion ? 0 : 0.8, ease: easeOut }}
      className="relative"
    >
      <div
        className="absolute -inset-5 rounded-[30px] bg-[#4ac5b4]/15 blur-3xl"
        aria-hidden="true"
      />
      <div className="relative overflow-hidden rounded-[21px] border border-white/95 bg-[#f5faf9] shadow-[0_24px_68px_rgba(13,66,59,0.18)]">
        <div className="grid sm:grid-cols-[148px_minmax(0,1fr)]">
          <DashboardSidebar />
          <div className="min-w-0 p-3 sm:p-4">
            <header className="flex items-start justify-between gap-3">
              <div>
                <DashboardGreeting
                  greeting="Bom dia"
                  companyName="Razão Social"
                />
                <p className="mt-0.5 text-[8px] text-[#829399] sm:text-[9px]">
                  Visão consolidada do seu negócio nos principais marketplaces.
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5 rounded-lg border border-[#dce8e9] bg-white px-2.5 py-2 text-[8px] font-semibold text-[#334b50] sm:px-3">
                <CalendarDays
                  className="h-3.5 w-3.5 text-[#637c81]"
                  aria-hidden="true"
                />
                <span className="hidden sm:inline">Setembro de 2026</span>
                <span className="sm:hidden">Set/26</span>
                <ChevronDown
                  className="h-3 w-3 text-[#637c81]"
                  aria-hidden="true"
                />
              </div>
            </header>

            <div className="mt-3 flex justify-end gap-1.5 text-[8px] text-[#637c81]">
              {[
                { label: "Todos", active: true },
                { label: "Mercado Livre", active: false },
                { label: "Shopee", active: false },
                { label: "Shein", active: false },
              ].map(({ label, active }) => (
                <span
                  key={label}
                  className={`rounded-full px-2.5 py-1 ${active ? "bg-accent font-semibold text-white" : "bg-white"}`}
                >
                  {label}
                </span>
              ))}
            </div>

            <motion.div
              className="mt-2 grid grid-cols-3 items-stretch gap-2"
              initial="hidden"
              animate="visible"
              variants={{
                hidden: {},
                visible: {
                  transition: { staggerChildren: reduceMotion ? 0 : 0.06 },
                },
              }}
            >
              {metrics.map((metric) => (
                <motion.div
                  key={metric.label}
                  variants={createRevealVariants(reduceMotion)}
                >
                  <MetricCard {...metric} />
                </motion.div>
              ))}
            </motion.div>

            <div className="mt-2 flex items-center justify-between rounded-[11px] border border-[#dfe9ea] bg-white px-3 py-2 text-[8px] text-[#60797e]">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full border-2 border-accent" />
                CUSTO FIXO <strong className="text-[#29454a]">R$ 1.793</strong>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full border-2 border-accent" />
                IMPOSTO <strong className="text-[#29454a]">4,00%</strong>
              </span>
              <span className="hidden items-center gap-1 rounded-full border border-[#dfe9ea] px-2 py-1 text-[#29454a] sm:flex">
                <Settings2 className="h-3 w-3" aria-hidden="true" />
                Editar
              </span>
            </div>

            <div className="mt-2 grid gap-2 md:grid-cols-[1.55fr_0.8fr]">
              <FinancialChart />
              <MarketplaceStatus />
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
    <div className="relative border-t border-white/80 bg-white/90">
      <div className="mx-auto grid max-w-[1440px] sm:grid-cols-3">
        {trustItems.map(({ label, detail, icon: Icon }) => (
          <div
            key={label}
            className="flex items-center gap-4 border-b border-[#dcebe9]/70 px-6 py-4 last:border-b-0 sm:border-b-0 sm:border-r sm:px-8 sm:py-5 sm:last:border-r-0 lg:px-12"
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
    <section
      id="inicio"
      className="relative overflow-hidden pt-4 sm:pt-5 lg:pt-7"
    >
      <HeroBackdrop />
      <div className="relative z-10 mx-auto max-w-[1440px] px-5 pb-12 sm:px-8 sm:pb-14 lg:px-10 lg:pb-14">
        <div className="grid items-start gap-9 lg:grid-cols-[minmax(0,0.93fr)_minmax(0,1.07fr)] lg:gap-7 xl:gap-10">
          <motion.div
            className="max-w-[650px] pt-2 lg:pt-3"
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
              className="text-[12px] font-bold uppercase tracking-[0.15em] text-accent sm:text-[13px]"
            >
              7 DIAS GRÁTIS PARA CONHECER A LUCREII
            </motion.p>
            <motion.h1
              variants={createRevealVariants(reduceMotion)}
              className="mt-4 max-w-[650px] text-[clamp(3rem,4.55vw,4.45rem)] font-extrabold leading-[0.93] tracking-[-0.065em] text-[#071326]"
            >
              Veja o lucro que
              <br />
              <span className="text-accent">realmente importa.</span>
            </motion.h1>
            <motion.p
              variants={createRevealVariants(reduceMotion)}
              className="mt-5 max-w-[620px] text-[17px] leading-[1.28] text-[#4b6576] sm:text-[19px]"
            >
              Descubra quanto realmente sobra das suas vendas. A Lucreii reúne
              custos, taxas, impostos, publicidade e devoluções para mostrar seu
              lucro real por produto e marketplace.
            </motion.p>

            <motion.div
              variants={createRevealVariants(reduceMotion)}
              className="mt-6 flex flex-wrap items-center gap-3"
            >
              <Link
                href="/sign-in"
                className="group inline-flex h-14 items-center justify-center gap-3 rounded-full bg-accent px-6 text-[16px] font-semibold text-white shadow-[0_12px_24px_rgba(14,122,111,0.22)] transition-all hover:bg-accent-strong hover:shadow-[0_16px_32px_rgba(14,122,111,0.3)] active:scale-[0.98] sm:px-7"
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
                className="inline-flex h-14 items-center justify-center gap-2 rounded-full border border-white/90 bg-white/90 px-6 text-[16px] font-semibold text-[#071326] shadow-[0_7px_16px_rgba(16,84,76,0.06)] transition-all hover:border-accent/30 hover:bg-white hover:shadow-md active:scale-[0.98]"
              />
            </motion.div>

            <motion.div
              variants={createRevealVariants(reduceMotion)}
              className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] text-[#4f697a] sm:text-[12px]"
            >
              {[
                "7 dias grátis",
                "Sem cartão de crédito",
                "Cancele quando quiser",
              ].map((label) => (
                <span key={label} className="inline-flex items-center gap-1.5">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent text-white">
                    <Check
                      className="h-3.5 w-3.5"
                      strokeWidth={3}
                      aria-hidden="true"
                    />
                  </span>
                  {label}
                </span>
              ))}
            </motion.div>
            <motion.div
              variants={createRevealVariants(reduceMotion)}
              className="mt-5"
            >
              <FeatureCards />
            </motion.div>
            <motion.div
              variants={createRevealVariants(reduceMotion)}
              className="mt-2.5"
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
