import { describe, expect, it } from "vitest";
import {
  formatAdvertisingInput,
  maskAdvertisingInput,
  parseAdvertisingInput,
} from "./advertising-input";

describe("advertising input helpers", () => {
  it("formats stored amounts for the input", () => {
    expect(formatAdvertisingInput(0)).toBe("0,00");
    expect(formatAdvertisingInput(1234.5)).toBe("1.234,50");
    expect(formatAdvertisingInput(Number.NaN)).toBe("0,00");
  });

  it("reads typed digits as cents", () => {
    expect(maskAdvertisingInput("1")).toBe("0,01");
    expect(maskAdvertisingInput("12345")).toBe("123,45");
    expect(maskAdvertisingInput("1.234,50")).toBe("1.234,50");
    expect(maskAdvertisingInput("abc")).toBe("0,00");
    expect(maskAdvertisingInput("")).toBe("0,00");
  });

  it("converts masked values into API decimal strings", () => {
    expect(parseAdvertisingInput("1.234,50")).toBe("1234.50");
    expect(parseAdvertisingInput("0,00")).toBe("0.00");
    expect(parseAdvertisingInput("")).toBe("0.00");
  });
});
