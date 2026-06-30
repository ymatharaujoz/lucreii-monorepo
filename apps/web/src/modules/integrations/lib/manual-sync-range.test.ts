import { describe, expect, it } from "vitest";
import {
  buildManualSyncPayload,
  validateManualSyncRange,
} from "./manual-sync-range";

describe("validateManualSyncRange", () => {
  it("accepts ranges anywhere within the last 3 months", () => {
    const result = validateManualSyncRange(
      {
        endDate: "2026-06-20",
        startDate: "2026-03-27",
      },
      "2026-06-27T12:00:00.000Z",
    );

    expect(result.isValid).toBe(true);
    expect(result.error).toBeNull();
  });

  it("rejects ranges older than the rolling 3-month window", () => {
    const result = validateManualSyncRange(
      {
        endDate: "2026-03-26",
        startDate: "2026-03-20",
      },
      "2026-06-27T12:00:00.000Z",
    );

    expect(result.isValid).toBe(false);
    expect(result.error).toContain("3 meses");
  });

  it("accepts intervals longer than one month when still inside the last 3 months", () => {
    const result = validateManualSyncRange(
      {
        endDate: "2026-06-27",
        startDate: "2026-03-27",
      },
      "2026-06-27T12:00:00.000Z",
    );

    expect(result.isValid).toBe(true);
    expect(result.error).toBeNull();
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
    expect(result.error).toContain("3 meses");
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
