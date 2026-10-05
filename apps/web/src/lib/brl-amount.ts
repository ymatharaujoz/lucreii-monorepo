/**
 * Helpers for BRL amounts typed by hand ("1700", "1700,9", "1.700,90").
 * The user types naturally; the amount is always normalized to two decimals.
 */

const BRL_FORMAT = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
});

/** Formats an amount with exactly two decimals, e.g. 1700 -> "1.700,00". */
export function formatBrlAmount(value: number): string {
  return BRL_FORMAT.format(Number.isFinite(value) ? value : 0);
}

/**
 * Keeps only what a BRL amount can contain while typing: digits, "." as
 * thousands separator and a single "," with at most two decimals.
 */
export function sanitizeBrlAmountInput(raw: string): string {
  const cleaned = raw.replace(/[^\d.,]/g, "");
  const commaIndex = cleaned.indexOf(",");

  if (commaIndex === -1) {
    return cleaned;
  }

  const integerPart = cleaned.slice(0, commaIndex);
  const decimalPart = cleaned
    .slice(commaIndex + 1)
    .replace(/[^\d]/g, "")
    .slice(0, 2);

  return `${integerPart},${decimalPart}`;
}

/**
 * Parses a typed amount into a non-negative number. A comma is always the
 * decimal separator; without one, a trailing ".dd" is read as decimals
 * ("1700.5") and any other dot as a thousands separator ("1.700").
 */
export function parseBrlAmount(raw: string): number {
  const value = sanitizeBrlAmountInput(raw.trim());

  if (value.length === 0) {
    return 0;
  }

  let normalized: string;

  if (value.includes(",")) {
    normalized = value.replace(/\./g, "").replace(",", ".");
  } else if (/^\d+\.\d{1,2}$/.test(value)) {
    normalized = value;
  } else {
    normalized = value.replace(/\./g, "");
  }

  const parsed = Number.parseFloat(normalized);

  return Number.isFinite(parsed) ? parsed : 0;
}

/** Converts a typed amount into the decimal string the API expects ("1700.00"). */
export function toBrlDecimalString(raw: string): string {
  return parseBrlAmount(raw).toFixed(2);
}

/** Normalizes a typed amount for display, e.g. "1700" -> "1.700,00". */
export function normalizeBrlAmountInput(raw: string): string {
  return formatBrlAmount(parseBrlAmount(raw));
}
