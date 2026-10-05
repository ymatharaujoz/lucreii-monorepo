import { describe, expect, it } from "vitest";
import {
  normalizeBrlAmountInput,
  parseBrlAmount,
  sanitizeBrlAmountInput,
  toBrlDecimalString,
} from "./brl-amount";

describe("brl amount helpers", () => {
  it("always shows two decimals", () => {
    expect(normalizeBrlAmountInput("1700")).toBe("1.700,00");
    expect(normalizeBrlAmountInput("1700,9")).toBe("1.700,90");
    expect(normalizeBrlAmountInput("1700,90")).toBe("1.700,90");
    expect(normalizeBrlAmountInput("")).toBe("0,00");
  });

  it("parses typed amounts without treating digits as cents", () => {
    expect(parseBrlAmount("1700")).toBe(1700);
    expect(parseBrlAmount("1.700,90")).toBe(1700.9);
    expect(parseBrlAmount("1.700")).toBe(1700);
    expect(parseBrlAmount("1700.5")).toBe(1700.5);
    expect(parseBrlAmount("abc")).toBe(0);
  });

  it("limits decimals while typing", () => {
    expect(sanitizeBrlAmountInput("12,345")).toBe("12,34");
    expect(sanitizeBrlAmountInput("R$ 12,5")).toBe("12,5");
  });

  it("builds API decimal strings", () => {
    expect(toBrlDecimalString("1.234,5")).toBe("1234.50");
    expect(toBrlDecimalString("")).toBe("0.00");
  });
});
