/** @vitest-environment jsdom */

import React, { act } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { ProductDetailsModal } from "./product-details-modal";
import type { ProductTableRow } from "../types/products";

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

function buildRow(overrides: Partial<ProductTableRow> = {}): ProductTableRow {
  return {
    actualRoas: 3.12,
    adSpend: 0,
    advertisingCost: 0,
    catalogGroupKey: null,
    catalogRole: "standalone",
    channelLabel: "mercadolivre",
    children: [],
    commissionPct: 11.74,
    contributionMarginRatio: 0.21,
    coverImageUrl: null,
    displayName: "Acessório De Celular",
    id: "2026-06-01:mercadolivre:ACC-1",
    isActive: true,
    minimumRoas: 4.77,
    name: "Acessório De Celular",
    netLiquidSales: 3,
    packagingCost: 0,
    parentProductId: null,
    performanceId: "perf_acc_1",
    productId: null,
    referenceMonth: "2026-06-01",
    returns: 0,
    revenue: 89.7,
    roiRatio: 1.2,
    sales: 3,
    sellingPrice: 29.9,
    shipping: 0,
    sku: "ACC-1",
    taxPct: 0,
    totalCommission: 31.62,
    totalPackagingCost: 0,
    totalProductCost: 69,
    totalProfit: 20.28,
    unitCost: 23,
    unitProfit: 6.76,
    variationLabel: "Cor: Transparente",
    ...overrides,
    isSyntheticParent: overrides.isSyntheticParent ?? false,
  };
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

function renderWithClient(node: React.ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  });

  return mount(
    <QueryClientProvider client={queryClient}>{node}</QueryClientProvider>,
  );
}

function click(element: Element) {
  act(() => {
    element.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
}

function normalizedTextContent() {
  return document.body.textContent?.replace(/\u00a0/g, " ") ?? "";
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("ProductDetailsModal", () => {
  it("does not render the Faturamento tab", () => {
    const view = renderWithClient(
      <ProductDetailsModal onClose={() => {}} open row={buildRow()} />,
    );

    expect(
      Array.from(document.querySelectorAll("button")).some(
        (button) => button.textContent?.trim() === "Faturamento",
      ),
    ).toBe(false);

    view.unmount();
  });

  it("labels sales summary as vendas", () => {
    const view = renderWithClient(
      <ProductDetailsModal onClose={() => {}} open row={buildRow({ sales: 1 })} />,
    );

    const text = normalizedTextContent();

    expect(text).toContain("Vendas");

    view.unmount();
  });

  it("calculates ROI from displayed profit, cost and sales", () => {
    const row = buildRow({
      minimumRoas: 4.77,
      roiRatio: 0.41,
      returns: 2,
      sales: 10,
      unitProfit: 6.76,
    });
    const view = renderWithClient(
      <ProductDetailsModal onClose={() => {}} open row={row} />,
    );

    const profitabilityTab = Array.from(
      document.querySelectorAll("button"),
    ).find((button) => button.textContent?.trim() === "Lucratividade");

    expect(profitabilityTab).toBeDefined();
    click(profitabilityTab!);

    const text = normalizedTextContent();

    expect(text).toContain("Lucratividade");
    expect(text).not.toContain("Lucro Unitário");
    expect(text).toContain("ROI");
    expect(text).toContain("Taxa de Devoluções");
    expect(text).toContain("20,00%");
    expect(text).not.toContain("ROAS Mínimo");
    expect(text).not.toContain("4,77x");

    view.unmount();
  });

  it("shows CMV explanation when ROI help receives focus", () => {
    const view = renderWithClient(
      <ProductDetailsModal onClose={() => {}} open row={buildRow()} />,
    );

    const profitabilityTab = Array.from(
      document.querySelectorAll("button"),
    ).find((button) => button.textContent?.trim() === "Lucratividade");

    click(profitabilityTab!);

    const helpButton = document.querySelector(
      'button[aria-label="Explicação sobre CMV"]',
    ) as HTMLButtonElement;

    expect(helpButton).toBeTruthy();
    expect(normalizedTextContent()).not.toContain(
      "CMV (Custo da Mercadoria Vendida): Valor investido na compra das unidades vendidas.",
    );

    act(() => {
      helpButton.focus();
    });

    const tooltip = document.querySelector('[role="tooltip"]');

    expect(tooltip?.className).toContain("whitespace-normal");
    expect(tooltip?.textContent).toBe(
      "CMV (Custo da Mercadoria Vendida): Valor investido na compra das unidades vendidas.",
    );

    view.unmount();
  });

  it("formats zero ROI with two decimal places", () => {
    const view = renderWithClient(
      <ProductDetailsModal
        onClose={() => {}}
        open
        row={buildRow({ totalProfit: 0 })}
      />,
    );

    const profitabilityTab = Array.from(
      document.querySelectorAll("button"),
    ).find((button) => button.textContent?.trim() === "Lucratividade");

    click(profitabilityTab!);

    expect(normalizedTextContent()).toContain("0.00%");

    view.unmount();
  });

  it("renders zero return rate when there are no sales", () => {
    const row = buildRow({
      minimumRoas: null,
      roiRatio: null,
      sales: 0,
      unitProfit: null,
    });
    const view = renderWithClient(
      <ProductDetailsModal onClose={() => {}} open row={row} />,
    );

    const profitabilityTab = Array.from(
      document.querySelectorAll("button"),
    ).find((button) => button.textContent?.trim() === "Lucratividade");

    click(profitabilityTab!);

    const text = normalizedTextContent();

    expect(text).toContain("ROI");
    expect(text).toContain("Taxa de Devoluções");
    expect(text).toContain("0,00%");
    expect(text).not.toContain("ROAS Mínimo");
    expect(text).toContain("—");

    view.unmount();
  });
});
