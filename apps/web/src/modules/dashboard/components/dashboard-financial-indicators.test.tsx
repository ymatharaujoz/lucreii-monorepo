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
  it("exibe os nove indicadores da fonte financeira dedicada", () => {
    const view = mount(
      <DashboardFinancialIndicators
        activeCompany={company}
        financialIndicators={indicators}
      />,
    );
    const text = document.body.textContent ?? "";

    expect(text).toContain("27.359,77");
    expect(text).toContain("28.38%");
    expect(text).toContain("12.04%");
    expect(text).toContain("19.595,62");
    expect(text).toContain("4.776,44");
    expect(text).toContain("3.295,11");
    expect(text).toContain("7.764,15");
    expect(text).toContain("10.528,27");
    expect(text).toContain("1.481,33");

    expect(document.querySelectorAll("[class*=grid]").length).toBeGreaterThan(0);
    view.unmount();
  });

  it("preserva prejuízo e margem líquida negativa", () => {
    const view = mount(
      <DashboardFinancialIndicators
        activeCompany={company}
        financialIndicators={{
          ...indicators,
          averageMarginPercent: "28.63",
          breakEvenRevenue: "10961.24",
          fixedCost: "3138.54",
          fixedCostSource: "monthly",
          netMarginPercent: "-26.29",
          netProfit: "-1539.00",
          realProfit: "-1462.07",
          revenue: "5855.02",
          totalProfit: "1676.47",
          variableCosts: "4178.55",
        }}
      />,
    );

    expect(document.body.textContent ?? "").toContain("-26.29%");
    expect(document.body.textContent ?? "").toContain("-R$ 1.539,00");
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
