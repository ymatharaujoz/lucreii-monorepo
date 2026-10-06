"use client";

import React, { useMemo, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Filter,
  Package,
  Search,
  Store,
  X,
} from "lucide-react";
import { Badge, Card, EmptyState, cn } from "@lucreii/ui";
import { CopyButton } from "@/components/ui-premium/copy-button";
import { Pagination } from "@/components/ui-premium/pagination";
import { slideInUpVariants } from "@/lib/animations";
import { ProductDetailsModal } from "./product-details-modal";
import { TreeConnector, VariationToggle } from "./variation-tree";
import type { PaginationState, ProductTableRow } from "../types/products";
import {
  formatMoney,
  formatNumber,
  formatPercent,
  formatPercentPtBr,
} from "../utils/formatters";

const MotionTableRow = motion.tr;

interface ProductTableProps {
  rows: ProductTableRow[];
  pagination: PaginationState;
  onPageChange: (page: number) => void;
  className?: string;
  error?: boolean;
  loading?: boolean;
  searchFilter?: string;
  selectedMarketplaces?: string[];
  serverMode?: boolean;
  sortConfig?: {
    key: SortKey;
    direction: SortDirection;
  } | null;
  onSaveAdvertising?: (row: ProductTableRow, amount: string) => Promise<void>;
  onSearchFilterChange?: (value: string) => void;
  onSelectedMarketplacesChange?: (value: string[]) => void;
  onSortChange?: (value: { key: SortKey; direction: SortDirection } | null) => void;
}

type SortKey =
  | "channelLabel"
  | "parentName"
  | "variationName"
  | "sales"
  | "sellingPrice"
  | "contributionMarginRatio"
  | "totalProfit";

type SortDirection = "asc" | "desc" | null;

type DisplayRow = {
  row: ProductTableRow;
  channelLabel: string;
  sales: number;
  sellingPrice: number;
  contributionMarginRatio: number | null;
  displayTitle: string;
  parentName: string;
  variationName: string | null;
  totalProfit: number | null;
  hasCostsConfigured: boolean;
  childRows: DisplayRow[];
};

function compareSortValues(
  a: string | number | null | undefined,
  b: string | number | null | undefined,
  direction: "asc" | "desc",
): number {
  const aNull = a === null || a === undefined || (typeof a === "number" && !Number.isFinite(a));
  const bNull = b === null || b === undefined || (typeof b === "number" && !Number.isFinite(b));

  if (aNull && bNull) {
    return 0;
  }
  if (aNull) {
    return 1;
  }
  if (bNull) {
    return -1;
  }
  if (typeof a === "string" && typeof b === "string") {
    return direction === "asc" ? a.localeCompare(b) : b.localeCompare(a);
  }

  const an = Number(a);
  const bn = Number(b);
  return direction === "asc" ? an - bn : bn - an;
}

const marketplaceOptions = [
  { value: "mercadolivre", label: "MELI" },
  { value: "shopee", label: "Shopee" },
  { value: "shein", label: "Shein" },
];

function getChannelBadge(channel: string) {
  const normalized = channel.trim().toLowerCase();

  if (normalized === "mercadolivre") {
    return (
      <Badge
        className="border-transparent"
        style={{ backgroundColor: "#ffe600", color: "#000000" }}
      >
        MELI
      </Badge>
    );
  }

  if (normalized === "shopee") {
    return (
      <Badge
        className="border-transparent"
        style={{ backgroundColor: "#fa5230", color: "#ffffff" }}
      >
        SHPE
      </Badge>
    );
  }

  if (normalized === "shein") {
    return (
      <Badge
        className="border-transparent"
        style={{ backgroundColor: "#111111", color: "#ffffff" }}
      >
        Shein
      </Badge>
    );
  }

  return <Badge>{channel}</Badge>;
}

function ProductImagePreview({
  alt,
  url,
}: {
  alt: string;
  url: string | null;
}) {
  const [failed, setFailed] = useState(false);

  if (!url || failed) {
    return (
      <div
        aria-label={`Sem foto para ${alt}`}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-surface-strong text-muted-foreground"
      >
        <Package className="h-4 w-4" />
      </div>
    );
  }

  return (
    <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-[var(--radius-md)] bg-surface-strong">
      <Image
        alt={alt}
        className="object-cover"
        fill
        onError={() => setFailed(true)}
        sizes="40px"
        src={url}
      />
    </div>
  );
}

function normalizeText(value: string | null | undefined) {
  return value?.trim() ?? "";
}

function looksLikeVariation(value: string) {
  return value.includes(":") || value.toLowerCase().startsWith("varia");
}

function resolveProductLabels(
  row: ProductTableRow,
  parentRow?: ProductTableRow | null,
): Pick<DisplayRow, "parentName" | "variationName"> {
  const rowName = normalizeText(row.name);
  const rowDisplayName = normalizeText(row.displayName);
  const rowVariation = normalizeText(row.variationLabel);

  if (parentRow) {
    const parentName =
      normalizeText(parentRow.displayName) ||
      normalizeText(parentRow.name) ||
      rowDisplayName ||
      rowName ||
      "Produto";
    const variationName =
      rowVariation ||
      [rowDisplayName, rowName].find((value) => value && value !== parentName) ||
      null;

    return { parentName, variationName };
  }

  if (rowVariation) {
    const suffix = ` - ${rowVariation}`;
    const sourceWithSuffix = [rowDisplayName, rowName].find(
      (value) => value && value.endsWith(suffix),
    );

    if (sourceWithSuffix) {
      return {
        parentName: sourceWithSuffix.slice(0, -suffix.length),
        variationName: rowVariation,
      };
    }

    const explicitParent = [rowDisplayName, rowName].find(
      (value) => value && value !== rowVariation && !looksLikeVariation(value),
    );

    if (explicitParent) {
      return { parentName: explicitParent, variationName: rowVariation };
    }

    const fallbackVariation = rowDisplayName || rowName;
    return {
      parentName: rowVariation,
      variationName: fallbackVariation !== rowVariation ? fallbackVariation : null,
    };
  }

  if (rowDisplayName && rowName && rowDisplayName !== rowName) {
    const parentName = looksLikeVariation(rowDisplayName) ? rowName : rowDisplayName;
    const variationName = parentName === rowName ? rowDisplayName : rowName;

    return { parentName, variationName };
  }

  return { parentName: rowDisplayName || rowName || "Produto", variationName: null };
}

function getSignedColorClass(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value) || value === 0) {
    return "text-foreground";
  }

  return value > 0 ? "text-success" : "text-error";
}

/**
 * Profit and margin after advertising, derived from the values shown in the
 * LUCRO TOTAL, PUBLICIDADE and FATURAMENTO columns. Returns `null` for rows
 * without an advertising value of their own (variation rows).
 */
function computeAdvertisingResult(input: {
  advertising: number | null;
  revenue: number;
  totalProfit: number | null;
}) {
  if (input.advertising === null) {
    return null;
  }

  if (input.totalProfit === null) {
    return { marginPercent: null, profit: null };
  }

  const profit = Number((input.totalProfit - input.advertising).toFixed(2));

  return {
    marginPercent: input.revenue > 0 ? (profit / input.revenue) * 100 : null,
    profit,
  };
}

function buildDisplayTitle(parentName: string, variationName: string | null) {
  return variationName ? `${parentName} | ${variationName}` : parentName;
}

function getPerformanceRowKey(row: ProductTableRow) {
  return (
    row.performanceId ||
    [
      row.referenceMonth,
      row.channelLabel,
      row.productId || row.sku || row.id,
      row.variationLabel || "",
    ].join("::")
  );
}

function findRowByKey(
  rows: ProductTableRow[],
  key: string,
): ProductTableRow | null {
  for (const row of rows) {
    if (getPerformanceRowKey(row) === key) {
      return row;
    }

    const child = findRowByKey(row.children, key);

    if (child) {
      return child;
    }
  }

  return null;
}

function buildDisplayRows(rows: ProductTableRow[]): DisplayRow[] {
  return rows.flatMap((row) => {
    const sourceRows =
      row.catalogRole === "parent" && row.children.length > 0
        ? row.children.map((child) => ({ parentRow: row, row: child }))
        : [{ parentRow: null, row }];

    return sourceRows.map(({ parentRow, row: sourceRow }) => {
      const { parentName, variationName } = resolveProductLabels(sourceRow, parentRow);

      return {
        channelLabel: sourceRow.channelLabel,
        contributionMarginRatio: sourceRow.contributionMarginRatio,
        displayTitle: buildDisplayTitle(parentName, variationName),
        hasCostsConfigured: sourceRow.unitCost > 0 && sourceRow.packagingCost > 0,
        parentName,
        row: sourceRow,
        sales: sourceRow.sales,
        sellingPrice: sourceRow.sellingPrice,
        totalProfit:
          sourceRow.unitProfit === null ? null : sourceRow.unitProfit * sourceRow.netLiquidSales,
        variationName,
        childRows: [],
      };
    });
  });
}

function toServerDisplayRow(
  row: ProductTableRow,
  parentRow: ProductTableRow | null = null,
): DisplayRow {
  const { parentName, variationName } = resolveProductLabels(row, parentRow);
  const displayedSales = Math.max(0, row.sales);
  const displayedRevenue = row.sellingPrice * displayedSales;
  const displayedTotalProfit =
    displayedSales > 0 && Number.isFinite(row.totalProfit)
      ? row.totalProfit
      : 0;

  return {
    channelLabel: row.channelLabel,
    childRows: row.children.map((child) => toServerDisplayRow(child, row)),
    contributionMarginRatio:
      displayedRevenue > 0
        ? (displayedTotalProfit / displayedRevenue) * 100
        : null,
    displayTitle: buildDisplayTitle(parentName, variationName),
    hasCostsConfigured: row.unitCost > 0 && row.packagingCost > 0,
    parentName,
    row,
    sales: displayedSales,
    sellingPrice: displayedRevenue,
    totalProfit: displayedTotalProfit,
    variationName,
  };
}

function buildServerDisplayRows(rows: ProductTableRow[]): DisplayRow[] {
  return rows.map((row) => toServerDisplayRow(row));
}

export function ProductTable({
  rows,
  pagination,
  onPageChange,
  className = "",
  error = false,
  loading = false,
  searchFilter: controlledSearchFilter,
  selectedMarketplaces: controlledSelectedMarketplaces,
  serverMode = false,
  sortConfig: controlledSortConfig,
  onSaveAdvertising,
  onSearchFilterChange,
  onSelectedMarketplacesChange,
  onSortChange,
}: ProductTableProps) {
  const [uncontrolledSortConfig, setUncontrolledSortConfig] = useState<{
    key: SortKey;
    direction: SortDirection;
  } | null>(null);
  const [uncontrolledSearchFilter, setUncontrolledSearchFilter] = useState("");
  const [uncontrolledSelectedMarketplaces, setUncontrolledSelectedMarketplaces] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedRow, setSelectedRow] = useState<ProductTableRow | null>(null);
  const [expandedGroupKeys, setExpandedGroupKeys] = useState<string[]>([]);

  // After saving, the list is refetched: follow the row by key so the open
  // details modal shows the fresh values instead of the clicked snapshot.
  const openRow = useMemo(
    () =>
      selectedRow
        ? (findRowByKey(rows, getPerformanceRowKey(selectedRow)) ?? selectedRow)
        : null,
    [rows, selectedRow],
  );

  const sortConfig = controlledSortConfig ?? uncontrolledSortConfig;
  const searchFilter = controlledSearchFilter ?? uncontrolledSearchFilter;
  const selectedMarketplaces =
    controlledSelectedMarketplaces ?? uncontrolledSelectedMarketplaces;

  const displayRows = useMemo(() => {
    if (!serverMode) {
      return buildDisplayRows(rows);
    }

    return buildServerDisplayRows(rows);
  }, [rows, serverMode]);

  const setSearchFilter = (value: string) => {
    onSearchFilterChange?.(value);
    if (controlledSearchFilter === undefined) {
      setUncontrolledSearchFilter(value);
    }
  };

  const setSelectedMarketplaces = (value: string[]) => {
    onSelectedMarketplacesChange?.(value);
    if (controlledSelectedMarketplaces === undefined) {
      setUncontrolledSelectedMarketplaces(value);
    }
  };

  const setSortConfig = (
    value: {
      key: SortKey;
      direction: SortDirection;
    } | null,
  ) => {
    onSortChange?.(value);
    if (controlledSortConfig === undefined) {
      setUncontrolledSortConfig(value);
    }
  };

  const handleSort = (key: SortKey) => {
    let direction: SortDirection = "asc";

    if (sortConfig?.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    } else if (sortConfig?.key === key && sortConfig.direction === "desc") {
      direction = null;
    }

    setSortConfig(direction ? { key, direction } : null);
  };

  const filteredRows = useMemo(() => {
    if (serverMode) {
      return displayRows;
    }

    let result = [...displayRows];

    if (searchFilter.trim()) {
      const search = searchFilter.toLowerCase().trim();
      result = result.filter(({ parentName, row, variationName }) => {
        return (
          parentName.toLowerCase().includes(search) ||
          row.name.toLowerCase().includes(search) ||
          row.displayName.toLowerCase().includes(search) ||
          row.sku.toLowerCase().includes(search) ||
          variationName?.toLowerCase().includes(search) ||
          row.variationLabel?.toLowerCase().includes(search)
        );
      });
    }

    if (selectedMarketplaces.length > 0) {
      result = result.filter(({ row }) => selectedMarketplaces.includes(row.channelLabel));
    }

    if (sortConfig) {
      const { direction, key } = sortConfig;
      result.sort((a, b) => compareSortValues(a[key], b[key], direction ?? "asc"));
    }

    return result;
  }, [displayRows, searchFilter, selectedMarketplaces, sortConfig]);

  const filteredTotalPages = serverMode
    ? pagination.totalPages
    : Math.max(1, Math.ceil(filteredRows.length / pagination.pageSize));
  const safeCurrentPage = serverMode
    ? pagination.currentPage
    : Math.min(pagination.currentPage, filteredTotalPages);

  const visibleRows = useMemo(() => {
    if (serverMode) {
      return filteredRows;
    }

    const start = (safeCurrentPage - 1) * pagination.pageSize;
    const end = start + pagination.pageSize;
    return filteredRows.slice(start, end);
  }, [filteredRows, pagination.pageSize, safeCurrentPage, serverMode]);

  const hasActiveFilters = searchFilter.trim() || selectedMarketplaces.length > 0;

  const clearAllFilters = () => {
    setSearchFilter("");
    setSelectedMarketplaces([]);
  };

  const openDetails = (row: ProductTableRow) => {
    setSelectedRow(row);
  };

  const closeDetails = () => {
    setSelectedRow(null);
  };

  const toggleGroup = (groupKey: string) => {
    setExpandedGroupKeys((current) =>
      current.includes(groupKey)
        ? current.filter((value) => value !== groupKey)
        : [...current, groupKey],
    );
  };

  const renderRowCells = (
    {
      contributionMarginRatio,
      displayTitle,
      hasCostsConfigured,
      parentName,
      row,
      sellingPrice,
      totalProfit,
    }: DisplayRow,
    options: {
      childCount?: number;
      isChild: boolean;
      isExpanded?: boolean;
      isLastChild?: boolean;
    },
  ) => {
    const advertisingResult = computeAdvertisingResult({
      advertising: row.advertising,
      revenue: sellingPrice,
      totalProfit,
    });

    return (
      <>
        <td className="px-3 py-3 text-left">{getChannelBadge(row.channelLabel)}</td>
        <td className="px-3 py-3 text-left">
          <div className="flex items-center gap-3">
            {options.isChild ? <TreeConnector isLast={Boolean(options.isLastChild)} /> : null}
            <ProductImagePreview alt={parentName} url={row.coverImageUrl} />
            <span
              aria-label={hasCostsConfigured ? "Precificado" : "Não precificado"}
              className={cn(
                "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
                hasCostsConfigured
                  ? "border-success/30 bg-success/10"
                  : "border-warning/30 bg-warning/10",
              )}
              data-testid={`cost-status-${getPerformanceRowKey(row)}`}
              title={hasCostsConfigured ? "Precificado" : "Não precificado"}
            >
              <DollarSign
                aria-hidden="true"
                className="h-3.5 w-3.5"
                style={{ color: hasCostsConfigured ? "#0e7a6f" : "#f59e0b" }}
              />
            </span>
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-medium text-foreground">{displayTitle}</span>
              {options.childCount ? (
                <VariationToggle
                  count={options.childCount}
                  expanded={Boolean(options.isExpanded)}
                  onToggle={() => toggleGroup(getPerformanceRowKey(row))}
                />
              ) : null}
            </div>
          </div>
        </td>
        <td className="px-3 py-3 text-left">
          <span className="flex items-center gap-1.5">
            <span className="text-xs font-mono text-muted-foreground">{row.sku || "\u2014"}</span>
            {row.sku ? <CopyButton label="SKU" value={row.sku} /> : null}
          </span>
        </td>
        <td className="px-2 py-3 text-right">
          <span className="text-sm text-foreground">{formatNumber(row.sales)}</span>
        </td>
        <td className="px-2 py-3 text-right">
          <span className="text-sm text-foreground">{formatNumber(row.returns)}</span>
        </td>
        <td className="px-3 py-3 text-right">
          <span className="text-sm text-foreground">{formatMoney(sellingPrice)}</span>
        </td>
        <td className="px-3 py-3 text-right">
          <span
            className={cn(
              "text-sm font-semibold tabular-nums",
              getSignedColorClass(contributionMarginRatio),
            )}
          >
            {formatPercent(contributionMarginRatio, { digits: 2 })}
          </span>
        </td>
        <td className="px-3 py-3 text-right">
          <span
            className={cn(
              "text-sm font-semibold tabular-nums",
              getSignedColorClass(totalProfit),
            )}
          >
            {formatMoney(totalProfit)}
          </span>
        </td>
        {/* Advertising lives on the listing: variation rows show "--". */}
        <td className="px-3 py-3 text-right">
          <span className="text-sm font-semibold tabular-nums text-warning">
            {row.advertising === null ? "--" : formatMoney(row.advertising)}
          </span>
        </td>
        <td className="px-3 py-3 text-right">
          <span
            className={cn(
              "text-sm font-semibold tabular-nums",
              getSignedColorClass(advertisingResult?.marginPercent),
            )}
          >
            {advertisingResult === null
              ? "--"
              : formatPercentPtBr(advertisingResult.marginPercent, { digits: 2 })}
          </span>
        </td>
        <td className="px-3 py-3 text-right">
          <span
            className={cn(
              "text-sm font-semibold tabular-nums",
              getSignedColorClass(advertisingResult?.profit),
            )}
          >
            {advertisingResult === null ? "--" : formatMoney(advertisingResult.profit)}
          </span>
        </td>
      </>
    );
  };

  const rowInteractionProps = (row: ProductTableRow) => ({
    onClick: () => openDetails(row),
    onKeyDown: (event: React.KeyboardEvent) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openDetails(row);
      }
    },
    role: "button" as const,
    tabIndex: 0,
  });

  const SortIcon = ({ column }: { column: SortKey }) => {
    if (sortConfig?.key !== column) {
      return <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/50" />;
    }

    return sortConfig.direction === "asc" ? (
      <ChevronUp className="h-3.5 w-3.5 text-accent" />
    ) : (
      <ChevronDown className="h-3.5 w-3.5 text-accent" />
    );
  };

  if (displayRows.length === 0 && !loading && !error) {
    return (
      <Card padding="lg" className={className}>
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-foreground">Produtos</h3>
          <p className="text-xs text-muted-foreground">Grade mensal de produtos</p>
        </div>
        <EmptyState
          title="Nenhum dado mensal neste mês"
          description="Selecione outra competência"
          icon={<Package className="h-6 w-6" />}
        />
      </Card>
    );
  }

  return (
    <motion.div variants={slideInUpVariants} className={cn("flex flex-1 min-h-0", className)}>
      <Card padding="lg" className="min-w-0 flex flex-1 flex-col overflow-hidden min-h-0">
        <div className="mb-4 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Produtos</h3>
            <p className="text-xs text-muted-foreground/70">Grade mensal de produtos</p>
          </div>

          <button
            onClick={() => setShowFilters((value) => !value)}
            className={`inline-flex items-center gap-1.5 rounded-[var(--radius-md)] px-3 py-1.5 text-xs font-medium transition-all duration-[var(--transition-fast)] ${
              showFilters || hasActiveFilters
                ? "bg-accent text-accent-foreground shadow-sm"
                : "border border-border bg-surface-strong text-muted-foreground hover:border-border-strong hover:text-foreground"
            }`}
          >
            <Filter className="h-3.5 w-3.5" />
            Filtros
          </button>
        </div>

        {showFilters ? (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-5 rounded-[var(--radius-lg)] border border-border bg-surface-strong/50 p-4 shrink-0"
          >
            <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-start">
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                  <Search className="h-3.5 w-3.5 text-accent" />
                  Buscar produto
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={searchFilter}
                    onChange={(event) => setSearchFilter(event.target.value)}
                    placeholder="Nome ou SKU do produto..."
                    className="h-9 w-full rounded-[var(--radius-md)] border border-border bg-background px-3 pr-8 text-sm text-foreground placeholder:text-muted-foreground/60 transition-all duration-[var(--transition-fast)] hover:border-border-strong focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                  />
                  {searchFilter ? (
                    <button
                      onClick={() => setSearchFilter("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  ) : (
                    <Search className="absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/50" />
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                  <Store className="h-3.5 w-3.5 text-accent" />
                  Marketplace
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {marketplaceOptions.map((option) => {
                    const isSelected = selectedMarketplaces.includes(option.value);

                    return (
                      <button
                        key={option.value}
                        onClick={() => {
                          const next = isSelected
                            ? selectedMarketplaces.filter((value) => value !== option.value)
                            : [...selectedMarketplaces, option.value];
                          setSelectedMarketplaces(next);
                        }}
                        className={`inline-flex items-center gap-1.5 rounded-[var(--radius-md)] px-3 py-1.5 text-xs font-medium transition-all duration-[var(--transition-fast)] ${
                          isSelected
                            ? "bg-accent text-accent-foreground shadow-sm"
                            : "border border-border bg-background text-muted-foreground hover:border-border-strong hover:text-foreground"
                        }`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {hasActiveFilters ? (
              <div className="mt-4 flex items-center justify-between gap-3 border-t border-border/60 pt-4">
                <p className="text-xs text-muted-foreground">
                  {filteredRows.length} resultado{filteredRows.length === 1 ? "" : "s"} encontrado
                  {filteredRows.length === 1 ? "" : "s"}.
                </p>
                <button
                  onClick={clearAllFilters}
                  className="text-xs font-medium text-accent transition-colors hover:text-accent/80"
                >
                  Limpar filtros
                </button>
              </div>
            ) : null}
          </motion.div>
        ) : null}

        <div className="flex-1 min-h-0 overflow-auto">
          <table className="w-full min-w-[2000px] border-separate border-spacing-0">
            <thead>
              <tr className="border-b border-border bg-surface-strong/95">
                <th
                  onClick={() => handleSort("channelLabel")}
                  className="sticky top-0 z-10 px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground cursor-pointer select-none hover:text-foreground bg-surface-strong/95"
                >
                  <div className="flex items-center gap-1">
                    Canal
                    <SortIcon column="channelLabel" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort("parentName")}
                  className="sticky top-0 z-10 w-[520px] min-w-[520px] px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground cursor-pointer select-none hover:text-foreground bg-surface-strong/95"
                >
                  <div className="flex items-center gap-1">
                    Produto
                    <SortIcon column="parentName" />
                  </div>
                </th>
                <th className="sticky top-0 z-10 px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground bg-surface-strong/95 min-w-[100px]">
                  SKU
                </th>
                <th
                  onClick={() => handleSort("sales")}
                  className="sticky top-0 z-10 px-2 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground cursor-pointer select-none hover:text-foreground bg-surface-strong/95"
                >
                  <div className="flex items-center justify-end gap-1">
                    Vendas
                    <SortIcon column="sales" />
                  </div>
                </th>
                <th className="sticky top-0 z-10 px-2 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground bg-surface-strong/95">
                  DEVOLUÇÕES
                </th>
                <th
                  onClick={() => handleSort("sellingPrice")}
                  className="sticky top-0 z-10 px-3 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground cursor-pointer select-none hover:text-foreground bg-surface-strong/95 min-w-[160px]"
                >
                  <div className="flex items-center justify-end gap-1">
                    FATURAMENTO
                    <SortIcon column="sellingPrice" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort("contributionMarginRatio")}
                  className="sticky top-0 z-10 px-3 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground cursor-pointer select-none hover:text-foreground bg-surface-strong/95 min-w-[250px] whitespace-nowrap"
                >
                  <div className="flex items-center justify-end gap-1">
                    Margem de Contribuição
                    <SortIcon column="contributionMarginRatio" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort("totalProfit")}
                  className="sticky top-0 z-10 px-3 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground cursor-pointer select-none hover:text-foreground bg-surface-strong/95 min-w-[140px]"
                >
                  <div className="flex items-center justify-end gap-1">
                    Lucro Total
                    <SortIcon column="totalProfit" />
                  </div>
                </th>
                <th className="sticky top-0 z-10 whitespace-nowrap px-3 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground bg-surface-strong/95 min-w-[140px]">
                  Publicidade
                </th>
                <th className="sticky top-0 z-10 whitespace-nowrap px-3 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground bg-surface-strong/95 min-w-[210px]">
                  Margem Após Publicidade
                </th>
                <th className="sticky top-0 z-10 whitespace-nowrap px-3 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground bg-surface-strong/95 min-w-[190px]">
                  Lucro Após Publicidade
                </th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={11} className="px-3 py-10 text-center text-sm text-muted-foreground">
                    Carregando produtos...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={11} className="px-3 py-10 text-center text-sm text-muted-foreground">
                    Nao foi possivel carregar os produtos.
                  </td>
                </tr>
              ) : visibleRows.map((displayRow, index) => {
                const { childRows, row } = displayRow;
                const groupKey = getPerformanceRowKey(row);
                const isExpanded = childRows.length > 0 && expandedGroupKeys.includes(groupKey);

                return (
                  <React.Fragment key={groupKey}>
                    <MotionTableRow
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03 }}
                      className="cursor-pointer border-b border-border/50 outline-none transition-colors hover:bg-surface-strong/30 focus-visible:bg-accent/5 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/30"
                      {...rowInteractionProps(row)}
                    >
                      {renderRowCells(displayRow, {
                        childCount: childRows.length,
                        isChild: false,
                        isExpanded,
                      })}
                    </MotionTableRow>
                    {isExpanded
                      ? childRows.map((childRow, childIndex) => (
                          <tr
                            key={getPerformanceRowKey(childRow.row)}
                            className="cursor-pointer border-b border-border/30 outline-none transition-colors hover:bg-surface-strong/20 focus-visible:bg-accent/5 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/30"
                            data-testid="child-product-row"
                            {...rowInteractionProps(childRow.row)}
                          >
                            {renderRowCells(childRow, {
                              isChild: true,
                              isLastChild: childIndex === childRows.length - 1,
                            })}
                          </tr>
                        ))
                      : null}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        {!loading && !error && filteredRows.length === 0 ? (
          <div className="shrink-0 rounded-[var(--radius-lg)] border border-dashed border-border/70 bg-background-soft/60 px-6 py-10 text-center">
            <p className="text-sm font-medium text-foreground">Nenhum produto encontrado</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Ajuste os filtros para visualizar outros SKUs ou canais.
            </p>
          </div>
        ) : null}

        {filteredRows.length > 0 ? (
          <div className="shrink-0 pt-4">
            <Pagination
              currentPage={safeCurrentPage}
              onPageChange={onPageChange}
              totalPages={filteredTotalPages}
            />
          </div>
        ) : null}
      </Card>
      <ProductDetailsModal
        onClose={closeDetails}
        onSaveAdvertising={onSaveAdvertising}
        open={selectedRow !== null}
        row={openRow}
      />
    </motion.div>
  );
}
