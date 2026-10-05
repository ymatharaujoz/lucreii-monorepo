/**
 * Helpers for the BRL amount typed into the listing advertising field. The
 * user types naturally ("1700" or "1700,9") and the amount is always shown
 * with two decimals once the field is committed ("1.700,00" / "1.700,90").
 */

import {
  formatBrlAmount,
  sanitizeBrlAmountInput,
  toBrlDecimalString,
} from "@/lib/brl-amount";

/** Formats a stored amount for the input, e.g. 1234.5 -> "1.234,50". */
export function formatAdvertisingInput(value: number): string {
  return formatBrlAmount(value);
}

/** Filters what the user typed or pasted down to a valid BRL amount draft. */
export function maskAdvertisingInput(raw: string): string {
  return sanitizeBrlAmountInput(raw);
}

/** Converts a typed amount into the decimal string the API expects ("1234.50"). */
export function parseAdvertisingInput(typed: string): string {
  return toBrlDecimalString(typed);
}
