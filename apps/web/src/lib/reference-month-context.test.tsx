/** @vitest-environment jsdom */

import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ReferenceMonthProvider,
  useReferenceMonth,
} from "./reference-month-context";

function ReferenceMonthConsumer() {
  const { referenceMonth, setReferenceMonth } = useReferenceMonth();

  return (
    <>
      <output>{referenceMonth}</output>
      <button type="button" onClick={() => setReferenceMonth("2026-06-01")}>
        Alterar mês
      </button>
    </>
  );
}

function mount(node: React.ReactNode) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(node);
  });

  return {
    unmount() {
      act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
}

afterEach(() => {
  document.body.innerHTML = "";
  window.localStorage.clear();
  vi.useRealTimers();
});

describe("ReferenceMonthProvider", () => {
  it("restores and updates the reference month independently per company", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-10T12:00:00.000Z"));
    window.localStorage.setItem(
      "lucreii_reference_month:company_1",
      "2026-05-01",
    );

    const view = mount(
      <ReferenceMonthProvider companyId="company_1">
        <ReferenceMonthConsumer />
      </ReferenceMonthProvider>,
    );

    expect(document.querySelector("output")?.textContent).toBe("2026-05-01");

    act(() => {
      document
        .querySelector("button")
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(
      window.localStorage.getItem("lucreii_reference_month:company_1"),
    ).toBe("2026-06-01");
    expect(
      window.localStorage.getItem("lucreii_reference_month:company_2"),
    ).toBeNull();

    view.unmount();
  });
});
