import { describe, expect, it } from "vitest";
import {
  buildManualSyncPayload,
  validateManualSyncRange,
} from "./manual-sync-range";

describe("validateManualSyncRange", () => {
  it("accepts ranges anywhere within the last month", () => {
    const result = validateManualSyncRange(
      {
        endDate: "2026-06-20",
        startDate: "2026-05-27",
      },
      "2026-06-27T12:00:00.000Z",
    );

    expect(result.isValid).toBe(true);
    expect(result.error).toBeNull();
  });

  it("rejects ranges older than the rolling 1-month window", () => {
    const result = validateManualSyncRange(
      {
        endDate: "2026-05-25",
        startDate: "2026-05-20",
      },
      "2026-06-27T12:00:00.000Z",
    );

    expect(result.isValid).toBe(false);
    expect(result.error).toContain("ultimo mes");
  });

  it("rejects intervals longer than one month", () => {
    const result = validateManualSyncRange(
      {
        endDate: "2026-06-27",
        startDate: "2026-05-26",
      },
      "2026-06-27T12:00:00.000Z",
    );

    expect(result.isValid).toBe(false);
    expect(result.error).toContain("exceder 1 mes");
  });

  it("rejects end dates in the future", () => {
    const result = validateManualSyncRange(
      {
        endDate: "2026-06-28",
        startDate: "2026-06-10",
      },
      "2026-06-27T12:00:00.000Z",
    );

    expect(result.isValid).toBe(false);
    expect(result.error).toContain("ultimo mes");
  });

  it("accepts exact 1-month calendar ranges on month-end boundaries", () => {
    const result = validateManualSyncRange(
      {
        endDate: "2026-02-28",
        startDate: "2026-01-31",
      },
      "2026-02-28T12:00:00.000Z",
    );

    expect(result.isValid).toBe(true);
    expect(result.error).toBeNull();
  });

  it("rejects the day after an exact 1-month calendar range", () => {
    const result = validateManualSyncRange(
      {
        endDate: "2026-03-01",
        startDate: "2026-01-31",
      },
      "2026-03-01T12:00:00.000Z",
    );

    expect(result.isValid).toBe(false);
    expect(result.error).toContain("exceder 1 mes");
  });

  it("builds sync payload with provider and selected dates", () => {
    expect(
      buildManualSyncPayload("mercadolivre", {
        endDate: "2026-06-20",
        startDate: "2026-06-10",
      }),
    ).toEqual({
      endDate: "2026-06-20",
      provider: "mercadolivre",
      startDate: "2026-06-10",
    });
  });
});
