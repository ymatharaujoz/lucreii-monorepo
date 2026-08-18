/** @vitest-environment jsdom */

import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { PricingCalculator } from "./pricing-calculator";

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

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
      act(() => root.unmount());
      container.remove();
    },
  };
}

function setInputValue(input: HTMLInputElement, value: string) {
  const descriptor = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value",
  );
  descriptor?.set?.call(input, value);

  act(() => {
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
}

function click(element: Element) {
  act(() => {
    element.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
}

function text() {
  return document.body.textContent?.replace(/\u00a0/g, " ") ?? "";
}

function fillSpreadsheetContributionScenario() {
  const values: Record<string, string> = {
    "contribution-margin-target": "36",
    "contribution-margin-productCost": "2.14",
    "contribution-margin-packagingCost": "0.5",
    "contribution-margin-shippingFee": "6.55",
    "contribution-margin-otherFixedCosts": "1",
    "contribution-margin-marketplaceCommissionRate": "12",
    "contribution-margin-taxRate": "4",
    "contribution-margin-affiliateCommissionRate": "8",
    "contribution-margin-storeCouponRate": "3",
    "contribution-margin-otherVariableCostRate": "0",
  };

  for (const [id, value] of Object.entries(values)) {
    setInputValue(document.getElementById(id) as HTMLInputElement, value);
  }
}

describe("PricingCalculator", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("starts empty and explains that values are not saved", () => {
    const view = mount(<PricingCalculator mode="contribution-margin" />);

    expect(text()).toContain("Pronto para simular");
    expect(text()).toContain("Não salvo");
    expect(text()).toContain("Margem de contribuição alvo");
    expect(text()).toContain("Comissão marketplace");
    expect(text()).not.toContain("R$ 27,54");

    view.unmount();
  });

  it("calculates the spreadsheet scenario while fields change", () => {
    const view = mount(<PricingCalculator mode="contribution-margin" />);

    fillSpreadsheetContributionScenario();

    expect(text()).toContain("Preço de Venda Recomendado");
    expect(text()).toContain("R$ 27,54");
    expect(text()).toContain("36,00%");
    expect(text()).toContain("R$ 9,91");

    view.unmount();
  });

  it("shows the requested contextual label in sale price mode", () => {
    const view = mount(<PricingCalculator mode="sale-price" />);

    expect(text()).toContain("Preço de Venda Informado");
    expect(text()).toContain("Preço de venda");

    view.unmount();
  });

  it("blocks an invalid denominator inline", () => {
    const view = mount(<PricingCalculator mode="contribution-margin" />);

    setInputValue(
      document.getElementById("contribution-margin-target") as HTMLInputElement,
      "80",
    );
    setInputValue(
      document.getElementById(
        "contribution-margin-marketplaceCommissionRate",
      ) as HTMLInputElement,
      "20",
    );

    expect(text()).toContain(
      "A soma da margem e dos custos percentuais precisa ser menor que 100%",
    );
    expect(text()).not.toContain("R$ 27,54");

    view.unmount();
  });

  it("clears all fields and results", () => {
    const view = mount(<PricingCalculator mode="contribution-margin" />);

    setInputValue(
      document.getElementById("contribution-margin-target") as HTMLInputElement,
      "36",
    );
    expect(
      (
        document.getElementById(
          "contribution-margin-target",
        ) as HTMLInputElement
      ).value,
    ).toBe("36");

    click(
      Array.from(document.querySelectorAll("button")).find((button) =>
        button.textContent?.includes("Limpar"),
      )!,
    );

    expect(
      (
        document.getElementById(
          "contribution-margin-target",
        ) as HTMLInputElement
      ).value,
    ).toBe("");
    expect(text()).toContain("Pronto para simular");

    view.unmount();
  });
});
