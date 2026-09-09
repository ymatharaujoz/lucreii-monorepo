/** @vitest-environment jsdom */

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { MarketplaceClaritySection } from "./marketplace-clarity-section";

vi.mock("framer-motion", () => {
  const motionElement = (tag: string) => {
    const element = Object.assign(
      ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
        const domProps = Object.fromEntries(
          Object.entries(props).filter(
            ([key]) =>
              !["animate", "initial", "transition", "whileInView", "viewport", "variants", "whileHover"].includes(key),
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
      h2: motionElement("h2"),
      h3: motionElement("h3"),
      header: motionElement("header"),
      p: motionElement("p"),
      span: motionElement("span"),
    },
    useReducedMotion: () => true,
  };
});

describe("MarketplaceClaritySection", () => {
  it("renders the approved marketplace positioning and question cards", () => {
    const markup = renderToStaticMarkup(<MarketplaceClaritySection />);

    expect(markup).toContain('id="como-funciona"');
    expect(markup).toContain("Feito para quem vende em marketplaces");
    expect(markup).toContain("Criado para responder a pergunta");
    expect(markup).toContain("que todo vendedor deveria fazer:");
    expect(markup).toContain("estou realmente lucrando?");
    expect(markup).toContain(
      "A Lucreii organiza os números da sua operação para transformar vendas, custos e despesas em informações que ajudam você a tomar decisões melhores.",
    );

    expect(markup).toContain("Seus dados, seus números");
    expect(markup).toContain("Sem achismos");
    expect(markup).toContain("Feito para marketplaces");
    expect(markup).toContain("A Lucreii responde as perguntas que realmente importam");
    expect(markup).toContain("Quanto realmente sobrou das minhas vendas este mês?");
    expect(markup).toContain("Quais produtos realmente estão me dando dinheiro?");
    expect(markup).toContain(
      "Minha publicidade está gerando lucro ou consumindo minha margem?",
    );

    expect((markup.match(/<article/g) ?? [])).toHaveLength(6);
    expect(markup).toContain("Lucro Líquido");
    expect(markup).toContain("R$ 18.760");
    expect(markup).toContain("Fone Bluetooth");
    expect(markup).toContain("Smartwatch");
    expect(markup).toContain("Atenção");
    expect(markup).toContain("Acompanhe o investimento em ADS");
  });

  it("renders the reference trust band and omits the former testimonials copy", () => {
    const markup = renderToStaticMarkup(<MarketplaceClaritySection />);

    expect(markup).toContain("Você não precisa confiar em números de outras empresas.");
    expect(markup).toContain("Veja os seus.");
    expect(markup).toContain(
      "Conecte seus dados, descubra o que realmente importa e leve seu negócio para o próximo nível.",
    );
    expect(markup).not.toContain("Depoimentos");
    expect(markup).not.toContain("Empresários que transformaram seus resultados");
  });
});
