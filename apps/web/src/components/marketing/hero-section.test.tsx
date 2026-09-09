/** @vitest-environment jsdom */
/* eslint-disable @next/next/no-img-element */

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MarketingHero } from "./hero-section";

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

vi.mock("next/image", () => ({
  default: ({
    alt,
    ...props
  }: React.ImgHTMLAttributes<HTMLImageElement> & { alt: string }) => (
    <img alt={alt} {...props} />
  ),
}));

vi.mock("framer-motion", () => {
  const motionElement = (tag: string) => {
    const element = Object.assign(
      ({
        children,
        ...props
      }: React.PropsWithChildren<Record<string, unknown>>) => {
        const domProps = Object.fromEntries(
          Object.entries(props).filter(
            ([key]) =>
              ![
                "animate",
                "initial",
                "variants",
                "transition",
                "whileHover",
              ].includes(key),
          ),
        );
        return React.createElement(tag, domProps, children);
      },
      { displayName: `Motion${tag}` },
    );

    return element;
  };

  return {
    motion: {
      circle: motionElement("circle"),
      div: motionElement("div"),
      h1: motionElement("h1"),
      path: motionElement("path"),
      p: motionElement("p"),
    },
    useReducedMotion: () => true,
  };
});

describe("MarketingHero", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("renders reference copy, CTAs, feature cards, and trust bar", () => {
    const markup = renderToStaticMarkup(<MarketingHero />);

    expect(markup).toContain("7 DIAS GRÁTIS PARA CONHECER A LUCREII");
    expect(markup).toContain("Veja o lucro que");
    expect(markup).toContain("realmente importa.");
    expect(markup).toContain(
      "Descubra quanto realmente sobra das suas vendas.",
    );
    expect(markup).toContain("Testar grátis por 7 dias");
    expect(markup).toContain('href="/sign-in"');
    expect(markup).toContain('href="#demo"');

    for (const label of [
      "Lucro real",
      "Por produto",
      "Publicidade",
      "Multi-marketplace",
    ]) {
      expect(markup).toContain(label);
    }

    for (const label of ["Mercado Livre", "Shopee", "TikTok Shop", "Shein"]) {
      expect(markup).toContain(label);
    }

    expect(markup).toContain("Seus dados seguros");
    expect(markup).toContain("Comece em poucos minutos");
    expect(markup).toContain("Suporte em português");
  });

  it("renders the demonstrative dashboard data from the reference", () => {
    const markup = renderToStaticMarkup(<MarketingHero />);

    expect(markup).toContain("Olá, vendedor!");
    expect(markup).toContain("Setembro de 2026");
    expect(markup).toContain("R$ 42.580,00");
    expect(markup).toContain("28,6%");
    expect(markup).toContain("R$ 28.430,00");
    expect(markup).toContain("R$ 12.180,00");
    expect(markup).toContain("Evolução do lucro líquido");
    expect(markup).toContain("Performance por canal");
    expect(markup).toContain("Insights da Lucreii");
    expect(markup).not.toContain("Todas as informações que você precisa, em um só lugar.");
  });
});
