"use client";

import type { OrdersMarginAudit } from "@lucreii/types";
import { Card } from "@lucreii/ui";
import { formatReferenceMonthPtBr } from "@/lib/reference-month";
import {
  formatMoney,
  formatNumber,
  formatProviderLabel,
} from "../utils/formatters";

type MarginAuditPanelProps = {
  audit: OrdersMarginAudit;
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
  audit,
  provider,
  referenceMonth,
}: MarginAuditPanelProps) {
  const aggregateRevenue = Number(audit.aggregateRevenue);
  const lineRevenue = Number(audit.lineRevenue);
  const revenueDifference = lineRevenue - aggregateRevenue;
  const scopeLabel = provider
    ? formatProviderLabel(provider)
    : "Todos os marketplaces";

  const rows: AuditRowProps[] = [
    {
      description: `${audit.eligiblePerformanceRows} de ${audit.totalPerformanceRows} linhas da performance; somente linhas com Vendas > 0.`,
      formula: "Σ VENDAS na tabela de performance",
      label: "Vendas líquidas total",
      value: formatNumber(audit.netLiquidSalesTotal),
    },
    {
      description: "Soma de VENDAS × PDV em cada linha com Vendas > 0.",
      formula: "Σ (VENDAS × PDV) | VENDAS > 0",
      label: "Custo do Produto Total (PDV)",
      value: formatMoney(audit.pdvTotal, { maximumFractionDigits: 2 }),
    },
    {
      description:
        "Multiplicação dos dois totais informados; exibida para comparação.",
      formula: `${formatNumber(audit.netLiquidSalesTotal)} × Σ PDV (${formatMoney(audit.unitPdvTotal, { maximumFractionDigits: 2 })})`,
      label: "Receita pela fórmula informada",
      value: formatMoney(audit.aggregateRevenue, { maximumFractionDigits: 2 }),
    },
    {
      description:
        "Receita efetivamente usada no lucro atual, calculada sem cruzar produtos entre linhas.",
      formula: "Σ (PDV da linha × venda líquida da linha)",
      label: "Receita linha a linha",
      value: formatMoney(audit.lineRevenue, { maximumFractionDigits: 2 }),
    },
    {
      description: `${audit.compositionCount} composição(ões) mensal(is) dos pedidos filtrados.`,
      formula: "Σ COMISSÃO na aba COMPOSIÇÃO",
      label: "Comissão total",
      value: formatMoney(audit.marketplaceCommissionTotal, {
        maximumFractionDigits: 2,
      }),
    },
    {
      description:
        "Frete líquido quando disponível; caso contrário, frete ou custo fixo exibido.",
      formula: "Σ FRETE/TAXA FIXA na aba COMPOSIÇÃO",
      label: "Taxa/Frete total",
      value: formatMoney(audit.shippingOrFixedFeeTotal, {
        maximumFractionDigits: 2,
      }),
    },
    {
      description: "Soma dos impostos das composições mensais.",
      formula: "Σ IMPOSTO na aba COMPOSIÇÃO",
      label: "Imposto total",
      value: formatMoney(audit.taxTotal, { maximumFractionDigits: 2 }),
    },
    {
      description:
        "Embalagem unitária multiplicada pela venda líquida de cada linha elegível.",
      formula: "Σ (EMBALAGEM unitária × venda líquida)",
      label: "Embalagem total",
      value: formatMoney(audit.packagingTotal, { maximumFractionDigits: 2 }),
    },
    {
      description:
        "Custo unitário do produto multiplicado pela venda líquida de cada linha elegível.",
      formula: "Σ (CUSTO unitário × venda líquida)",
      label: "Custo do produto total",
      value: formatMoney(audit.productCostTotal, { maximumFractionDigits: 2 }),
    },
    {
      description:
        "Receita linha a linha menos comissão, taxa/frete, imposto, embalagem e custo do produto.",
      formula:
        "Receita − Comissão − Taxa/Frete − Imposto − Embalagem − Custo produto",
      label: "Lucro total",
      value: formatMoney(audit.totalProfit, { maximumFractionDigits: 2 }),
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
              Auditoria da margem média
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {formatReferenceMonthPtBr(referenceMonth)} · {scopeLabel} ·
              valores antes da paginação
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
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Comparação
            </p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Diferença entre receita linha a linha e multiplicação dos totais:{" "}
              {formatMoney(revenueDifference, { maximumFractionDigits: 2 })}.
              Faturamento mantido no card:{" "}
              {formatMoney(audit.grossRevenue, { maximumFractionDigits: 2 })}.
            </p>
          </div>
        </div>
      </details>
    </Card>
  );
}
