/** @vitest-environment jsdom */

import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { BreakEvenRoasCalculator } from "./break-even-roas-calculator";

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

function text() {
  return document.body.textContent?.replace(/\u00a0/g, " ") ?? "";
}

describe("BreakEvenRoasCalculator", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("starts with one empty margin field and shows the informational example", () => {
    const view = mount(<BreakEvenRoasCalculator />);

    expect(document.querySelectorAll("input")).toHaveLength(1);
    expect(
      (
        document.getElementById(
          "break-even-roas-percentage",
        ) as HTMLInputElement
      ).value,
    ).toBe("");
    expect(text()).toContain("Margem de Contribuição (%)");
    expect(text()).not.toContain("Valor considerado");
    expect(text()).toContain("O que é o ROAS de Equilíbrio?");
    expect(text()).toContain("Abaixo dele: Prejuízo com ADS.");
    expect(text()).toContain(
      "Acima dele: O produto gera lucro após o investimento em ADS.",
    );
    expect(text()).toContain("R$ 867,00");
    expect(text()).not.toContain("2,78x");

    view.unmount();
  });

  it("calculates one divided by a 15 percent margin immediately", () => {
    const view = mount(<BreakEvenRoasCalculator />);

    setInputValue(
      document.getElementById("break-even-roas-percentage") as HTMLInputElement,
      "15",
    );

    expect(text()).toContain("6,67x");
    expect(text()).toContain("1 ÷ Margem de Contribuição (%)");
    expect(text()).toContain("15%");

    view.unmount();
  });

  it("blocks zero, negative and out-of-range margins", () => {
    const view = mount(<BreakEvenRoasCalculator />);
    const percentage = document.getElementById(
      "break-even-roas-percentage",
    ) as HTMLInputElement;
    setInputValue(percentage, "0");
    expect(text()).toContain(
      "A Margem de Contribuição deve estar entre 0,01% e 100%.",
    );
    expect(text()).not.toContain("6,67x");

    setInputValue(percentage, "101");
    expect(text()).toContain(
      "A Margem de Contribuição deve estar entre 0,01% e 100%.",
    );

    setInputValue(percentage, "-10");
    expect(text()).toContain(
      "A Margem de Contribuição deve estar entre 0,01% e 100%.",
    );

    view.unmount();
  });
});
