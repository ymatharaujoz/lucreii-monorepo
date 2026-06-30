import type { IntegrationProviderSlug, RunSyncRequest } from "@lucreii/types";

export type ManualSyncFormValues = {
  startDate: string;
  endDate: string;
};

export type ManualSyncRangeValidationResult = {
  error: string | null;
  isValid: boolean;
};

export type ManualSyncDateBounds = {
  maxDate: string;
  minDate: string;
};

function parseUtcDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) {
    return null;
  }

  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
}

function endOfUtcDay(value: Date) {
  return new Date(
    Date.UTC(
      value.getUTCFullYear(),
      value.getUTCMonth(),
      value.getUTCDate(),
      23,
      59,
      59,
      999,
    ),
  );
}

function addUtcMonths(value: Date, months: number) {
  const targetYear = value.getUTCFullYear();
  const targetMonth = value.getUTCMonth() + months;
  const lastDayOfTargetMonth = new Date(
    Date.UTC(targetYear, targetMonth + 1, 0),
  ).getUTCDate();
  const targetDay = Math.min(value.getUTCDate(), lastDayOfTargetMonth);

  return new Date(Date.UTC(targetYear, targetMonth, targetDay, 0, 0, 0, 0));
}

function formatUtcDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

export function getManualSyncDateBounds(
  nowIso: string = new Date().toISOString(),
): ManualSyncDateBounds {
  const now = new Date(nowIso);
  const todayStart = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      0,
      0,
      0,
      0,
    ),
  );

  return {
    maxDate: formatUtcDate(todayStart),
    minDate: formatUtcDate(addUtcMonths(todayStart, -3)),
  };
}

export function validateManualSyncRange(
  values: ManualSyncFormValues,
  nowIso: string = new Date().toISOString(),
): ManualSyncRangeValidationResult {
  if (!values.startDate || !values.endDate) {
    return {
      error: "Selecione data inicial e final.",
      isValid: false,
    };
  }

  const startAt = parseUtcDate(values.startDate);
  const endDate = parseUtcDate(values.endDate);
  if (!startAt || !endDate) {
    return {
      error: "Periodo invalido.",
      isValid: false,
    };
  }

  const endAt = endOfUtcDay(endDate);
  if (startAt.getTime() > endAt.getTime()) {
    return {
      error: "Data inicial nao pode ser maior que data final.",
      isValid: false,
    };
  }

  const bounds = getManualSyncDateBounds(nowIso);
  const minDate = parseUtcDate(bounds.minDate);
  const maxDate = parseUtcDate(bounds.maxDate);

  if (!minDate || !maxDate) {
    return {
      error: "Periodo invalido.",
      isValid: false,
    };
  }

  if (
    startAt.getTime() < minDate.getTime() ||
    endAt.getTime() > endOfUtcDay(maxDate).getTime()
  ) {
    return {
      error: "Periodo manual deve ficar dentro dos ultimos 3 meses.",
      isValid: false,
    };
  }

  return {
    error: null,
    isValid: true,
  };
}

export function buildManualSyncPayload(
  provider: IntegrationProviderSlug,
  values: ManualSyncFormValues,
): RunSyncRequest {
  return {
    endDate: values.endDate,
    provider,
    startDate: values.startDate,
  };
}
