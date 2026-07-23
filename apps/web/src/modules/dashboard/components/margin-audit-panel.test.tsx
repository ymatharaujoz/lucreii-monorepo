import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { OrdersMarginAudit } from "@lucreii/types";
import { MarginAuditPanel } from "./margin-audit-panel";

const audit: OrdersMarginAudit = {
  aggregateRevenue: "894.48",
  compositionCount: 2,
  eligiblePerformanceRows: 2,
  grossRevenue: "25362.82",
  lineRevenue: "894.48",
  marginRevenue: "894.48",
  marketplaceCommissionTotal: "89.45",
  netLiquidSalesTotal: 3,
  packagingTotal: "94.91",
  pdvTotal: "298.16",
  productCostTotal: "298.16",
  shippingOrFixedFeeTotal: "120.00",
  taxTotal: "89.45",
  totalPerformanceRows: 2,
  totalProfit: "202.51",
};

describe("MarginAuditPanel", () => {
  it("exibe fórmula, valor e origem dos totais mensais", () => {
    const markup = renderToStaticMarkup(
      <MarginAuditPanel
        audit={audit}
        provider="mercadolivre"
        referenceMonth="2026-06-01"
      />,
    );
    const normalizedMarkup = markup.replace(/\u00a0/g, " ");

    expect(normalizedMarkup).toContain("Auditoria da margem média");
    expect(normalizedMarkup).toContain("Vendas líquidas total");
    expect(normalizedMarkup).toContain("Σ VENDAS na tabela de performance");
    expect(normalizedMarkup).toContain("3 × R$ 298,16");
    expect(normalizedMarkup).toContain(
      "Σ (PDV da linha × venda líquida da linha)",
    );
    expect(normalizedMarkup).toContain("R$ 202,51");
    expect(normalizedMarkup).toContain(
      "Faturamento mantido no card: R$ 25.362,82",
    );
  });
});
