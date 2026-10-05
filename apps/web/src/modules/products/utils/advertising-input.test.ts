import { describe, expect, it } from "vitest";
import {
  formatAdvertisingInput,
  maskAdvertisingInput,
  parseAdvertisingInput,
} from "./advertising-input";

describe("advertising input helpers", () => {
  it("formats stored amounts for the input", () => {
    expect(formatAdvertisingInput(0)).toBe("0,00");
    expect(formatAdvertisingInput(1700)).toBe("1.700,00");
    expect(formatAdvertisingInput(1234.5)).toBe("1.234,50");
    expect(formatAdvertisingInput(Number.NaN)).toBe("0,00");
  });

  it("keeps typed amounts natural while editing", () => {
    expect(maskAdvertisingInput("1700")).toBe("1700");
    expect(maskAdvertisingInput("1700,9")).toBe("1700,9");
    expect(maskAdvertisingInput("1700,999")).toBe("1700,99");
    expect(maskAdvertisingInput("abc")).toBe("");
  });

  it("converts typed values into API decimal strings", () => {
    expect(parseAdvertisingInput("1700")).toBe("1700.00");
    expect(parseAdvertisingInput("1700,9")).toBe("1700.90");
    expect(parseAdvertisingInput("1.234,50")).toBe("1234.50");
    expect(parseAdvertisingInput("")).toBe("0.00");
  });
});
