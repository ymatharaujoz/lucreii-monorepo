"use client";

const REFERENCE_MONTH_RE = /^\d{4}-\d{2}-01$/;

export type ReferenceMonthDateRange = {
  dateFrom: string;
  dateTo: string;
};

export type ReferenceMonthDateRangeDefault = "month" | "today";

export function isReferenceMonth(value: string) {
  return REFERENCE_MONTH_RE.test(value);
}

export function getSaoPauloCurrentReferenceMonth(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    month: "2-digit",
    timeZone: "America/Sao_Paulo",
    year: "numeric",
  }).formatToParts(now);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;

  return year && month
    ? `${year}-${month}-01`
    : `${now.toISOString().slice(0, 7)}-01`;
}

export function getSaoPauloCurrentDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/Sao_Paulo",
    year: "numeric",
  }).formatToParts(now);
  const day = parts.find((part) => part.type === "day")?.value;
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;

  return year && month && day
    ? `${year}-${month}-${day}`
    : now.toISOString().slice(0, 10);
}

export function enumerateRecentReferenceMonthsDescending(
  capIsoDay: string,
  count: number,
): string[] {
  const ym = capIsoDay.slice(0, 7);
  const parts = ym.split("-").map(Number);
  const year = parts[0] ?? NaN;
  const month = parts[1] ?? NaN;
  if (!Number.isFinite(year) || !Number.isFinite(month)) {
    return [];
  }

  const out: string[] = [];
  let y = year;
  let m = month;
  for (let i = 0; i < count; i++) {
    out.push(`${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-01`);
    m -= 1;
    if (m < 1) {
      m = 12;
      y -= 1;
    }
  }
  return out;
}

export function formatReferenceMonthPtBr(referenceMonthIso: string) {
  const ym = referenceMonthIso.slice(0, 7);
  const bits = ym.split("-").map(Number);
  const y = bits[0];
  const mo = bits[1];
  if (!Number.isFinite(y) || !Number.isFinite(mo)) {
    return referenceMonthIso.slice(0, 7);
  }

  const midMonthUtc = new Date(Date.UTC(y, mo - 1, 15, 12, 0, 0));
  return new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  }).format(midMonthUtc);
}

export function mergeDescendingReferenceMonthChoices(
  current: string,
  capIsoDay: string,
  historyDepth: number,
) {
  const capList = enumerateRecentReferenceMonthsDescending(
    capIsoDay,
    historyDepth,
  );
  const unique = new Set<string>(capList);
  unique.add(current);
  return [...unique].sort((a, b) => (a > b ? -1 : a < b ? 1 : 0));
}

export function clampReferenceMonth(next: string, now = new Date()) {
  if (!isReferenceMonth(next)) {
    return null;
  }

  const cap = getSaoPauloCurrentReferenceMonth(now);
  return next > cap ? cap : next;
}

export function buildReferenceMonthDateRange(referenceMonth: string) {
  const [year, month] = referenceMonth.slice(0, 7).split("-").map(Number);
  if (!Number.isFinite(year) || !Number.isFinite(month)) {
    return null;
  }

  const nextMonth =
    month === 12 ? { month: 1, year: year + 1 } : { month: month + 1, year };
  const lastDayOfMonthUtc = new Date(
    Date.UTC(nextMonth.year, nextMonth.month - 1, 0, 12, 0, 0),
  );

  return {
    orderedFrom: referenceMonth,
    orderedTo: lastDayOfMonthUtc.toISOString().slice(0, 10),
  };
}

export function getReferenceMonthDateBounds(
  referenceMonth: string,
  now = new Date(),
) {
  const monthRange = buildReferenceMonthDateRange(referenceMonth);

  if (!monthRange) {
    return null;
  }

  return {
    maxDate:
      referenceMonth === getSaoPauloCurrentReferenceMonth(now)
        ? getSaoPauloCurrentDate(now)
        : monthRange.orderedTo,
    minDate: monthRange.orderedFrom,
  };
}

export function getReferenceMonthDefaultDateRange(
  referenceMonth: string,
  mode: ReferenceMonthDateRangeDefault,
  now = new Date(),
): ReferenceMonthDateRange | null {
  const bounds = getReferenceMonthDateBounds(referenceMonth, now);

  if (!bounds) {
    return null;
  }

  if (
    mode === "today" &&
    referenceMonth === getSaoPauloCurrentReferenceMonth(now)
  ) {
    return {
      dateFrom: bounds.maxDate,
      dateTo: bounds.maxDate,
    };
  }

  return {
    dateFrom: bounds.minDate,
    dateTo: bounds.maxDate,
  };
}

export function getReferenceMonthDateRangeProration(
  referenceMonth: string,
  dateRange: ReferenceMonthDateRange,
) {
  const fullRange = buildReferenceMonthDateRange(referenceMonth);

  if (
    !fullRange ||
    dateRange.dateFrom < fullRange.orderedFrom ||
    dateRange.dateTo > fullRange.orderedTo ||
    dateRange.dateFrom > dateRange.dateTo
  ) {
    return 1;
  }

  const [startYear, startMonth, startDay] = dateRange.dateFrom
    .split("-")
    .map(Number);
  const [endYear, endMonth, endDay] = dateRange.dateTo.split("-").map(Number);
  const [monthYear, monthNumber] = referenceMonth
    .slice(0, 7)
    .split("-")
    .map(Number);

  const selectedDays =
    (Date.UTC(endYear, endMonth - 1, endDay) -
      Date.UTC(startYear, startMonth - 1, startDay)) /
      86_400_000 +
    1;
  const daysInMonth = new Date(
    Date.UTC(monthYear, monthNumber, 0),
  ).getUTCDate();

  return selectedDays / daysInMonth;
}
