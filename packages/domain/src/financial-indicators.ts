export type FinancialIndicatorPerformanceLine = {
  advertisingCost?: string | number | null;
  commissionRate?: string | number | null;
  packagingCost?: string | number | null;
  returnsQuantity: number;
  salePrice?: string | number | null;
  salesQuantity: number;
  shippingFee?: string | number | null;
  unitCost?: string | number | null;
};

export type FinancialIndicatorCalculationInput = {
  fixedCost?: string | number | null;
  taxRate: string | number | null;
  lines: readonly FinancialIndicatorPerformanceLine[];
};

export type FinancialIndicatorCalculationResult = {
  advertising: string;
  averageMarginPercent: string;
  breakEvenRevenue: string;
  fixedCost: string;
  marketplaceCommission: string;
  netMarginPercent: string;
  netProfit: string;
  netSales: number;
  packagingCost: string;
  productCost: string;
  realProfit: string;
  revenue: string;
  shippingCost: string;
  taxAmount: string;
  totalProfit: string;
  variableCosts: string;
};

export type FinancialIndicatorTotalsInput = {
  advertising: string | number | null | undefined;
  fixedCost: string | number | null | undefined;
  marketplaceCommission: string | number | null | undefined;
  netSales: number;
  packagingCost: string | number | null | undefined;
  productCost: string | number | null | undefined;
  refundBonus?: string | number | null | undefined;
  revenue: string | number | null | undefined;
  shippingCost: string | number | null | undefined;
  taxAmount: string | number | null | undefined;
};

const CENT_SCALE = 100n;
const RATE_SCALE = 1_000_000n;
const ZERO_PERCENT = "0.00";

function parseDecimalCents(value: string | number | null | undefined): bigint {
  if (value === null || value === undefined || value === "") {
    return 0n;
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error(`Invalid decimal amount: ${value}`);
    }

    return BigInt(Math.round(value * Number(CENT_SCALE)));
  }

  const normalized = value.trim().replace(",", ".");

  if (!normalized) {
    return 0n;
  }

  if (!/^-?\d+(?:\.\d+)?$/.test(normalized)) {
    throw new Error(`Invalid decimal amount: ${value}`);
  }

  const sign = normalized.startsWith("-") ? -1n : 1n;
  const unsigned = normalized.replace(/^-/, "");
  const [whole, fraction = ""] = unsigned.split(".");
  const roundedFraction =
    fraction.length > 2
      ? BigInt(fraction.slice(0, 2)) + (Number(fraction[2]) >= 5 ? 1n : 0n)
      : BigInt((fraction + "00").slice(0, 2));

  return sign * (BigInt(whole) * CENT_SCALE + roundedFraction);
}

function parseRate(value: string | number | null | undefined): bigint {
  if (value === null || value === undefined || value === "") {
    return 0n;
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error(`Invalid decimal rate: ${value}`);
    }

    return BigInt(Math.round(value * Number(RATE_SCALE)));
  }

  const normalized = value.trim().replace(",", ".");

  if (!normalized) {
    return 0n;
  }

  if (!/^-?\d+(?:\.\d+)?$/.test(normalized)) {
    throw new Error(`Invalid decimal rate: ${value}`);
  }

  const sign = normalized.startsWith("-") ? -1n : 1n;
  const unsigned = normalized.replace(/^-/, "");
  const [whole, fraction = ""] = unsigned.split(".");
  const scaledFraction = BigInt((fraction + "000000").slice(0, 6));

  return sign * (BigInt(whole) * RATE_SCALE + scaledFraction);
}

function roundDivision(dividend: bigint, divisor: bigint): bigint {
  if (divisor === 0n) {
    return 0n;
  }

  const sign = dividend < 0n ? -1n : 1n;
  const absoluteDividend = dividend < 0n ? -dividend : dividend;
  const absoluteDivisor = divisor < 0n ? -divisor : divisor;
  const quotient = absoluteDividend / absoluteDivisor;
  const remainder = absoluteDividend % absoluteDivisor;
  const rounded = remainder * 2n >= absoluteDivisor ? quotient + 1n : quotient;

  return sign * (divisor < 0n ? -rounded : rounded);
}

function multiplyByRate(cents: bigint, rate: bigint): bigint {
  return roundDivision(cents * rate, RATE_SCALE);
}

function formatCents(cents: bigint): string {
  const sign = cents < 0n ? "-" : "";
  const absolute = cents < 0n ? -cents : cents;
  const whole = absolute / CENT_SCALE;
  const fraction = (absolute % CENT_SCALE).toString().padStart(2, "0");

  return `${sign}${whole.toString()}.${fraction}`;
}

function formatPercent(numerator: bigint, denominator: bigint): string {
  if (denominator <= 0n) {
    return ZERO_PERCENT;
  }

  // numerator / denominator * 100, rounded to two decimal places.
  return formatCents(roundDivision(numerator * 10_000n, denominator));
}

function formatProfitRatio(revenue: bigint, totalProfit: bigint): string {
  if (totalProfit === 0n) {
    return ZERO_PERCENT;
  }

  // Keep two decimal places while returning revenue / profit as a ratio.
  return formatCents(roundDivision(revenue * CENT_SCALE, totalProfit));
}

export function calculateFinancialIndicators(
  input: FinancialIndicatorCalculationInput,
): FinancialIndicatorCalculationResult {
  const taxRate = parseRate(input.taxRate);
  const fixedCost = parseDecimalCents(input.fixedCost);
  let netSales = 0;
  let revenue = 0n;
  let marketplaceCommission = 0n;
  let shippingCost = 0n;
  let taxAmount = 0n;
  let packagingCost = 0n;
  let productCost = 0n;
  let advertising = 0n;

  for (const line of input.lines) {
    const salesQuantity = Math.max(0, Math.trunc(line.salesQuantity));
    const returnsQuantity = Math.max(0, Math.trunc(line.returnsQuantity));
    const lineNetSales = Math.max(0, salesQuantity - returnsQuantity);
    const salePrice = parseDecimalCents(line.salePrice);
    const lineRevenue = salePrice * BigInt(lineNetSales);

    netSales += lineNetSales;
    revenue += lineRevenue;
    marketplaceCommission += multiplyByRate(
      lineRevenue,
      parseRate(line.commissionRate),
    );
    shippingCost += parseDecimalCents(line.shippingFee) * BigInt(lineNetSales);
    taxAmount += multiplyByRate(lineRevenue, taxRate);
    packagingCost +=
      parseDecimalCents(line.packagingCost) * BigInt(lineNetSales);
    productCost += parseDecimalCents(line.unitCost) * BigInt(lineNetSales);
    advertising += parseDecimalCents(line.advertisingCost);
  }

  return calculateFinancialIndicatorsFromTotals({
    advertising: formatCents(advertising),
    fixedCost: formatCents(fixedCost),
    marketplaceCommission: formatCents(marketplaceCommission),
    netSales,
    packagingCost: formatCents(packagingCost),
    productCost: formatCents(productCost),
    revenue: formatCents(revenue),
    shippingCost: formatCents(shippingCost),
    taxAmount: formatCents(taxAmount),
  });
}

export function calculateFinancialIndicatorsFromTotals(
  input: FinancialIndicatorTotalsInput,
): FinancialIndicatorCalculationResult {
  const advertising = parseDecimalCents(input.advertising);
  const fixedCost = parseDecimalCents(input.fixedCost);
  const marketplaceCommission = parseDecimalCents(input.marketplaceCommission);
  const packagingCost = parseDecimalCents(input.packagingCost);
  const productCost = parseDecimalCents(input.productCost);
  const refundBonus = parseDecimalCents(input.refundBonus);
  const revenue = parseDecimalCents(input.revenue);
  const shippingCost = parseDecimalCents(input.shippingCost);
  const taxAmount = parseDecimalCents(input.taxAmount);
  const variableCosts =
    marketplaceCommission +
    shippingCost +
    taxAmount +
    packagingCost +
    productCost -
    refundBonus;
  const totalProfit = revenue - variableCosts;
  const realProfit = totalProfit - fixedCost;
  const netProfit = realProfit - advertising;
  const breakEvenRevenue =
    revenue > 0n && totalProfit > 0n
      ? roundDivision(fixedCost * revenue, totalProfit)
      : 0n;

  return {
    advertising: formatCents(advertising),
    averageMarginPercent: formatProfitRatio(revenue, totalProfit),
    breakEvenRevenue: formatCents(breakEvenRevenue),
    fixedCost: formatCents(fixedCost),
    marketplaceCommission: formatCents(marketplaceCommission),
    netMarginPercent: formatPercent(netProfit, revenue),
    netProfit: formatCents(netProfit),
    netSales: Math.max(0, Math.trunc(input.netSales)),
    packagingCost: formatCents(packagingCost),
    productCost: formatCents(productCost),
    realProfit: formatCents(realProfit),
    revenue: formatCents(revenue),
    shippingCost: formatCents(shippingCost),
    taxAmount: formatCents(taxAmount),
    totalProfit: formatCents(totalProfit),
    variableCosts: formatCents(variableCosts),
  };
}

export function sumMoneyValues(
  values: readonly (string | number | null | undefined)[],
): string {
  return formatCents(
    values.reduce((sum, value) => sum + parseDecimalCents(value), 0n),
  );
}
