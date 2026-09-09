"use client";

import Link from "next/link";
import { motion } from "framer-motion";
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

      {/* Final CTA Section */}
      <section id="demo" className="relative py-24 md:py-32">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-0"
          style={{
            background:
              "linear-gradient(to bottom, var(--background-soft) 0%, rgba(14, 122, 111, 0.05) 45%, var(--background) 100%)",
          }}
        />

        <div className="relative z-10 mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: easeOut }}
          >
            <h2 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl lg:text-5xl">
              Pronto para ver o lucro real do seu negócio?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
              Junte-se a centenas de sellers profissionais que já descobriram onde estavam perdendo dinheiro.
            </p>

            <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link
                href="/sign-in"
                className="inline-flex h-12 items-center justify-center rounded-xl bg-accent px-8 text-sm font-semibold text-white shadow-lg transition-all hover:bg-accent-strong hover:shadow-xl active:scale-[0.98]"
              >
                Começar gratuitamente
              </Link>
              <ScheduleDemoLink className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-border bg-surface px-8 text-sm font-semibold text-foreground transition-all hover:border-accent/30 hover:bg-accent/[0.02] active:scale-[0.98]" />
            </div>

            <p className="mt-6 text-sm text-muted-foreground">
              Configuração em 5 minutos. Cancele quando quiser.
            </p>
          </motion.div>
        </div>
      </section>
    </main>
  );
}
