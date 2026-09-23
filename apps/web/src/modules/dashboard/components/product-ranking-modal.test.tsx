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

type ProductsTableMockProps = {
  bare?: boolean;
  className?: string;
  containerClassName?: string;
  data: DashboardProfitabilityResponse;
  stickyHeader?: boolean;
  tableViewportClassName?: string;
};

const productsTableMock = vi.hoisted(() =>
  vi.fn(({ data }: ProductsTableMockProps) => (
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
      expect.objectContaining({
        bare: true,
        className: "flex min-h-0 flex-1 flex-col px-5 py-5 sm:px-8",
        containerClassName: "flex min-h-0 flex-1 flex-col",
        data,
        stickyHeader: true,
        tableViewportClassName: "min-h-0 flex-1 overflow-auto",
      }),
      undefined,
    );
    expect(document.querySelector('[role="dialog"]')?.className).toContain(
      "!h-[min(78dvh,44rem)]",
    );
    expect(
      document.querySelector('[role="dialog"]')?.lastElementChild?.className,
    ).toContain("!overflow-hidden");

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
