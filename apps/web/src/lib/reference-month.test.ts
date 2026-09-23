import { describe, expect, it } from "vitest";
import {
  getReferenceMonthDateRangeProration,
  getReferenceMonthDefaultDateRange,
} from "./reference-month";

describe("reference month date ranges", () => {
  const now = new Date("2026-07-10T12:00:00.000Z");

  it("uses the month start through today for the current Dashboard month", () => {
    expect(
      getReferenceMonthDefaultDateRange("2026-07-01", "month", now),
    ).toEqual({
      dateFrom: "2026-07-01",
      dateTo: "2026-07-10",
    });
  });

  it("uses only today for the current Marketplaces month", () => {
    expect(
      getReferenceMonthDefaultDateRange("2026-07-01", "today", now),
    ).toEqual({
      dateFrom: "2026-07-10",
      dateTo: "2026-07-10",
    });
  });

  it("uses the entire selected month when it is in the past", () => {
    expect(
      getReferenceMonthDefaultDateRange("2026-06-01", "today", now),
    ).toEqual({
      dateFrom: "2026-06-01",
      dateTo: "2026-06-30",
    });
  });

  it("calculates the inclusive date range proration", () => {
    expect(
      getReferenceMonthDateRangeProration("2026-07-01", {
        dateFrom: "2026-07-01",
        dateTo: "2026-07-10",
      }),
    ).toBeCloseTo(10 / 31);
  });
});
