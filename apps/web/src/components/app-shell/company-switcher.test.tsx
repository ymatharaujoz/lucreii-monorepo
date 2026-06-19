/** @vitest-environment jsdom */

import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CompanySwitcher } from "./company-switcher";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const routerRefreshMock = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: routerRefreshMock,
  }),
}));

function mount(node: React.ReactNode) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(node);
  });

  return {
    container,
    unmount() {
      act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
}

describe("CompanySwitcher", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    routerRefreshMock.mockReset();
    vi.unstubAllGlobals();
  });

  it("opens the company menu and shows the add-company link", () => {
    mount(
      <CompanySwitcher
        collapsed={false}
        companies={[
          {
            cnpj: "12345678000195",
            code: "MELI",
            createdAt: "2026-05-09T10:00:00.000Z",
            fixedCostDefault: "1500.00",
            id: "company_1",
            isActive: true,
            isSelected: true,
            razaoSocial: "Mercado Livre LTDA",
            taxRateDefault: "0.120000",
            updatedAt: "2026-05-09T10:00:00.000Z",
          },
        ]}
        organizationName="Lucreii"
        planLimit={3}
        user={{
          image: null,
          name: "Mateus",
        }}
      />,
    );

    act(() => {
      document.querySelector("button")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(document.body.textContent).toContain("Adicionar empresa");
    expect(document.body.textContent).toContain("1 de 3 CNPJs");
  });
});
