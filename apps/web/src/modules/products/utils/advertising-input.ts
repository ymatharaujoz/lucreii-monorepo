/**
 * Helpers for the BRL amount typed into the listing advertising field. The
 * field behaves like a cash register: typed digits are read as cents, so
 * "12345" shows as "123,45".
 */

const CURRENCY_FORMAT = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
});

/** Formats a stored amount for the input, e.g. 1234.5 -> "1.234,50". */
export function formatAdvertisingInput(value: number): string {
  return CURRENCY_FORMAT.format(Number.isFinite(value) ? value : 0);
}

/** Re-masks whatever the user typed or pasted as a cents-based amount. */
export function maskAdvertisingInput(raw: string): string {
  const digits = raw.replace(/\D/g, "");

  if (digits.length === 0) {
    return formatAdvertisingInput(0);
  }

  return formatAdvertisingInput(Number.parseInt(digits, 10) / 100);
}

/** Converts a masked input into the decimal string the API expects ("1234.50"). */
export function parseAdvertisingInput(masked: string): string {
  const digits = masked.replace(/\D/g, "");

  if (digits.length === 0) {
    return "0.00";
  }

  return (Number.parseInt(digits, 10) / 100).toFixed(2);
}
