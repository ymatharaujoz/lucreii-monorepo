import type { Company } from "@lucreii/types";

import {
  formatBrlAmount,
  parseBrlAmount,
  toBrlDecimalString,
} from "@/lib/brl-amount";

export function formatCurrencyInput(value: number) {
  return formatBrlAmount(value);
}

export function formatTaxPercentInput(rateDecimal: string) {
  const rate = Number.parseFloat(rateDecimal);
  const percent = Number.isFinite(rate) ? rate * 100 : 0;

  return percent.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function parseCurrencyInputToNumber(value: string) {
  return parseBrlAmount(value);
}

export function buildCompanyDefaultsPatch(input: {
  fixedCostInput: string;
  taxPercentInput: string;
}) {
  const fixedCostDefault = toBrlDecimalString(input.fixedCostInput);
  const taxPercent = parseCurrencyInputToNumber(input.taxPercentInput);
  const normalizedTaxRate = (taxPercent / 100).toFixed(6);

  return {
    fixedCostDefault,
    taxRateDefault: normalizedTaxRate,
  };
}

export function getActiveCompany(companies: Company[]) {
  return (
    companies.find((company) => company.isSelected && company.isActive) ??
    companies.find((company) => company.isActive) ??
    null
  );
}
