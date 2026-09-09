/** @vitest-environment jsdom */
/* eslint-disable @next/next/no-img-element */

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { IntegrationsSection } from "./integrations-section";

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
      ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
        const domProps = Object.fromEntries(
          Object.entries(props).filter(
            ([key]) =>
              ![
                "animate",
                "initial",
                "transition",
                "variants",
                "viewport",
                "whileInView",
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
      article: motionElement("article"),
      circle: motionElement("circle"),
      div: motionElement("div"),
      header: motionElement("header"),
      h2: motionElement("h2"),
      li: motionElement("li"),
      path: motionElement("path"),
      p: motionElement("p"),
      span: motionElement("span"),
    },
    useReducedMotion: () => true,
  };
});

describe("IntegrationsSection", () => {
  it("renders the reference copy, marketplace cards, statuses, and CTAs", () => {
    const markup = renderToStaticMarkup(<IntegrationsSection />);

    expect(markup).toContain("Conecte seus marketplaces.");
    expect(markup).toContain("A Lucreii cuida dos números.");
    expect(markup).toContain(
      "Integre seus canais de venda e acompanhe os resultados da sua operação em um só lugar.",
    );

    for (const marketplace of ["Mercado Livre", "Shopee", "TikTok Shop", "Shein"]) {
      expect(markup).toContain(marketplace);
    }

    expect((markup.match(/Disponível/g) ?? []).length).toBe(2);
    expect((markup.match(/Em breve/g) ?? []).length).toBe(2);
    expect((markup.match(/href=\"#demo\"/g) ?? []).length).toBe(2);
    expect(markup).toContain('href="/sign-in"');
  });

  it("keeps the dashboard, bottom proof, and reduced-motion markup renderable", () => {
    const markup = renderToStaticMarkup(<IntegrationsSection />);

    expect(markup).toContain('aria-label="Prévia do dashboard"');
    expect(markup).toContain("Vários marketplaces. Uma única visão do seu negócio.");
    expect(markup).toContain("Já vende no Mercado Livre ou Shopee?");
    expect(markup).toContain("Sem cartão de crédito");
    expect(markup).toContain("Cancele quando quiser");
    expect(markup).not.toContain("Seus dados organizados e seu lucro no controle.");
  });
});
