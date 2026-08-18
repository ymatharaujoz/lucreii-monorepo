/** @vitest-environment jsdom */

import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AppSidebar } from "./app-sidebar";

const usePathnameMock = vi.hoisted(() => vi.fn(() => "/app/orders"));

vi.mock("next/navigation", () => ({
  usePathname: usePathnameMock,
}));

vi.mock("next/link", () => ({
  default: ({
    className,
    children,
    href,
    onClick,
  }: {
    children: React.ReactNode;
    className?: string;
    href: string;
    onClick?: React.MouseEventHandler<HTMLAnchorElement>;
  }) => (
    <button
      data-href={href}
      className={className}
      type="button"
      onClick={(event) => {
        onClick?.(event as unknown as React.MouseEvent<HTMLAnchorElement>);
      }}
    >
      {children}
    </button>
  ),
}));

vi.mock("@/components/brand-logo", () => ({
  BrandLogo: () => <span>Logo</span>,
}));

vi.mock("@/components/brand-name", () => ({
  BrandName: () => <span>Lucreii</span>,
}));

vi.mock("./company-switcher", () => ({
  CompanySwitcher: () => null,
}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

function mount(node: React.ReactNode) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => root.render(node));

  return {
    container,
    unmount() {
      act(() => root.unmount());
      container.remove();
    },
  };
}

function sidebarProps() {
  return {
    appVersion: "1.0.0",
    collapsed: false,
    companies: [],
    onToggle: vi.fn(),
    organization: { name: "Lucreii" },
    planLimit: 1,
    user: { email: "user@example.com", image: null, name: "User" },
  };
}

describe("AppSidebar pricing navigation", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    vi.clearAllMocks();
    usePathnameMock.mockReturnValue("/app/orders");
  });

  it("renders Precificação below Pedidos and expands its three calculators", () => {
    const view = mount(<AppSidebar {...sidebarProps()} />);
    const pricingLink = document.querySelector(
      'button[data-href="/app/pricing/contribution-margin"]',
    );

    expect(document.body.textContent).toContain("Pedidos");
    expect(document.body.textContent).toContain("Precificação");
    expect(document.body.textContent?.indexOf("Pedidos")).toBeLessThan(
      document.body.textContent?.indexOf("Precificação") ?? 0,
    );
    expect(document.body.textContent).not.toContain("Lucro Desejado");

    act(() => {
      pricingLink?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(document.body.textContent).toContain("Margem de Contribuição");
    expect(document.body.textContent).toContain("Lucro Desejado");
    expect(document.body.textContent).toContain("Preço de Venda");

    view.unmount();
  });

  it("marks Precificação active when a child route is open", () => {
    usePathnameMock.mockReturnValue("/app/pricing/desired-profit");
    const view = mount(<AppSidebar {...sidebarProps()} />);
    const parentLink = document.querySelector(
      'button[data-href="/app/pricing/contribution-margin"]',
    );

    expect(parentLink?.className).toContain("text-accent-strong");

    view.unmount();
  });
});
