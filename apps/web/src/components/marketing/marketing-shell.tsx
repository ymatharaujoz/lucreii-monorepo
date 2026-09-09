"use client";

import Link from "next/link";
import { UserRound } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { BrandName } from "@/components/brand-name";
import { MarketingBackdrop } from "@/components/marketing/marketing-backdrop";
import { MarketingNavLinks } from "@/components/marketing/marketing-nav-links";

export function MarketingShell({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="marketing-site relative min-h-screen" lang="pt-BR">
      <MarketingBackdrop />

      <div className="relative z-10">
        {/* Header */}
        <header className="fixed left-0 right-0 top-0 z-50 px-4 pt-2 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <nav className="flex items-center justify-between rounded-[24px] border border-white/80 bg-white/90 px-4 py-2 shadow-[0_10px_30px_rgba(18,67,61,0.08)] backdrop-blur-xl dark:border-white/10 dark:bg-surface/90 md:px-6">
              {/* Logo */}
              <Link
                href="/"
                className="group flex shrink-0 items-center gap-2.5"
              >
                <BrandLogo className="h-10 w-10 transition-transform group-hover:scale-105" />
                <BrandName className="text-xl font-bold tracking-tight" />
              </Link>

              {/* Navigation */}
              <div className="hidden flex-1 items-center justify-center gap-1 md:flex">
                <MarketingNavLinks linkClassName="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground transition-all hover:bg-accent/5 hover:text-foreground" />
              </div>

              {/* CTA Button */}
              <div className="ml-auto flex items-center">
                <Link
                  href="/sign-in"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-accent px-6 text-sm font-semibold text-white shadow-sm transition-all hover:bg-accent-strong hover:shadow-md active:scale-[0.98]"
                >
                  <UserRound
                    className="h-4 w-4"
                    strokeWidth={2}
                    aria-hidden="true"
                  />
                  Acessar
                </Link>
              </div>
            </nav>
          </div>
        </header>

        {/* Spacer for fixed header */}
        <div className="h-20" />

        {children}

        {/* Footer */}
        <footer className="border-t border-border bg-surface py-12 backdrop-blur-sm">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
              {/* Logo */}
              <Link href="/" className="flex items-center gap-2.5">
                <BrandLogo className="h-14 w-auto" />
                <BrandName className="text-sm font-semibold" />
              </Link>

              {/* Links */}
              <nav className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2">
                <MarketingNavLinks linkClassName="text-sm text-muted-foreground transition-colors hover:text-foreground" />
              </nav>

              {/* Copyright */}
              <p className="text-xs text-muted-foreground">
                &copy; {new Date().getFullYear()} Lucreii. Todos os direitos reservados.
              </p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
