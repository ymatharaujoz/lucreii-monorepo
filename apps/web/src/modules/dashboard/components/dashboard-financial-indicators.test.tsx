/** @vitest-environment jsdom */

import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import type {
  Company,
  DashboardProfitabilityResponse,
  OrdersListSummary,
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
    status: number;

    constructor(message: string, status = 500) {
      super(message);
      this.status = status;
    }
  },
}));

const company: Company = {
  id: "company-1",
  razaoSocial: "Empresa Teste",
  cnpj: "00.000.000/0001-00",
  code: "test-company",
  isActive: true,
  isSelected: true,
  fixedCostDefault: "0",
  taxRateDefault: "0",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

function buildProfitability(): DashboardProfitabilityResponse {
  return {
    channels: [],
    products: [
      {
        netSales: 1,
        salePrice: "821",
        revenue: "821",
        grossProfit: "594",
        marketplaceCommission: "0",
        shippingCost: "0",
        taxAmount: "0",
        packagingCost: "0",
        productCost: "227",
      },
    ],
  } as unknown as DashboardProfitabilityResponse;
}

function buildMonthlyProfitability(): DashboardProfitabilityResponse {
  return {
    channels: [],
    products: [
      {
        netSales: 2,
        salePrice: "250.00",
        revenue: "500.00",
        marketplaceCommission: "50.00",
        shippingCost: "70.00",
        taxAmount: "50.00",
        packagingCost: "10.00",
        productCost: "200.00",
      },
      {
        netSales: 1,
        salePrice: "394.48",
        revenue: "394.48",
        marketplaceCommission: "39.45",
        shippingCost: "50.00",
        taxAmount: "39.45",
        packagingCost: "10.00",
        productCost: "173.07",
      },
    ],
  } as unknown as DashboardProfitabilityResponse;
}

function mount(node: React.ReactNode) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(node);
  });

  return {
    unmount() {
      act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
}

afterEach(() => {
  document.body.innerHTML = "";
  vi.clearAllMocks();
});

describe("DashboardFinancialIndicators", () => {
  it("exibe Margem Media como 4.42% quando faturamento=894.48 e lucro=202.51", () => {
    const ordersSummary: OrdersListSummary = {
      averageMargin: "0.2263",
      grossProfit: "999",
      grossRevenue: "25362.82",
      marginRevenue: "894.48",
      totalProfit: "202.51",
      ordersCount: 1,
      unitsSold: 1,
    };

    const view = mount(
      <DashboardFinancialIndicators
        activeCompany={company}
        data={buildMonthlyProfitability()}
        ordersSummary={ordersSummary}
      />,
    );

    const text = document.body.textContent ?? "";
    expect(text).toContain("Margem M");
    expect(text).toContain("4.42%");
    expect(text).toContain("25.362,82");
    expect(text).toContain("202,51");

    view.unmount();
  });

  it("exibe Margem Media em 0.00% quando faturamento e zero (evita divisao por zero)", () => {
    const ordersSummary: OrdersListSummary = {
      averageMargin: "0",
      grossProfit: "0",
      grossRevenue: "0",
      marginRevenue: "0",
      totalProfit: "0",
      ordersCount: 0,
      unitsSold: 0,
    };

    const view = mount(
      <DashboardFinancialIndicators
        activeCompany={company}
        data={
          {
            channels: [],
            products: [],
          } as unknown as DashboardProfitabilityResponse
        }
        ordersSummary={ordersSummary}
      />,
    );

    const text = document.body.textContent ?? "";
    expect(text).toContain("Margem M");
    expect(text).toContain("0.0%");

    view.unmount();
  });

  it("exibe 0.00% quando lucro total e zero mesmo com faturamento", () => {
    const view = mount(
      <DashboardFinancialIndicators
        activeCompany={company}
        data={
          {
            channels: [],
            products: [],
          } as unknown as DashboardProfitabilityResponse
        }
        ordersSummary={{
          averageMargin: "0",
          grossProfit: "0",
          grossRevenue: "821",
          marginRevenue: "821",
          totalProfit: "0",
          ordersCount: 1,
          unitsSold: 1,
        }}
      />,
    );

    expect(document.body.textContent ?? "").toContain("0.0%");

    view.unmount();
  });

  it("preserva sinal negativo na margem invertida", () => {
    const view = mount(
      <DashboardFinancialIndicators
        activeCompany={company}
        data={
          {
            channels: [],
            products: [
              {
                netSales: 1,
                salePrice: "894.48",
                revenue: "894.48",
                marketplaceCommission: "0",
                shippingCost: "0",
                taxAmount: "0",
                packagingCost: "0",
                productCost: "1096.99",
              },
            ],
          } as unknown as DashboardProfitabilityResponse
        }
        ordersSummary={{
          averageMargin: "-0.2263",
          grossProfit: "-594",
          grossRevenue: "894.48",
          marginRevenue: "894.48",
          totalProfit: "-202.51",
          ordersCount: 1,
          unitsSold: 1,
        }}
      />,
    );

    expect(document.body.textContent ?? "").toContain("-4.42%");

    view.unmount();
  });

  it("nao usa a rentabilidade agregada de produtos sem o resumo mensal dos pedidos", () => {
    const view = mount(
      <DashboardFinancialIndicators
        activeCompany={company}
        data={
          {
            channels: [],
            products: buildMonthlyProfitability().products,
          } as unknown as DashboardProfitabilityResponse
        }
      />,
    );

    expect(document.body.textContent ?? "").toContain("0.0%");

    view.unmount();
  });

  it("abre edicao com valores atuais e salva sem resetar para zero", async () => {
    vi.mocked(apiClient.patch).mockResolvedValue({
      data: {
        ...company,
        fixedCostDefault: "1500.00",
        taxRateDefault: "0.120000",
      },
      error: null,
    });

    const populatedCompany: Company = {
      ...company,
      fixedCostDefault: "1500.00",
      taxRateDefault: "0.120000",
    };

    const view = mount(
      <DashboardFinancialIndicators
        activeCompany={populatedCompany}
        data={buildProfitability()}
      />,
    );

    const editButton = Array.from(document.querySelectorAll("button")).find(
      (button) => button.textContent?.includes("Editar"),
    );

    act(() => {
      editButton!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const inputs = Array.from(
      document.querySelectorAll("input"),
    ) as HTMLInputElement[];
    expect(inputs[0]?.value).toBe("1.500,00");
    expect(inputs[1]?.value).toBe("12,00");

    const saveButton = Array.from(document.querySelectorAll("button")).find(
      (button) => button.textContent?.includes("Salvar"),
    );

    await act(async () => {
      saveButton!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });

    expect(apiClient.patch).toHaveBeenCalledWith("/companies/company-1", {
      body: {
        fixedCostDefault: "1500.00",
        taxRateDefault: "0.120000",
      },
    });

    view.unmount();
  });
});
