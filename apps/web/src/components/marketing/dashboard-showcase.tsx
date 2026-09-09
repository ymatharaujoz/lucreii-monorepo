"use client";

import { BarChart3, PieChart, Target, TrendingUp } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { DashboardPreview } from "./hero-section";

const easeOut = [0.16, 1, 0.3, 1] as const;

type CalloutProps = {
  title: string;
  description: string;
  icon: typeof BarChart3;
  className?: string;
  delay?: number;
};

function DashboardCallout({
  title,
  description,
  icon: Icon,
  className,
  delay = 0,
}: CalloutProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{
        duration: reduceMotion ? 0 : 0.65,
        delay: reduceMotion ? 0 : delay,
        ease: easeOut,
      }}
      className={`rounded-[15px] border border-[#bfe7e2] bg-white/90 p-5 shadow-[0_16px_40px_rgba(13,107,99,0.08)] backdrop-blur-sm ${className ?? ""}`}
    >
      <div className="flex items-start gap-4">
        <Icon
          className="mt-0.5 h-9 w-9 shrink-0 text-accent"
          strokeWidth={1.8}
          aria-hidden="true"
        />
        <div>
          <h3 className="text-[17px] font-bold leading-[1.08] tracking-[-0.03em] text-[#0b2330]">
            {title}
          </h3>
          <p className="mt-4 text-[14px] leading-[1.35] text-[#5b6f7f]">
            {description}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

const dashboardCallouts = [
  {
    title: "Acompanhe o desempenho do seu negócio",
    description:
      "Veja faturamento, devoluções e margens em tempo real de forma clara e organizada.",
    icon: BarChart3,
  },
  {
    title: "Compare receita e lucro ao longo do mês",
    description:
      "Acompanhe a evolução financeira e identifique tendências do seu negócio.",
    icon: TrendingUp,
  },
  {
    title: "Saiba quanto precisa faturar para não ter prejuízo",
    description:
      "O ponto de equilíbrio mostra o valor mínimo que você precisa vender para cobrir seus custos.",
    icon: Target,
  },
  {
    title: "Veja quanto realmente sobra no seu bolso",
    description:
      "Tenha uma visão clara do seu lucro líquido e da sua margem de lucro.",
    icon: PieChart,
  },
] as const;

function DesktopConnectors() {
  const reduceMotion = useReducedMotion();

  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute -inset-x-2 -top-44 z-20 hidden h-[700px] w-[calc(100%+1rem)] 2xl:block"
      viewBox="0 0 1536 700"
      fill="none"
      preserveAspectRatio="none"
    >
      <motion.path
        d="M142 177 C142 244 168 257 226 286"
        stroke="#079f94"
        strokeWidth="2"
        strokeLinecap="round"
        initial={{ pathLength: reduceMotion ? 1 : 0, opacity: 0 }}
        whileInView={{ pathLength: 1, opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: reduceMotion ? 0 : 1, ease: easeOut }}
      />
      <motion.path
        d="M313 590 C354 574 368 563 401 536"
        stroke="#079f94"
        strokeWidth="2"
        strokeLinecap="round"
        initial={{ pathLength: reduceMotion ? 1 : 0, opacity: 0 }}
        whileInView={{ pathLength: 1, opacity: 1 }}
        viewport={{ once: true }}
        transition={{
          duration: reduceMotion ? 0 : 1,
          delay: 0.1,
          ease: easeOut,
        }}
      />
      <motion.path
        d="M1221 90 C1160 96 1113 156 1003 236"
        stroke="#079f94"
        strokeWidth="2"
        strokeLinecap="round"
        initial={{ pathLength: reduceMotion ? 1 : 0, opacity: 0 }}
        whileInView={{ pathLength: 1, opacity: 1 }}
        viewport={{ once: true }}
        transition={{
          duration: reduceMotion ? 0 : 1,
          delay: 0.2,
          ease: easeOut,
        }}
      />
      <motion.path
        d="M1350 478 C1323 448 1301 439 1289 425"
        stroke="#079f94"
        strokeWidth="2"
        strokeLinecap="round"
        initial={{ pathLength: reduceMotion ? 1 : 0, opacity: 0 }}
        whileInView={{ pathLength: 1, opacity: 1 }}
        viewport={{ once: true }}
        transition={{
          duration: reduceMotion ? 0 : 1,
          delay: 0.3,
          ease: easeOut,
        }}
      />
      <path
        d="M226 286 l-14 -5 M226 286 l-8 -13 M401 536 l-13 2 M401 536 l-3 -13 M1003 236 l7 -13 M1003 236 l15 -3 M1289 425 l-13 4 M1289 425 l-2 14"
        stroke="#079f94"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function DashboardShowcase() {
  const reduceMotion = useReducedMotion();

  return (
    <section
      id="dashboard"
      aria-labelledby="dashboard-title"
      className="relative overflow-hidden bg-[#effbfa] py-16 sm:py-20 lg:py-24"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,rgba(255,255,255,0.92),transparent_34%),linear-gradient(135deg,#f4fcfb_0%,#e3f8f5_52%,#f0fcfb_100%)]"
      />
      <div
        aria-hidden="true"
        className="absolute -left-32 top-24 h-[360px] w-[360px] rounded-full bg-[#b5eee6]/35 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="absolute -right-40 top-6 h-[430px] w-[430px] rounded-full bg-white/65 blur-3xl"
      />
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full opacity-30"
        viewBox="0 0 1600 950"
        fill="none"
        preserveAspectRatio="none"
      >
        <path
          d="M0 110 C140 173 101 287 42 349 S4 535 130 590"
          stroke="#80d8ce"
          strokeWidth="1.2"
        />
        <path
          d="M1600 60 C1454 122 1506 258 1373 357"
          stroke="#80d8ce"
          strokeWidth="1.2"
        />
        <path
          d="M0 730 C150 653 181 774 301 829 M1600 753 C1482 700 1452 792 1332 850"
          stroke="#80d8ce"
          strokeWidth="1.2"
        />
      </svg>

      <div className="relative z-10 mx-auto max-w-[1536px] px-5 sm:px-8 lg:px-10">
        <motion.header
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: reduceMotion ? 0 : 0.7, ease: easeOut }}
          className="mx-auto max-w-[820px] text-center"
        >
          <span className="inline-flex rounded-full bg-[#d4f1ed] px-6 py-2 text-[12px] font-bold uppercase tracking-[0.04em] text-[#087f78]">
            Dashboard
          </span>
          <h2
            id="dashboard-title"
            className="mt-5 text-[clamp(2.7rem,5.1vw,4.35rem)] font-extrabold leading-[0.98] tracking-[-0.07em] text-[#071326]"
          >
            Seus números. Seu lucro.
            <br />
            <span className="text-accent">Tudo em uma única visão.</span>
          </h2>
          <p className="mx-auto mt-5 max-w-[760px] text-[18px] leading-[1.35] text-[#5d7181] sm:text-[21px]">
            Visualize faturamento, devoluções, margens, ponto de equilíbrio e
            lucro
            <br className="hidden sm:block" /> em um painel simples e objetivo.
          </p>
        </motion.header>

        <div className="relative mx-auto mt-12 max-w-[1536px]">
          <DesktopConnectors />

          <div className="absolute -top-36 left-[1.5%] z-30 hidden w-[306px] 2xl:block">
            <DashboardCallout {...dashboardCallouts[0]} />
          </div>
          <div className="absolute left-[0.8%] top-[338px] z-30 hidden w-[270px] 2xl:block">
            <DashboardCallout {...dashboardCallouts[1]} delay={0.1} />
          </div>
          <div className="absolute -top-44 right-[1.5%] z-30 hidden w-[320px] 2xl:block">
            <DashboardCallout {...dashboardCallouts[2]} delay={0.2} />
          </div>
          <div className="absolute right-0 top-[290px] z-30 hidden w-[205px] 2xl:block">
            <DashboardCallout {...dashboardCallouts[3]} delay={0.3} />
          </div>

          <motion.div
            initial={{ opacity: 0, y: 28, scale: 0.985 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ duration: reduceMotion ? 0 : 0.8, ease: easeOut }}
            className="relative z-10 mx-auto max-w-[1120px]"
          >
            <DashboardPreview wide />
          </motion.div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 2xl:hidden">
            {dashboardCallouts.map((callout, index) => (
              <DashboardCallout
                key={callout.title}
                {...callout}
                delay={index * 0.08}
              />
            ))}
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{
            duration: reduceMotion ? 0 : 0.6,
            delay: 0.15,
            ease: easeOut,
          }}
          className="mt-9 flex items-center justify-center gap-6 text-center"
        >
          <span
            className="hidden h-px w-16 bg-accent sm:block"
            aria-hidden="true"
          />
          <p className="text-[19px] font-bold tracking-[-0.035em] text-accent sm:text-[22px]">
            Menos planilhas. Mais clareza para tomar decisões.
          </p>
          <span
            className="hidden h-px w-16 bg-accent sm:block"
            aria-hidden="true"
          />
        </motion.div>
      </div>
    </section>
  );
}
