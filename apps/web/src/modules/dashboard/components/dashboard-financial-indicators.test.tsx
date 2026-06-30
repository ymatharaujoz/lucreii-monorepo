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
    products: [{ revenue: "821", grossProfit: "594" }],
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
  it("exibe Margem Media como 72.35% quando lucro=594 e faturamento=821 (594/821*100)", () => {
    const ordersSummary: OrdersListSummary = {
      averageMargin: "0.7235",
      grossProfit: "594",
      grossRevenue: "821",
      ordersCount: 1,
      unitsSold: 1,
    };

    const view = mount(
      <DashboardFinancialIndicators
        activeCompany={company}
        data={buildProfitability()}
        ordersSummary={ordersSummary}
      />,
    );

    const text = document.body.textContent ?? "";
    expect(text).toContain("Margem M");
    expect(text).toContain("72.35%");
    expect(text).not.toMatch(/Margem[\s\S]{0,40}0\.72%/);
    expect(text).not.toMatch(/Margem[\s\S]{0,40}0\.7%/);

    view.unmount();
  });

  it("exibe Margem Media em 0.00% quando faturamento e zero (evita divisao por zero)", () => {
    const ordersSummary: OrdersListSummary = {
      averageMargin: "0",
      grossProfit: "0",
      grossRevenue: "0",
      ordersCount: 0,
      unitsSold: 0,
    };

    const view = mount(
      <DashboardFinancialIndicators
        activeCompany={company}
        data={
          { channels: [], products: [] } as unknown as DashboardProfitabilityResponse
        }
        ordersSummary={ordersSummary}
      />,
    );

    const text = document.body.textContent ?? "";
    expect(text).toContain("Margem M");
    expect(text).toContain("0.0%");

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
