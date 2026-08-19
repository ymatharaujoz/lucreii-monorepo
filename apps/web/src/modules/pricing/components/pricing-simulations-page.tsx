"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  AlertTriangle,
  Archive,
  Calculator,
  ChevronRight,
  LoaderCircle,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import type { PricingSimulation, PricingSimulationList } from "@lucreii/types";
import { pricingSimulationListApiResponseSchema } from "@lucreii/validation";
import { Badge, Button, Modal, cn } from "@lucreii/ui";
import { ApiClientError, apiClient } from "@/lib/api/client";
import { containerVariants, itemVariants } from "@/lib/animations";
import { PricingCalculator } from "./pricing-calculator";

const PAGE_SIZE = 50;
const QUERY_KEY = "pricing-simulations";

function readSelectedCompanyId() {
  if (typeof document === "undefined") {
    return null;
  }

  const match = document.cookie.match(
    /(?:^|;\s*)lucreii_selected_company_id=([^;]+)/i,
  );

  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

function formatMoney(value: string) {
  return new Intl.NumberFormat("pt-BR", {
    currency: "BRL",
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: "currency",
  }).format(Number(value));
}

function formatPercent(value: string) {
  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: "percent",
  }).format(Number(value));
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function modeLabel(mode: PricingSimulation["mode"]) {
  return {
    "contribution-margin": "Margem de Contribuição",
    "desired-profit": "Lucro Desejado",
    "sale-price": "Preço de Venda",
  }[mode];
}

async function fetchSimulations(search: string) {
  const params = new URLSearchParams({
    page: "1",
    pageSize: String(PAGE_SIZE),
  });

  if (search.trim()) {
    params.set("search", search.trim());
  }

  return apiClient.getValidatedData<PricingSimulationList>(
    `/pricing/simulations?${params.toString()}`,
    pricingSimulationListApiResponseSchema,
  );
}

function SimulationTable({
  items,
  onSelect,
}: {
  items: PricingSimulation[];
  onSelect: (simulation: PricingSimulation) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] border-collapse text-left">
        <thead>
          <tr className="border-b border-border/60 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
            <th className="px-5 py-4 font-semibold">Produto ou SKU</th>
            <th className="px-5 py-4 font-semibold">Calculadora</th>
            <th className="px-5 py-4 font-semibold">Preço Recomendado</th>
            <th className="px-5 py-4 font-semibold">Margem</th>
            <th className="px-5 py-4 font-semibold">Lucro Bruto</th>
            <th className="px-5 py-4 font-semibold">Atualizado Em</th>
            <th className="w-10 px-3 py-4" />
          </tr>
        </thead>
        <tbody className="divide-y divide-border/40">
          {items.map((simulation) => (
            <tr
              key={simulation.id}
              className="group cursor-pointer transition-colors hover:bg-accent/[0.035] focus-within:bg-accent/[0.035]"
              onClick={() => onSelect(simulation)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelect(simulation);
                }
              }}
              role="button"
              tabIndex={0}
            >
              <td className="px-5 py-4">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent ring-1 ring-accent/15">
                    <Calculator className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {simulation.productIdentifier}
                    </p>
                  </div>
                </div>
              </td>
              <td className="px-5 py-4">
                <Badge className="border-border/60 bg-surface text-muted-foreground">
                  {modeLabel(simulation.mode)}
                </Badge>
              </td>
              <td className="px-5 py-4 text-sm font-semibold tabular-nums text-accent">
                {formatMoney(simulation.recommendedSalePrice)}
              </td>
              <td
                className={cn(
                  "px-5 py-4 text-sm font-semibold tabular-nums",
                  Number(simulation.contributionMargin) < 0
                    ? "text-error"
                    : "text-foreground",
                )}
              >
                {formatPercent(simulation.contributionMargin)}
              </td>
              <td
                className={cn(
                  "px-5 py-4 text-sm font-semibold tabular-nums",
                  Number(simulation.grossProfit) < 0
                    ? "text-error"
                    : "text-foreground",
                )}
              >
                {formatMoney(simulation.grossProfit)}
              </td>
              <td className="whitespace-nowrap px-5 py-4 text-xs text-muted-foreground">
                {formatDate(simulation.updatedAt)}
              </td>
              <td className="px-3 py-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-accent">
                <ChevronRight className="h-4 w-4" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="divide-y divide-border/40">
      {[0, 1, 2, 3].map((row) => (
        <div className="flex items-center gap-5 px-5 py-5" key={row}>
          <div className="h-9 w-9 animate-pulse rounded-xl bg-muted/50" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-44 animate-pulse rounded-full bg-muted/50" />
            <div className="h-2.5 w-24 animate-pulse rounded-full bg-muted/30" />
          </div>
          <div className="hidden h-3 w-24 animate-pulse rounded-full bg-muted/40 sm:block" />
          <div className="hidden h-3 w-20 animate-pulse rounded-full bg-muted/40 md:block" />
        </div>
      ))}
    </div>
  );
}

export function PricingSimulationsPage() {
  const queryClient = useQueryClient();
  const reducedMotion = useReducedMotion();
  const selectedCompanyId = readSelectedCompanyId();
  const [search, setSearch] = useState("");
  const [selectedSimulation, setSelectedSimulation] =
    useState<PricingSimulation | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PricingSimulation | null>(
    null,
  );
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const query = useQuery({
    enabled: Boolean(selectedCompanyId),
    queryFn: () => fetchSimulations(search),
    queryKey: [QUERY_KEY, selectedCompanyId, search.trim()],
  });
  const data = query.data;

  const selectedTitle = useMemo(() => {
    if (!selectedSimulation) return "Detalhes da Simulação";
    return selectedSimulation.productIdentifier;
  }, [selectedSimulation]);

  function updateSimulation(updated: PricingSimulation) {
    setSelectedSimulation(updated);
    queryClient.setQueryData<PricingSimulationList>(
      [QUERY_KEY, selectedCompanyId, search.trim()],
      (current) =>
        current
          ? {
              ...current,
              items: current.items.map((item) =>
                item.id === updated.id ? updated : item,
              ),
            }
          : current,
    );
  }

  async function deleteSimulation() {
    if (!deleteTarget) return;

    setIsDeleting(true);
    setDeleteError(null);

    try {
      await apiClient.delete<{ data: { id: string }; error: null }>(
        `/pricing/simulations/${deleteTarget.id}`,
      );
      setSelectedSimulation(null);
      setDeleteTarget(null);
      await queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    } catch (error) {
      setDeleteError(
        error instanceof ApiClientError
          ? error.message
          : "Não foi possível excluir a simulação.",
      );
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <motion.div
      animate="visible"
      className="space-y-8 pb-8"
      initial={reducedMotion ? false : "hidden"}
      variants={containerVariants}
    >
      <motion.header
        className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"
        variants={itemVariants}
      >
        <div className="max-w-3xl">
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-accent">
            <Archive className="h-4 w-4" />
            <span>Precificação</span>
            <span className="text-muted-foreground/50">/</span>
            <span className="text-muted-foreground">Simulações</span>
          </div>
          <h1 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-foreground sm:text-4xl">
            Seus cenários, prontos para comparar.
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Salve estudos de preço por produto, revise as premissas e ajuste o
            cenário quando precisar.
          </p>
        </div>
        <Button asChild size="sm">
          <Link href="/app/pricing/contribution-margin">
            <Plus className="h-3.5 w-3.5" />
            Nova Simulação
          </Link>
        </Button>
      </motion.header>

      <motion.section
        className="overflow-hidden rounded-[var(--radius-xl)] border border-border/70 bg-surface-strong/70 shadow-[var(--shadow-sm)]"
        variants={itemVariants}
      >
        <div className="flex flex-col gap-4 border-b border-border/60 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-accent">
              Biblioteca de cenários
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {data?.totalItems ?? 0} simulações salvas nesta empresa
            </p>
          </div>
          <label className="relative block w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              aria-label="Buscar simulações"
              className="h-10 w-full rounded-[var(--radius-md)] border border-border bg-surface px-9 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground/60 hover:border-border-strong focus:border-border-focus focus:ring-4 focus:ring-accent/10"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por Nome do Produto ou SKU"
              value={search}
            />
          </label>
        </div>

        {query.isLoading ? (
          <LoadingState />
        ) : query.isError ? (
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <AlertTriangle className="h-8 w-8 text-error/80" />
            <h2 className="mt-4 text-base font-semibold text-foreground">
              Não foi possível carregar as simulações
            </h2>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
              Verifique a conexão com a API e tente novamente.
            </p>
            <Button
              className="mt-5"
              onClick={() => void query.refetch()}
              size="sm"
              variant="secondary"
            >
              Tentar novamente
            </Button>
          </div>
        ) : !data?.items.length ? (
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10 text-accent ring-1 ring-accent/15">
              <Calculator className="h-6 w-6" />
            </div>
            <h2 className="mt-5 text-base font-semibold text-foreground">
              {search
                ? "Nenhuma simulação encontrada"
                : "Sua biblioteca começa aqui"}
            </h2>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
              {search
                ? "Tente outro Nome do Produto ou SKU."
                : "Identifique o produto na calculadora e salve o primeiro cenário para acompanhar sua decisão de preço."}
            </p>
            {!search && (
              <Button asChild className="mt-5" size="sm" variant="secondary">
                <Link href="/app/pricing/contribution-margin">
                  Começar uma Simulação
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            )}
          </div>
        ) : (
          <SimulationTable
            items={data.items}
            onSelect={setSelectedSimulation}
          />
        )}
      </motion.section>

      <AnimatePresence>
        {selectedSimulation && (
          <Modal
            className="!max-w-6xl"
            onClose={() => setSelectedSimulation(null)}
            open
            title={
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-accent">
                  Editar Simulação
                </p>
                <h2 className="mt-1 text-lg font-semibold text-foreground">
                  {selectedTitle}
                </h2>
              </div>
            }
          >
            <PricingCalculator
              embedded
              initialSimulation={selectedSimulation}
              key={`${selectedSimulation.id}-${selectedSimulation.updatedAt}`}
              mode={selectedSimulation.mode}
              onSaved={updateSimulation}
            />
            <div className="mt-6 flex justify-end border-t border-border/60 pt-5">
              <Button
                onClick={() => {
                  setDeleteError(null);
                  setDeleteTarget(selectedSimulation);
                }}
                size="sm"
                variant="ghost"
              >
                <Trash2 className="h-3.5 w-3.5 text-error" />
                <span className="text-error">Excluir Simulação</span>
              </Button>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      <Modal
        onClose={() => {
          if (!isDeleting) setDeleteTarget(null);
        }}
        open={Boolean(deleteTarget)}
        title="Excluir Simulação?"
      >
        <div className="space-y-5">
          <p className="text-sm leading-relaxed text-muted-foreground">
            Esta ação remove o cenário salvo da empresa ativa. Os dados não
            poderão ser recuperados depois.
          </p>
          {deleteError && (
            <div className="flex items-start gap-2 rounded-[var(--radius-md)] border border-error/20 bg-error-soft px-3 py-2.5 text-xs text-error">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{deleteError}</span>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button
              disabled={isDeleting}
              onClick={() => setDeleteTarget(null)}
              size="sm"
              variant="secondary"
            >
              Cancelar
            </Button>
            <Button
              disabled={isDeleting}
              onClick={() => void deleteSimulation()}
              size="sm"
              variant="danger"
            >
              {isDeleting ? (
                <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}
              {isDeleting ? "Excluindo..." : "Excluir"}
            </Button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
}
