"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { motion, useReducedMotion } from "framer-motion";
import {
  AlertTriangle,
  ArrowUpDown,
  Calculator,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  LoaderCircle,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import type {
  BreakEvenRoasSimulation,
  BreakEvenRoasSimulationBulkDeleteResult,
  BreakEvenRoasSimulationSortDirection,
  BreakEvenRoasSimulationSortKey,
} from "@lucreii/types";
import { Button, cn, Modal } from "@lucreii/ui";
import { Pagination } from "@/components/ui-premium/pagination";
import { ApiClientError, apiClient } from "@/lib/api/client";
import { containerVariants, itemVariants } from "@/lib/animations";
import {
  fetchBreakEvenRoasSimulations,
  type BreakEvenRoasSimulationListFilters,
} from "./break-even-roas-simulations-data";
import {
  areAllVisibleSelected,
  toggleSelectedId,
  toggleVisibleSelection,
} from "./pricing-simulations-selection";
import { SimulationSelectionActionBar } from "./simulation-selection-primitives";

const QUERY_KEY = "break-even-roas-simulations";
type SortKey = BreakEvenRoasSimulationSortKey;
type SortDirection = BreakEvenRoasSimulationSortDirection;

const SORT_KEYS: SortKey[] = [
  "productIdentifier",
  "contributionMarginRate",
  "breakEvenRoas",
  "updatedAt",
];

function readSelectedCompanyId() {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(
    /(?:^|;\s*)lucreii_selected_company_id=([^;]+)/i,
  );
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

function readPage(value: string | null) {
  const page = Number(value);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

function isSortKey(value: string | null): value is SortKey {
  return Boolean(value && SORT_KEYS.includes(value as SortKey));
}

function isSortDirection(value: string | null): value is SortDirection {
  return value === "asc" || value === "desc";
}

function formatPercent(value: string) {
  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: "percent",
  }).format(Number(value));
}

function formatRoas(value: string) {
  return `${Number(value).toLocaleString("pt-BR", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  })}x`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function SortIcon({
  active,
  direction,
}: {
  active: boolean;
  direction: SortDirection | null;
}) {
  if (!active)
    return <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/45" />;
  return direction === "asc" ? (
    <ChevronUp className="h-3.5 w-3.5 text-accent" />
  ) : (
    <ChevronDown className="h-3.5 w-3.5 text-accent" />
  );
}

function SearchInput({
  initialValue,
  onDebouncedChange,
}: {
  initialValue: string;
  onDebouncedChange: (value: string) => void;
}) {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    if (value.trim() === initialValue.trim()) return;
    const timeout = window.setTimeout(
      () => onDebouncedChange(value.trim()),
      350,
    );
    return () => window.clearTimeout(timeout);
  }, [initialValue, onDebouncedChange, value]);

  return (
    <label className="relative block w-full sm:max-w-xs">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        aria-label="Buscar simulações de ROAS"
        className="h-10 w-full rounded-[var(--radius-md)] border border-border bg-surface px-9 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground/60 hover:border-border-strong focus:border-border-focus focus:ring-4 focus:ring-accent/10"
        onChange={(event) => setValue(event.target.value)}
        placeholder="Buscar por Produto ou SKU"
        value={value}
      />
    </label>
  );
}

function Table({
  allVisibleSelected,
  items,
  onSelect,
  onSortChange,
  onToggleSelected,
  onToggleVisibleSelection,
  selectedIds,
  sortBy,
  sortDirection,
}: {
  allVisibleSelected: boolean;
  items: BreakEvenRoasSimulation[];
  onSelect: (simulation: BreakEvenRoasSimulation) => void;
  onSortChange: (sortBy: SortKey) => void;
  onToggleSelected: (id: string) => void;
  onToggleVisibleSelection: () => void;
  selectedIds: string[];
  sortBy: SortKey | null;
  sortDirection: SortDirection | null;
}) {
  const headers: Array<{ key: SortKey; label: string; className?: string }> = [
    { key: "productIdentifier", label: "Produto ou SKU" },
    { key: "contributionMarginRate", label: "Margem de Contribuição" },
    { key: "breakEvenRoas", label: "ROAS de Equilíbrio" },
    {
      key: "updatedAt",
      label: "Atualizado em",
      className: "hidden md:table-cell",
    },
  ];

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] border-collapse text-left">
        <thead className="border-b border-border/60 bg-surface/40">
          <tr>
            <th className="w-12 px-5 py-3">
              <input
                aria-label="Selecionar página"
                checked={allVisibleSelected}
                className="h-4 w-4 rounded border-border accent-accent"
                onChange={onToggleVisibleSelection}
                type="checkbox"
              />
            </th>
            {headers.map((header) => (
              <th
                className={cn(
                  "px-3 py-3 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground",
                  header.className,
                )}
                key={header.key}
              >
                <button
                  className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground"
                  onClick={() => onSortChange(header.key)}
                  type="button"
                >
                  {header.label}
                  <SortIcon
                    active={sortBy === header.key}
                    direction={sortDirection}
                  />
                </button>
              </th>
            ))}
            <th className="w-10 px-3 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-border/40">
          {items.map((simulation) => {
            const selected = selectedIds.includes(simulation.id);
            return (
              <motion.tr
                className={cn(
                  "group cursor-pointer transition-colors hover:bg-accent/[0.035]",
                  selected && "bg-accent/[0.05]",
                )}
                key={simulation.id}
                onClick={() => onSelect(simulation)}
                whileHover={{ x: 2 }}
              >
                <td
                  className="px-5 py-4"
                  onClick={(event) => event.stopPropagation()}
                >
                  <input
                    aria-label={`Selecionar ${simulation.productIdentifier}`}
                    checked={selected}
                    className="h-4 w-4 rounded border-border accent-accent"
                    onChange={() => onToggleSelected(simulation.id)}
                    type="checkbox"
                  />
                </td>
                <td className="px-3 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent ring-1 ring-accent/15">
                      <Calculator className="h-4 w-4" />
                    </div>
                    <p className="text-sm font-semibold text-foreground">
                      {simulation.productIdentifier}
                    </p>
                  </div>
                </td>
                <td className="px-3 py-4 text-sm font-semibold tabular-nums text-foreground">
                  {formatPercent(simulation.contributionMarginRate)}
                </td>
                <td className="px-3 py-4 text-sm font-semibold tabular-nums text-accent">
                  {formatRoas(simulation.breakEvenRoas)}
                </td>
                <td className="hidden whitespace-nowrap px-3 py-4 text-xs text-muted-foreground md:table-cell">
                  {formatDate(simulation.updatedAt)}
                </td>
                <td className="px-3 py-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-accent">
                  <ChevronRight className="h-4 w-4" />
                </td>
              </motion.tr>
            );
          })}
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
          <div className="h-4 w-4 animate-pulse rounded bg-muted/50" />
          <div className="h-9 w-9 animate-pulse rounded-xl bg-muted/50" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-44 animate-pulse rounded-full bg-muted/50" />
            <div className="h-2.5 w-24 animate-pulse rounded-full bg-muted/30" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function BreakEvenRoasSimulationsPage() {
  const reducedMotion = useReducedMotion();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const selectedCompanyId = readSelectedCompanyId();
  const search = searchParams.get("search") ?? "";
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
    (value: string) => updateUrl({ page: "1", search: value || null }),
    [updateUrl],
  );

  const filters: BreakEvenRoasSimulationListFilters = {
    page,
    search,
    sortBy,
    sortDirection,
  };
  const query = useQuery({
    enabled: Boolean(selectedCompanyId),
    placeholderData: keepPreviousData,
    queryFn: () => fetchBreakEvenRoasSimulations(filters),
    queryKey: [
      QUERY_KEY,
      selectedCompanyId,
      page,
      search,
      sortBy ?? "",
      sortDirection ?? "",
    ],
  });
  const data = query.data;
  const visibleIds = data?.items.map((item) => item.id) ?? [];
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const allVisibleSelected = areAllVisibleSelected(selectedIds, visibleIds);

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) =>
      apiClient.delete<{
        data: BreakEvenRoasSimulationBulkDeleteResult;
        error: null;
      }>("/pricing/break-even-roas/simulations/bulk-delete", { body: { ids } }),
    onError: (error) =>
      setDeleteError(
        error instanceof ApiClientError
          ? error.message
          : "Não foi possível excluir as simulações selecionadas.",
      ),
    onSuccess: async () => {
      setSelectedIds([]);
      setDeleteError(null);
      setIsDeleteModalOpen(false);
      await queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });

  const isDeleting = bulkDeleteMutation.isPending;

  useEffect(() => {
    if (data && page > data.totalPages)
      updateUrl({ page: String(data.totalPages) });
  }, [data, page, updateUrl]);

  function handleSortChange(nextSortBy: SortKey) {
    if (sortBy !== nextSortBy) {
      updateUrl({ page: "1", sortBy: nextSortBy, sortDirection: "asc" });
    } else if (sortDirection === "asc") {
      updateUrl({ page: "1", sortDirection: "desc" });
    } else {
      updateUrl({ page: "1", sortBy: null, sortDirection: null });
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
            <Calculator className="h-4 w-4" />
            <span>ROAS de Equilíbrio</span>
            <span className="text-muted-foreground/50">/</span>
            <span className="text-muted-foreground">Simulações</span>
          </div>
          <h1 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-foreground sm:text-4xl">
            Cenários de ROAS, prontos para comparar.
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Salve a margem de cada produto, revise o ROAS mínimo e ajuste o
            cenário quando precisar.
          </p>
        </div>
        <Button asChild size="sm">
          <Link href="/app/pricing/break-even-roas">
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
          <SearchInput
            initialValue={search}
            key={search}
            onDebouncedChange={handleSearchChange}
          />
        </div>

        <SimulationSelectionActionBar
          allVisibleSelected={allVisibleSelected}
          isDeleting={isDeleting}
          onClear={() => setSelectedIds([])}
          onDelete={() => {
            setDeleteError(null);
            setIsDeleteModalOpen(true);
          }}
          onSelectPage={() =>
            setSelectedIds((current) =>
              toggleVisibleSelection(current, visibleIds),
            )
          }
          selectedCount={selectedIds.length}
          visibleCount={visibleIds.length}
        />

        {query.isPending ? (
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
              {search
                ? "Nenhuma simulação encontrada"
                : "Sua biblioteca começa aqui"}
            </h2>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
              {search
                ? "Tente outro Produto ou SKU."
                : "Identifique o produto na calculadora e salve o primeiro cenário de ROAS."}
            </p>
            {!search && (
              <Button asChild className="mt-5" size="sm" variant="secondary">
                <Link href="/app/pricing/break-even-roas">
                  Começar uma Simulação
                </Link>
              </Button>
            )}
          </div>
        ) : (
          <>
            <Table
              allVisibleSelected={allVisibleSelected}
              items={data.items}
              onSelect={(simulation) =>
                router.push(
                  `/app/pricing/break-even-roas/simulations/${simulation.id}`,
                )
              }
              onSortChange={handleSortChange}
              onToggleSelected={(id) =>
                setSelectedIds((current) => toggleSelectedId(current, id))
              }
              onToggleVisibleSelection={() =>
                setSelectedIds((current) =>
                  toggleVisibleSelection(current, visibleIds),
                )
              }
              selectedIds={selectedIds}
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

      <Modal
        onClose={() => {
          if (!isDeleting) setIsDeleteModalOpen(false);
        }}
        open={isDeleteModalOpen}
        title="Excluir simulações?"
      >
        <div className="space-y-5">
          <p className="text-sm leading-relaxed text-muted-foreground">
            Você está prestes a excluir {selectedIds.length} simulaç
            {selectedIds.length === 1 ? "ão" : "ões"} selecionada
            {selectedIds.length === 1 ? "" : "s"}. Esta ação é definitiva e não
            poderá ser desfeita.
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
              onClick={() => setIsDeleteModalOpen(false)}
              size="sm"
              variant="secondary"
            >
              Cancelar
            </Button>
            <Button
              disabled={isDeleting || selectedIds.length === 0}
              loading={isDeleting}
              onClick={() => {
                setDeleteError(null);
                bulkDeleteMutation.mutate(selectedIds);
              }}
              size="sm"
              variant="danger"
            >
              <Trash2 className="h-3.5 w-3.5" />
              {isDeleting ? "Excluindo..." : "Excluir"}
            </Button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
}
