"use client";

import { type ReactNode, useState } from "react";
import Link from "next/link";
import type { BillingTrial, Company } from "@lucreii/types";
import { ReferenceMonthProvider } from "@/lib/reference-month-context";
import { AppSidebar } from "./app-sidebar";
import { AppTopBar } from "./app-top-bar";
import { MinimalHeader } from "./minimal-header";

type AppLayoutClientProps = {
  children: ReactNode;
  appVersion: string;
  organization: {
    name: string;
  };
  companies: Company[];
  planLimit: number;
  user: {
    email: string;
    image: string | null;
    name: string;
  };
  hasSubscription: boolean;
  hasOnboarded: boolean;
  trial: BillingTrial;
  canManageBilling: boolean;
};

export function AppLayoutClient({
  children,
  appVersion,
  companies,
  organization,
  planLimit,
  user,
  hasSubscription,
  hasOnboarded,
  trial,
  canManageBilling,
}: AppLayoutClientProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const selectedCompanyId =
    companies.find((company) => company.isSelected)?.id ??
    companies.find((company) => company.isActive)?.id ??
    null;
  const protectedChildren = (
    <ReferenceMonthProvider companyId={selectedCompanyId}>
      {children}
    </ReferenceMonthProvider>
  );

  // Sem assinatura ou sem onboarding completo: mostra layout simples sem sidebar
  if (!hasSubscription || !hasOnboarded) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <MinimalHeader user={user} />
        <main className="flex-1 overflow-x-hidden overflow-y-auto">
          {protectedChildren}
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 animate-fade-in bg-foreground/10 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden
        />
      )}

      <div className="hidden lg:flex">
        <AppSidebar
          collapsed={collapsed}
          companies={companies}
          appVersion={appVersion}
          onToggle={() => setCollapsed(!collapsed)}
          planLimit={planLimit}
          user={user}
          organization={organization}
          isMobile={false}
        />
      </div>

      <div
        className={`fixed inset-y-0 left-0 z-50 transition-transform duration-[var(--transition-normal)] lg:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <AppSidebar
          collapsed={false}
          companies={companies}
          appVersion={appVersion}
          onToggle={() => setMobileOpen(false)}
          planLimit={planLimit}
          user={user}
          organization={organization}
          isMobile
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <AppTopBar onMenuToggle={() => setMobileOpen(true)} />
        {trial?.status === "active" ? (
          <div className="border-b border-accent/20 bg-accent/10 px-6 py-3 sm:px-8 md:px-10 lg:px-12 xl:px-14">
            <div className="mx-auto flex w-full max-w-[1440px] items-center justify-between gap-4 text-sm">
              <p className="font-medium text-foreground">
                {trial.remainingDays === 0
                  ? "Seu teste termina hoje."
                  : `Seu teste termina em ${trial.remainingDays} ${trial.remainingDays === 1 ? "dia" : "dias"}.`}
              </p>
              {canManageBilling ? (
                <Link
                  className="shrink-0 font-semibold text-accent hover:underline"
                  href="/app/billing"
                >
                  Ver planos
                </Link>
              ) : null}
            </div>
          </div>
        ) : null}
        <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto py-6 md:py-8">
          <div className="mx-auto w-full max-w-[min(100%,1440px)] px-6 sm:px-8 md:px-10 lg:px-12 xl:px-14">
            {protectedChildren}
          </div>
        </main>
      </div>
    </div>
  );
}
