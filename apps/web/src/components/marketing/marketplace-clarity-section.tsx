"use client";

import Image from "next/image";
import {
  BarChart3,
  Box,
  Coins,
  Megaphone,
  ShoppingCart,
  Target,
} from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";

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

const clarityPillars = [
  {
    title: "Seus dados, seus números",
    description: "A análise é feita com os dados reais da sua própria operação.",
    icon: Coins,
  },
  {
    title: "Sem achismos",
    description:
      "Custos, taxas, impostos, devoluções e publicidade entram na análise do resultado.",
    icon: Target,
  },
  {
    title: "Feito para marketplaces",
    description:
      "Uma ferramenta pensada para quem precisa entender a rentabilidade da operação.",
    icon: ShoppingCart,
  },
] as const;

const questionCards = [
  {
    title: "Quanto realmente sobrou das minhas vendas este mês?",
    description: "Veja faturamento, margem, custos e lucro líquido da operação.",
    icon: BarChart3,
    tone: "mint" as const,
    visual: "profit" as const,
  },
  {
    title: "Quais produtos realmente estão me dando dinheiro?",
    description:
      "Compare margem e rentabilidade por produto e identifique onde você ganha ou perde dinheiro.",
    icon: Box,
    tone: "blue" as const,
    visual: "products" as const,
  },
  {
    title: "Minha publicidade está gerando lucro ou consumindo minha margem?",
    description:
      "Acompanhe o investimento em ADS e entenda o impacto dele no resultado da sua operação.",
    icon: Megaphone,
    tone: "cream" as const,
    visual: "ads" as const,
  },
] as const;

function ClarityBackdrop() {
  const reduceMotion = useReducedMotion();

  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden="true"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.98),transparent_44%),linear-gradient(145deg,#f2fbfa_0%,#e2f6f2_54%,#f3fbfa_100%)] dark:bg-[linear-gradient(145deg,#102522_0%,#0f211f_55%,#11201f_100%)]" />
      <motion.div
        className="absolute -left-40 top-28 h-[430px] w-[430px] rounded-[42%] bg-[#b8ebe4]/55 blur-3xl"
        animate={
          reduceMotion === false
            ? { y: [0, -12, 0], rotate: [-10, -7, -10] }
            : undefined
        }
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -right-44 top-0 h-[500px] w-[500px] rounded-[46%] bg-white/70 blur-3xl dark:bg-accent/10"
        animate={
          reduceMotion === false
            ? { y: [0, 14, 0], rotate: [8, 4, 8] }
            : undefined
        }
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      />
      <svg
        className="absolute inset-0 h-full w-full opacity-55 dark:opacity-20"
        viewBox="0 0 1600 1240"
        fill="none"
        preserveAspectRatio="none"
      >
        <path
          d="M-30 108C184 150 124 312 56 474s-12 292 154 422"
          stroke="#91d9d0"
          strokeWidth="1.5"
          strokeDasharray="5 12"
        />
        <path
          d="M1632 38c-172 116-112 298-34 430s12 320-144 494"
          stroke="#91d9d0"
          strokeWidth="1.5"
          strokeDasharray="5 12"
        />
        <path
          d="M78 512 214 896M1518 466l-122 496"
          stroke="#91d9d0"
          strokeWidth="1"
          strokeDasharray="3 10"
        />
        <circle cx="78" cy="512" r="5" fill="#83bdb6" />
        <circle cx="214" cy="896" r="4" fill="#83bdb6" />
        <circle cx="1518" cy="466" r="5" fill="#83bdb6" />
        <circle cx="1396" cy="962" r="4" fill="#83bdb6" />
      </svg>
    </div>
  );
}

function PillarCard({
  title,
  description,
  icon: Icon,
  index,
}: (typeof clarityPillars)[number] & { index: number }) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.article
      initial={getRevealInitial(reduceMotion)}
      whileInView="visible"
      viewport={{ once: true, margin: "-70px" }}
      variants={createRevealVariants(reduceMotion, index * 0.08)}
      whileHover={
        reduceMotion
          ? undefined
          : {
              y: -5,
              transition: { type: "spring", stiffness: 220, damping: 22 },
            }
      }
      className="group relative flex min-h-[242px] flex-col overflow-hidden rounded-[20px] border border-white/90 bg-white/85 p-7 shadow-[0_14px_36px_rgba(18,83,76,0.08)] backdrop-blur-sm transition-shadow duration-300 hover:shadow-[0_20px_44px_rgba(18,83,76,0.14)] dark:border-white/10 dark:bg-surface/85 sm:p-8"
    >
      <motion.span
        className="flex h-[88px] w-[88px] items-center justify-center rounded-full bg-[#def5f1] text-accent dark:bg-accent/10"
        animate={
          reduceMotion === false
            ? { y: [0, -2, 0], rotate: [0, 1, 0] }
            : undefined
        }
        transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut", delay: index * 0.14 }}
      >
        <Icon className="h-11 w-11" strokeWidth={1.8} aria-hidden="true" />
      </motion.span>
      <h3 className="mt-5 text-[21px] font-bold leading-[1.12] tracking-[-0.04em] text-foreground">
        {title}
      </h3>
      <p className="mt-3 max-w-[340px] text-[16px] leading-[1.45] text-foreground-soft">
        {description}
      </p>
      <span
        className="absolute bottom-0 left-7 right-7 h-0.5 origin-left scale-x-0 rounded-full bg-accent transition-transform duration-300 group-hover:scale-x-100"
        aria-hidden="true"
      />
    </motion.article>
  );
}

function MiniProfitVisual({ reduceMotion }: { reduceMotion: boolean | null }) {
  const bars = [42, 66, 75, 92];

  return (
    <div className="mt-auto rounded-2xl border border-white/90 bg-white/80 p-4 shadow-[0_8px_20px_rgba(18,83,76,0.05)] dark:border-white/10 dark:bg-surface/70">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-foreground-soft">Lucro Líquido</p>
          <p className="mt-1 text-xl font-bold tracking-[-0.04em] text-foreground">R$ 18.760</p>
          <p className="mt-1 text-xs font-semibold text-accent">↑ 18,6% vs. mês anterior</p>
        </div>
        <div className="flex h-16 items-end gap-2" aria-hidden="true">
          {bars.map((height, index) => (
            <motion.span
              key={height}
              initial={reduceMotion ? false : { scaleY: 0.2 }}
              whileInView={{ scaleY: 1 }}
              viewport={{ once: true }}
              transition={{
                duration: reduceMotion ? 0 : 0.6,
                delay: reduceMotion ? 0 : index * 0.08,
                ease: easeOut,
              }}
              className={`w-3 origin-bottom rounded-t-md ${
                index === bars.length - 1 ? "bg-[#0e8f80]" : "bg-[#40cbbd]"
              }`}
              style={{ height: `${height}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function MiniProductsVisual({ reduceMotion }: { reduceMotion: boolean | null }) {
  const products = [
    {
      name: "Fone Bluetooth",
      status: "Lucro",
      image: "/marketing/products/bluetooth-headphones.png",
      statusClass: "bg-[#dff6f0] text-[#168576]",
    },
    {
      name: "Mouse Gamer",
      status: "Lucro",
      image: "/marketing/products/gaming-mouse.png",
      statusClass: "bg-[#dff6f0] text-[#168576]",
    },
    {
      name: "Smartwatch",
      status: "Atenção",
      image: "/marketing/products/smartwatch.png",
      statusClass: "bg-[#ffe2e6] text-[#cf4554]",
    },
  ] as const;

  return (
    <div className="mt-auto space-y-2 rounded-2xl border border-white/90 bg-white/80 p-4 shadow-[0_8px_20px_rgba(31,91,136,0.05)] dark:border-white/10 dark:bg-surface/70">
      {products.map(({ name, status, image, statusClass }, index) => (
        <motion.div
          key={name}
          initial={reduceMotion ? false : { opacity: 0, x: -8 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{
            duration: reduceMotion ? 0 : 0.36,
            delay: reduceMotion ? 0 : index * 0.08,
            ease: easeOut,
          }}
          className="flex items-center justify-between gap-3 border-b border-border/60 py-1.5 last:border-0 last:pb-0 first:pt-0"
        >
          <span className="flex min-w-0 items-center gap-2 text-sm font-medium text-foreground">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center" aria-hidden="true">
              <Image
                src={image}
                alt=""
                width={32}
                height={32}
                sizes="32px"
                className="h-7 w-7 object-contain"
              />
            </span>
            <span className="truncate">{name}</span>
          </span>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass}`}>
            {status}
          </span>
        </motion.div>
      ))}
    </div>
  );
}

function MiniAdsVisual({ reduceMotion }: { reduceMotion: boolean | null }) {
  const bars = [30, 44, 57, 72, 91];
  const labels = ["Mai", "Jun", "Jul", "Ago", "Set"];

  return (
    <div className="mt-auto rounded-2xl border border-white/90 bg-white/80 p-4 shadow-[0_8px_20px_rgba(150,100,20,0.05)] dark:border-white/10 dark:bg-surface/70 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-foreground-soft">Resultado dos anúncios</p>
          <div className="mt-1 flex items-baseline gap-2">
            <p className="text-xl font-bold tracking-[-0.04em] text-foreground">3,4x</p>
            <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#d98b12]">ROAS</span>
          </div>
          <p className="mt-1 text-xs font-semibold text-[#d98b12]">↑ 12,8% vs. período anterior</p>
        </div>
        <span className="pt-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-foreground-soft">ADS</span>
      </div>

      <div className="mt-4 flex items-end gap-4">
        <div className="relative h-[82px] min-w-0 flex-1 overflow-hidden rounded-xl bg-[#fffaf0] px-3 pb-3 pt-2" aria-label="Gráfico demonstrativo do retorno dos anúncios">
          <div className="pointer-events-none absolute inset-x-3 top-2 bottom-3 flex flex-col justify-between" aria-hidden="true">
            <span className="border-t border-[#f3d9a8]" />
            <span className="border-t border-[#f3d9a8]" />
            <span className="border-t border-[#f3d9a8]" />
          </div>
          <div className="relative flex h-full items-end gap-1.5" aria-hidden="true">
            {bars.map((height, index) => (
              <motion.span
                key={height}
                initial={reduceMotion ? false : { scaleY: 0.2, opacity: 0.65 }}
                whileInView={{ scaleY: 1, opacity: 1 }}
                viewport={{ once: true }}
                transition={{
                  duration: reduceMotion ? 0 : 0.58,
                  delay: reduceMotion ? 0 : index * 0.08,
                  ease: easeOut,
                }}
                className={`relative z-[1] min-w-0 flex-1 origin-bottom rounded-t-md ${
                  index === bars.length - 1 ? "bg-[#e58d11]" : "bg-[#f5b754]"
                }`}
                style={{ height: `${height}%` }}
              />
            ))}
          </div>
        </div>
      <motion.span
        className="relative flex h-[76px] w-[76px] shrink-0 items-center justify-center rounded-full bg-[#ffe1a7] text-[#e58d11]"
        animate={
          reduceMotion === false
            ? { scale: [1, 1.035, 1], rotate: [0, 2, 0] }
            : undefined
        }
        transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
      >
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 76 76" fill="none" aria-hidden="true">
          <path d="M52 24c4 2 6 5 7 9M53 43c3-1 5-3 7-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="59" cy="19" r="1.6" fill="currentColor" />
          <circle cx="64" cy="46" r="1.6" fill="currentColor" />
        </svg>
        <Megaphone className="h-9 w-9" strokeWidth={1.8} aria-hidden="true" />
      </motion.span>
      </div>
      <div className="mt-2 flex justify-between px-1 text-[9px] text-muted-foreground">
        {labels.map((label) => <span key={label}>{label}</span>)}
      </div>
    </div>
  );
}

function QuestionVisual({
  visual,
  reduceMotion,
}: {
  visual: (typeof questionCards)[number]["visual"];
  reduceMotion: boolean | null;
}) {
  if (visual === "profit") return <MiniProfitVisual reduceMotion={reduceMotion} />;
  if (visual === "products") return <MiniProductsVisual reduceMotion={reduceMotion} />;
  return <MiniAdsVisual reduceMotion={reduceMotion} />;
}

function QuestionCard({
  title,
  description,
  icon: Icon,
  tone,
  visual,
  index,
}: (typeof questionCards)[number] & { index: number }) {
  const reduceMotion = useReducedMotion();
  const toneClass = {
    mint: "bg-[#effbf8] dark:bg-[#15302b]/80",
    blue: "bg-[#f0f8ff] dark:bg-[#152936]/80",
    cream: "bg-[#fffaf0] dark:bg-[#30291b]/80",
  }[tone];

  return (
    <motion.article
      initial={getRevealInitial(reduceMotion)}
      whileInView="visible"
      viewport={{ once: true, margin: "-70px" }}
      variants={createRevealVariants(reduceMotion, index * 0.08)}
      whileHover={
        reduceMotion
          ? undefined
          : {
              y: -5,
              transition: { type: "spring", stiffness: 220, damping: 22 },
            }
      }
      className={`group flex min-h-[388px] flex-col overflow-hidden rounded-[20px] border border-white/90 p-6 shadow-[0_14px_36px_rgba(18,83,76,0.07)] transition-shadow duration-300 hover:shadow-[0_20px_44px_rgba(18,83,76,0.13)] dark:border-white/10 sm:p-7 ${toneClass}`}
    >
      <motion.span
        className={`flex h-[76px] w-[76px] items-center justify-center rounded-full ${
          tone === "cream" ? "bg-[#fff0d3] text-[#e58d11]" : "bg-[#dff5f1] text-accent"
        }`}
        animate={
          reduceMotion === false
            ? { y: [0, -2, 0], rotate: [0, 1, 0] }
            : undefined
        }
        transition={{ duration: 5.2, repeat: Infinity, ease: "easeInOut", delay: index * 0.15 }}
      >
        <Icon className="h-10 w-10" strokeWidth={1.8} aria-hidden="true" />
      </motion.span>
      <h3 className="mt-5 max-w-[350px] text-[19px] font-bold leading-[1.18] tracking-[-0.04em] text-foreground">
        “{title}”
      </h3>
      <p className="mt-4 text-[16px] leading-[1.45] text-foreground-soft">{description}</p>
      <QuestionVisual visual={visual} reduceMotion={reduceMotion} />
    </motion.article>
  );
}

export function MarketplaceClaritySection() {
  const reduceMotion = useReducedMotion();

  return (
    <section
      id="como-funciona"
      className="relative scroll-mt-28 overflow-hidden py-16 sm:py-20 md:py-24"
    >
      <ClarityBackdrop />
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
            Feito para quem vende em marketplaces
          </motion.span>
          <motion.h2
            variants={createRevealVariants(reduceMotion)}
            className="mt-5 text-[clamp(2.35rem,5vw,4.2rem)] font-extrabold leading-[0.98] tracking-[-0.065em] text-foreground"
          >
            Criado para responder a pergunta
            <br />
            que todo vendedor deveria fazer:
            <br />
            <span className="text-accent">estou realmente lucrando?</span>
          </motion.h2>
          <motion.p
            variants={createRevealVariants(reduceMotion)}
            className="mx-auto mt-5 max-w-5xl text-lg leading-[1.4] text-foreground-soft sm:text-[1.35rem]"
          >
            A Lucreii organiza os números da sua operação para transformar vendas, custos e despesas em informações que ajudam você a tomar decisões melhores.
          </motion.p>
        </motion.header>

        <div className="mt-9 grid gap-4 lg:mt-11 lg:grid-cols-3">
          {clarityPillars.map((card, index) => (
            <PillarCard key={card.title} {...card} index={index} />
          ))}
        </div>

        <motion.div
          initial={getRevealInitial(reduceMotion)}
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          variants={createRevealVariants(reduceMotion)}
          className="mt-12 text-center sm:mt-14"
        >
          <div className="flex items-center justify-center gap-4 sm:gap-8">
            <span className="h-px w-14 bg-accent sm:w-16" />
            <h3 className="text-[clamp(1.35rem,2.5vw,2rem)] font-bold leading-tight tracking-[-0.045em] text-foreground">
              A Lucreii responde as perguntas que realmente importam
            </h3>
            <span className="h-px w-14 bg-accent sm:w-16" />
          </div>
          <p className="mt-2 text-base text-foreground-soft sm:text-lg">
            Tenha clareza para tomar decisões mais seguras e aumentar a lucratividade do seu negócio.
          </p>
        </motion.div>

        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          {questionCards.map((card, index) => (
            <QuestionCard key={card.title} {...card} index={index} />
          ))}
        </div>

        <motion.div
          initial={getRevealInitial(reduceMotion)}
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          variants={createRevealVariants(reduceMotion)}
          className="mt-7 grid items-center gap-6 rounded-[22px] border border-[#c6e7e2] bg-[#e6f7f3]/90 px-6 py-6 shadow-[0_12px_28px_rgba(18,83,76,0.06)] dark:border-white/10 dark:bg-[#15302b]/80 sm:grid-cols-[auto_1px_minmax(0,1.35fr)_1px_minmax(0,1fr)] sm:px-8 sm:py-7"
        >
          <BarChart3 className="h-14 w-14 text-accent" strokeWidth={1.7} aria-hidden="true" />
          <span className="hidden h-16 w-px bg-accent/65 sm:block" aria-hidden="true" />
          <p className="text-center text-xl font-bold leading-[1.1] tracking-[-0.04em] text-foreground sm:text-left sm:text-[1.45rem]">
            Você não precisa confiar em números de outras empresas.
            <br />
            <span className="text-accent">Veja os seus.</span>
          </p>
          <span className="hidden h-16 w-px bg-accent/65 sm:block" aria-hidden="true" />
          <p className="text-center text-sm leading-[1.45] text-foreground-soft sm:text-left sm:text-base">
            Conecte seus dados, descubra o que realmente importa e leve seu negócio para o próximo nível.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
