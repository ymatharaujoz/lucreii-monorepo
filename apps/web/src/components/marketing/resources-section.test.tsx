/** @vitest-environment jsdom */
/* eslint-disable @next/next/no-img-element */

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ResourcesSection } from "./resources-section";

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
      div: motionElement("div"),
      header: motionElement("header"),
      h2: motionElement("h2"),
      path: motionElement("path"),
      p: motionElement("p"),
      span: motionElement("span"),
    },
    useReducedMotion: () => true,
  };
});

describe("ResourcesSection", () => {
  it("renders the reference copy and all eight resource cards", () => {
    const markup = renderToStaticMarkup(<ResourcesSection />);

    expect(markup).toContain("Recursos");
    expect(markup).toContain("Tudo o que você precisa");
    expect(markup).toContain("para vender com lucro.");
    expect(markup).toContain(
      "Da visão geral ao resultado de cada produto, a Lucreii reúne os números que você precisa para tomar decisões mais lucrativas.",
    );

    for (const title of [
      "Lucro real do negócio",
      "Rentabilidade por produto",
      "Ponto de equilíbrio",
      "Publicidade e ROAS",
      "Gestão por marketplace",
      "Custos e despesas",
      "Devoluções",
      "Indicadores para decisões",
    ]) {
      expect(markup).toContain(title);
    }

    expect((markup.match(/<article/g) ?? []).length).toBe(8);
  });

  it("keeps marketplace marks, closing message, and reduced-motion rendering", () => {
    const markup = renderToStaticMarkup(<ResourcesSection />);

    for (const marketplace of ["Mercado Livre", "Shopee", "TikTok Shop", "Shein"]) {
      expect(markup).toContain(marketplace);
    }

    expect(markup).toContain("Menos achismo.");
    expect(markup).toContain("Mais controle sobre o seu lucro.");
    expect(markup).toContain('id="recursos"');
  });
});
