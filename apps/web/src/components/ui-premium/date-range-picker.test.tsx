/** @vitest-environment jsdom */

import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DateRangePicker } from "./date-range-picker";

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
});

describe("DateRangePicker", () => {
  it("disables days outside constrained month and accepts month-compatible presets", () => {
    const onChange = vi.fn();
    const view = mount(
      <DateRangePicker
        from="2026-06-01"
        to="2026-06-30"
        minDate="2026-06-01"
        maxDate="2026-06-30"
        onChange={onChange}
        presets={[
          {
            from: "2026-06-01",
            key: "reference-month",
            label: "Todo o mês",
            to: "2026-06-30",
          },
        ]}
      />,
    );

    act(() => {
      document
        .querySelector('[role="button"]')
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const disabledDays = Array.from(
      document.querySelectorAll("button:disabled"),
    );
    expect(
      disabledDays.some((button) => button.textContent?.trim() === "31"),
    ).toBe(true);
    expect(
      disabledDays.some((button) => button.textContent?.trim() === "1"),
    ).toBe(true);
    expect(document.body.textContent).toContain("Todo o mês");

    view.unmount();
  });

  it("selects reference month and date range in one confirmed popover", () => {
    const onApply = vi.fn();
    const view = mount(
      <DateRangePicker
        from="2026-07-01"
        to="2026-07-10"
        referenceMonthSelection={{
          getBounds: (referenceMonth) =>
            referenceMonth === "2026-06-01"
              ? { minDate: "2026-06-01", maxDate: "2026-06-30" }
              : { minDate: "2026-07-01", maxDate: "2026-07-10" },
          getDefaultRange: (referenceMonth) =>
            referenceMonth === "2026-06-01"
              ? { from: "2026-06-01", to: "2026-06-30" }
              : { from: "2026-07-01", to: "2026-07-10" },
          onApply,
          options: ["2026-07-01", "2026-06-01"],
          referenceMonth: "2026-07-01",
        }}
      />,
    );

    act(() => {
      document
        .querySelector('[role="button"]')
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const monthSelect = document.querySelector(
      'select[aria-label="Mês de referência"]',
    ) as HTMLSelectElement;
    act(() => {
      monthSelect.value = "2026-06-01";
      monthSelect.dispatchEvent(new Event("change", { bubbles: true }));
    });

    expect(
      document.querySelector<HTMLInputElement>(
        'input[aria-label="Data inicial"]',
      )?.value,
    ).toBe("2026-06-01");
    expect(
      document.querySelector<HTMLInputElement>('input[aria-label="Data final"]')
        ?.value,
    ).toBe("2026-06-30");

    act(() => {
      Array.from(document.querySelectorAll("button"))
        .find((button) => button.textContent?.trim() === "Aplicar")
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(onApply).toHaveBeenCalledWith({
      from: "2026-06-01",
      referenceMonth: "2026-06-01",
      to: "2026-06-30",
    });
    view.unmount();
  });

  it("discards an unconfirmed month change when cancelled", () => {
    const onApply = vi.fn();
    const view = mount(
      <DateRangePicker
        from="2026-07-01"
        to="2026-07-10"
        referenceMonthSelection={{
          getBounds: () => ({ minDate: "2026-07-01", maxDate: "2026-07-10" }),
          getDefaultRange: () => ({ from: "2026-07-01", to: "2026-07-10" }),
          onApply,
          options: ["2026-07-01"],
          referenceMonth: "2026-07-01",
        }}
      />,
    );

    act(() => {
      document
        .querySelector('[role="button"]')
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    act(() => {
      Array.from(document.querySelectorAll("button"))
        .find((button) => button.textContent?.trim() === "Cancelar")
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(onApply).not.toHaveBeenCalled();
    expect(
      document.querySelector('[aria-label="Mês de referência"]'),
    ).toBeNull();
    view.unmount();
  });
});
