/** @vitest-environment jsdom */

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  MarketingPricingSection,
  marketingPricingPlans,
} from "./marketing-pricing-section";

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("framer-motion", () => {
  const MotionElement = ({
    children,
    ...props
  }: React.PropsWithChildren<React.HTMLAttributes<HTMLElement>>) => (
    <div {...props}>{children}</div>
  );

  return {
    motion: {
      article: MotionElement,
      div: MotionElement,
    },
    useReducedMotion: () => true,
  };
});

vi.mock("./schedule-demo-link", () => ({
  ScheduleDemoLink: ({
    className,
    label = "Fale conosco",
  }: {
    className: string;
    label?: string;
  }) => (
    <a className={className} href="#demo">
      {label}
    </a>
  ),
}));

describe("MarketingPricingSection", () => {
  it("keeps five monthly marketing plans local to the marketing page", () => {
    expect(
      marketingPricingPlans.map(({ name, price }) => [name, price]),
    ).toEqual([
      ["Start", "R$ 49,90"],
      ["Essencial", "R$ 99,90"],
      ["Pro", "R$ 179,90"],
      ["Business", "R$ 249,90"],
      ["Enterprise", "Sob consulta"],
    ]);
    expect(
      marketingPricingPlans.every((plan) => !("annualPrice" in plan)),
    ).toBe(true);
  });

  it("renders plan limits, featured state, and specialist CTA", () => {
    const markup = renderToStaticMarkup(<MarketingPricingSection />);

    expect(markup).toContain("Um plano para cada etapa");
    expect(markup).toContain("Mais escolhido");
    expect(markup).toContain("Até 200 pedidos/mês");
    expect(markup).toContain("Até 7.500 pedidos/mês");
    expect(markup).toContain("Falar com um especialista");
    expect(markup).not.toContain("Anual");
    expect(markup).not.toContain("Mensal");
  });
});
