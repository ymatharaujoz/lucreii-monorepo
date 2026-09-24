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
    div: ({
      children,
      ...props
    }: React.HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode }) =>
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
  excludedRevenue: "3200.88",
  excludedSales: 12,
  fixedCost: "200.00",
  fixedCostSource: "monthly",
  grossSales: 40,
  marketplaceCommission: "7000.00",
  monthlyAdvertising: "1481.33",
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
  it("exibe os seis indicadores financeiros em uma grade responsiva", () => {
    const view = mount(
      <DashboardFinancialIndicators
        activeCompany={company}
        financialIndicators={indicators}
      />,
    );
    const text = document.body.textContent ?? "";

    expect(text).toContain("27.359,77");
    expect(text).toContain("28 Vendas Líquidas");
    expect(text).not.toContain("40 Vendas Totais");
    expect(text).toContain("12 Vendas Devolvidas, Cancelados ou Pendentes");
    expect(text).toContain("Devoluções");
    expect(text).toContain("R$ 3.200,88");
    expect(text).not.toContain("− R$ 3.200,88");
    expect(
      Array.from(document.querySelectorAll("p")).some(
        (element) =>
          element.textContent === "R$ 3.200,88" &&
          element.className.toString().includes("whitespace-nowrap"),
      ),
    ).toBe(true);
    expect(text).not.toContain("28 vendas líquidas");
    expect(text).toContain("33.55%");
    expect(text).toContain("Margem Média");
    expect(text).not.toContain("28,38%");
    expect(text).toContain("R$\u00a0596,13");
    expect(text).toContain("R$\u00a07.564,15");
    expect(text).toContain("27,65%");
    expect(text).not.toContain("R$\u00a07.564,15 (27,65%)");
    expect(text).toContain("Faturamento");
    expect(text).not.toContain("Margem Contribuição");
    expect(text).not.toContain("Faturamento - Custos Variáveis");
    expect(text).toContain("Ponto de Equilíbrio");
    expect(text).toContain("Lucro Líquido");
    expect(text).toContain("Margem Líquida");
    expect(text).toContain("Lucro Total - Custo Fixo");
    expect(text).toContain("Lucro Líquido / Faturamento");
    expect(text).not.toContain("Total Variáveis");
    expect(text).not.toContain("Lucro Real");
    expect(text).not.toContain("Publicidade");

    expect(document.querySelectorAll("[class*=grid]").length).toBeGreaterThan(
      0,
    );
    expect(
      Array.from(document.querySelectorAll("[class]")).some((element) =>
        element.className.toString().includes("lg:grid-cols-6"),
      ),
    ).toBe(true);
    expect(
      Array.from(document.querySelectorAll("[class]")).some((element) =>
        element.className.toString().includes("md:grid-cols-3"),
      ),
    ).toBe(true);
    view.unmount();
  });

  it("exibe custos operacionais separados em Marketplaces", () => {
    const view = mount(
      <DashboardFinancialIndicators
        activeCompany={company}
        financialIndicators={indicators}
        indicatorMode="marketplace"
      />,
    );

    const text = document.body.textContent ?? "";
    expect(text).toContain("Faturamento");
    expect(text).toContain("Devoluções");
    expect(text).toContain("Custo & Imposto");
    expect(text).toContain("-R$\u00a011.595,62");
    expect(text).toContain("Custo: -R$\u00a010.000,00");
    expect(text).toContain("Imposto: -R$\u00a01.595,62");
    expect(text).toContain("Tarifa de Venda");
    expect(text).toContain("-R$\u00a07.000,00");
    expect(text).toContain("Frete Total");
    expect(text).toContain("-R$\u00a01.000,00");
    expect(text).toContain("Margem Contribuição");
    expect(text).toContain("R$\u00a07.764,15");
    expect(text).not.toContain("Valor:");
    expect(text).not.toContain("(Faturamento - Custos Variáveis) / Faturamento");
    expect(text).toContain("28,38%");
    const indicatorIndexes = [
      "Faturamento",
      "Devoluções",
      "Margem Contribuição",
      "Custo & Imposto",
      "Tarifa de Venda",
      "Frete Total",
    ].map((label) => text.indexOf(label));
    expect(
      indicatorIndexes.every(
        (index, position) =>
          index >= 0 &&
          (position === 0 || index > (indicatorIndexes[position - 1] ?? -1)),
      ),
    ).toBe(true);
    const costAndTaxDetail = Array.from(document.querySelectorAll("p")).find(
      (element) =>
        element.textContent?.includes("Custo: -R$\u00a010.000,00") &&
        element.textContent?.includes("Imposto: -R$\u00a01.595,62"),
    );
    expect(costAndTaxDetail?.querySelectorAll("br")).toHaveLength(1);
    const redIndicatorCards = Array.from(
      document.querySelectorAll("[class]"),
    ).filter((element) => {
      const className = element.className.toString();
      return (
        className.includes("border-error/20") &&
        className.includes("bg-error-soft/30")
      );
    });
    for (const label of [
      "Devoluções",
      "Custo & Imposto",
      "Tarifa de Venda",
      "Frete Total",
    ]) {
      expect(
        redIndicatorCards.some((card) => card.textContent?.includes(label)),
      ).toBe(true);
    }
    expect(redIndicatorCards).toHaveLength(4);
    expect(text).not.toContain("Margem Média");
    expect(text).not.toContain("Margem Líquida");
    expect(text).not.toContain("Ponto de Equilíbrio");
    expect(text).not.toContain("Lucro Total - Custo Fixo");
    expect(text).not.toContain("Editar");
    expect(
      Array.from(document.querySelectorAll("[class]")).some((element) =>
        element.className.toString().includes("lg:grid-cols-6"),
      ),
    ).toBe(true);
    view.unmount();
  });

  it("mantém os indicadores operacionais ao filtrar um Marketplace", () => {
    const view = mount(
      <DashboardFinancialIndicators
        activeCompany={company}
        financialIndicators={indicators}
        indicatorMode="marketplace"
        provider="shopee"
        referenceMonth="2026-07-01"
        showCompanyWideIndicators={false}
      />,
    );

    const text = document.body.textContent ?? "";
    expect(text).toContain("Custo & Imposto");
    expect(text).toContain("-R$\u00a011.595,62");
    expect(text).toContain("Tarifa de Venda");
    expect(text).toContain("-R$\u00a07.000,00");
    expect(text).toContain("Frete Total");
    expect(text).toContain("-R$\u00a01.000,00");
    expect(text).toContain("Margem Contribuição");
    expect(text).toContain("28,38%");
    expect(text).toContain("R$\u00a07.764,15");
    expect(text).toContain("Publicidade");
    expect(text).not.toContain("Margem Líquida");
    expect(text).not.toContain("Custo Fixo");
    expect(
      Array.from(document.querySelectorAll("[class]")).some((element) =>
        element.className.toString().includes("lg:grid-cols-6"),
      ),
    ).toBe(true);
    view.unmount();
  });

  it("não exibe sinal negativo quando valores de custo são zero", () => {
    const view = mount(
      <DashboardFinancialIndicators
        activeCompany={company}
        financialIndicators={{
          ...indicators,
          marketplaceCommission: "0.00",
          packagingCost: "0.00",
          productCost: "0.00",
          shippingCost: "0.00",
          taxAmount: "0.00",
        }}
        indicatorMode="marketplace"
      />,
    );

    const text = document.body.textContent ?? "";
    expect(text).toContain("Custo & Imposto");
    expect(text).toContain("R$\u00a00,00");
    expect(text).not.toContain("-R$");
    view.unmount();
  });

  it("exibe margem de contribuição zero quando faturamento é zero", () => {
    const view = mount(
      <DashboardFinancialIndicators
        activeCompany={company}
        financialIndicators={{
          ...indicators,
          revenue: "0.00",
          variableCosts: "100.00",
        }}
        indicatorMode="marketplace"
      />,
    );

    const text = document.body.textContent ?? "";
    expect(text).toContain("Margem Contribuição");
    expect(text).toContain("0,00%");
    expect(text).toContain("-R$\u00a0100,00");
    expect(text).not.toMatch(/NaN|Infinity/);
    view.unmount();
  });

  it("preserva margem de contribuição negativa sem subtrair custo fixo", () => {
    const view = mount(
      <DashboardFinancialIndicators
        activeCompany={company}
        financialIndicators={{
          ...indicators,
          fixedCost: "25.00",
          revenue: "100.00",
          totalProfit: "-50.00",
          variableCosts: "150.00",
        }}
        indicatorMode="marketplace"
      />,
    );

    const text = document.body.textContent ?? "";
    expect(text).toContain("-50,00%");
    expect(text).toContain("-R$\u00a050,00");
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

  it("oculta indicadores consolidados quando marketplace específico está selecionado", () => {
    const view = mount(
      <DashboardFinancialIndicators
        activeCompany={company}
        financialIndicators={indicators}
        provider="shopee"
        referenceMonth="2026-07-01"
        showCompanyWideIndicators={false}
      />,
    );

    const text = document.body.textContent ?? "";
    expect(text).toContain("Faturamento");
    expect(text).toContain("Devoluções");
    expect(text).toContain("Margem Contribuição");
    expect(text).toContain("22,96%");
    expect(text).toContain("Publicidade");
    expect(text).toContain("Margem Após Publicidade");
    expect(text).not.toContain("Custo Fixo");
    expect(text).not.toContain("Imposto");
    expect(text).not.toContain("Margem Média");
    expect(text).not.toContain("Ponto de Equilíbrio");
    expect(text).not.toContain("Lucro Líquido");
    expect(text).not.toContain("Margem Líquida");
    expect(
      Array.from(document.querySelectorAll("[class]")).some((element) =>
        element.className.toString().includes("lg:grid-cols-3"),
      ),
    ).toBe(true);
    view.unmount();
  });

  it("oculta apenas a linha de edição consolidada quando solicitado", () => {
    const view = mount(
      <DashboardFinancialIndicators
        activeCompany={company}
        financialIndicators={indicators}
        showCompanyDefaultsEditor={false}
      />,
    );

    expect(document.body.textContent ?? "").not.toContain("Editar");
    expect(document.querySelectorAll("input")).toHaveLength(0);
    expect(document.body.textContent ?? "").toContain("Ponto de Equilíbrio");
    view.unmount();
  });

  it("preserva prejuízo e margem líquida negativa", () => {
    const view = mount(
      <DashboardFinancialIndicators
        activeCompany={company}
        financialIndicators={{
          ...indicators,
          averageMarginPercent: "99.99",
          breakEvenRevenue: "10961.24",
          fixedCost: "3138.54",
          fixedCostSource: "monthly",
          netMarginPercent: "-26.29",
          netProfit: "-1539.00",
          realProfit: "-1462.07",
          revenue: "5855.02",
          totalProfit: "-1676.47",
          variableCosts: "6029.50",
        }}
        provider="shopee"
        referenceMonth="2026-07-01"
        showCompanyWideIndicators={false}
      />,
    );

    expect(document.body.textContent ?? "").toContain("-2,98%");
    expect(document.body.textContent ?? "").toContain("Contribuição negativa");
    expect(document.body.textContent ?? "").toContain("-53,93%");
    expect(document.body.textContent ?? "").toContain(
      "Margem Após Publicidade",
    );
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
        provider="shopee"
        referenceMonth="2026-07-01"
        showCompanyWideIndicators={false}
      />,
    );

    const text = document.body.textContent ?? "";
    expect(text).toContain("0,00%");
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

    const editButton = Array.from(document.querySelectorAll("button")).find(
      (button) => button.textContent?.includes("Editar"),
    );
    act(() =>
      editButton?.dispatchEvent(new MouseEvent("click", { bubbles: true })),
    );
    const saveButton = Array.from(document.querySelectorAll("button")).find(
      (button) => button.textContent?.includes("Salvar"),
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

  it("salva publicidade no marketplace e mantém margem após publicidade somente leitura", async () => {
    vi.mocked(apiClient.patch).mockResolvedValue({
      data: {
        amount: "1481.33",
        provider: "shopee",
        referenceMonth: "2026-07-01",
      },
      error: null,
    });
    const view = mount(
      <DashboardFinancialIndicators
        activeCompany={company}
        financialIndicators={indicators}
        provider="shopee"
        referenceMonth="2026-07-01"
        showCompanyWideIndicators={false}
      />,
    );

    const editButton = Array.from(document.querySelectorAll("button")).find(
      (button) => button.textContent?.includes("Editar"),
    );
    act(() =>
      editButton?.dispatchEvent(new MouseEvent("click", { bubbles: true })),
    );

    expect(document.querySelectorAll("input")).toHaveLength(1);
    expect(document.body.textContent ?? "").toContain(
      "Margem Após Publicidade",
    );
    expect(document.body.textContent ?? "").not.toContain("Custo Fixo");

    const saveButton = Array.from(document.querySelectorAll("button")).find(
      (button) => button.textContent?.includes("Salvar"),
    );
    await act(async () => {
      saveButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });

    expect(apiClient.patch).toHaveBeenCalledWith(
      "/dashboard/marketplace-advertising",
      {
        body: {
          amount: "1481.33",
          provider: "shopee",
          referenceMonth: "2026-07-01",
        },
      },
    );
    view.unmount();
  });

  it("mostra a publicidade rateada e edita o valor mensal no intervalo parcial", () => {
    const view = mount(
      <DashboardFinancialIndicators
        activeCompany={company}
        dateRange={{ dateFrom: "2026-07-01", dateTo: "2026-07-10" }}
        financialIndicators={indicators}
        provider="shopee"
        referenceMonth="2026-07-01"
        showCompanyWideIndicators={false}
      />,
    );

    expect(document.body.textContent ?? "").toContain("Publicidade rateada");

    const editButton = Array.from(document.querySelectorAll("button")).find(
      (button) => button.textContent?.includes("Editar"),
    );
    act(() =>
      editButton?.dispatchEvent(new MouseEvent("click", { bubbles: true })),
    );

    expect(document.body.textContent ?? "").toContain("Publicidade mensal");
    expect(document.querySelector<HTMLInputElement>("input")?.value).toBe(
      "1.481,33",
    );

    view.unmount();
  });
});
