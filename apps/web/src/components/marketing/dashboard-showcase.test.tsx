/** @vitest-environment jsdom */

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { DashboardShowcase } from "./dashboard-showcase";

vi.mock("framer-motion", () => {
  const motionElement = (tag: string) =>
    Object.assign(
      ({
        children,
        ...props
      }: React.PropsWithChildren<Record<string, unknown>>) =>
        React.createElement(
          tag,
          Object.fromEntries(
            Object.entries(props).filter(
              ([key]) =>
                ![
                  "animate",
                  "initial",
                  "variants",
                  "transition",
                  "whileInView",
                  "viewport",
                ].includes(key),
            ),
          ),
          children,
        ),
      { displayName: `Motion${tag}` },
    );

  return {
    motion: {
      div: motionElement("div"),
      header: motionElement("header"),
      path: motionElement("path"),
    },
    useReducedMotion: () => true,
  };
});

describe("DashboardShowcase", () => {
  it("renders the reference composition and real dashboard preview", () => {
    const markup = renderToStaticMarkup(<DashboardShowcase />);

    expect(markup).toContain('id="dashboard"');
    expect(markup).toContain("Seus números. Seu lucro.");
    expect(markup).toContain("Tudo em uma única visão.");
    expect(markup).toContain("Acompanhe o desempenho do seu negócio");
    expect(markup).toContain("Compare receita e lucro ao longo do mês");
    expect(markup).toContain(
      "Saiba quanto precisa faturar para não ter prejuízo",
    );
    expect(markup).toContain("Veja quanto realmente sobra no seu bolso");
    expect(markup).toContain('aria-label="Prévia do dashboard"');
    expect(markup).toContain(
      "Menos planilhas. Mais clareza para tomar decisões.",
    );
    expect(markup).not.toContain("Dashboard Mockup");
  });
});
