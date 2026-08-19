"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { motion, useReducedMotion } from "framer-motion";
import {
  AlertTriangle,
  Archive,
  ArrowUpDown,
  Calculator,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  LoaderCircle,
  Plus,
  Search,
} from "lucide-react";
import type {
  PricingSimulation,
  PricingSimulationSortDirection,
  PricingSimulationSortKey,
} from "@lucreii/types";
import { Badge, Button, cn } from "@lucreii/ui";
import { Pagination } from "@/components/ui-premium/pagination";
import { ApiClientError } from "@/lib/api/client";
import { containerVariants, itemVariants } from "@/lib/animations";
import {
  fetchPricingSimulations,
  type PricingSimulationListFilters,
} from "./pricing-simulations-data";

const QUERY_KEY = "pricing-simulations";

type SortKey = PricingSimulationSortKey;
type SortDirection = PricingSimulationSortDirection;

const SORT_KEYS: SortKey[] = [
  "productIdentifier",
  "mode",
  "recommendedSalePrice",
  "contributionMargin",
  "grossProfit",
  "updatedAt",
];

function readSelectedCompanyId() {
  if (typeof document === "undefined") return null;

  const match = document.cookie.match(
    /(?:^|;\s*)lucreii_selected_company_id=([^;]+)/i,
  );

  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

function isSortKey(value: string | null): value is SortKey {
  return Boolean(value && SORT_KEYS.includes(value as SortKey));
}

function isSortDirection(value: string | null): value is SortDirection {
  return value === "asc" || value === "desc";
}

function readPage(value: string | null) {
  const page = Number(value);
  return Number.isInteger(page) && page > 0 ? page : 1;
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

function SortIcon({
  active,
  direction,
}: {
  active: boolean;
  direction: SortDirection | null;
}) {
  if (!active) {
    return <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/45" />;
  }

  return direction === "asc" ? (
    <ChevronUp className="h-3.5 w-3.5 text-accent" />
  ) : (
    <ChevronDown className="h-3.5 w-3.5 text-accent" />
  );
}

function SimulationTable({
  items,
  onSelect,
  onSortChange,
  sortBy,
  sortDirection,
}: {
  items: PricingSimulation[];
  onSelect: (simulation: PricingSimulation) => void;
  onSortChange: (sortBy: SortKey) => void;
  sortBy: SortKey | null;
  sortDirection: SortDirection | null;
}) {
  const columns: Array<{ key: SortKey; label: string }> = [
    { key: "productIdentifier", label: "Produto ou SKU" },
    { key: "mode", label: "Calculadora" },
    { key: "recommendedSalePrice", label: "Preço Recomendado" },
    { key: "contributionMargin", label: "Margem" },
    { key: "grossProfit", label: "Lucro Bruto" },
    { key: "updatedAt", label: "Atualizado Em" },
  ];

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[820px] border-collapse text-left">
        <thead>
          <tr className="border-b border-border/60 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
            {columns.map((column) => (
              <th
                aria-sort={
                  sortBy === column.key
                    ? sortDirection === "asc"
                      ? "ascending"
                      : "descending"
                    : "none"
                }
                className="px-5 py-4 font-semibold"
                key={column.key}
              >
                <button
                  className="group/sort inline-flex items-center gap-1.5 text-left transition-colors hover:text-foreground"
                  onClick={() => onSortChange(column.key)}
                  type="button"
                >
                  {column.label}
                  <SortIcon
                    active={sortBy === column.key}
                    direction={sortDirection}
                  />
                </button>
              </th>
            ))}
            <th className="w-10 px-3 py-4" />
          </tr>
        </thead>
        <tbody className="divide-y divide-border/40">
          {items.map((simulation, index) => (
            <motion.tr
              animate={{ opacity: 1, y: 0 }}
              className="group cursor-pointer transition-colors hover:bg-accent/[0.035] focus-within:bg-accent/[0.035]"
              initial={{ opacity: 0, y: 5 }}
              key={simulation.id}
              onClick={() => onSelect(simulation)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelect(simulation);
                }
              }}
              role="button"
              tabIndex={0}
              transition={{ delay: index * 0.025, duration: 0.2 }}
            >
              <td className="px-5 py-4">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent ring-1 ring-accent/15">
                    <Calculator className="h-4 w-4" />
                  </div>
                  <p className="truncate text-sm font-semibold text-foreground">
                    {simulation.productIdentifier}
                  </p>
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
            </motion.tr>
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

function SimulationSearchInput({
  initialValue,
  onDebouncedChange,
}: {
  initialValue: string;
  onDebouncedChange: (value: string) => void;
}) {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    if (value.trim() === initialValue.trim()) return;

    const timeout = window.setTimeout(() => {
      onDebouncedChange(value.trim());
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [initialValue, onDebouncedChange, value]);

  return (
    <label className="relative block w-full sm:max-w-xs">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        aria-label="Buscar simulações"
        className="h-10 w-full rounded-[var(--radius-md)] border border-border bg-surface px-9 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground/60 hover:border-border-strong focus:border-border-focus focus:ring-4 focus:ring-accent/10"
        onChange={(event) => setValue(event.target.value)}
        placeholder="Buscar por Produto ou SKU"
        value={value}
      />
    </label>
  );
}

export function PricingSimulationsPage() {
  const reducedMotion = useReducedMotion();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selectedCompanyId = readSelectedCompanyId();
  const urlSearch = searchParams.get("search") ?? "";
  const page = readPage(searchParams.get("page"));
  const sortByParam = searchParams.get("sortBy");
  const sortDirectionParam = searchParams.get("sortDirection");
  const parsedSortBy = isSortKey(sortByParam) ? sortByParam : null;
  const parsedSortDirection = isSortDirection(sortDirectionParam)
    ? sortDirectionParam
    : null;
  const sortBy = parsedSortBy && parsedSortDirection ? parsedSortBy : null;
  const sortDirection =
    parsedSortBy && parsedSortDirection ? parsedSortDirection : null;

  const updateUrl = useCallback(
    (changes: Record<string, string | null>) => {
      const nextParams = new URLSearchParams(searchParams.toString());

      for (const [key, value] of Object.entries(changes)) {
        if (value === null || value === "") nextParams.delete(key);
        else nextParams.set(key, value);
      }

      const query = nextParams.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    },
    [pathname, router, searchParams],
  );

  const handleSearchChange = useCallback(
    (value: string) => {
      updateUrl({ page: "1", search: value || null });
    },
    [updateUrl],
  );

  const filters: PricingSimulationListFilters = {
    page,
    search: urlSearch,
    sortBy,
    sortDirection,
  };
  const query = useQuery({
    enabled: Boolean(selectedCompanyId),
    placeholderData: keepPreviousData,
    queryFn: () => fetchPricingSimulations(filters),
    queryKey: [
      QUERY_KEY,
      selectedCompanyId,
      filters.page,
      filters.search,
      filters.sortBy ?? "",
      filters.sortDirection ?? "",
    ],
  });
  const data = query.data;

  useEffect(() => {
    if (data && page > data.totalPages) {
      updateUrl({ page: String(data.totalPages) });
    }
  }, [data, page, updateUrl]);

  function handleSortChange(nextSortBy: SortKey) {
    if (sortBy !== nextSortBy) {
      updateUrl({
        page: "1",
        sortBy: nextSortBy,
        sortDirection: "asc",
      });
      return;
    }

    if (sortDirection === "asc") {
      updateUrl({ page: "1", sortDirection: "desc" });
      return;
    }

    updateUrl({ page: "1", sortBy: null, sortDirection: null });
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
          <SimulationSearchInput
            initialValue={urlSearch}
            key={urlSearch}
            onDebouncedChange={handleSearchChange}
          />
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
              {query.error instanceof ApiClientError
                ? query.error.message
                : "Verifique a conexão com a API e tente novamente."}
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
              {urlSearch
                ? "Nenhuma simulação encontrada"
                : "Sua biblioteca começa aqui"}
            </h2>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
              {urlSearch
                ? "Tente outro Produto ou SKU."
                : "Identifique o produto na calculadora e salve o primeiro cenário para acompanhar sua decisão de preço."}
            </p>
            {!urlSearch && (
              <Button asChild className="mt-5" size="sm" variant="secondary">
                <Link href="/app/pricing/contribution-margin">
                  Começar uma Simulação
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            )}
          </div>
        ) : (
          <>
            <SimulationTable
              items={data.items}
              onSelect={(simulation) =>
                router.push(`/app/pricing/simulations/${simulation.id}`)
              }
              onSortChange={handleSortChange}
              sortBy={sortBy}
              sortDirection={sortDirection}
            />
            <div className="border-t border-border/60 px-5 py-4 sm:px-7">
              <Pagination
                className="flex-wrap gap-3"
                currentPage={data.page}
                onPageChange={(nextPage) =>
                  updateUrl({ page: String(nextPage) })
                }
                showFirstLast={data.totalPages > 5}
                totalPages={data.totalPages}
              />
              {query.isFetching && (
                <div className="mt-2 flex items-center justify-end gap-1.5 text-[11px] text-muted-foreground">
                  <LoaderCircle className="h-3 w-3 animate-spin" />
                  Atualizando resultados...
                </div>
              )}
            </div>
          </>
        )}
      </motion.section>
    </motion.div>
  );
}
