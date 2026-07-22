"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  DollarSign,
  Percent,
  Scale,
  Settings2,
  PiggyBank,
} from "lucide-react";
import type {
  Company,
  DashboardProfitabilityResponse,
  DashboardSummaryResponse,
  OrdersListSummary,
} from "@lucreii/types";
import { ApiClientError, apiClient } from "@/lib/api/client";
import { containerVariants, itemVariants } from "@/lib/animations";
import { Card, Button, Input } from "@lucreii/ui";
import {
  buildCompanyDefaultsPatch,
  formatCurrencyInput,
} from "./company-finance-defaults";
import { formatMoney, formatPercent } from "../utils/formatters";

interface DashboardFinancialIndicatorsProps {
  activeCompany: Company | null;
  data: DashboardProfitabilityResponse;
  ordersSummary?: OrdersListSummary;
  summary?: DashboardSummaryResponse;
}

interface IndicatorCardProps {
  label: string;
  value: string;
  subValue?: string;
  icon: React.ReactNode;
  variant?: "default" | "success" | "warning" | "error";
  trend?: {
    direction: "up" | "down" | "neutral";
    value: string;
  };
}

const variantStyles = {
  default: "border-border bg-surface-strong",
  success: "border-success/20 bg-success-soft/30",
  warning: "border-warning/20 bg-warning-soft/30",
  error: "border-error/20 bg-error-soft/30",
};

const iconBgStyles = {
  default: "bg-foreground/5 text-muted-foreground",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  error: "bg-error/10 text-error",
};

function IndicatorCard({
  label,
  value,
  subValue,
  icon,
  variant = "default",
  trend,
}: IndicatorCardProps) {
  const TrendIcon =
    trend?.direction === "up"
      ? TrendingUp
      : trend?.direction === "down"
        ? TrendingDown
        : Minus;

  const trendColorClass =
    trend?.direction === "up"
      ? "text-success"
      : trend?.direction === "down"
        ? "text-error"
        : "text-muted-foreground";

  return (
    <motion.div
      variants={itemVariants}
      className={`
        relative overflow-hidden rounded-[var(--radius-lg)] border p-5
        shadow-[var(--shadow-xs)] transition-all duration-[var(--transition-fast)]
        hover:shadow-[var(--shadow-sm)] hover:-translate-y-0.5
        ${variantStyles[variant]}
      `}
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className={`
                inline-flex h-5 w-5 items-center justify-center rounded-md
                ${iconBgStyles[variant]}
              `}
            >
              {icon}
            </span>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {label}
            </p>
          </div>

          <p className="mt-3 text-2xl font-semibold tracking-tight text-foreground sm:text-[28px]">
            {value}
          </p>

          {subValue && (
            <p className="mt-1 text-xs text-muted-foreground">{subValue}</p>
          )}

          {trend && (
            <div className="mt-2 flex items-center gap-1.5">
              <TrendIcon className={`h-3.5 w-3.5 ${trendColorClass}`} />
              <span className={`text-xs font-medium ${trendColorClass}`}>
                {trend.value}
              </span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function normalizeNumber(value: string | number | undefined | null): number {
  if (value === undefined || value === null) return 0;
  const parsed = typeof value === "string" ? Number.parseFloat(value) : value;
  return Number.isFinite(parsed) ? parsed : 0;
}

export function DashboardFinancialIndicators({
  activeCompany,
  data,
  ordersSummary,
  summary,
}: DashboardFinancialIndicatorsProps) {
  const [fixedCost, setFixedCost] = useState<number>(0);
  const [taxPercent, setTaxPercent] = useState<number>(0);
  const [fixedCostInput, setFixedCostInput] = useState("0,00");
  const [taxPercentInput, setTaxPercentInput] = useState("0,00");
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  useEffect(() => {
    const nextFixedCost = activeCompany
      ? Number.parseFloat(activeCompany.fixedCostDefault) || 0
      : 0;
    const nextTaxPercent = activeCompany
      ? (Number.parseFloat(activeCompany.taxRateDefault) || 0) * 100
      : 0;

    setFixedCost(nextFixedCost);
    setTaxPercent(nextTaxPercent);
    setFixedCostInput(formatCurrencyInput(nextFixedCost));
    setTaxPercentInput(formatCurrencyInput(nextTaxPercent));
  }, [activeCompany]);

  const cancelEditing = useCallback(() => {
    setFixedCostInput(formatCurrencyInput(fixedCost));
    setTaxPercentInput(formatCurrencyInput(taxPercent));
    setFeedbackMessage(null);
    setIsEditing(false);
  }, [fixedCost, taxPercent]);

  const saveCompanyDefaults = useCallback(async () => {
    if (!activeCompany) {
      setFeedbackMessage("Nenhuma empresa ativa disponível para salvar");
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    setFeedbackMessage(null);

    try {
      const patch = buildCompanyDefaultsPatch({
        fixedCostInput,
        taxPercentInput,
      });
      const response = await apiClient.patch<{ data: Company; error: null }>(
        `/companies/${activeCompany.id}`,
        {
          body: patch,
        },
      );
      const nextFixedCost =
        Number.parseFloat(response.data.fixedCostDefault) || 0;
      const nextTaxPercent =
        (Number.parseFloat(response.data.taxRateDefault) || 0) * 100;

      setFixedCost(nextFixedCost);
      setTaxPercent(nextTaxPercent);
      setFixedCostInput(formatCurrencyInput(nextFixedCost));
      setTaxPercentInput(formatCurrencyInput(nextTaxPercent));
      setFeedbackMessage("Valores salvos.");
      setIsEditing(false);
    } catch (error) {
      setFeedbackMessage(
        error instanceof ApiClientError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Não foi possivel salvar os valores da empresa",
      );
    } finally {
      setIsSaving(false);
    }
  }, [activeCompany, fixedCostInput, taxPercentInput]);

  const totalRevenue = ordersSummary
    ? normalizeNumber(ordersSummary.grossRevenue)
    : 0;
  const marginRevenue = ordersSummary
    ? normalizeNumber(ordersSummary.marginRevenue)
    : 0;
  const totalProfit = ordersSummary
    ? normalizeNumber(ordersSummary.totalProfit)
    : 0;
  const netProfit = totalProfit - fixedCost;
  const profitMarginRatio = totalRevenue > 0 ? totalProfit / totalRevenue : 0;
  const marginDisplayRatio =
    totalProfit !== 0 ? marginRevenue / totalProfit : 0;
  const breakEvenPoint =
    profitMarginRatio > 0 ? fixedCost / profitMarginRatio : 0;
  const revenueSub = ordersSummary
    ? `${ordersSummary.ordersCount} pedidos · ${ordersSummary.unitsSold} unidades`
    : summary
      ? `${summary.summary.ordersCount} pedidos · ${summary.summary.unitsSold} unidades`
      : `${data.products.length} produtos`;
  const netProfitPercentOfRevenue =
    totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-4"
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <IndicatorCard
          label="Faturamento"
          value={formatMoney(totalRevenue, { maximumFractionDigits: 2 })}
          subValue={revenueSub}
          icon={<DollarSign className="h-4 w-4" />}
          variant="default"
        />

        <IndicatorCard
          label="Margem Média"
          value={formatPercent(marginDisplayRatio, { digits: 2 })}
          subValue={`Lucro Total: ${formatMoney(totalProfit, { maximumFractionDigits: 2 })}`}
          icon={<Percent className="h-4 w-4" />}
          variant={
            profitMarginRatio > 0.2
              ? "success"
              : profitMarginRatio > 0
                ? "warning"
                : "error"
          }
          trend={{
            direction:
              profitMarginRatio > 0.3
                ? "up"
                : profitMarginRatio > 0
                  ? "neutral"
                  : "down",
            value: totalProfit >= 0 ? "Lucrativo" : "Prejuízo",
          }}
        />

        <IndicatorCard
          label="Ponto de Equilíbrio"
          value={formatMoney(breakEvenPoint, { maximumFractionDigits: 2 })}
          subValue="Meta para cobrir custo fixo"
          icon={<Scale className="h-4 w-4" />}
          variant={totalRevenue >= breakEvenPoint ? "success" : "warning"}
          trend={{
            direction: totalRevenue >= breakEvenPoint ? "up" : "down",
            value:
              totalRevenue >= breakEvenPoint
                ? "Meta atingida"
                : "Abaixo da meta",
          }}
        />

        <IndicatorCard
          label="Lucro Líquido"
          value={formatMoney(netProfit, { maximumFractionDigits: 2 })}
          subValue="Após custos fixos e publicidade"
          icon={<PiggyBank className="h-4 w-4" />}
          variant={
            netProfit > 0 ? "success" : netProfit < 0 ? "error" : "warning"
          }
          trend={{
            direction:
              netProfit > 0 ? "up" : netProfit < 0 ? "down" : "neutral",
            value:
              netProfit === 0
                ? "Break-even"
                : `${netProfitPercentOfRevenue.toFixed(1)}% do faturamento`,
          }}
        />
      </div>

      <motion.div variants={itemVariants}>
        <Card
          variant="outlined"
          className="px-4 py-3 bg-surface-elevated/40 border border-border/80 rounded-xl shadow-[var(--shadow-xs)] hover:border-border-strong transition-all duration-300 backdrop-blur-xs"
        >
          {isEditing ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center w-full">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center flex-1 min-w-0">
                <div className="flex items-center gap-2 min-w-0 sm:max-w-[200px] flex-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80 shrink-0">
                    Custo Fixo
                  </span>
                  <div className="relative flex-1 min-w-0">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-accent bg-accent-soft px-1.5 py-0.5 rounded-md select-none z-10">
                      R$
                    </span>
                    <Input
                      autoFocus
                      className="h-9 rounded-xl bg-background border border-border pl-10 pr-3 text-right text-xs font-semibold text-foreground shadow-[var(--shadow-xs)] hover:border-border-strong focus:border-accent/50 focus:ring-2 focus:ring-accent/15 focus:outline-none"
                      inputMode="decimal"
                      onChange={(event) =>
                        setFixedCostInput(event.target.value)
                      }
                      placeholder="0,00"
                      type="text"
                      value={fixedCostInput}
                    />
                  </div>
                </div>

                <span
                  aria-hidden
                  className="hidden sm:block h-4 w-px bg-border/60"
                />

                <div className="flex items-center gap-2 min-w-0 sm:max-w-[180px] flex-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80 shrink-0">
                    Imposto
                  </span>
                  <div className="relative flex-1 min-w-0">
                    <Input
                      className="h-9 rounded-xl bg-background border border-border pl-3 pr-10 text-right text-xs font-semibold text-foreground shadow-[var(--shadow-xs)] hover:border-border-strong focus:border-accent/50 focus:ring-2 focus:ring-accent/15 focus:outline-none"
                      inputMode="decimal"
                      onChange={(event) =>
                        setTaxPercentInput(event.target.value)
                      }
                      placeholder="0,00"
                      type="text"
                      value={taxPercentInput}
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-accent bg-accent-soft px-1.5 py-0.5 rounded-md select-none z-10">
                      %
                    </span>
                  </div>
                </div>
              </div>

              {feedbackMessage && (
                <p className="text-xs font-medium text-muted-foreground self-center px-2">
                  {feedbackMessage}
                </p>
              )}

              <div className="flex items-center gap-2 shrink-0 sm:ml-auto">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={isSaving}
                  className="rounded-xl px-3 py-1.5 text-xs font-semibold hover:bg-foreground/5 h-9"
                  onClick={cancelEditing}
                >
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  loading={isSaving}
                  className="rounded-xl bg-gradient-to-r from-accent to-accent-strong hover:from-accent-strong hover:to-accent px-4 py-1.5 text-xs font-bold text-white shadow-sm transition-all hover:-translate-y-0.5 active:scale-97 h-9"
                  onClick={() => {
                    void saveCompanyDefaults();
                  }}
                >
                  Salvar
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center justify-between w-full">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center flex-1">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent/8 text-accent">
                    <DollarSign className="h-4 w-4" />
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">
                      Custo Fixo
                    </span>
                    <span className="text-sm font-semibold tracking-tight text-foreground tabular-nums">
                      {formatMoney(fixedCost)}
                    </span>
                  </div>
                </div>

                <span
                  aria-hidden
                  className="hidden sm:block h-4 w-px bg-border/60"
                />

                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent/8 text-accent">
                    <Percent className="h-4 w-4" />
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">
                      Imposto
                    </span>
                    <span className="text-sm font-semibold tracking-tight text-foreground tabular-nums">
                      {formatCurrencyInput(taxPercent)}%
                    </span>
                  </div>
                </div>
              </div>

              <Button
                variant="secondary"
                size="sm"
                disabled={!activeCompany}
                className="rounded-xl px-4 py-1.5 text-xs font-semibold border border-border bg-surface-strong/60 text-foreground transition-all hover:border-border-strong active:scale-97 sm:ml-auto shrink-0"
                onClick={() => {
                  setFeedbackMessage(null);
                  setFixedCostInput(formatCurrencyInput(fixedCost));
                  setTaxPercentInput(formatCurrencyInput(taxPercent));
                  setIsEditing(true);
                }}
              >
                <Settings2 className="mr-1.5 h-3.5 w-3.5" />
                Editar
              </Button>
            </div>
          )}
        </Card>
      </motion.div>
    </motion.div>
  );
}
