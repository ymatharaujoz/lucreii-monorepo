"use client";

import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { useEffect } from "react";
import { scrollToLandingSection } from "@/components/marketing/scroll-to-landing-section";
import { DashboardShowcase } from "./dashboard-showcase";
import { IntegrationsSection } from "./integrations-section";
import { MarketingPricingSection } from "./marketing-pricing-section";
import { ScheduleDemoLink } from "./schedule-demo-link";
import { MarketingHero } from "./hero-section";
import { ResourcesSection } from "./resources-section";
import { MarketplaceClaritySection } from "./marketplace-clarity-section";

const easeOut = [0.16, 1, 0.3, 1] as const;

export function LandingPage() {
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const hash = window.location.hash.replace(/^#/, "");
    if (!hash) return;
    const run = () => scrollToLandingSection(hash);
    window.requestAnimationFrame(run);
  }, []);

  return (
    <main className="relative">
      <MarketingHero />

      {/* Dashboard Showcase Section */}
      <DashboardShowcase />

      <ResourcesSection />

      {/* Integrations Section */}
      <IntegrationsSection />

      <MarketplaceClaritySection />

      <MarketingPricingSection />

      <section id="demo" className="relative overflow-hidden border-t border-white/70 py-16 sm:py-20 md:py-24 dark:border-white/10">
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.98),transparent_48%),linear-gradient(145deg,#f1fbfa_0%,#e4f6f3_54%,#f3fbfa_100%)] dark:bg-[linear-gradient(145deg,#102522_0%,#0e211f_55%,#11201f_100%)]"
        />
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute -left-36 top-4 h-[360px] w-[360px] rounded-full bg-accent/10 blur-3xl"
          animate={
            reduceMotion === false
              ? { y: [0, -10, 0], x: [0, 8, 0] }
              : undefined
          }
          transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }}
        />
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full opacity-45 dark:opacity-20"
          viewBox="0 0 1600 580"
          fill="none"
          preserveAspectRatio="none"
        >
          <path d="M-30 80C146 142 92 302 238 344" stroke="#8bd5cc" strokeWidth="1.2" />
          <path d="M1630 56C1462 122 1512 260 1374 350" stroke="#8bd5cc" strokeWidth="1.2" />
          <path d="M44 82 238 344M1552 68l-178 282" stroke="#8bd5cc" strokeWidth="1" strokeDasharray="4 10" />
          <circle cx="44" cy="82" r="4" fill="#83bdb6" />
          <circle cx="238" cy="344" r="4" fill="#83bdb6" />
          <circle cx="1552" cy="68" r="4" fill="#83bdb6" />
          <circle cx="1374" cy="350" r="4" fill="#83bdb6" />
        </svg>

        <div className="relative z-10 mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: reduceMotion ? 0 : 0.6, ease: easeOut }}
          >
            <h2 className="text-[clamp(2.5rem,5vw,4.35rem)] font-extrabold leading-[0.98] tracking-[-0.065em] text-foreground">
              Pronto para ver o lucro real
              <br />
              <span className="text-accent">do seu negócio?</span>
            </h2>
            <p className="mx-auto mt-5 max-w-4xl text-lg leading-[1.4] text-foreground-soft sm:text-[1.3rem]">
              Conecte seus marketplaces e descubra, com os números da sua própria operação, quanto realmente sobra das suas vendas.
            </p>

            <div className="mt-7 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link
                href="/sign-in"
                className="group inline-flex h-14 items-center justify-center gap-3 rounded-full bg-accent px-7 text-base font-bold text-white shadow-[0_12px_26px_rgba(14,122,111,0.22)] transition-all hover:bg-accent-strong hover:shadow-[0_16px_32px_rgba(14,122,111,0.3)] active:scale-[0.98]"
              >
                Testar grátis por 7 dias
                <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" strokeWidth={2.2} aria-hidden="true" />
              </Link>
              <ScheduleDemoLink
                allowDemoFallback
                className="inline-flex h-14 items-center justify-center gap-2 rounded-full border border-white/80 bg-white/85 px-7 text-base font-semibold text-accent shadow-sm transition-all hover:border-accent/30 hover:bg-white hover:shadow-md active:scale-[0.98] dark:border-white/10 dark:bg-surface/85 dark:hover:bg-surface"
              />
            </div>

            <div className="mt-7 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm text-foreground-soft sm:gap-x-6">
              <span className="inline-flex items-center gap-2">
                <Check className="h-4 w-4 text-accent" strokeWidth={2.4} aria-hidden="true" />
                7 dias grátis
              </span>
              <span className="hidden h-5 w-px bg-accent/45 sm:block" aria-hidden="true" />
              <span className="inline-flex items-center gap-2">
                <Check className="h-4 w-4 text-accent" strokeWidth={2.4} aria-hidden="true" />
                Sem cartão de crédito
              </span>
              <span className="hidden h-5 w-px bg-accent/45 sm:block" aria-hidden="true" />
              <span className="inline-flex items-center gap-2">
                <Check className="h-4 w-4 text-accent" strokeWidth={2.4} aria-hidden="true" />
                Cancele quando quiser
              </span>
            </div>

            <div className="mt-11 flex items-center justify-center gap-4 sm:gap-7">
              <span className="h-px w-12 bg-accent sm:w-16" aria-hidden="true" />
              <p className="text-base font-medium text-foreground-soft sm:text-lg">
                Comece com seus próprios dados. Decida com números, não com achismos.
              </p>
              <span className="h-px w-12 bg-accent sm:w-16" aria-hidden="true" />
            </div>
          </motion.div>
        </div>
      </section>
    </main>
  );
}
