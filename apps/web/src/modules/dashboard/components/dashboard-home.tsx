"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { RefreshCw, AlertCircle, ChevronDown, Calendar } from "lucide-react";
import type { Company, IntegrationProviderSlug } from "@lucreii/types";
import { Card, EmptyState, Skeleton, Button, Dropdown } from "@lucreii/ui";
import { ApiClientError } from "@/lib/api/client";
import {
  clampReferenceMonth,
  formatReferenceMonthPtBr,
  getSaoPauloCurrentReferenceMonth,
  mergeDescendingReferenceMonthChoices,
} from "@/lib/reference-month";
import { containerVariants, fadeInVariants } from "@/lib/animations";
import { SkeletonChart, SkeletonGrid } from "@/components/ui-premium/skeleton-grid";
import { DashboardHeader } from "./dashboard-header";
import { DashboardFinancialIndicators } from "./dashboard-financial-indicators";
import { MarginAuditPanel } from "./margin-audit-panel";
import { ChartsSection } from "./charts-section";
import { MarketplacesSection } from "./marketplaces-section";
import { InsightsSection } from "./insights-section";
import { ProductsTable } from "./products-table";
import { useDashboardData } from "../hooks/use-dashboard-data";
import { useDashboardConnectionStatuses } from "../hooks/use-dashboard-connection-statuses";

interface DashboardHomeProps {
  activeCompany: Company | null;
  companyName: string;
}

const REFERENCE_MONTH_HISTORY = 6;

function ReferenceMonthToolbar({
  onReferenceMonthChange,
  options,
  referenceMonth,
}: {
  onReferenceMonthChange: (value: string) => void;
  options: readonly string[];
  referenceMonth: string;
}) {
  const items = options.map((iso) => ({
    id: iso,
    label: formatReferenceMonthPtBr(iso),
  }));

  return (
    <Dropdown
      align="left"
      items={items}
      onSelect={(id) => onReferenceMonthChange(id)}
      trigger={
        <div className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-[var(--radius-md)] border border-border bg-background pl-2.5 pr-2.5 text-xs font-semibold text-foreground transition-all duration-[var(--transition-fast)] outline-none hover:border-border-strong hover:shadow-[var(--shadow-xs)]">
          <Calendar className="h-3.5 w-3.5 shrink-0 text-accent" />
          <span className="hidden text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground/70 md:inline">
            Mês de Referência
          </span>
          <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground/70 md:hidden">
            Mês
          </span>
          <span
            aria-hidden
            className="h-3 w-px shrink-0 bg-border/70"
          />
          <span className="font-semibold text-foreground text-xs leading-none">
            {formatReferenceMonthPtBr(referenceMonth)}
          </span>
          <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground transition-transform duration-[var(--transition-fast)]" />
        </div>
      }
    />
  );
}

function LoadingDashboard() {
  return (
    <div className="space-y-8">
      <Skeleton className="h-24 w-full" />
      <SkeletonGrid rows={1} columns={4} height={120} />
      <Skeleton className="h-12 w-full" />
      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <SkeletonChart />
        <SkeletonChart />
      </div>
    </div>
  );
}

function ErrorState({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const isUnauthorized = error instanceof ApiClientError && error.status === 401;

  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex min-h-[400px] items-center justify-center">
      <Card variant="outlined" className="max-w-md p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-error/10">
          <AlertCircle className="h-6 w-6 text-error" />
        </div>
        <h3 className="mb-2 text-lg font-semibold text-foreground">
          {isUnauthorized ? "Sessão expirada" : "Erro ao carregar dados"}
        </h3>
        <p className="mb-6 text-sm text-muted-foreground">
          {isUnauthorized
            ? "Sua sessão expirou. Por favor, faça login novamente para continuar."
            : "Não foi possível carregar os dados do dashboard. Tente novamente."}
        </p>
        {isUnauthorized ? (
          <Button asChild>
            <Link href="/sign-in">Fazer login</Link>
          </Button>
        ) : (
          <Button onClick={onRetry}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Tentar novamente
          </Button>
        )}
      </Card>
    </motion.div>
  );
}

export function DashboardHome({ activeCompany, companyName }: DashboardHomeProps) {
  const [providerFilter, setProviderFilter] = useState<IntegrationProviderSlug | null>(null);
  const [referenceMonth, setReferenceMonthState] = useState(() => getSaoPauloCurrentReferenceMonth());
  const referenceMonthOptions = useMemo(
    () =>
      mergeDescendingReferenceMonthChoices(
        referenceMonth,
        getSaoPauloCurrentReferenceMonth(),
        REFERENCE_MONTH_HISTORY,
      ),
    [referenceMonth],
  );
  const {
    summaryQuery,
    chartsQuery,
    profitabilityQuery,
    financialIndicatorsQuery,
    isLoading,
    error,
    financialState,
    businessStatus,
    refetchAll,
  } = useDashboardData(providerFilter, referenceMonth);
  const { syncStatusByProvider } = useDashboardConnectionStatuses();

  const setReferenceMonth = (next: string) => {
    const effective = clampReferenceMonth(next);
    if (!effective) {
      return;
    }

    setReferenceMonthState(effective);
  };

  if (isLoading) {
    return <LoadingDashboard />;
  }

  if (error) {
    return <ErrorState error={error} onRetry={refetchAll} />;
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-5"
    >
      <DashboardHeader
        companyName={companyName}
        businessStatus={businessStatus}
      />

      <hr className="border-border" />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <ReferenceMonthToolbar
          onReferenceMonthChange={setReferenceMonth}
          options={referenceMonthOptions}
          referenceMonth={referenceMonth}
        />

        <div className="flex w-fit rounded-xl border border-border bg-surface-strong p-1 shadow-[var(--shadow-xs)]">
          {([
            [null, "Todos"],
            ["mercadolivre", "Mercado Livre"],
            ["shopee", "Shopee"],
            ["shein", "Shein"],
          ] as const).map(([provider, label]) => (
            <button
              key={provider ?? "all"}
              type="button"
              onClick={() => setProviderFilter(provider)}
              className={`rounded-lg px-3 py-1 text-xs font-semibold transition-all duration-[var(--transition-fast)] ${
                providerFilter === provider
                  ? "bg-accent text-accent-foreground shadow-[var(--shadow-xs)]"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {financialIndicatorsQuery.data && (
        <section className="space-y-3">
          <DashboardFinancialIndicators
            activeCompany={activeCompany}
            financialIndicators={financialIndicatorsQuery.data}
            onDefaultsSaved={refetchAll}
          />
          <MarginAuditPanel
            indicators={financialIndicatorsQuery.data}
            provider={providerFilter}
            referenceMonth={referenceMonth}
          />
        </section>
      )}

      {chartsQuery.data && (
        <section className="grid items-stretch gap-4 lg:grid-cols-[1fr_300px]">
          <ChartsSection data={chartsQuery.data} className="h-full" />
          <div className="flex h-full flex-col gap-3">
            <MarketplacesSection
              data={chartsQuery.data}
              syncStatusByProvider={syncStatusByProvider}
              className={summaryQuery.data ? "" : "flex-1"}
            />
            {summaryQuery.data && <InsightsSection data={summaryQuery.data} className="flex-1" />}
          </div>
        </section>
      )}

      {profitabilityQuery.data && financialState === "ready" && (
        <motion.section variants={fadeInVariants}>
          <ProductsTable data={profitabilityQuery.data} />
        </motion.section>
      )}

      {financialState === "insufficient" && (
        <motion.div variants={fadeInVariants} initial="hidden" animate="visible">
          <EmptyState
            title="Dados insuficientes para análise completa"
            description="Sua sincronização já trouxe a base inicial, mas ainda faltam sinais suficientes para montar a rentabilidade por produto."
            action={
              <Button asChild variant="secondary">
                <Link href="/app/products">Revisar catálogo</Link>
              </Button>
            }
          />
        </motion.div>
      )}
    </motion.div>
  );
}
