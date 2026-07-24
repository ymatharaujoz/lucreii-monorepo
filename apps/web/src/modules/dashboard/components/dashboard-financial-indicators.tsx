"use client";

import { useCallback, useState } from "react";
import { motion } from "framer-motion";
import {
  DollarSign,
  Minus,
  Percent,
  PiggyBank,
  Scale,
  Settings2,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import type {
  Company,
  DashboardFinancialIndicators as DashboardFinancialIndicatorsData,
} from "@lucreii/types";
import { ApiClientError, apiClient } from "@/lib/api/client";
import { containerVariants, itemVariants } from "@/lib/animations";
import { Button, Card, Input } from "@lucreii/ui";
import {
  buildCompanyDefaultsPatch,
  formatCurrencyInput,
} from "./company-finance-defaults";
import { formatMoney } from "../utils/formatters";

interface DashboardFinancialIndicatorsProps {
  activeCompany: Company | null;
  financialIndicators: DashboardFinancialIndicatorsData;
  onDefaultsSaved?: () => void;
}

interface IndicatorCardProps {
  icon: React.ReactNode;
  label: string;
  subValue?: string;
  trend?: {
    direction: "up" | "down" | "neutral";
    value: string;
  };
  value: string;
  variant?: "default" | "success" | "warning" | "error";
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

function normalizeNumber(value: string | number | undefined | null): number {
  if (value === undefined || value === null) return 0;
  const parsed = typeof value === "string" ? Number.parseFloat(value) : value;
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatIndicatorPercent(value: string) {
  return `${normalizeNumber(value).toFixed(2)}%`;
}

function IndicatorCard({
  icon,
  label,
  subValue,
  trend,
  value,
  variant = "default",
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
      className={`relative overflow-hidden rounded-[var(--radius-lg)] border p-5 shadow-[var(--shadow-xs)] transition-all duration-[var(--transition-fast)] hover:-translate-y-0.5 hover:shadow-[var(--shadow-sm)] ${variantStyles[variant]}`}
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex h-5 w-5 items-center justify-center rounded-md ${iconBgStyles[variant]}`}
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

export function DashboardFinancialIndicators({
  activeCompany,
  financialIndicators,
  onDefaultsSaved,
}: DashboardFinancialIndicatorsProps) {
  const [savedDefaults, setSavedDefaults] = useState<{
    companyId: string;
    fixedCost: number;
    taxPercent: number;
  } | null>(null);
  const [fixedCostInput, setFixedCostInput] = useState("0,00");
  const [taxPercentInput, setTaxPercentInput] = useState("0,00");
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const companyDefaults =
    activeCompany && savedDefaults?.companyId === activeCompany.id
      ? savedDefaults
      : {
          companyId: activeCompany?.id ?? "",
          fixedCost: Number.parseFloat(activeCompany?.fixedCostDefault ?? "0") || 0,
          taxPercent:
            (Number.parseFloat(activeCompany?.taxRateDefault ?? "0") || 0) * 100,
        };

  const cancelEditing = useCallback(() => {
    setFixedCostInput(formatCurrencyInput(companyDefaults.fixedCost));
    setTaxPercentInput(formatCurrencyInput(companyDefaults.taxPercent));
    setFeedbackMessage(null);
    setIsEditing(false);
  }, [companyDefaults.fixedCost, companyDefaults.taxPercent]);

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
        { body: patch },
      );
      const nextFixedCost = Number.parseFloat(response.data.fixedCostDefault) || 0;
      const nextTaxPercent =
        (Number.parseFloat(response.data.taxRateDefault) || 0) * 100;

      setSavedDefaults({
        companyId: activeCompany.id,
        fixedCost: nextFixedCost,
        taxPercent: nextTaxPercent,
      });
      setFixedCostInput(formatCurrencyInput(nextFixedCost));
      setTaxPercentInput(formatCurrencyInput(nextTaxPercent));
      setFeedbackMessage("Valores salvos.");
      setIsEditing(false);
      onDefaultsSaved?.();
    } catch (error) {
      setFeedbackMessage(
        error instanceof ApiClientError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Não foi possível salvar os valores da empresa",
      );
    } finally {
      setIsSaving(false);
    }
  }, [
    activeCompany,
    fixedCostInput,
    onDefaultsSaved,
    taxPercentInput,
  ]);

  const totalProfit = normalizeNumber(financialIndicators.totalProfit);
  const realProfit = normalizeNumber(financialIndicators.realProfit);
  const netProfit = normalizeNumber(financialIndicators.netProfit);
  const averageMargin = normalizeNumber(financialIndicators.averageMarginPercent);
  const netMargin = normalizeNumber(financialIndicators.netMarginPercent);
  const revenue = normalizeNumber(financialIndicators.revenue);
  const breakEven = normalizeNumber(financialIndicators.breakEvenRevenue);
  const fixedCostResolved = normalizeNumber(financialIndicators.fixedCost);
  const revenueSub = `${financialIndicators.netSales} vendas líquidas`;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-4"
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <IndicatorCard
          icon={<DollarSign className="h-4 w-4" />}
          label="Faturamento"
          subValue={revenueSub}
          value={formatMoney(financialIndicators.revenue, {
            maximumFractionDigits: 2,
          })}
        />
        <IndicatorCard
          icon={<Percent className="h-4 w-4" />}
          label="Margem Média"
          subValue={`Lucro Total: ${formatMoney(financialIndicators.totalProfit, { maximumFractionDigits: 2 })}`}
          trend={{
            direction: averageMargin > 30 ? "up" : averageMargin > 0 ? "neutral" : "down",
            value: totalProfit >= 0 ? "Lucrativo" : "Prejuízo",
          }}
          value={formatIndicatorPercent(financialIndicators.averageMarginPercent)}
          variant={averageMargin >= 20 ? "success" : averageMargin > 0 ? "warning" : "error"}
        />
        <IndicatorCard
          icon={<Percent className="h-4 w-4" />}
          label="Margem Líquida"
          subValue={`Lucro Líquido: ${formatMoney(financialIndicators.netProfit, { maximumFractionDigits: 2 })}`}
          value={formatIndicatorPercent(financialIndicators.netMarginPercent)}
          variant={netMargin > 0 ? "success" : netMargin < 0 ? "error" : "warning"}
        />
        <IndicatorCard
          icon={<Scale className="h-4 w-4" />}
          label="Total Variáveis"
          subValue="Comissão, frete, imposto, embalagem e produto"
          value={formatMoney(financialIndicators.variableCosts, {
            maximumFractionDigits: 2,
          })}
        />
        <IndicatorCard
          icon={<PiggyBank className="h-4 w-4" />}
          label="Lucro Real"
          subValue={`Lucro Total − Custo Fixo (${formatMoney(financialIndicators.fixedCost, { maximumFractionDigits: 2 })})`}
          value={formatMoney(financialIndicators.realProfit, {
            maximumFractionDigits: 2,
          })}
          variant={realProfit > 0 ? "success" : realProfit < 0 ? "error" : "warning"}
        />
        <IndicatorCard
          icon={<PiggyBank className="h-4 w-4" />}
          label="Lucro Líquido"
          subValue="Após custos fixos e publicidade"
          trend={{
            direction: netProfit > 0 ? "up" : netProfit < 0 ? "down" : "neutral",
            value: `${netMargin.toFixed(1)}% do faturamento`,
          }}
          value={formatMoney(financialIndicators.netProfit, {
            maximumFractionDigits: 2,
          })}
          variant={netProfit > 0 ? "success" : netProfit < 0 ? "error" : "warning"}
        />
        <IndicatorCard
          icon={<TrendingUp className="h-4 w-4" />}
          label="Lucro Total"
          subValue="Faturamento − Total Variáveis"
          value={formatMoney(financialIndicators.totalProfit, {
            maximumFractionDigits: 2,
          })}
          variant={totalProfit > 0 ? "success" : totalProfit < 0 ? "error" : "warning"}
        />
        <IndicatorCard
          icon={<Scale className="h-4 w-4" />}
          label="Ponto de Equilíbrio"
          subValue={`Custo Fixo: ${formatMoney(financialIndicators.fixedCost, { maximumFractionDigits: 2 })}`}
          trend={{
            direction: revenue >= breakEven && breakEven > 0 ? "up" : "down",
            value: revenue >= breakEven && breakEven > 0 ? "Meta atingida" : "Abaixo da meta",
          }}
          value={formatMoney(financialIndicators.breakEvenRevenue, {
            maximumFractionDigits: 2,
          })}
          variant={revenue >= breakEven && breakEven > 0 ? "success" : "warning"}
        />
        <IndicatorCard
          icon={<DollarSign className="h-4 w-4" />}
          label="Publicidade"
          subValue="Investimento abatido no lucro líquido"
          value={formatMoney(financialIndicators.advertising, {
            maximumFractionDigits: 2,
          })}
        />
      </div>

      <motion.div variants={itemVariants}>
        <Card className="rounded-xl border border-border/80 bg-surface-elevated/40 px-4 py-3 shadow-[var(--shadow-xs)]" padding="none">
          {isEditing ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
                <label className="flex flex-1 items-center gap-2 sm:max-w-[220px]">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Custo Fixo
                  </span>
                  <Input
                    className="h-9 flex-1 text-right text-xs"
                    inputMode="decimal"
                    onChange={(event) => setFixedCostInput(event.target.value)}
                    type="text"
                    value={fixedCostInput}
                  />
                </label>
                <label className="flex flex-1 items-center gap-2 sm:max-w-[180px]">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Imposto
                  </span>
                  <Input
                    className="h-9 flex-1 text-right text-xs"
                    inputMode="decimal"
                    onChange={(event) => setTaxPercentInput(event.target.value)}
                    type="text"
                    value={taxPercentInput}
                  />
                </label>
              </div>
              {feedbackMessage && (
                <p className="text-xs font-medium text-muted-foreground">
                  {feedbackMessage}
                </p>
              )}
              <div className="flex shrink-0 gap-2">
                <Button
                  disabled={isSaving}
                  onClick={cancelEditing}
                  size="sm"
                  variant="ghost"
                >
                  Cancelar
                </Button>
                <Button
                  loading={isSaving}
                  onClick={() => void saveCompanyDefaults()}
                  size="sm"
                >
                  Salvar
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-accent" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Custo Fixo
                  </span>
                  <span className="text-sm font-semibold tabular-nums text-foreground">
                    {formatMoney(fixedCostResolved)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Percent className="h-4 w-4 text-accent" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Imposto
                  </span>
                  <span className="text-sm font-semibold tabular-nums text-foreground">
                    {formatCurrencyInput(companyDefaults.taxPercent)}%
                  </span>
                </div>
              </div>
              <Button
                disabled={!activeCompany}
                onClick={() => {
                  setFeedbackMessage(null);
                  setFixedCostInput(formatCurrencyInput(companyDefaults.fixedCost));
                  setTaxPercentInput(formatCurrencyInput(companyDefaults.taxPercent));
                  setIsEditing(true);
                }}
                size="sm"
                variant="secondary"
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
