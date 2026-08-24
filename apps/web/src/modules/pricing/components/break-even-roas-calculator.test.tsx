/** @vitest-environment jsdom */

import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BreakEvenRoasCalculator } from "./break-even-roas-calculator";

const postMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api/client", () => ({
  ApiClientError: class ApiClientError extends Error {},
  apiClient: {
    patch: vi.fn(),
    post: postMock,
  },
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
    vi.clearAllMocks();
  });

  it("starts with one empty margin field and shows the informational example", () => {
    const view = mount(<BreakEvenRoasCalculator />);

    expect(document.querySelectorAll("input")).toHaveLength(4);
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
      "Acima dele: o produto gera lucro após o investimento em Ads.",
    );
    expect(text()).toContain("R$ 867,00");
    expect(text()).not.toContain("2,78x");
    expect(text()).not.toContain("Fórmula aplicada");
    expect(
      (document.getElementById("break-even-roas-ads-investment") as HTMLInputElement)
        .value,
    ).toBe("289,00");
    expect(
      (document.getElementById("break-even-roas-ads-roas") as HTMLInputElement)
        .value,
    ).toBe("3");

    view.unmount();
  });

  it("requires an identifier to save and sends the normalized margin", async () => {
    postMock.mockResolvedValueOnce({
      data: {
        breakEvenRoas: "6.666667",
        calculationVersion: "1",
        companyId: "00000000-0000-0000-0000-000000000001",
        contributionMarginRate: "0.150000",
        createdAt: "2026-08-20T12:00:00.000Z",
        id: "00000000-0000-0000-0000-000000000002",
        productIdentifier: "CAM-01",
        updatedAt: "2026-08-20T12:00:00.000Z",
      },
    });
    const view = mount(<BreakEvenRoasCalculator />);

    setInputValue(
      document.getElementById("break-even-roas-percentage") as HTMLInputElement,
      "15",
    );
    const identifier = document.getElementById(
      "break-even-roas-product-identifier",
    ) as HTMLInputElement;
    setInputValue(identifier, "CAM-01");

    const saveButton = Array.from(document.querySelectorAll("button")).find(
      (button) => button.textContent?.includes("Salvar simulação"),
    );
    await act(async () => {
      saveButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(postMock).toHaveBeenCalledWith(
      "/pricing/break-even-roas/simulations",
      {
        body: {
          contributionMarginRate: "0.150000",
          productIdentifier: "CAM-01",
        },
      },
    );
    expect(text()).toContain("Simulação salva com sucesso.");
    view.unmount();
  });

  it("calculates one divided by a 15 percent margin immediately", () => {
    const view = mount(<BreakEvenRoasCalculator />);

    setInputValue(
      document.getElementById("break-even-roas-percentage") as HTMLInputElement,
      "15",
    );

    expect(text()).toContain("6,67x");
    expect(text()).not.toContain("Fórmula aplicada");
    expect(text()).toContain("15%");

    view.unmount();
  });

  it("calculates attributed ad revenue from editable example values", () => {
    const view = mount(<BreakEvenRoasCalculator />);

    setInputValue(
      document.getElementById("break-even-roas-ads-investment") as HTMLInputElement,
      "350",
    );
    setInputValue(
      document.getElementById("break-even-roas-ads-roas") as HTMLInputElement,
      "2,5",
    );

    expect(text()).toContain("R$ 875,00");
    expect(text()).toContain(
      "R$ 350,00 investidos em Ads com ROAS de 2,5x geram R$ 875,00",
    );

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
