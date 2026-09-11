import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BillingPanel } from "./billing-panel";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: vi.fn(),
    replace: vi.fn(),
  }),
}));

describe("BillingPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("keeps the original trial end date when a plan is chosen early", () => {
    const markup = renderToStaticMarkup(
      createElement(BillingPanel, {
        checkoutSessionId: null,
        checkoutState: null,
        canManageBilling: true,
        organizationName: "Lucreii",
        trial: {
          endsAt: "2030-01-08T12:00:00.000Z",
          organizationId: "org_123",
          remainingDays: 7,
          startedAt: "2030-01-01T12:00:00.000Z",
          status: "active",
        },
      }),
    );

    expect(markup).toContain("Escolha seu plano");
    expect(markup).toContain("Nenhum novo período grátis será criado");
    expect(markup).toContain("Escolher Start");
    expect(markup).toContain("Start");
    expect(markup).toContain("Essencial");
    expect(markup).toContain("Pro");
    expect(markup).toContain("Business");
    expect(markup).toContain("1 CNPJ");
    expect(markup).toContain("3 CNPJs");
    expect(markup).toContain("5 CNPJs");
  });

  it("shows immediate charging copy after trial expiration", () => {
    const markup = renderToStaticMarkup(
      createElement(BillingPanel, {
        checkoutSessionId: null,
        checkoutState: null,
        canManageBilling: true,
        organizationName: "Lucreii",
        trial: {
          endsAt: "2030-01-08T12:00:00.000Z",
          organizationId: "org_123",
          remainingDays: 0,
          startedAt: "2030-01-01T12:00:00.000Z",
          status: "expired",
        },
      }),
    );

    expect(markup).toContain("Seu teste terminou");
    expect(markup).toContain("A cobrança é imediata");
    expect(markup).not.toContain("Começar teste grátis");
  });
});
