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
});
