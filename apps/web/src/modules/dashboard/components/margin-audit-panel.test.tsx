import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { DashboardFinancialIndicators } from "@lucreii/types";
import { MarginAuditPanel } from "./margin-audit-panel";

const indicators: DashboardFinancialIndicators = {
  advertising: "1481.33",
  averageMarginPercent: "28.38",
  breakEvenRevenue: "10528.27",
  fixedCost: "2987.71",
  fixedCostSource: "monthly",
  marketplaceCommission: "7000.00",
  netMarginPercent: "12.04",
  netProfit: "3295.11",
  netSales: 100,
  packagingCost: "1000.00",
  productCost: "9000.00",
  realProfit: "4776.44",
  revenue: "27359.77",
  shippingCost: "1000.00",
  taxAmount: "1595.62",
  totalProfit: "7764.15",
  variableCosts: "19595.62",
};

describe("MarginAuditPanel", () => {
  it("exibe fórmulas, subcustos e a origem do custo fixo", () => {
    const markup = renderToStaticMarkup(
      <MarginAuditPanel
        indicators={indicators}
        provider="mercadolivre"
        referenceMonth="2026-06-01"
      />,
    );

    expect(markup).toContain("Auditoria dos indicadores financeiros");
    expect(markup).toContain("Σ (VENDAS − DEVOLUÇÕES)");
    expect(markup).toContain("Comissão marketplace");
    expect(markup).toContain("Soma dos lançamentos de custo fixo");
    const normalizedMarkup = markup.replace(/\u00a0/g, " ");
    expect(normalizedMarkup).toContain("R$ 3.295,11");
    expect(markup).toContain("Margem média: 28.38%");
  });
});
