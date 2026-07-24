"use client";

import type { DashboardFinancialIndicators } from "@lucreii/types";
import { Card } from "@lucreii/ui";
import { formatReferenceMonthPtBr } from "@/lib/reference-month";
import { formatMoney, formatProviderLabel } from "../utils/formatters";

type MarginAuditPanelProps = {
  indicators: DashboardFinancialIndicators;
  provider: string | null;
  referenceMonth: string;
};

type AuditRowProps = {
  description: string;
  formula: string;
  label: string;
  value: string;
};

function AuditRow({ description, formula, label, value }: AuditRowProps) {
  return (
    <div className="min-w-0 border-l-2 border-border px-3 py-2.5 first:border-accent">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold text-foreground">{label}</p>
        <p className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
          {value}
        </p>
      </div>
      <p className="mt-1 break-words font-mono text-[11px] leading-relaxed text-accent">
        {formula}
      </p>
      <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
        {description}
      </p>
    </div>
  );
}

export function MarginAuditPanel({
  indicators,
  provider,
  referenceMonth,
}: MarginAuditPanelProps) {
  const scopeLabel = provider
    ? formatProviderLabel(provider)
    : "Todos os marketplaces";
  const rows: AuditRowProps[] = [
    {
      description: "Vendas menos devoluções, agregadas nas linhas da performance.",
      formula: "Σ (VENDAS − DEVOLUÇÕES)",
      label: "Venda líquida",
      value: new Intl.NumberFormat("pt-BR").format(indicators.netSales),
    },
    {
      description: "Preço de venda da linha multiplicado pela venda líquida.",
      formula: "Σ (PDV × VENDA LÍQUIDA)",
      label: "Faturamento",
      value: formatMoney(indicators.revenue, { maximumFractionDigits: 2 }),
    },
    {
      description: "Comissão calculada sobre a receita de cada linha.",
      formula: "Σ (RECEITA × COMISSÃO)",
      label: "Comissão marketplace",
      value: formatMoney(indicators.marketplaceCommission, {
        maximumFractionDigits: 2,
      }),
    },
    {
      description: "Frete unitário multiplicado pela venda líquida.",
      formula: "Σ (FRETE × VENDA LÍQUIDA)",
      label: "Frete",
      value: formatMoney(indicators.shippingCost, {
        maximumFractionDigits: 2,
      }),
    },
    {
      description: "Alíquota da empresa aplicada ao faturamento.",
      formula: "Σ (RECEITA × ALÍQUOTA)",
      label: "Imposto",
      value: formatMoney(indicators.taxAmount, { maximumFractionDigits: 2 }),
    },
    {
      description: "Custo unitário de embalagem multiplicado pela venda líquida.",
      formula: "Σ (EMBALAGEM × VENDA LÍQUIDA)",
      label: "Embalagem",
      value: formatMoney(indicators.packagingCost, {
        maximumFractionDigits: 2,
      }),
    },
    {
      description: "Custo unitário do produto multiplicado pela venda líquida.",
      formula: "Σ (CUSTO PRODUTO × VENDA LÍQUIDA)",
      label: "Custo do produto",
      value: formatMoney(indicators.productCost, {
        maximumFractionDigits: 2,
      }),
    },
    {
      description: "Soma dos cinco componentes variáveis.",
      formula: "COMISSÃO + FRETE + IMPOSTO + EMBALAGEM + PRODUTO",
      label: "Total variáveis",
      value: formatMoney(indicators.variableCosts, {
        maximumFractionDigits: 2,
      }),
    },
    {
      description: "Receita menos os custos variáveis.",
      formula: "FATURAMENTO − TOTAL VARIÁVEIS",
      label: "Lucro total",
      value: formatMoney(indicators.totalProfit, {
        maximumFractionDigits: 2,
      }),
    },
    {
      description:
        indicators.fixedCostSource === "monthly"
          ? "Soma dos lançamentos de custo fixo do mês selecionado."
          : "Sem lançamentos no mês; aplicado o padrão cadastrado na empresa.",
      formula:
        indicators.fixedCostSource === "monthly"
          ? "Σ CUSTOS FIXOS DO MÊS"
          : "CUSTO FIXO PADRÃO DA EMPRESA",
      label: "Custo fixo",
      value: formatMoney(indicators.fixedCost, { maximumFractionDigits: 2 }),
    },
    {
      description: "Lucro total depois do custo fixo.",
      formula: "LUCRO TOTAL − CUSTO FIXO",
      label: "Lucro real",
      value: formatMoney(indicators.realProfit, { maximumFractionDigits: 2 }),
    },
    {
      description: "Publicidade da performance abatida após o lucro real.",
      formula: "Σ PUBLICIDADE",
      label: "Publicidade",
      value: formatMoney(indicators.advertising, { maximumFractionDigits: 2 }),
    },
    {
      description: "Lucro real depois do investimento em publicidade.",
      formula: "LUCRO REAL − PUBLICIDADE",
      label: "Lucro líquido",
      value: formatMoney(indicators.netProfit, { maximumFractionDigits: 2 }),
    },
  ];

  return (
    <Card className="overflow-hidden" padding="none">
      <details open>
        <summary className="flex cursor-pointer list-none flex-col gap-1 px-4 py-3 outline-none transition-colors hover:bg-surface-strong/30 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-accent">
              Conferência
            </p>
            <h2 className="mt-1 text-sm font-semibold text-foreground">
              Auditoria dos indicadores financeiros
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {formatReferenceMonthPtBr(referenceMonth)} · {scopeLabel} · fonte: performance
            </p>
          </div>
          <span className="text-[11px] font-semibold text-muted-foreground">
            Detalhar cálculo
          </span>
        </summary>
        <div className="border-t border-border/70">
          <div className="grid gap-x-5 gap-y-1 p-3 sm:grid-cols-2 sm:p-4 xl:grid-cols-3">
            {rows.map((row) => (
              <AuditRow key={row.label} {...row} />
            ))}
          </div>
          <div className="border-t border-border/70 bg-surface-strong/30 px-4 py-3 sm:px-5">
            <p className="text-xs leading-relaxed text-muted-foreground">
              Margem média: {indicators.averageMarginPercent}% · Margem líquida: {indicators.netMarginPercent}% · Ponto de equilíbrio: {formatMoney(indicators.breakEvenRevenue, { maximumFractionDigits: 2 })}.
            </p>
          </div>
        </div>
      </details>
    </Card>
  );
}
