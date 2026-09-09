"use client";

import {
  BarChart3,
  Box,
  ClipboardList,
  Coins,
  Megaphone,
  RotateCcw,
  Store,
  Target,
} from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import {
  MercadoLivreMiniIcon,
  SheinMiniIcon,
  ShopeeMiniIcon,
  TiktokMiniIcon,
} from "./marketplace-icons";

const easeOut = [0.16, 1, 0.3, 1] as const;

function createRevealVariants(reduceMotion: boolean | null, delay = 0) {
  return {
    hidden: { opacity: 0, y: 18 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: reduceMotion ? 0 : 0.62,
        delay: reduceMotion ? 0 : delay,
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

const resourceCards = [
  {
    title: "Lucro real do negócio",
    description:
      "Saiba quanto realmente sobra depois de custos, taxas, impostos, devoluções, publicidade e demais despesas.",
    icon: BarChart3,
    marketplaces: false,
  },
  {
    title: "Rentabilidade por produto",
    description:
      "Descubra quais produtos dão lucro, quais têm as melhores margens e quais precisam de atenção.",
    icon: Box,
    marketplaces: false,
  },
  {
    title: "Ponto de equilíbrio",
    description:
      "Saiba quanto sua operação precisa faturar para cobrir os custos e começar a gerar lucro.",
    icon: Target,
    marketplaces: false,
  },
  {
    title: "Publicidade e ROAS",
    description:
      "Veja quanto seus anúncios estão consumindo da margem e acompanhe ROAS real e ROAS de equilíbrio.",
    icon: Megaphone,
    marketplaces: false,
  },
  {
    title: "Gestão por marketplace",
    description:
      "Compare faturamento, devoluções, margem e resultado dos seus canais em um só lugar.",
    icon: Store,
    marketplaces: true,
  },
  {
    title: "Custos e despesas",
    description:
      "Organize custos fixos e variáveis e entenda como cada despesa impacta o resultado da operação.",
    icon: Coins,
    marketplaces: false,
  },
  {
    title: "Devoluções",
    description:
      "Acompanhe as devoluções e veja o impacto delas no faturamento, nas vendas e na rentabilidade.",
    icon: RotateCcw,
    marketplaces: false,
  },
  {
    title: "Indicadores para decisões",
    description:
      "Acompanhe os principais indicadores da operação e identifique rapidamente onde seu negócio ganha ou perde dinheiro.",
    icon: ClipboardList,
    marketplaces: false,
  },
] as const;

function ResourcesBackdrop() {
  const reduceMotion = useReducedMotion();

  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden="true"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_5%,rgba(255,255,255,0.95),transparent_42%),linear-gradient(145deg,#f1fbfa_0%,#e1f5f1_54%,#f4fbfa_100%)] dark:bg-[linear-gradient(145deg,#102522_0%,#0e211f_54%,#11201f_100%)]" />
      <motion.div
        className="absolute -left-44 top-28 h-[430px] w-[430px] rounded-[34%] bg-[#b6e9e2]/55 blur-2xl"
        animate={
          reduceMotion === false
            ? { y: [0, -10, 0], rotate: [-9, -6, -9] }
            : undefined
        }
        transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -right-44 bottom-10 h-[460px] w-[460px] rounded-[32%] bg-white/70 blur-2xl dark:bg-accent/10"
        animate={
          reduceMotion === false
            ? { y: [0, 12, 0], rotate: [8, 5, 8] }
            : undefined
        }
        transition={{ duration: 13, repeat: Infinity, ease: "easeInOut" }}
      />
      <svg
        className="absolute inset-0 h-full w-full opacity-60 dark:opacity-20"
        viewBox="0 0 1600 1120"
        fill="none"
        preserveAspectRatio="none"
      >
        <motion.path
          d="M-25 145C140 202 126 370 40 494S42 770 218 872"
          stroke="#8ed8ce"
          strokeWidth="1.5"
          strokeDasharray="4 12"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: reduceMotion ? 0 : 1.8, ease: easeOut }}
        />
        <motion.path
          d="M1625 82C1485 194 1518 336 1586 452S1518 742 1382 896"
          stroke="#8ed8ce"
          strokeWidth="1.5"
          strokeDasharray="4 12"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{
            duration: reduceMotion ? 0 : 1.8,
            delay: reduceMotion ? 0 : 0.2,
            ease: easeOut,
          }}
        />
        <path
          d="M54 546L218 872M1510 544L1382 896"
          stroke="#8ed8ce"
          strokeDasharray="3 9"
          strokeWidth="1"
        />
        <circle cx="54" cy="546" r="5" fill="#83bbb4" />
        <circle cx="218" cy="872" r="4" fill="#83bbb4" />
        <circle cx="1510" cy="544" r="5" fill="#83bbb4" />
        <circle cx="1382" cy="896" r="4" fill="#83bbb4" />
      </svg>
    </div>
  );
}

function MarketplaceMarks() {
  const marks = [
    { name: "Mercado Livre", Icon: MercadoLivreMiniIcon },
    { name: "Shopee", Icon: ShopeeMiniIcon },
    { name: "TikTok Shop", Icon: TiktokMiniIcon },
    { name: "Shein", Icon: SheinMiniIcon },
  ] as const;

  return (
    <div className="mt-auto grid grid-cols-4 gap-1.5 pt-7">
      {marks.map(({ name, Icon }) => (
        <div key={name} className="flex min-w-0 flex-col items-center gap-1 text-center">
          <span className="flex h-7 items-center justify-center">
            <Icon className="h-6 w-auto max-w-10 object-contain" />
          </span>
          <span className="w-full truncate text-[9px] font-medium text-foreground-soft">
            {name}
          </span>
          {(name === "TikTok Shop" || name === "Shein") && (
            <span className="text-[8px] text-muted-foreground">Em breve</span>
          )}
        </div>
      ))}
    </div>
  );
}

function ResourceCard({
  title,
  description,
  icon: Icon,
  marketplaces,
  index,
}: (typeof resourceCards)[number] & { index: number }) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.article
      initial={getRevealInitial(reduceMotion)}
      whileInView="visible"
      viewport={{ once: true, margin: "-70px" }}
      variants={createRevealVariants(reduceMotion, index * 0.06)}
      whileHover={
        reduceMotion
          ? undefined
          : { y: -4, transition: { type: "spring", stiffness: 220, damping: 22 } }
      }
      className="group relative flex min-h-[338px] flex-col overflow-hidden rounded-[20px] border border-white/90 bg-white/85 p-6 shadow-[0_14px_36px_rgba(18,83,76,0.08)] backdrop-blur-sm transition-shadow duration-300 hover:shadow-[0_20px_44px_rgba(18,83,76,0.14)] dark:border-white/10 dark:bg-surface/85 sm:p-7"
    >
      <motion.span
        className="flex h-[88px] w-[88px] items-center justify-center rounded-full bg-[#e0f5f1] text-accent dark:bg-accent/10"
        animate={
          reduceMotion === false
            ? { y: [0, -2, 0], rotate: [0, 1, 0] }
            : undefined
        }
        transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut", delay: index * 0.12 }}
      >
        <Icon className="h-11 w-11" strokeWidth={1.8} aria-hidden="true" />
      </motion.span>
      <h3 className="mt-5 max-w-[260px] text-[21px] font-bold leading-[1.12] tracking-[-0.04em] text-foreground">
        {title}
      </h3>
      <p className="mt-3 text-[15px] leading-[1.48] text-foreground-soft">
        {description}
      </p>
      {marketplaces && <MarketplaceMarks />}
      <span
        className="absolute bottom-0 left-6 right-6 h-0.5 origin-left scale-x-0 rounded-full bg-accent transition-transform duration-300 group-hover:scale-x-100"
        aria-hidden="true"
      />
    </motion.article>
  );
}

export function ResourcesSection() {
  const reduceMotion = useReducedMotion();

  return (
    <section
      id="recursos"
      className="relative scroll-mt-28 overflow-hidden py-16 sm:py-20 md:py-24"
    >
      <ResourcesBackdrop />
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
            className="inline-flex items-center rounded-full border border-[#69bdb1] bg-white/35 px-5 py-2 text-sm font-semibold uppercase tracking-[0.08em] text-[#176c65] dark:border-accent/60 dark:bg-accent/10 dark:text-accent"
          >
            Recursos
          </motion.span>
          <motion.h2
            variants={createRevealVariants(reduceMotion)}
            className="mt-5 text-[clamp(2.6rem,5.2vw,4.5rem)] font-extrabold leading-[0.98] tracking-[-0.065em] text-foreground"
          >
            Tudo o que você precisa
            <br />
            <span className="text-accent">para vender com lucro.</span>
          </motion.h2>
          <motion.p
            variants={createRevealVariants(reduceMotion)}
            className="mx-auto mt-5 max-w-5xl text-lg leading-[1.35] text-foreground-soft sm:text-[1.35rem]"
          >
            Da visão geral ao resultado de cada produto, a Lucreii reúne os números que você precisa para tomar decisões mais lucrativas.
          </motion.p>
        </motion.header>

        <div className="mt-9 grid gap-4 md:grid-cols-2 lg:mt-11 lg:grid-cols-4 lg:gap-4">
          {resourceCards.map((card, index) => (
            <ResourceCard key={card.title} {...card} index={index} />
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
            <span className="h-px w-16 bg-accent sm:w-24" />
            <h3 className="text-[clamp(1.75rem,3.4vw,3rem)] font-bold leading-none tracking-[-0.05em] text-foreground">
              Menos achismo.
              <br />
              <span className="text-accent">Mais controle sobre o seu lucro.</span>
            </h3>
            <span className="h-px w-16 bg-accent sm:w-24" />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
