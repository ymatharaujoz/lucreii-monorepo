/** @vitest-environment jsdom */

import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { DashboardProfitabilityResponse } from "@lucreii/types";
import { ProductRankingModal } from "./product-ranking-modal";

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) =>
    React.createElement("a", { href }, children),
}));

const productsTableMock = vi.hoisted(() =>
  vi.fn(({ data }: { data: DashboardProfitabilityResponse }) => (
    <div>Produtos:{data.products.length}</div>
  )),
);

vi.mock("./products-table", () => ({
  ProductsTable: productsTableMock,
}));

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

function click(element: Element) {
  act(() => {
    element.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
}

afterEach(() => {
  document.body.innerHTML = "";
  productsTableMock.mockClear();
});

describe("ProductRankingModal", () => {
  it("opens the ranking and closes through Escape and overlay", () => {
    const data: DashboardProfitabilityResponse = { channels: [], products: [] };
    const view = mount(<ProductRankingModal data={data} />);

    expect(document.querySelector('[role="dialog"]')).toBeNull();

    click(
      Array.from(document.querySelectorAll("button")).find((button) =>
        button.textContent?.includes("Ranking de Produtos"),
      )!,
    );

    expect(document.querySelector('[role="dialog"]')).not.toBeNull();
    expect(productsTableMock).toHaveBeenLastCalledWith(
      { bare: true, data },
      undefined,
    );

    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    });

    expect(document.querySelector('[role="dialog"]')).toBeNull();

    click(
      Array.from(document.querySelectorAll("button")).find((button) =>
        button.textContent?.includes("Ranking de Produtos"),
      )!,
    );
    click(
      document.querySelector('[role="dialog"]')!.parentElement!
        .firstElementChild!,
    );

    expect(document.querySelector('[role="dialog"]')).toBeNull();
    view.unmount();
  });

  it("shows a catalog action when profitability data is unavailable", () => {
    const view = mount(<ProductRankingModal data={undefined} />);

    click(
      Array.from(document.querySelectorAll("button")).find((button) =>
        button.textContent?.includes("Ranking de Produtos"),
      )!,
    );

    expect(document.body.textContent).toContain(
      "Nenhum produto com dados suficientes",
    );
    expect(document.querySelector('a[href="/app/products"]')?.textContent).toBe(
      "Cadastrar produtos",
    );
    expect(productsTableMock).not.toHaveBeenCalled();
    view.unmount();
  });
});
