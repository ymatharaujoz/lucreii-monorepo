/** @vitest-environment jsdom */

import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import type {
  Company,
  DashboardFinancialIndicators as DashboardFinancialIndicatorsData,
} from "@lucreii/types";
import { apiClient } from "@/lib/api/client";
import { DashboardFinancialIndicators } from "./dashboard-financial-indicators";

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode }) =>
      React.createElement("div", props, children),
  },
}));

vi.mock("@/lib/api/client", () => ({
  apiClient: {
    patch: vi.fn(),
  },
  ApiClientError: class ApiClientError extends Error {
    status = 500;
  },
}));

const company: Company = {
  id: "company-1",
  razaoSocial: "Empresa Teste",
  cnpj: "00000000000100",
  code: "TEST-COMPANY",
  isActive: true,
  isSelected: true,
  fixedCostDefault: "2987.71",
  taxRateDefault: "0.100000",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const indicators: DashboardFinancialIndicatorsData = {
  advertising: "1481.33",
  averageMarginPercent: "33.55",
  breakEvenRevenue: "596.13",
  fixedCost: "200.00",
  fixedCostSource: "monthly",
  marketplaceCommission: "7000.00",
  netMarginPercent: "12.04",
  netProfit: "3295.11",
  netSales: 28,
  packagingCost: "1000.00",
  productCost: "9000.00",
  realProfit: "4776.44",
  revenue: "27359.77",
  shippingCost: "1000.00",
  taxAmount: "1595.62",
  totalProfit: "7764.15",
  variableCosts: "19595.62",
};

function mount(node: React.ReactNode) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => root.render(node));

  return {
    unmount() {
      act(() => root.unmount());
      container.remove();
    },
  };
}

afterEach(() => {
  document.body.innerHTML = "";
  vi.clearAllMocks();
});

describe("DashboardFinancialIndicators", () => {
  it("exibe os cinco indicadores financeiros principais", () => {
    const view = mount(
      <DashboardFinancialIndicators
        activeCompany={company}
        financialIndicators={indicators}
      />,
    );
    const text = document.body.textContent ?? "";

    expect(text).toContain("27.359,77");
    expect(text).toContain("28 vendas líquidas");
    expect(text).toContain("33.55%");
    expect(text).toContain("R$\u00a0596,13");
    expect(text).toContain("R$\u00a07.564,15");
    expect(text).toContain("27,65%");
    expect(text).not.toContain("R$\u00a07.564,15 (27,65%)");
    expect(text).toContain("Faturamento");
    expect(text).toContain("Margem Média");
    expect(text).toContain("Ponto de Equilíbrio");
    expect(text).toContain("Lucro Líquido");
    expect(text).toContain("Margem Líquida");
    expect(text).toContain("Lucro Total - Custo Fixo");
    expect(text).toContain("Lucro Líquido / Faturamento");
    expect(text).not.toContain("Total Variáveis");
    expect(text).not.toContain("Lucro Real");
    expect(text).not.toContain("Publicidade");

    expect(document.querySelectorAll("[class*=grid]").length).toBeGreaterThan(0);
    expect(
      Array.from(document.querySelectorAll("[class]")).some((element) =>
        element.className.toString().includes("lg:grid-cols-5"),
      ),
    ).toBe(true);
    view.unmount();
  });

  it("calcula margem líquida usando valores exibidos no dashboard", () => {
    const view = mount(
      <DashboardFinancialIndicators
        activeCompany={company}
        financialIndicators={{
          ...indicators,
          fixedCost: "0.00",
          revenue: "20762.92",
          totalProfit: "6087.99",
        }}
      />,
    );

    const text = document.body.textContent ?? "";
    expect(text).toContain("R$\u00a06.087,99");
    expect(text).toContain("29,32%");
    expect(text).not.toContain("R$\u00a06.087,99 (29,32%)");
    view.unmount();
  });

  it("preserva prejuízo e margem líquida negativa", () => {
    const view = mount(
      <DashboardFinancialIndicators
        activeCompany={company}
        financialIndicators={{
          ...indicators,
          averageMarginPercent: "-2.98",
          breakEvenRevenue: "10961.24",
          fixedCost: "3138.54",
          fixedCostSource: "monthly",
          netMarginPercent: "-26.29",
          netProfit: "-1539.00",
          realProfit: "-1462.07",
          revenue: "5855.02",
          totalProfit: "-1676.47",
          variableCosts: "4178.55",
        }}
      />,
    );

    expect(document.body.textContent ?? "").toContain("-2.98%");
    expect(document.body.textContent ?? "").toContain("Prejuízo");
    expect(document.body.textContent ?? "").toContain("-R$ 4.815,01");
    expect(document.body.textContent ?? "").toContain("-82,24%");
    expect(document.body.textContent ?? "").toContain("Resultado negativo");
    expect(document.body.textContent ?? "").toContain("-R$ 1.676,47");
    view.unmount();
  });

  it("exibe estado neutro quando lucro total cobre exatamente o custo fixo", () => {
    const view = mount(
      <DashboardFinancialIndicators
        activeCompany={company}
        financialIndicators={{
          ...indicators,
          fixedCost: "7764.15",
          totalProfit: "7764.15",
        }}
      />,
    );

    const text = document.body.textContent ?? "";
    expect(text).toContain("R$\u00a00,00");
    expect(text).toContain("0,00%");
    expect(text).toContain("Resultado neutro");
    view.unmount();
  });

  it("exibe margem zero quando faturamento é zero", () => {
    const view = mount(
      <DashboardFinancialIndicators
        activeCompany={company}
        financialIndicators={{
          ...indicators,
          fixedCost: "0.00",
          revenue: "0.00",
          totalProfit: "100.00",
        }}
      />,
    );

    const text = document.body.textContent ?? "";
    expect(text).toContain("R$\u00a0100,00");
    expect(text).toContain("0,00%");
    expect(text).not.toContain("R$\u00a0100,00 (0,00%)");
    view.unmount();
  });

  it("refaz a leitura dos indicadores após salvar os padrões da empresa", async () => {
    const onDefaultsSaved = vi.fn();
    vi.mocked(apiClient.patch).mockResolvedValue({
      data: company,
      error: null,
    });
    const view = mount(
      <DashboardFinancialIndicators
        activeCompany={company}
        financialIndicators={indicators}
        onDefaultsSaved={onDefaultsSaved}
      />,
    );

    const editButton = Array.from(document.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Editar"),
    );
    act(() => editButton?.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    const saveButton = Array.from(document.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Salvar"),
    );
    await act(async () => {
      saveButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });

    expect(apiClient.patch).toHaveBeenCalledWith("/companies/company-1", {
      body: { fixedCostDefault: "2987.71", taxRateDefault: "0.100000" },
    });
    expect(onDefaultsSaved).toHaveBeenCalledOnce();
    view.unmount();
  });
});
